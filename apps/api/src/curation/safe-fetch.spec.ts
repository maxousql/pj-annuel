import {
  assertPublicHttpUrl,
  isPublicAddress,
  requestPinned,
  safeFetchText,
  UnsafeUrlError,
} from "./safe-fetch";
import { createServer, type Server } from "node:http";

describe("safe outbound curation fetch", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.4",
    "172.16.2.3",
    "192.168.1.2",
    "169.254.169.254",
    "100.64.1.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:a00:1",
    "64:ff9b::a00:1",
  ])("rejects private or special address %s", (address) => {
    expect(isPublicAddress(address)).toBe(false);
  });

  it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])(
    "allows globally routable address %s",
    (address) => {
      expect(isPublicAddress(address)).toBe(true);
    },
  );

  it("blocks loopback before any outbound request is created", async () => {
    await expect(
      safeFetchText("http://127.0.0.1:65535/private"),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks a hostname when any DNS answer points to a private network", async () => {
    const resolver = jest.fn().mockResolvedValue([
      { address: "1.1.1.1", family: 4 },
      { address: "10.0.0.7", family: 4 },
    ]);

    await expect(
      assertPublicHttpUrl("https://rebind.example/resource", resolver),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it("pins the validated public DNS answer for the subsequent request", async () => {
    const resolver = jest
      .fn()
      .mockResolvedValue([{ address: "1.1.1.1", family: 4 }]);

    const target = await assertPublicHttpUrl(
      "https://public.example/resource",
      resolver,
    );

    expect(target.address).toBe("1.1.1.1");
    expect(target.family).toBe(4);
    expect(resolver).toHaveBeenCalledTimes(1);
  });

  it("bounds DNS resolution with an explicit timeout", async () => {
    const resolver = jest.fn(() => new Promise<never>(() => undefined));

    await expect(
      assertPublicHttpUrl("https://slow-dns.example/resource", resolver, {
        dnsTimeoutMs: 20,
      }),
    ).rejects.toThrow("resolution DNS a expire");
  });

  it("enforces a wall-clock deadline even when the body trickles", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/plain" });
      const interval = setInterval(() => response.write("x"), 10);
      response.once("close", () => clearInterval(interval));
    });
    const port = await listen(server);

    try {
      await expect(
        requestPinned(
          {
            address: "127.0.0.1",
            family: 4,
            url: new URL(`http://public.example:${port}/slow`),
          },
          { maxBytes: 10_000, timeoutMs: 45 },
        ),
      ).rejects.toThrow("a expire");
    } finally {
      await close(server);
    }
  });

  it("rejects an aborted response stream instead of accepting partial text", async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "text/plain" });
      response.write("partial");
      response.destroy();
    });
    const port = await listen(server);

    try {
      await expect(
        requestPinned(
          {
            address: "127.0.0.1",
            family: 4,
            url: new URL(`http://public.example:${port}/aborted`),
          },
          { maxBytes: 10_000, timeoutMs: 500 },
        ),
      ).rejects.toThrow();
    } finally {
      await close(server);
    }
  });
});

async function listen(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  return address.port;
}

async function close(server: Server): Promise<void> {
  server.closeAllConnections();
  if (!server.listening) return;
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

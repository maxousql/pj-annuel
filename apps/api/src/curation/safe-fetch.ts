import { BadRequestException } from "@nestjs/common";
import { lookup as dnsLookup } from "node:dns/promises";
import {
  request as httpRequest,
  type ClientRequest,
  type IncomingMessage,
} from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

const MAX_REDIRECTS = 4;
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_DNS_TIMEOUT_MS = 2_000;
const DEFAULT_MAX_BYTES = 500_000;

export type DnsResolver = (
  hostname: string,
) => Promise<Array<{ address: string; family: number }>>;

export type PinnedTarget = {
  address: string;
  family: number;
  url: URL;
};

type PublicUrlOptions = {
  deadlineAt?: number;
  dnsTimeoutMs?: number;
};

export class UnsafeUrlError extends BadRequestException {
  constructor(message = "Cette URL cible un reseau non autorise.") {
    super({ code: "UNSAFE_OUTBOUND_URL", message });
  }
}

export async function assertPublicHttpUrl(
  value: string,
  resolver: DnsResolver = resolveHostname,
  options: PublicUrlOptions = {},
): Promise<PinnedTarget> {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new UnsafeUrlError("URL http ou https valide requise.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UnsafeUrlError("URL http ou https requise.");
  }

  if (url.username || url.password) {
    throw new UnsafeUrlError(
      "Les identifiants integres a l'URL sont interdits.",
    );
  }

  const hostname = normalizeHostname(url.hostname);

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new UnsafeUrlError();
  }

  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await resolveWithinDeadline(
        resolver,
        hostname,
        Math.min(
          options.dnsTimeoutMs ?? DEFAULT_DNS_TIMEOUT_MS,
          remainingTime(options.deadlineAt),
        ),
      );

  if (addresses.length === 0) {
    throw new BadRequestException("Le nom de domaine ne peut pas etre resolu.");
  }

  if (addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new UnsafeUrlError();
  }

  const selected = addresses[0];

  if (!selected) {
    throw new UnsafeUrlError();
  }

  return { ...selected, url };
}

export async function safeFetchText(
  value: string,
  options: {
    maxBytes?: number;
    resolver?: DnsResolver;
    timeoutMs?: number;
  } = {},
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const deadlineAt = Date.now() + timeoutMs;
  let currentUrl: URL;

  try {
    currentUrl = new URL(value);
  } catch {
    throw new UnsafeUrlError("URL http ou https valide requise.");
  }

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const target = await assertPublicHttpUrl(
      currentUrl.toString(),
      options.resolver,
      { deadlineAt },
    );
    const response = await requestPinned(target, {
      maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
      timeoutMs: remainingTime(deadlineAt),
    });

    if (isRedirect(response.statusCode)) {
      const location = response.headers.location;

      if (!location) {
        throw new BadRequestException("Redirection externe invalide.");
      }

      if (redirectCount === MAX_REDIRECTS) {
        throw new BadRequestException("Trop de redirections externes.");
      }

      try {
        currentUrl = new URL(location, currentUrl);
      } catch {
        throw new BadRequestException("Redirection externe invalide.");
      }
      continue;
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new BadRequestException(
        `La ressource externe a repondu avec le statut ${response.statusCode}.`,
      );
    }

    return response.body;
  }

  throw new BadRequestException("Ressource externe inaccessible.");
}

export function isPublicAddress(address: string): boolean {
  const normalized = normalizeHostname(address).toLowerCase().split("%")[0];

  if (!normalized) return false;

  const family = isIP(normalized);

  if (family === 4) {
    return isPublicIpv4(normalized);
  }

  if (family !== 6) {
    return false;
  }

  const bytes = parseIpv6(normalized);
  if (!bytes) return false;

  if (
    isAll(bytes, 0) ||
    isIpv6Loopback(bytes) ||
    (bytes[0]! & 0xfe) === 0xfc ||
    (bytes[0] === 0xfe && (bytes[1]! & 0xc0) === 0x80) ||
    bytes[0] === 0xff ||
    hasPrefix(bytes, [0x20, 0x01, 0x0d, 0xb8], 32) ||
    hasPrefix(bytes, [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 64) ||
    hasPrefix(bytes, [0x20, 0x01, 0x00, 0x02, 0x00, 0x00], 48)
  ) {
    return false;
  }

  const embedded = readEmbeddedIpv4(bytes);
  return embedded ? isPublicIpv4(embedded.join(".")) : true;
}

export async function requestPinned(
  target: PinnedTarget,
  options: { maxBytes: number; timeoutMs: number },
): Promise<{
  body: string;
  headers: Record<string, string | string[] | undefined>;
  statusCode: number;
}> {
  if (options.timeoutMs <= 0) {
    throw new BadRequestException("La ressource externe a expire.");
  }

  return new Promise((resolve, reject) => {
    let request: ClientRequest | undefined;
    let response: IncomingMessage | undefined;
    let settled = false;
    const timeout = setTimeout(() => {
      fail(new BadRequestException("La ressource externe a expire."));
    }, options.timeoutMs);

    function cleanup(): void {
      clearTimeout(timeout);
    }

    function fail(error: unknown): void {
      if (settled) return;
      settled = true;
      cleanup();
      response?.destroy();
      request?.destroy();
      reject(error);
    }

    function succeed(value: {
      body: string;
      headers: Record<string, string | string[] | undefined>;
      statusCode: number;
    }): void {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    }

    request = (target.url.protocol === "https:" ? httpsRequest : httpRequest)(
      target.url,
      {
        headers: {
          accept:
            "text/html, application/xml, application/rss+xml, text/xml;q=0.9, */*;q=0.5",
          "user-agent": "ContentAI-CurationBot/1.0",
        },
        lookup: (_hostname, lookupOptions, callback) => {
          if (typeof lookupOptions === "object" && lookupOptions.all) {
            (
              callback as unknown as (
                error: null,
                addresses: Array<{ address: string; family: number }>,
              ) => void
            )(null, [{ address: target.address, family: target.family }]);
            return;
          }

          (
            callback as unknown as (
              error: null,
              address: string,
              family: number,
            ) => void
          )(null, target.address, target.family);
        },
        method: "GET",
      },
      (incoming) => {
        response = incoming;
        const chunks: Buffer[] = [];
        let receivedBytes = 0;

        incoming.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          receivedBytes += buffer.length;

          if (receivedBytes > options.maxBytes) {
            fail(
              new BadRequestException(
                "La ressource externe depasse la taille autorisee.",
              ),
            );
            return;
          }

          chunks.push(buffer);
        });
        incoming.once("aborted", () => {
          fail(
            new BadRequestException("La reponse externe a ete interrompue."),
          );
        });
        incoming.once("error", () => {
          fail(new BadRequestException("Lecture de la ressource impossible."));
        });
        incoming.once("end", () => {
          succeed({
            body: Buffer.concat(chunks).toString("utf8"),
            headers: incoming.headers,
            statusCode: incoming.statusCode ?? 502,
          });
        });
        incoming.once("close", () => {
          if (!incoming.complete) {
            fail(
              new BadRequestException("La reponse externe a ete interrompue."),
            );
          }
        });
      },
    );

    request.once("error", (error) => fail(error));
    request.end();
  });
}

async function resolveHostname(
  hostname: string,
): Promise<Array<{ address: string; family: number }>> {
  return dnsLookup(hostname, { all: true, verbatim: true });
}

async function resolveWithinDeadline(
  resolver: DnsResolver,
  hostname: string,
  timeoutMs: number,
): Promise<Array<{ address: string; family: number }>> {
  if (timeoutMs <= 0) {
    throw new BadRequestException("La resolution DNS a expire.");
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      resolver(hostname),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new BadRequestException("La resolution DNS a expire.")),
          timeoutMs,
        );
      }),
    ]);
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException("Le nom de domaine ne peut pas etre resolu.");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function remainingTime(deadlineAt?: number): number {
  if (!deadlineAt) return DEFAULT_DNS_TIMEOUT_MS;
  const remaining = deadlineAt - Date.now();
  if (remaining <= 0) {
    throw new BadRequestException("La ressource externe a expire.");
  }
  return remaining;
}

function isPublicIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a = 0, b = 0, c = 0] = parts;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function parseIpv6(address: string): number[] | null {
  let source = address;
  const ipv4Suffix = source.match(/(\d+\.\d+\.\d+\.\d+)$/)?.[1];

  if (ipv4Suffix) {
    if (!isPublicOrSpecialIpv4Syntax(ipv4Suffix)) return null;
    const octets = ipv4Suffix.split(".").map(Number);
    const first = ((octets[0] ?? 0) << 8) | (octets[1] ?? 0);
    const second = ((octets[2] ?? 0) << 8) | (octets[3] ?? 0);
    source = `${source.slice(0, -ipv4Suffix.length)}${first.toString(16)}:${second.toString(16)}`;
  }

  if ((source.match(/::/g) ?? []).length > 1) return null;
  const [head = "", tail = ""] = source.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];

  if (
    [...headParts, ...tailParts].some((part) => !/^[\da-f]{1,4}$/i.test(part))
  ) {
    return null;
  }

  const missing = 8 - headParts.length - tailParts.length;
  if (
    (source.includes("::") && missing < 1) ||
    (!source.includes("::") && missing !== 0)
  ) {
    return null;
  }

  const parts = [
    ...headParts,
    ...Array.from({ length: missing }, () => "0"),
    ...tailParts,
  ];
  if (parts.length !== 8) return null;

  return parts.flatMap((part) => {
    const value = Number.parseInt(part, 16);
    return [value >> 8, value & 0xff];
  });
}

function readEmbeddedIpv4(bytes: number[]): number[] | null {
  const firstTenZero = bytes.slice(0, 10).every((value) => value === 0);
  if (firstTenZero && bytes[10] === 0xff && bytes[11] === 0xff) {
    return bytes.slice(12, 16);
  }

  if (bytes.slice(0, 12).every((value) => value === 0)) {
    return bytes.slice(12, 16);
  }

  if (hasPrefix(bytes, [0x00, 0x64, 0xff, 0x9b], 32)) {
    return bytes.slice(12, 16);
  }

  if (hasPrefix(bytes, [0x00, 0x64, 0xff, 0x9b, 0x00, 0x01], 48)) {
    return bytes.slice(12, 16);
  }

  if (bytes[0] === 0x20 && bytes[1] === 0x02) {
    return bytes.slice(2, 6);
  }

  if (
    bytes[0] === 0x20 &&
    bytes[1] === 0x01 &&
    bytes[2] === 0x00 &&
    bytes[3] === 0x00
  ) {
    return bytes.slice(12, 16).map((value) => value ^ 0xff);
  }

  if (
    bytes[8] === 0x00 &&
    bytes[9] === 0x00 &&
    bytes[10] === 0x5e &&
    bytes[11] === 0xfe
  ) {
    return bytes.slice(12, 16);
  }

  return null;
}

function hasPrefix(
  bytes: number[],
  prefix: number[],
  bitLength: number,
): boolean {
  const fullBytes = Math.floor(bitLength / 8);
  for (let index = 0; index < fullBytes; index += 1) {
    if (bytes[index] !== prefix[index]) return false;
  }
  return true;
}

function isAll(values: number[], expected: number): boolean {
  return values.every((value) => value === expected);
}

function isIpv6Loopback(bytes: number[]): boolean {
  return bytes.slice(0, 15).every((value) => value === 0) && bytes[15] === 1;
}

function isPublicOrSpecialIpv4Syntax(address: string): boolean {
  const parts = address.split(".").map(Number);
  return (
    parts.length === 4 &&
    parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)
  );
}

function normalizeHostname(value: string): string {
  return value.replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

function isRedirect(statusCode: number): boolean {
  return [301, 302, 303, 307, 308].includes(statusCode);
}

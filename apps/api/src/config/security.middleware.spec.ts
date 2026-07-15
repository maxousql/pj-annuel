import type { NextFunction, Request, Response } from "express";

import { createRateLimitMiddleware } from "./security.middleware";

describe("rate limit storage", () => {
  it("keeps a hard bounded number of buckets", () => {
    const middleware = createRateLimitMiddleware({
      clock: () => 1_000,
      maxBuckets: 3,
    });

    for (let index = 0; index < 20; index += 1) {
      middleware(
        request(`203.0.113.${index}`),
        response(),
        jest.fn() as NextFunction,
      );
    }

    expect(middleware.getBucketCount()).toBe(3);
  });

  it("delegates to the trusted shared proxy in replica mode", () => {
    const previous = process.env.RATE_LIMIT_MODE;
    process.env.RATE_LIMIT_MODE = "proxy";
    const middleware = createRateLimitMiddleware({ maxBuckets: 1 });
    const next = jest.fn();

    try {
      middleware(request("203.0.113.1"), response(), next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(middleware.getBucketCount()).toBe(0);
    } finally {
      if (previous === undefined) delete process.env.RATE_LIMIT_MODE;
      else process.env.RATE_LIMIT_MODE = previous;
    }
  });
});

function request(ip: string): Request {
  return {
    ip,
    method: "GET",
    originalUrl: "/api/contents",
    path: "/api/contents",
    socket: { remoteAddress: ip },
  } as Request;
}

function response(): Response {
  const value = {
    json: jest.fn(),
    setHeader: jest.fn(),
    status: jest.fn(),
  };
  value.status.mockReturnValue(value);
  return value as unknown as Response;
}

import { fail } from "@content-ai/shared";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

type RateBucket = { count: number; resetAt: number };
type RateLimitMiddleware = ((
  request: Request,
  response: Response,
  next: NextFunction,
) => void) & { getBucketCount: () => number };

export function securityHeadersMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incomingRequestId = request.header("x-request-id")?.trim();
  const requestId =
    incomingRequestId && /^[a-zA-Z0-9._-]{8,100}$/.test(incomingRequestId)
      ? incomingRequestId
      : randomUUID();

  (request as Request & { requestId: string }).requestId = requestId;
  response.setHeader("x-request-id", requestId);
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.setHeader(
    "content-security-policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  );
  response.setHeader("cache-control", "no-store");

  if (process.env.NODE_ENV === "production") {
    response.setHeader(
      "strict-transport-security",
      "max-age=31536000; includeSubDomains",
    );
  }

  next();
}

export function createRateLimitMiddleware(
  options: { clock?: () => number; maxBuckets?: number } = {},
): RateLimitMiddleware {
  const buckets = new Map<string, RateBucket>();
  const maxBuckets = Math.max(1, options.maxBuckets ?? 10_000);
  const clock = options.clock ?? Date.now;

  const middleware = (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    if (
      process.env.RATE_LIMIT_MODE === "proxy" ||
      request.method === "OPTIONS" ||
      request.path.startsWith("/health")
    ) {
      next();
      return;
    }

    const isAuthRoute = request.originalUrl.includes("/api/auth/");
    const windowMs = isAuthRoute ? 60_000 : 15 * 60_000;
    const limit = isAuthRoute ? 30 : 600;
    const now = clock();
    const key = `${readClientIp(request)}:${isAuthRoute ? "auth" : "api"}`;
    evictExpiredOldestBucket(buckets, now);
    let existing = buckets.get(key);
    if (existing?.resetAt && existing.resetAt <= now) {
      buckets.delete(key);
      existing = undefined;
    }
    if (!existing && buckets.size >= maxBuckets) {
      evictOldestBucket(buckets);
    }
    const bucket = !existing ? { count: 0, resetAt: now + windowMs } : existing;
    bucket.count += 1;
    buckets.set(key, bucket);

    response.setHeader("ratelimit-limit", String(limit));
    response.setHeader(
      "ratelimit-remaining",
      String(Math.max(0, limit - bucket.count)),
    );
    response.setHeader(
      "ratelimit-reset",
      String(Math.ceil(bucket.resetAt / 1_000)),
    );

    if (bucket.count > limit) {
      response.setHeader(
        "retry-after",
        String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000))),
      );
      response
        .status(429)
        .json(fail("RATE_LIMITED", "Trop de requetes. Reessayez plus tard."));
      return;
    }

    next();
  };

  return Object.assign(middleware, {
    getBucketCount: () => buckets.size,
  });
}

function evictExpiredOldestBucket(
  buckets: Map<string, RateBucket>,
  now: number,
): void {
  const oldest = buckets.entries().next().value as
    [string, RateBucket] | undefined;
  if (oldest?.[1].resetAt && oldest[1].resetAt <= now) {
    buckets.delete(oldest[0]);
  }
}

function evictOldestBucket(buckets: Map<string, RateBucket>): void {
  const oldestKey = buckets.keys().next().value as string | undefined;
  if (oldestKey) buckets.delete(oldestKey);
}

function readClientIp(request: Request): string {
  return request.ip || request.socket.remoteAddress || "unknown";
}

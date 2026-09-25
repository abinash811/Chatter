// In-memory sliding-window rate limiter. Correct for Chatter's actual
// deployment (Render, one long-running process, not serverless/edge
// functions) — the usual "in-memory doesn't work" caveat is about
// per-invocation isolation on Vercel/edge runtimes, which doesn't apply
// here. If this ever scales to multiple instances, this needs to move
// to a shared store (Redis) instead — a single instance's in-memory map
// can't see another instance's request count.
//
// Deliberately not more general than the widget's needs (guardrail
// against unbounded scope) — keyed by an arbitrary string (caller
// decides: IP, botKey, etc.), one limit per (key, bucket) pair.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Sweep stale entries periodically so the map doesn't grow forever
// (flagged as the standard failure mode of a naive in-memory limiter).
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS).unref();

/**
 * Returns true if the request is allowed, false if the key has exceeded
 * `limit` requests within the current `windowMs` window.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

// x-forwarded-for can carry a comma-separated chain (client, proxy1,
// proxy2, ...) — the first entry is the original client. Render sets
// this; a direct connection with no proxy falls back to "unknown"
// rather than throwing, since a shared bucket for all unidentifiable
// requests is safer than no rate limit at all.
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

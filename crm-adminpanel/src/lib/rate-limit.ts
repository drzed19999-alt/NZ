// Lightweight in-memory rate limiter for webhook + auth-sensitive endpoints.
// Sufficient for a single-instance deployment. For multi-instance, back this
// with Supabase or Redis. Keyed by an arbitrary identifier (IP, key, etc.).

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number }
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: max - 1, resetAt: fresh.resetAt };
  }

  bucket.count += 1;
  const ok = bucket.count <= max;
  return { ok, remaining: Math.max(0, max - bucket.count), resetAt: bucket.resetAt };
}

// Opportunistic cleanup so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}, 60_000).unref?.();

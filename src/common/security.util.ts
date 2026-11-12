export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Bounded fixed-window in-memory rate limiter.
 * Prevents unbounded memory growth under IP-flood traffic.
 */
export class InMemoryRateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();

  constructor(
    private readonly windowMs: number,
    private readonly maxAttempts: number,
    private readonly maxEntries = 10_000,
  ) {}

  consume(key: string, now = Date.now()): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
    this.pruneIfNeeded(now);

    const normalizedKey = key || 'unknown';
    const existing = this.store.get(normalizedKey);

    if (!existing || existing.resetAt <= now) {
      if (!existing && this.store.size >= this.maxEntries) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey !== undefined) {
          this.store.delete(oldestKey);
        }
      }
      this.store.set(normalizedKey, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        remaining: Math.max(0, this.maxAttempts - 1),
        retryAfterSeconds: Math.ceil(this.windowMs / 1000),
      };
    }

    existing.count += 1;
    const allowed = existing.count <= this.maxAttempts;
    return {
      allowed,
      remaining: Math.max(0, this.maxAttempts - existing.count),
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  get size(): number {
    return this.store.size;
  }

  private pruneIfNeeded(now: number): void {
    if (this.store.size < this.maxEntries) {
      return;
    }
    for (const [entryKey, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(entryKey);
      }
    }
  }
}

export function parseTrustProxy(rawValue?: string, nodeEnv?: string): boolean | number | string {
  const trimmed = rawValue?.trim();
  if (!trimmed) {
    return nodeEnv === 'production' ? 1 : false;
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

/**
 * Resolves the client IP using Express's trust-proxy-aware `req.ip` rather than
 * trusting raw client-controlled `X-Forwarded-For` headers directly.
 */
export function resolveClientIp(req: { ip?: string; socket?: { remoteAddress?: string } }): string {
  return (req.ip || req.socket?.remoteAddress || 'unknown').trim() || 'unknown';
}

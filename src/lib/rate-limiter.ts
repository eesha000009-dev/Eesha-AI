/**
 * Rate Limiter Store — Abstraction layer for rate limiting
 *
 * Current implementation: In-memory Map (single-instance only).
 * When deploying multiple instances (e.g., Kubernetes replicas, multiple HF Spaces),
 * swap in the RedisStore implementation by setting REDIS_URL env var.
 *
 * Usage:
 *   import { rateLimiter } from '@/lib/rate-limiter';
 *   const { allowed, retryAfter } = rateLimiter.check(key, { windowMs: 60000, maxRequests: 20 });
 *
 * Architecture:
 *   ┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
 *   │   RateLimiter    │────▶│  RateLimiterStore │────▶│  InMemory   │  (default)
 *   │   (facade)       │     │  (interface)      │     │  RedisStore │  (if REDIS_URL)
 *   └─────────────────┘     └──────────────────┘     └─────────────┘
 */

// ─── Rate Limit Store Interface ─────────────────────────────────────────────

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // seconds until the limit resets
  remaining?: number;  // remaining requests in current window
}

export interface RateLimiterStore {
  /**
   * Check and increment the rate limit counter for a given key.
   * Returns whether the request is allowed and metadata.
   */
  check(key: string, config: RateLimitConfig): Promise<RateLimitResult>;

  /**
   * Clean up expired entries (called periodically).
   */
  cleanup?(): Promise<void>;
}

// ─── In-Memory Store Implementation ─────────────────────────────────────────
// Suitable for single-instance deployments (e.g., one HF Space).
// State is lost on server restart. Does NOT share state across instances.

interface InMemoryEntry {
  count: number;
  resetTime: number;
}

export class InMemoryRateLimiterStore implements RateLimiterStore {
  private store = new Map<string, InMemoryEntry>();
  private maxEntries: number;

  constructor(maxEntries = 10000) {
    this.maxEntries = maxEntries;
  }

  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(key);

    // No entry or expired window — start fresh
    if (!entry || now > entry.resetTime) {
      // Evict oldest entry if at capacity to prevent memory leaks
      if (this.store.size >= this.maxEntries) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey) this.store.delete(oldestKey);
      }

      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
      };
    }

    // Within window — check if limit exceeded
    if (entry.count >= config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        remaining: 0,
      };
    }

    // Increment counter
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
    };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    // Add buffer to avoid deleting entries that are about to reset
    const expiryBuffer = 300_000; // 5 minutes after reset
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime + expiryBuffer) {
        this.store.delete(key);
      }
    }
  }
}

// ─── Redis Store Implementation (Stub) ──────────────────────────────────────
// TODO: Implement when multi-instance deployment is needed.
// Will use Redis INCR + EXPIRE for atomic rate limiting.
//
// Example implementation:
//   async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
//     const redisKey = `ratelimit:${key}`;
//     const current = await redis.incr(redisKey);
//     if (current === 1) {
//       await redis.pexpire(redisKey, config.windowMs);
//     }
//     if (current > config.maxRequests) {
//       const ttl = await redis.pttl(redisKey);
//       return { allowed: false, retryAfter: Math.ceil(ttl / 1000), remaining: 0 };
//     }
//     return { allowed: true, remaining: config.maxRequests - current };
//   }

// ─── Rate Limiter Facade ────────────────────────────────────────────────────

export class RateLimiter {
  private store: RateLimiterStore;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(store?: RateLimiterStore) {
    // Auto-select store based on environment
    if (store) {
      this.store = store;
    } else if (process.env.REDIS_URL) {
      // Future: When RedisStore is implemented, auto-switch here
      // this.store = new RedisRateLimiterStore(process.env.REDIS_URL);
      console.warn('[RATE-LIMIT] REDIS_URL set but Redis store not yet implemented. Falling back to in-memory.');
      this.store = new InMemoryRateLimiterStore();
    } else {
      this.store = new InMemoryRateLimiterStore();
    }

    // Periodic cleanup to prevent memory leaks
    if (typeof setInterval !== 'undefined' && this.store.cleanup) {
      this.cleanupInterval = setInterval(() => {
        this.store.cleanup!().catch(() => {});
      }, 300_000); // Every 5 minutes
    }
  }

  /**
   * Check if a request is allowed under the rate limit.
   * @param key - Unique identifier (e.g., IP + endpoint type, email)
   * @param config - Rate limit configuration
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    return this.store.check(key, config);
  }

  /**
   * Stop the cleanup interval (for graceful shutdown).
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────
// One instance shared across the entire server process.
// This ensures all rate limit checks use the same store.

export const rateLimiter = new RateLimiter();

type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
  __museuDoMarRateLimitStore?: Map<string, RateLimitEntry>;
};

const store = globalForRateLimit.__museuDoMarRateLimitStore ?? new Map<string, RateLimitEntry>();

if (!globalForRateLimit.__museuDoMarRateLimitStore) {
  globalForRateLimit.__museuDoMarRateLimitStore = store;
}

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });

    return {
      success: true,
      remaining: options.limit - 1,
      retryAfterMs: 0,
    };
  }

  if (current.count >= options.limit) {
    return {
      success: false,
      remaining: 0,
      retryAfterMs: current.resetAt - now,
    };
  }

  current.count += 1;
  store.set(key, current);

  return {
    success: true,
    remaining: Math.max(options.limit - current.count, 0),
    retryAfterMs: 0,
  };
}

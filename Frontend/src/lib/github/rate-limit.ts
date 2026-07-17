type RateWindow = { startedAt: number; count: number };

export class MemoryRateLimiter {
  private readonly windows = new Map<string, RateWindow>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit = 20, windowMs = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  allow(key: string, now = Date.now()) {
    const current = this.windows.get(key);
    if (!current || now - current.startedAt >= this.windowMs) {
      this.windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= this.limit) return false;
    current.count += 1;
    return true;
  }

  clear() {
    this.windows.clear();
  }
}

// Development-safe only. Replace with a shared store before multi-instance deployment.
export const githubRateLimiter = new MemoryRateLimiter();

import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  body: any;
  contentType: string | null;
  statusCode: number;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

/**
 * In-memory TTL caching middleware for read-heavy public endpoints.
 * Perfect for absorbing 3000+ concurrent requests on leaderboards, live heats, and schedules.
 * @param ttlSeconds Time-to-live in seconds
 */
export function cacheResponse(ttlSeconds: number = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl || req.url}`;
    const now = Date.now();
    const cached = memoryCache.get(key);

    if (cached && cached.expiresAt > now) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      if (cached.contentType) {
        res.setHeader('Content-Type', cached.contentType);
      }
      return res.status(cached.statusCode).send(cached.body);
    }

    // Cache MISS: intercept res.send / res.json
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);

    const originalSend = res.send.bind(res);

    res.send = (body: any): Response => {
      // Only cache successful 2xx responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        memoryCache.set(key, {
          body,
          contentType: res.getHeader('Content-Type') as string || null,
          statusCode: res.statusCode,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
      }
      return originalSend(body);
    };

    next();
  };
}

/**
 * Invalidate all cache keys matching a prefix or pattern.
 */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(prefix)) {
      memoryCache.delete(key);
    }
  }
}

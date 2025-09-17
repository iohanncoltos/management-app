import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

export const redis = new Redis({
  url: env.server.UPSTASH_REDIS_REST_URL,
  token: env.server.UPSTASH_REDIS_REST_TOKEN,
});

interface RateLimitConfig {
  key: string;
  window: number; // milliseconds
  limit: number;
}

export async function rateLimit({ key, window, limit }: RateLimitConfig) {
  const windowSeconds = Math.ceil(window / 1000);
  const bucket = Math.floor(Date.now() / window);
  const redisKey = `ratelimit:${key}:${bucket}`;
  const count = await redis.incr(redisKey);

  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }

  return {
    success: count <= limit,
    remaining: Math.max(0, limit - count),
  };
}

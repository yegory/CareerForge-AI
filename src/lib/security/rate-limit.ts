import IORedis from "ioredis";
import { getRedisUrl } from "@/lib/env.server";

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

export class RateLimitError extends Error {
  constructor(message = "Too many requests. Try again soon.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export async function assertRateLimit(input: {
  key: string;
  limit: number;
  windowSeconds: number;
}) {
  const redisUrl = getRedisUrl();

  if (!redisUrl) {
    const now = Date.now();
    const resetAt = now + input.windowSeconds * 1000;
    const current = memoryBuckets.get(input.key);

    if (!current || current.resetAt < now) {
      memoryBuckets.set(input.key, { count: 1, resetAt });
      return;
    }

    current.count += 1;

    if (current.count > input.limit) {
      throw new RateLimitError();
    }

    return;
  }

  const redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
  });

  try {
    const count = await redis.incr(input.key);

    if (count === 1) {
      await redis.expire(input.key, input.windowSeconds);
    }

    if (count > input.limit) {
      throw new RateLimitError();
    }
  } finally {
    await redis.quit();
  }
}

import { setTimeout as sleep } from "node:timers/promises";
import { createRedisConnection } from "@/lib/queue/bullmq";

const DEFAULT_MAX_PER_MINUTE = 20;

export async function applyProviderRateLimit(input: {
  provider: string;
  userId: string;
  keyId: string;
  maxPerMinute?: number;
}) {
  const redis = createRedisConnection();
  const key = `rate:${input.provider}:${input.userId}:${input.keyId}`;
  const max = input.maxPerMinute ?? DEFAULT_MAX_PER_MINUTE;

  try {
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, 60);
    }

    if (count > max) {
      const ttl = await redis.ttl(key);
      await sleep(Math.max(ttl, 1) * 1000);
    }
  } finally {
    await redis.quit();
  }
}

import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;

export const redis = redisUrl
  ? new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null
    })
  : null;

redis?.on("error", () => undefined);

export async function pingRedis() {
  if (!redis) return { configured: false, ok: false };
  try {
    // Recover when Redis starts or restarts after the API process.
    if (redis.status === "wait" || redis.status === "end") await redis.connect();
    await redis.ping();
    return { configured: true, ok: true };
  } catch {
    return { configured: true, ok: false };
  }
}

export async function closeRedis() {
  if (!redis || redis.status === "end") return;
  await redis.quit().catch(() => redis.disconnect());
}

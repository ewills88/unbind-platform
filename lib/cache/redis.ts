import Redis from 'ioredis';

let redisClient: Redis | null = null;
let connectionFailed = false;

export function getRedisClient(): Redis | null {
  if (connectionFailed) return null;

  if (!process.env.REDIS_URL) {
    connectionFailed = true;
    console.warn('[Redis] REDIS_URL not configured, caching disabled');
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number) {
          if (times > 3) {
            connectionFailed = true;
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      redisClient.on('error', (err: Error) => {
        console.error('[Redis] Connection error:', err.message);
        connectionFailed = true;
        redisClient = null;
      });

      redisClient.on('connect', () => {
        console.log('[Redis] Connected successfully');
        connectionFailed = false;
      });
    } catch (err) {
      console.error('[Redis] Failed to create client:', err);
      connectionFailed = true;
      return null;
    }
  }

  return redisClient;
}

export function isRedisAvailable(): boolean {
  const client = getRedisClient();
  return client !== null && client.status === 'ready';
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

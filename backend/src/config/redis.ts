import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType | null = null;

const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    reconnectStrategy: (retries: number): number | Error => {
      if (retries > 10) {
        logger.error('Redis reconnection failed after 10 attempts');
        return new Error('Redis reconnection limit exceeded');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    }
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB ?? '0', 10)
};

export async function initializeRedis(): Promise<RedisClientType> {
  if (redisClient !== null) {
    return redisClient;
  }

  redisClient = createClient(redisConfig);

  redisClient.on('error', (err: Error) => {
    logger.error('Redis client error', { error: err.message, stack: err.stack });
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connecting');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready', {
      host: redisConfig.socket.host,
      port: redisConfig.socket.port,
      database: redisConfig.database
    });
  });

  redisClient.on('reconnecting', () => {
    logger.warn('Redis client reconnecting');
  });

  redisClient.on('end', () => {
    logger.info('Redis client connection closed');
  });

  await redisClient.connect();
  return redisClient;
}

export function getRedisClient(): RedisClientType {
  if (redisClient === null) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

export async function testRedisConnection(): Promise<void> {
  try {
    const client = getRedisClient();
    await client.ping();
    logger.info('Redis connection test successful');
  } catch (error) {
    logger.error('Redis connection test failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient !== null) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis connection closed successfully');
    } catch (error) {
      logger.error('Error closing Redis connection', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Session management helpers
export async function setSession(
  sessionId: string,
  data: Record<string, unknown>,
  ttlSeconds: number = 86400
): Promise<void> {
  const client = getRedisClient();
  await client.setEx(`session:${sessionId}`, ttlSeconds, JSON.stringify(data));
}

export async function getSession(sessionId: string): Promise<Record<string, unknown> | null> {
  const client = getRedisClient();
  const data = await client.get(`session:${sessionId}`);
  return data !== null ? JSON.parse(data) as Record<string, unknown> : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const client = getRedisClient();
  await client.del(`session:${sessionId}`);
}

export async function updateSessionExpiry(sessionId: string, ttlSeconds: number = 86400): Promise<void> {
  const client = getRedisClient();
  await client.expire(`session:${sessionId}`, ttlSeconds);
}

// Rate limiting helpers
export async function incrementRateLimit(
  key: string,
  windowSeconds: number
): Promise<number> {
  const client = getRedisClient();
  const fullKey = `rate_limit:${key}`;
  
  const count = await client.incr(fullKey);
  
  if (count === 1) {
    await client.expire(fullKey, windowSeconds);
  }
  
  return count;
}

export async function getRateLimitCount(key: string): Promise<number> {
  const client = getRedisClient();
  const count = await client.get(`rate_limit:${key}`);
  return count !== null ? parseInt(count, 10) : 0;
}

export async function getRateLimitTTL(key: string): Promise<number> {
  const client = getRedisClient();
  return await client.ttl(`rate_limit:${key}`);
}

export async function resetRateLimit(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(`rate_limit:${key}`);
}

// Account lockout helpers
export async function setAccountLockout(
  username: string,
  durationSeconds: number = 1800
): Promise<void> {
  const client = getRedisClient();
  await client.setEx(`lockout:${username}`, durationSeconds, Date.now().toString());
}

export async function isAccountLocked(username: string): Promise<boolean> {
  const client = getRedisClient();
  const locked = await client.exists(`lockout:${username}`);
  return locked === 1;
}

export async function unlockAccount(username: string): Promise<void> {
  const client = getRedisClient();
  await client.del(`lockout:${username}`);
}

export async function incrementFailedAuth(username: string, windowSeconds: number = 900): Promise<number> {
  const client = getRedisClient();
  const key = `failed_auth:${username}`;
  
  const count = await client.incr(key);
  
  if (count === 1) {
    await client.expire(key, windowSeconds);
  }
  
  return count;
}

export async function resetFailedAuth(username: string): Promise<void> {
  const client = getRedisClient();
  await client.del(`failed_auth:${username}`);
}

// Cache helpers
export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  const client = getRedisClient();
  const serialized = JSON.stringify(value);
  
  if (ttlSeconds !== undefined) {
    await client.setEx(`cache:${key}`, ttlSeconds, serialized);
  } else {
    await client.set(`cache:${key}`, serialized);
  }
}

export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const client = getRedisClient();
  const data = await client.get(`cache:${key}`);
  return data !== null ? JSON.parse(data) as T : null;
}

export async function deleteCache(key: string): Promise<void> {
  const client = getRedisClient();
  await client.del(`cache:${key}`);
}

export async function clearCachePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  const keys = await client.keys(`cache:${pattern}`);
  
  if (keys.length > 0) {
    await client.del(keys);
  }
}

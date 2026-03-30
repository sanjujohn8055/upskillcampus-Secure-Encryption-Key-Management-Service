import { config } from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables
config();

interface EnvironmentConfig {
  // Server
  port: number;
  nodeEnv: string;
  
  // Database
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    poolMax: number;
    poolMin: number;
    idleTimeout: number;
    connectionTimeout: number;
  };
  
  // Redis
  redis: {
    host: string;
    port: number;
    password?: string;
    database: number;
  };
  
  // Security
  security: {
    jwtSecret: string;
    sessionSecret: string;
    masterKeyEnv?: string;
  };
  
  // Rate Limiting
  rateLimit: {
    authMax: number;
    authWindow: number;
    apiMax: number;
    apiWindow: number;
  };
  
  // CORS
  cors: {
    origin: string;
  };
}

function validateRequiredEnvVar(name: string, value: string | undefined): string {
  if (value === undefined || value === '') {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

function getEnvConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  
  // In production, require critical secrets
  const requireSecret = nodeEnv === 'production';
  
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv,
    
    database: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      name: process.env.DB_NAME ?? 'secure_encryption_service',
      user: process.env.DB_USER ?? 'postgres',
      password: requireSecret 
        ? validateRequiredEnvVar('DB_PASSWORD', process.env.DB_PASSWORD)
        : (process.env.DB_PASSWORD ?? ''),
      poolMax: parseInt(process.env.DB_POOL_MAX ?? '20', 10),
      poolMin: parseInt(process.env.DB_POOL_MIN ?? '5', 10),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT ?? '30000', 10),
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '10000', 10)
    },
    
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB ?? '0', 10)
    },
    
    security: {
      jwtSecret: requireSecret
        ? validateRequiredEnvVar('JWT_SECRET', process.env.JWT_SECRET)
        : (process.env.JWT_SECRET ?? 'dev_jwt_secret_change_in_production'),
      sessionSecret: requireSecret
        ? validateRequiredEnvVar('SESSION_SECRET', process.env.SESSION_SECRET)
        : (process.env.SESSION_SECRET ?? 'dev_session_secret_change_in_production'),
      masterKeyEnv: process.env.MASTER_KEY_ENV
    },
    
    rateLimit: {
      authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '5', 10),
      authWindow: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW ?? '900', 10),
      apiMax: parseInt(process.env.RATE_LIMIT_API_MAX ?? '100', 10),
      apiWindow: parseInt(process.env.RATE_LIMIT_API_WINDOW ?? '60', 10)
    },
    
    cors: {
      origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173'
    }
  };
}

// Validate and export configuration
let envConfig: EnvironmentConfig;

try {
  envConfig = getEnvConfig();
  
  // Log configuration (without secrets)
  logger.info('Environment configuration loaded', {
    nodeEnv: envConfig.nodeEnv,
    port: envConfig.port,
    database: {
      host: envConfig.database.host,
      name: envConfig.database.name
    },
    redis: {
      host: envConfig.redis.host,
      database: envConfig.redis.database
    }
  });
  
  // Warn about insecure configurations in production
  if (envConfig.nodeEnv === 'production') {
    if (envConfig.security.masterKeyEnv !== undefined) {
      logger.warn('Master key is configured via environment variable in production. Use OS keyring instead.');
    }
    
    if (envConfig.security.jwtSecret.includes('dev') || envConfig.security.jwtSecret.includes('change')) {
      logger.error('JWT secret appears to be a default value in production!');
      throw new Error('Insecure JWT secret in production');
    }
    
    if (envConfig.security.sessionSecret.includes('dev') || envConfig.security.sessionSecret.includes('change')) {
      logger.error('Session secret appears to be a default value in production!');
      throw new Error('Insecure session secret in production');
    }
  }
  
} catch (error) {
  logger.error('Failed to load environment configuration', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  throw error;
}

export const env = envConfig;

// Helper to check if running in production
export function isProduction(): boolean {
  return env.nodeEnv === 'production';
}

// Helper to check if running in development
export function isDevelopment(): boolean {
  return env.nodeEnv === 'development';
}

// Helper to check if running in test
export function isTest(): boolean {
  return env.nodeEnv === 'test';
}

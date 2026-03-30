import type { Knex } from 'knex';
import { config } from 'dotenv';

config();

const knexConfig: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME ?? 'secure_encryption_service',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/migrations',
      tableName: 'knex_migrations',
      extension: 'ts'
    },
    seeds: {
      directory: './src/seeds',
      extension: 'ts'
    }
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME ?? 'secure_encryption_service_test',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD
    },
    pool: {
      min: 1,
      max: 5
    },
    migrations: {
      directory: './src/migrations',
      tableName: 'knex_migrations',
      extension: 'ts'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: true
      }
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN ?? '5', 10),
      max: parseInt(process.env.DB_POOL_MAX ?? '20', 10)
    },
    migrations: {
      directory: './dist/migrations',
      tableName: 'knex_migrations',
      extension: 'js'
    }
  }
};

export default knexConfig;

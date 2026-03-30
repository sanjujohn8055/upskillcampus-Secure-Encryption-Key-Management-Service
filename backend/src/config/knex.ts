import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';
import { env } from './env';
import { logger } from '../utils/logger';

const environment = env.nodeEnv;
const config = knexConfig[environment];

if (config === undefined) {
  throw new Error(`No Knex configuration found for environment: ${environment}`);
}

export const db: Knex = knex(config);

// Test database connection
export async function testKnexConnection(): Promise<void> {
  try {
    await db.raw('SELECT 1');
    logger.info('Knex database connection successful');
  } catch (error) {
    logger.error('Knex database connection failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

// Run pending migrations
export async function runMigrations(): Promise<void> {
  try {
    const [batchNo, log] = await db.migrate.latest();
    
    if (log.length === 0) {
      logger.info('Database is already up to date');
    } else {
      logger.info('Migrations completed', {
        batch: batchNo,
        migrations: log
      });
    }
  } catch (error) {
    logger.error('Migration failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

// Rollback last migration batch
export async function rollbackMigration(): Promise<void> {
  try {
    const [batchNo, log] = await db.migrate.rollback();
    logger.info('Migration rollback completed', {
      batch: batchNo,
      migrations: log
    });
  } catch (error) {
    logger.error('Migration rollback failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

// Get migration status
export async function getMigrationStatus(): Promise<unknown> {
  try {
    const [completed, pending] = await Promise.all([
      db.migrate.list(),
      db.migrate.list()
    ]);
    
    return {
      completed: completed[0],
      pending: completed[1]
    };
  } catch (error) {
    logger.error('Failed to get migration status', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

// Close database connection
export async function closeKnexConnection(): Promise<void> {
  try {
    await db.destroy();
    logger.info('Knex database connection closed');
  } catch (error) {
    logger.error('Error closing Knex connection', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

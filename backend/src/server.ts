import { initializeApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { closeKnexConnection } from './config/knex';
import { closeRedis } from './config/redis';
import { clearMasterKey } from './services/key-management/master-key';

let server: any = null;

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    const app = await initializeApp();
    
    server = app.listen(env.port, () => {
      logger.info('Server started', {
        port: env.port,
        environment: env.nodeEnv,
        nodeVersion: process.version
      });
    });
    
    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown(): Promise<void> {
  logger.info('Shutting down server');
  
  try {
    if (server !== null) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          logger.info('Server closed');
          resolve();
        });
      });
    }
    
    // Close database connection
    await closeKnexConnection();
    
    // Close Redis connection
    await closeRedis();
    
    // Clear master key from memory
    clearMasterKey();
    
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Start server
startServer();

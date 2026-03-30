import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initializeMasterKey } from './services/key-management/master-key';
import { initializeRedis } from './config/redis';
import { testDatabaseConnection, runMigrations } from './config/database';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: env.cors.origin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration
    });
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics endpoint (placeholder)
app.get('/metrics', (req: Request, res: Response) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// API Routes (placeholder - would be implemented in separate route files)
app.post('/api/v1/auth/register', (req: Request, res: Response) => {
  res.json({ message: 'Register endpoint' });
});

app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  res.json({ message: 'Login endpoint' });
});

app.post('/api/v1/auth/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logout endpoint' });
});

app.post('/api/v1/keys', (req: Request, res: Response) => {
  res.json({ message: 'Create key endpoint' });
});

app.get('/api/v1/keys', (req: Request, res: Response) => {
  res.json({ message: 'List keys endpoint' });
});

app.get('/api/v1/keys/:keyId', (req: Request, res: Response) => {
  res.json({ message: 'Get key endpoint' });
});

app.post('/api/v1/encrypt', (req: Request, res: Response) => {
  res.json({ message: 'Encrypt endpoint' });
});

app.post('/api/v1/decrypt', (req: Request, res: Response) => {
  res.json({ message: 'Decrypt endpoint' });
});

app.get('/api/v1/audit/logs', (req: Request, res: Response) => {
  res.json({ message: 'Audit logs endpoint' });
});

app.get('/api/v1/dashboard/stats', (req: Request, res: Response) => {
  res.json({ message: 'Dashboard stats endpoint' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: env.nodeEnv === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * Initialize application
 */
export async function initializeApp(): Promise<Express> {
  try {
    logger.info('Initializing application');
    
    // Initialize database
    logger.info('Testing database connection');
    await testDatabaseConnection();
    
    // Run migrations
    logger.info('Running database migrations');
    await runMigrations();
    
    // Initialize Redis
    logger.info('Initializing Redis');
    await initializeRedis();
    
    // Initialize master key
    logger.info('Initializing master key');
    await initializeMasterKey();
    
    logger.info('Application initialized successfully');
    
    return app;
  } catch (error) {
    logger.error('Application initialization failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export default app;

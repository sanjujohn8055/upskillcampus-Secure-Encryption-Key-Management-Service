import winston, { Logger, format, transports } from 'winston';
import { env, isDevelopment, isProduction } from '../config/env';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

// Custom format for structured logging
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

// Console format for development
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Create logger instance
export const logger: Logger = winston.createLogger({
  level: isDevelopment() ? 'debug' : 'info',
  levels: logLevels,
  format: customFormat,
  defaultMeta: { service: 'encryption-service' },
  transports: [
    // Console transport
    new transports.Console({
      format: isDevelopment() ? consoleFormat : customFormat,
      level: isDevelopment() ? 'debug' : 'info'
    }),
    
    // Error log file
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: customFormat
    }),
    
    // Combined log file
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      format: customFormat
    })
  ],
  exceptionHandlers: [
    new transports.File({
      filename: 'logs/exceptions.log',
      format: customFormat
    })
  ],
  rejectionHandlers: [
    new transports.File({
      filename: 'logs/rejections.log',
      format: customFormat
    })
  ]
});

// Redact sensitive data from logs
function redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password',
    'passwordHash',
    'secret',
    'token',
    'jwt',
    'sessionToken',
    'apiKey',
    'masterKey',
    'privateKey',
    'encryptedKey',
    'keyMaterial',
    'mfaSecret',
    'backupCodes'
  ];
  
  const redacted = { ...obj };
  
  for (const key of sensitiveKeys) {
    if (key in redacted) {
      redacted[key] = '[REDACTED]';
    }
  }
  
  return redacted;
}

// Log helper functions
export function logInfo(message: string, meta?: Record<string, unknown>): void {
  const redactedMeta = meta ? redactSensitiveData(meta) : {};
  logger.info(message, redactedMeta);
}

export function logError(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
  const redactedMeta = meta ? redactSensitiveData(meta) : {};
  
  if (error instanceof Error) {
    logger.error(message, {
      ...redactedMeta,
      error: error.message,
      stack: error.stack
    });
  } else {
    logger.error(message, {
      ...redactedMeta,
      error: String(error)
    });
  }
}

export function logWarn(message: string, meta?: Record<string, unknown>): void {
  const redactedMeta = meta ? redactSensitiveData(meta) : {};
  logger.warn(message, redactedMeta);
}

export function logDebug(message: string, meta?: Record<string, unknown>): void {
  const redactedMeta = meta ? redactSensitiveData(meta) : {};
  logger.debug(message, redactedMeta);
}

// Security event logging
export function logSecurityEvent(
  eventType: string,
  userId?: string,
  ipAddress?: string,
  meta?: Record<string, unknown>
): void {
  logger.info('SECURITY_EVENT', {
    eventType,
    userId,
    ipAddress,
    timestamp: new Date().toISOString(),
    ...meta
  });
}

// Audit logging
export function logAuditEvent(
  action: string,
  userId: string,
  resourceId?: string,
  result?: string,
  meta?: Record<string, unknown>
): void {
  logger.info('AUDIT_EVENT', {
    action,
    userId,
    resourceId,
    result,
    timestamp: new Date().toISOString(),
    ...meta
  });
}

// Performance logging
export function logPerformance(
  operation: string,
  durationMs: number,
  meta?: Record<string, unknown>
): void {
  const level = durationMs > 1000 ? 'warn' : 'debug';
  logger[level as keyof Logger](`Performance: ${operation}`, {
    durationMs,
    ...meta
  });
}

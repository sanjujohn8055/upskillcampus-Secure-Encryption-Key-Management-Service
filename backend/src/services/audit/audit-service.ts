import { db } from '../../config/knex';
import { createHmac } from 'crypto';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface AuditLog {
  logId: string;
  timestamp: Date;
  eventType: string;
  userId?: string;
  ipAddress: string;
  action: string;
  resourceId?: string;
  result: 'success' | 'failure';
  metadata?: Record<string, unknown>;
  signature: string;
}

export interface AuditLogFilter {
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  userId?: string;
  result?: 'success' | 'failure';
}

/**
 * Create cryptographic signature for audit log entry
 */
function signLogEntry(logData: Omit<AuditLog, 'signature'>): string {
  const dataString = JSON.stringify(logData);
  const signature = createHmac('sha256', env.security.jwtSecret)
    .update(dataString)
    .digest('hex');
  
  return signature;
}

/**
 * Verify audit log entry signature
 */
function verifyLogEntry(log: AuditLog): boolean {
  const logDataWithoutSignature = { ...log };
  delete (logDataWithoutSignature as Partial<AuditLog>).signature;
  
  const expectedSignature = signLogEntry(logDataWithoutSignature);
  return log.signature === expectedSignature;
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  eventType: 'login' | 'logout' | 'login_failed' | 'mfa_enabled',
  userId: string | undefined,
  ipAddress: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const logId = require('crypto').randomUUID();
    const timestamp = new Date();
    
    const logEntry: Omit<AuditLog, 'signature'> = {
      logId,
      timestamp,
      eventType,
      userId,
      ipAddress,
      action: `AUTH_${eventType.toUpperCase()}`,
      result: eventType === 'login_failed' ? 'failure' : 'success',
      metadata
    };
    
    const signature = signLogEntry(logEntry);
    
    await db('audit_logs').insert({
      log_id: logId,
      timestamp,
      event_type: eventType,
      user_id: userId,
      ip_address: ipAddress,
      action: logEntry.action,
      result: logEntry.result,
      metadata,
      signature
    });
    
    logger.debug('Auth event logged', { eventType, userId, ipAddress });
  } catch (error) {
    logger.error('Failed to log auth event', {
      eventType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Log key operation event
 */
export async function logKeyEvent(
  eventType: 'key_created' | 'key_rotated' | 'key_disabled' | 'key_revoked',
  userId: string,
  keyId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const logId = require('crypto').randomUUID();
    const timestamp = new Date();
    
    const logEntry: Omit<AuditLog, 'signature'> = {
      logId,
      timestamp,
      eventType,
      userId,
      ipAddress: '0.0.0.0',
      action: `KEY_${eventType.toUpperCase()}`,
      resourceId: keyId,
      result: 'success',
      metadata
    };
    
    const signature = signLogEntry(logEntry);
    
    await db('audit_logs').insert({
      log_id: logId,
      timestamp,
      event_type: eventType,
      user_id: userId,
      ip_address: '0.0.0.0',
      action: logEntry.action,
      resource_id: keyId,
      result: 'success',
      metadata,
      signature
    });
    
    logger.debug('Key event logged', { eventType, userId, keyId });
  } catch (error) {
    logger.error('Failed to log key event', {
      eventType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Log cryptographic operation event
 */
export async function logCryptoEvent(
  eventType: 'encrypt' | 'decrypt',
  userId: string,
  keyId: string,
  success: boolean,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const logId = require('crypto').randomUUID();
    const timestamp = new Date();
    
    const logEntry: Omit<AuditLog, 'signature'> = {
      logId,
      timestamp,
      eventType,
      userId,
      ipAddress: '0.0.0.0',
      action: `CRYPTO_${eventType.toUpperCase()}`,
      resourceId: keyId,
      result: success ? 'success' : 'failure',
      metadata
    };
    
    const signature = signLogEntry(logEntry);
    
    await db('audit_logs').insert({
      log_id: logId,
      timestamp,
      event_type: eventType,
      user_id: userId,
      ip_address: '0.0.0.0',
      action: logEntry.action,
      resource_id: keyId,
      result: success ? 'success' : 'failure',
      metadata,
      signature
    });
    
    logger.debug('Crypto event logged', { eventType, userId, keyId, success });
  } catch (error) {
    logger.error('Failed to log crypto event', {
      eventType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Query audit logs with filters
 */
export async function queryLogs(
  filters: AuditLogFilter,
  pagination: { page: number; pageSize: number }
): Promise<{ logs: AuditLog[]; total: number }> {
  try {
    let query = db('audit_logs');
    
    if (filters.startDate !== undefined) {
      query = query.where('timestamp', '>=', filters.startDate);
    }
    
    if (filters.endDate !== undefined) {
      query = query.where('timestamp', '<=', filters.endDate);
    }
    
    if (filters.eventType !== undefined) {
      query = query.where('event_type', filters.eventType);
    }
    
    if (filters.userId !== undefined) {
      query = query.where('user_id', filters.userId);
    }
    
    if (filters.result !== undefined) {
      query = query.where('result', filters.result);
    }
    
    const total = await query.clone().count('* as count').first();
    const logs = await query
      .orderBy('timestamp', 'desc')
      .limit(pagination.pageSize)
      .offset((pagination.page - 1) * pagination.pageSize);
    
    return {
      logs: logs.map((row) => ({
        logId: row.log_id,
        timestamp: row.timestamp,
        eventType: row.event_type,
        userId: row.user_id,
        ipAddress: row.ip_address,
        action: row.action,
        resourceId: row.resource_id,
        result: row.result,
        metadata: row.metadata,
        signature: row.signature
      })),
      total: (total as { count: number }).count
    };
  } catch (error) {
    logger.error('Failed to query audit logs', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Get single audit log entry
 */
export async function getLog(logId: string): Promise<AuditLog | null> {
  try {
    const row = await db('audit_logs').where({ log_id: logId }).first();
    
    if (row === undefined) {
      return null;
    }
    
    return {
      logId: row.log_id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      userId: row.user_id,
      ipAddress: row.ip_address,
      action: row.action,
      resourceId: row.resource_id,
      result: row.result,
      metadata: row.metadata,
      signature: row.signature
    };
  } catch (error) {
    logger.error('Failed to get audit log', {
      logId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Verify audit log integrity
 */
export async function verifyLogIntegrity(logId: string): Promise<boolean> {
  try {
    const log = await getLog(logId);
    
    if (log === null) {
      return false;
    }
    
    return verifyLogEntry(log);
  } catch (error) {
    logger.error('Failed to verify log integrity', {
      logId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Clean up old audit logs (retention policy)
 */
export async function cleanupOldLogs(retentionDays: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const result = await db('audit_logs')
      .where('timestamp', '<', cutoffDate)
      .delete();
    
    logger.info('Old audit logs cleaned up', { retentionDays, deletedCount: result });
    
    return result;
  } catch (error) {
    logger.error('Failed to cleanup old logs', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

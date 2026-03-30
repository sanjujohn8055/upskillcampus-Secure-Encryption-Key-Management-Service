import { db } from '../../config/knex';
import { getRedisClient, setSession, getSession, deleteSession, incrementFailedAuth, resetFailedAuth, setAccountLockout, isAccountLocked } from '../../config/redis';
import { CryptoService } from '../crypto/crypto-service';
import { logger } from '../../utils/logger';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { authenticator } from 'otplib';

export type Role = 'user' | 'admin';

export interface User {
  userId: string;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  mfaEnabled: boolean;
  mfaSecret?: string;
  backupCodes?: string[];
  createdAt: Date;
  lastLogin?: Date;
}

export interface Session {
  sessionId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: Role;
  iat: number;
  exp: number;
}

/**
 * Register a new user
 */
export async function registerUser(
  username: string,
  email: string,
  password: string,
  role: Role = 'user'
): Promise<User> {
  try {
    // Check if user exists
    const existing = await db('users').where({ username }).orWhere({ email }).first();
    if (existing !== undefined) {
      throw new Error('Username or email already exists');
    }
    
    // Hash password
    const passwordHash = await CryptoService.hashPassword(password);
    
    // Create user
    const userId = CryptoService.generateUUID();
    const now = new Date();
    
    await db('users').insert({
      user_id: userId,
      username,
      email,
      password_hash: passwordHash,
      role,
      created_at: now
    });
    
    logger.info('User registered', { userId, username, email });
    
    return {
      userId,
      username,
      email,
      passwordHash,
      role,
      mfaEnabled: false,
      createdAt: now
    };
  } catch (error) {
    logger.error('User registration failed', {
      username,
      email,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Authenticate user with username and password
 */
export async function authenticateUser(
  username: string,
  password: string,
  ipAddress: string
): Promise<{ userId: string; requiresMFA: boolean } | null> {
  try {
    // Check if account is locked
    if (await isAccountLocked(username)) {
      logger.warn('Login attempt on locked account', { username, ipAddress });
      return null;
    }
    
    // Get user
    const user = await db('users').where({ username }).first();
    if (user === undefined) {
      await incrementFailedAuth(username);
      logger.warn('Login failed: user not found', { username, ipAddress });
      return null;
    }
    
    // Verify password
    const isValid = await CryptoService.verifyPassword(password, user.password_hash);
    if (!isValid) {
      const failedCount = await incrementFailedAuth(username);
      
      if (failedCount >= 5) {
        await setAccountLockout(username, 1800); // 30 minutes
        logger.warn('Account locked due to failed login attempts', { username, ipAddress });
      }
      
      logger.warn('Login failed: invalid password', { username, ipAddress });
      return null;
    }
    
    // Reset failed attempts
    await resetFailedAuth(username);
    
    logger.info('User authenticated', { userId: user.user_id, username, ipAddress });
    
    return {
      userId: user.user_id,
      requiresMFA: user.mfa_enabled
    };
  } catch (error) {
    logger.error('Authentication failed', {
      username,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Create session for user
 */
export async function createSession(
  userId: string,
  ipAddress: string,
  userAgent?: string
): Promise<Session> {
  try {
    const sessionId = CryptoService.generateUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
    
    const session: Session = {
      sessionId,
      userId,
      createdAt: now,
      expiresAt,
      ipAddress
    };
    
    // Store in Redis
    await setSession(sessionId, {
      userId,
      ipAddress,
      userAgent,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    }, 86400);
    
    // Store in database
    await db('sessions').insert({
      session_id: sessionId,
      user_id: userId,
      session_token: sessionId,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: now,
      expires_at: expiresAt
    });
    
    logger.info('Session created', { sessionId, userId, ipAddress });
    
    return session;
  } catch (error) {
    logger.error('Session creation failed', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Validate session
 */
export async function validateSession(sessionId: string): Promise<Session | null> {
  try {
    const sessionData = await getSession(sessionId);
    if (sessionData === null) {
      return null;
    }
    
    return {
      sessionId,
      userId: sessionData.userId as string,
      createdAt: new Date(sessionData.createdAt as string),
      expiresAt: new Date(sessionData.expiresAt as string),
      ipAddress: sessionData.ipAddress as string
    };
  } catch (error) {
    logger.error('Session validation failed', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Invalidate session
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  try {
    await deleteSession(sessionId);
    await db('sessions').where({ session_id: sessionId }).delete();
    
    logger.info('Session invalidated', { sessionId });
  } catch (error) {
    logger.error('Session invalidation failed', {
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Generate JWT token
 */
export function generateJWT(userId: string, username: string, role: Role): string {
  const payload: JWTPayload = {
    userId,
    username,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
  };
  
  return jwt.sign(payload, env.security.jwtSecret);
}

/**
 * Validate JWT token
 */
export function validateJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, env.security.jwtSecret) as JWTPayload;
  } catch (error) {
    logger.warn('JWT validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Enable MFA for user
 */
export async function enableMFA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
  try {
    const secret = authenticator.generateSecret();
    const backupCodes = Array.from({ length: 10 }, () => CryptoService.generateRandomString(8));
    
    // Generate QR code
    const otpauth_url = authenticator.keyuri(userId, 'Encryption Service', secret);
    
    logger.info('MFA enabled for user', { userId });
    
    return {
      secret,
      qrCode: otpauth_url,
      backupCodes
    };
  } catch (error) {
    logger.error('MFA enablement failed', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Verify MFA code
 */
export function verifyMFACode(secret: string, code: string): boolean {
  try {
    return authenticator.check(code, secret);
  } catch (error) {
    logger.warn('MFA verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const row = await db('users').where({ user_id: userId }).first();
    
    if (row === undefined) {
      return null;
    }
    
    return {
      userId: row.user_id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      mfaEnabled: row.mfa_enabled,
      createdAt: row.created_at,
      lastLogin: row.last_login
    };
  } catch (error) {
    logger.error('Failed to get user', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Update last login
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    await db('users').where({ user_id: userId }).update({
      last_login: new Date()
    });
  } catch (error) {
    logger.error('Failed to update last login', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

import { pbkdf2Sync, scryptSync } from 'crypto';
import { argon2id, argon2Verify } from 'argon2';
import { generateRandomBytes } from './random';
import { logger } from '../../utils/logger';

export interface KeyDerivationParams {
  algorithm: 'argon2id' | 'pbkdf2';
  salt: Buffer;
  memoryCost?: number; // For Argon2id, in KB
  timeCost?: number; // For Argon2id, iterations
  parallelism?: number; // For Argon2id, threads
  iterations?: number; // For PBKDF2
  hashFunction?: string; // For PBKDF2
  keyLength: number;
}

/**
 * Default Argon2id parameters (meeting Requirements 3.3)
 * - Memory cost: 64 MB (65536 KB)
 * - Time cost: 3 iterations
 * - Parallelism: 4 threads
 */
export const DEFAULT_ARGON2ID_PARAMS = {
  memoryCost: 65536, // 64 MB
  timeCost: 3,
  parallelism: 4
};

/**
 * Default PBKDF2 parameters (meeting Requirement 3.4)
 * - Iterations: 600,000
 * - Hash function: HMAC-SHA256
 */
export const DEFAULT_PBKDF2_PARAMS = {
  iterations: 600000,
  hashFunction: 'sha256'
};

/**
 * Derive key from password using Argon2id
 * @param password User password
 * @param salt Random salt
 * @param keyLength Desired key length in bytes
 * @param params Optional Argon2id parameters
 * @returns Derived key
 */
export async function deriveKeyArgon2id(
  password: string,
  salt: Buffer,
  keyLength: number,
  params?: Partial<typeof DEFAULT_ARGON2ID_PARAMS>
): Promise<Buffer> {
  const finalParams = {
    ...DEFAULT_ARGON2ID_PARAMS,
    ...params
  };
  
  try {
    const hash = await argon2id({
      password,
      salt,
      memoryCost: finalParams.memoryCost,
      timeCost: finalParams.timeCost,
      parallelism: finalParams.parallelism,
      hashLen: keyLength,
      type: 2 // Argon2id
    });
    
    logger.debug('Argon2id key derivation successful', {
      keyLength,
      memoryCost: finalParams.memoryCost,
      timeCost: finalParams.timeCost,
      parallelism: finalParams.parallelism
    });
    
    return Buffer.from(hash);
  } catch (error) {
    logger.error('Argon2id key derivation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Derive key from password using PBKDF2
 * @param password User password
 * @param salt Random salt
 * @param keyLength Desired key length in bytes
 * @param params Optional PBKDF2 parameters
 * @returns Derived key
 */
export function deriveKeyPBKDF2(
  password: string,
  salt: Buffer,
  keyLength: number,
  params?: Partial<typeof DEFAULT_PBKDF2_PARAMS>
): Buffer {
  const finalParams = {
    ...DEFAULT_PBKDF2_PARAMS,
    ...params
  };
  
  try {
    const digest = `${finalParams.hashFunction}`;
    const key = pbkdf2Sync(password, salt, finalParams.iterations, keyLength, digest);
    
    logger.debug('PBKDF2 key derivation successful', {
      keyLength,
      iterations: finalParams.iterations,
      hashFunction: finalParams.hashFunction
    });
    
    return key;
  } catch (error) {
    logger.error('PBKDF2 key derivation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Hash password using Argon2id for storage
 * @param password User password
 * @param params Optional Argon2id parameters
 * @returns Password hash
 */
export async function hashPasswordArgon2id(
  password: string,
  params?: Partial<typeof DEFAULT_ARGON2ID_PARAMS>
): Promise<string> {
  const finalParams = {
    ...DEFAULT_ARGON2ID_PARAMS,
    ...params
  };
  
  try {
    const hash = await argon2id({
      password,
      salt: generateRandomBytes(16),
      memoryCost: finalParams.memoryCost,
      timeCost: finalParams.timeCost,
      parallelism: finalParams.parallelism,
      type: 2 // Argon2id
    });
    
    logger.debug('Password hashing with Argon2id successful');
    
    return hash;
  } catch (error) {
    logger.error('Password hashing with Argon2id failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Verify password against Argon2id hash
 * @param password User password
 * @param hash Stored password hash
 * @returns true if password matches, false otherwise
 */
export async function verifyPasswordArgon2id(password: string, hash: string): Promise<boolean> {
  try {
    const isValid = await argon2Verify({
      password,
      hash
    });
    
    logger.debug('Password verification with Argon2id completed', { isValid });
    
    return isValid;
  } catch (error) {
    logger.error('Password verification with Argon2id failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Generate random salt for key derivation
 * @param length Salt length in bytes (default: 16)
 * @returns Random salt
 */
export function generateSalt(length: number = 16): Buffer {
  if (length < 8) {
    throw new Error('Salt length must be at least 8 bytes');
  }
  
  if (length > 1024) {
    throw new Error('Salt length must not exceed 1024 bytes');
  }
  
  return generateRandomBytes(length);
}

/**
 * Derive key with automatic algorithm selection
 * @param password User password
 * @param salt Random salt
 * @param keyLength Desired key length
 * @param algorithm Algorithm to use ('argon2id' or 'pbkdf2')
 * @param params Optional algorithm parameters
 * @returns Derived key
 */
export async function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  algorithm: 'argon2id' | 'pbkdf2' = 'argon2id',
  params?: Partial<typeof DEFAULT_ARGON2ID_PARAMS | typeof DEFAULT_PBKDF2_PARAMS>
): Promise<Buffer> {
  if (algorithm === 'argon2id') {
    return deriveKeyArgon2id(password, salt, keyLength, params as Partial<typeof DEFAULT_ARGON2ID_PARAMS>);
  } else if (algorithm === 'pbkdf2') {
    return deriveKeyPBKDF2(password, salt, keyLength, params as Partial<typeof DEFAULT_PBKDF2_PARAMS>);
  } else {
    throw new Error(`Unknown key derivation algorithm: ${algorithm}`);
  }
}

/**
 * Validate key derivation parameters
 * @param params Parameters to validate
 */
export function validateKeyDerivationParams(params: KeyDerivationParams): void {
  if (params.keyLength < 16) {
    throw new Error('Key length must be at least 16 bytes');
  }
  
  if (params.keyLength > 1024) {
    throw new Error('Key length must not exceed 1024 bytes');
  }
  
  if (params.salt.length < 8) {
    throw new Error('Salt must be at least 8 bytes');
  }
  
  if (params.algorithm === 'argon2id') {
    if (params.memoryCost !== undefined && params.memoryCost < 8) {
      throw new Error('Argon2id memory cost must be at least 8 KB');
    }
    
    if (params.timeCost !== undefined && params.timeCost < 1) {
      throw new Error('Argon2id time cost must be at least 1');
    }
    
    if (params.parallelism !== undefined && params.parallelism < 1) {
      throw new Error('Argon2id parallelism must be at least 1');
    }
  } else if (params.algorithm === 'pbkdf2') {
    if (params.iterations !== undefined && params.iterations < 100000) {
      throw new Error('PBKDF2 iterations must be at least 100,000');
    }
  }
}

import { db } from '../../config/knex';
import { CryptoService } from '../crypto/crypto-service';
import { encryptKeyMaterial, decryptKeyMaterial } from './master-key';
import { logger } from '../../utils/logger';

export type KeyType = 'symmetric' | 'asymmetric' | 'derived';
export type KeyStatus = 'active' | 'disabled' | 'revoked' | 'deprecated';
export type SymmetricAlgorithm = 'AES-256-GCM' | 'ChaCha20-Poly1305';
export type AsymmetricAlgorithm = 'RSA-2048' | 'RSA-4096' | 'X25519';

export interface Key {
  keyId: string;
  userId: string;
  keyType: KeyType;
  algorithm: string;
  status: KeyStatus;
  encryptedKeyMaterial: Buffer;
  publicKey?: Buffer;
  nonce: Buffer;
  tag: Buffer;
  derivationSalt?: Buffer;
  derivationParams?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  lastRotated?: Date;
  disabledAt?: Date;
  revokedAt?: Date;
}

export interface CreateKeyOptions {
  userId: string;
  keyType: KeyType;
  algorithm: string;
  password?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new symmetric encryption key
 * @param userId User ID
 * @param algorithm Encryption algorithm
 * @param metadata Optional metadata
 * @returns Created key
 */
export async function createSymmetricKey(
  userId: string,
  algorithm: SymmetricAlgorithm,
  metadata?: Record<string, unknown>
): Promise<Key> {
  try {
    // Generate random key material
    const keyMaterial = CryptoService.generateRandomBytes(32);
    
    // Encrypt key material with master key
    const encrypted = encryptKeyMaterial(keyMaterial);
    
    // Create key record
    const keyId = CryptoService.generateUUID();
    const now = new Date();
    
    const key: Key = {
      keyId,
      userId,
      keyType: 'symmetric',
      algorithm,
      status: 'active',
      encryptedKeyMaterial: encrypted.ciphertext,
      nonce: encrypted.nonce,
      tag: encrypted.tag,
      metadata,
      createdAt: now
    };
    
    // Store in database
    await db('keys').insert({
      key_id: key.keyId,
      user_id: key.userId,
      key_type: key.keyType,
      algorithm: key.algorithm,
      status: key.status,
      encrypted_key_material: key.encryptedKeyMaterial,
      nonce: key.nonce,
      tag: key.tag,
      metadata: key.metadata,
      created_at: key.createdAt
    });
    
    logger.info('Symmetric key created', {
      keyId: key.keyId,
      userId: key.userId,
      algorithm: key.algorithm
    });
    
    return key;
  } catch (error) {
    logger.error('Failed to create symmetric key', {
      userId,
      algorithm,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Create a new asymmetric key pair
 * @param userId User ID
 * @param algorithm Key pair algorithm
 * @param metadata Optional metadata
 * @returns Created key pair
 */
export async function createAsymmetricKey(
  userId: string,
  algorithm: AsymmetricAlgorithm,
  metadata?: Record<string, unknown>
): Promise<Key> {
  try {
    // Generate key pair
    const keyPair = CryptoService.generateAsymmetricKeyPair(algorithm);
    
    // Export private key to PEM
    let privateKeyPEM: string;
    let publicKeyPEM: string;
    
    if (algorithm === 'RSA-2048' || algorithm === 'RSA-4096') {
      const { exportRSAKeyPairToPEM } = await import('../crypto/rsa');
      const pem = exportRSAKeyPairToPEM(keyPair);
      privateKeyPEM = pem.privateKey;
      publicKeyPEM = pem.publicKey;
    } else if (algorithm === 'X25519') {
      const { exportX25519KeyPairToPEM } = await import('../crypto/x25519');
      const pem = exportX25519KeyPairToPEM(keyPair);
      privateKeyPEM = pem.privateKey;
      publicKeyPEM = pem.publicKey;
    } else {
      throw new Error(`Unknown asymmetric algorithm: ${algorithm}`);
    }
    
    // Encrypt private key material
    const privateKeyBuffer = Buffer.from(privateKeyPEM, 'utf8');
    const encrypted = encryptKeyMaterial(privateKeyBuffer);
    
    // Create key record
    const keyId = CryptoService.generateUUID();
    const now = new Date();
    
    const key: Key = {
      keyId,
      userId,
      keyType: 'asymmetric',
      algorithm,
      status: 'active',
      encryptedKeyMaterial: encrypted.ciphertext,
      publicKey: Buffer.from(publicKeyPEM, 'utf8'),
      nonce: encrypted.nonce,
      tag: encrypted.tag,
      metadata,
      createdAt: now
    };
    
    // Store in database
    await db('keys').insert({
      key_id: key.keyId,
      user_id: key.userId,
      key_type: key.keyType,
      algorithm: key.algorithm,
      status: key.status,
      encrypted_key_material: key.encryptedKeyMaterial,
      public_key: key.publicKey,
      nonce: key.nonce,
      tag: key.tag,
      metadata: key.metadata,
      created_at: key.createdAt
    });
    
    logger.info('Asymmetric key created', {
      keyId: key.keyId,
      userId: key.userId,
      algorithm: key.algorithm
    });
    
    return key;
  } catch (error) {
    logger.error('Failed to create asymmetric key', {
      userId,
      algorithm,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Create a password-derived key
 * @param userId User ID
 * @param password Password for key derivation
 * @param algorithm Key derivation algorithm
 * @param metadata Optional metadata
 * @returns Created key
 */
export async function createDerivedKey(
  userId: string,
  password: string,
  algorithm: 'Argon2id' | 'PBKDF2-HMAC-SHA256' = 'Argon2id',
  metadata?: Record<string, unknown>
): Promise<Key> {
  try {
    // Generate salt
    const salt = CryptoService.generateSalt(16);
    
    // Derive key from password
    const { key: derivedKey } = await CryptoService.deriveKeyFromPassword(
      password,
      algorithm,
      32,
      salt
    );
    
    // Encrypt derived key material
    const encrypted = encryptKeyMaterial(derivedKey);
    
    // Create key record
    const keyId = CryptoService.generateUUID();
    const now = new Date();
    
    const key: Key = {
      keyId,
      userId,
      keyType: 'derived',
      algorithm,
      status: 'active',
      encryptedKeyMaterial: encrypted.ciphertext,
      nonce: encrypted.nonce,
      tag: encrypted.tag,
      derivationSalt: salt,
      derivationParams: {
        algorithm
      },
      metadata,
      createdAt: now
    };
    
    // Store in database
    await db('keys').insert({
      key_id: key.keyId,
      user_id: key.userId,
      key_type: key.keyType,
      algorithm: key.algorithm,
      status: key.status,
      encrypted_key_material: key.encryptedKeyMaterial,
      nonce: key.nonce,
      tag: key.tag,
      derivation_salt: key.derivationSalt,
      derivation_params: key.derivationParams,
      metadata: key.metadata,
      created_at: key.createdAt
    });
    
    logger.info('Derived key created', {
      keyId: key.keyId,
      userId: key.userId,
      algorithm: key.algorithm
    });
    
    return key;
  } catch (error) {
    logger.error('Failed to create derived key', {
      userId,
      algorithm,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Get key by ID with ownership verification
 * @param keyId Key ID
 * @param userId User ID (for ownership verification)
 * @returns Key
 */
export async function getKey(keyId: string, userId: string): Promise<Key | null> {
  try {
    const row = await db('keys')
      .where({ key_id: keyId, user_id: userId })
      .first();
    
    if (row === undefined) {
      logger.warn('Key not found or access denied', { keyId, userId });
      return null;
    }
    
    return {
      keyId: row.key_id,
      userId: row.user_id,
      keyType: row.key_type,
      algorithm: row.algorithm,
      status: row.status,
      encryptedKeyMaterial: row.encrypted_key_material,
      publicKey: row.public_key,
      nonce: row.nonce,
      tag: row.tag,
      derivationSalt: row.derivation_salt,
      derivationParams: row.derivation_params,
      metadata: row.metadata,
      createdAt: row.created_at,
      lastRotated: row.last_rotated,
      disabledAt: row.disabled_at,
      revokedAt: row.revoked_at
    };
  } catch (error) {
    logger.error('Failed to get key', {
      keyId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * List keys for a user
 * @param userId User ID
 * @param filters Optional filters
 * @returns List of keys
 */
export async function listKeys(
  userId: string,
  filters?: { status?: KeyStatus; type?: KeyType }
): Promise<Key[]> {
  try {
    let query = db('keys').where({ user_id: userId });
    
    if (filters?.status !== undefined) {
      query = query.where({ status: filters.status });
    }
    
    if (filters?.type !== undefined) {
      query = query.where({ key_type: filters.type });
    }
    
    const rows = await query.orderBy('created_at', 'desc');
    
    return rows.map((row) => ({
      keyId: row.key_id,
      userId: row.user_id,
      keyType: row.key_type,
      algorithm: row.algorithm,
      status: row.status,
      encryptedKeyMaterial: row.encrypted_key_material,
      publicKey: row.public_key,
      nonce: row.nonce,
      tag: row.tag,
      derivationSalt: row.derivation_salt,
      derivationParams: row.derivation_params,
      metadata: row.metadata,
      createdAt: row.created_at,
      lastRotated: row.last_rotated,
      disabledAt: row.disabled_at,
      revokedAt: row.revoked_at
    }));
  } catch (error) {
    logger.error('Failed to list keys', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Decrypt key material
 * @param key Key record
 * @returns Decrypted key material
 */
export function decryptKey(key: Key): Buffer {
  try {
    return decryptKeyMaterial(key.encryptedKeyMaterial, key.nonce, key.tag);
  } catch (error) {
    logger.error('Failed to decrypt key', {
      keyId: key.keyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Disable a key (prevent new encryption, allow decryption)
 * @param keyId Key ID
 * @param userId User ID
 * @returns Updated key
 */
export async function disableKey(keyId: string, userId: string): Promise<Key | null> {
  try {
    const now = new Date();
    
    await db('keys')
      .where({ key_id: keyId, user_id: userId })
      .update({
        status: 'disabled',
        disabled_at: now
      });
    
    logger.info('Key disabled', { keyId, userId });
    
    return getKey(keyId, userId);
  } catch (error) {
    logger.error('Failed to disable key', {
      keyId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Revoke a key (prevent all operations)
 * @param keyId Key ID
 * @param userId User ID
 * @returns Updated key
 */
export async function revokeKey(keyId: string, userId: string): Promise<Key | null> {
  try {
    const now = new Date();
    
    await db('keys')
      .where({ key_id: keyId, user_id: userId })
      .update({
        status: 'revoked',
        revoked_at: now
      });
    
    logger.info('Key revoked', { keyId, userId });
    
    return getKey(keyId, userId);
  } catch (error) {
    logger.error('Failed to revoke key', {
      keyId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

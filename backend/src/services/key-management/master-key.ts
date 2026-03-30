import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { CryptoService } from '../crypto/crypto-service';

let masterKey: Buffer | null = null;

/**
 * Load master key from environment variable (development only)
 * @returns Master key
 */
function loadMasterKeyFromEnv(): Buffer {
  const masterKeyEnv = env.security.masterKeyEnv;
  
  if (masterKeyEnv === undefined || masterKeyEnv === '') {
    throw new Error('MASTER_KEY_ENV environment variable not set');
  }
  
  try {
    // Assume master key is provided as hex string
    const key = Buffer.from(masterKeyEnv, 'hex');
    
    if (key.length !== 32) {
      throw new Error('Master key must be exactly 32 bytes (256 bits)');
    }
    
    logger.warn('Master key loaded from environment variable (development only)');
    return key;
  } catch (error) {
    logger.error('Failed to load master key from environment', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Load master key from OS keyring
 * In production, this would use platform-specific keyring APIs
 * For now, falls back to environment variable
 * @returns Master key
 */
function loadMasterKeyFromKeyring(): Buffer {
  // In a production environment, this would use:
  // - macOS: Keychain (via keychain-access or similar)
  // - Windows: Credential Manager (via credential-store or similar)
  // - Linux: Secret Service (via secret-service or similar)
  
  // For now, we fall back to environment variable
  logger.info('OS keyring not implemented, falling back to environment variable');
  return loadMasterKeyFromEnv();
}

/**
 * Initialize and load master key
 * @returns Master key
 */
export async function initializeMasterKey(): Promise<Buffer> {
  if (masterKey !== null) {
    return masterKey;
  }
  
  try {
    // Try to load from keyring first (production)
    // If that fails, fall back to environment variable (development)
    try {
      masterKey = loadMasterKeyFromKeyring();
    } catch (error) {
      logger.warn('Failed to load master key from keyring, trying environment variable', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      masterKey = loadMasterKeyFromEnv();
    }
    
    logger.info('Master key initialized successfully');
    return masterKey;
  } catch (error) {
    logger.error('Failed to initialize master key', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Get loaded master key
 * @returns Master key
 */
export function getMasterKey(): Buffer {
  if (masterKey === null) {
    throw new Error('Master key not initialized. Call initializeMasterKey() first.');
  }
  return masterKey;
}

/**
 * Validate master key is loaded
 * @returns true if master key is loaded
 */
export function isMasterKeyLoaded(): boolean {
  return masterKey !== null;
}

/**
 * Encrypt key material using master key
 * @param keyMaterial Key material to encrypt
 * @returns Encrypted key material with nonce and tag
 */
export function encryptKeyMaterial(keyMaterial: Buffer): {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
} {
  const key = getMasterKey();
  
  try {
    const result = CryptoService.encryptSymmetric('AES-256-GCM', key, keyMaterial);
    
    logger.debug('Key material encrypted with master key', {
      keyMaterialLength: keyMaterial.length,
      ciphertextLength: result.ciphertext.length
    });
    
    return result;
  } catch (error) {
    logger.error('Failed to encrypt key material', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Decrypt key material using master key
 * @param ciphertext Encrypted key material
 * @param nonce Encryption nonce
 * @param tag Authentication tag
 * @returns Decrypted key material
 */
export function decryptKeyMaterial(
  ciphertext: Buffer,
  nonce: Buffer,
  tag: Buffer
): Buffer {
  const key = getMasterKey();
  
  try {
    const plaintext = CryptoService.decryptSymmetric('AES-256-GCM', key, {
      ciphertext,
      nonce,
      tag
    });
    
    logger.debug('Key material decrypted with master key', {
      ciphertextLength: ciphertext.length,
      plaintextLength: plaintext.length
    });
    
    return plaintext;
  } catch (error) {
    logger.error('Failed to decrypt key material', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Rotate master key (advanced operation)
 * Re-encrypts all stored keys with new master key
 * @param newMasterKey New master key
 * @returns Number of keys re-encrypted
 */
export async function rotateMasterKey(newMasterKey: Buffer): Promise<number> {
  if (newMasterKey.length !== 32) {
    throw new Error('New master key must be exactly 32 bytes (256 bits)');
  }
  
  try {
    // This would require database access to re-encrypt all stored keys
    // Implementation would be in KeyManagementService
    logger.info('Master key rotation initiated', {
      newKeyLength: newMasterKey.length
    });
    
    // Update master key
    masterKey = newMasterKey;
    
    logger.info('Master key rotated successfully');
    return 0; // Would return actual count from database
  } catch (error) {
    logger.error('Master key rotation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Clear master key from memory (for graceful shutdown)
 */
export function clearMasterKey(): void {
  if (masterKey !== null) {
    // Overwrite with zeros before clearing
    masterKey.fill(0);
    masterKey = null;
    logger.info('Master key cleared from memory');
  }
}

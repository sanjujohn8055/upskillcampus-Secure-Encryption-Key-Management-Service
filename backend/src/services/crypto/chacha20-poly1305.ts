import { createCipheriv, createDecipheriv } from 'crypto';
import { generateRandomBytes } from './random';
import { logger } from '../../utils/logger';

const ALGORITHM = 'chacha20-poly1305';
const KEY_LENGTH = 32; // 256 bits
const NONCE_LENGTH = 12; // 96 bits
const TAG_LENGTH = 16; // 128 bits

export interface EncryptionResult {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
}

export interface DecryptionInput {
  ciphertext: Buffer;
  nonce: Buffer;
  tag: Buffer;
  associatedData?: Buffer;
}

/**
 * Encrypt plaintext using ChaCha20-Poly1305
 * @param key 256-bit encryption key
 * @param plaintext Data to encrypt
 * @param associatedData Optional additional authenticated data
 * @returns Encryption result with ciphertext, nonce, and tag
 */
export function encryptChaCha20Poly1305(
  key: Buffer,
  plaintext: Buffer,
  associatedData?: Buffer
): EncryptionResult {
  // Validate key length
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be exactly ${KEY_LENGTH} bytes (256 bits)`);
  }
  
  // Generate random nonce
  const nonce = generateRandomBytes(NONCE_LENGTH);
  
  try {
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, nonce);
    
    // Add associated data if provided
    if (associatedData !== undefined && associatedData.length > 0) {
      cipher.setAAD(associatedData);
    }
    
    // Encrypt plaintext
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final()
    ]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    logger.debug('ChaCha20-Poly1305 encryption successful', {
      plaintextLength: plaintext.length,
      ciphertextLength: ciphertext.length,
      hasAAD: associatedData !== undefined && associatedData.length > 0
    });
    
    return {
      ciphertext,
      nonce,
      tag
    };
  } catch (error) {
    logger.error('ChaCha20-Poly1305 encryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Decrypt ciphertext using ChaCha20-Poly1305
 * @param key 256-bit decryption key
 * @param input Decryption input with ciphertext, nonce, and tag
 * @returns Decrypted plaintext
 */
export function decryptChaCha20Poly1305(
  key: Buffer,
  input: DecryptionInput
): Buffer {
  // Validate key length
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be exactly ${KEY_LENGTH} bytes (256 bits)`);
  }
  
  // Validate nonce length
  if (input.nonce.length !== NONCE_LENGTH) {
    throw new Error(`Nonce must be exactly ${NONCE_LENGTH} bytes (96 bits)`);
  }
  
  // Validate tag length
  if (input.tag.length !== TAG_LENGTH) {
    throw new Error(`Tag must be exactly ${TAG_LENGTH} bytes (128 bits)`);
  }
  
  try {
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, input.nonce);
    
    // Set authentication tag
    decipher.setAuthTag(input.tag);
    
    // Add associated data if provided
    if (input.associatedData !== undefined && input.associatedData.length > 0) {
      decipher.setAAD(input.associatedData);
    }
    
    // Decrypt ciphertext
    const plaintext = Buffer.concat([
      decipher.update(input.ciphertext),
      decipher.final()
    ]);
    
    logger.debug('ChaCha20-Poly1305 decryption successful', {
      ciphertextLength: input.ciphertext.length,
      plaintextLength: plaintext.length,
      hasAAD: input.associatedData !== undefined && input.associatedData.length > 0
    });
    
    return plaintext;
  } catch (error) {
    logger.error('ChaCha20-Poly1305 decryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });
    
    // Throw authentication error for tag verification failures
    if (error instanceof Error && error.message.includes('Unsupported state or unable to authenticate data')) {
      throw new Error('Authentication tag verification failed');
    }
    
    throw error;
  }
}

/**
 * Validate ChaCha20-Poly1305 parameters
 * @param key Encryption key
 * @param nonce Nonce
 * @param tag Authentication tag
 */
export function validateChaCha20Poly1305Parameters(
  key: Buffer,
  nonce: Buffer,
  tag: Buffer
): void {
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Key must be exactly ${KEY_LENGTH} bytes`);
  }
  
  if (nonce.length !== NONCE_LENGTH) {
    throw new Error(`Nonce must be exactly ${NONCE_LENGTH} bytes`);
  }
  
  if (tag.length !== TAG_LENGTH) {
    throw new Error(`Tag must be exactly ${TAG_LENGTH} bytes`);
  }
}

/**
 * Get ChaCha20-Poly1305 algorithm parameters
 */
export function getChaCha20Poly1305Parameters(): {
  algorithm: string;
  keyLength: number;
  nonceLength: number;
  tagLength: number;
} {
  return {
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH,
    nonceLength: NONCE_LENGTH,
    tagLength: TAG_LENGTH
  };
}

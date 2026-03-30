import { KeyObject } from 'crypto';
import { encryptAES256GCM, decryptAES256GCM, EncryptionResult as AESResult } from './aes-gcm';
import { encryptChaCha20Poly1305, decryptChaCha20Poly1305, EncryptionResult as ChaChaResult } from './chacha20-poly1305';
import { generateRSA2048KeyPair, generateRSA4096KeyPair, encryptRSA, decryptRSA } from './rsa';
import { generateX25519KeyPair, performX25519KeyExchange } from './x25519';
import { deriveKey, generateSalt, hashPasswordArgon2id, verifyPasswordArgon2id } from './key-derivation';
import { generateRandomBytes, generateUUID } from './random';
import { logger } from '../../utils/logger';

export type SymmetricAlgorithm = 'AES-256-GCM' | 'ChaCha20-Poly1305';
export type AsymmetricAlgorithm = 'RSA-2048' | 'RSA-4096' | 'X25519';
export type KeyDerivationAlgorithm = 'Argon2id' | 'PBKDF2-HMAC-SHA256';

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

export interface KeyPair {
  publicKey: KeyObject;
  privateKey: KeyObject;
}

/**
 * CryptoService provides unified interface for all cryptographic operations
 */
export class CryptoService {
  /**
   * Encrypt data using symmetric encryption
   * @param algorithm Encryption algorithm
   * @param key Encryption key
   * @param plaintext Data to encrypt
   * @param associatedData Optional AAD
   * @returns Encryption result
   */
  static encryptSymmetric(
    algorithm: SymmetricAlgorithm,
    key: Buffer,
    plaintext: Buffer,
    associatedData?: Buffer
  ): EncryptionResult {
    try {
      let result: AESResult | ChaChaResult;
      
      switch (algorithm) {
        case 'AES-256-GCM':
          result = encryptAES256GCM(key, plaintext, associatedData);
          break;
        case 'ChaCha20-Poly1305':
          result = encryptChaCha20Poly1305(key, plaintext, associatedData);
          break;
        default:
          throw new Error(`Unknown symmetric algorithm: ${algorithm}`);
      }
      
      logger.debug('Symmetric encryption completed', {
        algorithm,
        plaintextLength: plaintext.length,
        ciphertextLength: result.ciphertext.length
      });
      
      return result;
    } catch (error) {
      logger.error('Symmetric encryption failed', {
        algorithm,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Decrypt data using symmetric encryption
   * @param algorithm Decryption algorithm
   * @param key Decryption key
   * @param input Decryption input
   * @returns Decrypted plaintext
   */
  static decryptSymmetric(
    algorithm: SymmetricAlgorithm,
    key: Buffer,
    input: DecryptionInput
  ): Buffer {
    try {
      let plaintext: Buffer;
      
      switch (algorithm) {
        case 'AES-256-GCM':
          plaintext = decryptAES256GCM(key, input);
          break;
        case 'ChaCha20-Poly1305':
          plaintext = decryptChaCha20Poly1305(key, input);
          break;
        default:
          throw new Error(`Unknown symmetric algorithm: ${algorithm}`);
      }
      
      logger.debug('Symmetric decryption completed', {
        algorithm,
        ciphertextLength: input.ciphertext.length,
        plaintextLength: plaintext.length
      });
      
      return plaintext;
    } catch (error) {
      logger.error('Symmetric decryption failed', {
        algorithm,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Generate asymmetric key pair
   * @param algorithm Key pair algorithm
   * @returns Generated key pair
   */
  static generateAsymmetricKeyPair(algorithm: AsymmetricAlgorithm): KeyPair {
    try {
      let keyPair: KeyPair;
      
      switch (algorithm) {
        case 'RSA-2048':
          keyPair = generateRSA2048KeyPair();
          break;
        case 'RSA-4096':
          keyPair = generateRSA4096KeyPair();
          break;
        case 'X25519':
          keyPair = generateX25519KeyPair();
          break;
        default:
          throw new Error(`Unknown asymmetric algorithm: ${algorithm}`);
      }
      
      logger.debug('Asymmetric key pair generated', { algorithm });
      
      return keyPair;
    } catch (error) {
      logger.error('Asymmetric key pair generation failed', {
        algorithm,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Encrypt data using asymmetric encryption
   * @param publicKey Public key
   * @param plaintext Data to encrypt
   * @returns Encrypted ciphertext
   */
  static encryptAsymmetric(publicKey: KeyObject, plaintext: Buffer): Buffer {
    try {
      const ciphertext = encryptRSA(publicKey, plaintext);
      
      logger.debug('Asymmetric encryption completed', {
        plaintextLength: plaintext.length,
        ciphertextLength: ciphertext.length
      });
      
      return ciphertext;
    } catch (error) {
      logger.error('Asymmetric encryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Decrypt data using asymmetric encryption
   * @param privateKey Private key
   * @param ciphertext Encrypted data
   * @returns Decrypted plaintext
   */
  static decryptAsymmetric(privateKey: KeyObject, ciphertext: Buffer): Buffer {
    try {
      const plaintext = decryptRSA(privateKey, ciphertext);
      
      logger.debug('Asymmetric decryption completed', {
        ciphertextLength: ciphertext.length,
        plaintextLength: plaintext.length
      });
      
      return plaintext;
    } catch (error) {
      logger.error('Asymmetric decryption failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Perform key exchange (ECDH)
   * @param privateKey Private key
   * @param publicKey Public key
   * @returns Shared secret
   */
  static performKeyExchange(privateKey: KeyObject, publicKey: KeyObject): Buffer {
    try {
      const sharedSecret = performX25519KeyExchange(privateKey, publicKey);
      
      logger.debug('Key exchange completed', {
        sharedSecretLength: sharedSecret.length
      });
      
      return sharedSecret;
    } catch (error) {
      logger.error('Key exchange failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Derive key from password
   * @param password User password
   * @param algorithm Key derivation algorithm
   * @param keyLength Desired key length
   * @param salt Optional salt (generated if not provided)
   * @returns Derived key and salt
   */
  static async deriveKeyFromPassword(
    password: string,
    algorithm: KeyDerivationAlgorithm = 'Argon2id',
    keyLength: number = 32,
    salt?: Buffer
  ): Promise<{ key: Buffer; salt: Buffer }> {
    try {
      const finalSalt = salt ?? generateSalt(16);
      
      const algo = algorithm === 'Argon2id' ? 'argon2id' : 'pbkdf2';
      const key = await deriveKey(password, finalSalt, keyLength, algo);
      
      logger.debug('Key derivation from password completed', {
        algorithm,
        keyLength,
        saltLength: finalSalt.length
      });
      
      return { key, salt: finalSalt };
    } catch (error) {
      logger.error('Key derivation from password failed', {
        algorithm,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Hash password for storage
   * @param password User password
   * @returns Password hash
   */
  static async hashPassword(password: string): Promise<string> {
    try {
      const hash = await hashPasswordArgon2id(password);
      
      logger.debug('Password hashing completed');
      
      return hash;
    } catch (error) {
      logger.error('Password hashing failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  /**
   * Verify password against hash
   * @param password User password
   * @param hash Stored password hash
   * @returns true if password matches
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await verifyPasswordArgon2id(password, hash);
      
      logger.debug('Password verification completed', { isValid });
      
      return isValid;
    } catch (error) {
      logger.error('Password verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }
  
  /**
   * Generate random bytes
   * @param length Number of bytes
   * @returns Random bytes
   */
  static generateRandomBytes(length: number): Buffer {
    return generateRandomBytes(length);
  }
  
  /**
   * Generate random UUID
   * @returns UUID string
   */
  static generateUUID(): string {
    return generateUUID();
  }
  
  /**
   * Generate random salt
   * @param length Salt length (default: 16)
   * @returns Random salt
   */
  static generateSalt(length?: number): Buffer {
    return generateSalt(length);
  }
}

import { generateKeyPairSync, publicEncrypt, privateDecrypt, KeyObject } from 'crypto';
import { logger } from '../../utils/logger';

export interface RSAKeyPair {
  publicKey: KeyObject;
  privateKey: KeyObject;
}

export interface RSAKeyPairPEM {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate RSA-2048 key pair
 * @returns RSA-2048 key pair
 */
export function generateRSA2048KeyPair(): RSAKeyPair {
  try {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    logger.debug('RSA-2048 key pair generated');
    
    return {
      publicKey: publicKey as KeyObject,
      privateKey: privateKey as KeyObject
    };
  } catch (error) {
    logger.error('RSA-2048 key pair generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Generate RSA-4096 key pair
 * @returns RSA-4096 key pair
 */
export function generateRSA4096KeyPair(): RSAKeyPair {
  try {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
    
    logger.debug('RSA-4096 key pair generated');
    
    return {
      publicKey: publicKey as KeyObject,
      privateKey: privateKey as KeyObject
    };
  } catch (error) {
    logger.error('RSA-4096 key pair generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Export RSA key pair to PEM format
 * @param keyPair RSA key pair
 * @returns Key pair in PEM format
 */
export function exportRSAKeyPairToPEM(keyPair: RSAKeyPair): RSAKeyPairPEM {
  try {
    const publicKeyPEM = keyPair.publicKey.export({ format: 'pem', type: 'spki' }).toString();
    const privateKeyPEM = keyPair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    
    return {
      publicKey: publicKeyPEM,
      privateKey: privateKeyPEM
    };
  } catch (error) {
    logger.error('RSA key pair export to PEM failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Import RSA public key from PEM format
 * @param publicKeyPEM Public key in PEM format
 * @returns KeyObject
 */
export function importRSAPublicKeyFromPEM(publicKeyPEM: string): KeyObject {
  try {
    return require('crypto').createPublicKey({
      key: publicKeyPEM,
      format: 'pem'
    });
  } catch (error) {
    logger.error('RSA public key import from PEM failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Import RSA private key from PEM format
 * @param privateKeyPEM Private key in PEM format
 * @returns KeyObject
 */
export function importRSAPrivateKeyFromPEM(privateKeyPEM: string): KeyObject {
  try {
    return require('crypto').createPrivateKey({
      key: privateKeyPEM,
      format: 'pem'
    });
  } catch (error) {
    logger.error('RSA private key import from PEM failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Encrypt plaintext using RSA public key
 * @param publicKey RSA public key
 * @param plaintext Data to encrypt
 * @returns Encrypted ciphertext
 */
export function encryptRSA(publicKey: KeyObject, plaintext: Buffer): Buffer {
  try {
    const ciphertext = publicEncrypt(
      {
        key: publicKey,
        padding: require('crypto').constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      plaintext
    );
    
    logger.debug('RSA encryption successful', {
      plaintextLength: plaintext.length,
      ciphertextLength: ciphertext.length
    });
    
    return ciphertext;
  } catch (error) {
    logger.error('RSA encryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Decrypt ciphertext using RSA private key
 * @param privateKey RSA private key
 * @param ciphertext Encrypted data
 * @returns Decrypted plaintext
 */
export function decryptRSA(privateKey: KeyObject, ciphertext: Buffer): Buffer {
  try {
    const plaintext = privateDecrypt(
      {
        key: privateKey,
        padding: require('crypto').constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      ciphertext
    );
    
    logger.debug('RSA decryption successful', {
      ciphertextLength: ciphertext.length,
      plaintextLength: plaintext.length
    });
    
    return plaintext;
  } catch (error) {
    logger.error('RSA decryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Get RSA key size in bits
 * @param key RSA key
 * @returns Key size in bits
 */
export function getRSAKeySize(key: KeyObject): number {
  const keyDetails = key.asymmetricKeyDetails;
  
  if (keyDetails === undefined || keyDetails.modulusLength === undefined) {
    throw new Error('Invalid RSA key');
  }
  
  return keyDetails.modulusLength;
}

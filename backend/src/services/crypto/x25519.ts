import { generateKeyPairSync, KeyObject, diffieHellman } from 'crypto';
import { logger } from '../../utils/logger';

export interface X25519KeyPair {
  publicKey: KeyObject;
  privateKey: KeyObject;
}

export interface X25519KeyPairPEM {
  publicKey: string;
  privateKey: string;
}

/**
 * Generate X25519 key pair
 * @returns X25519 key pair
 */
export function generateX25519KeyPair(): X25519KeyPair {
  try {
    const { publicKey, privateKey } = generateKeyPairSync('x25519');
    
    logger.debug('X25519 key pair generated');
    
    return {
      publicKey: publicKey as KeyObject,
      privateKey: privateKey as KeyObject
    };
  } catch (error) {
    logger.error('X25519 key pair generation failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Export X25519 key pair to PEM format
 * @param keyPair X25519 key pair
 * @returns Key pair in PEM format
 */
export function exportX25519KeyPairToPEM(keyPair: X25519KeyPair): X25519KeyPairPEM {
  try {
    const publicKeyPEM = keyPair.publicKey.export({ format: 'pem', type: 'spki' }).toString();
    const privateKeyPEM = keyPair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    
    return {
      publicKey: publicKeyPEM,
      privateKey: privateKeyPEM
    };
  } catch (error) {
    logger.error('X25519 key pair export to PEM failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Import X25519 public key from PEM format
 * @param publicKeyPEM Public key in PEM format
 * @returns KeyObject
 */
export function importX25519PublicKeyFromPEM(publicKeyPEM: string): KeyObject {
  try {
    return require('crypto').createPublicKey({
      key: publicKeyPEM,
      format: 'pem'
    });
  } catch (error) {
    logger.error('X25519 public key import from PEM failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Import X25519 private key from PEM format
 * @param privateKeyPEM Private key in PEM format
 * @returns KeyObject
 */
export function importX25519PrivateKeyFromPEM(privateKeyPEM: string): KeyObject {
  try {
    return require('crypto').createPrivateKey({
      key: privateKeyPEM,
      format: 'pem'
    });
  } catch (error) {
    logger.error('X25519 private key import from PEM failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Perform X25519 key exchange (ECDH)
 * @param privateKey Private key
 * @param publicKey Public key
 * @returns Shared secret
 */
export function performX25519KeyExchange(privateKey: KeyObject, publicKey: KeyObject): Buffer {
  try {
    const sharedSecret = diffieHellman({
      privateKey,
      publicKey
    });
    
    logger.debug('X25519 key exchange successful', {
      sharedSecretLength: sharedSecret.length
    });
    
    return sharedSecret;
  } catch (error) {
    logger.error('X25519 key exchange failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Export X25519 public key to raw format (32 bytes)
 * @param publicKey X25519 public key
 * @returns Raw public key (32 bytes)
 */
export function exportX25519PublicKeyToRaw(publicKey: KeyObject): Buffer {
  try {
    const pem = publicKey.export({ format: 'pem', type: 'spki' }).toString();
    
    // Extract raw key from PEM
    const lines = pem.split('\n');
    const base64 = lines.slice(1, -2).join('');
    const der = Buffer.from(base64, 'base64');
    
    // X25519 public key is 32 bytes, located at offset 12 in the DER structure
    return der.slice(12, 44);
  } catch (error) {
    logger.error('X25519 public key export to raw failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Import X25519 public key from raw format (32 bytes)
 * @param rawPublicKey Raw public key (32 bytes)
 * @returns KeyObject
 */
export function importX25519PublicKeyFromRaw(rawPublicKey: Buffer): KeyObject {
  try {
    if (rawPublicKey.length !== 32) {
      throw new Error('X25519 public key must be exactly 32 bytes');
    }
    
    // Create DER structure for X25519 public key
    const der = Buffer.concat([
      Buffer.from([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x6e, 0x03, 0x21, 0x00]),
      rawPublicKey
    ]);
    
    return require('crypto').createPublicKey({
      key: der,
      format: 'der',
      type: 'spki'
    });
  } catch (error) {
    logger.error('X25519 public key import from raw failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Get X25519 key size in bits
 */
export function getX25519KeySize(): number {
  return 256; // X25519 is always 256 bits
}

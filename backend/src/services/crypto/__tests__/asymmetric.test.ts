import { describe, it, expect } from '@jest/globals';
import {
  generateRSA2048KeyPair,
  generateRSA4096KeyPair,
  encryptRSA,
  decryptRSA,
  exportRSAKeyPairToPEM,
  importRSAPublicKeyFromPEM,
  importRSAPrivateKeyFromPEM,
  getRSAKeySize
} from '../rsa';
import {
  generateX25519KeyPair,
  performX25519KeyExchange,
  exportX25519KeyPairToPEM,
  importX25519PublicKeyFromPEM,
  importX25519PrivateKeyFromPEM
} from '../x25519';
import { generateRandomBytes } from '../random';

describe('Asymmetric Encryption - RSA-2048', () => {
  it('should generate RSA-2048 key pair', () => {
    const keyPair = generateRSA2048KeyPair();
    
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(getRSAKeySize(keyPair.publicKey)).toBe(2048);
  });
  
  it('should encrypt and decrypt with RSA-2048', () => {
    const keyPair = generateRSA2048KeyPair();
    const plaintext = Buffer.from('Secret message');
    
    const ciphertext = encryptRSA(keyPair.publicKey, plaintext);
    expect(ciphertext).not.toEqual(plaintext);
    
    const decrypted = decryptRSA(keyPair.privateKey, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });
  
  it('should fail decryption with wrong private key', () => {
    const keyPair1 = generateRSA2048KeyPair();
    const keyPair2 = generateRSA2048KeyPair();
    const plaintext = Buffer.from('Secret message');
    
    const ciphertext = encryptRSA(keyPair1.publicKey, plaintext);
    
    expect(() => {
      decryptRSA(keyPair2.privateKey, ciphertext);
    }).toThrow();
  });
  
  it('should export and import RSA keys to/from PEM', () => {
    const keyPair = generateRSA2048KeyPair();
    const pem = exportRSAKeyPairToPEM(keyPair);
    
    expect(pem.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(pem.privateKey).toContain('BEGIN PRIVATE KEY');
    
    const importedPublicKey = importRSAPublicKeyFromPEM(pem.publicKey);
    const importedPrivateKey = importRSAPrivateKeyFromPEM(pem.privateKey);
    
    const plaintext = Buffer.from('Test');
    const ciphertext = encryptRSA(importedPublicKey, plaintext);
    const decrypted = decryptRSA(importedPrivateKey, ciphertext);
    
    expect(decrypted).toEqual(plaintext);
  });
  
  it('should handle large plaintext with RSA-2048', () => {
    const keyPair = generateRSA2048KeyPair();
    // RSA-2048 can encrypt up to 190 bytes with OAEP padding
    const plaintext = generateRandomBytes(190);
    
    const ciphertext = encryptRSA(keyPair.publicKey, plaintext);
    const decrypted = decryptRSA(keyPair.privateKey, ciphertext);
    
    expect(decrypted).toEqual(plaintext);
  });
  
  it('should reject plaintext larger than RSA-2048 capacity', () => {
    const keyPair = generateRSA2048KeyPair();
    const plaintext = generateRandomBytes(300); // Too large
    
    expect(() => {
      encryptRSA(keyPair.publicKey, plaintext);
    }).toThrow();
  });
});

describe('Asymmetric Encryption - RSA-4096', () => {
  it('should generate RSA-4096 key pair', () => {
    const keyPair = generateRSA4096KeyPair();
    
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(getRSAKeySize(keyPair.publicKey)).toBe(4096);
  });
  
  it('should encrypt and decrypt with RSA-4096', () => {
    const keyPair = generateRSA4096KeyPair();
    const plaintext = Buffer.from('Secret message');
    
    const ciphertext = encryptRSA(keyPair.publicKey, plaintext);
    expect(ciphertext).not.toEqual(plaintext);
    
    const decrypted = decryptRSA(keyPair.privateKey, ciphertext);
    expect(decrypted).toEqual(plaintext);
  });
  
  it('should handle larger plaintext with RSA-4096', () => {
    const keyPair = generateRSA4096KeyPair();
    // RSA-4096 can encrypt up to 446 bytes with OAEP padding
    const plaintext = generateRandomBytes(446);
    
    const ciphertext = encryptRSA(keyPair.publicKey, plaintext);
    const decrypted = decryptRSA(keyPair.privateKey, ciphertext);
    
    expect(decrypted).toEqual(plaintext);
  });
});

describe('Asymmetric Encryption - X25519', () => {
  it('should generate X25519 key pair', () => {
    const keyPair = generateX25519KeyPair();
    
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
  });
  
  it('should perform X25519 key exchange', () => {
    const keyPair1 = generateX25519KeyPair();
    const keyPair2 = generateX25519KeyPair();
    
    const sharedSecret1 = performX25519KeyExchange(keyPair1.privateKey, keyPair2.publicKey);
    const sharedSecret2 = performX25519KeyExchange(keyPair2.privateKey, keyPair1.publicKey);
    
    expect(sharedSecret1).toEqual(sharedSecret2);
    expect(sharedSecret1).toHaveLength(32);
  });
  
  it('should export and import X25519 keys to/from PEM', () => {
    const keyPair = generateX25519KeyPair();
    const pem = exportX25519KeyPairToPEM(keyPair);
    
    expect(pem.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(pem.privateKey).toContain('BEGIN PRIVATE KEY');
    
    const importedPublicKey = importX25519PublicKeyFromPEM(pem.publicKey);
    const importedPrivateKey = importX25519PrivateKeyFromPEM(pem.privateKey);
    
    const sharedSecret = performX25519KeyExchange(importedPrivateKey, importedPublicKey);
    expect(sharedSecret).toHaveLength(32);
  });
  
  it('should produce different shared secrets with different key pairs', () => {
    const keyPair1 = generateX25519KeyPair();
    const keyPair2 = generateX25519KeyPair();
    const keyPair3 = generateX25519KeyPair();
    
    const sharedSecret1 = performX25519KeyExchange(keyPair1.privateKey, keyPair2.publicKey);
    const sharedSecret2 = performX25519KeyExchange(keyPair1.privateKey, keyPair3.publicKey);
    
    expect(sharedSecret1).not.toEqual(sharedSecret2);
  });
});

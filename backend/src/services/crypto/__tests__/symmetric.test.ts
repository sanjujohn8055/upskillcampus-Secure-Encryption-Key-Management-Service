import { describe, it, expect } from '@jest/globals';
import { encryptAES256GCM, decryptAES256GCM } from '../aes-gcm';
import { encryptChaCha20Poly1305, decryptChaCha20Poly1305 } from '../chacha20-poly1305';
import { generateRandomBytes } from '../random';
import { compareAuthenticationTags } from '../timing-safe';

describe('Symmetric Encryption - AES-256-GCM', () => {
  it('should encrypt and decrypt plaintext successfully', () => {
    const key = generateRandomBytes(32);
    const plaintext = Buffer.from('Hello, World!');
    
    const encrypted = encryptAES256GCM(key, plaintext);
    
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.nonce).toHaveLength(12);
    expect(encrypted.tag).toHaveLength(16);
    expect(encrypted.ciphertext).not.toEqual(plaintext);
    
    const decrypted = decryptAES256GCM(key, encrypted);
    expect(decrypted).toEqual(plaintext);
  });
  
  it('should generate unique nonce for each encryption', () => {
    const key = generateRandomBytes(32);
    const plaintext = Buffer.from('Test data');
    
    const encrypted1 = encryptAES256GCM(key, plaintext);
    const encrypted2 = encryptAES256GCM(key, plaintext);
    
    expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
    expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
  });
  
  it('should support associated authenticated data (AAD)', () => {
    const key = generateRandomBytes(32);
    const plaintext = Buffer.from('Secret message');
    const aad = Buffer.from('metadata');
    
    const encrypted = encryptAES256GCM(key, plaintext, aad);
    const decrypted = decryptAES256GCM(key, {
      ...encrypted,
      associatedData: aad
    });
    
    expect(decrypted).toEqual(plaintext);
  });
  
  it('should reject decryption with invalid AAD', () => {
    const key = generateRandomBytes(32);
    const plaintext = Buffer.from('Secret message');
    const aad = Buffer.from('metadata');
    const wrongAAD = Buffer.from('wrong metadata');
    
    const encrypted = encryptAES256GCM(key, plaintext, aad);
    
    expect(() => {
      decryptAES256GCM(key, {
        ...encrypted,
        associatedData: wrongAAD
      });
    }).toThrow('Authentication tag verification failed');
  });
  
  it('should reject decryption with invalid authentication tag', () => {
    const key = generateRandomBytes(32);
    const plaintext = Buffer.from('Secret message');
    
    const encrypted = encryptAES256GCM(key, plaintext);
    
    // Corrupt the tag
    const corruptedTag = Buffer.from(encrypted.tag);
    corruptedTag[0] ^= 0xFF;
    
    expect(() => {
      decryptAES256GCM(key, {
        ...encrypted,
        tag: corruptedTag
      });
    }).toThrow('Authentication tag verification failed');
  });
  
  it('should reject decryption with wrong key', () => {
    const key1 = generateRandomBytes(32);
    const key2 = generateRandomBytes(32);
    const plaintext = Buffer.from('Secret message');
    
    const encrypted = encryptAES256GCM(key1, plaintext);
    
    expect(() => {
      decryptAES256GCM(key2, encrypted);
    }).toThrow('Authentication tag verification failed');
  });
  
  it('should reject invalid key length', () => {
    const invalidKey = generateRandomBytes(16); // 128 bits instead of 256
    const plaintext = Buffer.from('Test');
    
    expect(() => {
      encryptAES256GCM(invalidKey, plaintext);
    }).toThrow('Key must be exactly 32 bytes');
  });
  
  it('should handle empty plaintext', () => {
    const key = generateRandomBytes(32);
    const plaintext = Buffer.alloc(0);
    
    const encrypted = encryptAES256GCM(key, plaintext);
    const decrypted = decryptAES256GCM(key, encrypted);
    
    expect(decrypted).toEqual(plaintext);
  });
  
  it('should handle large plaintext', () => {
    const key = generateRandomBytes(32);
    const plaintext = generateRandomBytes(1024 * 1024); // 1MB
    
    const encrypted = encryptAES256GCM(key, plaintext);
    const decrypted = decryptAES256GCM(key, encrypted);
    
    expect(decrypted).toEqual(plaintext);
  });
});

describe('Symmetric Encryption - ChaCha20-Poly1305', () => {
  it('should encrypt and decrypt plaintext successfully', () => {
    const key = generateRandomBytes(32);
    const plaintext = Buffer.from('Hello, World!');
    
    const encrypted = encryptChaCha20Poly1305(key, plaintext);
    
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.nonce).toHaveLength(12);
    expect(encrypted.tag).toHaveLength(16);
    expect(encrypted.ciphertext).not.toEqual(plaintext);
    
    const decrypted = decryptChaCha20Poly1305(key, encrypted);
    expect(decrypted).toEqual(plaintext);
  });
  
  it('should generate unique nonce for each encryption', () => {
    const key = generateRandomBytes(32);
    const plaintext = Buffer.from('Test data');
    
    const encrypted1 = encryptChaCha20Poly1305(key, plaintext);
    const encrypted2 = encryptChaCha20Poly1305(key, plaintext);
    
    expect(encrypted1.nonce).not.toEqual(encrypted2.nonce);
    expect(encrypted1.ciphertext).not.toEqual(encrypted2.ciphertext);
  });
  
  it('should support associated authenticated data (AAD)', () => {
    const key = generateRandomBytes(32);
    const plaintext = Buffer.from('Secret message');
    const aad = Buffer.from('metadata');
    
    const encrypted = encryptChaCha20Poly1305(key, plaintext, aad);
    const decrypted = decryptChaCha20Poly1305(key, {
      ...encrypted,
      associatedData: aad
    });
    
    expect(decrypted).toEqual(plaintext);
  });
  
  it('should reject decryption with invalid authentication tag', () => {
    const key = generateRandomBytes(32);
    const plaintext = Buffer.from('Secret message');
    
    const encrypted = encryptChaCha20Poly1305(key, plaintext);
    
    // Corrupt the tag
    const corruptedTag = Buffer.from(encrypted.tag);
    corruptedTag[0] ^= 0xFF;
    
    expect(() => {
      decryptChaCha20Poly1305(key, {
        ...encrypted,
        tag: corruptedTag
      });
    }).toThrow('Authentication tag verification failed');
  });
  
  it('should reject decryption with wrong key', () => {
    const key1 = generateRandomBytes(32);
    const key2 = generateRandomBytes(32);
    const plaintext = Buffer.from('Secret message');
    
    const encrypted = encryptChaCha20Poly1305(key1, plaintext);
    
    expect(() => {
      decryptChaCha20Poly1305(key2, encrypted);
    }).toThrow('Authentication tag verification failed');
  });
});

describe('Timing-Safe Comparison', () => {
  it('should compare equal authentication tags', () => {
    const tag1 = generateRandomBytes(16);
    const tag2 = Buffer.from(tag1);
    
    expect(compareAuthenticationTags(tag1, tag2)).toBe(true);
  });
  
  it('should reject different authentication tags', () => {
    const tag1 = generateRandomBytes(16);
    const tag2 = generateRandomBytes(16);
    
    expect(compareAuthenticationTags(tag1, tag2)).toBe(false);
  });
  
  it('should reject tags of different lengths', () => {
    const tag1 = generateRandomBytes(16);
    const tag2 = generateRandomBytes(12);
    
    expect(compareAuthenticationTags(tag1, tag2)).toBe(false);
  });
});

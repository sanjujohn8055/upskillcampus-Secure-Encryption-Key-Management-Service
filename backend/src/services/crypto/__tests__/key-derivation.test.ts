import { describe, it, expect } from '@jest/globals';
import {
  deriveKeyArgon2id,
  deriveKeyPBKDF2,
  hashPasswordArgon2id,
  verifyPasswordArgon2id,
  generateSalt,
  deriveKey,
  validateKeyDerivationParams,
  DEFAULT_ARGON2ID_PARAMS,
  DEFAULT_PBKDF2_PARAMS
} from '../key-derivation';

describe('Key Derivation - Argon2id', () => {
  it('should derive key with default Argon2id parameters', async () => {
    const password = 'my-secure-password';
    const salt = generateSalt(16);
    const keyLength = 32;
    
    const key = await deriveKeyArgon2id(password, salt, keyLength);
    
    expect(key).toHaveLength(keyLength);
    expect(key).toBeInstanceOf(Buffer);
  });
  
  it('should derive different keys from different passwords', async () => {
    const salt = generateSalt(16);
    const keyLength = 32;
    
    const key1 = await deriveKeyArgon2id('password1', salt, keyLength);
    const key2 = await deriveKeyArgon2id('password2', salt, keyLength);
    
    expect(key1).not.toEqual(key2);
  });
  
  it('should derive different keys from different salts', async () => {
    const password = 'my-password';
    const salt1 = generateSalt(16);
    const salt2 = generateSalt(16);
    const keyLength = 32;
    
    const key1 = await deriveKeyArgon2id(password, salt1, keyLength);
    const key2 = await deriveKeyArgon2id(password, salt2, keyLength);
    
    expect(key1).not.toEqual(key2);
  });
  
  it('should support custom Argon2id parameters', async () => {
    const password = 'my-password';
    const salt = generateSalt(16);
    const keyLength = 32;
    
    const key = await deriveKeyArgon2id(password, salt, keyLength, {
      memoryCost: 32768, // 32 MB
      timeCost: 2,
      parallelism: 2
    });
    
    expect(key).toHaveLength(keyLength);
  });
  
  it('should hash password with Argon2id', async () => {
    const password = 'my-secure-password';
    
    const hash = await hashPasswordArgon2id(password);
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });
  
  it('should verify correct password', async () => {
    const password = 'my-secure-password';
    
    const hash = await hashPasswordArgon2id(password);
    const isValid = await verifyPasswordArgon2id(password, hash);
    
    expect(isValid).toBe(true);
  });
  
  it('should reject incorrect password', async () => {
    const password = 'my-secure-password';
    
    const hash = await hashPasswordArgon2id(password);
    const isValid = await verifyPasswordArgon2id('wrong-password', hash);
    
    expect(isValid).toBe(false);
  });
  
  it('should generate different hashes for same password', async () => {
    const password = 'my-password';
    
    const hash1 = await hashPasswordArgon2id(password);
    const hash2 = await hashPasswordArgon2id(password);
    
    expect(hash1).not.toEqual(hash2);
  });
});

describe('Key Derivation - PBKDF2', () => {
  it('should derive key with default PBKDF2 parameters', () => {
    const password = 'my-secure-password';
    const salt = generateSalt(16);
    const keyLength = 32;
    
    const key = deriveKeyPBKDF2(password, salt, keyLength);
    
    expect(key).toHaveLength(keyLength);
    expect(key).toBeInstanceOf(Buffer);
  });
  
  it('should derive different keys from different passwords', () => {
    const salt = generateSalt(16);
    const keyLength = 32;
    
    const key1 = deriveKeyPBKDF2('password1', salt, keyLength);
    const key2 = deriveKeyPBKDF2('password2', salt, keyLength);
    
    expect(key1).not.toEqual(key2);
  });
  
  it('should derive different keys from different salts', () => {
    const password = 'my-password';
    const salt1 = generateSalt(16);
    const salt2 = generateSalt(16);
    const keyLength = 32;
    
    const key1 = deriveKeyPBKDF2(password, salt1, keyLength);
    const key2 = deriveKeyPBKDF2(password, salt2, keyLength);
    
    expect(key1).not.toEqual(key2);
  });
  
  it('should support custom PBKDF2 parameters', () => {
    const password = 'my-password';
    const salt = generateSalt(16);
    const keyLength = 32;
    
    const key = deriveKeyPBKDF2(password, salt, keyLength, {
      iterations: 100000,
      hashFunction: 'sha256'
    });
    
    expect(key).toHaveLength(keyLength);
  });
  
  it('should use at least 600,000 iterations by default', () => {
    expect(DEFAULT_PBKDF2_PARAMS.iterations).toBeGreaterThanOrEqual(600000);
  });
});

describe('Salt Generation', () => {
  it('should generate random salt', () => {
    const salt = generateSalt(16);
    
    expect(salt).toHaveLength(16);
    expect(salt).toBeInstanceOf(Buffer);
  });
  
  it('should generate different salts', () => {
    const salt1 = generateSalt(16);
    const salt2 = generateSalt(16);
    
    expect(salt1).not.toEqual(salt2);
  });
  
  it('should support custom salt length', () => {
    const salt = generateSalt(32);
    
    expect(salt).toHaveLength(32);
  });
  
  it('should reject salt length less than 8 bytes', () => {
    expect(() => {
      generateSalt(4);
    }).toThrow('Salt length must be at least 8 bytes');
  });
  
  it('should reject salt length greater than 1024 bytes', () => {
    expect(() => {
      generateSalt(2048);
    }).toThrow('Salt length must not exceed 1024 bytes');
  });
});

describe('Key Derivation - Generic', () => {
  it('should derive key with Argon2id algorithm', async () => {
    const password = 'my-password';
    const salt = generateSalt(16);
    const keyLength = 32;
    
    const key = await deriveKey(password, salt, keyLength, 'argon2id');
    
    expect(key).toHaveLength(keyLength);
  });
  
  it('should derive key with PBKDF2 algorithm', async () => {
    const password = 'my-password';
    const salt = generateSalt(16);
    const keyLength = 32;
    
    const key = await deriveKey(password, salt, keyLength, 'pbkdf2');
    
    expect(key).toHaveLength(keyLength);
  });
  
  it('should use Argon2id by default', async () => {
    const password = 'my-password';
    const salt = generateSalt(16);
    const keyLength = 32;
    
    const key = await deriveKey(password, salt, keyLength);
    
    expect(key).toHaveLength(keyLength);
  });
});

describe('Parameter Validation', () => {
  it('should validate key derivation parameters', () => {
    const validParams = {
      algorithm: 'argon2id' as const,
      salt: generateSalt(16),
      keyLength: 32
    };
    
    expect(() => {
      validateKeyDerivationParams(validParams);
    }).not.toThrow();
  });
  
  it('should reject key length less than 16 bytes', () => {
    expect(() => {
      validateKeyDerivationParams({
        algorithm: 'argon2id',
        salt: generateSalt(16),
        keyLength: 8
      });
    }).toThrow('Key length must be at least 16 bytes');
  });
  
  it('should reject salt less than 8 bytes', () => {
    expect(() => {
      validateKeyDerivationParams({
        algorithm: 'argon2id',
        salt: Buffer.alloc(4),
        keyLength: 32
      });
    }).toThrow('Salt must be at least 8 bytes');
  });
  
  it('should enforce Argon2id minimum memory cost', () => {
    expect(() => {
      validateKeyDerivationParams({
        algorithm: 'argon2id',
        salt: generateSalt(16),
        keyLength: 32,
        memoryCost: 4
      });
    }).toThrow('Argon2id memory cost must be at least 8 KB');
  });
  
  it('should enforce PBKDF2 minimum iterations', () => {
    expect(() => {
      validateKeyDerivationParams({
        algorithm: 'pbkdf2',
        salt: generateSalt(16),
        keyLength: 32,
        iterations: 50000
      });
    }).toThrow('PBKDF2 iterations must be at least 100,000');
  });
});

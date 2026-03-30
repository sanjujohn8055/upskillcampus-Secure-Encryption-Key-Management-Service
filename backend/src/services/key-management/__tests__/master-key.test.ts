import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  initializeMasterKey,
  getMasterKey,
  isMasterKeyLoaded,
  encryptKeyMaterial,
  decryptKeyMaterial,
  clearMasterKey
} from '../master-key';
import { CryptoService } from '../../crypto/crypto-service';

describe('Master Key Management', () => {
  beforeEach(() => {
    // Set up test master key in environment
    process.env.MASTER_KEY_ENV = CryptoService.generateRandomBytes(32).toString('hex');
  });
  
  afterEach(() => {
    clearMasterKey();
    delete process.env.MASTER_KEY_ENV;
  });
  
  it('should initialize master key from environment', async () => {
    const key = await initializeMasterKey();
    
    expect(key).toBeDefined();
    expect(key).toHaveLength(32);
    expect(isMasterKeyLoaded()).toBe(true);
  });
  
  it('should return same master key on subsequent calls', async () => {
    const key1 = await initializeMasterKey();
    const key2 = await initializeMasterKey();
    
    expect(key1).toEqual(key2);
  });
  
  it('should get loaded master key', async () => {
    await initializeMasterKey();
    const key = getMasterKey();
    
    expect(key).toBeDefined();
    expect(key).toHaveLength(32);
  });
  
  it('should throw error when getting master key before initialization', () => {
    clearMasterKey();
    
    expect(() => {
      getMasterKey();
    }).toThrow('Master key not initialized');
  });
  
  it('should report master key loaded status', async () => {
    clearMasterKey();
    expect(isMasterKeyLoaded()).toBe(false);
    
    await initializeMasterKey();
    expect(isMasterKeyLoaded()).toBe(true);
  });
  
  it('should encrypt key material', async () => {
    await initializeMasterKey();
    
    const keyMaterial = CryptoService.generateRandomBytes(32);
    const encrypted = encryptKeyMaterial(keyMaterial);
    
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.nonce).toHaveLength(12);
    expect(encrypted.tag).toHaveLength(16);
    expect(encrypted.ciphertext).not.toEqual(keyMaterial);
  });
  
  it('should decrypt key material', async () => {
    await initializeMasterKey();
    
    const keyMaterial = CryptoService.generateRandomBytes(32);
    const encrypted = encryptKeyMaterial(keyMaterial);
    const decrypted = decryptKeyMaterial(encrypted.ciphertext, encrypted.nonce, encrypted.tag);
    
    expect(decrypted).toEqual(keyMaterial);
  });
  
  it('should encrypt and decrypt large key material', async () => {
    await initializeMasterKey();
    
    const keyMaterial = CryptoService.generateRandomBytes(1024);
    const encrypted = encryptKeyMaterial(keyMaterial);
    const decrypted = decryptKeyMaterial(encrypted.ciphertext, encrypted.nonce, encrypted.tag);
    
    expect(decrypted).toEqual(keyMaterial);
  });
  
  it('should fail decryption with corrupted ciphertext', async () => {
    await initializeMasterKey();
    
    const keyMaterial = CryptoService.generateRandomBytes(32);
    const encrypted = encryptKeyMaterial(keyMaterial);
    
    // Corrupt ciphertext
    encrypted.ciphertext[0] ^= 0xFF;
    
    expect(() => {
      decryptKeyMaterial(encrypted.ciphertext, encrypted.nonce, encrypted.tag);
    }).toThrow();
  });
  
  it('should fail decryption with wrong nonce', async () => {
    await initializeMasterKey();
    
    const keyMaterial = CryptoService.generateRandomBytes(32);
    const encrypted = encryptKeyMaterial(keyMaterial);
    const wrongNonce = CryptoService.generateRandomBytes(12);
    
    expect(() => {
      decryptKeyMaterial(encrypted.ciphertext, wrongNonce, encrypted.tag);
    }).toThrow();
  });
  
  it('should fail decryption with wrong tag', async () => {
    await initializeMasterKey();
    
    const keyMaterial = CryptoService.generateRandomBytes(32);
    const encrypted = encryptKeyMaterial(keyMaterial);
    const wrongTag = CryptoService.generateRandomBytes(16);
    
    expect(() => {
      decryptKeyMaterial(encrypted.ciphertext, encrypted.nonce, wrongTag);
    }).toThrow();
  });
  
  it('should clear master key from memory', async () => {
    await initializeMasterKey();
    expect(isMasterKeyLoaded()).toBe(true);
    
    clearMasterKey();
    expect(isMasterKeyLoaded()).toBe(false);
  });
});

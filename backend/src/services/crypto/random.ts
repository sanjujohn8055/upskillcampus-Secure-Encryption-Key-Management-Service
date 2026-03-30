import { randomBytes } from 'crypto';
import { logger } from '../../utils/logger';

/**
 * Generate cryptographically secure random bytes using OS CSPRNG
 * @param length Number of bytes to generate
 * @returns Buffer containing random bytes
 */
export function generateRandomBytes(length: number): Buffer {
  if (length <= 0) {
    throw new Error('Length must be greater than 0');
  }
  
  if (length > 2147483647) {
    throw new Error('Length must be less than 2GB');
  }
  
  try {
    return randomBytes(length);
  } catch (error) {
    logger.error('Failed to generate random bytes', {
      error: error instanceof Error ? error.message : 'Unknown error',
      length
    });
    throw error;
  }
}

/**
 * Generate a random UUID v4
 * @returns UUID string
 */
export function generateUUID(): string {
  const bytes = generateRandomBytes(16);
  
  // Set version to 4 (random)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  
  // Set variant to RFC 4122
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  
  const hex = bytes.toString('hex');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns Random integer
 */
export function generateRandomInt(min: number, max: number): number {
  if (min > max) {
    throw new Error('min must be less than or equal to max');
  }
  
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new Error('min and max must be integers');
  }
  
  const range = max - min + 1;
  
  if (range > 281474976710656) {
    throw new Error('Range is too large');
  }
  
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const maxUsable = Math.floor(maxValue / range) * range;
  
  let randomValue: number;
  
  do {
    randomValue = 0;
    const randomBytes_ = generateRandomBytes(bytesNeeded);
    
    for (let i = 0; i < bytesNeeded; i++) {
      randomValue = (randomValue << 8) | randomBytes_[i];
    }
  } while (randomValue >= maxUsable);
  
  return min + (randomValue % range);
}

/**
 * Generate a random hex string
 * @param length Number of bytes (output will be 2x this length in hex)
 * @returns Hex string
 */
export function generateRandomHex(length: number): string {
  return generateRandomBytes(length).toString('hex');
}

/**
 * Generate a random base64 string
 * @param length Number of bytes
 * @returns Base64 string
 */
export function generateRandomBase64(length: number): string {
  return generateRandomBytes(length).toString('base64');
}

/**
 * Generate a random alphanumeric string
 * @param length Desired string length
 * @returns Random alphanumeric string
 */
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytesNeeded = Math.ceil(length * Math.log2(chars.length) / 8);
  const randomBytes_ = generateRandomBytes(bytesNeeded);
  
  let result = '';
  let bitBuffer = 0;
  let bitCount = 0;
  
  for (let i = 0; i < randomBytes_.length && result.length < length; i++) {
    bitBuffer = (bitBuffer << 8) | randomBytes_[i];
    bitCount += 8;
    
    while (bitCount >= Math.log2(chars.length) && result.length < length) {
      const bitsNeeded = Math.ceil(Math.log2(chars.length));
      const mask = (1 << bitsNeeded) - 1;
      const index = (bitBuffer >> (bitCount - bitsNeeded)) & mask;
      
      if (index < chars.length) {
        result += chars[index];
      }
      
      bitCount -= bitsNeeded;
    }
  }
  
  return result.substring(0, length);
}

/**
 * Shuffle an array using Fisher-Yates algorithm with cryptographic randomness
 * @param array Array to shuffle
 * @returns Shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = generateRandomInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

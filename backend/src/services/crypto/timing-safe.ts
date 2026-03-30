import { timingSafeEqual } from 'crypto';
import { logger } from '../../utils/logger';

/**
 * Constant-time comparison for authentication tags
 * Prevents timing attacks by ensuring comparison time is independent of input
 * @param tag1 First authentication tag
 * @param tag2 Second authentication tag
 * @returns true if tags are equal, false otherwise
 */
export function compareAuthenticationTags(tag1: Buffer, tag2: Buffer): boolean {
  // Tags must be the same length for comparison
  if (tag1.length !== tag2.length) {
    logger.warn('Authentication tag length mismatch', {
      tag1Length: tag1.length,
      tag2Length: tag2.length
    });
    return false;
  }
  
  try {
    return timingSafeEqual(tag1, tag2);
  } catch (error) {
    logger.error('Authentication tag comparison failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Constant-time comparison for buffers
 * @param buffer1 First buffer
 * @param buffer2 Second buffer
 * @returns true if buffers are equal, false otherwise
 */
export function compareBuffers(buffer1: Buffer, buffer2: Buffer): boolean {
  if (buffer1.length !== buffer2.length) {
    return false;
  }
  
  try {
    return timingSafeEqual(buffer1, buffer2);
  } catch (error) {
    logger.error('Buffer comparison failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Constant-time comparison for strings
 * @param str1 First string
 * @param str2 Second string
 * @returns true if strings are equal, false otherwise
 */
export function compareStrings(str1: string, str2: string): boolean {
  const buf1 = Buffer.from(str1, 'utf8');
  const buf2 = Buffer.from(str2, 'utf8');
  
  return compareBuffers(buf1, buf2);
}

/**
 * Constant-time comparison for hashes
 * @param hash1 First hash
 * @param hash2 Second hash
 * @returns true if hashes are equal, false otherwise
 */
export function compareHashes(hash1: string, hash2: string): boolean {
  return compareStrings(hash1, hash2);
}

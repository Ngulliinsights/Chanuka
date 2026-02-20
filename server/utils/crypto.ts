import { logger } from '@server/infrastructure/observability';
import { createCipheriv, createDecipheriv,randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    throw new Error('Invalid stored password format');
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Verify password (alias for comparePasswords)
 */
export const verifyPassword = comparePasswords;

/**
 * Encrypt data using AES
 */
export function encrypt(data: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key-for-testing';
  // Ensure key is 32 bytes for AES-256
  const keyBuffer = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-cbc', keyBuffer, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt data using AES
 */
export function decrypt(encryptedData: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-key-for-testing';
  const keyBuffer = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
  const [ivHex, encrypted] = encryptedData.split(':');
  if (!ivHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', keyBuffer, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}














































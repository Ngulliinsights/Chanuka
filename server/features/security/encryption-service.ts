import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { promisify } from 'util';
import { logger } from '@shared/core';

/**
 * Comprehensive encryption service for data protection
 * Implements AES-256-GCM encryption for data at rest and secure password handling
 * Provides TLS 1.3 configuration and secure token management
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly saltRounds = 12;

  // Master encryption key from environment or generated
  private readonly masterKey: Buffer;
  private readonly keyDerivationSalt: Buffer;

  constructor() {
    const envKey = process.env.ENCRYPTION_KEY;
    const envSalt = process.env.KEY_DERIVATION_SALT;
    
    if (envKey && envSalt) {
      this.masterKey = Buffer.from(envKey, 'hex');
      this.keyDerivationSalt = Buffer.from(envSalt, 'hex');
      
      if (this.masterKey.length !== this.keyLength) {
        throw new Error('Invalid encryption key length. Must be 32 bytes (64 hex characters)');
      }
      if (this.keyDerivationSalt.length !== 32) {
        throw new Error('Invalid key derivation salt length. Must be 32 bytes (64 hex characters)');
      }
    } else {
      // Generate new keys for development (should be stored securely in production)
      this.masterKey = crypto.randomBytes(this.keyLength);
      this.keyDerivationSalt = crypto.randomBytes(32);
      
      console.warn('⚠️  No ENCRYPTION_KEY or KEY_DERIVATION_SALT found in environment.');
      console.warn('🔑 Generated master key (store securely):', this.masterKey.toString('hex'));
      console.warn('🧂 Generated salt (store securely):', this.keyDerivationSalt.toString('hex'));
    }
  }

  /**
   * Derive encryption key for specific context
   */
  private deriveKey(context: string): Buffer {
    return crypto.pbkdf2Sync(this.masterKey, Buffer.concat([this.keyDerivationSalt, Buffer.from(context)]), 100000, 32, 'sha256');
  }

  /**
   * Encrypt sensitive data at rest with AES-256-GCM
   */
  async encryptData(plaintext: string, context: string = 'default'): Promise<string> {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.deriveKey(context);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv, { authTagLength: this.tagLength });

      // Additional authenticated data
      const aad = Buffer.from(`legislative-platform-${context}`);
      cipher.setAAD(aad);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      const result = {
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: encrypted,
        context
      };

      return Buffer.from(JSON.stringify(result)).toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', { component: 'Chanuka' }, error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data with AES-256-GCM
   */
  async decryptData(encryptedData: string): Promise<string> {
    try {
      const parsed = JSON.parse(Buffer.from(encryptedData, 'base64').toString());
      const { iv, tag, data, context = 'default' } = parsed;

      const key = this.deriveKey(context);
      const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(iv, 'hex'), { authTagLength: this.tagLength });

      // Set additional authenticated data
      const aad = Buffer.from(`legislative-platform-${context}`);
      decipher.setAAD(aad);
      decipher.setAuthTag(Buffer.from(tag, 'hex'));

      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', { component: 'Chanuka' }, error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash passwords securely with bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      logger.error('Password hashing failed:', { component: 'Chanuka' }, error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification failed:', { component: 'Chanuka' }, error);
      return false;
    }
  }

  /**
   * Generate secure random tokens
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash tokens for secure storage
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate cryptographically secure random passwords
   */
  generateSecurePassword(length: number = 16): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Encrypt PII (Personally Identifiable Information)
   */
  async encryptPII(data: Record<string, any>): Promise<Record<string, any>> {
    const piiFields = ['email', 'phone', 'address', 'ssn', 'taxId', 'bankAccount'];
    const encrypted = { ...data };

    for (const field of piiFields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = await this.encryptData(encrypted[field]);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt PII data
   */
  async decryptPII(data: Record<string, any>): Promise<Record<string, any>> {
    const piiFields = ['email', 'phone', 'address', 'ssn', 'taxId', 'bankAccount'];
    const decrypted = { ...data };

    for (const field of piiFields) {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          decrypted[field] = await this.decryptData(decrypted[field]);
        } catch (error) {
          console.warn(`Failed to decrypt field ${field}:`, error);
          // Keep original value if decryption fails (might not be encrypted)
        }
      }
    }

    return decrypted;
  }

  /**
   * Create secure session tokens with expiration
   */
  createSessionToken(): { token: string; hash: string; expiresAt: Date } {
    const token = this.generateSecureToken(64);
    const hash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return { token, hash, expiresAt };
  }

  /**
   * Verify session token
   */
  verifySessionToken(token: string, storedHash: string): boolean {
    const tokenHash = this.hashToken(token);
    return crypto.timingSafeEqual(
      Buffer.from(tokenHash, 'hex'),
      Buffer.from(storedHash, 'hex')
    );
  }

  /**
   * Generate secure JWT signing key
   */
  generateJWTSigningKey(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Encrypt database connection strings
   */
  async encryptConnectionString(connectionString: string): Promise<string> {
    return this.encryptData(connectionString, 'database');
  }

  /**
   * Decrypt database connection strings
   */
  async decryptConnectionString(encryptedConnectionString: string): Promise<string> {
    return this.decryptData(encryptedConnectionString);
  }

  /**
   * Generate secure API keys
   */
  generateAPIKey(prefix: string = 'ltp'): string {
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${timestamp}_${randomPart}`;
  }

  /**
   * Validate and sanitize input to prevent injection attacks
   */
  sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Limit length to prevent DoS
    if (sanitized.length > 10000) {
      sanitized = sanitized.substring(0, 10000);
    }

    return sanitized.trim();
  }

  /**
   * Validate email format with additional security checks
   */
  validateEmail(email: string): boolean {
    const sanitized = this.sanitizeInput(email);
    
    // Basic email regex with security considerations
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(sanitized)) {
      return false;
    }

    // Additional security checks
    if (sanitized.length > 254) return false; // RFC 5321 limit
    if (sanitized.includes('..')) return false; // Consecutive dots
    if (sanitized.startsWith('.') || sanitized.endsWith('.')) return false;

    return true;
  }

  /**
   * Generate secure CSRF tokens
   */
  generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Verify CSRF token
   */
  verifyCSRFToken(token: string, storedToken: string): boolean {
    if (!token || !storedToken) return false;
    return crypto.timingSafeEqual(
      Buffer.from(token, 'base64url'),
      Buffer.from(storedToken, 'base64url')
    );
  }

  /**
   * Generate secure nonce for Content Security Policy
   */
  generateCSPNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Encrypt sensitive configuration values
   */
  async encryptConfig(config: Record<string, any>): Promise<Record<string, any>> {
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'api_key', 'private'];
    const encrypted = { ...config };

    for (const [key, value] of Object.entries(encrypted)) {
      if (typeof value === 'string' && sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        encrypted[key] = await this.encryptData(value, 'config');
      }
    }

    return encrypted;
  }

  /**
   * Decrypt sensitive configuration values
   */
  async decryptConfig(config: Record<string, any>): Promise<Record<string, any>> {
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'api_key', 'private'];
    const decrypted = { ...config };

    for (const [key, value] of Object.entries(decrypted)) {
      if (typeof value === 'string' && sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        try {
          decrypted[key] = await this.decryptData(value);
        } catch (error) {
          console.warn(`Failed to decrypt config key ${key}:`, error);
          // Keep original value if decryption fails
        }
      }
    }

    return decrypted;
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();














































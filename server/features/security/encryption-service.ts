import { logger } from '@server/infrastructure/observability';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface KeyData {
  masterKey: string;
  keyDerivationSalt: string;
}

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltRounds = 12;

  private readonly masterKey: Buffer;
  private readonly keyDerivationSalt: Buffer;

  private readonly keyFilePath: string;

  constructor() {
    this.keyFilePath = path.join(process.cwd(), '.encryption-keys.json');

    const envKey = process.env.ENCRYPTION_KEY;
    const envSalt = process.env.KEY_DERIVATION_SALT;

    // Enforce strict startup failures in production if keys are missing
    if (process.env.NODE_ENV === 'production' && (!envKey || !envSalt)) {
      throw new Error(
        'FATAL: ENCRYPTION_KEY and KEY_DERIVATION_SALT must be set in production. ' +
        'Starting without them will result in permanent data loss.'
      );
    }

    let masterKeyHex: string;
    let saltHex: string;

    if (envKey && envSalt) {
      // Validate environment keys
      if (!this.isValidHex(envKey) || envKey.length !== this.keyLength * 2) {
        throw new Error(`Invalid ENCRYPTION_KEY: must be ${this.keyLength * 2} character hex string.`);
      }
      if (!this.isValidHex(envSalt) || envSalt.length !== 64) { // 32 bytes * 2
        throw new Error(`Invalid KEY_DERIVATION_SALT: must be 64 character hex string.`);
      }
      masterKeyHex = envKey;
      saltHex = envSalt;
    } else {
      // Load or generate keys for development to prevent data loss on restart
      const keyData = this.loadOrGenerateKeys();
      masterKeyHex = keyData.masterKey;
      saltHex = keyData.keyDerivationSalt;
      logger.info('Loaded persistent keys for development', { component: 'EncryptionService' });
    }

    this.masterKey = Buffer.from(masterKeyHex, 'hex');
    this.keyDerivationSalt = Buffer.from(saltHex, 'hex');
  }

  private isValidHex(str: string): boolean {
    return /^[0-9a-fA-F]+$/.test(str);
  }

  private loadOrGenerateKeys(): KeyData {
    try {
      if (fs.existsSync(this.keyFilePath)) {
        const data = fs.readFileSync(this.keyFilePath, 'utf8');
        const keyData: KeyData = JSON.parse(data);
        // Validate loaded keys
        if (!this.isValidHex(keyData.masterKey) || keyData.masterKey.length !== this.keyLength * 2) {
          throw new Error('Invalid master key in key file');
        }
        if (!this.isValidHex(keyData.keyDerivationSalt) || keyData.keyDerivationSalt.length !== 64) {
          throw new Error('Invalid salt in key file');
        }
        return keyData;
      }
    } catch (error) {
      logger.warn('Failed to load keys from file, generating new ones', { component: 'EncryptionService', error });
    }

    // Generate new keys
    const newKeys: KeyData = {
      masterKey: crypto.randomBytes(this.keyLength).toString('hex'),
      keyDerivationSalt: crypto.randomBytes(32).toString('hex'),
    };

    try {
      fs.writeFileSync(this.keyFilePath, JSON.stringify(newKeys, null, 2));
      logger.info('Generated and saved new keys for development', { component: 'EncryptionService' });
    } catch (error) {
      logger.error('Failed to save keys to file', { component: 'EncryptionService', error });
      throw new Error('Unable to persist keys for development');
    }

    return newKeys;
  }

  private deriveKey(context: string): Buffer {
    return crypto.pbkdf2Sync(this.masterKey, Buffer.concat([this.keyDerivationSalt, Buffer.from(context)]), 100000, 32, 'sha256');
  }

  async encryptData(plaintext: string, context: string = 'default'): Promise<string> {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.deriveKey(context);
      const cipher = crypto.createCipheriv(this.algorithm, key, iv, { authTagLength: this.tagLength });

      cipher.setAAD(Buffer.from(context));

      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
      logger.error('Encryption failed', { component: 'EncryptionService', error });
      throw new Error('Encryption operation failed');
    }
  }

  async decryptData(encryptedString: string, context: string = 'default'): Promise<string> {
    try {
      const parts = encryptedString.split(':');
      if (parts.length !== 3) throw new Error('Invalid ciphertext format');

      const ivHex = parts[0]!;
      const tagHex = parts[1]!;
      const encryptedHex = parts[2]!;
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const key = this.deriveKey(context);
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv, { authTagLength: this.tagLength });

      decipher.setAAD(Buffer.from(context));
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Decryption failed', { component: 'EncryptionService', error });
      throw new Error('Decryption operation failed or integrity check failed');
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}

export const encryptionService = new EncryptionService();


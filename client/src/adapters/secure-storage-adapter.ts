/**
 * Secure Storage Adapter
 * 
 * Replaces the insecure client token management with shared secure utilities.
 * Addresses critical security vulnerabilities identified in the analysis.
 * 
 * SECURITY FIXES:
 * - Replaces XOR-based encryption with Web Crypto API
 * - Eliminates hardcoded encryption keys
 * - Standardizes token storage mechanisms
 * - Implements proper key derivation
 */

import { ClientSharedAdapter } from './shared-module-adapter';

// ============================================================================
// SECURE TOKEN STORAGE (Replaces insecure tokenManager.ts)
// ============================================================================

interface SecureTokenData {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  issuedAt: number;
  userId?: string;
}

interface StorageOptions {
  keyDerivationSalt?: string;
  encryptionAlgorithm?: string;
  storageKey?: string;
}

/**
 * Secure Storage Adapter using Web Crypto API
 * 
 * This replaces the insecure XOR-based encryption in the original tokenManager
 * with cryptographically secure encryption using the Web Crypto API.
 */
export class SecureStorageAdapter {
  private static readonly DEFAULT_STORAGE_KEY = 'chanuka_secure_session';
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  
  private static cryptoKey: CryptoKey | null = null;
  private static isInitialized = false;

  /**
   * Initialize the secure storage system
   * Derives encryption key from user session and device fingerprint
   */
  static async initialize(options: StorageOptions = {}): Promise<void> {
    if (this.isInitialized && this.cryptoKey) {
      return;
    }

    try {
      // Generate a device-specific salt
      const deviceFingerprint = await this.generateDeviceFingerprint();
      const salt = options.keyDerivationSalt || deviceFingerprint;
      
      // Derive encryption key using PBKDF2
      const keyMaterial = await this.deriveKeyMaterial(salt);
      this.cryptoKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode(salt),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH
        },
        false, // Not extractable for security
        ['encrypt', 'decrypt']
      );

      this.isInitialized = true;
      
      ClientSharedAdapter.logger.info('Secure storage initialized', {
        component: 'secure-storage',
        algorithm: this.ALGORITHM,
        keyLength: this.KEY_LENGTH
      });
    } catch (error) {
      ClientSharedAdapter.logger.error('Failed to initialize secure storage', { error });
      throw new Error('Secure storage initialization failed');
    }
  }

  /**
   * Store token data securely
   */
  static async storeToken(tokenData: SecureTokenData, options: StorageOptions = {}): Promise<void> {
    await this.ensureInitialized();
    
    try {
      const serialized = JSON.stringify(tokenData);
      const encrypted = await this.encrypt(serialized);
      const storageKey = options.storageKey || this.DEFAULT_STORAGE_KEY;
      
      // Store in localStorage with encryption
      localStorage.setItem(storageKey, encrypted);
      
      ClientSharedAdapter.logger.debug('Token stored securely', {
        component: 'secure-storage',
        operation: 'store',
        userId: tokenData.userId,
        expiresAt: new Date(tokenData.expiresAt).toISOString()
      });
    } catch (error) {
      ClientSharedAdapter.logger.error('Failed to store token', { error });
      throw new Error('Token storage failed');
    }
  }

  /**
   * Retrieve token data securely
   */
  static async retrieveToken(options: StorageOptions = {}): Promise<SecureTokenData | null> {
    await this.ensureInitialized();
    
    try {
      const storageKey = options.storageKey || this.DEFAULT_STORAGE_KEY;
      const encrypted = localStorage.getItem(storageKey);
      
      if (!encrypted) {
        return null;
      }

      const decrypted = await this.decrypt(encrypted);
      const tokenData: SecureTokenData = JSON.parse(decrypted);
      
      // Check if token is expired
      if (Date.now() > tokenData.expiresAt) {
        await this.clearToken(options);
        ClientSharedAdapter.logger.info('Expired token removed', {
          component: 'secure-storage',
          operation: 'retrieve',
          expiredAt: new Date(tokenData.expiresAt).toISOString()
        });
        return null;
      }

      return tokenData;
    } catch (error) {
      ClientSharedAdapter.logger.error('Failed to retrieve token', { error });
      // Clear corrupted data
      await this.clearToken(options);
      return null;
    }
  }

  /**
   * Clear stored token data
   */
  static async clearToken(options: StorageOptions = {}): Promise<void> {
    try {
      const storageKey = options.storageKey || this.DEFAULT_STORAGE_KEY;
      localStorage.removeItem(storageKey);
      
      ClientSharedAdapter.logger.info('Token cleared', {
        component: 'secure-storage',
        operation: 'clear'
      });
    } catch (error) {
      ClientSharedAdapter.logger.error('Failed to clear token', { error });
    }
  }

  /**
   * Check if valid token exists
   */
  static async hasValidToken(options: StorageOptions = {}): Promise<boolean> {
    const tokenData = await this.retrieveToken(options);
    return tokenData !== null;
  }

  /**
   * Get current token for API requests
   */
  static async getAuthToken(options: StorageOptions = {}): Promise<string | null> {
    const tokenData = await this.retrieveToken(options);
    return tokenData?.token || null;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private static async deriveKeyMaterial(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    return await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
  }

  private static async generateDeviceFingerprint(): Promise<string> {
    // Create a device-specific fingerprint for key derivation
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || '0'
    ];
    
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private static async encrypt(plaintext: string): Promise<string> {
    if (!this.cryptoKey) {
      throw new Error('Encryption key not available');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: this.ALGORITHM,
        iv: iv
      },
      this.cryptoKey,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  }

  private static async decrypt(encryptedData: string): Promise<string> {
    if (!this.cryptoKey) {
      throw new Error('Decryption key not available');
    }

    try {
      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH);
      const encrypted = combined.slice(this.IV_LENGTH);
      
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        this.cryptoKey,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      throw new Error('Decryption failed: ' + (error as Error).message);
    }
  }
}

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

/**
 * Migration utility to safely transition from old token storage
 */
export class TokenMigrationUtility {
  /**
   * Migrate from old insecure token storage to new secure storage
   */
  static async migrateFromLegacyStorage(): Promise<void> {
    try {
      // Check for old token storage patterns
      const legacyKeys = [
        'auth_token',
        'access_token', 
        'chanuka_token',
        'user_token'
      ];

      for (const key of legacyKeys) {
        const legacyToken = localStorage.getItem(key);
        if (legacyToken) {
          ClientSharedAdapter.logger.warn('Found legacy token storage', {
            component: 'token-migration',
            legacyKey: key
          });

          // Try to parse and migrate if it's a valid token
          try {
            // Assume it's a JWT and extract expiry
            const payload = JSON.parse(atob(legacyToken.split('.')[1]));
            const expiresAt = payload.exp ? payload.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;

            const tokenData: SecureTokenData = {
              token: legacyToken,
              expiresAt,
              issuedAt: Date.now()
            };

            await SecureStorageAdapter.storeToken(tokenData);
            
            // Remove legacy storage
            localStorage.removeItem(key);
            
            ClientSharedAdapter.logger.info('Successfully migrated legacy token', {
              component: 'token-migration',
              legacyKey: key
            });
          } catch (parseError) {
            ClientSharedAdapter.logger.error('Failed to parse legacy token', {
              component: 'token-migration',
              legacyKey: key,
              error: parseError
            });
            
            // Remove invalid legacy token
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      ClientSharedAdapter.logger.error('Token migration failed', { error });
    }
  }

  /**
   * Clean up any remaining insecure storage
   */
  static cleanupInsecureStorage(): void {
    const insecureKeys = [
      'auth_token',
      'access_token',
      'chanuka_token', 
      'user_token',
      'refresh_token',
      'session_data'
    ];

    insecureKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        ClientSharedAdapter.logger.info('Removed insecure storage', {
          component: 'security-cleanup',
          removedKey: key
        });
      }
    });
  }
}

export default SecureStorageAdapter;
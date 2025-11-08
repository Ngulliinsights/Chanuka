/**
 * Secure Storage Utility
 * Provides encrypted storage for sensitive data using Web Crypto API
 * Falls back to plain storage if crypto is unavailable
 */

interface SecureStorageOptions {
  storage?: 'localStorage' | 'sessionStorage';
  encrypt?: boolean;
}

class SecureStorage {
  private storage: Storage;
  private encrypt: boolean;
  private key?: CryptoKey;

  constructor(options: SecureStorageOptions = {}) {
    this.storage = options.storage === 'sessionStorage' ? sessionStorage : localStorage;
    this.encrypt = options.encrypt !== false;

    if (this.encrypt && window.crypto && window.crypto.subtle) {
      this.initializeKey();
    }
  }

  private async initializeKey(): Promise<void> {
    try {
      this.key = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.warn('Failed to initialize encryption key, falling back to plain storage:', error);
      this.encrypt = false;
    }
  }

  private async encryptData(data: string): Promise<string> {
    if (!this.encrypt || !this.key) {
      return data;
    }

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        this.key,
        dataBuffer
      );

      const encryptedArray = new Uint8Array(encrypted);
      const combined = new Uint8Array(iv.length + encryptedArray.length);
      combined.set(iv);
      combined.set(encryptedArray, iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.warn('Encryption failed, storing plain text:', error);
      return data;
    }
  }

  private async decryptData(encryptedData: string): Promise<string> {
    if (!this.encrypt || !this.key) {
      return encryptedData;
    }

    try {
      const combined = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
      );
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        this.key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.warn('Decryption failed, returning raw data:', error);
      return encryptedData;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    const encryptedValue = await this.encryptData(value);
    this.storage.setItem(key, encryptedValue);
  }

  async getItem(key: string): Promise<string | null> {
    const storedValue = this.storage.getItem(key);
    if (!storedValue) {
      return null;
    }
    return await this.decryptData(storedValue);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

// Export instances for different use cases
export const secureLocalStorage = new SecureStorage({ storage: 'localStorage', encrypt: true });
export const secureSessionStorage = new SecureStorage({ storage: 'sessionStorage', encrypt: true });

// For tokens, use session storage (more secure than local)
export const tokenStorage = secureSessionStorage;

// For general secure storage
export const secureStorage = secureLocalStorage;
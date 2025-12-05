/**
 * Session Manager Module
 * 
 * Handles user session lifecycle with automatic expiration, validation,
 * and secure storage. Provides comprehensive session management capabilities.
 */

import { logger } from '../../utils/logger';
import { SecureStorage } from './secure-storage';
import { 
  SessionInfo, 
  SessionValidation, 
  StorageOptions,
  StorageError,
  StorageErrorCode
} from './types';

/**
 * Creates a session-specific storage error
 */
function createSessionError(
  code: StorageErrorCode,
  message: string,
  context?: Record<string, unknown>
): StorageError {
  const error = new Error(message) as StorageError;
  error.code = code;
  error.context = context;
  error.recoverable = code !== 'STORAGE_NOT_AVAILABLE';
  return error;
}

/**
 * SessionManager handles user session lifecycle with automatic expiration.
 * Sessions are stored encrypted and validated on access.
 */
export class SessionManager {
  private static instance: SessionManager;
  private storage: SecureStorage;
  private currentSession: SessionInfo | null = null;
  private readonly sessionKey = 'current_session';
  private readonly sessionNamespace = 'session';
  private sessionCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.storage = SecureStorage.getInstance();
    this.loadSession();
    this.startSessionMonitoring();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Loads the current session from storage and validates it
   */
  private async loadSession(): Promise<void> {
    try {
      const session = await this.storage.getItem<SessionInfo>(this.sessionKey, {
        encrypt: true,
        namespace: this.sessionNamespace
      });

      if (session) {
        // Ensure dates are properly converted
        session.expiresAt = new Date(session.expiresAt);
        if (session.createdAt) {
          session.createdAt = new Date(session.createdAt);
        }
        if (session.lastAccessedAt) {
          session.lastAccessedAt = new Date(session.lastAccessedAt);
        }
        
        const validation = this.validateSession(session);
        if (validation.isValid) {
          this.currentSession = session;
          // Update last accessed time
          await this.updateLastAccessed();
        } else {
          // Session invalid, clean up
          await this.clearSession();
        }
      }
    } catch (error) {
      logger.error('Failed to load session', { error });
    }
  }

  /**
   * Creates a new session and stores it encrypted
   */
  async createSession(sessionInfo: SessionInfo): Promise<void> {
    try {
      // Ensure dates are Date objects and add metadata
      const session: SessionInfo = {
        ...sessionInfo,
        expiresAt: new Date(sessionInfo.expiresAt),
        createdAt: new Date(),
        lastAccessedAt: new Date(),
        metadata: {
          ...sessionInfo.metadata,
          createdBy: 'SessionManager',
          version: '1.0'
        }
      };

      this.currentSession = session;
      
      // Calculate TTL from expiration time
      const ttl = session.expiresAt.getTime() - Date.now();
      
      await this.storage.setItem(this.sessionKey, session, {
        encrypt: true,
        namespace: this.sessionNamespace,
        ttl: ttl > 0 ? ttl : undefined
      });

      logger.info('Session created', { 
        userId: session.userId,
        sessionId: session.sessionId,
        expiresAt: session.expiresAt.toISOString(),
        permissions: session.permissions?.length || 0
      });
    } catch (error) {
      logger.error('Failed to create session', { error });
      throw createSessionError('INVALID_DATA', 'Failed to create session', { sessionInfo });
    }
  }

  /**
   * Updates the current session with new information
   */
  async updateSession(updates: Partial<SessionInfo>): Promise<void> {
    if (!this.currentSession) {
      throw createSessionError('ENTRY_NOT_FOUND', 'No active session to update');
    }

    try {
      // Handle Date conversion for expiresAt
      if (updates.expiresAt) {
        updates.expiresAt = new Date(updates.expiresAt);
      }

      // Update session object
      this.currentSession = { 
        ...this.currentSession, 
        ...updates,
        lastAccessedAt: new Date()
      };
      
      // Calculate new TTL if expiration changed
      const ttl = this.currentSession.expiresAt.getTime() - Date.now();
      
      await this.storage.setItem(this.sessionKey, this.currentSession, {
        encrypt: true,
        namespace: this.sessionNamespace,
        ttl: ttl > 0 ? ttl : undefined
      });

      logger.debug('Session updated', { 
        sessionId: this.currentSession.sessionId,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      logger.error('Failed to update session', { error });
      throw createSessionError('INVALID_DATA', 'Failed to update session', { updates });
    }
  }

  /**
   * Returns the current session or null if no valid session exists
   */
  getCurrentSession(): SessionInfo | null {
    if (!this.currentSession) {
      return null;
    }

    const validation = this.validateSession(this.currentSession);
    if (!validation.isValid) {
      this.clearSession();
      return null;
    }

    return this.currentSession;
  }

  /**
   * Validates a session and returns detailed validation result
   */
  validateSession(session: SessionInfo): SessionValidation {
    if (!session) {
      return {
        isValid: false,
        reason: 'not_found'
      };
    }

    try {
      // Check expiration
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);
      
      if (expiresAt <= now) {
        return {
          isValid: false,
          reason: 'expired',
          expiresIn: 0
        };
      }

      // Check required fields
      if (!session.userId || !session.sessionId) {
        return {
          isValid: false,
          reason: 'invalid_format'
        };
      }

      const expiresIn = expiresAt.getTime() - now.getTime();
      const warnings: string[] = [];

      // Check if session is expiring soon (within 5 minutes)
      if (expiresIn < 5 * 60 * 1000) {
        warnings.push('Session expires soon');
      }

      return {
        isValid: true,
        expiresIn,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      logger.error('Session validation failed', { error, sessionId: session.sessionId });
      return {
        isValid: false,
        reason: 'corrupted'
      };
    }
  }

  /**
   * Checks if a valid session exists and hasn't expired
   */
  isSessionValid(): boolean {
    const session = this.getCurrentSession();
    return session !== null;
  }

  /**
   * Clears the current session from memory and storage
   */
  async clearSession(): Promise<void> {
    try {
      const sessionId = this.currentSession?.sessionId;
      
      this.currentSession = null;
      this.storage.removeItem(this.sessionKey, {
        namespace: this.sessionNamespace
      });

      logger.info('Session cleared', { sessionId });
    } catch (error) {
      logger.error('Failed to clear session', { error });
    }
  }

  /**
   * Extends the current session expiration time
   */
  async extendSession(additionalMinutes: number = 60): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    try {
      const newExpiresAt = new Date(Date.now() + additionalMinutes * 60 * 1000);
      await this.updateSession({ expiresAt: newExpiresAt });
      
      logger.info('Session extended', {
        sessionId: this.currentSession.sessionId,
        newExpiresAt: newExpiresAt.toISOString(),
        additionalMinutes
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to extend session', { error });
      return false;
    }
  }

  /**
   * Checks if the session has a specific permission
   */
  hasPermission(permission: string): boolean {
    const session = this.getCurrentSession();
    return session?.permissions?.includes(permission) ?? false;
  }

  /**
   * Adds a permission to the current session
   */
  async addPermission(permission: string): Promise<void> {
    if (!this.currentSession) {
      throw createSessionError('ENTRY_NOT_FOUND', 'No active session');
    }

    const permissions = [...(this.currentSession.permissions || [])];
    if (!permissions.includes(permission)) {
      permissions.push(permission);
      await this.updateSession({ permissions });
    }
  }

  /**
   * Removes a permission from the current session
   */
  async removePermission(permission: string): Promise<void> {
    if (!this.currentSession) {
      throw createSessionError('ENTRY_NOT_FOUND', 'No active session');
    }

    const permissions = (this.currentSession.permissions || []).filter(p => p !== permission);
    await this.updateSession({ permissions });
  }

  /**
   * Gets metadata from the current session
   */
  getMetadata(key: string): unknown {
    return this.currentSession?.metadata?.[key];
  }

  /**
   * Sets metadata on the current session
   */
  async setMetadata(key: string, value: unknown): Promise<void> {
    if (!this.currentSession) {
      throw createSessionError('ENTRY_NOT_FOUND', 'No active session');
    }

    const metadata = { ...this.currentSession.metadata, [key]: value };
    await this.updateSession({ metadata });
  }

  /**
   * Gets session statistics
   */
  getSessionStats() {
    const session = this.currentSession;
    if (!session) {
      return null;
    }

    const now = new Date();
    const createdAt = session.createdAt ? new Date(session.createdAt) : null;
    const lastAccessedAt = session.lastAccessedAt ? new Date(session.lastAccessedAt) : null;
    const expiresAt = new Date(session.expiresAt);

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      isValid: this.isSessionValid(),
      expiresIn: expiresAt.getTime() - now.getTime(),
      duration: createdAt ? now.getTime() - createdAt.getTime() : null,
      lastAccessed: lastAccessedAt ? now.getTime() - lastAccessedAt.getTime() : null,
      permissionCount: session.permissions?.length || 0,
      hasRefreshToken: !!session.refreshToken
    };
  }

  /**
   * Updates the last accessed timestamp
   */
  private async updateLastAccessed(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.lastAccessedAt = new Date();
      // Don't await this to avoid blocking
      this.storage.setItem(this.sessionKey, this.currentSession, {
        encrypt: true,
        namespace: this.sessionNamespace
      }).catch(error => {
        logger.warn('Failed to update last accessed time', { error });
      });
    }
  }

  /**
   * Starts monitoring session validity
   */
  private startSessionMonitoring(): void {
    // Check session validity every minute
    this.sessionCheckInterval = setInterval(() => {
      if (this.currentSession) {
        const validation = this.validateSession(this.currentSession);
        if (!validation.isValid) {
          logger.info('Session expired during monitoring', {
            sessionId: this.currentSession.sessionId,
            reason: validation.reason
          });
          this.clearSession();
        } else if (validation.warnings?.length) {
          logger.warn('Session validation warnings', {
            sessionId: this.currentSession.sessionId,
            warnings: validation.warnings
          });
        }
      }
    }, 60000); // 1 minute
  }

  /**
   * Stops session monitoring
   */
  stopMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Cleanup method for proper shutdown
   */
  async cleanup(): Promise<void> {
    this.stopMonitoring();
    // Don't clear session on cleanup, just stop monitoring
  }
}
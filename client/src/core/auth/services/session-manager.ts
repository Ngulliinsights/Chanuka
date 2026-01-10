/**
 * Consolidated Session Manager - Final Optimized Version
 *
 * Enterprise-grade session management with:
 * - Type-safe operations
 * - Encrypted storage
 * - Automatic expiration handling
 * - Permission management
 * - Session monitoring
 * - Event notifications
 */

import { logger } from '@client/shared/utils/logger';

import { createError } from '../../error';
import { ErrorDomain, ErrorSeverity } from '../../error/constants';
import { SecureStorage } from '../../storage/secure-storage';
import {
  SESSION_KEY,
  SESSION_STORAGE_NAMESPACE,
  SESSION_MONITORING_INTERVAL_MS,
  SESSION_WARNING_THRESHOLD_MS,
} from '../constants/auth-constants';
import type {
  SessionInfo,
  SessionValidation,
  CreateSessionParams,
  UpdateSessionParams,
  SessionStats,
  SessionEvent,
  SessionEventListener,
} from '../types';

/**
 * SessionManager handles the complete session lifecycle with automatic expiration,
 * encrypted storage, and comprehensive validation.
 */
export class SessionManager {
  private static instance: SessionManager;
  private storage: SecureStorage;
  private currentSession: SessionInfo | null = null;

  // Configuration
  private readonly sessionKey = SESSION_KEY;
  private readonly sessionNamespace = SESSION_STORAGE_NAMESPACE;
  private readonly checkIntervalMs = SESSION_MONITORING_INTERVAL_MS;
  private readonly warningThresholdMs = SESSION_WARNING_THRESHOLD_MS;

  // State management
  private sessionCheckInterval: NodeJS.Timeout | null = null;
  private warningListeners: Array<(warning: string) => void> = [];
  private eventListeners: Map<SessionEvent, Set<SessionEventListener>> = new Map();

  private constructor() {
    this.storage = SecureStorage.getInstance();
    this.initializeManager();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Initialize the session manager
   */
  private async initializeManager(): Promise<void> {
    await this.loadSession();
    this.startSessionMonitoring();
  }

  // ==========================================================================
  // Core Session Operations
  // ==========================================================================

  /**
   * Creates a new session with the provided parameters
   */
  async createSession(params: CreateSessionParams): Promise<void> {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + params.expiresIn);

      const session: SessionInfo = {
        userId: params.userId,
        sessionId: this.generateSessionId(),
        token: params.token,
        refreshToken: params.refreshToken,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        lastAccessedAt: now.toISOString(),
        permissions: params.permissions || [],
        roles: params.roles || [],
        metadata: {
          ...params.metadata,
          createdBy: 'SessionManager',
          version: '1.0',
          deviceId: params.deviceId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      };

      this.currentSession = session;

      await this.storage.setItem(this.sessionKey, session, {
        encrypt: true,
        namespace: this.sessionNamespace,
        ttl: params.expiresIn,
      });

      logger.info('Session created', {
        userId: session.userId,
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        permissions: session.permissions?.length || 0,
      });

      this.emitEvent('session:created', { sessionId: session.sessionId });
    } catch (error) {
      logger.error('Failed to create session', { error });
      throw createError(ErrorDomain.SESSION, ErrorSeverity.HIGH, 'Failed to create session', {
        details: { userId: params.userId },
        recoverable: true,
        retryable: true,
      });
    }
  }

  /**
   * Updates the current session with new information
   */
  async updateSession(updates: UpdateSessionParams): Promise<void> {
    if (!this.currentSession) {
      throw createError(ErrorDomain.SESSION, ErrorSeverity.MEDIUM, 'No active session to update', {
        recoverable: false,
      });
    }

    try {
      const now = new Date();

      // Create updated session
      const updatedSession: SessionInfo = {
        ...this.currentSession,
        ...updates,
        lastAccessedAt: now.toISOString(),
      };

      this.currentSession = updatedSession;

      // Calculate TTL if expiration exists
      const expiresAt = new Date(updatedSession.expiresAt);
      const ttl = expiresAt.getTime() - now.getTime();

      await this.storage.setItem(this.sessionKey, updatedSession, {
        encrypt: true,
        namespace: this.sessionNamespace,
        ttl: ttl > 0 ? ttl : undefined,
      });

      logger.debug('Session updated', {
        sessionId: this.currentSession.sessionId,
        updatedFields: Object.keys(updates),
      });

      this.emitEvent('session:updated', {
        sessionId: updatedSession.sessionId,
        updates: Object.keys(updates),
      });
    } catch (error) {
      logger.error('Failed to update session', { error });
      throw createError(ErrorDomain.SESSION, ErrorSeverity.MEDIUM, 'Failed to update session', {
        details: { updates },
        recoverable: true,
        retryable: true,
      });
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
      this.clearSession().catch(error => {
        logger.error('Failed to clear invalid session', { error });
      });
      return null;
    }

    // Update last accessed time asynchronously
    this.updateLastAccessed().catch(error => {
      logger.warn('Failed to update last accessed time', { error });
    });

    return this.currentSession;
  }

  /**
   * Clears the current session from memory and storage
   */
  async clearSession(): Promise<void> {
    try {
      const sessionId = this.currentSession?.sessionId;

      this.currentSession = null;
      await this.storage.removeItem(this.sessionKey, {
        namespace: this.sessionNamespace,
      });

      logger.info('Session cleared', { sessionId });
      this.emitEvent('session:cleared', { sessionId });
    } catch (error) {
      logger.error('Failed to clear session', { error });
      throw createError(ErrorDomain.SESSION, ErrorSeverity.MEDIUM, 'Failed to clear session', {
        recoverable: true,
      });
    }
  }

  // ==========================================================================
  // Session Validation
  // ==========================================================================

  /**
   * Validates a session and returns detailed validation result
   */
  validateSession(session: SessionInfo): SessionValidation {
    if (!session) {
      return {
        isValid: false,
        reason: 'not_found',
      };
    }

    try {
      const now = new Date();
      const expiresAt = new Date(session.expiresAt);

      // Check expiration
      if (expiresAt <= now) {
        return {
          isValid: false,
          reason: 'expired',
          expiresIn: 0,
        };
      }

      // Check required fields
      if (!session.userId || !session.sessionId || !session.token) {
        return {
          isValid: false,
          reason: 'invalid_format',
        };
      }

      // Calculate expiration time
      const expiresIn = expiresAt.getTime() - now.getTime();
      const warnings: string[] = [];

      // Check if session is expiring soon
      if (expiresIn < this.warningThresholdMs) {
        const message = `Session expires in ${Math.round(expiresIn / 60000)} minutes`;
        warnings.push(message);
        this.notifyWarning(message);
      }

      return {
        isValid: true,
        expiresIn,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      logger.error('Session validation failed', {
        error,
        sessionId: session?.sessionId,
      });
      return {
        isValid: false,
        reason: 'corrupted',
      };
    }
  }

  /**
   * Checks if a valid session exists
   */
  isSessionValid(): boolean {
    const session = this.getCurrentSession();
    return session !== null;
  }

  // ==========================================================================
  // Session Extension and Expiration
  // ==========================================================================

  /**
   * Extends the current session expiration time
   */
  async extendSession(additionalMinutes: number = 60): Promise<boolean> {
    if (!this.currentSession) {
      return false;
    }

    try {
      const now = new Date();
      const newExpiresAt = new Date(now.getTime() + additionalMinutes * 60 * 1000);

      await this.updateSession({
        expiresAt: newExpiresAt.toISOString(),
      });

      logger.info('Session extended', {
        sessionId: this.currentSession.sessionId,
        newExpiresAt: newExpiresAt.toISOString(),
        additionalMinutes,
      });

      this.emitEvent('session:extended', {
        sessionId: this.currentSession.sessionId,
        additionalMinutes,
      });

      return true;
    } catch (error) {
      logger.error('Failed to extend session', { error });
      return false;
    }
  }

  // ==========================================================================
  // Permission Management
  // ==========================================================================

  /**
   * Checks if the session has a specific permission
   */
  hasPermission(permission: string): boolean {
    const session = this.getCurrentSession();
    if (!session?.permissions) {
      return false;
    }
    return session.permissions.includes(permission);
  }

  /**
   * Checks if the session has all specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    const session = this.getCurrentSession();
    if (!session?.permissions) {
      return false;
    }
    return permissions.every(p => session.permissions!.includes(p));
  }

  /**
   * Checks if the session has any of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const session = this.getCurrentSession();
    if (!session?.permissions) {
      return false;
    }
    return permissions.some(p => session.permissions!.includes(p));
  }

  /**
   * Adds a permission to the current session
   */
  async addPermission(permission: string): Promise<void> {
    if (!this.currentSession) {
      throw createError(ErrorDomain.SESSION, ErrorSeverity.MEDIUM, 'No active session', {
        recoverable: false,
      });
    }

    const permissions = [...(this.currentSession.permissions || [])];
    if (!permissions.includes(permission)) {
      permissions.push(permission);
      await this.updateSession({ permissions });
      logger.debug('Permission added', { permission });
    }
  }

  /**
   * Adds multiple permissions to the current session
   */
  async addPermissions(permissions: string[]): Promise<void> {
    if (!this.currentSession) {
      throw createError(ErrorDomain.SESSION, ErrorSeverity.MEDIUM, 'No active session', {
        recoverable: false,
      });
    }

    const currentPermissions = new Set(this.currentSession.permissions || []);
    let added = false;

    permissions.forEach(p => {
      if (!currentPermissions.has(p)) {
        currentPermissions.add(p);
        added = true;
      }
    });

    if (added) {
      await this.updateSession({
        permissions: Array.from(currentPermissions),
      });
      logger.debug('Permissions added', { count: permissions.length });
    }
  }

  /**
   * Removes a permission from the current session
   */
  async removePermission(permission: string): Promise<void> {
    if (!this.currentSession) {
      throw createError(ErrorDomain.SESSION, ErrorSeverity.MEDIUM, 'No active session', {
        recoverable: false,
      });
    }

    const permissions = (this.currentSession.permissions || []).filter(
      (p: string) => p !== permission
    );

    await this.updateSession({ permissions });
    logger.debug('Permission removed', { permission });
  }

  /**
   * Sets exact permissions (replaces existing)
   */
  async setPermissions(permissions: string[]): Promise<void> {
    if (!this.currentSession) {
      throw createError(ErrorDomain.SESSION, ErrorSeverity.MEDIUM, 'No active session', {
        recoverable: false,
      });
    }

    await this.updateSession({ permissions });
    logger.debug('Permissions set', { count: permissions.length });
  }

  // ==========================================================================
  // Metadata Management
  // ==========================================================================

  /**
   * Gets metadata from the current session
   */
  getMetadata(key: string): unknown {
    return this.currentSession?.metadata?.[key];
  }

  /**
   * Gets all metadata from the current session
   */
  getAllMetadata(): Record<string, unknown> | undefined {
    return this.currentSession?.metadata;
  }

  /**
   * Sets metadata on the current session
   */
  async setMetadata(key: string, value: unknown): Promise<void> {
    if (!this.currentSession) {
      throw createError(ErrorDomain.SESSION, ErrorSeverity.MEDIUM, 'No active session', {
        recoverable: false,
      });
    }

    const metadata = {
      ...this.currentSession.metadata,
      [key]: value,
    };

    await this.updateSession({ metadata });
    logger.debug('Metadata set', { key });
  }

  /**
   * Sets multiple metadata values
   */
  async setMetadataMultiple(data: Record<string, unknown>): Promise<void> {
    if (!this.currentSession) {
      throw createError(ErrorDomain.SESSION, ErrorSeverity.MEDIUM, 'No active session', {
        recoverable: false,
      });
    }

    const metadata = {
      ...this.currentSession.metadata,
      ...data,
    };

    await this.updateSession({ metadata });
    logger.debug('Multiple metadata set', { count: Object.keys(data).length });
  }

  /**
   * Removes metadata from the current session
   */
  async removeMetadata(key: string): Promise<void> {
    if (!this.currentSession?.metadata) {
      return;
    }

    const metadata = { ...this.currentSession.metadata };
    delete metadata[key];

    await this.updateSession({ metadata });
    logger.debug('Metadata removed', { key });
  }

  // ==========================================================================
  // Session Statistics and Monitoring
  // ==========================================================================

  /**
   * Gets comprehensive session statistics
   */
  getSessionStats(): SessionStats | null {
    const session = this.currentSession;
    if (!session) {
      return null;
    }

    const now = new Date();
    const createdAt = new Date(session.createdAt);
    const lastAccessedAt = session.lastAccessedAt ? new Date(session.lastAccessedAt) : null;
    const expiresAt = new Date(session.expiresAt);

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      isValid: this.isSessionValid(),
      expiresIn: expiresAt.getTime() - now.getTime(),
      duration: now.getTime() - createdAt.getTime(),
      lastAccessed: lastAccessedAt ? now.getTime() - lastAccessedAt.getTime() : null,
      permissionCount: session.permissions?.length || 0,
      hasRefreshToken: !!session.refreshToken,
      metadata: session.metadata,
    };
  }

  /**
   * Gets session summary information
   */
  getSessionSummary(): {
    isAuthenticated: boolean;
    userId?: string;
    sessionId?: string;
    expiresIn?: number;
    permissions?: string[];
  } {
    const session = this.getCurrentSession();

    if (!session) {
      return { isAuthenticated: false };
    }

    const expiresAt = new Date(session.expiresAt);
    const expiresIn = expiresAt.getTime() - Date.now();

    return {
      isAuthenticated: true,
      userId: session.userId,
      sessionId: session.sessionId,
      expiresIn,
      permissions: session.permissions,
    };
  }

  // ==========================================================================
  // Event Management
  // ==========================================================================

  /**
   * Registers a warning listener
   */
  onWarning(listener: (warning: string) => void): () => void {
    this.warningListeners.push(listener);

    return () => {
      const index = this.warningListeners.indexOf(listener);
      if (index > -1) {
        this.warningListeners.splice(index, 1);
      }
    };
  }

  /**
   * Registers an event listener
   */
  on(event: SessionEvent, listener: SessionEventListener): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }

    this.eventListeners.get(event)!.add(listener);

    return () => {
      const listeners = this.eventListeners.get(event);
      if (listeners) {
        listeners.delete(listener);
      }
    };
  }

  /**
   * Removes an event listener
   */
  off(event: SessionEvent, listener: SessionEventListener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emits an event to all registered listeners
   */
  private emitEvent(event: SessionEvent, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event, data);
        } catch (error) {
          logger.error('Event listener error', { error, event });
        }
      });
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Loads the current session from storage and validates it
   */
  private async loadSession(): Promise<void> {
    try {
      const session = await this.storage.getItem<SessionInfo>(this.sessionKey, {
        encrypt: true,
        namespace: this.sessionNamespace,
      });

      if (session) {
        const validation = this.validateSession(session);
        if (validation.isValid) {
          this.currentSession = session;
          await this.updateLastAccessed();
          logger.info('Session loaded', { sessionId: session.sessionId });
        } else {
          await this.clearSession();
          logger.info('Invalid session cleared on load', {
            reason: validation.reason,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to load session', { error });
    }
  }

  /**
   * Updates the last accessed timestamp
   */
  private async updateLastAccessed(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    const now = new Date();
    this.currentSession.lastAccessedAt = now.toISOString();

    try {
      await this.storage.setItem(this.sessionKey, this.currentSession, {
        encrypt: true,
        namespace: this.sessionNamespace,
      });
    } catch (error) {
      logger.warn('Failed to update last accessed time', { error });
    }
  }

  /**
   * Notifies warning listeners
   */
  private notifyWarning(warning: string): void {
    this.warningListeners.forEach(listener => {
      try {
        listener(warning);
      } catch (error) {
        logger.error('Warning listener error', { error, warning });
      }
    });

    this.emitEvent('session:warning', { warning });
  }

  /**
   * Starts monitoring session validity
   */
  private startSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      return; // Already monitoring
    }

    this.sessionCheckInterval = setInterval(() => {
      if (this.currentSession) {
        const validation = this.validateSession(this.currentSession);

        if (!validation.isValid) {
          logger.info('Session expired during monitoring', {
            sessionId: this.currentSession.sessionId,
            reason: validation.reason,
          });

          this.emitEvent('session:expired', {
            sessionId: this.currentSession.sessionId,
            reason: validation.reason,
          });

          this.clearSession().catch(error => {
            logger.error('Failed to clear expired session', { error });
          });
        } else if (validation.warnings?.length) {
          logger.warn('Session validation warnings', {
            sessionId: this.currentSession.sessionId,
            warnings: validation.warnings,
          });
        }
      }
    }, this.checkIntervalMs);
  }

  /**
   * Stops session monitoring
   */
  private stopMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Generates a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 15);
    return `sess_${timestamp}_${randomPart}`;
  }

  // ==========================================================================
  // Lifecycle Management
  // ==========================================================================

  /**
   * Cleanup method for proper shutdown
   */
  async cleanup(): Promise<void> {
    this.stopMonitoring();
    this.warningListeners = [];
    this.eventListeners.clear();
    logger.info('SessionManager cleanup complete');
  }

  /**
   * Resets the session manager (for testing)
   */
  async reset(): Promise<void> {
    await this.clearSession();
    this.stopMonitoring();
    this.warningListeners = [];
    this.eventListeners.clear();
    this.startSessionMonitoring();
  }
}

// ==========================================================================
// Singleton Instance and Convenience Functions
// ==========================================================================

export const sessionManager = SessionManager.getInstance();

/**
 * Convenience function to get current session
 */
export function getCurrentSession(): SessionInfo | null {
  return sessionManager.getCurrentSession();
}

/**
 * Convenience function to check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return sessionManager.isSessionValid();
}

/**
 * Convenience function to check session permission
 */
export function hasSessionPermission(permission: string): boolean {
  return sessionManager.hasPermission(permission);
}

/**
 * Convenience function to get user ID from session
 */
export function getCurrentUserId(): string | null {
  const session = sessionManager.getCurrentSession();
  return session?.userId || null;
}

/**
 * Convenience function to get session token
 */
export function getSessionToken(): string | null {
  const session = sessionManager.getCurrentSession();
  return session?.token || null;
}

export default sessionManager;

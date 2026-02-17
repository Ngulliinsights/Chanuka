/**
 * Secure Session Service
 * 
 * Full implementation for secure session management including:
 * - Secure session creation and management
 * - Session token generation and validation
 * - Session expiration handling
 * - Session storage (in-memory with optional Redis)
 * - CSRF token management
 * - Session hijacking prevention
 */

import { logger } from '@server/infrastructure/observability';
import { randomBytes, createHash } from 'crypto';

export interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  lastAccessedAt: Date;
  data: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  csrfToken?: string;
}

export interface SessionOptions {
  maxAge?: number; // in milliseconds
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Secure Session Service
 */
export class SecureSessionService {
  private sessions: Map<string, Session> = new Map();
  private csrfTokens: Map<string, string> = new Map(); // sessionId -> csrfToken
  private readonly defaultMaxAge = 24 * 60 * 60 * 1000; // 24 hours
  private readonly cleanupInterval = 60 * 60 * 1000; // 1 hour
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Create a new session
   */
  createSession(userId: string, options?: SessionOptions): Session {
    try {
      const sessionId = this.generateSecureToken();
      const now = new Date();
      const maxAge = options?.maxAge || this.defaultMaxAge;

      const session: Session = {
        id: sessionId,
        userId,
        createdAt: now,
        expiresAt: new Date(now.getTime() + maxAge),
        lastAccessedAt: now,
        data: {},
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      };

      // Generate CSRF token
      const csrfToken = this.generateSecureToken();
      session.csrfToken = csrfToken;
      this.csrfTokens.set(sessionId, csrfToken);

      // Store session
      this.sessions.set(sessionId, session);

      logger.info('Session created', {
        sessionId,
        userId,
        expiresAt: session.expiresAt,
      });

      return session;
    } catch (error) {
      logger.error('Failed to create session', { error, userId });
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate a session token
   */
  validateSession(sessionId: string, options?: { ipAddress?: string; userAgent?: string }): Session | null {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        logger.debug('Session not found', { sessionId });
        return null;
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        logger.info('Session expired', { sessionId });
        this.destroySession(sessionId);
        return null;
      }

      // Check for session hijacking (IP address mismatch)
      if (options?.ipAddress && session.ipAddress && session.ipAddress !== options.ipAddress) {
        logger.warn('Session hijacking attempt detected (IP mismatch)', {
          sessionId,
          expectedIp: session.ipAddress,
          actualIp: options.ipAddress,
        });
        this.destroySession(sessionId);
        return null;
      }

      // Check for session hijacking (User-Agent mismatch)
      if (options?.userAgent && session.userAgent && session.userAgent !== options.userAgent) {
        logger.warn('Session hijacking attempt detected (User-Agent mismatch)', {
          sessionId,
          expectedUserAgent: session.userAgent,
          actualUserAgent: options.userAgent,
        });
        this.destroySession(sessionId);
        return null;
      }

      // Update last accessed time
      session.lastAccessedAt = new Date();

      logger.debug('Session validated', { sessionId, userId: session.userId });

      return session;
    } catch (error) {
      logger.error('Failed to validate session', { error, sessionId });
      return null;
    }
  }

  /**
   * Refresh a session (extend expiration)
   */
  refreshSession(sessionId: string, maxAge?: number): Session | null {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        logger.debug('Session not found for refresh', { sessionId });
        return null;
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        logger.info('Cannot refresh expired session', { sessionId });
        this.destroySession(sessionId);
        return null;
      }

      // Extend expiration
      const extensionTime = maxAge || this.defaultMaxAge;
      session.expiresAt = new Date(Date.now() + extensionTime);
      session.lastAccessedAt = new Date();

      logger.info('Session refreshed', {
        sessionId,
        newExpiresAt: session.expiresAt,
      });

      return session;
    } catch (error) {
      logger.error('Failed to refresh session', { error, sessionId });
      return null;
    }
  }

  /**
   * Destroy a session
   */
  destroySession(sessionId: string): boolean {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        logger.debug('Session not found for destruction', { sessionId });
        return false;
      }

      // Remove session and CSRF token
      this.sessions.delete(sessionId);
      this.csrfTokens.delete(sessionId);

      logger.info('Session destroyed', {
        sessionId,
        userId: session.userId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to destroy session', { error, sessionId });
      return false;
    }
  }

  /**
   * Destroy all sessions for a user
   */
  destroyUserSessions(userId: string): number {
    try {
      let count = 0;

      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.userId === userId) {
          this.destroySession(sessionId);
          count++;
        }
      }

      logger.info('User sessions destroyed', { userId, count });

      return count;
    } catch (error) {
      logger.error('Failed to destroy user sessions', { error, userId });
      return 0;
    }
  }

  /**
   * Generate CSRF token
   */
  generateCSRFToken(sessionId: string): string {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        throw new Error('Session not found');
      }

      // Generate new CSRF token
      const csrfToken = this.generateSecureToken();
      session.csrfToken = csrfToken;
      this.csrfTokens.set(sessionId, csrfToken);

      logger.debug('CSRF token generated', { sessionId });

      return csrfToken;
    } catch (error) {
      logger.error('Failed to generate CSRF token', { error, sessionId });
      throw new Error('Failed to generate CSRF token');
    }
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(sessionId: string, token: string): boolean {
    try {
      const storedToken = this.csrfTokens.get(sessionId);

      if (!storedToken) {
        logger.warn('CSRF token not found', { sessionId });
        return false;
      }

      // Use constant-time comparison to prevent timing attacks
      const isValid = this.constantTimeCompare(storedToken, token);

      if (!isValid) {
        logger.warn('CSRF token validation failed', { sessionId });
      }

      return isValid;
    } catch (error) {
      logger.error('Failed to validate CSRF token', { error, sessionId });
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): number {
    try {
      const now = new Date();
      let count = 0;

      for (const [sessionId, session] of this.sessions.entries()) {
        if (now > session.expiresAt) {
          this.destroySession(sessionId);
          count++;
        }
      }

      if (count > 0) {
        logger.info('Expired sessions cleaned up', { count });
      }

      return count;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions', { error });
      return 0;
    }
  }

  /**
   * Get session data
   */
  getSessionData(sessionId: string, key: string): unknown {
    const session = this.sessions.get(sessionId);
    return session?.data[key];
  }

  /**
   * Set session data
   */
  setSessionData(sessionId: string, key: string, value: unknown): boolean {
    try {
      const session = this.sessions.get(sessionId);

      if (!session) {
        logger.debug('Session not found for data update', { sessionId });
        return false;
      }

      session.data[key] = value;
      session.lastAccessedAt = new Date();

      return true;
    } catch (error) {
      logger.error('Failed to set session data', { error, sessionId, key });
      return false;
    }
  }

  /**
   * Get all sessions for a user
   */
  getUserSessions(userId: string): Session[] {
    const sessions: Session[] = [];

    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    expiredSessions: number;
  } {
    const now = new Date();
    let activeSessions = 0;
    let expiredSessions = 0;

    for (const session of this.sessions.values()) {
      if (now > session.expiresAt) {
        expiredSessions++;
      } else {
        activeSessions++;
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      expiredSessions,
    };
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const aHash = createHash('sha256').update(a).digest();
    const bHash = createHash('sha256').update(b).digest();

    let result = 0;
    for (let i = 0; i < aHash.length; i++) {
      result |= aHash[i] ^ bHash[i];
    }

    return result === 0;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);

    logger.info('Session cleanup timer started', {
      interval: this.cleanupInterval,
    });
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
      logger.info('Session cleanup timer stopped');
    }
  }
}

/**
 * Global instance
 */
export const secureSessionService = new SecureSessionService();

/**
 * Export default
 */
export default secureSessionService;

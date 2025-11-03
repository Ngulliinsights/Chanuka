import crypto from 'crypto';
import { Request, Response } from 'express';
import { database as db } from '../../../shared/database/connection.js';
import { sessions, users } from '../../../shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import { encryptionService } from '../../features/security/encryption-service.js';
import { securityAuditService } from '../../features/security/security-audit-service.js';
import { logger } from '../../../shared/core/index.js';

export interface SecureSessionOptions {
  maxAge: number; // in milliseconds
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path: string;
}

export interface SessionData { user_id: string;
  email: string;
  role: string;
  loginTime: Date;
  lastActivity: Date;
  ip_address: string;
  user_agent: string;
  csrfToken: string;
  fingerprint: string;
 }

export interface SessionValidationResult {
  isValid: boolean;
  session?: SessionData;
  error?: string;
  requiresReauth?: boolean;
}

/**
 * Secure session management service with advanced security features
 */
export class SecureSessionService {
  private readonly defaultOptions: SecureSessionOptions = {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    path: '/'
  };

  private readonly maxSessionsPerUser = 5;
  private readonly sessionTimeoutMinutes = 30;
  private readonly maxInactivityMinutes = 120;

  /**
   * Create a new secure session
   */
  async createSession(
    user_id: string,
    req: Request,
    res: Response,
    options: Partial<SecureSessionOptions> = {}
  ): Promise<{ sessionId: string; csrfToken: string }> { try {
      // Generate session ID and CSRF token
      const sessionId = crypto.randomUUID();
      const csrfToken = encryptionService.generateCSRFToken();
      
      // Create session fingerprint
      const fingerprint = this.createSessionFingerprint(req);
      
      // Get client info
      const ip_address = this.getClientIP(req);
      const user_agent = req.get('User-Agent') || 'unknown';

      // Clean up old sessions for this user
      await this.cleanupUserSessions(user_id);

      // Create session data
      const sessionData: SessionData = {
        user_id,
        email: '', // Will be filled from user data
        role: '',  // Will be filled from user data
        loginTime: new Date(),
        lastActivity: new Date(),
        ip_address,
        user_agent,
        csrfToken,
        fingerprint
       };

      // Get user data
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, user_id))
        .limit(1);

      if (users.length > 0) {
        sessionData.email = user[0].email;
        sessionData.role = user[0].role;
      }

      // Encrypt session data
      const encryptedSessionData = await encryptionService.encryptData(
        JSON.stringify(sessionData),
        'session'
      );

      // Store session in database
      await db.insert(sessions).values({ id: sessionId,
        user_id,
        token: encryptedSessionData,
        expires_at: new Date(Date.now() + (options.maxAge || this.defaultOptions.maxAge)),
        is_active: true
       });

      // Set secure cookie
      const cookieOptions = { ...this.defaultOptions, ...options };
      res.cookie('sessionId', sessionId, cookieOptions);
      
      // Set CSRF token in separate cookie
      res.cookie('csrfToken', csrfToken, {
        ...cookieOptions,
        httpOnly: false // CSRF token needs to be accessible to client
      });

      // Log session creation
      await securityAuditService.logAuthEvent(
        'login_success',
        req,
        user_id,
        true,
        { sessionId, fingerprint }
      );

      return { sessionId, csrfToken };

    } catch (error) {
      logger.error('Session creation failed:', { component: 'Chanuka' }, error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Validate and refresh session
   */
  async validateSession(req: Request): Promise<SessionValidationResult> {
    try {
      const sessionId = req.cookies?.sessionId;
      const csrfToken = req.cookies?.csrfToken || req.headers['x-csrf-token'];

      if (!sessionId) {
        return { isValid: false, error: 'No session ID provided' };
      }

      // Get session from database
      const sessionRecord = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.id, sessionId),
          eq(sessions.is_active, true)
        ))
        .limit(1);

      if (sessionRecord.length === 0) {
        return { isValid: false, error: 'Session not found' };
      }

      const session = sessionRecord[0];

      // Check if session is expired
      if (new Date() > session.expires_at) {
        await this.invalidateSession(sessionId);
        return { isValid: false, error: 'Session expired' };
      }

      // Decrypt session data
      let sessionData: SessionData;
      try {
        const decryptedData = await encryptionService.decryptData(session.token!);
        sessionData = JSON.parse(decryptedData);
      } catch (error) {
        await this.invalidateSession(sessionId);
        return { isValid: false, error: 'Invalid session data' };
      }

      // Validate session fingerprint
      const currentFingerprint = this.createSessionFingerprint(req);
      if (sessionData.fingerprint !== currentFingerprint) { await this.invalidateSession(sessionId);
        await securityAuditService.logSecurityEvent({
          event_type: 'session_hijack_attempt',
          severity: 'high',
          user_id: sessionData.user_id,
          ip_address: this.getClientIP(req),
          user_agent: req.get('User-Agent'),
          result: 'blocked',
          success: false,
          details: {
            sessionId,
            expectedFingerprint: sessionData.fingerprint,
            actualFingerprint: currentFingerprint
           }
        });
        return { isValid: false, error: 'Session fingerprint mismatch' };
      }

      // Validate CSRF token for state-changing requests
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        if (!csrfToken || !encryptionService.verifyCSRFToken(csrfToken, sessionData.csrfToken)) {
          return { isValid: false, error: 'Invalid CSRF token' };
        }
      }

      // Check for suspicious activity
      const ip_address = this.getClientIP(req);
      if (sessionData.ip_address !== ip_address) { await securityAuditService.logSecurityEvent({
          event_type: 'session_ip_change',
          severity: 'medium',
          user_id: sessionData.user_id,
          ip_address,
          user_agent: req.get('User-Agent'),
          result: 'allowed',
          success: true,
          details: {
            sessionId,
            originalIP: sessionData.ip_address,
            newIP: ip_address
           }
        });
      }

      // Check for inactivity timeout
      const inactivityMinutes = (Date.now() - sessionData.lastActivity.getTime()) / (1000 * 60);
      if (inactivityMinutes > this.maxInactivityMinutes) {
        await this.invalidateSession(sessionId);
        return { 
          isValid: false, 
          error: 'Session expired due to inactivity',
          requiresReauth: true
        };
      }

      // Update last activity
      sessionData.lastActivity = new Date();
      const updatedSessionData = await encryptionService.encryptData(
        JSON.stringify(sessionData),
        'session'
      );

      await db
        .update(sessions)
        .set({ 
          token: updatedSessionData,
          updated_at: new Date()
        })
        .where(eq(sessions.id, sessionId));

      return { isValid: true, session: sessionData };

    } catch (error) {
      logger.error('Session validation failed:', { component: 'Chanuka' }, error);
      return { isValid: false, error: 'Session validation failed' };
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      await db
        .update(sessions)
        .set({ 
          is_active: false,
          updated_at: new Date()
        })
        .where(eq(sessions.id, sessionId));
    } catch (error) {
      logger.error('Session invalidation failed:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(user_id: string): Promise<void> {
    try {
      await db
        .update(sessions)
        .set({ 
          is_active: false,
          updated_at: new Date()
        })
        .where(eq(sessions.user_id, user_id));
    } catch (error) {
      logger.error('User session invalidation failed:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      
      await db
        .update(sessions)
        .set({ is_active: false })
        .where(and(
          eq(sessions.is_active, true),
          lt(sessions.expires_at, now)
        ));

      logger.info('Expired sessions cleaned up', { component: 'Chanuka' });
    } catch (error) {
      logger.error('Session cleanup failed:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Clean up old sessions for a user (keep only the most recent ones)
   */
  private async cleanupUserSessions(user_id: string): Promise<void> { try {
      // Get all active sessions for user, ordered by creation time
      const userSessions = await db
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.user_id, user_id),
          eq(sessions.is_active, true)
        ))
        .orderBy(sessions.created_at);

      // If user has too many sessions, deactivate the oldest ones
      if (userSessions.length >= this.maxSessionsPerUser) {
        const sessionsToDeactivate = userSessions.slice(0, userSessions.length - this.maxSessionsPerUser + 1);
        
        for (const session of sessionsToDeactivate) {
          await this.invalidateSession(session.id);
         }
      }
    } catch (error) {
      logger.error('User session cleanup failed:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Create session fingerprint for additional security
   */
  private createSessionFingerprint(req: Request): string {
    const components = [
      req.get('User-Agent') || '',
      req.get('Accept-Language') || '',
      req.get('Accept-Encoding') || '',
      this.getClientIP(req)
    ];

    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  /**
   * Generate secure session configuration for production
   */
  getProductionSessionConfig(): SecureSessionOptions {
    return {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true, // HTTPS only
      httpOnly: true,
      sameSite: 'strict',
      domain: process.env.DOMAIN || undefined,
      path: '/'
    };
  }

  /**
   * Get session statistics for monitoring
   */
  async getSessionStats(): Promise<{
    totalActiveSessions: number;
    sessionsLast24h: number;
    averageSessionDuration: number;
    topUserAgents: Array<{ user_agent: string; count: number }>;
  }> {
    try {
      // This would need proper SQL aggregation in production
      const activeSessions = await db
        .select()
        .from(sessions)
        .where(eq(sessions.is_active, true));

      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentSessions = activeSessions.filter(s => s.created_at! > last24h);

      return {
        totalActiveSessions: activeSessions.length,
        sessionsLast24h: recentSessions.length,
        averageSessionDuration: 0, // Would calculate from session data
        topUserAgents: [] // Would aggregate from session data
      };
    } catch (error) {
      logger.error('Failed to get session stats:', { component: 'Chanuka' }, error);
      return {
        totalActiveSessions: 0,
        sessionsLast24h: 0,
        averageSessionDuration: 0,
        topUserAgents: []
      };
    }
  }
}

// Singleton instance
export const secureSessionService = new SecureSessionService();













































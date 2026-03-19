import { encryptionService, securityAuditService } from '@server/features/security';
import { logger } from '@server/infrastructure/observability';
import { db } from '@server/infrastructure/database';
import { sessions, users } from '@server/infrastructure/schema';
import crypto from 'crypto';
import { and, eq, gt, lt, count } from 'drizzle-orm';
import { Request, Response } from 'express';

// Use the Drizzle ORM instance directly for full type inference
const getDb = () => db;

export interface SecureSessionOptions {
  maxAge: number; // in milliseconds
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  domain?: string;
  path: string;
}

export interface SessionData {
  user_id: string;
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
  private readonly maxInactivityMinutes = 120;

  /**
   * Create a new secure session
   */
  async createSession(
    user_id: string,
    req: Request,
    res: Response,
    options: Partial<SecureSessionOptions> = {}
  ): Promise<{ session_id: string; csrfToken: string }> {
    try {
      // Generate session ID and CSRF token
      const session_id = crypto.randomUUID();
      const csrfToken = encryptionService.generateSecureToken(32);
      
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
        email: undefined, // Will be filled from user data
        role: '',  // Will be filled from user data
        loginTime: new Date(),
        lastActivity: new Date(),
        ip_address,
        user_agent,
        csrfToken,
        fingerprint
      };

      // Get user data
      const userResult = await getDb()
        .select({ email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, user_id))
        .limit(1);

      const foundUser = userResult[0];
      if (foundUser) {
        sessionData.email = foundUser.email ?? undefined;
        sessionData.role = foundUser.role;
      }

      // Encrypt session data
      const encryptedSessionData = await encryptionService.encryptData(
        JSON.stringify(sessionData),
        'session'
      );

      // Store session in database
      await getDb().insert(sessions).values({
        id: session_id,
        user_id,
        expires_at: new Date(Date.now() + (options.maxAge || this.defaultOptions.maxAge)),
        metadata: { encryptedSessionData }
      });

      // Set secure cookie
      const cookieOptions = { ...this.defaultOptions, ...options };
      res.cookie('session_id', session_id, cookieOptions);
      
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
        { session_id, fingerprint }
      );

      return { session_id, csrfToken };

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
      const session_id = req.cookies?.session_id;
      const csrfToken = req.cookies?.csrfToken || req.headers['x-csrf-token'];

      if (!session_id) {
        return { isValid: false, error: 'No session ID provided' };
      }

      // Get session from database
      const sessionRecords = await getDb()
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.id, session_id),
          gt(sessions.expires_at, new Date())
        ))
        .limit(1);

      if (sessionRecords.length === 0) {
        return { isValid: false, error: 'Session not found' };
      }

      const session = sessionRecords[0];
      if (!session) {
        return { isValid: false, error: 'Session not found' };
      }

      // Check if session is expired
      if (new Date() > session.expires_at) {
        await this.invalidateSession(session_id);
        return { isValid: false, error: 'Session expired' };
      }

      // Decrypt session data
      let sessionData: SessionData;
      if (!session || !session.metadata || !session.metadata.encryptedSessionData) {
        return { isValid: false, error: 'Invalid session data structure' };
      }

      try {
        const decryptedData = await encryptionService.decryptData(session.metadata.encryptedSessionData as string);
        sessionData = JSON.parse(decryptedData);
      } catch (error) {
        await this.invalidateSession(session_id);
        return { isValid: false, error: 'Invalid session data' };
      }

      // Validate session fingerprint
      const currentFingerprint = this.createSessionFingerprint(req);
      if (sessionData.fingerprint !== currentFingerprint) {
        await this.invalidateSession(session_id);
        await securityAuditService.logSecurityEvent({
          event_type: 'session_hijack_attempt',
          severity: 'high',
          user_id: sessionData.user_id,
          ip_address: this.getClientIP(req),
          user_agent: req.get('User-Agent') || 'unknown',
          result: 'blocked',
          success: false,
          details: {
            session_id,
            expectedFingerprint: sessionData.fingerprint,
            actualFingerprint: currentFingerprint
           }
        });
        return { isValid: false, error: 'Session fingerprint mismatch' };
      }

      // Validate CSRF token for state-changing requests
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        // 4. Verify CSRF token
        if (!csrfToken || csrfToken !== sessionData.csrfToken) {
          logger.warn({ component: 'Chanuka', session_id }, 'CSRF token mismatch');
          return { isValid: false, error: 'Invalid CSRF token' };
        }
      }

      // Check for suspicious activity
      const ip_address = this.getClientIP(req);
      if (sessionData.ip_address !== ip_address) {
        await securityAuditService.logSecurityEvent({
          event_type: 'session_ip_change',
          severity: 'medium',
          user_id: sessionData.user_id,
          ip_address,
          user_agent: req.get('User-Agent') || 'unknown',
          result: 'allowed',
          success: true,
          details: {
            session_id,
            originalIP: sessionData.ip_address,
            newIP: ip_address
           }
        });
      }

      // Check for inactivity timeout
      const inactivityMinutes = (Date.now() - sessionData.lastActivity.getTime()) / (1000 * 60);
      if (inactivityMinutes > this.maxInactivityMinutes) {
        await this.invalidateSession(session_id);
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

      await getDb()
        .update(sessions)
        .set({ 
          metadata: { encryptedSessionData: updatedSessionData }, // Corrected to update metadata
          updated_at: new Date()
        })
        .where(eq(sessions.id, session_id));

      return { isValid: true, session: sessionData };

    } catch (error) {
      logger.error('Session validation failed:', { component: 'Chanuka' }, error);
      return { isValid: false, error: 'Session validation failed' };
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(session_id: string): Promise<void> {
    try {
      await getDb()
        .update(sessions)
        .set({ 
          expires_at: new Date(), // Mark as expired
          updated_at: new Date()
        })
        .where(eq(sessions.id, session_id));
    } catch (error) {
      logger.error('Session invalidation failed:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(user_id: string): Promise<void> {
    try {
      await getDb()
        .update(sessions)
        .set({ 
          expires_at: new Date(), // Mark as expired
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
      
      // Delete expired sessions entirely
      await getDb()
        .delete(sessions)
        .where(lt(sessions.expires_at, now));

      logger.info({ component: 'Chanuka' }, 'Expired sessions cleaned up');
    } catch (error) {
      logger.error('Session cleanup failed:', { component: 'Chanuka' }, error);
    }
  }

  /**
   * Clean up old sessions for a user (keep only the most recent ones)
   */
  private async cleanupUserSessions(user_id: string): Promise<void> {
    try {
      // Get all active sessions for user, ordered by creation time
      const userSessions = await getDb()
        .select()
        .from(sessions)
        .where(and(
          eq(sessions.user_id, user_id),
          gt(sessions.expires_at, new Date())
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
    const config: SecureSessionOptions = {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true, // HTTPS only
      httpOnly: true,
      sameSite: 'strict',
      path: '/'
    };
    if (process.env.DOMAIN) {
      config.domain = process.env.DOMAIN;
    }
    return config;
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
      const now = new Date();
      
      const [{ activeCount }] = await getDb()
        .select({ activeCount: count() })
        .from(sessions)
        .where(gt(sessions.expires_at, now));

      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const [{ recentCount }] = await getDb()
        .select({ recentCount: count() })
        .from(sessions)
        .where(and(
          gt(sessions.expires_at, now),
          gt(sessions.created_at, last24h)
        ));

      return {
        totalActiveSessions: activeCount,
        sessionsLast24h: recentCount,
        averageSessionDuration: 0, // Would calculate from session data
        topUserAgents: [] // Would aggregate from session data
      };
    } catch (error) {
      logger.error({ component: 'Chanuka', error: error instanceof Error ? error.message : String(error) }, 'Failed to get session stats');
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














































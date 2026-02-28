/**
 * USSD Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, securityAuditService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { withTransaction } from '@server/infrastructure/database';

export class UssdService {
  private inputSanitizer = new InputSanitizationService();

  async createSession(phoneNumber: string): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      const sanitizedPhone = this.inputSanitizer.sanitizeString(phoneNumber);

      const session = await withTransaction(async () => {
        const [newSession] = await secureQueryBuilderService
          .insert('ussd_sessions')
          .values({
            phone_number: sanitizedPhone,
            state: 'active',
            created_at: new Date(),
          })
          .returning();
        return newSession;
      });

      // Session data caching (5 minutes)
      const cacheKey = cacheKeys.entity('ussd-session', session.id);
      await cacheService.set(cacheKey, session, CACHE_TTL.SHORT);

      await securityAuditService.logSecurityEvent({
        event_type: 'ussd_session_created',
        severity: 'low',
        resource: `ussd-session:${session.id}`,
        action: 'create',
        success: true,
      });

      return session;
    }, { service: 'UssdService', operation: 'createSession' });
  }

  async getSession(sessionId: string): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      const sanitizedId = this.inputSanitizer.sanitizeString(sessionId);

      const cacheKey = cacheKeys.entity('ussd-session', sanitizedId);
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) return cached;

      const [session] = await secureQueryBuilderService
        .select()
        .from('ussd_sessions')
        .where('id', '=', sanitizedId)
        .limit(1);

      if (session) {
        await cacheService.set(cacheKey, session, CACHE_TTL.SHORT);
      }

      return session || null;
    }, { service: 'UssdService', operation: 'getSession' });
  }
}

export const ussdService = new UssdService();

/**
 * USSD Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, securityAuditService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { withTransaction } from '@server/infrastructure/database';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import {
  CreateSessionSchema,
  type CreateSessionInput,
  UpdateSessionSchema,
  type UpdateSessionInput,
  EndSessionSchema,
  type EndSessionInput,
} from './ussd-validation.schemas';

export class UssdService {
  private inputSanitizer = new InputSanitizationService();

  async createSession(input: CreateSessionInput): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      // Validate input
      const validatedInput = await validateData(CreateSessionSchema, input);
      
      const sanitizedPhone = this.inputSanitizer.sanitizeString(validatedInput.phone_number);

      const session = await withTransaction(async () => {
        const [newSession] = await secureQueryBuilderService
          .insert('ussd_sessions')
          .values({
            phone_number: sanitizedPhone,
            service_code: validatedInput.service_code,
            network_code: validatedInput.network_code,
            language: validatedInput.language,
            accessibility_mode: validatedInput.accessibility_mode,
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

  async updateSession(input: UpdateSessionInput): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      // Validate input
      const validatedInput = await validateData(UpdateSessionSchema, input);
      
      const sanitizedId = this.inputSanitizer.sanitizeString(validatedInput.session_id);
      const sanitizedInput = this.inputSanitizer.sanitizeString(validatedInput.user_input);

      const session = await withTransaction(async () => {
        const [updatedSession] = await secureQueryBuilderService
          .update('ussd_sessions')
          .set({
            current_state: validatedInput.current_state,
            user_input: sanitizedInput,
            metadata: validatedInput.metadata,
            updated_at: new Date(),
          })
          .where('id', '=', sanitizedId)
          .returning();
        return updatedSession;
      });

      // Invalidate cache
      const cacheKey = cacheKeys.entity('ussd-session', sanitizedId);
      await cacheService.delete(cacheKey);

      return session;
    }, { service: 'UssdService', operation: 'updateSession' });
  }

  async endSession(input: EndSessionInput): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      // Validate input
      const validatedInput = await validateData(EndSessionSchema, input);
      
      const sanitizedId = this.inputSanitizer.sanitizeString(validatedInput.session_id);

      const session = await withTransaction(async () => {
        const [endedSession] = await secureQueryBuilderService
          .update('ussd_sessions')
          .set({
            status: validatedInput.reason,
            final_state: validatedInput.final_state,
            ended_at: new Date(),
          })
          .where('id', '=', sanitizedId)
          .returning();
        return endedSession;
      });

      // Invalidate cache
      const cacheKey = cacheKeys.entity('ussd-session', sanitizedId);
      await cacheService.delete(cacheKey);

      await securityAuditService.logSecurityEvent({
        event_type: 'ussd_session_ended',
        severity: 'low',
        resource: `ussd-session:${sanitizedId}`,
        action: 'update',
        success: true,
      });

      return session;
    }, { service: 'UssdService', operation: 'endSession' });
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


export const ussdService = new UssdService();

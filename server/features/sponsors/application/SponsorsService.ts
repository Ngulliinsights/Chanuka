/**
 * Sponsors Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, securityAuditService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { validateData } from '@server/infrastructure/validation/validation-helpers';

export class SponsorsService {
  private inputSanitizer = new InputSanitizationService();

  async getSponsorConflicts(billId: string): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      const sanitizedBillId = this.inputSanitizer.sanitizeString(billId);

      // 1-hour cache (sponsor data is stable)
      const cacheKey = cacheKeys.entity('sponsor-conflicts', sanitizedBillId);
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) return cached;

      const conflicts = await secureQueryBuilderService
        .select()
        .from('sponsor_conflicts')
        .where('bill_id', '=', sanitizedBillId);

      await cacheService.set(cacheKey, conflicts, CACHE_TTL.SPONSORS);
      
      await securityAuditService.logSecurityEvent({
        event_type: 'sponsor_conflicts_accessed',
        severity: 'medium',
        resource: `bill:${sanitizedBillId}`,
        action: 'read',
        success: true,
      });

      return conflicts;
    }, { service: 'SponsorsService', operation: 'getSponsorConflicts' });
  }
}

export const sponsorsService = new SponsorsService();

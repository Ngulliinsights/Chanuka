/**
 * Enhanced Constitutional Intelligence Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, securityAuditService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';

export class EnhancedConstitutionalIntelligenceService {
  private inputSanitizer = new InputSanitizationService();

  async analyzeConstitutionality(billId: string): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      const sanitizedBillId = this.inputSanitizer.sanitizeString(billId);

      // Legal analysis caching (1 hour)
      const cacheKey = cacheKeys.entity('constitutional-analysis', sanitizedBillId);
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) return cached;

      const analysis = await secureQueryBuilderService
        .select()
        .from('constitutional_analyses')
        .where('bill_id', '=', sanitizedBillId)
        .limit(1);

      const result = analysis[0] || { bill_id: sanitizedBillId, is_constitutional: true, concerns: [] };
      await cacheService.set(cacheKey, result, CACHE_TTL.HOUR);

      // High-severity logging for constitutional analysis
      await securityAuditService.logSecurityEvent({
        event_type: 'constitutional_analysis_accessed',
        severity: 'high',
        resource: `bill:${sanitizedBillId}`,
        action: 'read',
        success: true,
      });

      return result;
    }, { service: 'EnhancedConstitutionalIntelligenceService', operation: 'analyzeConstitutionality' });
  }
}

export const enhancedConstitutionalIntelligenceService = new EnhancedConstitutionalIntelligenceService();

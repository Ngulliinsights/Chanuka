/**
 * Enhanced Argument Intelligence Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';

export class EnhancedArgumentIntelligenceService {
  private inputSanitizer = new InputSanitizationService();

  async analyzeArguments(billId: string): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      const sanitizedBillId = this.inputSanitizer.sanitizeString(billId);

      // Analysis result caching (15 minutes)
      const cacheKey = cacheKeys.entity('argument-analysis', sanitizedBillId);
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) return cached;

      const analysis = await secureQueryBuilderService
        .select()
        .from('argument_analyses')
        .where('bill_id', '=', sanitizedBillId)
        .limit(1);

      const result = analysis[0] || { bill_id: sanitizedBillId, arguments: [] };
      await cacheService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    }, { service: 'EnhancedArgumentIntelligenceService', operation: 'analyzeArguments' });
  }
}

export const enhancedArgumentIntelligenceService = new EnhancedArgumentIntelligenceService();

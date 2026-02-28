/**
 * Enhanced Pretext Detection Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';

export class PretextService {
  private inputSanitizer = new InputSanitizationService();

  async detectPretext(billId: string): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      const sanitizedBillId = this.inputSanitizer.sanitizeString(billId);

      // ML result caching (15 minutes)
      const cacheKey = cacheKeys.entity('pretext-detection', sanitizedBillId);
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) return cached;

      const detection = await secureQueryBuilderService
        .select()
        .from('pretext_detections')
        .where('bill_id', '=', sanitizedBillId)
        .limit(1);

      const result = detection[0] || { bill_id: sanitizedBillId, has_pretext: false, confidence: 0 };
      await cacheService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    }, { service: 'PretextService', operation: 'detectPretext' });
  }
}

export const pretextService = new PretextService();

/**
 * Enhanced Government Data Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';

export class EnhancedGovernmentDataService {
  private inputSanitizer = new InputSanitizationService();

  async getGovernmentData(dataType: string, filters?: any): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      const sanitizedType = this.inputSanitizer.sanitizeString(dataType);

      // Aggressive caching for external API data (1 hour)
      const cacheKey = cacheKeys.entity('government-data', sanitizedType);
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) return cached;

      const data = await secureQueryBuilderService
        .select()
        .from('government_data')
        .where('data_type', '=', sanitizedType)
        .limit(100);

      // Long cache for stable external data
      await cacheService.set(cacheKey, data, CACHE_TTL.GOVERNMENT_DATA);
      return data;
    }, { service: 'EnhancedGovernmentDataService', operation: 'getGovernmentData' });
  }
}

export const enhancedGovernmentDataService = new EnhancedGovernmentDataService();

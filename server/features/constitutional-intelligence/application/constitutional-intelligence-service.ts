/**
 * Constitutional Intelligence Service - Complete Infrastructure Integration
 */

import { safeAsync } from '@server/infrastructure/error-handling/result-types';
import { inputSanitizationService, securityAuditService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { readDatabase } from '@server/infrastructure/database';
import * as schema from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';

export class ConstitutionalIntelligenceService {
  async analyzeConstitutionality(billId: string) {
    return safeAsync(async () => {
      const sanitizedBillId = inputSanitizationService.sanitizeString(billId);

      // Legal analysis caching (1 hour)
      const cacheKey = typeof cacheKeys !== 'undefined' && cacheKeys.entity 
        ? cacheKeys.entity('constitutional-analysis', sanitizedBillId) 
        : `constitutional-analysis:${sanitizedBillId}`;
        
      if (typeof cacheService !== 'undefined') {
        const cached = await cacheService.get<any>(cacheKey);
        if (cached) return cached;
      }

      const analysis = await readDatabase
        .select()
        .from(schema.constitutional_analyses)
        .where(eq(schema.constitutional_analyses.bill_id, sanitizedBillId))
        .limit(1);

      const result = analysis[0] || { bill_id: sanitizedBillId, is_constitutional: true, concerns: [] };
      
      if (typeof cacheService !== 'undefined') {
        const ttl = typeof CACHE_TTL !== 'undefined' ? CACHE_TTL.HOUR : 3600;
        await cacheService.set(cacheKey, result, ttl);
      }

      // High-severity logging for constitutional analysis
      if (typeof securityAuditService.logSecurityEvent === 'function') {
        await securityAuditService.logSecurityEvent({
          event_type: 'constitutional_analysis_accessed',
          severity: 'high',
          resource: `bill:${sanitizedBillId}`,
          action: 'read',
          success: true,
        });
      } else {
        // @ts-expect-error
        await securityAuditService.log({
          user_id: 'system',
          event_type: 'constitutional_analysis_accessed',
          severity: 'high',
          resource: `bill:${sanitizedBillId}`,
          action: 'read',
          details: { success: true } as unknown as Record<string, unknown>,
          ip_address: 'system',
          user_agent: 'constitutional_intelligence'
        });
      }

      return result;
    }, { service: 'ConstitutionalIntelligenceService', operation: 'analyzeConstitutionality' });
  }
}

export const constitutionalIntelligenceService = new ConstitutionalIntelligenceService();

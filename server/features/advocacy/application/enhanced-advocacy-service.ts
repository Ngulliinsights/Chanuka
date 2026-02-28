/**
 * Enhanced Advocacy Service - Complete Infrastructure Integration
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, securityAuditService, secureQueryBuilderService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { withTransaction } from '@server/infrastructure/database';

export class EnhancedAdvocacyService {
  private inputSanitizer = new InputSanitizationService();

  async createCampaign(data: any, userId: string): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      const sanitizedTitle = this.inputSanitizer.sanitizeString(data.title);
      const sanitizedDescription = this.inputSanitizer.sanitizeHtml(data.description);

      const campaign = await withTransaction(async () => {
        const [newCampaign] = await secureQueryBuilderService
          .insert('advocacy_campaigns')
          .values({
            title: sanitizedTitle,
            description: sanitizedDescription,
            creator_id: userId,
            created_at: new Date(),
          })
          .returning();
        return newCampaign;
      });

      await securityAuditService.logSecurityEvent({
        event_type: 'campaign_created',
        severity: 'medium',
        user_id: userId,
        resource: `campaign:${campaign.id}`,
        action: 'create',
        success: true,
      });

      return campaign;
    }, { service: 'EnhancedAdvocacyService', operation: 'createCampaign' });
  }

  async getCampaigns(): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      const cacheKey = cacheKeys.list('advocacy-campaigns', {});
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) return cached;

      const campaigns = await secureQueryBuilderService
        .select()
        .from('advocacy_campaigns')
        .orderBy('created_at', 'desc')
        .limit(20);

      await cacheService.set(cacheKey, campaigns, CACHE_TTL.HALF_HOUR);
      return campaigns;
    }, { service: 'EnhancedAdvocacyService', operation: 'getCampaigns' });
  }
}

export const enhancedAdvocacyService = new EnhancedAdvocacyService();

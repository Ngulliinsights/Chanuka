/**
 * Sponsors Service — Complete Infrastructure Integration
 *
 * Exposes sponsor conflict and network queries through a consistent
 * service interface that honours the platform's error-handling and
 * caching conventions.
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { InputSanitizationService, securityAuditService } from '@server/features/security';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { readDatabase } from '@server/infrastructure/database';
import { sql } from 'drizzle-orm';

import { getNeo4jDriver } from '@server/infrastructure/database/graph/core/sync-executor';
import { discoverInfluenceNetwork } from '@server/infrastructure/database/graph/analytics/network-discovery';

export class SponsorsService {
  private inputSanitizer = new InputSanitizationService();

  /**
   * Retrieves conflict-of-interest records for a specific bill.
   *
   * Uses a 1-hour cache TTL since sponsor conflicts are relatively stable
   * data that only changes when financial disclosures are updated.
   */
  async getSponsorConflicts(billId: string): Promise<AsyncServiceResult<unknown[]>> {
    return safeAsync(async () => {
      const sanitizedBillId = this.inputSanitizer.sanitizeString(billId);

      // 1-hour cache (sponsor data is stable)
      const cacheKey = cacheKeys.entity('sponsor-conflicts', sanitizedBillId);
      const cached = await cacheService.get<unknown[]>(cacheKey);
      if (cached) return cached;

      // Use parameterised query to prevent SQL injection
      const conflictsResult = (await (readDatabase.execute as (...args: unknown[]) => Promise<unknown>)(
        sql`SELECT * FROM sponsor_conflicts WHERE bill_id = ${sanitizedBillId}`
      )) as { rows?: unknown[] };
      const conflicts = conflictsResult.rows ?? (conflictsResult as unknown as unknown[]);

      await cacheService.set(cacheKey, conflicts, CACHE_TTL.HOUR);

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

  /**
   * Retrieves the influence network for a specific sponsor from the
   * Neo4j graph database. Degrades gracefully when Neo4j is unavailable.
   */
  async getSponsorNetwork(sponsorId: string): Promise<AsyncServiceResult<unknown>> {
    return safeAsync(async () => {
      const sanitizedId = this.inputSanitizer.sanitizeString(sponsorId);
      const cacheKey = cacheKeys.entity('sponsor-network', sanitizedId);
      const cached = await cacheService.get<unknown>(cacheKey);
      if (cached) return cached;

      const driver = getNeo4jDriver();
      if (!driver) {
        throw new Error('Graph database unavailable for network visualization');
      }

      const network = await discoverInfluenceNetwork(driver, sanitizedId);
      await cacheService.set(cacheKey, network, CACHE_TTL.HOUR);
      return network;
    }, { service: 'SponsorsService', operation: 'getSponsorNetwork' });
  }
}

export const sponsorsService = new SponsorsService();

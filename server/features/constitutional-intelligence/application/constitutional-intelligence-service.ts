/**
 * Constitutional Intelligence Service
 *
 * Read and audit layer. Resolves analyses through ConstitutionalService first
 * (cache), then falls back to the database for records that predate the cache
 * or survived a flush. Emits a security audit event on every access.
 */

import { inputSanitizationService, securityAuditService } from '@server/features/security';
import { readDatabase } from '@server/infrastructure/database';
import { safeAsync } from '@server/infrastructure/error-handling/result-types';
import { constitutional_analyses } from '@server/infrastructure/schema/constitutional_intelligence';
import { eq } from 'drizzle-orm';

import { constitutionalService, type ConstitutionalServiceResult } from './constitutional-service';

type StoredAnalysis = typeof constitutional_analyses.$inferSelect;

export class ConstitutionalIntelligenceService {
  async analyzeConstitutionality(billId: string): Promise<ConstitutionalServiceResult | StoredAnalysis | null> {
    const result = await safeAsync(async () => {
      const sanitizedBillId = inputSanitizationService.sanitizeString(billId);

      // Primary path: resolve through the service layer (cache-backed).
      const cached = await constitutionalService.getAnalysis(sanitizedBillId);

      // Fallback path: database for records that predate or outlived the cache.
      const analysis: ConstitutionalServiceResult | StoredAnalysis | null = cached ?? await this.fetchFromDatabase(sanitizedBillId);

      await securityAuditService.logSecurityEvent({
        event_type: 'constitutional_analysis_accessed',
        severity: 'high',
        resource: `bill:${sanitizedBillId}`,
        action: 'read',
        success: true,
      });

      return analysis;
    }, { service: 'ConstitutionalIntelligenceService', operation: 'analyzeConstitutionality' });

    // Unwrap the Result type - return the value or null on error
    return result.isOk() ? result.value : null;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private async fetchFromDatabase(billId: string): Promise<StoredAnalysis | null> {
    const [row] = await readDatabase
      .select()
      .from(constitutional_analyses)
      .where(eq(constitutional_analyses.bill_id, billId))
      .limit(1);

    return row ?? null;
  }
}

export const constitutionalIntelligenceService = new ConstitutionalIntelligenceService();
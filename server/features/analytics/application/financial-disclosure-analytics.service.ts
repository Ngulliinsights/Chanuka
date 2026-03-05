/**
 * Financial Disclosure Analytics Service - Modernized
 * 
 * Provides financial disclosure analytics with modern infrastructure.
 * Uses Repository pattern, error handling, validation, and caching.
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { logger } from '@server/infrastructure/observability';
import { InputSanitizationService, securityAuditService } from '@server/features/security';
import { 
  financialDisclosureRepository,
  type FinancialDisclosureSummary 
} from '../infrastructure/repositories/financial-disclosure.repository';
import {
  GetDisclosuresBySponsorSchema,
  GetDisclosuresByBillSchema,
  CreateDisclosureSchema,
  GetDisclosureSummarySchema,
  GetHighValueDisclosuresSchema,
  type GetDisclosuresBySponsorInput,
  type GetDisclosuresByBillInput,
  type CreateDisclosureInput,
  type GetDisclosureSummaryInput,
  type GetHighValueDisclosuresInput,
} from './financial-disclosure-validation.schemas';

/**
 * Modernized Financial Disclosure Analytics Service
 * 
 * @example
 * ```typescript
 * const service = new FinancialDisclosureAnalyticsService();
 * 
 * // Get disclosures by sponsor
 * const result = await service.getDisclosuresBySponsor({
 *   sponsor_id: 'sponsor-123',
 *   min_amount: 10000
 * });
 * 
 * if (result.isOk) {
 *   console.log('Disclosures:', result.value);
 * }
 * ```
 */
export class FinancialDisclosureAnalyticsService {
  private readonly inputSanitizer = new InputSanitizationService();

  /**
   * Get financial disclosures by sponsor
   */
  async getDisclosuresBySponsor(
    input: GetDisclosuresBySponsorInput
  ): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(GetDisclosuresBySponsorSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { sponsor_id, start_date, end_date, min_amount, limit, offset } = validation.data!;
      const sanitizedSponsorId = this.inputSanitizer.sanitizeString(sponsor_id);

      logger.info({ sponsor_id: sanitizedSponsorId }, 'Getting disclosures by sponsor');

      // Use repository
      const disclosuresResult = await financialDisclosureRepository.getDisclosuresBySponsor(
        sanitizedSponsorId,
        {
          startDate: start_date ? new Date(start_date) : undefined,
          endDate: end_date ? new Date(end_date) : undefined,
          minAmount: min_amount,
          limit,
          offset,
        }
      );

      if (disclosuresResult.isErr) {
        throw disclosuresResult.error;
      }

      // Security audit
      await securityAuditService.logSecurityEvent({
        event_type: 'financial_disclosure_accessed',
        severity: 'low',
        user_id: undefined,
        ip_address: 'internal',
        user_agent: 'financial-disclosure-service',
        resource: `financial-disclosure:sponsor:${sanitizedSponsorId}`,
        action: 'read',
        success: true,
      });

      return disclosuresResult.value;
    }, { service: 'FinancialDisclosureAnalyticsService', operation: 'getDisclosuresBySponsor' });
  }

  /**
   * Get financial disclosures by bill
   */
  async getDisclosuresByBill(
    input: GetDisclosuresByBillInput
  ): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(GetDisclosuresByBillSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { bill_id, min_amount, limit, offset } = validation.data!;
      const sanitizedBillId = this.inputSanitizer.sanitizeString(bill_id);

      logger.info({ bill_id: sanitizedBillId }, 'Getting disclosures by bill');

      // Use repository
      const disclosuresResult = await financialDisclosureRepository.getDisclosuresByBill(
        sanitizedBillId,
        {
          minAmount: min_amount,
          limit,
          offset,
        }
      );

      if (disclosuresResult.isErr) {
        throw disclosuresResult.error;
      }

      // Security audit
      await securityAuditService.logSecurityEvent({
        event_type: 'financial_disclosure_accessed',
        severity: 'low',
        user_id: undefined,
        ip_address: 'internal',
        user_agent: 'financial-disclosure-service',
        resource: `financial-disclosure:bill:${sanitizedBillId}`,
        action: 'read',
        success: true,
      });

      return disclosuresResult.value;
    }, { service: 'FinancialDisclosureAnalyticsService', operation: 'getDisclosuresByBill' });
  }

  /**
   * Get disclosure summary for a sponsor
   */
  async getDisclosureSummary(
    input: GetDisclosureSummaryInput
  ): Promise<AsyncServiceResult<FinancialDisclosureSummary>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(GetDisclosureSummarySchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { sponsor_id } = validation.data!;
      const sanitizedSponsorId = this.inputSanitizer.sanitizeString(sponsor_id);

      logger.info({ sponsor_id: sanitizedSponsorId }, 'Getting disclosure summary');

      // Use repository
      const summaryResult = await financialDisclosureRepository.getDisclosureSummary(
        sanitizedSponsorId
      );

      if (summaryResult.isErr) {
        throw summaryResult.error;
      }

      return summaryResult.value;
    }, { service: 'FinancialDisclosureAnalyticsService', operation: 'getDisclosureSummary' });
  }

  /**
   * Create financial disclosure
   */
  async createDisclosure(
    input: CreateDisclosureInput,
    userId?: string
  ): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(CreateDisclosureSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { sponsor_id, bill_id, amount, disclosure_type, description } = validation.data!;
      const sanitizedSponsorId = this.inputSanitizer.sanitizeString(sponsor_id);
      const sanitizedBillId = bill_id ? this.inputSanitizer.sanitizeString(bill_id) : undefined;

      logger.info(
        { sponsor_id: sanitizedSponsorId, bill_id: sanitizedBillId, amount },
        'Creating financial disclosure'
      );

      // Create disclosure
      const createResult = await financialDisclosureRepository.create({
        sponsor_id: sanitizedSponsorId,
        bill_id: sanitizedBillId,
        amount,
        disclosure_type,
        description: description ? this.inputSanitizer.sanitizeHtml(description) : undefined,
        disclosure_date: new Date(),
      });

      if (createResult.isErr) {
        throw createResult.error;
      }

      // Security audit
      await securityAuditService.logSecurityEvent({
        event_type: 'financial_disclosure_created',
        severity: 'medium',
        user_id: userId,
        ip_address: 'internal',
        user_agent: 'financial-disclosure-service',
        resource: `financial-disclosure:${createResult.value.id}`,
        action: 'create',
        success: true,
        details: {
          sponsor_id: sanitizedSponsorId,
          amount,
          disclosure_type,
        },
      });

      return createResult.value;
    }, { service: 'FinancialDisclosureAnalyticsService', operation: 'createDisclosure' });
  }

  /**
   * Get high-value disclosures
   */
  async getHighValueDisclosures(
    input: GetHighValueDisclosuresInput
  ): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      // Validate input
      const validation = await validateData(GetHighValueDisclosuresSchema, input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors?.map(e => e.message).join(', ')}`);
      }

      const { min_amount, limit } = validation.data!;

      logger.info({ min_amount, limit }, 'Getting high-value disclosures');

      // Use repository
      const disclosuresResult = await financialDisclosureRepository.getHighValueDisclosures(
        min_amount || 100000,
        limit || 50
      );

      if (disclosuresResult.isErr) {
        throw disclosuresResult.error;
      }

      return disclosuresResult.value;
    }, { service: 'FinancialDisclosureAnalyticsService', operation: 'getHighValueDisclosures' });
  }

  /**
   * Get recent disclosures
   */
  async getRecentDisclosures(
    limit: number = 20
  ): Promise<AsyncServiceResult<any[]>> {
    return safeAsync(async () => {
      logger.info({ limit }, 'Getting recent disclosures');

      // Use repository
      const disclosuresResult = await financialDisclosureRepository.getRecentDisclosures(limit);

      if (disclosuresResult.isErr) {
        throw disclosuresResult.error;
      }

      return disclosuresResult.value;
    }, { service: 'FinancialDisclosureAnalyticsService', operation: 'getRecentDisclosures' });
  }
}

export const financialDisclosureAnalyticsService = new FinancialDisclosureAnalyticsService();

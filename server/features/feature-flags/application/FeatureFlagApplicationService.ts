/**
 * Feature Flag Application Service
 * Modernized with validation schemas and Result types
 */

import { safeAsync, AsyncServiceResult } from '@server/infrastructure/error-handling';
import { validateData } from '@server/infrastructure/validation/validation-helpers';
import { logger } from '@server/infrastructure/observability';
import { cacheService, cacheKeys, CACHE_TTL } from '@server/infrastructure/cache';
import { FeatureFlagService } from '../domain/service';
import {
  CreateFlagSchema,
  UpdateFlagSchema,
  GetFlagSchema,
  DeleteFlagSchema,
  ToggleFlagSchema,
  UpdateRolloutSchema,
  IsEnabledSchema,
  GetAnalyticsSchema,
  type CreateFlagInput,
  type UpdateFlagInput,
  type GetFlagInput,
  type DeleteFlagInput,
  type ToggleFlagInput,
  type UpdateRolloutInput,
  type IsEnabledInput,
  type GetAnalyticsInput,
} from './feature-flag-validation.schemas';
import type { FeatureFlagConfig, FlagEvaluationResult } from '../domain/types';

export class FeatureFlagApplicationService {
  constructor(private domainService: FeatureFlagService = new FeatureFlagService()) {}

  // ============================================================================
  // FLAG MANAGEMENT
  // ============================================================================

  async createFlag(input: CreateFlagInput): Promise<AsyncServiceResult<FeatureFlagConfig>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(CreateFlagSchema, input);
      
      const flag = await this.domainService.createFlag(validatedInput);
      
      // Invalidate cache
      await cacheService.delete(cacheKeys.list('feature-flags'));
      
      return flag;
    }, { service: 'FeatureFlagApplicationService', operation: 'createFlag' });
  }

  async getFlag(input: GetFlagInput): Promise<AsyncServiceResult<FeatureFlagConfig | null>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(GetFlagSchema, input);
      
      // Check cache
      const cacheKey = cacheKeys.entity('feature-flag', validatedInput.flagName);
      const cached = await cacheService.get<FeatureFlagConfig>(cacheKey);
      if (cached) return cached;
      
      const flag = await this.domainService.getFlag(validatedInput.flagName);
      
      if (flag) {
        // Cache for 15 minutes
        await cacheService.set(cacheKey, flag, CACHE_TTL.MEDIUM);
      }
      
      return flag;
    }, { service: 'FeatureFlagApplicationService', operation: 'getFlag' });
  }

  async getAllFlags(): Promise<AsyncServiceResult<FeatureFlagConfig[]>> {
    return safeAsync(async () => {
      // Check cache
      const cacheKey = cacheKeys.list('feature-flags');
      const cached = await cacheService.get<FeatureFlagConfig[]>(cacheKey);
      if (cached) return cached;
      
      const flags = await this.domainService.getAllFlags();
      
      // Cache for 15 minutes
      await cacheService.set(cacheKey, flags, CACHE_TTL.MEDIUM);
      
      return flags;
    }, { service: 'FeatureFlagApplicationService', operation: 'getAllFlags' });
  }

  async updateFlag(
    flagName: string,
    input: UpdateFlagInput
  ): Promise<AsyncServiceResult<FeatureFlagConfig | null>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(UpdateFlagSchema, input);
      
      const flag = await this.domainService.updateFlag(flagName, validatedInput);
      
      if (flag) {
        // Invalidate caches
        await Promise.all([
          cacheService.delete(cacheKeys.entity('feature-flag', flagName)),
          cacheService.delete(cacheKeys.list('feature-flags')),
        ]);
      }
      
      return flag;
    }, { service: 'FeatureFlagApplicationService', operation: 'updateFlag' });
  }

  async deleteFlag(input: DeleteFlagInput): Promise<AsyncServiceResult<boolean>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(DeleteFlagSchema, input);
      
      const deleted = await this.domainService.deleteFlag(validatedInput.flagName);
      
      if (deleted) {
        // Invalidate caches
        await Promise.all([
          cacheService.delete(cacheKeys.entity('feature-flag', validatedInput.flagName)),
          cacheService.delete(cacheKeys.list('feature-flags')),
        ]);
      }
      
      return deleted;
    }, { service: 'FeatureFlagApplicationService', operation: 'deleteFlag' });
  }

  async toggleFlag(input: ToggleFlagInput): Promise<AsyncServiceResult<FeatureFlagConfig | null>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(ToggleFlagSchema, input);
      
      const flag = await this.domainService.toggleFlag(
        validatedInput.flagName,
        validatedInput.enabled
      );
      
      if (flag) {
        // Invalidate caches
        await Promise.all([
          cacheService.delete(cacheKeys.entity('feature-flag', validatedInput.flagName)),
          cacheService.delete(cacheKeys.list('feature-flags')),
        ]);
      }
      
      return flag;
    }, { service: 'FeatureFlagApplicationService', operation: 'toggleFlag' });
  }

  async updateRolloutPercentage(
    input: UpdateRolloutInput
  ): Promise<AsyncServiceResult<FeatureFlagConfig | null>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(UpdateRolloutSchema, input);
      
      const flag = await this.domainService.updateRolloutPercentage(
        validatedInput.flagName,
        validatedInput.percentage
      );
      
      if (flag) {
        // Invalidate caches
        await Promise.all([
          cacheService.delete(cacheKeys.entity('feature-flag', validatedInput.flagName)),
          cacheService.delete(cacheKeys.list('feature-flags')),
        ]);
      }
      
      return flag;
    }, { service: 'FeatureFlagApplicationService', operation: 'updateRolloutPercentage' });
  }

  // ============================================================================
  // FLAG EVALUATION
  // ============================================================================

  async isEnabled(input: IsEnabledInput): Promise<AsyncServiceResult<FlagEvaluationResult>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(IsEnabledSchema, input);
      
      // Note: Evaluation results are NOT cached as they depend on user context
      const result = await this.domainService.isEnabled(
        validatedInput.flagName,
        validatedInput.context
      );
      
      return result;
    }, { service: 'FeatureFlagApplicationService', operation: 'isEnabled' });
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  async getAnalytics(input: GetAnalyticsInput): Promise<AsyncServiceResult<any>> {
    return safeAsync(async () => {
      const validatedInput = await validateData(GetAnalyticsSchema, input);
      
      // Check cache (analytics can be cached for a short time)
      const cacheKey = cacheKeys.query('feature-flag-analytics', {
        flag: validatedInput.flagName,
        start: validatedInput.startDate?.toISOString(),
        end: validatedInput.endDate?.toISOString(),
      });
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) return cached;
      
      const analytics = await this.domainService.getAnalytics(
        validatedInput.flagName,
        validatedInput.startDate,
        validatedInput.endDate
      );
      
      if (analytics) {
        // Cache for 5 minutes
        await cacheService.set(cacheKey, analytics, CACHE_TTL.SHORT);
      }
      
      return analytics;
    }, { service: 'FeatureFlagApplicationService', operation: 'getAnalytics' });
  }
}

export const featureFlagApplicationService = new FeatureFlagApplicationService();

// ============================================================================
// FEATURE FLAGS SERVICE - Unit Tests
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeatureFlagService } from '../domain/service';
import { FeatureFlagRepository } from '../infrastructure/repository';
import type { FeatureFlag } from '@server/infrastructure/schema';

// Mock the repository
vi.mock('../infrastructure/repository');

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let mockRepository: any;

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findByName: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      recordEvaluation: vi.fn(),
      getEvaluations: vi.fn(),
      getMetrics: vi.fn()
    };

    service = new FeatureFlagService(mockRepository);
  });

  describe('createFlag', () => {
    it('should create a new feature flag', async () => {
      const mockFlag: FeatureFlag = {
        id: '123',
        name: 'test-flag',
        description: 'Test flag',
        enabled: true,
        rollout_percentage: 50,
        user_targeting: null,
        ab_test_config: null,
        dependencies: [],
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null
      };

      mockRepository.create.mockResolvedValue(mockFlag);

      const result = await service.createFlag({
        name: 'test-flag',
        description: 'Test flag',
        enabled: true,
        rolloutPercentage: 50
      });

      expect(result.name).toBe('test-flag');
      expect(result.enabled).toBe(true);
      expect(result.rolloutPercentage).toBe(50);
      expect(mockRepository.create).toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    it('should return false for non-existent flag', async () => {
      mockRepository.findByName.mockResolvedValue(undefined);

      const result = await service.isEnabled('non-existent');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('Flag not found');
    });

    it('should return false for disabled flag', async () => {
      const mockFlag: FeatureFlag = {
        id: '123',
        name: 'test-flag',
        description: null,
        enabled: false,
        rollout_percentage: 100,
        user_targeting: null,
        ab_test_config: null,
        dependencies: [],
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null
      };

      mockRepository.findByName.mockResolvedValue(mockFlag);
      mockRepository.recordEvaluation.mockResolvedValue({});

      const result = await service.isEnabled('test-flag');

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('Flag is disabled');
    });

    it('should return true for 100% rollout', async () => {
      const mockFlag: FeatureFlag = {
        id: '123',
        name: 'test-flag',
        description: null,
        enabled: true,
        rollout_percentage: 100,
        user_targeting: null,
        ab_test_config: null,
        dependencies: [],
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null
      };

      mockRepository.findByName.mockResolvedValue(mockFlag);
      mockRepository.recordEvaluation.mockResolvedValue({});

      const result = await service.isEnabled('test-flag', { userId: 'user-123' });

      expect(result.enabled).toBe(true);
      expect(result.reason).toContain('100%');
    });

    it('should respect user include list', async () => {
      const mockFlag: FeatureFlag = {
        id: '123',
        name: 'test-flag',
        description: null,
        enabled: true,
        rollout_percentage: 0,
        user_targeting: {
          include: ['user-123']
        },
        ab_test_config: null,
        dependencies: [],
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null
      };

      mockRepository.findByName.mockResolvedValue(mockFlag);
      mockRepository.recordEvaluation.mockResolvedValue({});

      const result = await service.isEnabled('test-flag', { userId: 'user-123' });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('User in include list');
    });

    it('should respect user exclude list', async () => {
      const mockFlag: FeatureFlag = {
        id: '123',
        name: 'test-flag',
        description: null,
        enabled: true,
        rollout_percentage: 100,
        user_targeting: {
          exclude: ['user-123']
        },
        ab_test_config: null,
        dependencies: [],
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null
      };

      mockRepository.findByName.mockResolvedValue(mockFlag);
      mockRepository.recordEvaluation.mockResolvedValue({});

      const result = await service.isEnabled('test-flag', { userId: 'user-123' });

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('User in exclude list');
    });

    it('should handle A/B test variants', async () => {
      const mockFlag: FeatureFlag = {
        id: '123',
        name: 'test-flag',
        description: null,
        enabled: true,
        rollout_percentage: 100,
        user_targeting: null,
        ab_test_config: {
          variants: ['control', 'variant-a', 'variant-b'],
          distribution: [33, 33, 34],
          metrics: ['conversion']
        },
        dependencies: [],
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null
      };

      mockRepository.findByName.mockResolvedValue(mockFlag);
      mockRepository.recordEvaluation.mockResolvedValue({});

      const result = await service.isEnabled('test-flag', { userId: 'user-123' });

      expect(result.variant).toBeDefined();
      expect(['control', 'variant-a', 'variant-b']).toContain(result.variant);
    });
  });

  describe('updateRolloutPercentage', () => {
    it('should update rollout percentage', async () => {
      const mockFlag: FeatureFlag = {
        id: '123',
        name: 'test-flag',
        description: null,
        enabled: true,
        rollout_percentage: 50,
        user_targeting: null,
        ab_test_config: null,
        dependencies: [],
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null
      };

      const updatedFlag = { ...mockFlag, rollout_percentage: 75 };

      mockRepository.findByName.mockResolvedValue(mockFlag);
      mockRepository.update.mockResolvedValue(updatedFlag);

      const result = await service.updateRolloutPercentage('test-flag', 75);

      expect(result?.rolloutPercentage).toBe(75);
    });

    it('should reject invalid percentage', async () => {
      await expect(
        service.updateRolloutPercentage('test-flag', 150)
      ).rejects.toThrow('Rollout percentage must be between 0 and 100');

      await expect(
        service.updateRolloutPercentage('test-flag', -10)
      ).rejects.toThrow('Rollout percentage must be between 0 and 100');
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics for a flag', async () => {
      const mockFlag: FeatureFlag = {
        id: '123',
        name: 'test-flag',
        description: null,
        enabled: true,
        rollout_percentage: 50,
        user_targeting: null,
        ab_test_config: null,
        dependencies: [],
        metadata: null,
        created_at: new Date(),
        updated_at: new Date(),
        updated_by: null
      };

      const mockEvaluations = [
        { flag_id: '123', user_id: 'user-1', enabled: true, variant: null, evaluated_at: new Date() },
        { flag_id: '123', user_id: 'user-2', enabled: false, variant: null, evaluated_at: new Date() },
        { flag_id: '123', user_id: 'user-3', enabled: true, variant: null, evaluated_at: new Date() }
      ];

      mockRepository.findByName.mockResolvedValue(mockFlag);
      mockRepository.getMetrics.mockResolvedValue([]);
      mockRepository.getEvaluations.mockResolvedValue(mockEvaluations);

      const result = await service.getAnalytics('test-flag');

      expect(result).toBeDefined();
      expect(result?.totalEvaluations).toBe(3);
      expect(result?.enabledCount).toBe(2);
      expect(result?.disabledCount).toBe(1);
      expect(result?.enabledPercentage).toBeCloseTo(66.67, 1);
    });
  });
});

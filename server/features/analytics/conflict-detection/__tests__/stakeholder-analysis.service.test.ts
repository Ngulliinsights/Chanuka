/**
 * Unit tests for StakeholderAnalysisService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StakeholderAnalysisService } from '../stakeholder-analysis.service.js';
import { Stakeholder } from '../types.js';

// Mock database
vi.mock('../../../../shared/database/connection', () => ({
  database: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockResolvedValue([])
  }
}));

// Mock shared cache service
vi.mock('../../../../shared/core/src/caching/index.js', () => ({
  getDefaultCache: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn()
  }))
}));

// Mock logger
vi.mock('../../../../shared/core/index.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
}));

describe('StakeholderAnalysisService', () => {
  let service: StakeholderAnalysisService;

  beforeEach(() => {
    service = StakeholderAnalysisService.getInstance();
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    const service1 = StakeholderAnalysisService.getInstance();
    const service2 = StakeholderAnalysisService.getInstance();
    expect(service1).toBe(service2);
  });

  describe('identifyStakeholders', () => {
    const mockBill = {
      id: 123,
      title: 'Healthcare Reform Act',
      summary: 'This bill affects Kenya Medical Association and pharmaceutical companies',
      category: 'Healthcare'
    };

    it('should identify stakeholders from bill content', async () => {
      const { getDefaultCache } = await import('../../../../shared/core/src/caching/index.js');
      const mockCache = vi.mocked(getDefaultCache)();
      vi.mocked(mockCache.get).mockResolvedValue(null);

      const stakeholders = await service.identifyStakeholders(mockBill);

      expect(stakeholders).toBeInstanceOf(Array);
      expect(stakeholders.length).toBeGreaterThan(0);

      // Should identify organizations mentioned in summary
      const orgStakeholder = stakeholders.find(s => s.type === 'organization');
      expect(orgStakeholder).toBeDefined();

      // Should identify affected industries
      const industryStakeholder = stakeholders.find(s => s.type === 'industry');
      expect(industryStakeholder).toBeDefined();
    });

    it('should use cached results when available', async () => {
      const { getDefaultCache } = await import('../../../../shared/core/src/caching/index.js');
      const mockCache = vi.mocked(getDefaultCache)();
      const cachedStakeholders = [
        {
          id: 'cached_stakeholder',
          name: 'Cached Stakeholder',
          type: 'organization' as const,
          interests: [],
          influence: 0.5,
          transparency: 0.5
        }
      ];

      vi.mocked(mockCache.get).mockResolvedValue(cachedStakeholders);

      const stakeholders = await service.identifyStakeholders(mockBill);

      expect(stakeholders).toBe(cachedStakeholders);
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should handle bills with minimal content', async () => {
      const minimalBill = {
        id: 456,
        title: 'Simple Bill',
        summary: '',
        category: 'General'
      };

      const stakeholders = await service.identifyStakeholders(minimalBill);

      expect(stakeholders).toBeInstanceOf(Array);
      // Should still return some stakeholders even with minimal content
    });
  });

  describe('analyzeStakeholderInterests', () => {
    const mockStakeholders: Stakeholder[] = [
      {
        id: 'stakeholder1',
        name: 'Healthcare Provider',
        type: 'organization',
        interests: [
          {
            billId: 123,
            issueArea: 'Healthcare',
            position: 'support',
            strength: 0.8,
            description: 'Supports healthcare reform'
          }
        ],
        influence: 0.7,
        transparency: 0.6
      },
      {
        id: 'stakeholder2',
        name: 'Insurance Company',
        type: 'organization',
        interests: [
          {
            billId: 123,
            issueArea: 'Healthcare',
            position: 'oppose',
            strength: 0.9,
            description: 'Opposes healthcare reform'
          }
        ],
        influence: 0.8,
        transparency: 0.5
      }
    ];

    it('should analyze stakeholder interests', async () => {
      const interests = await service.analyzeStakeholderInterests(mockStakeholders);

      expect(interests).toBeInstanceOf(Array);
      expect(interests.length).toBe(2);

      const supportInterest = interests.find(i => i.position === 'support');
      const opposeInterest = interests.find(i => i.position === 'oppose');

      expect(supportInterest).toBeDefined();
      expect(opposeInterest).toBeDefined();
    });

    it('should handle empty stakeholder list', async () => {
      const interests = await service.analyzeStakeholderInterests([]);

      expect(interests).toBeInstanceOf(Array);
      expect(interests.length).toBe(0);
    });
  });

  describe('calculateInfluenceScores', () => {
    const mockStakeholders: Stakeholder[] = [
      {
        id: 'gov1',
        name: 'Government Agency',
        type: 'government',
        interests: [{ issueArea: 'Policy', position: 'support', strength: 0.8, description: 'Policy support' }],
        influence: 0.5,
        transparency: 0.8
      },
      {
        id: 'org1',
        name: 'Private Organization',
        type: 'organization',
        interests: [],
        influence: 0.5,
        transparency: 0.6
      },
      {
        id: 'ind1',
        name: 'Individual',
        type: 'individual',
        interests: [],
        influence: 0.5,
        transparency: 0.7
      }
    ];

    it('should calculate influence scores based on stakeholder type', async () => {
      const influenceMap = await service.calculateInfluenceScores(mockStakeholders);

      expect(influenceMap.size).toBe(3);

      const govInfluence = influenceMap.get('gov1');
      const orgInfluence = influenceMap.get('org1');
      const indInfluence = influenceMap.get('ind1');

      // Government should have highest influence
      expect(govInfluence).toBeGreaterThan(orgInfluence!);
      expect(orgInfluence).toBeGreaterThan(indInfluence!);
    });

    it('should consider transparency in influence calculation', async () => {
      const highTransparencyStakeholder: Stakeholder[] = [
        {
          id: 'high_transparency',
          name: 'Transparent Org',
          type: 'organization',
          interests: [],
          influence: 0.5,
          transparency: 0.9
        }
      ];

      const lowTransparencyStakeholder: Stakeholder[] = [
        {
          id: 'low_transparency',
          name: 'Opaque Org',
          type: 'organization',
          interests: [],
          influence: 0.5,
          transparency: 0.2
        }
      ];

      const highMap = await service.calculateInfluenceScores(highTransparencyStakeholder);
      const lowMap = await service.calculateInfluenceScores(lowTransparencyStakeholder);

      expect(highMap.get('high_transparency')).toBeGreaterThan(lowMap.get('low_transparency')!);
    });

    it('should cap influence scores at 1.0', async () => {
      const highInfluenceStakeholder: Stakeholder[] = [
        {
          id: 'high_influence',
          name: 'Very Influential',
          type: 'government',
          interests: Array(10).fill({ issueArea: 'Policy', position: 'support', strength: 0.8, description: 'Support' }),
          influence: 0.9,
          transparency: 0.9
        }
      ];

      const influenceMap = await service.calculateInfluenceScores(highInfluenceStakeholder);
      expect(influenceMap.get('high_influence')).toBeLessThanOrEqual(1.0);
    });
  });

  describe('identifyStakeholderConflicts', () => {
    const conflictingStakeholders: Stakeholder[] = [
      {
        id: 'supporter',
        name: 'Bill Supporter',
        type: 'organization',
        interests: [
          {
            billId: 123,
            issueArea: 'Healthcare',
            position: 'support',
            strength: 0.8,
            description: 'Supports the bill'
          }
        ],
        influence: 0.7,
        transparency: 0.6
      },
      {
        id: 'opponent',
        name: 'Bill Opponent',
        type: 'organization',
        interests: [
          {
            billId: 123,
            issueArea: 'Healthcare',
            position: 'oppose',
            strength: 0.9,
            description: 'Opposes the bill'
          }
        ],
        influence: 0.8,
        transparency: 0.5
      }
    ];

    it('should identify conflicts between opposing stakeholders', async () => {
      const conflicts = await service.identifyStakeholderConflicts(conflictingStakeholders);

      expect(conflicts).toBeInstanceOf(Array);
      expect(conflicts.length).toBe(1);

      const conflict = conflicts[0];
      expect(conflict.conflictType).toBe('opposing_positions');
      expect(conflict.stakeholder1.id).toBe('supporter');
      expect(conflict.stakeholder2.id).toBe('opponent');
    });

    it('should calculate conflict severity correctly', async () => {
      const conflicts = await service.identifyStakeholderConflicts(conflictingStakeholders);

      const conflict = conflicts[0];
      expect(['low', 'medium', 'high']).toContain(conflict.severity);
    });

    it('should handle stakeholders with no conflicts', async () => {
      const nonConflictingStakeholders: Stakeholder[] = [
        {
          id: 'neutral1',
          name: 'Neutral Party 1',
          type: 'organization',
          interests: [
            {
              billId: 123,
              issueArea: 'Healthcare',
              position: 'neutral',
              strength: 0.5,
              description: 'Neutral position'
            }
          ],
          influence: 0.5,
          transparency: 0.5
        },
        {
          id: 'neutral2',
          name: 'Neutral Party 2',
          type: 'organization',
          interests: [
            {
              billId: 456, // Different bill
              issueArea: 'Education',
              position: 'support',
              strength: 0.6,
              description: 'Different issue'
            }
          ],
          influence: 0.5,
          transparency: 0.5
        }
      ];

      const conflicts = await service.identifyStakeholderConflicts(nonConflictingStakeholders);

      expect(conflicts).toBeInstanceOf(Array);
      expect(conflicts.length).toBe(0);
    });

    it('should handle empty stakeholder list', async () => {
      const conflicts = await service.identifyStakeholderConflicts([]);

      expect(conflicts).toBeInstanceOf(Array);
      expect(conflicts.length).toBe(0);
    });
  });
});
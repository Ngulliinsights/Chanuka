/**
 * Unit tests for ConflictDetectionEngineService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictDetectionEngineService } from '../conflict-detection-engine.service.js';
import { FinancialConflict, ProfessionalConflict, VotingAnomaly } from '../types.js';

// Mock database
vi.mock('../../../../shared/database/connection', () => ({
  database: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([])
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

describe('ConflictDetectionEngineService', () => {
  let service: ConflictDetectionEngineService;

  beforeEach(() => {
    service = ConflictDetectionEngineService.getInstance();
    vi.clearAllMocks();
  });

  it('should be a singleton', () => {
    const service1 = ConflictDetectionEngineService.getInstance();
    const service2 = ConflictDetectionEngineService.getInstance();
    expect(service1).toBe(service2);
  });

  describe('analyzeFinancialConflicts', () => {
    const mockSponsor = { id: 123, name: 'Test Sponsor' };
    const mockDisclosures = [
      {
        id: 1,
        sponsor_id: 123,
        disclosureType: 'financial',
        amount: '500000',
        source: 'Test Corporation',
        is_verified: true,
        created_at: new Date()
      }
    ];
    const mockAffiliations = [
      {
        id: 1,
        sponsor_id: 123,
        organization: 'Test Corp',
        role: 'Board Member',
        startDate: new Date(),
        endDate: null
      }
    ];

    it('should analyze direct financial conflicts', async () => {
      const conflicts = await service.analyzeFinancialConflicts(
        mockSponsor,
        mockDisclosures,
        mockAffiliations
      );

      expect(conflicts).toBeInstanceOf(Array);
      expect(conflicts.length).toBeGreaterThan(0);
      
      const directConflict = conflicts.find(c => c.type === 'direct_investment');
      expect(directConflict).toBeDefined();
      expect(directConflict?.organization).toBe('Test Corporation');
      expect(directConflict?.financialValue).toBe(500000);
    });

    it('should handle empty disclosures gracefully', async () => {
      const conflicts = await service.analyzeFinancialConflicts(
        mockSponsor,
        [],
        []
      );

      expect(conflicts).toBeInstanceOf(Array);
      expect(conflicts.length).toBe(0);
    });

    it('should calculate correct severity levels', async () => {
      const highValueDisclosures = [
        {
          id: 1,
          sponsor_id: 123,
          disclosureType: 'financial',
          amount: '15000000', // 15M - should be critical
          source: 'Major Corporation',
          is_verified: true,
          created_at: new Date()
        }
      ];

      const conflicts = await service.analyzeFinancialConflicts(
        mockSponsor,
        highValueDisclosures,
        []
      );

      const criticalConflict = conflicts.find(c => c.conflictSeverity === 'critical');
      expect(criticalConflict).toBeDefined();
    });
  });

  describe('analyzeProfessionalConflicts', () => {
    const mockSponsor = { id: 123, name: 'Test Sponsor' };
    const mockAffiliations = [
      {
        id: 1,
        sponsor_id: 123,
        organization: 'Tech Corporation',
        role: 'CEO',
        startDate: new Date(),
        endDate: null
      },
      {
        id: 2,
        sponsor_id: 123,
        organization: 'Advisory Board Inc',
        role: 'Senior Advisor',
        startDate: new Date(),
        endDate: null
      }
    ];

    it('should analyze professional conflicts', async () => {
      const conflicts = await service.analyzeProfessionalConflicts(
        mockSponsor,
        mockAffiliations
      );

      expect(conflicts).toBeInstanceOf(Array);
      expect(conflicts.length).toBe(2);

      const ceoConflict = conflicts.find(c => c.role === 'CEO');
      expect(ceoConflict).toBeDefined();
      expect(ceoConflict?.type).toBe('leadership_role');
      expect(ceoConflict?.conflictSeverity).toBe('critical');
    });

    it('should categorize roles correctly', async () => {
      const advisorAffiliation = [{
        id: 1,
        sponsor_id: 123,
        organization: 'Advisory Corp',
        role: 'Senior Advisor',
        startDate: new Date(),
        endDate: null
      }];

      const conflicts = await service.analyzeProfessionalConflicts(
        mockSponsor,
        advisorAffiliation
      );

      const advisorConflict = conflicts[0];
      expect(advisorConflict.type).toBe('advisory_position');
    });

    it('should handle inactive affiliations', async () => {
      const inactiveAffiliation = [{
        id: 1,
        sponsor_id: 123,
        organization: 'Former Corp',
        role: 'Former CEO',
        startDate: new Date('2020-01-01'),
        endDate: new Date('2021-01-01')
      }];

      const conflicts = await service.analyzeProfessionalConflicts(
        mockSponsor,
        inactiveAffiliation
      );

      expect(conflicts[0].is_active).toBe(false);
    });
  });

  describe('analyzeVotingPatternInconsistencies', () => {
    const mockSponsor = { id: 123, name: 'Test Sponsor' };

    it('should detect party deviation anomalies', async () => { const votingHistory = [
        {
          vote: 'yes',
          bill_id: 1,
          billTitle: 'Test Bill 1',
          billCategory: 'Healthcare',
          partyPosition: 'no'
         },
        { vote: 'no',
          bill_id: 2,
          billTitle: 'Test Bill 2',
          billCategory: 'Education',
          partyPosition: 'yes'
         },
        { vote: 'yes',
          bill_id: 3,
          billTitle: 'Test Bill 3',
          billCategory: 'Finance',
          partyPosition: 'no'
         },
        { vote: 'no',
          bill_id: 4,
          billTitle: 'Test Bill 4',
          billCategory: 'Agriculture',
          partyPosition: 'yes'
         },
        { vote: 'yes',
          bill_id: 5,
          billTitle: 'Test Bill 5',
          billCategory: 'Technology',
          partyPosition: 'no'
         }
      ];

      const anomalies = await service.analyzeVotingPatternInconsistencies(
        mockSponsor,
        votingHistory
      );

      expect(anomalies).toBeInstanceOf(Array);
      expect(anomalies.length).toBeGreaterThan(0);
      
      const partyDeviation = anomalies.find(a => a.type === 'party_deviation');
      expect(partyDeviation).toBeDefined();
    });

    it('should detect pattern inconsistencies', async () => { const votingHistory = [
        { vote: 'yes', bill_id: 1, billTitle: 'Healthcare Bill 1', billCategory: 'Healthcare'  },
        { vote: 'no', bill_id: 2, billTitle: 'Healthcare Bill 2', billCategory: 'Healthcare'  },
        { vote: 'yes', bill_id: 3, billTitle: 'Healthcare Bill 3', billCategory: 'Healthcare'  },
        { vote: 'no', bill_id: 4, billTitle: 'Healthcare Bill 4', billCategory: 'Healthcare'  },
        { vote: 'yes', bill_id: 5, billTitle: 'Healthcare Bill 5', billCategory: 'Healthcare'  }
      ];

      const anomalies = await service.analyzeVotingPatternInconsistencies(
        mockSponsor,
        votingHistory
      );

      expect(anomalies).toBeInstanceOf(Array);
      // Pattern inconsistency should be detected for mixed voting in same category
      const patternAnomaly = anomalies.find(a => a.type === 'pattern_inconsistency');
      expect(patternAnomaly).toBeDefined();
    });

    it('should handle insufficient voting data', async () => { const limitedVotingHistory = [
        { vote: 'yes', bill_id: 1, billTitle: 'Test Bill', billCategory: 'Test'  }
      ];

      const anomalies = await service.analyzeVotingPatternInconsistencies(
        mockSponsor,
        limitedVotingHistory
      );

      expect(anomalies).toBeInstanceOf(Array);
      expect(anomalies.length).toBe(0);
    });

    it('should filter invalid votes', async () => { const mixedVotingHistory = [
        { vote: 'yes', bill_id: 1, billTitle: 'Valid Bill', billCategory: 'Test'  },
        { vote: 'invalid', bill_id: 2, billTitle: 'Invalid Vote'  }, // Invalid vote
        null, // Null entry
        { vote: 'no', bill_id: 3, billTitle: 'Another Valid Bill', billCategory: 'Test'  }
      ];

      const anomalies = await service.analyzeVotingPatternInconsistencies(
        mockSponsor,
        mixedVotingHistory
      );

      // Should only process valid votes
      expect(anomalies).toBeInstanceOf(Array);
    });
  });
});
/**
 * Unit tests for ConflictResolutionRecommendationService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolutionRecommendationService } from '../conflict-resolution-recommendation.service.js';
import { FinancialConflict, ProfessionalConflict, VotingAnomaly, ConflictAnalysis } from '../types.js';

describe('ConflictResolutionRecommendationService', () => {
  let service: ConflictResolutionRecommendationService;

  beforeEach(() => {
    service = ConflictResolutionRecommendationService.getInstance();
  });

  it('should be a singleton', () => {
    const service1 = ConflictResolutionRecommendationService.getInstance();
    const service2 = ConflictResolutionRecommendationService.getInstance();
    expect(service1).toBe(service2);
  });

  describe('generateConflictRecommendations', () => {
    const mockFinancialConflicts: FinancialConflict[] = [
      {
        id: 'financial1',
        type: 'direct_investment',
        organization: 'Tech Corp',
        description: 'Large investment',
        financialValue: 15000000,
        conflictSeverity: 'critical',
        affectedBills: [1, 2],
        billSections: [],
        evidenceStrength: 90,
        detectionMethod: 'disclosure_analysis',
        lastUpdated: new Date()
      }
    ];

    const mockProfessionalConflicts: ProfessionalConflict[] = [
      {
        id: 'professional1',
        type: 'leadership_role',
        organization: 'Advisory Corp',
        role: 'CEO',
        description: 'Leadership position',
        conflictSeverity: 'high',
        affectedBills: [1],
        relationshipStrength: 0.9,
        is_active: true,
        evidenceStrength: 85,
        detectionMethod: 'affiliation_analysis',
        lastUpdated: new Date()
      }
    ];

    const mockVotingAnomalies: VotingAnomaly[] = [
      { id: 'voting1',
        type: 'party_deviation',
        bill_id: 1,
        billTitle: 'Test Bill',
        expectedBehavior: 'Vote yes',
        actualBehavior: 'Voted no',
        description: 'Deviated from party line',
        contextFactors: ['Healthcare'],
        anomalyScore: 0.8,
        detectionDate: new Date()
       }
    ];

    it('should generate comprehensive recommendations for critical risk', () => {
      const recommendations = service.generateConflictRecommendations(
        mockFinancialConflicts,
        mockProfessionalConflicts,
        mockVotingAnomalies,
        0.3, // Low transparency
        'critical'
      );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      // Should include critical-level recommendations
      const hasImmediateAction = recommendations.some(r => 
        r.toLowerCase().includes('immediately') || r.toLowerCase().includes('urgent')
      );
      expect(hasImmediateAction).toBe(true);
    });

    it('should generate appropriate recommendations for low risk', () => {
      const recommendations = service.generateConflictRecommendations(
        [], // No conflicts
        [],
        [],
        0.9, // High transparency
        'low'
      );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      // Should include maintenance recommendations
      const hasMaintenanceRec = recommendations.some(r => 
        r.toLowerCase().includes('maintain') || r.toLowerCase().includes('continue')
      );
      expect(hasMaintenanceRec).toBe(true);
    });

    it('should prioritize recommendations correctly', () => {
      const recommendations = service.generateConflictRecommendations(
        mockFinancialConflicts,
        mockProfessionalConflicts,
        mockVotingAnomalies,
        0.3,
        'critical'
      );

      // First recommendations should be more urgent for critical risk
      const firstRec = recommendations[0].toLowerCase();
      const urgentKeywords = ['immediately', 'urgent', 'critical', 'divest'];
      const hasUrgentKeyword = urgentKeywords.some(keyword => firstRec.includes(keyword));
      
      expect(hasUrgentKeyword).toBe(true);
    });

    it('should handle empty conflicts gracefully', () => {
      const recommendations = service.generateConflictRecommendations(
        [],
        [],
        [],
        0.5,
        'medium'
      );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should remove duplicate recommendations', () => {
      // Create conflicts that might generate duplicate recommendations
      const duplicateFinancialConflicts: FinancialConflict[] = [
        {
          ...mockFinancialConflicts[0],
          id: 'financial2'
        },
        {
          ...mockFinancialConflicts[0],
          id: 'financial3'
        }
      ];

      const recommendations = service.generateConflictRecommendations(
        duplicateFinancialConflicts,
        [],
        [],
        0.5,
        'high'
      );

      // Check that there are no exact duplicates
      const uniqueRecommendations = new Set(recommendations);
      expect(uniqueRecommendations.size).toBe(recommendations.length);
    });
  });

  describe('generateMitigationStrategies', () => {
    const mockConflicts = [
      {
        id: 'critical_conflict',
        type: 'direct_investment' as const,
        organization: 'Major Corp',
        description: 'Critical conflict',
        financialValue: 20000000,
        conflictSeverity: 'critical' as const,
        affectedBills: [1, 2, 3],
        billSections: [],
        evidenceStrength: 95,
        detectionMethod: 'disclosure_analysis' as const,
        lastUpdated: new Date()
      },
      {
        id: 'high_conflict',
        type: 'leadership_role' as const,
        organization: 'Leadership Corp',
        role: 'CEO',
        description: 'High severity conflict',
        conflictSeverity: 'high' as const,
        affectedBills: [1],
        relationshipStrength: 0.9,
        is_active: true,
        evidenceStrength: 85,
        detectionMethod: 'affiliation_analysis' as const,
        lastUpdated: new Date()
      },
      {
        id: 'medium_conflict',
        type: 'advisory_position' as const,
        organization: 'Advisory Corp',
        role: 'Advisor',
        description: 'Medium severity conflict',
        conflictSeverity: 'medium' as const,
        affectedBills: [2],
        relationshipStrength: 0.6,
        is_active: true,
        evidenceStrength: 70,
        detectionMethod: 'affiliation_analysis' as const,
        lastUpdated: new Date()
      }
    ];

    it('should generate strategies for high-severity conflicts only', () => {
      const strategies = service.generateMitigationStrategies(mockConflicts, 'critical');

      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBe(2); // Only critical and high conflicts

      const criticalStrategy = strategies.find(s => s.conflictId === 'critical_conflict');
      const highStrategy = strategies.find(s => s.conflictId === 'high_conflict');
      const mediumStrategy = strategies.find(s => s.conflictId === 'medium_conflict');

      expect(criticalStrategy).toBeDefined();
      expect(highStrategy).toBeDefined();
      expect(mediumStrategy).toBeUndefined();
    });

    it('should prioritize strategies by severity', () => {
      const strategies = service.generateMitigationStrategies(mockConflicts, 'critical');

      // Should be sorted by priority (critical first)
      expect(strategies[0].priority).toBe('critical');
      expect(strategies[1].priority).toBe('high');
    });

    it('should generate appropriate timelines for different severities', () => {
      const strategies = service.generateMitigationStrategies(mockConflicts, 'critical');

      const criticalStrategy = strategies.find(s => s.priority === 'critical');
      const highStrategy = strategies.find(s => s.priority === 'high');

      expect(criticalStrategy?.timeline).toContain('7-14 days');
      expect(highStrategy?.timeline).toContain('30-60 days');
    });

    it('should include relevant stakeholders', () => {
      const strategies = service.generateMitigationStrategies(mockConflicts, 'critical');

      strategies.forEach(strategy => {
        expect(strategy.stakeholders).toBeInstanceOf(Array);
        expect(strategy.stakeholders.length).toBeGreaterThan(0);
        expect(strategy.stakeholders).toContain('Ethics Committee');
      });
    });

    it('should handle empty conflicts list', () => {
      const strategies = service.generateMitigationStrategies([], 'medium');

      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBe(0);
    });
  });

  describe('generateComplianceRecommendations', () => {
    const mockAnalysis: ConflictAnalysis = {
      sponsor_id: 123,
      sponsorName: 'Test Sponsor',
      overallRiskScore: 0.6,
      riskLevel: 'medium',
      financialConflicts: [
        {
          id: 'financial1',
          type: 'direct_investment',
          organization: 'Test Corp',
          description: 'Investment',
          financialValue: 1000000,
          conflictSeverity: 'medium',
          affectedBills: [1],
          billSections: [],
          evidenceStrength: 80,
          detectionMethod: 'disclosure_analysis',
          lastUpdated: new Date()
        }
      ],
      professionalConflicts: [
        {
          id: 'professional1',
          type: 'advisory_position',
          organization: 'Advisory Corp',
          role: 'Advisor',
          description: 'Advisory role',
          conflictSeverity: 'low',
          affectedBills: [1],
          relationshipStrength: 0.5,
          is_active: true,
          evidenceStrength: 70,
          detectionMethod: 'affiliation_analysis',
          lastUpdated: new Date()
        }
      ],
      votingAnomalies: [],
      transparency_score: 0.7,
      transparencyGrade: 'B',
      recommendations: [],
      lastAnalyzed: new Date(),
      confidence: 0.8
    };

    it('should generate compliance recommendations', () => {
      const recommendations = service.generateComplianceRecommendations(mockAnalysis);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      // Should include financial disclosure recommendation
      const financialRec = recommendations.find(r => 
        r.requirement.includes('Financial Interest Disclosure')
      );
      expect(financialRec).toBeDefined();

      // Should include professional affiliation recommendation
      const professionalRec = recommendations.find(r => 
        r.requirement.includes('Professional Affiliation Disclosure')
      );
      expect(professionalRec).toBeDefined();

      // Should include voting transparency recommendation
      const votingRec = recommendations.find(r => 
        r.requirement.includes('Voting Pattern Transparency')
      );
      expect(votingRec).toBeDefined();
    });

    it('should assess compliance status correctly', () => {
      const recommendations = service.generateComplianceRecommendations(mockAnalysis);

      const financialRec = recommendations.find(r => 
        r.requirement.includes('Financial Interest Disclosure')
      );
      
      // Should be compliant since there are financial conflicts detected via disclosure
      expect(financialRec?.currentStatus).toBe('compliant');
    });

    it('should provide appropriate actions based on compliance status', () => {
      const recommendations = service.generateComplianceRecommendations(mockAnalysis);

      recommendations.forEach(rec => {
        expect(rec.actions).toBeInstanceOf(Array);
        expect(rec.actions.length).toBeGreaterThan(0);
        
        if (rec.currentStatus === 'non_compliant') {
          // Non-compliant should have more urgent actions
          const hasUrgentAction = rec.actions.some(action => 
            action.toLowerCase().includes('file') || 
            action.toLowerCase().includes('implement')
          );
          expect(hasUrgentAction).toBe(true);
        }
      });
    });

    it('should include deadlines for time-sensitive requirements', () => {
      const recommendations = service.generateComplianceRecommendations(mockAnalysis);

      const hasDeadlines = recommendations.some(rec => rec.deadline);
      expect(hasDeadlines).toBe(true);
    });

    it('should handle analysis with no conflicts', () => {
      const noConflictAnalysis: ConflictAnalysis = {
        ...mockAnalysis,
        financialConflicts: [],
        professionalConflicts: [],
        votingAnomalies: []
      };

      const recommendations = service.generateComplianceRecommendations(noConflictAnalysis);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      // Financial disclosure should be non-compliant without any conflicts detected
      const financialRec = recommendations.find(r => 
        r.requirement.includes('Financial Interest Disclosure')
      );
      expect(financialRec?.currentStatus).toBe('non_compliant');
    });
  });
});

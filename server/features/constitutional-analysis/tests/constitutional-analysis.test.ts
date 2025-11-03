// ============================================================================
// CONSTITUTIONAL ANALYSIS - Test Suite
// ============================================================================
// Comprehensive tests for the constitutional analysis feature

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createConstitutionalAnalyzer, createAnalysisServices } from '../services/constitutional-analysis-factory.js';
import { AnalysisRequest } from '../types/index.js';

// Mock data for testing
const mockBillContent = `
  This bill seeks to amend the Computer Misuse and Cybercrimes Act to enhance 
  cybersecurity measures while ensuring protection of freedom of expression and 
  privacy rights. The bill introduces new provisions for data protection and 
  establishes penalties for cybercrime offenses.
`;

const mockAnalysisRequest: AnalysisRequest = {
  billId: 'test-bill-001',
  billTitle: 'Computer Misuse and Cybercrimes (Amendment) Bill 2024',
  billContent: mockBillContent,
  billType: 'amendment',
  urgentAnalysis: false
};

describe('Constitutional Analysis Feature', () => {
  let analyzer: ReturnType<typeof createConstitutionalAnalyzer>;
  let services: ReturnType<typeof createAnalysisServices>;

  beforeEach(() => {
    // Create fresh instances for each test
    analyzer = createConstitutionalAnalyzer();
    services = createAnalysisServices();
    
    // Mock database calls to avoid actual database operations
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ConstitutionalAnalyzer', () => {
    it('should analyze a bill and return comprehensive results', async () => {
      // Mock the provision matcher to return relevant provisions
      const mockProvisions = [
        {
          id: 'prov-001',
          article_number: 33,
          section_number: 1,
          provision_text: 'Every person has the right to freedom of expression',
          keywords: ['expression', 'speech', 'communication'],
          rights_category: 'expression'
        }
      ];

      vi.spyOn(services.provisionMatcher, 'findRelevantProvisions')
        .mockResolvedValue(mockProvisions as any);

      vi.spyOn(services.precedentFinder, 'findRelevantPrecedents')
        .mockResolvedValue([]);

      vi.spyOn(services.repositories.analyses, 'save')
        .mockResolvedValue(undefined);

      const result = await analyzer.analyzeBill(mockAnalysisRequest);

      expect(result).toBeDefined();
      expect(result.billId).toBe(mockAnalysisRequest.billId);
      expect(result.overallRisk).toBeOneOf(['low', 'medium', 'high', 'critical']);
      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(100);
      expect(result.analyses).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle bills with no constitutional implications', async () => {
      vi.spyOn(services.provisionMatcher, 'findRelevantProvisions')
        .mockResolvedValue([]);

      const result = await analyzer.analyzeBill(mockAnalysisRequest);

      expect(result.overallRisk).toBe('low');
      expect(result.analyses).toHaveLength(0);
      expect(result.summary.totalProvisions).toBe(0);
      expect(result.flaggedForExpertReview).toBe(false);
    });

    it('should flag high-risk analyses for expert review', async () => {
      const highRiskProvision = {
        id: 'prov-002',
        article_number: 33,
        section_number: 1,
        provision_text: 'Every person has the right to freedom of expression',
        keywords: ['expression', 'restrict', 'prohibit'],
        rights_category: 'expression'
      };

      vi.spyOn(services.provisionMatcher, 'findRelevantProvisions')
        .mockResolvedValue([highRiskProvision] as any);

      vi.spyOn(services.precedentFinder, 'findRelevantPrecedents')
        .mockResolvedValue([]);

      vi.spyOn(services.repositories.analyses, 'save')
        .mockResolvedValue(undefined);

      vi.spyOn(services.expertFlagger, 'shouldFlagForReview')
        .mockResolvedValue(true);

      const result = await analyzer.analyzeBill({
        ...mockAnalysisRequest,
        billContent: 'This bill restricts freedom of expression and prohibits certain communications.'
      });

      expect(result.flaggedForExpertReview).toBe(true);
      expect(result.overallRisk).toBeOneOf(['high', 'critical']);
    });
  });

  describe('ProvisionMatcherService', () => {
    it('should find relevant constitutional provisions', async () => {
      const mockProvisions = [
        {
          id: 'prov-001',
          article_number: 33,
          keywords: ['expression', 'speech'],
          provision_text: 'Freedom of expression provision'
        }
      ];

      vi.spyOn(services.repositories.provisions, 'searchByKeywords')
        .mockResolvedValue(mockProvisions as any);

      const results = await services.provisionMatcher.findRelevantProvisions(
        'This bill affects freedom of expression',
        'Expression Rights Bill'
      );

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('prov-001');
    });

    it('should handle empty search results gracefully', async () => {
      vi.spyOn(services.repositories.provisions, 'searchByKeywords')
        .mockResolvedValue([]);

      const results = await services.provisionMatcher.findRelevantProvisions(
        'This bill has no constitutional implications',
        'Administrative Procedure Bill'
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('PrecedentFinderService', () => {
    it('should find relevant legal precedents', async () => {
      const mockPrecedents = [
        {
          id: 'prec-001',
          case_name: 'Test Case v. State',
          court_level: 'supreme_court',
          relevance_score_percentage: 85,
          holding: 'Constitutional rights must be protected'
        }
      ];

      vi.spyOn(services.repositories.precedents, 'searchByProvision')
        .mockResolvedValue(mockPrecedents as any);

      const results = await services.precedentFinder.findRelevantPrecedents(
        'prov-001',
        'freedom of expression case'
      );

      expect(results).toHaveLength(1);
      expect(results[0].relevance_score_percentage).toBe(85);
    });

    it('should weight precedents by court hierarchy', async () => {
      const mockPrecedents = [
        {
          id: 'prec-001',
          case_name: 'Supreme Court Case',
          court_level: 'supreme_court',
          relevance_score_percentage: 70
        },
        {
          id: 'prec-002',
          case_name: 'High Court Case',
          court_level: 'high_court',
          relevance_score_percentage: 80
        }
      ];

      vi.spyOn(services.repositories.precedents, 'searchByProvision')
        .mockResolvedValue(mockPrecedents as any);

      const results = await services.precedentFinder.findRelevantPrecedents(
        'prov-001',
        'constitutional case'
      );

      // Supreme Court case should be ranked higher despite lower base relevance
      expect(results[0].case_name).toBe('Supreme Court Case');
    });
  });

  describe('ExpertFlaggingService', () => {
    it('should flag low confidence analyses', async () => {
      const lowConfidenceAnalysis = {
        id: 'analysis-001',
        confidence_percentage: 60,
        constitutional_risk: 'medium',
        impact_severity_percentage: 70
      };

      vi.spyOn(services.repositories.expertReview, 'addToQueue')
        .mockResolvedValue(undefined);

      const shouldFlag = await services.expertFlagger.shouldFlagForReview(
        [lowConfidenceAnalysis] as any,
        'medium',
        60
      );

      expect(shouldFlag).toBe(true);
    });

    it('should flag critical risk analyses', async () => {
      const criticalRiskAnalysis = {
        id: 'analysis-002',
        confidence_percentage: 90,
        constitutional_risk: 'critical',
        impact_severity_percentage: 95
      };

      vi.spyOn(services.repositories.expertReview, 'addToQueue')
        .mockResolvedValue(undefined);

      const shouldFlag = await services.expertFlagger.shouldFlagForReview(
        [criticalRiskAnalysis] as any,
        'critical',
        90
      );

      expect(shouldFlag).toBe(true);
    });

    it('should not flag high confidence, low risk analyses', async () => {
      const goodAnalysis = {
        id: 'analysis-003',
        confidence_percentage: 95,
        constitutional_risk: 'low',
        impact_severity_percentage: 30
      };

      const shouldFlag = await services.expertFlagger.shouldFlagForReview(
        [goodAnalysis] as any,
        'low',
        95
      );

      expect(shouldFlag).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      vi.spyOn(services.repositories.provisions, 'searchByKeywords')
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        analyzer.analyzeBill(mockAnalysisRequest)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle external service errors', async () => {
      vi.spyOn(services.external.legalDatabase, 'searchPrecedents')
        .mockRejectedValue(new Error('External service unavailable'));

      vi.spyOn(services.provisionMatcher, 'findRelevantProvisions')
        .mockResolvedValue([{
          id: 'prov-001',
          article_number: 33,
          keywords: ['test'],
          provision_text: 'Test provision'
        }] as any);

      // Should still complete analysis even if external service fails
      const result = await analyzer.analyzeBill(mockAnalysisRequest);
      expect(result).toBeDefined();
      expect(result.billId).toBe(mockAnalysisRequest.billId);
    });
  });

  describe('Performance', () => {
    it('should complete analysis within reasonable time', async () => {
      vi.spyOn(services.provisionMatcher, 'findRelevantProvisions')
        .mockResolvedValue([]);

      const startTime = Date.now();
      const result = await analyzer.analyzeBill(mockAnalysisRequest);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.processingTime).toBeLessThan(5000);
    });
  });
});

// Helper function for test expectations
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeOneOf(expected: any[]): T;
    }
  }
}
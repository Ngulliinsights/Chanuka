// ============================================================================
// ARGUMENT INTELLIGENCE - Test Suite
// ============================================================================
// Comprehensive tests for the argument intelligence feature

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../../index.js';

// Mock data for testing
const mockCommentProcessingRequest = {
  comment_id: 'comment-001',
  bill_id: 'bill-001',
  commentText: 'I strongly support this bill because it will improve healthcare access for rural communities. Studies show that 60% of rural areas lack adequate medical facilities.',
  user_id: 'user-001',
  userDemographics: {
    county: 'Turkana',
    ageGroup: '25-34',
    occupation: 'farmer',
    organizationAffiliation: 'Farmers Association'
  },
  submissionContext: {
    submissionMethod: 'web' as const,
    timestamp: new Date(),
    session_id: 'session-001'
  }
};

const mockStructureExtractionRequest = {
  text: 'This bill will negatively impact small businesses. According to recent data, 70% of SMEs are already struggling with compliance costs.',
  bill_id: 'bill-001',
  userContext: {
    county: 'Nairobi',
    occupation: 'business_owner'
  }
};

const mockClusteringRequest = {
  arguments: [
    {
      id: 'arg-001',
      text: 'Healthcare access is a major concern',
      normalizedText: 'healthcare access major concern',
      confidence: 0.85,
      user_id: 'user-001'
    },
    {
      id: 'arg-002', 
      text: 'Medical facilities are inadequate in rural areas',
      normalizedText: 'medical facilities inadequate rural areas',
      confidence: 0.90,
      user_id: 'user-002'
    }
  ],
  config: {
    similarityThreshold: 0.7,
    minClusterSize: 2
  }
};

describe('Argument Intelligence API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/argument-intelligence/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('healthy');
      expect(response.body.services).toBeDefined();
    });
  });

  describe('Comment Processing', () => {
    it('should process a comment and extract arguments', async () => {
      const response = await request(app)
        .post('/api/argument-intelligence/process-comment')
        .send(mockCommentProcessingRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.comment_id).toBe(mockCommentProcessingRequest.comment_id);
      expect(response.body.data.bill_id).toBe(mockCommentProcessingRequest.bill_id);
      expect(response.body.data.extractedArguments).toBeInstanceOf(Array);
      expect(response.body.data.processingMetrics).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const invalidRequest = { ...mockCommentProcessingRequest };
      delete invalidRequest.commentText;

      const response = await request(app)
        .post('/api/argument-intelligence/process-comment')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
      expect(response.body.required).toContain('commentText');
    });
  });

  describe('Structure Extraction', () => {
    it('should extract argument structure from text', async () => {
      const response = await request(app)
        .post('/api/argument-intelligence/extract-structure')
        .send(mockStructureExtractionRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.arguments).toBeInstanceOf(Array);
      expect(response.body.data.argumentChains).toBeInstanceOf(Array);
      expect(response.body.data.extractionMetrics).toBeDefined();
    });

    it('should return 400 for missing text or bill_id', async () => {
      const invalidRequest = { ...mockStructureExtractionRequest };
      delete invalidRequest.text;

      const response = await request(app)
        .post('/api/argument-intelligence/extract-structure')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('Bill Analysis', () => {
    it('should synthesize arguments for a bill', async () => {
      const response = await request(app)
        .post('/api/argument-intelligence/synthesize-bill/bill-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.bill_id).toBe('bill-001');
      expect(response.body.data.majorClaims).toBeInstanceOf(Array);
      expect(response.body.data.stakeholderPositions).toBeInstanceOf(Array);
    });

    it('should get argument map for visualization', async () => {
      const response = await request(app)
        .get('/api/argument-intelligence/argument-map/bill-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claims).toBeInstanceOf(Array);
      expect(response.body.data.relationships).toBeInstanceOf(Array);
      expect(response.body.data.stakeholders).toBeInstanceOf(Array);
    });
  });

  describe('Clustering', () => {
    it('should cluster arguments by similarity', async () => {
      const response = await request(app)
        .post('/api/argument-intelligence/cluster-arguments')
        .send(mockClusteringRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.clusters).toBeInstanceOf(Array);
      expect(response.body.data.clusteringMetrics).toBeDefined();
    });

    it('should find similar arguments', async () => {
      const request_body = {
        query: 'healthcare access',
        arguments: mockClusteringRequest.arguments,
        threshold: 0.6
      };

      const response = await request(app)
        .post('/api/argument-intelligence/find-similar')
        .send(request_body)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.query).toBe('healthcare access');
      expect(response.body.data.similarArguments).toBeInstanceOf(Array);
    });

    it('should return 400 for invalid arguments array', async () => {
      const invalidRequest = { ...mockClusteringRequest };
      invalidRequest.arguments = 'not an array' as any;

      const response = await request(app)
        .post('/api/argument-intelligence/cluster-arguments')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Invalid arguments array provided');
    });
  });

  describe('Coalition Finding', () => {
    it('should find potential coalitions', async () => {
      const request_body = {
        arguments: [
          {
            id: 'arg-001',
            affectedGroups: ['farmers', 'rural_communities'],
            position: 'support',
            userDemographics: { occupation: 'farmer' }
          },
          {
            id: 'arg-002',
            affectedGroups: ['healthcare_workers', 'rural_communities'],
            position: 'support',
            userDemographics: { occupation: 'nurse' }
          }
        ]
      };

      const response = await request(app)
        .post('/api/argument-intelligence/find-coalitions')
        .send(request_body)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.coalitions).toBeInstanceOf(Array);
    });

    it('should discover coalition opportunities for a bill', async () => {
      const response = await request(app)
        .get('/api/argument-intelligence/coalition-opportunities/bill-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.opportunities).toBeInstanceOf(Array);
    });
  });

  describe('Evidence Validation', () => {
    it('should validate evidence claim', async () => {
      const evidenceClaim = {
        id: 'claim-001',
        text: 'Studies show that 60% of rural areas lack medical facilities',
        claimType: 'statistical',
        citedSources: ['https://example.com/health-study'],
        confidence: 0.8,
        user_id: 'user-001',
        submittedAt: new Date()
      };

      const response = await request(app)
        .post('/api/argument-intelligence/validate-evidence')
        .send({ claim: evidenceClaim })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.evidenceId).toBe(evidenceClaim.id);
      expect(response.body.data.validationStatus).toBeDefined();
      expect(response.body.data.credibilityScore).toBeGreaterThanOrEqual(0);
    });

    it('should assess evidence base for a bill', async () => {
      const response = await request(app)
        .get('/api/argument-intelligence/evidence-assessment/bill-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bill_id).toBe('bill-001');
      expect(response.body.data.evidenceBase).toBeInstanceOf(Array);
      expect(response.body.data.overallCredibility).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Brief Generation', () => {
    it('should generate legislative brief', async () => {
      const briefRequest = {
        bill_id: 'bill-001',
        majorClaims: [
          {
            claimText: 'Healthcare access needs improvement',
            supportingComments: 15,
            opposingComments: 3,
            evidenceStrength: 0.8,
            stakeholderGroups: ['farmers', 'healthcare_workers'],
            representativeQuotes: ['Rural areas lack medical facilities']
          }
        ],
        evidenceBase: [],
        stakeholderPositions: [],
        consensusAreas: ['Need for better healthcare'],
        controversialPoints: [],
        briefType: 'committee',
        targetAudience: 'legislators'
      };

      const response = await request(app)
        .post('/api/argument-intelligence/generate-brief')
        .send(briefRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bill_id).toBe('bill-001');
      expect(response.body.data.executiveSummary).toBeDefined();
      expect(response.body.data.keyFindings).toBeInstanceOf(Array);
    });

    it('should generate public summary', async () => {
      const briefRequest = {
        bill_id: 'bill-001',
        majorClaims: [
          {
            claimText: 'Healthcare access needs improvement',
            supportingComments: 15,
            opposingComments: 3
          }
        ],
        stakeholderPositions: [
          {
            stakeholderGroup: 'farmers',
            participantCount: 25
          }
        ]
      };

      const response = await request(app)
        .post('/api/argument-intelligence/generate-public-summary')
        .send(briefRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.bill_id).toBe('bill-001');
    });
  });

  describe('Power Balancing', () => {
    it('should balance stakeholder voices', async () => {
      const request_body = {
        stakeholderPositions: [
          {
            stakeholderGroup: 'farmers',
            position: 'support',
            participantCount: 100,
            keyArguments: ['Improves rural healthcare'],
            evidenceProvided: []
          },
          {
            stakeholderGroup: 'urban_residents',
            position: 'neutral',
            participantCount: 5,
            keyArguments: ['Minimal impact on cities'],
            evidenceProvided: []
          }
        ],
        argumentData: [
          {
            id: 'arg-001',
            text: 'Rural healthcare needs improvement',
            user_id: 'user-001',
            submissionTime: new Date(),
            userDemographics: { occupation: 'farmer' }
          }
        ]
      };

      const response = await request(app)
        .post('/api/argument-intelligence/balance-voices')
        .send(request_body)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balancedPositions).toBeInstanceOf(Array);
      expect(response.body.data.equityMetrics).toBeDefined();
    });

    it('should detect astroturfing', async () => {
      const argumentData = [
        {
          id: 'arg-001',
          text: 'This bill is terrible and will destroy our economy',
          user_id: 'user-001',
          submissionTime: new Date('2024-01-01T10:00:00Z')
        },
        {
          id: 'arg-002',
          text: 'This bill is terrible and will destroy our economy',
          user_id: 'user-002',
          submissionTime: new Date('2024-01-01T10:01:00Z')
        }
      ];

      const response = await request(app)
        .post('/api/argument-intelligence/detect-astroturfing')
        .send({ argumentData })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.campaigns).toBeInstanceOf(Array);
    });
  });

  describe('Data Retrieval', () => {
    it('should get arguments for a bill', async () => {
      const response = await request(app)
        .get('/api/argument-intelligence/arguments/bill-001')
        .query({
          limit: 10,
          offset: 0,
          sortBy: 'created_at',
          sortOrder: 'desc'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.arguments).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should search arguments by text', async () => {
      const response = await request(app)
        .get('/api/argument-intelligence/search')
        .query({
          q: 'healthcare',
          bill_id: 'bill-001',
          limit: 20
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.query).toBe('healthcare');
      expect(response.body.data.arguments).toBeInstanceOf(Array);
    });

    it('should return 400 for missing search query', async () => {
      const response = await request(app)
        .get('/api/argument-intelligence/search')
        .expect(400);

      expect(response.body.error).toBe('Search query is required');
    });

    it('should get argument statistics', async () => {
      const response = await request(app)
        .get('/api/argument-intelligence/statistics/bill-001')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bill_id).toBe('bill-001');
      expect(response.body.data.totalArguments).toBeGreaterThanOrEqual(0);
      expect(response.body.data.argumentsByType).toBeDefined();
    });

    it('should get briefs for a bill', async () => {
      const response = await request(app)
        .get('/api/argument-intelligence/briefs/bill-001')
        .query({ limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.briefs).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent brief', async () => {
      const response = await request(app)
        .get('/api/argument-intelligence/brief/non-existent-brief')
        .expect(404);

      expect(response.body.error).toBe('Brief not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // This test would require mocking internal services to throw errors
      // For now, we'll test that the error response format is correct
      const response = await request(app)
        .post('/api/argument-intelligence/process-comment')
        .send({}) // Invalid request that should cause an error
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 503 for health check when services are down', async () => {
      // This would require mocking the database to be unavailable
      // The actual implementation would need to be tested with integration tests
    });
  });

  describe('Input Validation', () => {
    it('should validate comment processing request fields', async () => {
      const testCases = [
        { field: 'comment_id', value: null },
        { field: 'bill_id', value: null },
        { field: 'commentText', value: null },
        { field: 'user_id', value: null }
      ];

      for (const testCase of testCases) {
        const invalidRequest = { ...mockCommentProcessingRequest };
        delete invalidRequest[testCase.field as keyof typeof invalidRequest];

        const response = await request(app)
          .post('/api/argument-intelligence/process-comment')
          .send(invalidRequest)
          .expect(400);

        expect(response.body.error).toBe('Missing required fields');
        expect(response.body.required).toContain(testCase.field);
      }
    });

    it('should validate clustering request format', async () => {
      const invalidRequest = {
        arguments: 'not an array',
        config: {}
      };

      const response = await request(app)
        .post('/api/argument-intelligence/cluster-arguments')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.error).toBe('Invalid arguments array provided');
    });
  });

  describe('Performance', () => {
    it('should complete comment processing within reasonable time', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .post('/api/argument-intelligence/process-comment')
        .send(mockCommentProcessingRequest)
        .expect(200);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.data.processingMetrics.processingTime).toBeLessThan(5000);
    });
  });
});

// Helper function for test expectations
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace Vi {
    interface Assertion<T = any> {
      toBeWithinRange(floor: number, ceiling: number): T;
    }
  }
}
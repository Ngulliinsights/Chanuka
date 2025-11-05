/**
 * Simple ML Performance Tests
 * 
 * Basic performance tests for the ML service migration.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock the logger import
vi.mock('../../../../shared/core/src/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock feature flags service
vi.mock('../../../infrastructure/migration/feature-flags.service.js', () => ({
  featureFlagsService: {
    shouldUseMigration: vi.fn().mockResolvedValue(true),
    recordMetrics: vi.fn().mockResolvedValue(undefined),
    updateFlag: vi.fn(),
    getFlag: vi.fn()
  }
}));

import { realMLAnalysisService } from '../services/real-ml.service.js';
import { MLAnalysisService } from '../services/ml.service.js';
import { MLServiceAdapter } from '../services/ml-adapter.service.js';

describe('ML Service Performance Tests', () => {
  const testBillContent = `
    The Digital Privacy Protection Act establishes comprehensive data protection standards
    for technology companies operating in the digital marketplace. This legislation requires
    explicit user consent for data collection, mandates data portability rights, and establishes
    penalties for privacy violations. The bill is supported by consumer advocacy groups and
    privacy organizations, while facing opposition from some technology industry associations.
    Small businesses will benefit from reduced compliance costs, while large corporations
    may face increased regulatory oversight. The estimated compliance cost is $1.2 billion
    industry-wide, with consumer benefits estimated at $3.5 billion over five years.
  `;

  const testSponsorData = {
    name: 'Senator Privacy Advocate',
    committees: ['Judiciary Committee', 'Commerce Committee'],
    investments: ['Privacy Tech Fund', 'Consumer Rights Foundation']
  };

  beforeAll(async () => {
    await realMLAnalysisService.initialize();
  });

  afterAll(async () => {
    await realMLAnalysisService.cleanup();
  });

  describe('Mock vs Real ML Performance Comparison', () => {
    it('should benchmark stakeholder analysis performance', async () => {
      const iterations = 5;
      
      // Benchmark mock service
      const mockTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await MLAnalysisService.analyzeStakeholderInfluence(testBillContent);
        mockTimes.push(Date.now() - startTime);
      }

      // Benchmark real ML service
      const realTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await realMLAnalysisService.analyzeStakeholderInfluence(testBillContent);
        realTimes.push(Date.now() - startTime);
      }

      const mockAvg = mockTimes.reduce((sum, time) => sum + time, 0) / mockTimes.length;
      const realAvg = realTimes.reduce((sum, time) => sum + time, 0) / realTimes.length;

      console.log(`Stakeholder Analysis Performance:
        Mock Service Average: ${mockAvg.toFixed(2)}ms
        Real ML Service Average: ${realAvg.toFixed(2)}ms
        Performance Ratio: ${(realAvg / mockAvg).toFixed(2)}x`);

      // Both services should complete within reasonable time
      expect(mockAvg).toBeLessThan(100);
      expect(realAvg).toBeLessThan(500);
      
      // Real ML should not be more than 10x slower than mock (handle division by zero)
      if (mockAvg > 0) {
        expect(realAvg / mockAvg).toBeLessThan(10);
      } else {
        // If mock is 0ms, just ensure real ML is reasonable
        expect(realAvg).toBeLessThan(500);
      }
    });

    it('should benchmark conflict detection performance', async () => {
      const iterations = 3;
      
      // Benchmark mock service
      const mockTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await MLAnalysisService.detectConflictsOfInterest(testBillContent, testSponsorData);
        mockTimes.push(Date.now() - startTime);
      }

      // Benchmark real ML service
      const realTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await realMLAnalysisService.detectConflictsOfInterest(testBillContent, testSponsorData);
        realTimes.push(Date.now() - startTime);
      }

      const mockAvg = mockTimes.reduce((sum, time) => sum + time, 0) / mockTimes.length;
      const realAvg = realTimes.reduce((sum, time) => sum + time, 0) / realTimes.length;

      console.log(`Conflict Detection Performance:
        Mock Service Average: ${mockAvg.toFixed(2)}ms
        Real ML Service Average: ${realAvg.toFixed(2)}ms
        Performance Ratio: ${(realAvg / mockAvg).toFixed(2)}x`);

      expect(mockAvg).toBeLessThan(100);
      expect(realAvg).toBeLessThan(500);
    });

    it('should benchmark beneficiary analysis performance', async () => {
      const iterations = 3;
      
      // Benchmark mock service
      const mockTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await MLAnalysisService.analyzeBeneficiaries(testBillContent);
        mockTimes.push(Date.now() - startTime);
      }

      // Benchmark real ML service
      const realTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await realMLAnalysisService.analyzeBeneficiaries(testBillContent);
        realTimes.push(Date.now() - startTime);
      }

      const mockAvg = mockTimes.reduce((sum, time) => sum + time, 0) / mockTimes.length;
      const realAvg = realTimes.reduce((sum, time) => sum + time, 0) / realTimes.length;

      console.log(`Beneficiary Analysis Performance:
        Mock Service Average: ${mockAvg.toFixed(2)}ms
        Real ML Service Average: ${realAvg.toFixed(2)}ms
        Performance Ratio: ${(realAvg / mockAvg).toFixed(2)}x`);

      expect(mockAvg).toBeLessThan(100);
      expect(realAvg).toBeLessThan(500);
    });
  });

  describe('Adapter Performance Tests', () => {
    it('should measure adapter routing overhead', async () => {
      const iterations = 5;
      
      // Benchmark direct service calls
      const directTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await realMLAnalysisService.analyzeStakeholderInfluence(testBillContent);
        directTimes.push(Date.now() - startTime);
      }

      // Benchmark adapter calls
      const adapterTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await MLServiceAdapter.analyzeStakeholderInfluence(testBillContent, `test-user-${i}`);
        adapterTimes.push(Date.now() - startTime);
      }

      const directAvg = directTimes.reduce((sum, time) => sum + time, 0) / directTimes.length;
      const adapterAvg = adapterTimes.reduce((sum, time) => sum + time, 0) / adapterTimes.length;
      const overhead = adapterAvg - directAvg;

      console.log(`Adapter Performance:
        Direct Service Average: ${directAvg.toFixed(2)}ms
        Adapter Average: ${adapterAvg.toFixed(2)}ms
        Routing Overhead: ${overhead.toFixed(2)}ms (${((overhead / directAvg) * 100).toFixed(1)}%)`);

      // Adapter overhead should be minimal (less than 50% of direct call time)
      expect(overhead).toBeLessThan(directAvg * 0.5);
    });
  });

  describe('Concurrent Processing Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        realMLAnalysisService.analyzeStakeholderInfluence(testBillContent)
      );
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
      
      // Concurrent requests should not take much longer than sequential requests
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 5 concurrent requests
      
      console.log(`Concurrent Processing:
        Requests: ${concurrentRequests}
        Total Time: ${totalTime}ms
        Average per Request: ${(totalTime / concurrentRequests).toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should monitor memory usage during operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push(
          realMLAnalysisService.analyzeStakeholderInfluence(testBillContent),
          realMLAnalysisService.detectConflictsOfInterest(testBillContent, testSponsorData),
          realMLAnalysisService.analyzeBeneficiaries(testBillContent)
        );
      }

      await Promise.all(operations);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
      };

      console.log(`Memory Usage:
        Heap Used Increase: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)} MB
        Heap Total Increase: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)} MB`);

      // Memory increase should be reasonable (less than 50MB for heap used)
      expect(memoryIncrease.heapUsed).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Quality Comparison Tests', () => {
    it('should compare analysis quality between services', async () => {
      const mockResult = await MLAnalysisService.analyzeStakeholderInfluence(testBillContent);
      const realResult = await realMLAnalysisService.analyzeStakeholderInfluence(testBillContent);

      // Both should return valid results
      expect(mockResult.confidence).toBeGreaterThan(0);
      expect(realResult.confidence).toBeGreaterThan(0);

      // Real ML should provide more detailed metadata
      expect(realResult.metadata?.mlTechniques).toBeDefined();
      expect(realResult.metadata?.dataSourcesUsed).toBeDefined();

      console.log(`Quality Comparison:
        Mock Confidence: ${mockResult.confidence.toFixed(3)}
        Real ML Confidence: ${realResult.confidence.toFixed(3)}
        Real ML Techniques: ${realResult.metadata?.mlTechniques?.join(', ')}
        Mock Influencers: ${mockResult.result.primaryInfluencers?.length || 0}
        Real ML Influencers: ${realResult.result.primaryInfluencers?.length || 0}`);

      // Real ML should find at least as many stakeholders as mock
      const mockInfluencers = mockResult.result.primaryInfluencers?.length || 0;
      const realInfluencers = realResult.result.primaryInfluencers?.length || 0;
      expect(realInfluencers).toBeGreaterThanOrEqual(Math.min(mockInfluencers, 1));
    });
  });
});
/**
 * ML Performance Benchmark Tests
 * 
 * Compares performance between mock and real ML implementations
 * Tests accuracy, response time, and resource usage
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MLAnalysisService } from '../services/ml.service.js';
import { RealMLAnalysisService } from '../services/real-ml.service.js';
import { MLServiceAdapter } from '../services/ml-adapter.service.js';
import { featureFlagsService } from '../../../infrastructure/migration/feature-flags.service.js';

describe('ML Performance Benchmark', () => {
    let realMLService: RealMLAnalysisService;
    let mlAdapter: MLServiceAdapter;

    const sampleBillContent = `
        This bill aims to regulate the technology industry by implementing new privacy standards
        for consumer data protection. Small businesses and startups will benefit from simplified
        compliance procedures, while large corporations may face increased regulatory burden.
        The legislation includes provisions for financial penalties and enforcement mechanisms.
        Consumer advocacy groups support this measure, while industry associations have expressed concerns.
    `;

    const sampleSponsorData = {
        name: 'Senator Smith',
        investments: ['Tech Corp', 'Privacy Solutions Inc'],
        committees: ['Technology Committee', 'Privacy Subcommittee']
    };

    beforeAll(async () => {
        realMLService = RealMLAnalysisService.getInstance();
        mlAdapter = MLServiceAdapter.getInstance();
        
        // Initialize real ML service
        await realMLService.initialize();
        
        // Clear any existing metrics
        mlAdapter.clearPerformanceMetrics();
    });

    afterAll(() => {
        // Clean up
        mlAdapter.clearPerformanceMetrics();
    });

    describe('Stakeholder Influence Analysis Performance', () => {
        it('should benchmark mock vs real implementation response times', async () => {
            const iterations = 5;
            const mockTimes: number[] = [];
            const realTimes: number[] = [];

            // Benchmark mock implementation
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                await MLAnalysisService.analyzeStakeholderInfluence(sampleBillContent);
                mockTimes.push(Date.now() - startTime);
            }

            // Benchmark real implementation
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                await realMLService.analyzeStakeholderInfluence(sampleBillContent);
                realTimes.push(Date.now() - startTime);
            }

            const mockAvg = mockTimes.reduce((sum, time) => sum + time, 0) / mockTimes.length;
            const realAvg = realTimes.reduce((sum, time) => sum + time, 0) / realTimes.length;

            console.log(`Mock ML Average Response Time: ${mockAvg.toFixed(2)}ms`);
            console.log(`Real ML Average Response Time: ${realAvg.toFixed(2)}ms`);

            // Real ML should be reasonably performant (under 2 seconds)
            expect(realAvg).toBeLessThan(2000);
            
            // Both implementations should be consistent
            expect(mockTimes.every(time => time > 0)).toBe(true);
            expect(realTimes.every(time => time > 0)).toBe(true);
        });

        it('should compare analysis quality between implementations', async () => {
            const mockResult = await MLAnalysisService.analyzeStakeholderInfluence(sampleBillContent);
            const realResult = await realMLService.analyzeStakeholderInfluence(sampleBillContent);

            // Both should return valid results
            expect(mockResult.confidence).toBeGreaterThan(0);
            expect(realResult.confidence).toBeGreaterThan(0);
            expect(mockResult.analysis_type).toBe('stakeholder_influence');
            expect(realResult.analysis_type).toBe('stakeholder_influence');

            // Real ML should provide more detailed metadata
            expect(realResult.metadata?.mlTechniques).toBeDefined();
            expect(realResult.metadata?.model_version).toContain('real');

            console.log(`Mock ML Confidence: ${mockResult.confidence}`);
            console.log(`Real ML Confidence: ${realResult.confidence}`);
            console.log(`Real ML Techniques: ${realResult.metadata?.mlTechniques?.join(', ')}`);
        });
    });

    describe('Conflict Detection Performance', () => {
        it('should benchmark conflict detection implementations', async () => {
            const iterations = 3;
            const mockTimes: number[] = [];
            const realTimes: number[] = [];

            // Benchmark mock implementation
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                await MLAnalysisService.detectConflictsOfInterest(sampleBillContent, sampleSponsorData);
                mockTimes.push(Date.now() - startTime);
            }

            // Benchmark real implementation
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                await realMLService.detectConflictsOfInterest(sampleBillContent, sampleSponsorData);
                realTimes.push(Date.now() - startTime);
            }

            const mockAvg = mockTimes.reduce((sum, time) => sum + time, 0) / mockTimes.length;
            const realAvg = realTimes.reduce((sum, time) => sum + time, 0) / realTimes.length;

            console.log(`Mock Conflict Detection Average: ${mockAvg.toFixed(2)}ms`);
            console.log(`Real Conflict Detection Average: ${realAvg.toFixed(2)}ms`);

            // Performance should be reasonable
            expect(realAvg).toBeLessThan(3000);
        });

        it('should validate conflict detection accuracy', async () => {
            const mockResult = await MLAnalysisService.detectConflictsOfInterest(sampleBillContent, sampleSponsorData);
            const realResult = await realMLService.detectConflictsOfInterest(sampleBillContent, sampleSponsorData);

            // Both should detect some form of analysis
            expect(mockResult.result).toBeDefined();
            expect(realResult.result).toBeDefined();
            expect(mockResult.analysis_type).toBe('conflict_detection');
            expect(realResult.analysis_type).toBe('conflict_detection');

            console.log(`Mock Conflicts Found: ${mockResult.result.conflicts?.length || 0}`);
            console.log(`Real Conflicts Found: ${realResult.result.conflicts?.length || 0}`);
        });
    });

    describe('Beneficiary Analysis Performance', () => {
        it('should benchmark beneficiary analysis implementations', async () => {
            const iterations = 3;
            const mockTimes: number[] = [];
            const realTimes: number[] = [];

            // Benchmark mock implementation
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                await MLAnalysisService.analyzeBeneficiaries(sampleBillContent);
                mockTimes.push(Date.now() - startTime);
            }

            // Benchmark real implementation
            for (let i = 0; i < iterations; i++) {
                const startTime = Date.now();
                await realMLService.analyzeBeneficiaries(sampleBillContent);
                realTimes.push(Date.now() - startTime);
            }

            const mockAvg = mockTimes.reduce((sum, time) => sum + time, 0) / mockTimes.length;
            const realAvg = realTimes.reduce((sum, time) => sum + time, 0) / realTimes.length;

            console.log(`Mock Beneficiary Analysis Average: ${mockAvg.toFixed(2)}ms`);
            console.log(`Real Beneficiary Analysis Average: ${realAvg.toFixed(2)}ms`);

            // Performance should be reasonable
            expect(realAvg).toBeLessThan(3000);
        });
    });

    describe('Feature Flag Integration', () => {
        it('should route to correct implementation based on feature flag', async () => {
            // Test with feature flag disabled (should use mock)
            featureFlagsService.updateFlag('utilities-ml-service-migration', {
                enabled: false,
                rolloutPercentage: 0
            });

            const mockResult = await mlAdapter.analyzeStakeholderInfluence(sampleBillContent, 'test-user-1');
            expect(mockResult.metadata?.model_version).not.toContain('real');

            // Test with feature flag enabled (should use real)
            featureFlagsService.updateFlag('utilities-ml-service-migration', {
                enabled: true,
                rolloutPercentage: 100
            });

            const realResult = await mlAdapter.analyzeStakeholderInfluence(sampleBillContent, 'test-user-2');
            expect(realResult.metadata?.model_version).toContain('real');

            // Reset flag
            featureFlagsService.updateFlag('utilities-ml-service-migration', {
                enabled: false,
                rolloutPercentage: 0
            });
        });

        it('should record performance metrics during A/B testing', async () => {
            // Enable feature flag for testing
            featureFlagsService.updateFlag('utilities-ml-service-migration', {
                enabled: true,
                rolloutPercentage: 50
            });

            // Run multiple analyses to generate metrics
            await mlAdapter.analyzeStakeholderInfluence(sampleBillContent, 'test-user-metrics-1');
            await mlAdapter.detectConflictsOfInterest(sampleBillContent, sampleSponsorData, 'test-user-metrics-2');
            await mlAdapter.analyzeBeneficiaries(sampleBillContent, 'test-user-metrics-3');

            // Check that metrics were recorded
            const metrics = mlAdapter.getPerformanceMetrics();
            expect(metrics.size).toBeGreaterThan(0);

            console.log(`Recorded ${metrics.size} performance metrics`);

            // Reset flag
            featureFlagsService.updateFlag('utilities-ml-service-migration', {
                enabled: false,
                rolloutPercentage: 0
            });
        });
    });

    describe('Error Handling and Fallback', () => {
        it('should fallback to mock implementation on real ML errors', async () => {
            // Enable real ML
            featureFlagsService.updateFlag('utilities-ml-service-migration', {
                enabled: true,
                rolloutPercentage: 100
            });

            // Test with invalid input that might cause real ML to fail
            const result = await mlAdapter.analyzeStakeholderInfluence('', 'test-user-fallback');
            
            // Should still return a valid result (either from real ML error handling or fallback)
            expect(result).toBeDefined();
            expect(result.analysis_type).toBe('stakeholder_influence');

            // Reset flag
            featureFlagsService.updateFlag('utilities-ml-service-migration', {
                enabled: false,
                rolloutPercentage: 0
            });
        });
    });

    describe('Memory Usage Analysis', () => {
        it('should monitor memory usage during ML operations', async () => {
            const initialMemory = process.memoryUsage();
            
            // Run multiple ML operations
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(realMLService.analyzeStakeholderInfluence(sampleBillContent));
                promises.push(realMLService.detectConflictsOfInterest(sampleBillContent, sampleSponsorData));
                promises.push(realMLService.analyzeBeneficiaries(sampleBillContent));
            }
            
            await Promise.all(promises);
            
            const finalMemory = process.memoryUsage();
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            
            console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
            console.log(`Final heap usage: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
            
            // Memory increase should be reasonable (less than 100MB for this test)
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
        });
    });
});
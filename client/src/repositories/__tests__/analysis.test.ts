/**
 * Analysis Repository Unit Tests
 *
 * Tests the AnalysisRepository class methods with mocked API responses.
 * Focuses on bill analysis, conflict detection, and data validation.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { AnalysisRepository, BillAnalysis, ConflictAnalysisResult } from '../analysis';
import { UnifiedApiClientImpl } from '../../core/api/client';

// Mock the unified API client
jest.mock('../../core/api/client', () => ({
    UnifiedApiClientImpl: jest.fn(),
    globalApiClient: {
        getConfig: jest.fn(() => ({
            baseUrl: 'http://localhost:3000',
            timeout: 5000,
            retry: { maxRetries: 3, baseDelay: 1000, maxDelay: 5000, backoffMultiplier: 2 },
            cache: { defaultTTL: 300000, maxSize: 100, storage: 'memory' },
            websocket: { url: 'ws://localhost:3000', reconnect: { enabled: true } },
            headers: { 'Content-Type': 'application/json' }
        }))
    }
}));

describe('AnalysisRepository', () => {
    let repository: AnalysisRepository;
    let mockApiClient: jest.Mocked<UnifiedApiClientImpl>;

    const mockConfig = {
        baseEndpoint: '/api',
        cacheTTL: {
            analysis: 600000,
            conflict: 300000,
            batch: 120000
        },
        riskThresholds: {
            highConflict: 70,
            mediumConflict: 40,
            lowTransparency: 50,
            highInfluence: 7
        }
    };

    const mockBillAnalysis: BillAnalysis = {
        id: 'analysis-123',
        bill_id: 123,
        conflictScore: 65,
        transparencyRating: 75,
        stakeholderAnalysis: [
            {
                group: 'Environmental Groups',
                impactLevel: 'high',
                description: 'Significant impact on protected areas',
                affectedPopulation: 50000
            }
        ],
        constitutionalConcerns: ['Due process implications'],
        publicBenefit: 60,
        corporateInfluence: [
            {
                organization: 'Corp Inc',
                connectionType: 'financial',
                influenceLevel: 8,
                potentialConflict: true
            }
        ],
        timestamp: new Date('2024-01-01T00:00:00Z')
    };

    beforeEach(() => {
        // Create mock API client
        mockApiClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn()
        } as any;

        (UnifiedApiClientImpl as jest.Mock).mockImplementation(() => mockApiClient);

        repository = new AnalysisRepository(mockConfig);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('analyzeBill', () => {
        it('should analyze a bill successfully', async () => {
            const billId = 123;
            const mockResponse = {
                data: mockBillAnalysis,
                status: 200,
                statusText: 'OK',
                headers: {},
                timestamp: new Date().toISOString(),
                duration: 150,
                cached: false,
                fromFallback: false,
                requestId: 'req-123'
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            const result = await repository.analyzeBill(billId);

            expect(mockApiClient.get).toHaveBeenCalledWith(
                '/api/bills/123/analysis',
                expect.objectContaining({
                    cache: { ttl: mockConfig.cacheTTL.analysis }
                })
            );
            expect(result).toEqual(mockBillAnalysis);
        });

        it('should throw error for invalid bill ID', async () => {
            await expect(repository.analyzeBill(0)).rejects.toThrow('Invalid bill ID: must be a positive integer');
            await expect(repository.analyzeBill(-1)).rejects.toThrow('Invalid bill ID: must be a positive integer');
            await expect(repository.analyzeBill(1.5)).rejects.toThrow('Invalid bill ID: must be a positive integer');
        });

        it('should validate analysis data structure', async () => {
            const invalidData = {
                bill_id: 123,
                conflictScore: 65
                // Missing required fields
            };

            const mockResponse = {
                data: invalidData,
                status: 200,
                statusText: 'OK',
                headers: {},
                timestamp: new Date().toISOString(),
                duration: 150,
                cached: false,
                fromFallback: false,
                requestId: 'req-123'
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            await expect(repository.analyzeBill(123)).rejects.toThrow(
                'Invalid analysis data from API: missing fields id, transparencyRating'
            );
        });
    });

    describe('getConflictAnalysis', () => {
        it('should return conflict analysis with correct risk level', async () => {
            const billId = 123;
            const mockResponse = {
                data: mockBillAnalysis,
                status: 200,
                statusText: 'OK',
                headers: {},
                timestamp: new Date().toISOString(),
                duration: 150,
                cached: false,
                fromFallback: false,
                requestId: 'req-123'
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            const result = await repository.getConflictAnalysis(billId);

            expect(result).toEqual({
                overallRisk: 'medium', // conflictScore 65 > mediumConflict 40 but < highConflict 70
                conflicts: mockBillAnalysis.corporateInfluence.filter(c => c.potentialConflict),
                recommendations: expect.any(Array),
                analysisDate: mockBillAnalysis.timestamp
            });
        });

        it('should generate appropriate recommendations', async () => {
            const highConflictAnalysis = {
                ...mockBillAnalysis,
                conflictScore: 80,
                transparencyRating: 30,
                corporateInfluence: [
                    {
                        organization: 'Corp Inc',
                        connectionType: 'financial',
                        influenceLevel: 9,
                        potentialConflict: true
                    }
                ]
            };

            const mockResponse = {
                data: highConflictAnalysis,
                status: 200,
                statusText: 'OK',
                headers: {},
                timestamp: new Date().toISOString(),
                duration: 150,
                cached: false,
                fromFallback: false,
                requestId: 'req-123'
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            const result = await repository.getConflictAnalysis(123);

            expect(result.overallRisk).toBe('high');
            expect(result.recommendations).toContain(
                'Recommend independent ethics review before proceeding with vote'
            );
            expect(result.recommendations).toContain(
                'Require additional disclosure documentation and public comment period'
            );
            expect(result.recommendations).toContain(
                'Consider recusal from voting by sponsors with direct financial ties'
            );
        });
    });

    describe('analyzeBills', () => {
        it('should batch analyze multiple bills', async () => {
            const billIds = [123, 456];
            const mockAnalysis2 = { ...mockBillAnalysis, bill_id: 456, id: 'analysis-456' };

            mockApiClient.get
                .mockResolvedValueOnce({
                    data: mockBillAnalysis,
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    timestamp: new Date().toISOString(),
                    duration: 150,
                    cached: false,
                    fromFallback: false,
                    requestId: 'req-123'
                })
                .mockResolvedValueOnce({
                    data: mockAnalysis2,
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    timestamp: new Date().toISOString(),
                    duration: 150,
                    cached: false,
                    fromFallback: false,
                    requestId: 'req-456'
                });

            const result = await repository.analyzeBills(billIds);

            expect(result.size).toBe(2);
            expect(result.get(123)).toEqual(mockBillAnalysis);
            expect(result.get(456)).toEqual(mockAnalysis2);
        });

        it('should handle partial failures in batch analysis', async () => {
            const billIds = [123, 456];

            mockApiClient.get
                .mockResolvedValueOnce({
                    data: mockBillAnalysis,
                    status: 200,
                    statusText: 'OK',
                    headers: {},
                    timestamp: new Date().toISOString(),
                    duration: 150,
                    cached: false,
                    fromFallback: false,
                    requestId: 'req-123'
                })
                .mockRejectedValueOnce(new Error('API Error'));

            const result = await repository.analyzeBills(billIds);

            expect(result.size).toBe(1);
            expect(result.get(123)).toEqual(mockBillAnalysis);
            expect(result.has(456)).toBe(false);
        });
    });

    describe('getConstitutionalAnalysis', () => {
        it('should fetch constitutional analysis', async () => {
            const billId = 123;
            const mockConstitutionalData = {
                provisions: [{ id: 1, text: 'Test provision' }],
                concerns: ['Due process'],
                compliance_score: 85,
                recommendations: ['Review section 5']
            };

            const mockResponse = {
                data: mockConstitutionalData,
                status: 200,
                statusText: 'OK',
                headers: {},
                timestamp: new Date().toISOString(),
                duration: 150,
                cached: false,
                fromFallback: false,
                requestId: 'req-123'
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            const result = await repository.getConstitutionalAnalysis(billId);

            expect(mockApiClient.get).toHaveBeenCalledWith(
                '/api/bills/123/constitutional-analysis',
                expect.objectContaining({
                    cache: { ttl: mockConfig.cacheTTL.analysis }
                })
            );
            expect(result).toEqual(mockConstitutionalData);
        });
    });

    describe('getFinancialConflicts', () => {
        it('should fetch financial conflict analysis', async () => {
            const billId = 123;
            const mockFinancialData = {
                corporate_entities: [{ name: 'Corp Inc', type: 'lobbyist' }],
                financial_interests: [{ amount: 100000, source: 'Corp Inc' }],
                lobbying_activities: [{ organization: 'Corp Inc', amount: 50000 }],
                conflict_score: 75,
                risk_level: 'high'
            };

            const mockResponse = {
                data: mockFinancialData,
                status: 200,
                statusText: 'OK',
                headers: {},
                timestamp: new Date().toISOString(),
                duration: 150,
                cached: false,
                fromFallback: false,
                requestId: 'req-123'
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            const result = await repository.getFinancialConflicts(billId);

            expect(mockApiClient.get).toHaveBeenCalledWith(
                '/api/bills/123/financial-conflicts',
                expect.objectContaining({
                    cache: { ttl: mockConfig.cacheTTL.conflict }
                })
            );
            expect(result).toEqual(mockFinancialData);
        });
    });

    describe('getImpactAssessment', () => {
        it('should fetch impact assessment data', async () => {
            const billId = 123;
            const mockImpactData = {
                stakeholder_impacts: [
                    {
                        group: 'Environmental Groups',
                        impactLevel: 'high',
                        description: 'Significant impact',
                        affectedPopulation: 50000
                    }
                ],
                economic_impact: { gdp_change: -0.5, employment_change: -1000 },
                social_impact: { inequality_change: 2.1 },
                environmental_impact: { carbon_change: 15000 },
                overall_benefit_score: 45
            };

            const mockResponse = {
                data: mockImpactData,
                status: 200,
                statusText: 'OK',
                headers: {},
                timestamp: new Date().toISOString(),
                duration: 150,
                cached: false,
                fromFallback: false,
                requestId: 'req-123'
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            const result = await repository.getImpactAssessment(billId);

            expect(result).toEqual(mockImpactData);
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            mockApiClient.get.mockRejectedValue(new Error('Network error'));

            await expect(repository.analyzeBill(123)).rejects.toThrow('Network error');
        });

        it('should handle timeout errors', async () => {
            mockApiClient.get.mockRejectedValue(new Error('Request timeout'));

            await expect(repository.analyzeBill(123)).rejects.toThrow('Request timeout');
        });
    });

    describe('Caching', () => {
        it('should use appropriate cache TTL for different endpoints', async () => {
            const mockResponse = {
                data: mockBillAnalysis,
                status: 200,
                statusText: 'OK',
                headers: {},
                timestamp: new Date().toISOString(),
                duration: 150,
                cached: false,
                fromFallback: false,
                requestId: 'req-123'
            };

            mockApiClient.get.mockResolvedValue(mockResponse);

            // Test analysis endpoint caching
            await repository.analyzeBill(123);
            expect(mockApiClient.get).toHaveBeenCalledWith(
                '/api/bills/123/analysis',
                expect.objectContaining({ cache: { ttl: mockConfig.cacheTTL.analysis } })
            );

            // Test conflict endpoint caching
            await repository.getFinancialConflicts(123);
            expect(mockApiClient.get).toHaveBeenCalledWith(
                '/api/bills/123/financial-conflicts',
                expect.objectContaining({ cache: { ttl: mockConfig.cacheTTL.conflict } })
            );
        });
    });
});
/**
 * ML Service Adapter for Migration
 * 
 * Routes between mock and real ML implementations based on feature flags
 * Provides seamless migration with A/B testing capabilities
 */

import { logger } from '../../../../shared/core/src/index.js';
import { featureFlagsService } from '../../../infrastructure/migration/feature-flags.service.js';
import { MLAnalysisService } from './ml.service.js';
import { RealMLAnalysisService } from './real-ml.service.js';
import type {
    AnalysisResult,
    ImplementationWorkaroundDetection,
    ComprehensiveAnalysisResult
} from '../types/ml.js';

export class MLServiceAdapter {
    private static instance: MLServiceAdapter;
    private realMLService: RealMLAnalysisService;
    private performanceMetrics: Map<string, {
        responseTime: number;
        errorRate: number;
        successRate: number;
        timestamp: Date;
    }> = new Map();

    private constructor() {
        this.realMLService = RealMLAnalysisService.getInstance();
    }

    public static getInstance(): MLServiceAdapter {
        if (!MLServiceAdapter.instance) {
            MLServiceAdapter.instance = new MLServiceAdapter();
        }
        return MLServiceAdapter.instance;
    }

    /**
     * Route stakeholder influence analysis based on feature flag
     */
    async analyzeStakeholderInfluence(billContent: string, userId?: string): Promise<AnalysisResult> {
        const startTime = Date.now();
        const shouldUseMigration = await featureFlagsService.shouldUseMigration('utilities-ml-service-migration', userId);

        try {
            let result: AnalysisResult;

            if (shouldUseMigration) {
                logger.info('Using real ML service for stakeholder influence analysis', {
                    component: 'analytics',
                    operation: 'analyzeStakeholderInfluence',
                    userId,
                    implementation: 'real'
                });

                result = await this.realMLService.analyzeStakeholderInfluence(billContent);
            } else {
                logger.info('Using mock ML service for stakeholder influence analysis', {
                    component: 'analytics',
                    operation: 'analyzeStakeholderInfluence',
                    userId,
                    implementation: 'mock'
                });

                result = await MLAnalysisService.analyzeStakeholderInfluence(billContent);
            }

            // Record performance metrics
            await this.recordPerformanceMetrics('stakeholder_influence', {
                responseTime: Date.now() - startTime,
                errorRate: result.result.error ? 1 : 0,
                successRate: result.result.error ? 0 : 1,
                timestamp: new Date()
            }, userId, shouldUseMigration ? 'treatment' : 'control');

            return result;
        } catch (error) {
            logger.error('Error in ML adapter stakeholder influence analysis:', {
                component: 'analytics',
                operation: 'analyzeStakeholderInfluence',
                userId,
                implementation: shouldUseMigration ? 'real' : 'mock'
            }, error instanceof Error ? error : { message: String(error) });

            // Fallback to mock service on error
            if (shouldUseMigration) {
                logger.info('Falling back to mock ML service due to error', {
                    component: 'analytics',
                    operation: 'analyzeStakeholderInfluence',
                    userId
                });
                return await MLAnalysisService.analyzeStakeholderInfluence(billContent);
            }

            throw error;
        }
    }

    /**
     * Route conflict detection based on feature flag
     */
    async detectConflictsOfInterest(billContent: string, sponsorData: any, userId?: string): Promise<AnalysisResult> {
        const startTime = Date.now();
        const shouldUseMigration = await featureFlagsService.shouldUseMigration('utilities-ml-service-migration', userId);

        try {
            let result: AnalysisResult;

            if (shouldUseMigration) {
                logger.info('Using real ML service for conflict detection', {
                    component: 'analytics',
                    operation: 'detectConflictsOfInterest',
                    userId,
                    implementation: 'real'
                });

                result = await this.realMLService.detectConflictsOfInterest(billContent, sponsorData);
            } else {
                logger.info('Using mock ML service for conflict detection', {
                    component: 'analytics',
                    operation: 'detectConflictsOfInterest',
                    userId,
                    implementation: 'mock'
                });

                result = await MLAnalysisService.detectConflictsOfInterest(billContent, sponsorData);
            }

            // Record performance metrics
            await this.recordPerformanceMetrics('conflict_detection', {
                responseTime: Date.now() - startTime,
                errorRate: result.result.error ? 1 : 0,
                successRate: result.result.error ? 0 : 1,
                timestamp: new Date()
            }, userId, shouldUseMigration ? 'treatment' : 'control');

            return result;
        } catch (error) {
            logger.error('Error in ML adapter conflict detection:', {
                component: 'analytics',
                operation: 'detectConflictsOfInterest',
                userId,
                implementation: shouldUseMigration ? 'real' : 'mock'
            }, error instanceof Error ? error : { message: String(error) });

            // Fallback to mock service on error
            if (shouldUseMigration) {
                logger.info('Falling back to mock ML service due to error', {
                    component: 'analytics',
                    operation: 'detectConflictsOfInterest',
                    userId
                });
                return await MLAnalysisService.detectConflictsOfInterest(billContent, sponsorData);
            }

            throw error;
        }
    }

    /**
     * Route beneficiary analysis based on feature flag
     */
    async analyzeBeneficiaries(billContent: string, userId?: string): Promise<AnalysisResult> {
        const startTime = Date.now();
        const shouldUseMigration = await featureFlagsService.shouldUseMigration('utilities-ml-service-migration', userId);

        try {
            let result: AnalysisResult;

            if (shouldUseMigration) {
                logger.info('Using real ML service for beneficiary analysis', {
                    component: 'analytics',
                    operation: 'analyzeBeneficiaries',
                    userId,
                    implementation: 'real'
                });

                result = await this.realMLService.analyzeBeneficiaries(billContent);
            } else {
                logger.info('Using mock ML service for beneficiary analysis', {
                    component: 'analytics',
                    operation: 'analyzeBeneficiaries',
                    userId,
                    implementation: 'mock'
                });

                result = await MLAnalysisService.analyzeBeneficiaries(billContent);
            }

            // Record performance metrics
            await this.recordPerformanceMetrics('beneficiary_analysis', {
                responseTime: Date.now() - startTime,
                errorRate: result.result.error ? 1 : 0,
                successRate: result.result.error ? 0 : 1,
                timestamp: new Date()
            }, userId, shouldUseMigration ? 'treatment' : 'control');

            return result;
        } catch (error) {
            logger.error('Error in ML adapter beneficiary analysis:', {
                component: 'analytics',
                operation: 'analyzeBeneficiaries',
                userId,
                implementation: shouldUseMigration ? 'real' : 'mock'
            }, error instanceof Error ? error : { message: String(error) });

            // Fallback to mock service on error
            if (shouldUseMigration) {
                logger.info('Falling back to mock ML service due to error', {
                    component: 'analytics',
                    operation: 'analyzeBeneficiaries',
                    userId
                });
                return await MLAnalysisService.analyzeBeneficiaries(billContent);
            }

            throw error;
        }
    }

    /**
     * Record performance metrics for A/B testing
     */
    private async recordPerformanceMetrics(
        operation: string,
        metrics: {
            responseTime: number;
            errorRate: number;
            successRate: number;
            timestamp: Date;
        },
        userId?: string,
        cohort: 'control' | 'treatment' = 'control'
    ): Promise<void> {
        try {
            // Store metrics locally
            this.performanceMetrics.set(`${operation}-${Date.now()}`, metrics);

            // Record A/B testing metrics if user ID is available
            if (userId) {
                await featureFlagsService.recordMetrics({
                    component: 'ml-service',
                    userId,
                    cohort,
                    metrics: {
                        responseTime: metrics.responseTime,
                        errorRate: metrics.errorRate,
                        successRate: metrics.successRate
                    },
                    timestamp: metrics.timestamp
                });
            }

            logger.debug('Performance metrics recorded', {
                component: 'analytics',
                operation: 'recordPerformanceMetrics',
                operation_type: operation,
                cohort,
                metrics
            });
        } catch (error) {
            logger.error('Failed to record performance metrics:', {
                component: 'analytics',
                operation: 'recordPerformanceMetrics'
            }, error instanceof Error ? error : { message: String(error) });
        }
    }

    /**
     * Get performance metrics for analysis
     */
    getPerformanceMetrics(): Map<string, any> {
        return new Map(this.performanceMetrics);
    }

    /**
     * Clear performance metrics (for testing)
     */
    clearPerformanceMetrics(): void {
        this.performanceMetrics.clear();
    }
}

// Export adapter functions for backward compatibility
export const mlServiceAdapter = MLServiceAdapter.getInstance();

export async function adaptiveAnalyzeStakeholderInfluence(billContent: string, userId?: string): Promise<AnalysisResult> {
    return mlServiceAdapter.analyzeStakeholderInfluence(billContent, userId);
}

export async function adaptiveDetectConflictsOfInterest(billContent: string, sponsorData: any, userId?: string): Promise<AnalysisResult> {
    return mlServiceAdapter.detectConflictsOfInterest(billContent, sponsorData, userId);
}

export async function adaptiveAnalyzeBeneficiaries(billContent: string, userId?: string): Promise<AnalysisResult> {
    return mlServiceAdapter.analyzeBeneficiaries(billContent, userId);
}
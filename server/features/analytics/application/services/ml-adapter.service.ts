/**
 * ML Service Adapter for Migration
 * 
 * Routes between mock and real ML implementations based on feature flags
 * Provides seamless migration with A/B testing capabilities
 */

import { MLAnalysisService } from '@server/features/analytics/application/services/ml.service';
import { RealMLAnalysisService } from '@server/features/analytics/application/services/real-ml.service';
import { logger } from '@server/infrastructure/observability';
import type {
    AnalysisResult
} from '@shared/types/ml';

import { featureFlagsService } from '@server/infrastructure/migration/feature-flags.service';

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
    async analyzeStakeholderInfluence(billContent: string, user_id?: string): Promise<AnalysisResult> {
        const startTime = Date.now();
        const shouldUseMigration = await featureFlagsService.shouldUseMigration('utilities-ml-service-migration', user_id);

        try {
            let result: AnalysisResult;

            if (shouldUseMigration) {
                logger.info({
                    component: 'analytics',
                    operation: 'analyzeStakeholderInfluence',
                    user_id,
                    implementation: 'real'
                }, 'Using real ML service for stakeholder influence analysis');

                result = await this.realMLService.analyzeStakeholderInfluence(billContent);
            } else {
                logger.info({
                    component: 'analytics',
                    operation: 'analyzeStakeholderInfluence',
                    user_id,
                    implementation: 'mock'
                }, 'Using mock ML service for stakeholder influence analysis');

                result = await MLAnalysisService.analyzeStakeholderInfluence(billContent);
            }

            // Record performance metrics
            await this.recordPerformanceMetrics('stakeholder_influence', {
                responseTime: Date.now() - startTime,
                errorRate: result.result.error ? 1 : 0,
                successRate: result.result.error ? 0 : 1,
                timestamp: new Date()
            }, user_id, shouldUseMigration ? 'treatment' : 'control');

            return result;
        } catch (error) {
            logger.error({
                component: 'analytics',
                operation: 'analyzeStakeholderInfluence',
                user_id,
                implementation: shouldUseMigration ? 'real' : 'mock',
                err: error instanceof Error ? error : { message: String(error) }
            }, 'Error in ML adapter stakeholder influence analysis');

            // Fallback to mock service on error
            if (shouldUseMigration) {
                logger.info({
                    component: 'analytics',
                    operation: 'analyzeStakeholderInfluence',
                    user_id
                }, 'Falling back to mock ML service due to error');
                return await MLAnalysisService.analyzeStakeholderInfluence(billContent);
            }

            throw error;
        }
    }

    /**
     * Route conflict detection based on feature flag
     */
    async detectConflictsOfInterest(billContent: string, sponsorData: unknown, user_id?: string): Promise<AnalysisResult> {
        const startTime = Date.now();
        const shouldUseMigration = await featureFlagsService.shouldUseMigration('utilities-ml-service-migration', user_id);

        try {
            let result: AnalysisResult;

            if (shouldUseMigration) {
                logger.info({
                    component: 'analytics',
                    operation: 'detectConflictsOfInterest',
                    user_id,
                    implementation: 'real'
                }, 'Using real ML service for conflict detection');

                result = await this.realMLService.detectConflictsOfInterest(billContent, sponsorData);
            } else {
                logger.info({
                    component: 'analytics',
                    operation: 'detectConflictsOfInterest',
                    user_id,
                    implementation: 'mock'
                }, 'Using mock ML service for conflict detection');

                result = await MLAnalysisService.detectConflictsOfInterest(billContent, sponsorData);
            }

            // Record performance metrics
            await this.recordPerformanceMetrics('conflict_detection', {
                responseTime: Date.now() - startTime,
                errorRate: result.result.error ? 1 : 0,
                successRate: result.result.error ? 0 : 1,
                timestamp: new Date()
            }, user_id, shouldUseMigration ? 'treatment' : 'control');

            return result;
        } catch (error) {
            logger.error({
                component: 'analytics',
                operation: 'detectConflictsOfInterest',
                user_id,
                implementation: shouldUseMigration ? 'real' : 'mock',
                err: error instanceof Error ? error : { message: String(error) }
            }, 'Error in ML adapter conflict detection');

            // Fallback to mock service on error
            if (shouldUseMigration) {
                logger.info({
                    component: 'analytics',
                    operation: 'detectConflictsOfInterest',
                    user_id
                }, 'Falling back to mock ML service due to error');
                return await MLAnalysisService.detectConflictsOfInterest(billContent, sponsorData);
            }

            throw error;
        }
    }

    /**
     * Route beneficiary analysis based on feature flag
     */
    async analyzeBeneficiaries(billContent: string, user_id?: string): Promise<AnalysisResult> {
        const startTime = Date.now();
        const shouldUseMigration = await featureFlagsService.shouldUseMigration('utilities-ml-service-migration', user_id);

        try {
            let result: AnalysisResult;

            if (shouldUseMigration) {
                logger.info({
                    component: 'analytics',
                    operation: 'analyzeBeneficiaries',
                    user_id,
                    implementation: 'real'
                }, 'Using real ML service for beneficiary analysis');

                result = await this.realMLService.analyzeBeneficiaries(billContent);
            } else {
                logger.info({
                    component: 'analytics',
                    operation: 'analyzeBeneficiaries',
                    user_id,
                    implementation: 'mock'
                }, 'Using mock ML service for beneficiary analysis');

                result = await MLAnalysisService.analyzeBeneficiaries(billContent);
            }

            // Record performance metrics
            await this.recordPerformanceMetrics('beneficiary_analysis', {
                responseTime: Date.now() - startTime,
                errorRate: result.result.error ? 1 : 0,
                successRate: result.result.error ? 0 : 1,
                timestamp: new Date()
            }, user_id, shouldUseMigration ? 'treatment' : 'control');

            return result;
        } catch (error) {
            logger.error({
                component: 'analytics',
                operation: 'analyzeBeneficiaries',
                user_id,
                implementation: shouldUseMigration ? 'real' : 'mock',
                err: error instanceof Error ? error : { message: String(error) }
            }, 'Error in ML adapter beneficiary analysis');

            // Fallback to mock service on error
            if (shouldUseMigration) {
                logger.info({
                    component: 'analytics',
                    operation: 'analyzeBeneficiaries',
                    user_id
                }, 'Falling back to mock ML service due to error');
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
        user_id?: string,
        cohort: 'control' | 'treatment' = 'control'
    ): Promise<void> {
        try {
            // Store metrics locally
            this.performanceMetrics.set(`${operation}-${Date.now()}`, metrics);

            // Record A/B testing metrics if user ID is available
            if (user_id) {
                await featureFlagsService.recordMetrics({
                    component: 'ml-service',
                    user_id,
                    cohort,
                    metrics: {
                        responseTime: metrics.responseTime,
                        errorRate: metrics.errorRate,
                        successRate: metrics.successRate
                    },
                    timestamp: metrics.timestamp
                });
            }

            logger.debug({
                component: 'analytics',
                operation: 'recordPerformanceMetrics',
                operation_type: operation,
                cohort,
                metrics
            }, 'Performance metrics recorded');
        } catch (error) {
            logger.error({
                component: 'analytics',
                operation: 'recordPerformanceMetrics',
                err: error instanceof Error ? error : { message: String(error) }
            }, 'Failed to record performance metrics');
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

export async function adaptiveAnalyzeStakeholderInfluence(billContent: string, user_id?: string): Promise<AnalysisResult> {
    return mlServiceAdapter.analyzeStakeholderInfluence(billContent, user_id);
}

export async function adaptiveDetectConflictsOfInterest(billContent: string, sponsorData: unknown, user_id?: string): Promise<AnalysisResult> {
    return mlServiceAdapter.detectConflictsOfInterest(billContent, sponsorData, user_id);
}

export async function adaptiveAnalyzeBeneficiaries(billContent: string, user_id?: string): Promise<AnalysisResult> {
    return mlServiceAdapter.analyzeBeneficiaries(billContent, user_id);
}



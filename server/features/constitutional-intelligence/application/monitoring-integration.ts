/**
 * Constitutional Intelligence Monitoring Integration
 * 
 * Integrates constitutional analysis with monitoring system
 */

import { logger } from '@server/infrastructure/observability';

export interface ConstitutionalMetrics {
  totalAnalyses: number;
  averageProcessingTime: number;
  averageAlignmentScore: number;
  violationsByType: Record<string, number>;
  violationsBySeverity: Record<string, number>;
  cacheHitRate: number;
  errorRate: number;
}

/**
 * Monitoring Integration Service
 */
export class ConstitutionalMonitoring {
  private metrics: {
    analyses: number;
    totalProcessingTime: number;
    violations: Map<string, number>;
    severities: Map<string, number>;
    cacheHits: number;
    cacheMisses: number;
    errors: number;
  };

  constructor() {
    this.metrics = {
      analyses: 0,
      totalProcessingTime: 0,
      violations: new Map(),
      severities: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
    };
  }

  /**
   * Record analysis completion
   */
  recordAnalysis(
    processingTime: number,
    alignmentScore: number,
    violations: Array<{ violationType: string; severity: string }>,
    fromCache: boolean
  ): void {
    this.metrics.analyses++;
    this.metrics.totalProcessingTime += processingTime;

    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    // Track violations
    violations.forEach(v => {
      this.metrics.violations.set(
        v.violationType,
        (this.metrics.violations.get(v.violationType) || 0) + 1
      );
      this.metrics.severities.set(
        v.severity,
        (this.metrics.severities.get(v.severity) || 0) + 1
      );
    });

    logger.info({
      message: 'Constitutional analysis recorded',
      component: 'ConstitutionalMonitoring',
      processingTime,
      alignmentScore,
      violations: violations.length,
      fromCache,
    });
  }

  /**
   * Record analysis error
   */
  recordError(error: Error, billId: string): void {
    this.metrics.errors++;

    logger.error({
      message: 'Constitutional analysis error recorded',
      component: 'ConstitutionalMonitoring',
      billId,
      error: error.message,
      totalErrors: this.metrics.errors,
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): ConstitutionalMetrics {
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0;
    const errorRate = this.metrics.analyses > 0 ? this.metrics.errors / this.metrics.analyses : 0;
    const avgProcessingTime =
      this.metrics.analyses > 0 ? this.metrics.totalProcessingTime / this.metrics.analyses : 0;

    return {
      totalAnalyses: this.metrics.analyses,
      averageProcessingTime: avgProcessingTime,
      averageAlignmentScore: 0, // Would calculate from stored data
      violationsByType: Object.fromEntries(this.metrics.violations),
      violationsBySeverity: Object.fromEntries(this.metrics.severities),
      cacheHitRate,
      errorRate,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      analyses: 0,
      totalProcessingTime: 0,
      violations: new Map(),
      severities: new Map(),
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
    };

    logger.info({
      message: 'Constitutional monitoring metrics reset',
      component: 'ConstitutionalMonitoring',
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      errorRate: number;
      averageProcessingTime: number;
      cacheHitRate: number;
    };
  }> {
    const metrics = this.getMetrics();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (metrics.errorRate > 0.1) {
      status = 'unhealthy';
    } else if (metrics.errorRate > 0.05 || metrics.averageProcessingTime > 3000) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        errorRate: metrics.errorRate,
        averageProcessingTime: metrics.averageProcessingTime,
        cacheHitRate: metrics.cacheHitRate,
      },
    };
  }
}

// Singleton instance
export const constitutionalMonitoring = new ConstitutionalMonitoring();

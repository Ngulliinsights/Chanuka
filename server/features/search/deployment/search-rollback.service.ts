/**
 * Search Rollback Service
 * 
 * Handles rollback procedures with gradual traffic shifting and connection preservation
 * for search system components during deployment validation failures.
 */

import { featureFlagsService } from '@/infrastructure/migration/feature-flags.service.js';
import { searchPerformanceMonitor } from '@shared/monitoring/search-performance-monitor.js';
import { logger  } from '@shared/core';

export interface RollbackPlan {
  component: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  strategy: 'immediate' | 'gradual' | 'staged';
  trafficShiftStages: number[];
  preserveConnections: boolean;
  validationSteps: string[];
}

export interface RollbackExecution {
  id: string;
  component: string;
  plan: RollbackPlan;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  completionTime?: Date;
  stages: RollbackStage[];
  metrics: RollbackMetrics;
}

export interface RollbackStage {
  stage: number;
  description: string;
  targetPercentage: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime?: Date;
  completionTime?: Date;
  validationPassed: boolean;
  issues: string[];
}

export interface RollbackMetrics {
  trafficShifted: number;
  connectionsPreserved: number;
  errorsDuringRollback: number;
  rollbackDuration: number;
  performanceRecovery: {
    responseTimeImprovement: number;
    errorRateReduction: number;
    stabilityAchieved: boolean;
  };
}

export class SearchRollbackService {
  private activeRollbacks: Map<string, RollbackExecution> = new Map();
  private rollbackHistory: RollbackExecution[] = [];

  /**
   * Initiate rollback for a search component
   */
  async initiateRollback(
    component: string,
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    logger.warn(`🔄 Initiating rollback for ${component}`, { reason, severity });

    const rollbackId = `rollback-${component}-${Date.now()}`;
    
    // Create rollback plan based on severity
    const plan = this.createRollbackPlan(component, reason, severity);
    
    // Initialize rollback execution
    const execution: RollbackExecution = {
      id: rollbackId,
      component,
      plan,
      status: 'initiated',
      startTime: new Date(),
      stages: this.initializeRollbackStages(plan),
      metrics: {
        trafficShifted: 0,
        connectionsPreserved: 0,
        errorsDuringRollback: 0,
        rollbackDuration: 0,
        performanceRecovery: {
          responseTimeImprovement: 0,
          errorRateReduction: 0,
          stabilityAchieved: false
        }
      }
    };

    this.activeRollbacks.set(rollbackId, execution);

    // Execute rollback asynchronously
    this.executeRollback(rollbackId).catch(error => {
      logger.error(`❌ Rollback execution failed for ${component}:`, error);
      execution.status = 'failed';
    });

    return rollbackId;
  }

  /**
   * Create rollback plan based on component and severity
   */
  private createRollbackPlan(
    component: string,
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): RollbackPlan {
    let strategy: 'immediate' | 'gradual' | 'staged';
    let trafficShiftStages: number[];
    let preserveConnections: boolean;

    // Determine strategy based on severity
    switch (severity) {
      case 'critical':
        strategy = 'immediate';
        trafficShiftStages = [0]; // Immediate cutoff
        preserveConnections = false;
        break;
      case 'high':
        strategy = 'gradual';
        trafficShiftStages = [50, 25, 10, 0]; // Quick gradual rollback
        preserveConnections = true;
        break;
      case 'medium':
        strategy = 'staged';
        trafficShiftStages = [75, 50, 25, 10, 0]; // Staged rollback
        preserveConnections = true;
        break;
      case 'low':
        strategy = 'staged';
        trafficShiftStages = [90, 75, 50, 25, 10, 0]; // Slow staged rollback
        preserveConnections = true;
        break;
    }

    return {
      component,
      reason,
      severity,
      strategy,
      trafficShiftStages,
      preserveConnections,
      validationSteps: [
        'Verify feature flag update',
        'Monitor traffic distribution',
        'Validate performance metrics',
        'Check error rates',
        'Confirm system stability'
      ]
    };
  }

  /**
   * Initialize rollback stages
   */
  private initializeRollbackStages(plan: RollbackPlan): RollbackStage[] {
    return plan.trafficShiftStages.map((percentage, index) => ({
      stage: index + 1,
      description: `Shift traffic to ${percentage}% new implementation`,
      targetPercentage: percentage,
      status: 'pending',
      validationPassed: false,
      issues: []
    }));
  }

  /**
   * Execute rollback plan
   */
  private async executeRollback(rollbackId: string): Promise<void> {
    const execution = this.activeRollbacks.get(rollbackId);
    if (!execution) {
      throw new Error(`Rollback execution not found: ${rollbackId}`);
    }

    execution.status = 'in_progress';
    logger.info(`🔄 Executing rollback plan for ${execution.component}`);

    try {
      // Record baseline metrics before rollback
      const baselineMetrics = searchPerformanceMonitor.getCurrentMetrics(execution.component);

      // Execute each rollback stage
      for (const stage of execution.stages) {
        await this.executeRollbackStage(execution, stage);
        
        if (stage.status === 'failed') {
          throw new Error(`Rollback stage ${stage.stage} failed: ${stage.issues.join(', ')}`);
        }
      }

      // Final validation
      await this.performFinalValidation(execution);

      // Calculate final metrics
      const finalMetrics = searchPerformanceMonitor.getCurrentMetrics(execution.component);
      if (baselineMetrics && finalMetrics) {
        execution.metrics.performanceRecovery = {
          responseTimeImprovement: ((baselineMetrics.responseTime.p95 - finalMetrics.responseTime.p95) / baselineMetrics.responseTime.p95) * 100,
          errorRateReduction: ((baselineMetrics.errorRate - finalMetrics.errorRate) / baselineMetrics.errorRate) * 100,
          stabilityAchieved: finalMetrics.errorRate < 0.01 && finalMetrics.responseTime.p95 < 200
        };
      }

      execution.status = 'completed';
      execution.completionTime = new Date();
      execution.metrics.rollbackDuration = execution.completionTime.getTime() - execution.startTime.getTime();

      logger.info(`✅ Rollback completed successfully for ${execution.component}`, {
        duration: execution.metrics.rollbackDuration,
        trafficShifted: execution.metrics.trafficShifted,
        stabilityAchieved: execution.metrics.performanceRecovery.stabilityAchieved
      });

    } catch (error) {
      execution.status = 'failed';
      execution.completionTime = new Date();
      logger.error(`❌ Rollback failed for ${execution.component}:`, error);
      throw error;
    } finally {
      // Move to history
      this.rollbackHistory.push(execution);
      this.activeRollbacks.delete(rollbackId);
    }
  }

  /**
   * Execute individual rollback stage
   */
  private async executeRollbackStage(execution: RollbackExecution, stage: RollbackStage): Promise<void> {
    stage.status = 'in_progress';
    stage.startTime = new Date();

    logger.info(`🔄 Executing rollback stage ${stage.stage} for ${execution.component}`, {
      targetPercentage: stage.targetPercentage,
      description: stage.description
    });

    try {
      // Update feature flag to shift traffic
      const flagName = `search-${execution.component}`;
      await featureFlagsService.enableGradualRollout(flagName, stage.targetPercentage);

      // Wait for traffic to shift
      const waitTime = execution.plan.preserveConnections ? 30000 : 5000; // 30s or 5s
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Validate stage completion
      await this.validateRollbackStage(execution, stage);

      stage.status = 'completed';
      stage.completionTime = new Date();
      stage.validationPassed = true;

      execution.metrics.trafficShifted += Math.abs(stage.targetPercentage - (execution.stages[stage.stage - 2]?.targetPercentage || 100));

      logger.info(`✅ Rollback stage ${stage.stage} completed for ${execution.component}`);

    } catch (error) {
      stage.status = 'failed';
      stage.completionTime = new Date();
      stage.issues.push((error as Error).message);
      execution.metrics.errorsDuringRollback++;

      logger.error(`❌ Rollback stage ${stage.stage} failed for ${execution.component}:`, error);
      throw error;
    }
  }

  /**
   * Validate rollback stage
   */
  private async validateRollbackStage(execution: RollbackExecution, stage: RollbackStage): Promise<void> {
    const component = execution.component;
    const issues: string[] = [];

    // Verify feature flag update
    const flag = featureFlagsService.getFlag(`search-${component}`);
    if (!flag || flag.rolloutPercentage !== stage.targetPercentage) {
      issues.push(`Feature flag not updated correctly: expected ${stage.targetPercentage}%, got ${flag?.rolloutPercentage || 'undefined'}%`);
    }

    // Check performance metrics
    const currentMetrics = searchPerformanceMonitor.getCurrentMetrics(component);
    if (currentMetrics) {
      // Validate response time improvement
      if (currentMetrics.responseTime.p95 > 300) {
        issues.push(`P95 response time still high: ${currentMetrics.responseTime.p95}ms`);
      }

      // Validate error rate improvement
      if (currentMetrics.errorRate > 0.02) {
        issues.push(`Error rate still high: ${(currentMetrics.errorRate * 100).toFixed(2)}%`);
      }
    }

    // Wait for system stabilization
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second stabilization

    // Re-check metrics after stabilization
    const stabilizedMetrics = searchPerformanceMonitor.getCurrentMetrics(component);
    if (stabilizedMetrics && stabilizedMetrics.errorRate > 0.015) {
      issues.push(`System not stabilized after rollback stage: error rate ${(stabilizedMetrics.errorRate * 100).toFixed(2)}%`);
    }

    if (issues.length > 0) {
      stage.issues.push(...issues);
      throw new Error(`Rollback stage validation failed: ${issues.join(', ')}`);
    }
  }

  /**
   * Perform final rollback validation
   */
  private async performFinalValidation(execution: RollbackExecution): Promise<void> {
    logger.info(`🔍 Performing final validation for ${execution.component} rollback`);

    const component = execution.component;
    const issues: string[] = [];

    // Verify feature flag is at 0%
    const flag = featureFlagsService.getFlag(`search-${component}`);
    if (flag && flag.rolloutPercentage !== 0) {
      issues.push(`Feature flag not fully rolled back: ${flag.rolloutPercentage}%`);
    }

    // Validate system performance
    const metrics = searchPerformanceMonitor.getCurrentMetrics(component);
    if (metrics) {
      if (metrics.responseTime.p95 > 200) {
        issues.push(`P95 response time not recovered: ${metrics.responseTime.p95}ms`);
      }

      if (metrics.errorRate > 0.01) {
        issues.push(`Error rate not recovered: ${(metrics.errorRate * 100).toFixed(2)}%`);
      }

      if (metrics.throughput < 50) {
        issues.push(`Throughput not recovered: ${metrics.throughput} queries/sec`);
      }
    }

    // Test search functionality
    try {
      await this.testSearchFunctionality(component);
    } catch (error) {
      issues.push(`Search functionality test failed: ${(error as Error).message}`);
    }

    if (issues.length > 0) {
      throw new Error(`Final rollback validation failed: ${issues.join(', ')}`);
    }

    logger.info(`✅ Final validation passed for ${execution.component} rollback`);
  }

  /**
   * Test search functionality after rollback
   */
  private async testSearchFunctionality(component: string): Promise<void> {
    const testQueries = ['healthcare', 'budget', 'education'];
    
    for (const query of testQueries) {
      const startTime = Date.now();
      
      try {
        // Import search service dynamically to avoid circular dependencies
        const { searchService } = await import('../application/search-service.js');
        
        const results = await searchService.search({
          query,
          pagination: { page: 1, limit: 5 }
        });

        const responseTime = Date.now() - startTime;

        if (responseTime > 500) {
          throw new Error(`Search response time too high: ${responseTime}ms for query "${query}"`);
        }

        if (results.results.length === 0) {
          logger.warn(`No results returned for test query "${query}" after rollback`);
        }

      } catch (error) {
        throw new Error(`Search test failed for query "${query}": ${(error as Error).message}`);
      }
    }
  }

  /**
   * Get rollback status
   */
  getRollbackStatus(rollbackId: string): RollbackExecution | null {
    return this.activeRollbacks.get(rollbackId) || 
           this.rollbackHistory.find(r => r.id === rollbackId) || null;
  }

  /**
   * Get active rollbacks
   */
  getActiveRollbacks(): RollbackExecution[] {
    return Array.from(this.activeRollbacks.values());
  }

  /**
   * Get rollback history
   */
  getRollbackHistory(limit: number = 10): RollbackExecution[] {
    return this.rollbackHistory
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Cancel active rollback
   */
  async cancelRollback(rollbackId: string): Promise<void> {
    const execution = this.activeRollbacks.get(rollbackId);
    if (!execution) {
      throw new Error(`Active rollback not found: ${rollbackId}`);
    }

    if (execution.status === 'completed') {
      throw new Error(`Cannot cancel completed rollback: ${rollbackId}`);
    }

    execution.status = 'failed';
    execution.completionTime = new Date();

    // Move to history
    this.rollbackHistory.push(execution);
    this.activeRollbacks.delete(rollbackId);

    logger.warn(`🚫 Rollback cancelled: ${rollbackId}`);
  }

  /**
   * Emergency rollback - immediate traffic cutoff
   */
  async emergencyRollback(component: string, reason: string): Promise<string> {
    logger.error(`🚨 EMERGENCY ROLLBACK initiated for ${component}: ${reason}`);

    // Immediately disable feature flag
    await featureFlagsService.rollbackFeature(`search-${component}`);

    // Create emergency rollback record
    const rollbackId = `emergency-${component}-${Date.now()}`;
    const execution: RollbackExecution = {
      id: rollbackId,
      component,
      plan: {
        component,
        reason: `EMERGENCY: ${reason}`,
        severity: 'critical',
        strategy: 'immediate',
        trafficShiftStages: [0],
        preserveConnections: false,
        validationSteps: ['Immediate traffic cutoff', 'Verify system stability']
      },
      status: 'completed',
      startTime: new Date(),
      completionTime: new Date(),
      stages: [{
        stage: 1,
        description: 'Emergency traffic cutoff',
        targetPercentage: 0,
        status: 'completed',
        startTime: new Date(),
        completionTime: new Date(),
        validationPassed: true,
        issues: []
      }],
      metrics: {
        trafficShifted: 100,
        connectionsPreserved: 0,
        errorsDuringRollback: 0,
        rollbackDuration: 0,
        performanceRecovery: {
          responseTimeImprovement: 0,
          errorRateReduction: 0,
          stabilityAchieved: false
        }
      }
    };

    this.rollbackHistory.push(execution);

    logger.error(`🚨 Emergency rollback completed for ${component}`);
    return rollbackId;
  }

  /**
   * Generate rollback report
   */
  generateRollbackReport(): any {
    const activeRollbacks = this.getActiveRollbacks();
    const recentHistory = this.getRollbackHistory(20);

    const successfulRollbacks = recentHistory.filter(r => r.status === 'completed').length;
    const failedRollbacks = recentHistory.filter(r => r.status === 'failed').length;
    const successRate = recentHistory.length > 0 ? (successfulRollbacks / recentHistory.length) * 100 : 100;

    const avgRollbackDuration = recentHistory.length > 0
      ? recentHistory.reduce((sum, r) => sum + r.metrics.rollbackDuration, 0) / recentHistory.length
      : 0;

    return {
      timestamp: new Date(),
      summary: {
        activeRollbacks: activeRollbacks.length,
        totalRollbacks: recentHistory.length,
        successRate,
        avgDuration: avgRollbackDuration,
        emergencyRollbacks: recentHistory.filter(r => r.plan.severity === 'critical').length
      },
      activeRollbacks,
      recentHistory: recentHistory.slice(0, 10),
      recommendations: this.generateRollbackRecommendations(recentHistory)
    };
  }

  /**
   * Generate rollback recommendations
   */
  private generateRollbackRecommendations(history: RollbackExecution[]): string[] {
    const recommendations: string[] = [];

    const recentFailures = history.filter(r => 
      r.status === 'failed' && 
      r.startTime > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (recentFailures.length > 2) {
      recommendations.push('High rollback failure rate detected - review deployment procedures');
    }

    const emergencyRollbacks = history.filter(r => r.plan.severity === 'critical');
    if (emergencyRollbacks.length > 0) {
      recommendations.push('Emergency rollbacks detected - investigate root causes');
    }

    const slowRollbacks = history.filter(r => r.metrics.rollbackDuration > 300000); // 5 minutes
    if (slowRollbacks.length > 0) {
      recommendations.push('Slow rollback procedures detected - optimize rollback strategies');
    }

    if (recommendations.length === 0) {
      recommendations.push('Rollback procedures operating within normal parameters');
    }

    return recommendations;
  }
}

// Export singleton instance
export const searchRollbackService = new SearchRollbackService();

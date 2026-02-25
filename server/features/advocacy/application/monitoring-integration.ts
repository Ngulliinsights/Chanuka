/**
 * Advocacy Coordination Monitoring Integration
 * 
 * Integrates advocacy features with monitoring system
 */

import { logger } from '@server/infrastructure/observability';

export interface AdvocacyMetrics {
  campaigns: {
    total: number;
    active: number;
    completed: number;
    averageParticipants: number;
    successRate: number;
  };
  actions: {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
    averageTimeToComplete: number;
  };
  impact: {
    totalImpacts: number;
    billsInfluenced: number;
    averageAttribution: number;
  };
  performance: {
    apiResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
  };
}

export class AdvocacyMonitoring {
  private metrics: {
    campaigns: Map<string, number>;
    actions: Map<string, number>;
    impacts: number;
    apiCalls: number;
    errors: number;
    totalResponseTime: number;
  };

  constructor() {
    this.metrics = {
      campaigns: new Map(),
      actions: new Map(),
      impacts: 0,
      apiCalls: 0,
      errors: 0,
      totalResponseTime: 0,
    };
  }

  /**
   * Record campaign creation
   */
  recordCampaignCreated(campaignId: string, status: string): void {
    this.metrics.campaigns.set(`${status}_count`, (this.metrics.campaigns.get(`${status}_count`) || 0) + 1);
    
    logger.info('Campaign created', {
      component: 'AdvocacyMonitoring',
      campaignId,
      status,
    });
  }

  /**
   * Record campaign status change
   */
  recordCampaignStatusChange(campaignId: string, oldStatus: string, newStatus: string): void {
    this.metrics.campaigns.set(`${oldStatus}_count`, (this.metrics.campaigns.get(`${oldStatus}_count`) || 1) - 1);
    this.metrics.campaigns.set(`${newStatus}_count`, (this.metrics.campaigns.get(`${newStatus}_count`) || 0) + 1);
    
    logger.info('Campaign status changed', {
      component: 'AdvocacyMonitoring',
      campaignId,
      oldStatus,
      newStatus,
    });
  }

  /**
   * Record action completion
   */
  recordActionCompleted(actionId: string, timeToComplete: number): void {
    this.metrics.actions.set('completed', (this.metrics.actions.get('completed') || 0) + 1);
    this.metrics.actions.set('total_time', (this.metrics.actions.get('total_time') || 0) + timeToComplete);
    
    logger.info('Action completed', {
      component: 'AdvocacyMonitoring',
      actionId,
      timeToComplete,
    });
  }

  /**
   * Record impact
   */
  recordImpact(campaignId: string, impactType: string, value: number): void {
    this.metrics.impacts++;
    
    logger.info('Impact recorded', {
      component: 'AdvocacyMonitoring',
      campaignId,
      impactType,
      value,
    });
  }

  /**
   * Record API call
   */
  recordApiCall(endpoint: string, responseTime: number, success: boolean): void {
    this.metrics.apiCalls++;
    this.metrics.totalResponseTime += responseTime;
    
    if (!success) {
      this.metrics.errors++;
    }
    
    logger.debug('API call recorded', {
      component: 'AdvocacyMonitoring',
      endpoint,
      responseTime,
      success,
    });
  }

  /**
   * Record error
   */
  recordError(error: Error, context: Record<string, any>): void {
    this.metrics.errors++;
    
    logger.error('Advocacy error recorded', {
      component: 'AdvocacyMonitoring',
      error: error.message,
      ...context,
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): AdvocacyMetrics {
    const completedActions = this.metrics.actions.get('completed') || 0;
    const totalTime = this.metrics.actions.get('total_time') || 0;
    const avgResponseTime = this.metrics.apiCalls > 0 ? this.metrics.totalResponseTime / this.metrics.apiCalls : 0;
    const errorRate = this.metrics.apiCalls > 0 ? this.metrics.errors / this.metrics.apiCalls : 0;

    return {
      campaigns: {
        total: Array.from(this.metrics.campaigns.values()).reduce((sum, val) => sum + val, 0),
        active: this.metrics.campaigns.get('active_count') || 0,
        completed: this.metrics.campaigns.get('completed_count') || 0,
        averageParticipants: 0, // Would calculate from database
        successRate: 0, // Would calculate from database
      },
      actions: {
        total: Array.from(this.metrics.actions.values()).reduce((sum, val) => sum + val, 0),
        completed: completedActions,
        pending: this.metrics.actions.get('pending') || 0,
        completionRate: 0, // Would calculate from database
        averageTimeToComplete: completedActions > 0 ? totalTime / completedActions : 0,
      },
      impact: {
        totalImpacts: this.metrics.impacts,
        billsInfluenced: 0, // Would calculate from database
        averageAttribution: 0, // Would calculate from database
      },
      performance: {
        apiResponseTime: avgResponseTime,
        errorRate,
        cacheHitRate: 0, // Would calculate from cache stats
      },
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      campaigns: new Map(),
      actions: new Map(),
      impacts: 0,
      apiCalls: 0,
      errors: 0,
      totalResponseTime: 0,
    };
    
    logger.info('Advocacy monitoring metrics reset', {
      component: 'AdvocacyMonitoring',
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: {
      errorRate: number;
      averageResponseTime: number;
      activeCampaigns: number;
    };
  }> {
    const metrics = this.getMetrics();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (metrics.performance.errorRate > 0.1) {
      status = 'unhealthy';
    } else if (metrics.performance.errorRate > 0.05 || metrics.performance.apiResponseTime > 1000) {
      status = 'degraded';
    }

    return {
      status,
      details: {
        errorRate: metrics.performance.errorRate,
        averageResponseTime: metrics.performance.apiResponseTime,
        activeCampaigns: metrics.campaigns.active,
      },
    };
  }
}

// Singleton instance
export const advocacyMonitoring = new AdvocacyMonitoring();

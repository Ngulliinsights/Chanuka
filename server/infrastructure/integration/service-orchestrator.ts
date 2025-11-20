// ============================================================================
// SERVICE ORCHESTRATOR - Integration Layer
// ============================================================================
// Coordinates interactions between different services and ensures data consistency

import { logger } from '@shared/core/index.js';
import { databaseService } from '../database/database-service.js';
import { CampaignDomainService } from '@server/features/advocacy/domain/services/campaign-domain-service.ts';
import { searchService } from '@server/features/search/application/search-service.ts';
import { RecommendationService } from '@server/features/recommendation/application/RecommendationService.ts';
import { ConstitutionalAnalyzer } from '@server/features/constitutional-analysis/application/constitutional-analyzer.ts';
import { StructureExtractorService } from '@server/features/argument-intelligence/application/structure-extractor.ts';
import { governmentDataIntegrationService } from '@server/features/government-data/services/government-data-integration.service.ts';

export interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: Date;
  errorCount: number;
  details?: Record<string, any>;
}

export interface IntegrationEvent {
  eventType: string;
  sourceService: string;
  targetServices: string[];
  payload: any;
  timestamp: Date;
  correlationId: string;
}

export interface CrossServiceOperation {
  operationId: string;
  services: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  results: Record<string, any>;
  errors: Record<string, string>;
}

/**
 * Service Orchestrator
 * 
 * Manages cross-service operations and ensures data consistency across the platform.
 * Handles service health monitoring, event coordination, and transaction management.
 */
export class ServiceOrchestrator {
  private serviceHealthCache = new Map<string, ServiceHealth>();
  private activeOperations = new Map<string, CrossServiceOperation>();
  private eventQueue: IntegrationEvent[] = [];
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Orchestrate bill creation with all related services
   */
  async orchestrateBillCreation(billData: any, user_id: string): Promise<{
    bill: any;
    searchIndexed: boolean;
    analysisQueued: boolean;
    recommendationsUpdated: boolean;
  }> {
    const operationId = this.generateOperationId();
    const operation: CrossServiceOperation = {
      operationId,
      services: ['bills', 'search', 'constitutional-analysis', 'recommendations'],
      status: 'pending',
      startTime: new Date(),
      results: {},
      errors: {}
    };

    this.activeOperations.set(operationId, operation);
    operation.status = 'in_progress';

    try {
      logger.info('🔄 Starting bill creation orchestration', {
        operationId,
        billTitle: billData.title,
        user_id
      });

      // Step 1: Create bill in database
      const bill = await databaseService.withTransaction(async () => {
        // Bill creation logic would go here
        // For now, simulate bill creation
        return {
          id: this.generateId(),
          ...billData,
          createdBy: user_id,
          created_at: new Date()
        };
      });

      operation.results.bill = bill;

      // Step 2: Index bill for search (async)
      let searchIndexed = false;
      try {
        await this.indexBillForSearch(bill);
        searchIndexed = true;
        operation.results.searchIndexed = true;
      } catch (error) {
        operation.errors.search = error instanceof Error ? error.message : 'Search indexing failed';
        logger.warn('Search indexing failed for bill', { bill_id: bill.id, error });
      }

      // Step 3: Queue constitutional analysis (async)
      let analysisQueued = false;
      try {
        await this.queueConstitutionalAnalysis(bill);
        analysisQueued = true;
        operation.results.analysisQueued = true;
      } catch (error) {
        operation.errors.analysis = error instanceof Error ? error.message : 'Analysis queueing failed';
        logger.warn('Constitutional analysis queueing failed', { bill_id: bill.id, error });
      }

      // Step 4: Update recommendation models (async)
      let recommendationsUpdated = false;
      try {
        await this.updateRecommendationModels(bill);
        recommendationsUpdated = true;
        operation.results.recommendationsUpdated = true;
      } catch (error) {
        operation.errors.recommendations = error instanceof Error ? error.message : 'Recommendations update failed';
        logger.warn('Recommendations update failed', { bill_id: bill.id, error });
      }

      // Step 5: Emit integration event
      await this.emitIntegrationEvent({
        eventType: 'bill_created',
        sourceService: 'bills',
        targetServices: ['search', 'constitutional-analysis', 'recommendations', 'notifications'],
        payload: { bill, user_id },
        timestamp: new Date(),
        correlationId: operationId
      });

      operation.status = 'completed';
      operation.endTime = new Date();

      logger.info('✅ Bill creation orchestration completed', {
        operationId,
        bill_id: bill.id,
        duration: operation.endTime.getTime() - operation.startTime.getTime(),
        searchIndexed,
        analysisQueued,
        recommendationsUpdated
      });

      return {
        bill,
        searchIndexed,
        analysisQueued,
        recommendationsUpdated
      };

    } catch (error) {
      operation.status = 'failed';
      operation.endTime = new Date();
      operation.errors.general = error instanceof Error ? error.message : 'Unknown error';

      logger.error('❌ Bill creation orchestration failed', {
        operationId,
        error,
        duration: operation.endTime.getTime() - operation.startTime.getTime()
      });

      throw error;
    } finally {
      // Clean up operation after 1 hour
      setTimeout(() => {
        this.activeOperations.delete(operationId);
      }, 3600000);
    }
  }

  /**
   * Orchestrate campaign creation with cross-service coordination
   */
  async orchestrateCampaignCreation(
    campaignData: any, 
    user_id: string,
    campaignService: CampaignDomainService
  ): Promise<{
    campaign: any;
    actionsCreated: number;
    participantsNotified: boolean;
    searchIndexed: boolean;
  }> {
    const operationId = this.generateOperationId();
    const operation: CrossServiceOperation = {
      operationId,
      services: ['advocacy', 'search', 'notifications', 'recommendations'],
      status: 'pending',
      startTime: new Date(),
      results: {},
      errors: {}
    };

    this.activeOperations.set(operationId, operation);
    operation.status = 'in_progress';

    try {
      logger.info('🔄 Starting campaign creation orchestration', {
        operationId,
        campaignTitle: campaignData.title,
        user_id
      });

      // Step 1: Create campaign
      const campaign = await campaignService.createCampaign(campaignData, user_id);
      operation.results.campaign = campaign;

      // Step 2: Create default actions based on campaign type
      const actionsCreated = await this.createDefaultCampaignActions(campaign);
      operation.results.actionsCreated = actionsCreated;

      // Step 3: Index campaign for search
      let searchIndexed = false;
      try {
        await this.indexCampaignForSearch(campaign);
        searchIndexed = true;
        operation.results.searchIndexed = true;
      } catch (error) {
        operation.errors.search = error instanceof Error ? error.message : 'Search indexing failed';
      }

      // Step 4: Notify potential participants
      let participantsNotified = false;
      try {
        await this.notifyPotentialParticipants(campaign);
        participantsNotified = true;
        operation.results.participantsNotified = true;
      } catch (error) {
        operation.errors.notifications = error instanceof Error ? error.message : 'Notification failed';
      }

      // Step 5: Update recommendation models
      try {
        await this.updateCampaignRecommendations(campaign);
        operation.results.recommendationsUpdated = true;
      } catch (error) {
        operation.errors.recommendations = error instanceof Error ? error.message : 'Recommendations update failed';
      }

      operation.status = 'completed';
      operation.endTime = new Date();

      logger.info('✅ Campaign creation orchestration completed', {
        operationId,
        campaign_id: campaign.id,
        actionsCreated,
        duration: operation.endTime.getTime() - operation.startTime.getTime()
      });

      return {
        campaign,
        actionsCreated,
        participantsNotified,
        searchIndexed
      };

    } catch (error) {
      operation.status = 'failed';
      operation.endTime = new Date();
      operation.errors.general = error instanceof Error ? error.message : 'Unknown error';

      logger.error('❌ Campaign creation orchestration failed', {
        operationId,
        error
      });

      throw error;
    }
  }

  /**
   * Orchestrate comment processing with argument intelligence
   */
  async orchestrateCommentProcessing(
    commentData: any,
    user_id: string,
    bill_id: string
  ): Promise<{
    comment: any;
    argumentsExtracted: number;
    searchIndexed: boolean;
    recommendationsUpdated: boolean;
  }> {
    const operationId = this.generateOperationId();
    
    try {
      logger.info('🔄 Starting comment processing orchestration', {
        operationId,
        bill_id,
        user_id
      });

      // Step 1: Create comment
      const comment = await databaseService.withTransaction(async () => {
        // Comment creation logic
        return {
          id: this.generateId(),
          ...commentData,
          user_id,
          bill_id,
          created_at: new Date()
        };
      });

      // Step 2: Extract arguments using AI
      let argumentsExtracted = 0;
      try {
        const structureExtractor = new StructureExtractorService(
          null as any, // Would be properly injected
          null as any,
          null as any
        );

        const extractedArguments = await structureExtractor.extractArguments(
          comment.content,
          {
            bill_id,
            userContext: {
              county: 'Nairobi', // Would come from user profile
              occupation: 'citizen'
            },
            submissionContext: {
              submissionMethod: 'web',
              timestamp: new Date()
            }
          }
        );

        argumentsExtracted = extractedArguments.length;
      } catch (error) {
        logger.warn('Argument extraction failed', { comment_id: comment.id, error });
      }

      // Step 3: Index for search
      let searchIndexed = false;
      try {
        await this.indexCommentForSearch(comment);
        searchIndexed = true;
      } catch (error) {
        logger.warn('Comment search indexing failed', { comment_id: comment.id, error });
      }

      // Step 4: Update recommendations
      let recommendationsUpdated = false;
      try {
        await this.updateUserRecommendations(user_id, comment);
        recommendationsUpdated = true;
      } catch (error) {
        logger.warn('Recommendations update failed', { comment_id: comment.id, error });
      }

      logger.info('✅ Comment processing orchestration completed', {
        operationId,
        comment_id: comment.id,
        argumentsExtracted,
        searchIndexed,
        recommendationsUpdated
      });

      return {
        comment,
        argumentsExtracted,
        searchIndexed,
        recommendationsUpdated
      };

    } catch (error) {
      logger.error('❌ Comment processing orchestration failed', {
        operationId,
        error
      });

      throw error;
    }
  }

  /**
   * Monitor service health across the platform
   */
  async checkServiceHealth(): Promise<ServiceHealth[]> {
    const services = [
      'database',
      'search',
      'recommendations',
      'constitutional-analysis',
      'argument-intelligence',
      'advocacy',
      'government-data',
      'notifications'
    ];

    const healthChecks = services.map(service => this.checkIndividualServiceHealth(service));
    const results = await Promise.allSettled(healthChecks);

    const healthStatuses: ServiceHealth[] = [];

    results.forEach((result, index) => {
      const serviceName = services[index];
      
      if (result.status === 'fulfilled') {
        healthStatuses.push(result.value);
      } else {
        healthStatuses.push({
          serviceName,
          status: 'unhealthy',
          responseTime: -1,
          lastChecked: new Date(),
          errorCount: 1,
          details: { error: result.reason }
        });
      }

      // Cache the result
      this.serviceHealthCache.set(serviceName, healthStatuses[healthStatuses.length - 1]);
    });

    return healthStatuses;
  }

  /**
   * Get current operation status
   */
  getOperationStatus(operationId: string): CrossServiceOperation | null {
    return this.activeOperations.get(operationId) || null;
  }

  /**
   * Get all active operations
   */
  getActiveOperations(): CrossServiceOperation[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Get service health summary
   */
  getServiceHealthSummary(): {
    healthy: number;
    degraded: number;
    unhealthy: number;
    total: number;
    services: ServiceHealth[];
  } {
    const services = Array.from(this.serviceHealthCache.values());
    
    return {
      healthy: services.filter(s => s.status === 'healthy').length,
      degraded: services.filter(s => s.status === 'degraded').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
      total: services.length,
      services
    };
  }

  // Private helper methods

  private async checkIndividualServiceHealth(serviceName: string): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      switch (serviceName) {
        case 'database':
          await databaseService.healthCheck();
          break;
        case 'search':
          await searchService.search({ query: 'health-check', pagination: { page: 1, limit: 1 } });
          break;
        case 'government-data':
          await governmentDataIntegrationService.getIntegrationStatus();
          break;
        default:
          // For other services, perform a basic ping
          await this.pingService(serviceName);
      }

      const responseTime = Date.now() - startTime;
      
      return {
        serviceName,
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date(),
        errorCount: 0
      };

    } catch (error) {
      return {
        serviceName,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        errorCount: 1,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async pingService(serviceName: string): Promise<void> {
    // Simulate service ping - in real implementation, this would make actual health check calls
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }

  private async indexBillForSearch(bill: any): Promise<void> {
    // Index bill in search service
    logger.debug('Indexing bill for search', { bill_id: bill.id });
    // Implementation would call search service indexing
  }

  private async queueConstitutionalAnalysis(bill: any): Promise<void> {
    // Queue bill for constitutional analysis
    logger.debug('Queueing constitutional analysis', { bill_id: bill.id });
    // Implementation would queue analysis job
  }

  private async updateRecommendationModels(bill: any): Promise<void> {
    // Update recommendation models with new bill
    logger.debug('Updating recommendation models', { bill_id: bill.id });
    // Implementation would update ML models
  }

  private async createDefaultCampaignActions(campaign: any): Promise<number> {
    // Create default actions based on campaign type and objectives
    const defaultActions = [
      {
        title: 'Contact Your Representative',
        type: 'contact_representative',
        priority: 8
      },
      {
        title: 'Share on Social Media',
        type: 'social_media',
        priority: 6
      }
    ];

    // Implementation would create actual actions
    return defaultActions.length;
  }

  private async indexCampaignForSearch(campaign: any): Promise<void> {
    logger.debug('Indexing campaign for search', { campaign_id: campaign.id });
  }

  private async notifyPotentialParticipants(campaign: any): Promise<void> {
    logger.debug('Notifying potential participants', { campaign_id: campaign.id });
  }

  private async updateCampaignRecommendations(campaign: any): Promise<void> {
    logger.debug('Updating campaign recommendations', { campaign_id: campaign.id });
  }

  private async indexCommentForSearch(comment: any): Promise<void> {
    logger.debug('Indexing comment for search', { comment_id: comment.id });
  }

  private async updateUserRecommendations(user_id: string, comment: any): Promise<void> {
    logger.debug('Updating user recommendations', { user_id, comment_id: comment.id });
  }

  private async emitIntegrationEvent(event: IntegrationEvent): Promise<void> {
    this.eventQueue.push(event);
    logger.debug('Integration event emitted', {
      eventType: event.eventType,
      sourceService: event.sourceService,
      targetServices: event.targetServices
    });

    // Process event queue asynchronously
    setImmediate(() => this.processEventQueue());
  }

  private async processEventQueue(): Promise<void> {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        try {
          await this.processIntegrationEvent(event);
        } catch (error) {
          logger.error('Failed to process integration event', { event, error });
        }
      }
    }
  }

  private async processIntegrationEvent(event: IntegrationEvent): Promise<void> {
    // Process integration event - notify target services, update caches, etc.
    logger.debug('Processing integration event', {
      eventType: event.eventType,
      correlationId: event.correlationId
    });
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      try {
        await this.checkServiceHealth();
      } catch (error) {
        logger.error('Health monitoring failed', error);
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const serviceOrchestrator = new ServiceOrchestrator();

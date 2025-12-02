// ============================================================================
// ADVOCACY COORDINATION - Service Factory
// ============================================================================

import { CampaignService } from './application/campaign-service.js';
import { ActionCoordinator } from './application/action-coordinator.js';
import { CoalitionBuilder } from './application/coalition-builder.js';
import { ImpactTracker } from './application/impact-tracker.js';
import { CampaignDomainService } from './domain/services/campaign-domain-service.js';
// Repository implementations removed - using direct service calls
import { NotificationService } from './infrastructure/services/notification-service.js';
import { RepresentativeContactService } from './infrastructure/services/representative-contact-service.js';
import { InMemoryAdvocacyEventPublisher } from './domain/events/advocacy-events.js';
import { getAdvocacyConfig } from './config/advocacy-config.js';
import { database } from '@shared/core';

export interface AdvocacyServiceDependencies {
  campaignService: CampaignService;
  actionCoordinator: ActionCoordinator;
  coalitionBuilder: CoalitionBuilder;
  impactTracker: ImpactTracker;
  notificationService: NotificationService;
  representativeContactService: RepresentativeContactService;
}

export function createAdvocacyService(): AdvocacyServiceDependencies {
  // Configuration
  const config = getAdvocacyConfig();
  
  // Event publisher
  const eventPublisher = new InMemoryAdvocacyEventPublisher();
  
  // Repositories
  const campaignRepository = new CampaignRepositoryImpl(database);
  const actionRepository = new ActionRepositoryImpl(database);
  
  // Domain services
  const campaignDomainService = new CampaignDomainService(
    campaignRepository,
    actionRepository
  );
  
  // Infrastructure services
  const notificationService = new NotificationService(config.notifications);
  const representativeContactService = new RepresentativeContactService(config.representatives);
  
  // Application services
  const campaignService = new CampaignService(
    campaignRepository,
    campaignDomainService
  );
  
  const actionCoordinator = new ActionCoordinator(
    actionRepository,
    campaignRepository
  );
  
  const coalitionBuilder = new CoalitionBuilder(
    campaignRepository,
    actionRepository,
    eventPublisher
  );
  
  const impactTracker = new ImpactTracker(
    campaignRepository,
    actionRepository,
    eventPublisher
  );
  
  return {
    campaignService,
    actionCoordinator,
    coalitionBuilder,
    impactTracker,
    notificationService,
    representativeContactService
  };
}

// Singleton instance for application use
let advocacyServiceInstance: AdvocacyServiceDependencies | null = null;

export function getAdvocacyService(): AdvocacyServiceDependencies {
  if (!advocacyServiceInstance) {
    advocacyServiceInstance = createAdvocacyService();
  }
  return advocacyServiceInstance;
}

// For testing - allows injection of mock dependencies
export function setAdvocacyService(service: AdvocacyServiceDependencies): void {
  advocacyServiceInstance = service;
}

// Reset for testing
export function resetAdvocacyService(): void {
  advocacyServiceInstance = null;
}

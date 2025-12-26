// ============================================================================
// ADVOCACY COORDINATION - Service Factory
// ============================================================================

import { ActionCoordinator } from '@server/features/advocacy/application/action-coordinator.ts';
import { CampaignService } from '@server/features/advocacy/application/campaign-service.ts';
import { CoalitionBuilder } from '@server/features/advocacy/application/coalition-builder.ts';
import { ImpactTracker } from '@server/features/advocacy/application/impact-tracker.ts';
import { getAdvocacyConfig } from '@server/features/advocacy/config/advocacy-config.ts';
import { InMemoryAdvocacyEventPublisher } from '@server/features/advocacy/domain/events/advocacy-events.ts';
import { CampaignDomainService } from '@server/features/advocacy/domain/services/campaign-domain-service.ts';
// Repository implementations removed - using direct service calls
import { NotificationService } from '@server/features/advocacy/infrastructure/services/notification-service.ts';
import { RepresentativeContactService } from '@server/features/advocacy/infrastructure/services/representative-contact-service.ts';
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

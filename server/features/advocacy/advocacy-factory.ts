// ============================================================================
// ADVOCACY COORDINATION - Service Factory
// ============================================================================
// Orchestrates creation and lifetime management of all advocacy services via
// dependency injection. Call createAdvocacyService() at startup, wire the
// result with setAdvocacyService(), then resolve via getAdvocacyService().
// ============================================================================

import { ActionCoordinator, type IActionRepository } from '@server/features/advocacy/application/action-coordinator';
import { CampaignService } from '@server/features/advocacy/application/campaign-service';
import { CoalitionBuilder, type ICoalitionCampaignRepository } from '@server/features/advocacy/application/coalition-builder';
import { ImpactTracker } from '@server/features/advocacy/application/impact-tracker';
import { AdvocacyNotificationService } from '@server/features/advocacy/application/notification-service';
import { RepresentativeContactService } from '@server/features/advocacy/application/representative-contact-service';
import { getAdvocacyConfig } from '@server/features/advocacy/config/advocacy-config';
import { InMemoryAdvocacyEventPublisher } from '@server/features/advocacy/domain/events/advocacy-events';
// eslint-disable-next-line import/no-unresolved
import { type ICampaignRepository } from '@server/features/advocacy/domain/repositories/campaign-repository';
import { CampaignDomainService } from '@server/features/advocacy/domain/services/campaign-domain-service';
import { DrizzleActionRepository } from '@server/features/advocacy/infrastructure/repositories/drizzle-action-repository';
import { DrizzleCampaignRepository } from '@server/features/advocacy/infrastructure/repositories/drizzle-campaign-repository';

// ============================================================================
// Types
// ============================================================================

export interface AdvocacyServiceDependencies {
  campaignService: CampaignService;
  actionCoordinator: ActionCoordinator;
  coalitionBuilder: CoalitionBuilder;
  impactTracker: ImpactTracker;
  notificationService: AdvocacyNotificationService;
  representativeContactService: RepresentativeContactService;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates a fully-wired set of advocacy services.
 *
 * Instantiates Drizzle-based repositories and orchestrates service composition.
 * Wire the result into the application at startup:
 * ```ts
 * setAdvocacyService(createAdvocacyService());
 * ```
 *
 * To use alternative repository implementations, inject them as parameters:
 * ```ts
 * setAdvocacyService(createAdvocacyService(customCampaignRepo, customActionRepo));
 * ```
 */
export function createAdvocacyService(
  campaignRepository?: ICoalitionCampaignRepository,
  actionRepository?: IActionRepository,
): AdvocacyServiceDependencies {
  const config = getAdvocacyConfig();

  // Use provided implementations or create default Drizzle-based ones
  // DrizzleCampaignRepository implements both ICampaignRepository and ICoalitionCampaignRepository
  const campaignRepo = (campaignRepository ??
    new DrizzleCampaignRepository()) as ICampaignRepository & ICoalitionCampaignRepository;
  const actionRepo   = (actionRepository ?? new DrizzleActionRepository()) as IActionRepository;

  // Shared infrastructure
  const eventPublisher = new InMemoryAdvocacyEventPublisher();

  // Domain services
  const campaignDomainService = new CampaignDomainService(campaignRepo);

  // Infrastructure services
  const notificationService          = new AdvocacyNotificationService(config.notifications);
  const representativeContactService = new RepresentativeContactService(config.representatives);

  // Application services (orchestrate domain + infrastructure)
  const campaignService    = new CampaignService(campaignRepo, campaignDomainService);
  const actionCoordinator  = new ActionCoordinator(actionRepo, campaignRepo);
  const coalitionBuilder   = new CoalitionBuilder(campaignRepo, actionRepo, eventPublisher);
  const impactTracker      = new ImpactTracker(
    campaignRepo,
    (event) => eventPublisher.publish(event)
  );

  return {
    campaignService,
    actionCoordinator,
    coalitionBuilder,
    impactTracker,
    notificationService,
    representativeContactService,
  };
}

// ============================================================================
// Singleton Lifecycle
// ============================================================================

let instance: AdvocacyServiceDependencies | null = null;

/**
 * Registers the application-wide advocacy service instance.
 * Must be called once during app startup before any request is handled.
 */
export function setAdvocacyService(service: AdvocacyServiceDependencies): void {
  instance = service;
}

/**
 * Returns the registered advocacy service instance.
 *
 * @throws {Error} if called before `setAdvocacyService`.
 */
export function getAdvocacyService(): AdvocacyServiceDependencies {
  if (!instance) {
    throw new Error(
      'Advocacy service has not been initialized.\n' +
      'Call setAdvocacyService(createAdvocacyService(campaignRepo, actionRepo)) during app startup.',
    );
  }
  return instance;
}

/**
 * Clears the registered instance. Intended for use in tests only.
 */
export function resetAdvocacyService(): void {
  instance = null;
}
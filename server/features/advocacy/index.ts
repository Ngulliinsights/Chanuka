// ============================================================================
// ADVOCACY COORDINATION FEATURE - Main Export
// ============================================================================
// Comprehensive advocacy coordination system for democratic engagement

// Domain exports
export * from './domain/entities/campaign.js';
export * from './domain/entities/action-item.js';
export * from './domain/repositories/campaign-repository.js';
export * from './domain/repositories/action-repository.js';
export * from './domain/services/campaign-domain-service.js';
export * from './domain/events/advocacy-events.js';
export * from './domain/errors/advocacy-errors.js';

// Application exports
export * from './application/campaign-service.js';
export * from './application/action-coordinator.js';
export * from './application/coalition-builder.js';
export * from './application/impact-tracker.js';

// Infrastructure exports
export * from './infrastructure/repositories/campaign-repository-impl.js';
export * from './infrastructure/repositories/action-repository-impl.js';
export * from './infrastructure/services/notification-service.js';
export * from './infrastructure/services/representative-contact-service.js';

// Presentation exports
export * from './presentation/advocacy-router.js';

// Configuration exports
export * from './config/advocacy-config.js';

// Types exports
export type * from './types/index.js';

// Factory function for creating advocacy service
export { createAdvocacyService } from './advocacy-factory.js';
// ============================================================================
// ADVOCACY COORDINATION FEATURE - Main Export
// ============================================================================
// Comprehensive advocacy coordination system for democratic engagement

// Domain exports
export * from './domain/entities/campaign';
export * from './domain/entities/action-item';
// Repository interfaces removed
export * from './domain/services/campaign-domain-service';
export * from './domain/events/advocacy-events';
export * from './domain/errors/advocacy-errors';

// Application exports
export * from './application/campaign-service';
export * from './application/action-coordinator';
export * from './application/coalition-builder';
export * from './application/impact-tracker';
export * from './application/notification-service';
export * from './application/representative-contact-service';

// Presentation exports
export * from './presentation/http/advocacy-router';

// Configuration exports
export * from './config/advocacy-config';

// Types exports
export type * from './types/index';

// Factory function for creating advocacy service
export { createAdvocacyService } from './advocacy-factory';



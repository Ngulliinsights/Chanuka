// Privacy Feature Domain
// Centralized exports for privacy and data protection functionality

// Application Layer - Routes
export { router as privacyRouter } from './application/privacy.routes';

// Application Layer - Services
export { privacySchedulerService } from './application/privacy-scheduler';

// Domain Layer - Services
export { PrivacyService, privacyService } from './domain/privacy-service';

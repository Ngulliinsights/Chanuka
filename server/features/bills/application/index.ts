// Application Layer - Bills Domain
// This layer contains application services that orchestrate domain logic

// Legacy service (direct database access)
export { BillService, billService } from './bill-service';

// Adapter for gradual migration
export { BillServiceAdapter } from './bill-service-adapter';

// New repository-based services
export { BillTrackingService } from './bill-tracking.service';
export { SponsorshipAnalysisService } from './sponsorship-analysis.service';

// Note: billService from './bills' was removed as part of cleanup
// Use BillService from './bill-service' or the new factory-based services instead









































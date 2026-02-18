// Financial Disclosure Service - Refactored
// This service now delegates to decomposed services for better maintainability
// Maintains backward compatibility with the original API

// Re-export the orchestrator service to maintain backward compatibility
export { 
  financialDisclosureAnalyticsService,
  FinancialDisclosureOrchestratorService as FinancialDisclosureAnalyticsService
} from '../financial-disclosure/financial-disclosure-orchestrator.service';

// Re-export types for backward compatibility
export type {
  FinancialDisclosure,
  FinancialRelationship,
  ConflictOfInterest,
  RelationshipMapping,
  CompletenessReport,
  TransparencyDashboard,
  SponsorInfo,
  SponsorAffiliation
} from '../types/index';














































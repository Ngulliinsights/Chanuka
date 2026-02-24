// Analytics Feature Domain
// Centralized exports for analytics and reporting functionality

// Routes
export { router as analyticsRouter } from './application/analytics.routes';
export { default as engagementAnalyticsRouter } from './application/engagement-analytics.routes';
export { simpleTransparencyDashboardService as transparencyDashboardRouter } from './application/transparency-dashboard.routes';
export { createFinancialDisclosureRouter as financialDisclosureRouter } from './financial-disclosure/index';

// Services - Organized exports from services/ folder
export {
  EngagementAnalyticsService,
  engagementAnalyticsService,
  MLAnalysisService,
  mlAnalysisService,
  FinancialDisclosureAnalyticsService,
  financialDisclosureAnalyticsService
} from './services/index';

// Legacy services (keeping for backward compatibility)
export { SimpleTransparencyDashboardService } from './application/transparency-dashboard.routes';
export { simpleTransparencyDashboardService } from './application/transparency-dashboard.routes';
export { DashboardService } from './application/dashboard.routes';
export { LegalAnalysisService } from './domain/legal-analysis.servicenalysis.service';
export { conflictDetectionService as ConflictDetectionService } from './domain/conflict-detection.service';
export { FinancialDisclosureMonitoringService } from './financial-disclosure/monitoring';

// Storage - Organized exports from storage/ folder
export { ProgressStorage } from './storage/index';










































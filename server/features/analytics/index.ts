// Analytics Feature Domain
// Centralized exports for analytics and reporting functionality

// Routes
export { router as analyticsRouter } from './analytics';
export { default as engagementAnalyticsRouter } from './engagement-analytics';
export { simpleTransparencyDashboardService as transparencyDashboardRouter } from './transparency-dashboard';
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
export { SimpleTransparencyDashboardService } from './transparency-dashboard';
export { simpleTransparencyDashboardService } from './transparency-dashboard';
export { DashboardService } from './dashboard';
export { LegalAnalysisService } from './legal-analysis';
export { conflictDetectionService as ConflictDetectionService } from './conflict-detection';
export { FinancialDisclosureMonitoringService } from './financial-disclosure/monitoring';

// Storage - Organized exports from storage/ folder
export { ProgressStorage } from './storage/index';










































// Analytics Feature Domain
// Centralized exports for analytics and reporting functionality

// Routes
export { router as analyticsRouter } from './analytics.js';
export { default as engagementAnalyticsRouter } from './engagement-analytics.js';
export { simpleTransparencyDashboardService as transparencyDashboardRouter } from './transparency-dashboard.js';
export { router as analysisRouter } from './analysis.js';
export { createFinancialDisclosureRouter as financialDisclosureRouter } from './financial-disclosure/index.js';

// Services - Organized exports from services/ folder
export {
  EngagementAnalyticsService,
  engagementAnalyticsService,
  MLAnalysisService,
  mlAnalysisService,
  FinancialDisclosureAnalyticsService,
  financialDisclosureAnalyticsService
} from './services/index.js';

// Legacy services (keeping for backward compatibility)
export { SimpleTransparencyDashboardService } from './transparency-dashboard.js';
export { simpleTransparencyDashboardService } from './transparency-dashboard.js';
export { DashboardService } from './dashboard.js';
export { LegalAnalysisService } from './legal-analysis.js';
export { conflictDetectionService as ConflictDetectionService } from './conflict-detection.js';
export { FinancialDisclosureMonitoringService } from './financial-disclosure/monitoring.js';

// Storage - Organized exports from storage/ folder
export { ProgressStorage } from './storage/index.js';







































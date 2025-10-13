// Analytics Feature Domain
// Centralized exports for analytics and reporting functionality

// Routes
export { default as analyticsRouter } from './analytics.js';
export { default as engagementAnalyticsRouter } from './services/engagement.service.js';
export { default as transparencyDashboardRouter } from './transparency-dashboard.js';
export { default as analysisRouter } from './analysis.js';
export { default as financialDisclosureRouter } from './financial-disclosure/index.js';
export { default as financialDisclosureIntegrationRouter } from './financial-disclosure/analytics.js';

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
export { TransparencyDashboardService } from './transparency-dashboard.js';
export { TransparencyDashboardSimpleService } from './transparency-dashboard.js';
export { DashboardService } from './dashboard.js';
export { LegalAnalysisService } from './legal-analysis.js';
export { conflictDetectionService as ConflictDetectionService } from './conflict-detection.js';
export { FinancialDisclosureMonitoringService } from './financial-disclosure/monitoring.js';

// Storage - Organized exports from storage/ folder
export { ProgressStorage } from './storage/index.js';

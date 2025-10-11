// Analytics Feature Domain
// Centralized exports for analytics and reporting functionality

// Routes
export { default as analyticsRouter } from './analytics';
export { default as engagementAnalyticsRouter } from './services/engagement.service';
export { default as transparencyDashboardRouter } from './transparency-dashboard';
export { default as analysisRouter } from './analysis';
export { default as financialDisclosureRouter } from './financial-disclosure';
export { default as financialDisclosureIntegrationRouter } from './financial-disclosure/analytics';

// Services - Organized exports from services/ folder
export {
  EngagementAnalyticsService,
  engagementAnalyticsService,
  MLAnalysisService,
  mlAnalysisService,
  FinancialDisclosureAnalyticsService,
  financialDisclosureAnalyticsService
} from './services';

// Legacy services (keeping for backward compatibility)
export { TransparencyDashboardService } from './transparency-dashboard';
export { TransparencyDashboardSimpleService } from './transparency-dashboard';
export { DashboardService } from './dashboard';
export { LegalAnalysisService } from './legal-analysis';
export { ConflictDetectionService } from './conflict-detection';
export { FinancialDisclosureMonitoringService } from './financial-disclosure/monitoring';

// Storage - Organized exports from storage/ folder
export { ProgressStorage } from './storage';









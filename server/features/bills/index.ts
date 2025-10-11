// Bills Feature Domain
// Centralized exports for bill-related functionality

// Routes
export { default as billsRouter } from './bills';
export { default as sponsorshipRouter } from './sponsorship';
export { default as sponsorsRouter } from './sponsors';
export { default as billTrackingRouter } from './bill-tracking';
export { default as realTimeTrackingRouter } from './real-time-tracking';
export { default as votingPatternAnalysisRouter } from './voting-pattern-analysis';
export { default as sponsorConflictAnalysisRouter } from './sponsor-conflict-analysis';

// Services
export { BillService } from './bill-service';
export { BillTrackingService } from './bill-tracking';
export { BillStatusMonitorService } from './bill-status-monitor';
export { SponsorService } from './sponsor-service';
export { SponsorConflictAnalysisService } from './sponsor-conflict-analysis';
export { SponsorshipAnalysisService } from './sponsorship-analysis';
export { VotingPatternAnalysisService } from './voting-pattern-analysis';
export { RealTimeAnalysisService } from './real-time-analysis';

// Storage
export { BillStorage } from './bill-storage';
export { LegislativeStorage } from './legislative-storage';

// Types
export * from './LegislativeStorageTypes';
export * from './bill';









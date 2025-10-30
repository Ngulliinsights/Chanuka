// Barrel export for sponsors feature
export { sponsorRepository } from './infrastructure/repositories/sponsor.repository.js';
export { sponsorConflictAnalysisService } from './application/sponsor-conflict-analysis.service.js';
export { router } from './presentation/sponsors.routes.js';

// Export analysis types
export type { SponsorshipAnalysis } from './types/analysis.js';

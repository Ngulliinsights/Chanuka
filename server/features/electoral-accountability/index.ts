/**
 * Electoral Accountability Feature - Public API
 * 
 * The primary feature that distinguishes Chanuka from other civic platforms.
 * Converts legislative transparency into measurable electoral consequence.
 */

export { electoralAccountabilityService } from './domain/electoral-accountability.service';
export { votingRecordRepository } from './infrastructure/voting-record.repository';
export { electoralAccountabilityCacheService } from './infrastructure/electoral-accountability-cache.service';
export { default as electoralAccountabilityRoutes } from './application/electoral-accountability.routes';

// Re-export types
export type {
  VotingRecord,
  NewVotingRecord,
  ConstituencySentiment,
  NewConstituencySentiment,
  RepresentativeGapAnalysis,
  NewRepresentativeGapAnalysis,
  ElectoralPressureCampaign,
  NewElectoralPressureCampaign,
  AccountabilityDashboardExport,
  NewAccountabilityDashboardExport,
} from '@server/infrastructure/schema/electoral_accountability';

// Re-export constants
export * from './domain/electoral-accountability.constants';

// Re-export errors
export * from './domain/electoral-accountability.errors';

// Re-export validation
export * from './domain/electoral-accountability.validation';

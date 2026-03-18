/**
 * Electoral Accountability Feature - Public API
 *
 * Main entry point for Electoral Accountability Engine
 */

// Pages
export { ElectoralAccountabilityDashboard } from './pages/ElectoralAccountabilityDashboard';

// Components
export { MPScorecard } from './ui/mp-scorecard/MPScorecard';
export { VotingRecordTimeline } from './ui/mp-scorecard/VotingRecordTimeline';
export { AccountabilityMetricCard } from './ui/shared/AccountabilityMetricCard';
export { GapSeverityBadge } from './ui/shared/GapSeverityBadge';

// Hooks
export {
  useMPVotingRecord,
  useConstituencySentiment,
  useCriticalGaps,
  usePressureCampaigns,
  useMPScorecard,
  useCreatePressureCampaign,
  useElectoralAccountability,
  electoralAccountabilityKeys,
} from './hooks/useElectoralAccountability';

// Services
export { electoralAccountabilityApi } from './services/electoral-accountability-api';

// Types
export type {
  VotingRecord,
  ConstituencySentiment,
  RepresentativeGapAnalysis,
  ElectoralPressureCampaign,
  MPScorecard as MPScorecardData,
  AccountabilityDashboardExport,
  GetVotingRecordOptions,
  GetCriticalGapsOptions,
  CreateCampaignData,
  GetCampaignsOptions,
  ExportRequestData,
  MPScorecardProps,
  VotingRecordTimelineProps,
  ConstituencySentimentDisplayProps,
  GapVisualizationProps,
  PressureCampaignCardProps,
  CampaignCreationFormProps,
} from './types';

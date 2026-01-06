/**
 * Expert Verification and Credibility System Components
 *
 * This module provides a comprehensive expert verification system with:
 * - Expert badge system with verification types
 * - Credibility scoring with transparent methodology
 * - Expert profile cards with credentials and affiliations
 * - Community validation with upvote/downvote functionality
 * - Verification workflow for reviewing contributions
 * - Expert consensus tracking and disagreement analysis
 */

// Core verification components
export { ExpertBadge, ExpertBadgeGroup } from './ExpertBadge';
export { CredibilityIndicator, CredibilityBreakdown } from './CredibilityScoring';
export { ExpertProfileCard } from './ExpertProfileCard';

// Community validation components
export { CommunityValidation, ValidationSummary } from './CommunityValidation';

// Workflow and process components
export { VerificationWorkflow } from './VerificationWorkflow';

// Consensus and analytics components
export { ExpertConsensus, ConsensusIndicator } from './ExpertConsensus';

// Legacy component (existing)
export { VerificationsList } from './verification-list';

// Re-export types for convenience
export type {
  Expert,
  ExpertCredential,
  ExpertAffiliation,
  ExpertContribution,
  ExpertConsensus as ExpertConsensusType,
  CommunityValidation as CommunityValidationType,
  VerificationWorkflow as VerificationWorkflowType,
  CredibilityMetrics,
  ExpertVerificationType,
  ContributionType,
  VerificationStatus,
} from '@client/features/users/types';

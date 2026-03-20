/**
 * Electoral Accountability Types
 * 
 * Type definitions for the Electoral Accountability Engine
 */

export interface VotingRecord {
  id: string;
  billId: string;
  sponsorId: string;
  vote: 'yes' | 'no' | 'abstain' | 'absent';
  voteDate: string;
  chamber: 'national_assembly' | 'senate' | 'county_assembly' | 'both';
  readingStage: string | null;
  constituency: string;
  county: string;
  ward: string | null;
  sessionNumber: string | null;
  alignmentWithConstituency: number | null;
  daysUntilNextElection: number | null;
  electionCycle: string | null;
  constituentSentimentScore: number | null;
  hansardReference: string | null;
  videoTimestamp: string | null;
  sourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConstituencySentiment {
  id: string;
  billId: string;
  constituency: string;
  county: string;
  ward: string | null;
  supportCount: number;
  opposeCount: number;
  neutralCount: number;
  totalResponses: number;
  sentimentScore: number;
  confidenceLevel: number;
  sampleSizeAdequate: boolean;
  ageDistribution: Record<string, number> | null;
  genderDistribution: Record<string, number> | null;
  snapshotDate: string;
  lastUpdated: string;
}

export interface RepresentativeGapAnalysis {
  id: string;
  votingRecordId: string;
  sentimentId: string;
  alignmentGap: number;
  gapSeverity: 'low' | 'medium' | 'high' | 'critical';
  billId: string;
  sponsorId: string;
  constituency: string;
  electoralRiskScore: number;
  daysUntilElection: number | null;
  constituentPosition: 'support' | 'oppose' | 'neutral';
  representativeVote: 'yes' | 'no' | 'abstain' | 'absent';
  isMisaligned: boolean;
  analysisDate: string;
  // Populated relations
  votingRecord?: VotingRecord;
  sentiment?: ConstituencySentiment;
  bill?: any;
  sponsor?: any;
}

export interface ElectoralPressureCampaign {
  id: string;
  campaignName: string;
  campaignSlug: string;
  description: string;
  targetSponsorId: string;
  targetConstituency: string;
  targetCounty: string;
  triggeredByBillId: string | null;
  triggeredByGapId: string | null;
  status: 'active' | 'successful' | 'failed' | 'closed';
  startDate: string;
  endDate: string | null;
  participantCount: number;
  signatureCount: number;
  mediaMentions: number;
  socialMediaReach: number;
  representativeResponded: boolean;
  voteChanged: boolean;
  policyChanged: boolean;
  electoralImpact: string | null;
  createdBy: string;
  organizerIds: string[] | null;
  createdAt: string;
  updatedAt: string;
  // Populated relations
  targetSponsor?: any;
  triggeredByBill?: any;
  triggeredByGap?: RepresentativeGapAnalysis;
}

export interface MPScorecard {
  totalVotes: number;
  alignedVotes: number;
  misalignedVotes: number;
  alignmentPercentage: number;
  averageGap: number;
  criticalGaps: number;
  activeCampaigns: number;
  electoralRiskScore: number;
}

export interface AccountabilityDashboardExport {
  id: string;
  exportName: string;
  exportType: 'mp_scorecard' | 'constituency_report' | 'campaign_data';
  constituency: string | null;
  county: string | null;
  sponsorId: string | null;
  startDate: string;
  endDate: string;
  exportData: any;
  summaryStatistics: any;
  requestedBy: string;
  organization: string | null;
  purpose: string | null;
  status: 'pending' | 'approved' | 'delivered' | 'rejected';
  approvedBy: string | null;
  approvalDate: string | null;
  downloadUrl: string | null;
  downloadExpiresAt: string | null;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

// API Request/Response Types

export interface GetVotingRecordOptions {
  sponsorId: string;
  constituency?: string;
  startDate?: string;
  endDate?: string;
  includeGapAnalysis?: boolean;
}

export interface GetCriticalGapsOptions {
  constituency?: string;
  sponsorId?: string;
  minRiskScore?: number;
  limit?: number;
}

export interface CreateCampaignData {
  campaignName: string;
  description: string;
  targetSponsorId: string;
  targetConstituency: string;
  targetCounty: string;
  triggeredByBillId?: string;
  triggeredByGapId?: string;
}

export interface GetCampaignsOptions {
  status?: 'active' | 'successful' | 'failed' | 'closed';
  constituency?: string;
  sponsorId?: string;
  limit?: number;
}

export interface ExportRequestData {
  exportName: string;
  exportType: 'mp_scorecard' | 'constituency_report' | 'campaign_data';
  constituency?: string;
  county?: string;
  sponsorId?: string;
  startDate: string;
  endDate: string;
  organization?: string;
  purpose?: string;
}

// UI Component Props Types

export interface MPScorecardProps {
  sponsorId: string;
  constituency: string;
  onViewDetails?: () => void;
  onCreateCampaign?: () => void;
  className?: string;
}

export interface VotingRecordTimelineProps {
  sponsorId: string;
  constituency?: string;
  startDate?: string;
  endDate?: string;
  includeGapAnalysis?: boolean;
  onVoteClick?: (record: VotingRecord) => void;
  className?: string;
}

export interface ConstituencySentimentDisplayProps {
  billId: string;
  constituency: string;
  showWardBreakdown?: boolean;
  className?: string;
}

export interface GapVisualizationProps {
  gap: RepresentativeGapAnalysis;
  showDetails?: boolean;
  onCreateCampaign?: () => void;
  className?: string;
}

export interface PressureCampaignCardProps {
  campaign: ElectoralPressureCampaign;
  onJoin?: () => void;
  onShare?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export interface CampaignCreationFormProps {
  initialData?: Partial<CreateCampaignData>;
  onSubmit: (data: CreateCampaignData) => void;
  onCancel: () => void;
}

// Utility Types

export type VoteSeverity = 'aligned' | 'misaligned-low' | 'misaligned-medium' | 'misaligned-high' | 'misaligned-critical';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AlignmentTrend {
  date: string;
  alignmentPercentage: number;
  totalVotes: number;
}

export interface CampaignMetrics {
  participantGrowth: Array<{ date: string; count: number }>;
  signatureGrowth: Array<{ date: string; count: number }>;
  mediaMentions: Array<{ date: string; count: number; source?: string }>;
  socialMediaReach: Array<{ date: string; reach: number }>;
}

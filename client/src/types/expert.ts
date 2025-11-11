/**
 * Expert Verification and Credibility System Types
 * 
 * Defines interfaces for expert verification, credibility scoring,
 * and community validation functionality.
 */

export interface ExpertCredential {
  id: string;
  type: 'education' | 'certification' | 'experience' | 'publication';
  title: string;
  institution: string;
  year?: number;
  verified: boolean;
  verificationDate?: string;
  verificationSource?: string;
}

export interface ExpertAffiliation {
  id: string;
  organization: string;
  role: string;
  type: 'academic' | 'government' | 'ngo' | 'private' | 'judicial';
  current: boolean;
  verified: boolean;
  startDate?: string;
  endDate?: string;
}

export interface Expert {
  id: string;
  name: string;
  avatar?: string;
  verificationType: 'official' | 'domain' | 'identity';
  credentials: ExpertCredential[];
  affiliations: ExpertAffiliation[];
  specializations: string[];
  credibilityScore: number;
  contributionCount: number;
  avgCommunityRating: number;
  verified: boolean;
  verificationDate: string;
  bio?: string;
  contactInfo?: {
    email?: string;
    website?: string;
    linkedin?: string;
  };
}

export interface CommunityValidation {
  upvotes: number;
  downvotes: number;
  comments: number;
  userVote?: 'up' | 'down' | null;
  validationScore: number; // Calculated score based on community feedback
}

export interface ExpertContribution {
  id: string;
  expertId: string;
  billId: number;
  type: 'analysis' | 'comment' | 'review' | 'amendment_suggestion';
  content: string;
  confidence: number;
  methodology?: string;
  sources?: string[];
  tags: string[];
  createdAt: string;
  lastUpdated: string;
  communityValidation: CommunityValidation;
  status: 'draft' | 'published' | 'under_review' | 'disputed';
}

export interface ExpertConsensus {
  billId: number;
  topic: string;
  totalExperts: number;
  agreementLevel: number; // 0-1 scale
  majorityPosition: string;
  minorityPositions: Array<{
    position: string;
    expertCount: number;
    experts: string[]; // Expert IDs
  }>;
  controversyLevel: 'low' | 'medium' | 'high';
  lastUpdated: string;
}

export interface VerificationWorkflow {
  id: string;
  contributionId: string;
  expertId: string;
  reviewerId?: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision';
  reviewNotes?: string;
  reviewDate?: string;
  communityFeedback: Array<{
    userId: string;
    feedback: string;
    vote: 'approve' | 'reject' | 'needs_revision';
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CredibilityMetrics {
  expertId: string;
  overallScore: number;
  components: {
    credentialScore: number;
    affiliationScore: number;
    communityScore: number;
    contributionQuality: number;
    consensusAlignment: number;
  };
  methodology: {
    description: string;
    factors: Array<{
      name: string;
      weight: number;
      description: string;
    }>;
  };
  lastCalculated: string;
}

export type ExpertVerificationType = 'official' | 'domain' | 'identity';
export type ContributionType = 'analysis' | 'comment' | 'review' | 'amendment_suggestion';
export type VerificationStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision';
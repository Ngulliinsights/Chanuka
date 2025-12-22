import type { UserProfile } from '../../../schema/foundation';

export type AnonymityLevel = 'public' | 'pseudonymous' | 'anonymous' | 'private';

export interface DisplayIdentity {
  displayName: string;
  showLocation: boolean;
  showContactInfo: boolean;
  canDirectMessage: boolean;
  profileUrl?: string | undefined;
}

export interface DataRetentionPolicy {
  retentionPeriod: string;
  deletionPolicy: string;
  auditTrail: string;
}

export interface AnonymityService {
  generateAnonymousId(): string;
  generatePseudonymSuggestions(county?: string): string[];
  getDisplayIdentity(userProfile: UserProfile, viewerIsOwner?: boolean): DisplayIdentity;
  canPerformAction(userProfile: UserProfile, action: 'comment' | 'vote' | 'create_campaign' | 'moderate' | 'expert_review'): boolean;
  getAuditTrailIdentity(userProfile: UserProfile): string;
  canChangeAnonymityLevel(currentLevel: AnonymityLevel, newLevel: AnonymityLevel, hasActiveEngagements: boolean): { allowed: boolean; reason?: string };
  getDataRetentionPolicy(level: AnonymityLevel): DataRetentionPolicy;
}

export type { UserProfile };

export default AnonymityService;

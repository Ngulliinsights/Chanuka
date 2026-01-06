/**
 * Kenya-specific Anonymity Helper
 * Implementation of the AnonymityService defined in shared/core
 */
import { AnonymityService, AnonymityLevel, DisplayIdentity, DataRetentionPolicy } from '../../../core/src/utils/anonymity-interface';
import type { UserProfile } from '../../../schema/foundation';

export function generateAnonymousId(): string {
  const prefix = 'Citizen_';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + result;
}

export function generatePseudonymSuggestions(county?: string): string[] {
  const adjectives = [
    'Concerned', 'Active', 'Engaged', 'Thoughtful', 'Civic', 'Democratic',
    'Progressive', 'Reform', 'Justice', 'Unity', 'Peace', 'Hope'
  ];
  const nouns = [
    'Citizen', 'Voter', 'Advocate', 'Voice', 'Participant', 'Observer',
    'Reformer', 'Activist', 'Resident', 'Kenyan', 'Patriot', 'Democrat'
  ];
  const suggestions: string[] = [];
  for (let i = 0; i < 5; i++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    suggestions.push(`${adj}${noun}${number}`);
  }
  if (county) {
    const countyName = county.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    suggestions.push(`${countyName}Citizen${Math.floor(Math.random() * 99) + 1}`);
  }
  return suggestions;
}

export function getDisplayIdentity(userProfile: UserProfile, viewerIsOwner: boolean = false): DisplayIdentity {
  const {
    anonymity_level,
    first_name,
    last_name,
    display_name,
    pseudonym,
    anonymous_id,
    privacy_settings,
    id
  } = userProfile;

  const privacy = {
    show_real_name: true,
    show_location: true,
    show_contact_info: false,
    allow_direct_messages: true,
    public_profile: true,
    ...((privacy_settings as any) || {})
  };

  if (viewerIsOwner) {
    return {
      displayName: display_name || `${first_name || ''} ${last_name || ''}`.trim() || 'You',
      showLocation: true,
      showContactInfo: true,
      canDirectMessage: false,
      profileUrl: `/profile/me`
    };
  }

  switch (anonymity_level as AnonymityLevel) {
    case 'public':
      return {
        displayName: privacy.show_real_name
          ? (display_name || `${first_name || ''} ${last_name || ''}`.trim() || 'Citizen')
          : (display_name || 'Citizen'),
        showLocation: privacy.show_location,
        showContactInfo: privacy.show_contact_info,
        canDirectMessage: privacy.allow_direct_messages,
        profileUrl: privacy.public_profile ? `/profile/${id}` : undefined
      };
    case 'pseudonymous':
      return {
        displayName: pseudonym || display_name || 'Anonymous Citizen',
        showLocation: privacy.show_location,
        showContactInfo: false,
        canDirectMessage: privacy.allow_direct_messages,
        profileUrl: privacy.public_profile ? `/profile/pseudo/${id}` : undefined
      };
    case 'anonymous':
      return {
        displayName: anonymous_id || 'Anonymous Citizen',
        showLocation: false,
        showContactInfo: false,
        canDirectMessage: false,
        profileUrl: undefined
      };
    case 'private':
      return {
        displayName: 'Private Participant',
        showLocation: false,
        showContactInfo: false,
        canDirectMessage: false,
        profileUrl: undefined
      };
    default:
      return {
        displayName: 'Citizen',
        showLocation: false,
        showContactInfo: false,
        canDirectMessage: false,
        profileUrl: undefined
      };
  }
}

export function canPerformAction(userProfile: UserProfile, action: 'comment' | 'vote' | 'create_campaign' | 'moderate' | 'expert_review'): boolean {
  const { anonymity_level } = userProfile;
  switch (action) {
    case 'comment':
    case 'vote':
      return true;
    case 'create_campaign':
      return anonymity_level !== 'anonymous' && anonymity_level !== 'private';
    case 'moderate':
    case 'expert_review':
      return anonymity_level === 'public';
    default:
      return false;
  }
}

export function getAuditTrailIdentity(userProfile: UserProfile): string {
  const { anonymity_level, anonymous_id, pseudonym, display_name, first_name, last_name } = userProfile;
  switch (anonymity_level) {
    case 'public':
      return display_name || `${first_name || ''} ${last_name || ''}`.trim() || 'Citizen';
    case 'pseudonymous':
      return pseudonym || display_name || 'Pseudonymous Citizen';
    case 'anonymous':
      return anonymous_id || 'Anonymous Citizen';
    case 'private':
      return 'Private Participant';
    default:
      return 'Unknown Participant';
  }
}

export function canChangeAnonymityLevel(currentLevel: AnonymityLevel, newLevel: AnonymityLevel, hasActiveEngagements: boolean): { allowed: boolean; reason?: string } {
  const anonymityOrder = ['public', 'pseudonymous', 'anonymous', 'private'];
  const currentIndex = anonymityOrder.indexOf(currentLevel);
  const newIndex = anonymityOrder.indexOf(newLevel);
  if (newIndex > currentIndex) return { allowed: true };
  if (newIndex < currentIndex) {
    if (hasActiveEngagements) {
      return {
        allowed: false,
        reason: 'Cannot reduce anonymity while you have active comments, votes, or campaigns.'
      };
    }
    return { allowed: true };
  }
  return { allowed: true };
}

export function getDataRetentionPolicy(anonymityLevel: AnonymityLevel): DataRetentionPolicy {
  switch (anonymityLevel) {
    case 'public':
      return {
        retentionPeriod: '7 years (standard civic engagement records)',
        deletionPolicy: 'Soft delete with anonymization option',
        auditTrail: 'Full audit trail maintained'
      };
    case 'pseudonymous':
      return {
        retentionPeriod: '5 years (pseudonymous engagement records)',
        deletionPolicy: 'Soft delete with full anonymization',
        auditTrail: 'Pseudonymous audit trail maintained'
      };
    case 'anonymous':
      return {
        retentionPeriod: '3 years (anonymous engagement records)',
        deletionPolicy: 'Hard delete available on request',
        auditTrail: 'Anonymous audit trail only'
      };
    case 'private':
      return {
        retentionPeriod: '1 year (private participation records)',
        deletionPolicy: 'Automatic deletion after retention period',
        auditTrail: 'Minimal audit trail for system integrity only'
      };
    default:
      return {
        retentionPeriod: 'Standard policy applies',
        deletionPolicy: 'Standard deletion policy',
        auditTrail: 'Standard audit trail'
      };
  }
}

const impl: AnonymityService = {
  generateAnonymousId,
  generatePseudonymSuggestions,
  getDisplayIdentity,
  canPerformAction,
  getAuditTrailIdentity,
  canChangeAnonymityLevel,
  getDataRetentionPolicy
};

export default impl;

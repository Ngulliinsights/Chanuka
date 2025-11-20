/**
 * Anonymity Helper Functions
 * 
 * Provides utilities for managing user anonymity and privacy in the civic engagement platform.
 * Supports Kenya's Data Protection Act 2019 and GDPR compliance.
 */

import type { UserProfile } from '../schema/foundation';

export type AnonymityLevel = 'public' | 'pseudonymous' | 'anonymous' | 'private';

export interface DisplayIdentity {
  displayName: string;
  showLocation: boolean;
  showContactInfo: boolean;
  canDirectMessage: boolean;
  profileUrl?: string | undefined;
}

/**
 * Generate anonymous ID for users who choose anonymous participation
 * Format: "Citizen_A1B2C3" - readable but untraceable
 */
export function generateAnonymousId(): string {
  const prefix = 'Citizen_';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return prefix + result;
}

/**
 * Generate suggested pseudonyms based on interests or location (optional)
 */
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
  
  // Generate 5 random combinations
  for (let i = 0; i < 5; i++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    
    suggestions.push(`${adj}${noun}${number}`);
  }
  
  // Add county-based suggestion if provided
  if (county) {
    const countyName = county.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    suggestions.push(`${countyName}Citizen${Math.floor(Math.random() * 99) + 1}`);
  }
  
  return suggestions;
}

/**
 * Get display identity based on user's anonymity preferences and privacy settings
 */
export function getDisplayIdentity(
  userProfile: UserProfile,
  viewerIsOwner: boolean = false
): DisplayIdentity {
  const { 
    anonymity_level, 
    first_name, 
    last_name, 
    display_name, 
    pseudonym, 
    anonymous_id,
    privacy_settings 
  } = userProfile;
  
  // Parse privacy settings with defaults
  const privacy = {
    show_real_name: true,
    show_location: true,
    show_contact_info: false,
    allow_direct_messages: true,
    public_profile: true,
    ...((privacy_settings as any) || {})
  };
  
  // Owner always sees their own info
  if (viewerIsOwner) {
    return {
      displayName: display_name || `${first_name || ''} ${last_name || ''}`.trim() || 'You',
      showLocation: true,
      showContactInfo: true,
      canDirectMessage: false, // Can't message yourself
      profileUrl: `/profile/me`
    };
  }
  
  // Handle different anonymity levels
  switch (anonymity_level) {
    case 'public':
      return {
        displayName: privacy.show_real_name 
          ? (display_name || `${first_name || ''} ${last_name || ''}`.trim() || 'Citizen')
          : (display_name || 'Citizen'),
        showLocation: privacy.show_location,
        showContactInfo: privacy.show_contact_info,
        canDirectMessage: privacy.allow_direct_messages,
        profileUrl: privacy.public_profile ? `/profile/${userProfile.id}` : undefined
      };
      
    case 'pseudonymous':
      return {
        displayName: pseudonym || display_name || 'Anonymous Citizen',
        showLocation: privacy.show_location,
        showContactInfo: false, // Never show contact info for pseudonymous users
        canDirectMessage: privacy.allow_direct_messages,
        profileUrl: privacy.public_profile ? `/profile/pseudo/${userProfile.id}` : undefined
      };
      
    case 'anonymous':
      return {
        displayName: anonymous_id || 'Anonymous Citizen',
        showLocation: false, // Never show location for anonymous users
        showContactInfo: false,
        canDirectMessage: false, // Can't message anonymous users
        profileUrl: undefined // No profile for anonymous users
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

/**
 * Check if user can perform action based on anonymity level
 */
export function canPerformAction(
  userProfile: UserProfile,
  action: 'comment' | 'vote' | 'create_campaign' | 'moderate' | 'expert_review'
): boolean {
  const { anonymity_level, user_id } = userProfile;
  
  // Get user role from the users table (would need to join in real implementation)
  // For now, assume citizen role for anonymous users
  
  switch (action) {
    case 'comment':
    case 'vote':
      // All anonymity levels can comment and vote
      return true;
      
    case 'create_campaign':
      // Anonymous users cannot create campaigns (need some accountability)
      return anonymity_level !== 'anonymous' && anonymity_level !== 'private';
      
    case 'moderate':
    case 'expert_review':
      // These roles require public accountability
      return anonymity_level === 'public';
      
    default:
      return false;
  }
}

/**
 * Get anonymity-appropriate audit trail entry
 */
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

/**
 * Validate anonymity level change
 */
export function canChangeAnonymityLevel(
  currentLevel: AnonymityLevel,
  newLevel: AnonymityLevel,
  hasActiveEngagements: boolean
): { allowed: boolean; reason?: string } {
  // Can always become more anonymous
  const anonymityOrder = ['public', 'pseudonymous', 'anonymous', 'private'];
  const currentIndex = anonymityOrder.indexOf(currentLevel);
  const newIndex = anonymityOrder.indexOf(newLevel);
  
  if (newIndex > currentIndex) {
    return { allowed: true };
  }
  
  // Becoming less anonymous requires consideration
  if (newIndex < currentIndex) {
    if (hasActiveEngagements) {
      return {
        allowed: false,
        reason: 'Cannot reduce anonymity while you have active comments, votes, or campaigns. This protects the integrity of existing discussions.'
      };
    }
    
    return { allowed: true };
  }
  
  // Same level
  return { allowed: true };
}

/**
 * Get data retention policy based on anonymity level
 */
export function getDataRetentionPolicy(anonymityLevel: AnonymityLevel): {
  retentionPeriod: string;
  deletionPolicy: string;
  auditTrail: string;
} {
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

export default {
  generateAnonymousId,
  generatePseudonymSuggestions,
  getDisplayIdentity,
  canPerformAction,
  getAuditTrailIdentity,
  canChangeAnonymityLevel,
  getDataRetentionPolicy
};


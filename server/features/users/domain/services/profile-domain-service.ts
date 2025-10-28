import { UserProfile, UserInterest } from '../entities/user-profile';
import { UserAggregate } from '../aggregates/user-aggregate';
import { UserBio, UserLocation, Organization, Interest } from '../entities/value-objects';

export interface ProfileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProfileCompletenessScore {
  overall: number;
  sections: {
    basicInfo: number;
    bio: number;
    expertise: number;
    location: number;
    organization: number;
    interests: number;
  };
}

export class ProfileDomainService {
  /**
   * Validates a user profile for completeness and correctness
   */
  validateProfile(profile: UserProfile): ProfileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate bio
    if (profile.bio && profile.bio.value.length > 1000) {
      errors.push('Bio must be 1000 characters or less');
    }

    // Validate expertise
    if (profile.expertise.length > 10) {
      errors.push('Maximum 10 expertise areas allowed');
    }

    if (profile.expertise.some(exp => exp.length > 50)) {
      errors.push('Each expertise area must be 50 characters or less');
    }

    // Validate location
    if (profile.location && profile.location.value.length > 100) {
      errors.push('Location must be 100 characters or less');
    }

    // Validate organization
    if (profile.organization && profile.organization.value.length > 200) {
      errors.push('Organization must be 200 characters or less');
    }

    // Warnings for incomplete profile
    if (!profile.bio) {
      warnings.push('Profile bio is missing');
    }

    if (profile.expertise.length === 0) {
      warnings.push('No expertise areas specified');
    }

    if (!profile.location) {
      warnings.push('Location information is missing');
    }

    if (!profile.organization) {
      warnings.push('Organization information is missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculates profile completeness score
   */
  calculateProfileCompleteness(userAggregate: UserAggregate): ProfileCompletenessScore {
    const profile = userAggregate.profile;
    const interests = userAggregate.interests;

    const sections = {
      basicInfo: this.calculateBasicInfoCompleteness(userAggregate.user),
      bio: profile?.bio ? 100 : 0,
      expertise: Math.min(100, (profile?.expertise.length || 0) * 20),
      location: profile?.location ? 100 : 0,
      organization: profile?.organization ? 100 : 0,
      interests: Math.min(100, interests.length * 25)
    };

    const overall = Math.round(
      (sections.basicInfo * 0.2 +
       sections.bio * 0.15 +
       sections.expertise * 0.2 +
       sections.location * 0.15 +
       sections.organization * 0.15 +
       sections.interests * 0.15)
    );

    return { overall, sections };
  }

  /**
   * Calculates basic info completeness
   */
  private calculateBasicInfoCompleteness(user: any): number {
    let score = 0;
    const fields = ['firstName', 'lastName', 'name'];

    fields.forEach(field => {
      if (user[field]) score += 33;
    });

    return Math.min(100, score);
  }

  /**
   * Suggests improvements for profile completeness
   */
  suggestProfileImprovements(userAggregate: UserAggregate): string[] {
    const suggestions: string[] = [];
    const completeness = this.calculateProfileCompleteness(userAggregate);

    if (completeness.sections.bio < 100) {
      suggestions.push('Add a bio to tell others about yourself');
    }

    if (completeness.sections.expertise < 50) {
      suggestions.push('Add your areas of expertise to help with bill verification');
    }

    if (completeness.sections.location < 100) {
      suggestions.push('Add your location to connect with local issues');
    }

    if (completeness.sections.organization < 100) {
      suggestions.push('Add your organization or affiliation');
    }

    if (completeness.sections.interests < 50) {
      suggestions.push('Add your interests to get personalized bill recommendations');
    }

    return suggestions;
  }

  /**
   * Validates user interests
   */
  validateInterests(interests: UserInterest[]): ProfileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (interests.length > 20) {
      errors.push('Maximum 20 interests allowed');
    }

    if (interests.length === 0) {
      warnings.push('No interests specified');
    }

    // Check for duplicates
    const interestValues = interests.map(i => i.interest.value);
    const uniqueInterests = new Set(interestValues);
    if (uniqueInterests.size !== interestValues.length) {
      errors.push('Duplicate interests are not allowed');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Merges profile updates with existing profile
   */
  mergeProfileUpdates(existingProfile: UserProfile, updates: Partial<{
    bio: string;
    expertise: string[];
    location: string;
    organization: string;
    isPublic: boolean;
  }>): UserProfile {
    // Create a new profile with updated values
    const updatedData = {
      userId: existingProfile.userId,
      bio: updates.bio !== undefined ? (updates.bio.trim() || undefined) : existingProfile.bio?.value,
      expertise: updates.expertise !== undefined ? updates.expertise : existingProfile.expertise,
      location: updates.location !== undefined ? (updates.location.trim() || undefined) : existingProfile.location?.value,
      organization: updates.organization !== undefined ? (updates.organization.trim() || undefined) : existingProfile.organization?.value,
      reputationScore: existingProfile.reputationScore,
      isPublic: updates.isPublic !== undefined ? updates.isPublic : existingProfile.isPublic,
      createdAt: existingProfile.createdAt,
      updatedAt: new Date()
    };

    return UserProfile.create(updatedData);
  }

  /**
   * Calculates reputation score based on profile completeness and activity
   */
  calculateReputationFromProfile(userAggregate: UserAggregate): number {
    const completeness = this.calculateProfileCompleteness(userAggregate);
    const verificationBonus = userAggregate.verificationCount * 2;
    const engagementBonus = userAggregate.engagementScore * 0.5;

    return Math.min(100, Math.round(
      (completeness.overall * 0.4) +
      (verificationBonus) +
      (engagementBonus * 0.3)
    ));
  }

  /**
   * Checks if a user can be considered an expert in a domain
   */
  isDomainExpert(userAggregate: UserAggregate, domain: string): boolean {
    const profile = userAggregate.profile;
    if (!profile) return false;

    // Check if domain is in expertise
    const hasDomainExpertise = profile.expertise.includes(domain);

    // Check verification history in this domain
    const domainVerifications = userAggregate.verifications.filter(
      v => v.expertise.domain === domain && v.isVerified()
    );

    const hasDomainVerification = domainVerifications.length >= 3;
    const highConfidence = domainVerifications.some(v => v.confidence > 80);

    return hasDomainExpertise && (hasDomainVerification || highConfidence);
  }

  /**
   * Gets recommended interests based on user activity
   */
  getRecommendedInterests(userAggregate: UserAggregate): string[] {
    const recommendations: string[] = [];
    const existingInterests = userAggregate.interests.map(i => i.interest.value);

    // Based on verification domains
    const verificationDomains = userAggregate.verifications.map(v => v.expertise.domain);
    const uniqueDomains = [...new Set(verificationDomains)];

    uniqueDomains.forEach(domain => {
      if (!existingInterests.includes(domain)) {
        recommendations.push(domain);
      }
    });

    // Based on expertise areas
    if (userAggregate.profile) {
      userAggregate.profile.expertise.forEach(expertise => {
        if (!existingInterests.includes(expertise) && !recommendations.includes(expertise)) {
          recommendations.push(expertise);
        }
      });
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }

  /**
   * Validates profile visibility settings
   */
  validateProfileVisibility(userAggregate: UserAggregate): boolean {
    // Users with low reputation should not have public profiles
    if (userAggregate.reputationScore < 10 && userAggregate.profile?.isPublic) {
      return false;
    }

    // Users with incomplete profiles should be warned about public visibility
    const completeness = this.calculateProfileCompleteness(userAggregate);
    if (completeness.overall < 30 && userAggregate.profile?.isPublic) {
      return false;
    }

    return true;
  }

  /**
   * Sanitizes profile data for public display
   */
  sanitizeProfileForPublic(profile: UserProfile): Partial<UserProfile> {
    return {
      ...profile,
      // Remove sensitive information if needed
      // For now, return as-is since we don't have sensitive fields
    };
  }
}






































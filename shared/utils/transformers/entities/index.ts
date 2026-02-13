/**
 * Entity Transformers
 * Central export for all entity-specific transformers
 * 
 * Requirements: 4.2, 4.3
 */

// User transformers
export * from './user';

// Bill transformers
export * from './bill';

// Register all transformers
import { registerTransformer } from '../registry';
import {
  userDbToDomain,
  userProfileDbToDomain,
  userPreferencesDbToDomain,
  userDomainToApi,
  userProfileDomainToApi,
  userPreferencesDomainToApi,
  userDbToApi,
} from './user';
import {
  billDbToDomain,
  billTimelineEventDbToDomain,
  billEngagementMetricsDbToDomain,
  sponsorDbToDomain,
  committeeDbToDomain,
  billCommitteeAssignmentDbToDomain,
  billDomainToApi,
  billTimelineEventDomainToApi,
  billEngagementMetricsDomainToApi,
  sponsorDomainToApi,
  committeeDomainToApi,
  billCommitteeAssignmentDomainToApi,
  billDbToApi,
} from './bill';

/**
 * Register all entity transformers in the global registry
 * Call this function during application initialization
 */
export function registerAllTransformers(): void {
  // User transformers
  registerTransformer({
    id: 'user-db-to-domain',
    name: 'User Database to Domain',
    description: 'Transforms UserTable (database) to User (domain)',
    sourceType: 'UserTable',
    targetType: 'User',
    transformer: userDbToDomain,
    bidirectional: true,
    tags: ['user', 'database', 'domain'],
  });

  registerTransformer({
    id: 'user-profile-db-to-domain',
    name: 'User Profile Database to Domain',
    description: 'Transforms UserProfileTable (database) to UserProfile (domain)',
    sourceType: 'UserProfileTable',
    targetType: 'UserProfile',
    transformer: userProfileDbToDomain,
    bidirectional: true,
    tags: ['user', 'profile', 'database', 'domain'],
  });

  registerTransformer({
    id: 'user-preferences-db-to-domain',
    name: 'User Preferences Database to Domain',
    description: 'Transforms UserPreferencesTable (database) to UserPreferences (domain)',
    sourceType: 'UserPreferencesTable',
    targetType: 'UserPreferences',
    transformer: userPreferencesDbToDomain,
    bidirectional: true,
    tags: ['user', 'preferences', 'database', 'domain'],
  });

  registerTransformer({
    id: 'user-domain-to-api',
    name: 'User Domain to API',
    description: 'Transforms User (domain) to ApiUser (API)',
    sourceType: 'User',
    targetType: 'ApiUser',
    transformer: userDomainToApi,
    bidirectional: true,
    tags: ['user', 'domain', 'api'],
  });

  registerTransformer({
    id: 'user-profile-domain-to-api',
    name: 'User Profile Domain to API',
    description: 'Transforms UserProfile (domain) to ApiUserProfile (API)',
    sourceType: 'UserProfile',
    targetType: 'ApiUserProfile',
    transformer: userProfileDomainToApi,
    bidirectional: true,
    tags: ['user', 'profile', 'domain', 'api'],
  });

  registerTransformer({
    id: 'user-preferences-domain-to-api',
    name: 'User Preferences Domain to API',
    description: 'Transforms UserPreferences (domain) to ApiUserPreferences (API)',
    sourceType: 'UserPreferences',
    targetType: 'ApiUserPreferences',
    transformer: userPreferencesDomainToApi,
    bidirectional: true,
    tags: ['user', 'preferences', 'domain', 'api'],
  });

  registerTransformer({
    id: 'user-db-to-api',
    name: 'User Database to API',
    description: 'Transforms UserTable (database) directly to ApiUser (API)',
    sourceType: 'UserTable',
    targetType: 'ApiUser',
    transformer: userDbToApi,
    bidirectional: true,
    tags: ['user', 'database', 'api', 'composite'],
  });

  // Bill transformers
  registerTransformer({
    id: 'bill-db-to-domain',
    name: 'Bill Database to Domain',
    description: 'Transforms BillTable (database) to Bill (domain)',
    sourceType: 'BillTable',
    targetType: 'Bill',
    transformer: billDbToDomain,
    bidirectional: true,
    tags: ['bill', 'database', 'domain'],
  });

  registerTransformer({
    id: 'bill-timeline-event-db-to-domain',
    name: 'Bill Timeline Event Database to Domain',
    description: 'Transforms BillTimelineEventTable (database) to BillTimelineEvent (domain)',
    sourceType: 'BillTimelineEventTable',
    targetType: 'BillTimelineEvent',
    transformer: billTimelineEventDbToDomain,
    bidirectional: true,
    tags: ['bill', 'timeline', 'database', 'domain'],
  });

  registerTransformer({
    id: 'bill-engagement-metrics-db-to-domain',
    name: 'Bill Engagement Metrics Database to Domain',
    description: 'Transforms BillEngagementMetricsTable (database) to BillEngagementMetrics (domain)',
    sourceType: 'BillEngagementMetricsTable',
    targetType: 'BillEngagementMetrics',
    transformer: billEngagementMetricsDbToDomain,
    bidirectional: true,
    tags: ['bill', 'engagement', 'database', 'domain'],
  });

  registerTransformer({
    id: 'sponsor-db-to-domain',
    name: 'Sponsor Database to Domain',
    description: 'Transforms SponsorTable (database) to Sponsor (domain)',
    sourceType: 'SponsorTable',
    targetType: 'Sponsor',
    transformer: sponsorDbToDomain,
    bidirectional: true,
    tags: ['sponsor', 'database', 'domain'],
  });

  registerTransformer({
    id: 'committee-db-to-domain',
    name: 'Committee Database to Domain',
    description: 'Transforms CommitteeTable (database) to Committee (domain)',
    sourceType: 'CommitteeTable',
    targetType: 'Committee',
    transformer: committeeDbToDomain,
    bidirectional: true,
    tags: ['committee', 'database', 'domain'],
  });

  registerTransformer({
    id: 'bill-committee-assignment-db-to-domain',
    name: 'Bill Committee Assignment Database to Domain',
    description: 'Transforms BillCommitteeAssignmentTable (database) to BillCommitteeAssignment (domain)',
    sourceType: 'BillCommitteeAssignmentTable',
    targetType: 'BillCommitteeAssignment',
    transformer: billCommitteeAssignmentDbToDomain,
    bidirectional: true,
    tags: ['bill', 'committee', 'assignment', 'database', 'domain'],
  });

  registerTransformer({
    id: 'bill-domain-to-api',
    name: 'Bill Domain to API',
    description: 'Transforms Bill (domain) to ApiBill (API)',
    sourceType: 'Bill',
    targetType: 'ApiBill',
    transformer: billDomainToApi,
    bidirectional: true,
    tags: ['bill', 'domain', 'api'],
  });

  registerTransformer({
    id: 'bill-timeline-event-domain-to-api',
    name: 'Bill Timeline Event Domain to API',
    description: 'Transforms BillTimelineEvent (domain) to ApiBillTimelineEvent (API)',
    sourceType: 'BillTimelineEvent',
    targetType: 'ApiBillTimelineEvent',
    transformer: billTimelineEventDomainToApi,
    bidirectional: true,
    tags: ['bill', 'timeline', 'domain', 'api'],
  });

  registerTransformer({
    id: 'bill-engagement-metrics-domain-to-api',
    name: 'Bill Engagement Metrics Domain to API',
    description: 'Transforms BillEngagementMetrics (domain) to ApiBillEngagementMetrics (API)',
    sourceType: 'BillEngagementMetrics',
    targetType: 'ApiBillEngagementMetrics',
    transformer: billEngagementMetricsDomainToApi,
    bidirectional: true,
    tags: ['bill', 'engagement', 'domain', 'api'],
  });

  registerTransformer({
    id: 'sponsor-domain-to-api',
    name: 'Sponsor Domain to API',
    description: 'Transforms Sponsor (domain) to ApiSponsor (API)',
    sourceType: 'Sponsor',
    targetType: 'ApiSponsor',
    transformer: sponsorDomainToApi,
    bidirectional: true,
    tags: ['sponsor', 'domain', 'api'],
  });

  registerTransformer({
    id: 'committee-domain-to-api',
    name: 'Committee Domain to API',
    description: 'Transforms Committee (domain) to ApiCommittee (API)',
    sourceType: 'Committee',
    targetType: 'ApiCommittee',
    transformer: committeeDomainToApi,
    bidirectional: true,
    tags: ['committee', 'domain', 'api'],
  });

  registerTransformer({
    id: 'bill-committee-assignment-domain-to-api',
    name: 'Bill Committee Assignment Domain to API',
    description: 'Transforms BillCommitteeAssignment (domain) to ApiBillCommitteeAssignment (API)',
    sourceType: 'BillCommitteeAssignment',
    targetType: 'ApiBillCommitteeAssignment',
    transformer: billCommitteeAssignmentDomainToApi,
    bidirectional: true,
    tags: ['bill', 'committee', 'assignment', 'domain', 'api'],
  });

  registerTransformer({
    id: 'bill-db-to-api',
    name: 'Bill Database to API',
    description: 'Transforms BillTable (database) directly to ApiBill (API)',
    sourceType: 'BillTable',
    targetType: 'ApiBill',
    transformer: billDbToApi,
    bidirectional: true,
    tags: ['bill', 'database', 'api', 'composite'],
  });
}

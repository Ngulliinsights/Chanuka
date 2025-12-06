/**
 * Mock Users and Authentication Data
 * 
 * Comprehensive mock data for users, authentication, privacy settings,
 * and security events.
 */

import { faker } from '@faker-js/faker';

import { User, PrivacySettings, SecurityEvent, ConsentRecord } from '@client/types/auth';

import { generateId, generateDateInRange, generateLocation } from './generators';

// Seed faker for consistent data
faker.seed(12345);

/**
 * Generate privacy settings for a user
 */
const generatePrivacySettings = (): PrivacySettings => ({
  profile_visibility: faker.helpers.arrayElement(['public', 'registered', 'private']),
  email_visibility: faker.helpers.arrayElement(['public', 'registered', 'private']),
  activity_tracking: faker.datatype.boolean(),
  analytics_consent: faker.datatype.boolean(),
  marketing_consent: faker.datatype.boolean(),
  data_sharing_consent: faker.datatype.boolean(),
  location_tracking: faker.datatype.boolean(),
  personalized_content: faker.datatype.boolean(),
  third_party_integrations: faker.datatype.boolean(),
  notification_preferences: {
    email_notifications: faker.datatype.boolean(),
    push_notifications: faker.datatype.boolean(),
    sms_notifications: faker.datatype.boolean(),
    bill_updates: faker.datatype.boolean(),
    comment_replies: faker.datatype.boolean(),
    expert_insights: faker.datatype.boolean(),
    security_alerts: true, // Always true for security
    privacy_updates: true, // Always true for privacy
  }
});

/**
 * Generate consent records for a user
 */
const generateConsentRecords = (): ConsentRecord[] => {
  const consentTypes: Array<'analytics' | 'marketing' | 'data_sharing' | 'cookies' | 'location'> = 
    ['analytics', 'marketing', 'data_sharing', 'cookies', 'location'];
  
  return consentTypes.map(type => ({
    id: generateId('consent'),
    consent_type: type,
    granted: faker.datatype.boolean(),
    granted_at: generateDateInRange(365, 30),
    withdrawn_at: faker.datatype.boolean() ? generateDateInRange(30, 0) : null,
    version: '1.0',
    ip_address: faker.internet.ip(),
    user_agent: faker.internet.userAgent()
  }));
};

/**
 * Generate a single mock user
 */
export const generateMockUser = (id?: string): User => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const username = faker.internet.username({ firstName, lastName });
  const email = faker.internet.email({ firstName, lastName });
  
  const roles = ['citizen', 'expert', 'moderator', 'admin'];
  const verificationStatuses = ['unverified', 'pending', 'verified'];
  const expertiseAreas = [
    'Constitutional Law', 'Healthcare Policy', 'Environmental Law', 'Economic Policy',
    'Education Policy', 'Criminal Justice', 'Immigration Law', 'Technology Policy',
    'Energy Policy', 'Civil Rights', 'Labor Law', 'Tax Policy'
  ];

  return {
    id: id || generateId('user'),
    email,
    name: `${firstName} ${lastName}`,
    username,
    first_name: firstName,
    last_name: lastName,
    role: faker.helpers.arrayElement(roles),
    verification_status: faker.helpers.arrayElement(verificationStatuses),
    is_active: faker.datatype.boolean({ probability: 0.9 }),
    created_at: generateDateInRange(730, 1),
    reputation: faker.number.int({ min: 0, max: 10000 }),
    expertise: faker.helpers.arrayElement(expertiseAreas),
    two_factor_enabled: faker.datatype.boolean({ probability: 0.3 }),
    last_login: generateDateInRange(7, 0),
    login_count: faker.number.int({ min: 1, max: 500 }),
    account_locked: faker.datatype.boolean({ probability: 0.05 }),
    locked_until: null,
    password_changed_at: generateDateInRange(90, 0),
    privacy_settings: generatePrivacySettings(),
    consent_given: generateConsentRecords(),
    data_retention_preference: {
      retention_period: faker.helpers.arrayElement(['1year', '2years', '5years', 'indefinite']),
      auto_delete_inactive: faker.datatype.boolean(),
      export_before_delete: faker.datatype.boolean()
    }
  };
};

/**
 * Generate security events for a user
 */
export const generateSecurityEvents = (userId: string, count: number = 10): SecurityEvent[] => {
  const eventTypes: Array<'login' | 'logout' | 'password_change' | 'failed_login' | 'suspicious_activity' | 'account_locked' | 'two_factor_enabled' | 'two_factor_disabled'> = [
    'login', 'logout', 'password_change', 'failed_login', 'suspicious_activity', 
    'account_locked', 'two_factor_enabled', 'two_factor_disabled'
  ];

  return Array.from({ length: count }, () => {
    const eventType = faker.helpers.arrayElement(eventTypes);
    const location = generateLocation();
    
    return {
      id: generateId('event'),
      user_id: userId,
      event_type: eventType,
      ip_address: faker.internet.ip(),
      user_agent: faker.internet.userAgent(),
      location: `${location.state}, ${location.county}`,
      timestamp: generateDateInRange(30, 0),
      risk_score: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
      details: {
        success: eventType !== 'failed_login' && eventType !== 'suspicious_activity',
        device: faker.helpers.arrayElement(['Desktop', 'Mobile', 'Tablet']),
        browser: faker.helpers.arrayElement(['Chrome', 'Firefox', 'Safari', 'Edge']),
        ...(eventType === 'failed_login' && { 
          reason: faker.helpers.arrayElement(['Invalid password', 'Account locked', 'Invalid email']) 
        })
      }
    };
  });
};

/**
 * Generate a collection of mock users
 */
export const generateMockUsers = (count: number = 25): User[] => {
  const users: User[] = [];
  
  for (let i = 0; i < count; i++) {
    users.push(generateMockUser());
  }
  
  return users;
};

/**
 * Generate mock expert users
 */
export const generateMockExpertUsers = (count: number = 10): User[] => {
  return Array.from({ length: count }, () => {
    const user = generateMockUser();
    return {
      ...user,
      role: 'expert',
      verification_status: 'verified',
      reputation: faker.number.int({ min: 5000, max: 10000 }),
      two_factor_enabled: true,
      privacy_settings: {
        ...user.privacy_settings,
        profile_visibility: 'public',
        analytics_consent: true
      }
    };
  });
};

/**
 * Generate mock moderator users
 */
export const generateMockModeratorUsers = (count: number = 3): User[] => {
  return Array.from({ length: count }, () => {
    const user = generateMockUser();
    return {
      ...user,
      role: 'moderator',
      verification_status: 'verified',
      reputation: faker.number.int({ min: 8000, max: 10000 }),
      two_factor_enabled: true,
      account_locked: false,
      privacy_settings: {
        ...user.privacy_settings,
        profile_visibility: 'public'
      }
    };
  });
};

/**
 * Generate current authenticated user
 */
export const generateCurrentUser = (): User => {
  const user = generateMockUser('current-user');
  return {
    ...user,
    name: 'Demo User',
    username: 'demo_user',
    email: 'demo@chanuka.ke',
    first_name: 'Demo',
    last_name: 'User',
    role: 'citizen',
    verification_status: 'verified',
    is_active: true,
    reputation: 2500,
    two_factor_enabled: false,
    account_locked: false,
    privacy_settings: {
      profile_visibility: 'public',
      email_visibility: 'registered',
      activity_tracking: true,
      analytics_consent: true,
      marketing_consent: false,
      data_sharing_consent: true,
      location_tracking: true,
      personalized_content: true,
      third_party_integrations: false,
      notification_preferences: {
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        bill_updates: true,
        comment_replies: true,
        expert_insights: true,
        security_alerts: true,
        privacy_updates: true,
      }
    }
  };
};

/**
 * Default mock users datasets
 */
export const mockUsers = generateMockUsers(50);
export const mockExpertUsers = generateMockExpertUsers(15);
export const mockModeratorUsers = generateMockModeratorUsers(5);
export const mockCurrentUser = generateCurrentUser();

/**
 * Get user by ID
 */
export const getMockUserById = (id: string): User | null => {
  const allUsers = [...mockUsers, ...mockExpertUsers, ...mockModeratorUsers];
  return allUsers.find(user => user.id === id) || null;
};

/**
 * Get users by role
 */
export const getMockUsersByRole = (role: string): User[] => {
  const allUsers = [...mockUsers, ...mockExpertUsers, ...mockModeratorUsers];
  return allUsers.filter(user => user.role === role);
};
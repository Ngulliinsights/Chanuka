/**
 * Mock User Data Service
 * Provides realistic mock data for user profile, saved bills, and engagement history
 */

// Type definitions for mock data (types not available in @types)
// cspell: disable-next-line
interface UserPreferences {
  theme: string;
  language: string;
  timezone: string;
  email_frequency: string;
  notification_preferences: Record<string, unknown>;
  privacy_settings: Record<string, unknown>;
  dashboard_layout: string;
  default_bill_view: string;
  auto_save_drafts: boolean;
  show_onboarding_tips: boolean;
}

interface SavedBill {
  id: string;
  bill_id: string;
  user_id: string;
  saved_at: string;
  notes: string | null;
  tags: string[];
  notification_enabled: boolean;
  bill: {
    id: string;
    title: string;
    bill_number: string;
    status: string;
    urgency_level: string;
    last_updated: string;
  };
}

interface UserEngagementHistory {
  id: string;
  user_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
  category: string;
}

interface UserAchievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  max_progress: number;
  completed: boolean;
  completed_at?: string;
  reward_points: number;
}


// Mock user profile data - types not available, using any for now
// cspell: disable-next-line
export const mockUserProfile: any = {
  id: 'user-123',
  email: 'kamau.otieno@example.com',
  name: 'Kamau Otieno',
  username: 'kamau',
  first_name: 'Kamau',
  last_name: 'Otieno',
  role: 'citizen',
  verification_status: 'verified',
  is_active: true,
  created_at: '2024-01-15T10:00:00Z',
  reputation: 85,
  expertise: 'Environmental Policy',
  two_factor_enabled: true,
  last_login: '2024-11-10T08:30:00Z',
  login_count: 47,
  account_locked: false,
  locked_until: null,
  password_changed_at: '2024-10-01T12:00:00Z',
  privacy_settings: {
    profile_visibility: 'public',
    email_visibility: 'registered',
    activity_tracking: true,
    analytics_consent: true,
    marketing_consent: false,
    data_sharing_consent: true,
    location_tracking: false,
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
    },
  },
  consent_given: [
    {
      id: 'consent-1',
      consent_type: 'analytics',
      granted: true,
      granted_at: '2024-01-15T10:00:00Z',
      withdrawn_at: null,
      version: '1.0',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0...',
    },
  ],
  data_retention_preference: {
    retention_period: '2years',
    auto_delete_inactive: false,
    export_before_delete: true,
  },
  bio: 'Passionate advocate for environmental policy and sustainable governance. Active in local community initiatives.',
  location: 'Nairobi, Kenya',
  website: 'https://kamau.example.com',
  // cspell: disable-next-line
  twitter: '@kamau_env',
  linkedin: 'https://linkedin.com/in/kamauotieno',
  avatar_url:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  cover_image_url: null,
  civic_engagement_score: 742,
  badges: [
    {
      id: 'badge-1',
      name: 'Active Citizen',
      description: 'Engaged with 10+ bills',
      icon: '🏛️',
      earned_at: '2024-02-01T00:00:00Z',
      category: 'engagement',
    },
    {
      id: 'badge-2',
      name: 'Environmental Advocate',
      description: 'Expert in environmental policy',
      icon: '🌱',
      earned_at: '2024-03-15T00:00:00Z',
      category: 'expertise',
    },
  ],
  achievements: [
    {
      id: 'achievement-1',
      title: 'Bill Tracker',
      description: 'Track 25 bills',
      progress: 18,
      max_progress: 25,
      completed: false,
      reward_points: 100,
    },
    {
      id: 'achievement-2',
      title: 'Community Contributor',
      description: 'Post 50 comments',
      progress: 50,
      max_progress: 50,
      completed: true,
      completed_at: '2024-10-15T00:00:00Z',
      reward_points: 200,
    },
  ],
  activity_summary: {
    bills_tracked: 18,
    comments_posted: 52,
    discussions_started: 8,
    votes_cast: 34,
    expert_contributions: 12,
    community_score: 85,
    streak_days: 7,
    last_active: '2024-11-10T08:30:00Z',
  },
};

// Mock user preferences
export const mockUserPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  timezone: 'Africa/Nairobi',
  email_frequency: 'daily',
  notification_preferences: {
    email_notifications: true,
    push_notifications: true,
    sms_notifications: false,
    bill_updates: true,
    comment_replies: true,
    expert_insights: true,
    security_alerts: true,
    privacy_updates: true,
  },
  privacy_settings: mockUserProfile.privacy_settings,
  dashboard_layout: 'comfortable',
  default_bill_view: 'grid',
  auto_save_drafts: true,
  show_onboarding_tips: false,
};

// Mock saved bills
export const mockSavedBills: SavedBill[] = [
  {
    id: 'saved-1',
    bill_id: 'bill-123',
    user_id: 'user-123',
    saved_at: '2024-11-05T14:30:00Z',
    notes: 'Important environmental legislation to track',
    tags: ['environment', 'climate', 'urgent'],
    notification_enabled: true,
    bill: {
      id: 'bill-123',
      title: 'Climate Change Mitigation Act 2024',
      bill_number: 'HB-2024-045',
      status: 'Committee Review',
      urgency_level: 'High',
      last_updated: '2024-11-08T10:00:00Z',
    },
  },
  {
    id: 'saved-2',
    bill_id: 'bill-124',
    user_id: 'user-123',
    saved_at: '2024-11-03T09:15:00Z',
    notes: 'Affects local water management policies',
    tags: ['water', 'infrastructure'],
    notification_enabled: true,
    bill: {
      id: 'bill-124',
      title: 'Water Resources Management Amendment',
      bill_number: 'SB-2024-032',
      status: 'Second Reading',
      urgency_level: 'Medium',
      last_updated: '2024-11-07T16:45:00Z',
    },
  },
  {
    id: 'saved-3',
    bill_id: 'bill-125',
    user_id: 'user-123',
    saved_at: '2024-10-28T11:20:00Z',
    notes: null,
    tags: ['education', 'funding'],
    notification_enabled: false,
    bill: {
      id: 'bill-125',
      title: 'Education Funding Reform Bill',
      bill_number: 'HB-2024-067',
      status: 'Passed',
      urgency_level: 'Low',
      last_updated: '2024-11-01T14:20:00Z',
    },
  },
];

// Mock engagement history
export const mockEngagementHistory: UserEngagementHistory[] = [
  {
    id: 'engagement-1',
    user_id: 'user-123',
    action_type: 'comment',
    entity_type: 'bill',
    entity_id: 'bill-123',
    timestamp: '2024-11-10T08:30:00Z',
    metadata: {
      comment_length: 156,
      sentiment: 'positive',
    },
  },
  {
    id: 'engagement-2',
    user_id: 'user-123',
    action_type: 'save',
    entity_type: 'bill',
    entity_id: 'bill-126',
    timestamp: '2024-11-09T15:45:00Z',
    metadata: {
      tags: ['healthcare', 'reform'],
    },
  },
  {
    id: 'engagement-3',
    user_id: 'user-123',
    action_type: 'view',
    entity_type: 'bill',
    entity_id: 'bill-127',
    timestamp: '2024-11-09T14:20:00Z',
    metadata: {
      duration_seconds: 180,
      scroll_depth: 0.75,
    },
  },
  {
    id: 'engagement-4',
    user_id: 'user-123',
    action_type: 'vote',
    entity_type: 'comment',
    entity_id: 'comment-456',
    timestamp: '2024-11-08T16:10:00Z',
    metadata: {
      vote_type: 'upvote',
    },
  },
  {
    id: 'engagement-5',
    user_id: 'user-123',
    action_type: 'share',
    entity_type: 'bill',
    entity_id: 'bill-123',
    timestamp: '2024-11-07T12:30:00Z',
    metadata: {
      platform: 'twitter',
      reach_estimate: 250,
    },
  },
];

// Mock dashboard data
export const mockDashboardData = {
  profile: mockUserProfile,
  recent_activity: mockEngagementHistory.slice(0, 5),
  saved_bills: mockSavedBills,
  trending_bills: [
    {
      id: 'bill-trending-1',
      title: 'Digital Privacy Protection Act',
      bill_number: 'HB-2024-089',
      status: 'First Reading',
      urgency_level: 'High',
      engagement_score: 95,
      comment_count: 234,
      view_count: 1567,
    },
    {
      id: 'bill-trending-2',
      title: 'Renewable Energy Incentives Bill',
      bill_number: 'SB-2024-056',
      status: 'Committee Review',
      urgency_level: 'Medium',
      engagement_score: 87,
      comment_count: 189,
      view_count: 1234,
    },
    {
      id: 'bill-trending-3',
      title: 'Public Transport Modernization Act',
      bill_number: 'HB-2024-078',
      status: 'Second Reading',
      urgency_level: 'Medium',
      engagement_score: 82,
      comment_count: 156,
      view_count: 987,
    },
  ],
  recommendations: [
    {
      id: 'rec-1',
      type: 'bill',
      title: 'Healthcare Access Improvement Bill',
      reason: 'Based on your interest in social policy',
      confidence: 0.85,
    },
    {
      id: 'rec-2',
      type: 'expert',
      title: 'Dr. Amina Hassan - Environmental Policy Expert',
      reason: 'Matches your expertise area',
      confidence: 0.78,
    },
  ],
  notifications: [
    // cspell: disable-next-line
    {
      id: 'notif-1',
      type: 'bill_update',
      title: 'Climate Change Mitigation Act updated',
      message: 'The bill has moved to committee review stage',
      timestamp: '2024-11-10T09:00:00Z',
      read: false,
    },
    {
      id: 'notif-2',
      type: 'comment_reply',
      title: 'New reply to your comment',
      message: 'Wanjiku Mwangi replied to your comment on Water Resources Management',
      timestamp: '2024-11-09T18:30:00Z',
      read: false,
    },
  ],
  civic_score_trend: [
    { date: '2024-10-11', score: 680 },
    { date: '2024-10-18', score: 695 },
    { date: '2024-10-25', score: 710 },
    { date: '2024-11-01', score: 725 },
    { date: '2024-11-08', score: 742 },
  ],
};

// Mock badges
export const mockBadges: UserBadge[] = [
  {
    id: 'badge-1',
    name: 'Active Citizen',
    description: 'Engaged with 10+ bills',
    icon: '🏛️',
    earned_at: '2024-02-01T00:00:00Z',
    category: 'engagement',
  },
  {
    id: 'badge-2',
    name: 'Environmental Advocate',
    description: 'Expert in environmental policy',
    icon: '🌱',
    earned_at: '2024-03-15T00:00:00Z',
    category: 'expertise',
  },
  {
    id: 'badge-3',
    name: 'Community Builder',
    description: 'Started 5+ discussions',
    icon: '🤝',
    earned_at: '2024-05-20T00:00:00Z',
    category: 'community',
  },
];

// Mock achievements
export const mockAchievements: UserAchievement[] = [
  {
    id: 'achievement-1',
    title: 'Bill Tracker',
    description: 'Track 25 bills',
    progress: 18,
    max_progress: 25,
    completed: false,
    reward_points: 100,
  },
  {
    id: 'achievement-2',
    title: 'Community Contributor',
    description: 'Post 50 comments',
    progress: 50,
    max_progress: 50,
    completed: true,
    completed_at: '2024-10-15T00:00:00Z',
    reward_points: 200,
  },
  {
    id: 'achievement-3',
    title: 'Civic Champion',
    description: 'Reach 1000 civic score',
    progress: 742,
    max_progress: 1000,
    completed: false,
    reward_points: 500,
  },
];

// Export all mock data
export const mockUserData = {
  profile: mockUserProfile,
  preferences: mockUserPreferences,
  savedBills: mockSavedBills,
  engagementHistory: mockEngagementHistory,
  dashboardData: mockDashboardData,
  badges: mockBadges,
  achievements: mockAchievements,
};

/**
 * Mock data utilities for unit testing
 * Provides consistent test data across all test suites
 */

export const mockUsers = {
  citizen: {
    id: 'user-citizen-1',
    email: 'citizen@example.com',
    password_hash: '$2b$12$mockhashedpassword',
    first_name: 'John',
    last_name: 'Citizen',
    name: 'John Citizen',
    role: 'citizen',
    verification_status: 'verified',
    is_active: true,
    created_at: new Date('2024-01-01'),
    last_login_at: new Date('2024-01-15'),
    preferences: {
      emailNotifications: true,
      emailVerified: true
    }
  },

  expert: {
    id: 'user-expert-1',
    email: 'expert@example.com',
    password_hash: '$2b$12$mockhashedpassword',
    first_name: 'Dr. Jane',
    last_name: 'Expert',
    name: 'Dr. Jane Expert',
    role: 'expert',
    verification_status: 'verified',
    is_active: true,
    created_at: new Date('2024-01-01'),
    last_login_at: new Date('2024-01-15'),
    preferences: {
      emailNotifications: true,
      emailVerified: true
    },
    expertise: ['technology', 'privacy', 'healthcare']
  },

  admin: {
    id: 'user-admin-1',
    email: 'admin@example.com',
    password_hash: '$2b$12$mockhashedpassword',
    first_name: 'Admin',
    last_name: 'User',
    name: 'Admin User',
    role: 'admin',
    verification_status: 'verified',
    is_active: true,
    created_at: new Date('2024-01-01'),
    last_login_at: new Date('2024-01-15'),
    preferences: {
      emailNotifications: true,
      emailVerified: true
    }
  },

  unverified: {
    id: 'user-unverified-1',
    email: 'unverified@example.com',
    password_hash: '$2b$12$mockhashedpassword',
    first_name: 'Unverified',
    last_name: 'User',
    name: 'Unverified User',
    role: 'citizen',
    verification_status: 'pending',
    is_active: true,
    created_at: new Date('2024-01-01'),
    preferences: {
      emailNotifications: true,
      emailVerified: false,
      emailVerificationToken: 'verification-token-123',
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  },

  inactive: {
    id: 'user-inactive-1',
    email: 'inactive@example.com',
    password_hash: '$2b$12$mockhashedpassword',
    first_name: 'Inactive',
    last_name: 'User',
    name: 'Inactive User',
    role: 'citizen',
    verification_status: 'verified',
    is_active: false,
    created_at: new Date('2024-01-01'),
    preferences: {
      emailNotifications: false,
      emailVerified: true
    }
  }
};

export const mockBills = {
  introduced: {
    id: 'bill-1',
    bill_number: 'C-123',
    title: 'An Act to Enhance Digital Privacy Rights',
    summary: 'This bill aims to strengthen digital privacy protections for Canadian citizens.',
    description: 'A comprehensive bill that addresses various aspects of digital privacy including data collection, storage, and user consent requirements.',
    status: 'introduced',
    category: 'technology',
    priority: 'high',
    introduced_date: new Date('2024-01-15'),
    last_action_date: new Date('2024-01-15'),
    lastUpdated: new Date('2024-01-16'),
    content: 'Full bill content would be here...',
    tags: ['privacy', 'digital rights', 'technology'],
    metadata: {
      source: 'parliament-ca',
      confidence: 0.95,
      lastSync: new Date('2024-01-16')
    }
  },

  committee: {
    id: 'bill-2',
    bill_number: 'S-456',
    title: 'Healthcare Modernization Act',
    summary: 'Modernizing healthcare systems through technology integration.',
    description: 'This bill proposes updates to healthcare infrastructure and digital health records.',
    status: 'committee',
    category: 'healthcare',
    priority: 'medium',
    introduced_date: new Date('2023-12-01'),
    last_action_date: new Date('2024-01-10'),
    lastUpdated: new Date('2024-01-11'),
    content: 'Full bill content would be here...',
    tags: ['healthcare', 'modernization', 'technology'],
    metadata: {
      source: 'parliament-ca',
      confidence: 0.92,
      lastSync: new Date('2024-01-11')
    }
  },

  passed: {
    id: 'bill-3',
    bill_number: 'C-789',
    title: 'Environmental Protection Enhancement Act',
    summary: 'Strengthening environmental protection measures.',
    description: 'This bill introduces new environmental protection standards and enforcement mechanisms.',
    status: 'passed',
    category: 'environment',
    priority: 'high',
    introduced_date: new Date('2023-10-01'),
    last_action_date: new Date('2023-12-15'),
    lastUpdated: new Date('2023-12-16'),
    content: 'Full bill content would be here...',
    tags: ['environment', 'protection', 'climate'],
    metadata: {
      source: 'parliament-ca',
      confidence: 0.98,
      lastSync: new Date('2023-12-16')
    }
  },

  failed: {
    id: 'bill-4',
    bill_number: 'C-999',
    title: 'Failed Legislation Example',
    summary: 'An example of failed legislation.',
    description: 'This bill was not passed due to various reasons.',
    status: 'failed',
    category: 'other',
    priority: 'low',
    introduced_date: new Date('2023-08-01'),
    last_action_date: new Date('2023-11-30'),
    lastUpdated: new Date('2023-12-01'),
    content: 'Full bill content would be here...',
    tags: ['failed', 'example'],
    metadata: {
      source: 'parliament-ca',
      confidence: 0.85,
      lastSync: new Date('2023-12-01')
    }
  }
};

export const mockSponsors = {
  mp: {
    id: 'sponsor-1',
    name: 'Hon. John Smith',
    role: 'MP',
    party: 'Liberal Party',
    constituency: 'Toronto Centre',
    email: 'john.smith@parl.gc.ca',
    phone: '613-555-0123',
    bio: 'Member of Parliament representing Toronto Centre since 2019.',
    website: 'https://johnsmith.parl.gc.ca',
    socialMedia: {
      twitter: '@JohnSmithMP',
      facebook: 'JohnSmithMP'
    },
    committees: ['Technology Committee', 'Privacy Committee'],
    is_active: true,
    metadata: {
      source: 'parliament-ca',
      confidence: 0.95,
      lastSync: new Date('2024-01-16')
    }
  },

  senator: {
    id: 'sponsor-2',
    name: 'Hon. Sarah Johnson',
    role: 'Senator',
    party: 'Conservative Party',
    constituency: 'Alberta',
    email: 'sarah.johnson@sen.parl.gc.ca',
    phone: '613-555-0456',
    bio: 'Senator from Alberta, appointed in 2020.',
    website: 'https://sarahjohnson.sen.parl.gc.ca',
    socialMedia: {
      twitter: '@SenSarahJ'
    },
    committees: ['Healthcare Committee', 'Environment Committee'],
    is_active: true,
    metadata: {
      source: 'parliament-ca',
      confidence: 0.93,
      lastSync: new Date('2024-01-15')
    }
  },

  minister: {
    id: 'sponsor-3',
    name: 'Hon. Michael Brown',
    role: 'Minister',
    party: 'Liberal Party',
    constituency: 'Vancouver West',
    email: 'michael.brown@parl.gc.ca',
    phone: '613-555-0789',
    bio: 'Minister of Technology and Innovation.',
    website: 'https://michaelbrown.parl.gc.ca',
    socialMedia: {
      twitter: '@MinisterBrown',
      linkedin: 'michael-brown-minister'
    },
    committees: ['Cabinet', 'Technology Committee'],
    portfolios: ['Technology', 'Innovation'],
    is_active: true,
    metadata: {
      source: 'parliament-ca',
      confidence: 0.97,
      lastSync: new Date('2024-01-16')
    }
  }
};

export const mockSessions = { active: {
    id: 'session-1',
    user_id: 'user-citizen-1',
    token: 'valid-jwt-token',
    refresh_token_hash: 'hashed-refresh-token',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    is_active: true,
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15'),
    metadata: {
      user_agent: 'Mozilla/5.0 Test Browser',
      ip_address: '127.0.0.1',
      deviceType: 'desktop'
     }
  },

  expired: { id: 'session-2',
    user_id: 'user-citizen-1',
    token: 'expired-jwt-token',
    refresh_token_hash: 'hashed-refresh-token',
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Still valid refresh
    is_active: true,
    created_at: new Date('2024-01-14'),
    updated_at: new Date('2024-01-14'),
    metadata: {
      user_agent: 'Mozilla/5.0 Test Browser',
      ip_address: '127.0.0.1',
      deviceType: 'desktop'
     }
  },

  inactive: { id: 'session-3',
    user_id: 'user-citizen-1',
    token: 'inactive-jwt-token',
    refresh_token_hash: 'hashed-refresh-token',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    is_active: false, // Manually deactivated
    created_at: new Date('2024-01-13'),
    updated_at: new Date('2024-01-14'),
    metadata: {
      user_agent: 'Mozilla/5.0 Test Browser',
      ip_address: '127.0.0.1',
      deviceType: 'desktop'
     }
  }
};

export const mockPasswordResets = { valid: {
    id: 'reset-1',
    user_id: 'user-citizen-1',
    tokenHash: 'hashed-reset-token',
    expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    created_at: new Date('2024-01-15'),
    isUsed: false
   },

  expired: { id: 'reset-2',
    user_id: 'user-citizen-1',
    tokenHash: 'hashed-expired-token',
    expires_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    created_at: new Date('2024-01-14'),
    isUsed: false
   },

  used: { id: 'reset-3',
    user_id: 'user-citizen-1',
    tokenHash: 'hashed-used-token',
    expires_at: new Date(Date.now() + 60 * 60 * 1000),
    created_at: new Date('2024-01-15'),
    isUsed: true,
    usedAt: new Date('2024-01-15')
   }
};

export const mockComments = { approved: {
    id: 'comment-1',
    bill_id: 'bill-1',
    user_id: 'user-citizen-1',
    content: 'This is a thoughtful comment about the bills.',
    status: 'approved',
    votes: {
      upvotes: 5,
      downvotes: 1,
      score: 4
      },
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-15'),
    metadata: {
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0 Test Browser'
    }
  },

  pending: { id: 'comment-2',
    bill_id: 'bill-1',
    user_id: 'user-expert-1',
    content: 'This comment is awaiting moderation.',
    status: 'pending',
    votes: {
      upvotes: 0,
      downvotes: 0,
      score: 0
      },
    created_at: new Date('2024-01-16'),
    updated_at: new Date('2024-01-16'),
    metadata: {
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0 Test Browser'
    }
  },

  rejected: { id: 'comment-3',
    bill_id: 'bill-2',
    user_id: 'user-citizen-1',
    content: 'This comment was rejected for violating guidelines.',
    status: 'rejected',
    rejectionReason: 'Inappropriate content',
    votes: {
      upvotes: 0,
      downvotes: 0,
      score: 0
      },
    created_at: new Date('2024-01-14'),
    updated_at: new Date('2024-01-15'),
    moderatedBy: 'user-admin-1',
    moderatedAt: new Date('2024-01-15'),
    metadata: {
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0 Test Browser'
    }
  }
};

export const mockAnalytics = { bill_engagement: {
    bill_id: 'bill-1',
    views: 1250,
    uniqueViews: 890,
    comments: 45,
    shares: 23,
    bookmarks: 67,
    averageTimeSpent: 180, // seconds
    bounceRate: 0.35,
    engagement_score: 0.78,
    demographics: {
      ageGroups: {
        '18-24': 15,
        '25-34': 35,
        '35-44': 25,
        '45-54': 15,
        '55+': 10
       },
      regions: {
        'Ontario': 40,
        'Quebec': 25,
        'British Columbia': 20,
        'Alberta': 10,
        'Other': 5
      }
    },
    timeline: [
      { date: '2024-01-15', views: 200, comments: 5 },
      { date: '2024-01-16', views: 350, comments: 12 },
      { date: '2024-01-17', views: 400, comments: 18 },
      { date: '2024-01-18', views: 300, comments: 10 }
    ]
  },

  sponsorAnalytics: {
    sponsor_id: 'sponsor-1',
    billsSponsored: 12,
    billsPassed: 8,
    billsFailed: 2,
    billsInProgress: 2,
    averageEngagement: 0.65,
    publicSentiment: 0.72,
    mediaAttention: 0.58,
    committeeMemberships: 3,
    votingRecord: {
      totalVotes: 156,
      attendance: 0.92,
      partyAlignment: 0.85
    }
  }
};

export const mockNotifications = { billUpdate: {
    id: 'notification-1',
    user_id: 'user-citizen-1',
    type: 'bill_update',
    title: 'Bill C-123 Status Update',
    message: 'The Digital Privacy Rights Act has moved to committee stage.',
    data: {
      bill_id: 'bill-1',
      oldStatus: 'introduced',
      newStatus: 'committee'
      },
    is_read: false,
    created_at: new Date('2024-01-16'),
    scheduledFor: new Date('2024-01-16'),
    channels: ['email', 'web'],
    priority: 'medium'
  },

  commentReply: { id: 'notification-2',
    user_id: 'user-citizen-1',
    type: 'comment_reply',
    title: 'New Reply to Your Comment',
    message: 'Dr. Jane Expert replied to your comment on Bill C-123.',
    data: {
      comment_id: 'comment-1',
      replyId: 'comment-4',
      bill_id: 'bill-1'
      },
    is_read: false,
    created_at: new Date('2024-01-16'),
    scheduledFor: new Date('2024-01-16'),
    channels: ['web'],
    priority: 'low'
  },

  systemAlert: { id: 'notification-3',
    user_id: 'user-admin-1',
    type: 'system_alert',
    title: 'High Server Load Detected',
    message: 'Server load has exceeded 80% for the past 10 minutes.',
    data: {
      metric: 'cpu_usage',
      value: 85.2,
      threshold: 80,
      duration: 600 // seconds
     },
    is_read: true,
    read_at: new Date('2024-01-16'),
    created_at: new Date('2024-01-16'),
    scheduledFor: new Date('2024-01-16'),
    channels: ['email', 'sms'],
    priority: 'high'
  }
};

// Utility functions for generating test data
export const generateMockUser = (overrides: Partial<typeof mockUsers.citizen> = {}) => ({
  ...mockUsers.citizen,
  ...overrides,
  id: overrides.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  email: overrides.email || `test-${Date.now()}@example.com`
});

export const generateMockBill = (overrides: Partial<typeof mockBills.introduced> = {}) => ({
  ...mockBills.introduced,
  ...overrides,
  id: overrides.id || `bill-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  bill_number: overrides.bill_number || `C-${Math.floor(Math.random() * 9999) + 1}`
});

export const generateMockSponsor = (overrides: Partial<typeof mockSponsors.mp> = {}) => ({
  ...mockSponsors.mp,
  ...overrides,
  id: overrides.id || `sponsor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  name: overrides.name || `Hon. Test Sponsor ${Math.floor(Math.random() * 1000)}`
});

export const generateMockSession = (overrides: Partial<typeof mockSessions.active> = {}) => ({
  ...mockSessions.active,
  ...overrides,
  id: overrides.id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  token: overrides.token || `token-${Math.random().toString(36).substr(2, 20)}`
});

// Test data collections for batch operations
export const mockUserCollection = [
  mockUsers.citizen,
  mockUsers.expert,
  mockUsers.admin
];

export const mockBillCollection = [
  mockBills.introduced,
  mockBills.committee,
  mockBills.passed,
  mockBills.failed
];

export const mockSponsorCollection = [
  mockSponsors.mp,
  mockSponsors.senator,
  mockSponsors.minister
];

// API response templates
export const mockApiResponses = {
  success: (data: any, metadata: any = {}) => ({
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 100) + 50,
      source: 'test',
      ...metadata
    }
  }),

  error: (error: string, code?: string) => ({
    success: false,
    error,
    ...(code && { code }),
    metadata: {
      timestamp: new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 50) + 10,
      source: 'test'
    }
  }),

  paginated: (data: any[], pagination: any) => ({
    success: true,
    data,
    pagination,
    metadata: {
      timestamp: new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 100) + 50,
      source: 'test'
    }
  })
};

// Database query result templates
export const mockDbResults = {
  select: (data: any[]) => Promise.resolve(data),
  insert: (data: any) => Promise.resolve([data]),
  update: (data: any) => Promise.resolve([data]),
  delete: () => Promise.resolve([{ deletedCount: 1 }])
};

export default {
  users: mockUsers,
  bills: mockBills,
  sponsors: mockSponsors,
  sessions: mockSessions,
  passwordResets: mockPasswordResets,
  comments: mockComments,
  analytics: mockAnalytics,
  notifications: mockNotifications,
  generators: {
    generateMockUser,
    generateMockBill,
    generateMockSponsor,
    generateMockSession
  },
  collections: {
    users: mockUserCollection,
    bills: mockBillCollection,
    sponsors: mockSponsorCollection
  },
  apiResponses: mockApiResponses,
  dbResults: mockDbResults
};














































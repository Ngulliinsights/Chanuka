/**
 * Mock data utilities for unit testing
 * Provides consistent test data across all test suites
 */

export const mockUsers = {
  citizen: {
    id: 'user-citizen-1',
    email: 'citizen@example.com',
    passwordHash: '$2b$12$mockhashedpassword',
    firstName: 'John',
    lastName: 'Citizen',
    name: 'John Citizen',
    role: 'citizen',
    verificationStatus: 'verified',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-15'),
    preferences: {
      emailNotifications: true,
      emailVerified: true
    }
  },

  expert: {
    id: 'user-expert-1',
    email: 'expert@example.com',
    passwordHash: '$2b$12$mockhashedpassword',
    firstName: 'Dr. Jane',
    lastName: 'Expert',
    name: 'Dr. Jane Expert',
    role: 'expert',
    verificationStatus: 'verified',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-15'),
    preferences: {
      emailNotifications: true,
      emailVerified: true
    },
    expertise: ['technology', 'privacy', 'healthcare']
  },

  admin: {
    id: 'user-admin-1',
    email: 'admin@example.com',
    passwordHash: '$2b$12$mockhashedpassword',
    firstName: 'Admin',
    lastName: 'User',
    name: 'Admin User',
    role: 'admin',
    verificationStatus: 'verified',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-15'),
    preferences: {
      emailNotifications: true,
      emailVerified: true
    }
  },

  unverified: {
    id: 'user-unverified-1',
    email: 'unverified@example.com',
    passwordHash: '$2b$12$mockhashedpassword',
    firstName: 'Unverified',
    lastName: 'User',
    name: 'Unverified User',
    role: 'citizen',
    verificationStatus: 'pending',
    isActive: true,
    createdAt: new Date('2024-01-01'),
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
    passwordHash: '$2b$12$mockhashedpassword',
    firstName: 'Inactive',
    lastName: 'User',
    name: 'Inactive User',
    role: 'citizen',
    verificationStatus: 'verified',
    isActive: false,
    createdAt: new Date('2024-01-01'),
    preferences: {
      emailNotifications: false,
      emailVerified: true
    }
  }
};

export const mockBills = {
  introduced: {
    id: 'bill-1',
    billNumber: 'C-123',
    title: 'An Act to Enhance Digital Privacy Rights',
    summary: 'This bill aims to strengthen digital privacy protections for Canadian citizens.',
    description: 'A comprehensive bill that addresses various aspects of digital privacy including data collection, storage, and user consent requirements.',
    status: 'introduced',
    category: 'technology',
    priority: 'high',
    introducedDate: new Date('2024-01-15'),
    lastActionDate: new Date('2024-01-15'),
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
    billNumber: 'S-456',
    title: 'Healthcare Modernization Act',
    summary: 'Modernizing healthcare systems through technology integration.',
    description: 'This bill proposes updates to healthcare infrastructure and digital health records.',
    status: 'committee',
    category: 'healthcare',
    priority: 'medium',
    introducedDate: new Date('2023-12-01'),
    lastActionDate: new Date('2024-01-10'),
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
    billNumber: 'C-789',
    title: 'Environmental Protection Enhancement Act',
    summary: 'Strengthening environmental protection measures.',
    description: 'This bill introduces new environmental protection standards and enforcement mechanisms.',
    status: 'passed',
    category: 'environment',
    priority: 'high',
    introducedDate: new Date('2023-10-01'),
    lastActionDate: new Date('2023-12-15'),
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
    billNumber: 'C-999',
    title: 'Failed Legislation Example',
    summary: 'An example of failed legislation.',
    description: 'This bill was not passed due to various reasons.',
    status: 'failed',
    category: 'other',
    priority: 'low',
    introducedDate: new Date('2023-08-01'),
    lastActionDate: new Date('2023-11-30'),
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
    isActive: true,
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
    isActive: true,
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
    isActive: true,
    metadata: {
      source: 'parliament-ca',
      confidence: 0.97,
      lastSync: new Date('2024-01-16')
    }
  }
};

export const mockSessions = {
  active: {
    id: 'session-1',
    userId: 'user-citizen-1',
    token: 'valid-jwt-token',
    refreshTokenHash: 'hashed-refresh-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    metadata: {
      userAgent: 'Mozilla/5.0 Test Browser',
      ipAddress: '127.0.0.1',
      deviceType: 'desktop'
    }
  },

  expired: {
    id: 'session-2',
    userId: 'user-citizen-1',
    token: 'expired-jwt-token',
    refreshTokenHash: 'hashed-refresh-token',
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Still valid refresh
    isActive: true,
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-14'),
    metadata: {
      userAgent: 'Mozilla/5.0 Test Browser',
      ipAddress: '127.0.0.1',
      deviceType: 'desktop'
    }
  },

  inactive: {
    id: 'session-3',
    userId: 'user-citizen-1',
    token: 'inactive-jwt-token',
    refreshTokenHash: 'hashed-refresh-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: false, // Manually deactivated
    createdAt: new Date('2024-01-13'),
    updatedAt: new Date('2024-01-14'),
    metadata: {
      userAgent: 'Mozilla/5.0 Test Browser',
      ipAddress: '127.0.0.1',
      deviceType: 'desktop'
    }
  }
};

export const mockPasswordResets = {
  valid: {
    id: 'reset-1',
    userId: 'user-citizen-1',
    tokenHash: 'hashed-reset-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    createdAt: new Date('2024-01-15'),
    isUsed: false
  },

  expired: {
    id: 'reset-2',
    userId: 'user-citizen-1',
    tokenHash: 'hashed-expired-token',
    expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    createdAt: new Date('2024-01-14'),
    isUsed: false
  },

  used: {
    id: 'reset-3',
    userId: 'user-citizen-1',
    tokenHash: 'hashed-used-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date('2024-01-15'),
    isUsed: true,
    usedAt: new Date('2024-01-15')
  }
};

export const mockComments = {
  approved: {
    id: 'comment-1',
    billId: 'bill-1',
    userId: 'user-citizen-1',
    content: 'This is a thoughtful comment about the bill.',
    status: 'approved',
    votes: {
      upvotes: 5,
      downvotes: 1,
      score: 4
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    metadata: {
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Browser'
    }
  },

  pending: {
    id: 'comment-2',
    billId: 'bill-1',
    userId: 'user-expert-1',
    content: 'This comment is awaiting moderation.',
    status: 'pending',
    votes: {
      upvotes: 0,
      downvotes: 0,
      score: 0
    },
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16'),
    metadata: {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 Test Browser'
    }
  },

  rejected: {
    id: 'comment-3',
    billId: 'bill-2',
    userId: 'user-citizen-1',
    content: 'This comment was rejected for violating guidelines.',
    status: 'rejected',
    rejectionReason: 'Inappropriate content',
    votes: {
      upvotes: 0,
      downvotes: 0,
      score: 0
    },
    createdAt: new Date('2024-01-14'),
    updatedAt: new Date('2024-01-15'),
    moderatedBy: 'user-admin-1',
    moderatedAt: new Date('2024-01-15'),
    metadata: {
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Test Browser'
    }
  }
};

export const mockAnalytics = {
  billEngagement: {
    billId: 'bill-1',
    views: 1250,
    uniqueViews: 890,
    comments: 45,
    shares: 23,
    bookmarks: 67,
    averageTimeSpent: 180, // seconds
    bounceRate: 0.35,
    engagementScore: 0.78,
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
    sponsorId: 'sponsor-1',
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

export const mockNotifications = {
  billUpdate: {
    id: 'notification-1',
    userId: 'user-citizen-1',
    type: 'bill_update',
    title: 'Bill C-123 Status Update',
    message: 'The Digital Privacy Rights Act has moved to committee stage.',
    data: {
      billId: 'bill-1',
      oldStatus: 'introduced',
      newStatus: 'committee'
    },
    isRead: false,
    createdAt: new Date('2024-01-16'),
    scheduledFor: new Date('2024-01-16'),
    channels: ['email', 'web'],
    priority: 'medium'
  },

  commentReply: {
    id: 'notification-2',
    userId: 'user-citizen-1',
    type: 'comment_reply',
    title: 'New Reply to Your Comment',
    message: 'Dr. Jane Expert replied to your comment on Bill C-123.',
    data: {
      commentId: 'comment-1',
      replyId: 'comment-4',
      billId: 'bill-1'
    },
    isRead: false,
    createdAt: new Date('2024-01-16'),
    scheduledFor: new Date('2024-01-16'),
    channels: ['web'],
    priority: 'low'
  },

  systemAlert: {
    id: 'notification-3',
    userId: 'user-admin-1',
    type: 'system_alert',
    title: 'High Server Load Detected',
    message: 'Server load has exceeded 80% for the past 10 minutes.',
    data: {
      metric: 'cpu_usage',
      value: 85.2,
      threshold: 80,
      duration: 600 // seconds
    },
    isRead: true,
    readAt: new Date('2024-01-16'),
    createdAt: new Date('2024-01-16'),
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
  billNumber: overrides.billNumber || `C-${Math.floor(Math.random() * 9999) + 1}`
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












































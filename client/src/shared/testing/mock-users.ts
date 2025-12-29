/**
 * Mock User Data - Testing Infrastructure
 * 
 * Migrated from client/src/services/mockUserData.ts
 * Provides realistic mock user data for testing and development
 */



interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'expert' | 'official' | 'moderator' | 'admin';
  avatar_url?: string;
  bio?: string;
  location: {
    county: string;
    constituency: string;
    ward?: string;
  };
  expertise?: string[];
  verified: boolean;
  joinDate: string;
  lastActive: string;
  preferences: {
    notifications: boolean;
    emailAlerts: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: string;
  };
  stats: {
    commentsPosted: number;
    billsFollowed: number;
    votesParticipated: number;
    credibilityScore: number;
  };
}

interface MockUserProfile extends MockUser {
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  achievements: string[];
  recentActivity: {
    type: 'comment' | 'vote' | 'follow' | 'share';
    billId?: number;
    timestamp: string;
    description: string;
  }[];
}

class MockUserDataService {
  private readonly KENYAN_COUNTIES = [
    'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi',
    'Kitale', 'Garissa', 'Kakamega', 'Machakos', 'Meru', 'Nyeri', 'Kericho'
  ];

  private readonly CONSTITUENCIES = {
    'Nairobi': ['Westlands', 'Dagoretti North', 'Langata', 'Kibra', 'Roysambu', 'Kasarani'],
    'Mombasa': ['Mvita', 'Changamwe', 'Jomba', 'Kisauni', 'Nyali', 'Likoni'],
    'Kisumu': ['Kisumu East', 'Kisumu West', 'Kisumu Central', 'Muhoroni', 'Nyando'],
    'Nakuru': ['Nakuru Town East', 'Nakuru Town West', 'Bahati', 'Subukia', 'Rongai']
  };

  private readonly EXPERTISE_AREAS = [
    'Constitutional Law', 'Healthcare Policy', 'Education Reform', 'Environmental Law',
    'Economic Policy', 'Agriculture', 'Technology & Innovation', 'Human Rights',
    'Public Administration', 'Urban Planning', 'Energy Policy', 'Trade & Commerce'
  ];

  private readonly FIRST_NAMES = [
    'Amina', 'John', 'Grace', 'David', 'Fatuma', 'Peter', 'Mary', 'James',
    'Aisha', 'Michael', 'Catherine', 'Samuel', 'Zainab', 'Robert', 'Jane',
    'Daniel', 'Halima', 'Joseph', 'Ruth', 'Anthony', 'Khadija', 'Paul'
  ];

  private readonly LAST_NAMES = [
    'Wanjiku', 'Ochieng', 'Mwangi', 'Akinyi', 'Kamau', 'Otieno', 'Njeri',
    'Kiprotich', 'Wambui', 'Kiplagat', 'Nyong\'o', 'Ruto', 'Kenyatta',
    'Odinga', 'Mutua', 'Waiguru', 'Joho', 'Sonko', 'Kidero', 'Waititu'
  ];

  /**
   * Generates a single mock user
   */
  generateMockUser(overrides: Partial<MockUser> = {}): MockUser {
    const firstName = this.getRandomItem(this.FIRST_NAMES);
    const lastName = this.getRandomItem(this.LAST_NAMES);
    const county = this.getRandomItem(this.KENYAN_COUNTIES);
    const constituencies = this.CONSTITUENCIES[county as keyof typeof this.CONSTITUENCIES] || ['Central'];
    const constituency = this.getRandomItem(constituencies);
    
    const baseUser: MockUser = {
      id: crypto.randomUUID(),
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      role: this.getRandomRole(),
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}${lastName}`,
      bio: this.generateBio(),
      location: {
        county,
        constituency,
        ward: this.generateWardName()
      },
      expertise: this.generateExpertise(),
      verified: Math.random() > 0.3, // 70% verified
      joinDate: this.generateJoinDate(),
      lastActive: this.generateLastActive(),
      preferences: {
        notifications: Math.random() > 0.2, // 80% enable notifications
        emailAlerts: Math.random() > 0.4, // 60% enable email alerts
        theme: this.getRandomItem(['light', 'dark', 'auto']),
        language: Math.random() > 0.1 ? 'en' : 'sw' // 90% English, 10% Swahili
      },
      stats: {
        commentsPosted: Math.floor(Math.random() * 100),
        billsFollowed: Math.floor(Math.random() * 50),
        votesParticipated: Math.floor(Math.random() * 30),
        credibilityScore: Math.floor(Math.random() * 100)
      }
    };

    return { ...baseUser, ...overrides };
  }

  /**
   * Generates multiple mock users
   */
  generateMockUsers(count: number): MockUser[] {
    const users: MockUser[] = [];
    
    for (let i = 0; i < count; i++) {
      users.push(this.generateMockUser());
    }

    // Ensure we have at least one of each role
    const roles: MockUser['role'][] = ['citizen', 'expert', 'official', 'moderator', 'admin'];
    roles.forEach((role, index) => {
      if (index < users.length) {
        users[index].role = role;
      }
    });

    return users;
  }

  /**
   * Generates a detailed mock user profile
   */
  generateMockUserProfile(userId?: string): MockUserProfile {
    const baseUser = this.generateMockUser(userId ? { id: userId } : {});
    
    const profile: MockUserProfile = {
      ...baseUser,
      socialLinks: this.generateSocialLinks(),
      achievements: this.generateAchievements(baseUser.role, baseUser.stats),
      recentActivity: this.generateRecentActivity()
    };

    return profile;
  }

  /**
   * Generates mock expert users with specific expertise
   */
  generateExpertUsers(count: number = 10): MockUser[] {
    return Array.from({ length: count }, () => {
      const expert = this.generateMockUser({
        role: 'expert',
        verified: true,
        expertise: this.getRandomItems(this.EXPERTISE_AREAS, 2, 4)
      });
      
      // Experts have higher credibility scores
      expert.stats.credibilityScore = Math.floor(Math.random() * 30) + 70; // 70-100
      
      return expert;
    });
  }

  /**
   * Generates mock users for a specific location
   */
  generateUsersForLocation(county: string, count: number = 20): MockUser[] {
    const constituencies = this.CONSTITUENCIES[county as keyof typeof this.CONSTITUENCIES] || ['Central'];
    
    return Array.from({ length: count }, () => {
      return this.generateMockUser({
        location: {
          county,
          constituency: this.getRandomItem(constituencies),
          ward: this.generateWardName()
        }
      });
    });
  }

  /**
   * Generates realistic user interaction data
   */
  generateUserInteractions(userId: string, billIds: number[]): {
    comments: Array<{
      id: string;
      userId: string;
      billId: number;
      content: string;
      timestamp: string;
      votes: number;
    }>;
    votes: Array<{
      id: string;
      userId: string;
      billId: number;
      position: string;
      timestamp: string;
    }>;
    follows: Array<{
      id: string;
      userId: string;
      billId: number;
      timestamp: string;
    }>;
  } {
    const interactions: {
      comments: Array<{
        id: string;
        userId: string;
        billId: number;
        content: string;
        timestamp: string;
        votes: number;
      }>;
      votes: Array<{
        id: string;
        userId: string;
        billId: number;
        position: string;
        timestamp: string;
      }>;
      follows: Array<{
        id: string;
        userId: string;
        billId: number;
        timestamp: string;
      }>;
    } = {
      comments: [],
      votes: [],
      follows: []
    };

    // Generate comments
    const commentCount = Math.floor(Math.random() * 10);
    for (let i = 0; i < commentCount; i++) {
      interactions.comments.push({
        id: crypto.randomUUID(),
        userId,
        billId: this.getRandomItem(billIds),
        content: this.generateCommentContent(),
        timestamp: this.generateRecentTimestamp(),
        votes: Math.floor(Math.random() * 20)
      });
    }

    // Generate votes
    const voteCount = Math.floor(Math.random() * 15);
    for (let i = 0; i < voteCount; i++) {
      interactions.votes.push({
        id: crypto.randomUUID(),
        userId,
        billId: this.getRandomItem(billIds),
        position: this.getRandomItem(['support', 'oppose', 'neutral']),
        timestamp: this.generateRecentTimestamp()
      });
    }

    // Generate follows
    const followCount = Math.floor(Math.random() * 8);
    for (let i = 0; i < followCount; i++) {
      interactions.follows.push({
        id: crypto.randomUUID(),
        userId,
        billId: this.getRandomItem(billIds),
        timestamp: this.generateRecentTimestamp()
      });
    }

    return interactions;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private getRandomItems<T>(array: T[], min: number, max: number): T[] {
    const count = Math.floor(Math.random() * (max - min + 1)) + min;
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private getRandomRole(): MockUser['role'] {
    const roles: MockUser['role'][] = ['citizen', 'expert', 'official', 'moderator', 'admin'];
    const weights = [0.7, 0.15, 0.08, 0.05, 0.02]; // Weighted distribution
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < roles.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return roles[i];
      }
    }
    
    return 'citizen'; // fallback
  }

  private generateBio(): string {
    const bios = [
      'Passionate about civic engagement and community development.',
      'Advocate for transparent governance and citizen participation.',
      'Interested in policy analysis and legislative processes.',
      'Community organizer focused on local issues and solutions.',
      'Researcher in public policy and democratic institutions.',
      'Committed to improving public services and accountability.',
      'Expert in constitutional law and human rights.',
      'Environmental activist and sustainability advocate.',
      'Education policy specialist and reform advocate.',
      'Healthcare policy researcher and public health advocate.'
    ];
    
    return this.getRandomItem(bios);
  }

  private generateExpertise(): string[] {
    const roleBasedExpertise = Math.random() > 0.6; // 40% chance of having expertise
    
    if (!roleBasedExpertise) {
      return [];
    }
    
    return this.getRandomItems(this.EXPERTISE_AREAS, 1, 3);
  }

  private generateJoinDate(): string {
    const now = new Date();
    const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    const randomTime = threeYearsAgo.getTime() + Math.random() * (now.getTime() - threeYearsAgo.getTime());
    
    return new Date(randomTime).toISOString();
  }

  private generateLastActive(): string {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const randomTime = thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
    
    return new Date(randomTime).toISOString();
  }

  private generateWardName(): string {
    const wardPrefixes = ['Central', 'East', 'West', 'North', 'South'];
    const wardSuffixes = ['Ward', 'Division', 'Area', 'Zone'];
    
    return `${this.getRandomItem(wardPrefixes)} ${this.getRandomItem(wardSuffixes)}`;
  }

  private generateSocialLinks(): MockUserProfile['socialLinks'] {
    const hasLinks = Math.random() > 0.4; // 60% chance of having social links
    
    if (!hasLinks) {
      return undefined;
    }
    
    const links: MockUserProfile['socialLinks'] = {};
    
    if (Math.random() > 0.5) {
      links.twitter = `https://twitter.com/user${Math.floor(Math.random() * 10000)}`;
    }
    
    if (Math.random() > 0.7) {
      links.linkedin = `https://linkedin.com/in/user${Math.floor(Math.random() * 10000)}`;
    }
    
    if (Math.random() > 0.8) {
      links.website = `https://user${Math.floor(Math.random() * 10000)}.com`;
    }
    
    return Object.keys(links).length > 0 ? links : undefined;
  }

  private generateAchievements(role: MockUser['role'], stats: MockUser['stats']): string[] {
    const achievements: string[] = [];
    
    // Role-based achievements
    if (role === 'expert') {
      achievements.push('Verified Expert', 'Policy Contributor');
    }
    
    if (role === 'official') {
      achievements.push('Government Official', 'Public Servant');
    }
    
    // Stats-based achievements
    if (stats.commentsPosted > 50) {
      achievements.push('Active Contributor');
    }
    
    if (stats.billsFollowed > 20) {
      achievements.push('Legislative Tracker');
    }
    
    if (stats.votesParticipated > 15) {
      achievements.push('Engaged Citizen');
    }
    
    if (stats.credibilityScore > 80) {
      achievements.push('Trusted Voice');
    }
    
    return achievements;
  }

  private generateRecentActivity(): MockUserProfile['recentActivity'] {
    const activities: MockUserProfile['recentActivity'] = [];
    const activityCount = Math.floor(Math.random() * 10) + 5; // 5-15 activities
    
    for (let i = 0; i < activityCount; i++) {
      const type = this.getRandomItem(['comment', 'vote', 'follow', 'share']);
      const timestamp = this.generateRecentTimestamp();
      
      let description = '';
      const billId = Math.floor(Math.random() * 100) + 1;
      
      switch (type) {
        case 'comment':
          description = `Posted a comment on Bill #${billId}`;
          break;
        case 'vote':
          description = `Voted on Bill #${billId}`;
          break;
        case 'follow':
          description = `Started following Bill #${billId}`;
          break;
        case 'share':
          description = `Shared Bill #${billId}`;
          break;
      }
      
      activities.push({
        type: type as 'comment' | 'vote' | 'follow' | 'share',
        billId,
        timestamp,
        description
      });
    }
    
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private generateRecentTimestamp(): string {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const randomTime = sevenDaysAgo.getTime() + Math.random() * (now.getTime() - sevenDaysAgo.getTime());
    
    return new Date(randomTime).toISOString();
  }

  private generateCommentContent(): string {
    const comments = [
      'This bill addresses important issues in our community.',
      'I have concerns about the implementation timeline.',
      'Great initiative! This will benefit many citizens.',
      'We need more public consultation on this matter.',
      'The budget allocation seems insufficient.',
      'This aligns well with our constituency needs.',
      'I suggest amendments to section 3.',
      'Excellent work by the committee.',
      'More transparency is needed in this process.',
      'This will have positive economic impacts.'
    ];
    
    return this.getRandomItem(comments);
  }
}

// Export singleton instance
export const mockUserDataService = new MockUserDataService();

// Export utility functions
export const mockUserUtils = {
  generateRandomUserId(): string {
    return crypto.randomUUID();
  },

  createUserFromTemplate(template: Partial<MockUser>): MockUser {
    return mockUserDataService.generateMockUser(template);
  },

  filterUsersByRole(users: MockUser[], role: MockUser['role']): MockUser[] {
    return users.filter(user => user.role === role);
  },

  filterUsersByLocation(users: MockUser[], county: string): MockUser[] {
    return users.filter(user => user.location.county === county);
  },

  sortUsersByActivity(users: MockUser[]): MockUser[] {
    return users.sort((a, b) => {
      const aActivity = new Date(a.lastActive).getTime();
      const bActivity = new Date(b.lastActive).getTime();
      return bActivity - aActivity;
    });
  },

  getUserEngagementLevel(user: MockUser): 'low' | 'medium' | 'high' {
    const score = user.stats.commentsPosted + user.stats.votesParticipated * 2 + user.stats.billsFollowed;
    
    if (score >= 50) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  }
};

export default mockUserDataService;
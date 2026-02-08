/**
 * Mock Analytics Data
 *
 * Comprehensive mock data for engagement analytics, sentiment analysis,
 * temporal analytics, and gamification elements.
 */

import { faker } from '@faker-js/faker';

import {
  LiveEngagementMetrics,
  PersonalEngagementScore,
  CommunitysentimentAnalysis,
  ExpertVerificationMetrics,
  EngagementStatistics,
  TemporalAnalyticsData,
  UserEngagementProfile,
  EngagementNotification,
  CivicEngagementGoal,
  ContributionQualityMetrics,
  CommunityImpactMetrics,
  EngagementTrend,
} from '@client/lib/types';

import { mockExperts, mockOfficialExperts } from './experts';
import {
  generateId,
  generateDateInRange,
  generateTimeSeriesData,
  generateHourlyData,
  weightedRandom,
} from './generators';
import { mockUsers } from './users';

// Seed faker for consistent data
faker.seed(12345);

/**
 * Generate live engagement metrics
 */
export const generateLiveEngagementMetrics = (): LiveEngagementMetrics => {
  return {
    communityApproval: faker.number.float({ min: 0.6, max: 0.9, fractionDigits: 2 }),
    totalParticipants: faker.number.int({ min: 500, max: 5000 }),
    expertSupport: faker.number.float({ min: 0.4, max: 0.8, fractionDigits: 2 }),
    activeDiscussions: faker.number.int({ min: 20, max: 150 }),
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Generate personal engagement score
 */
export const generatePersonalEngagementScore = (userId: string): PersonalEngagementScore => {
  const participation = faker.number.float({ min: 0.3, max: 1.0, fractionDigits: 2 });
  const quality = faker.number.float({ min: 0.4, max: 1.0, fractionDigits: 2 });
  const expertise = faker.number.float({ min: 0.2, max: 0.9, fractionDigits: 2 });
  const community = faker.number.float({ min: 0.3, max: 1.0, fractionDigits: 2 });

  const totalScore = Math.round(
    (participation * 0.3 + quality * 0.25 + expertise * 0.2 + community * 0.25) * 1000
  );
  const totalUsers = faker.number.int({ min: 10000, max: 50000 });
  const rank = faker.number.int({ min: 1, max: Math.floor(totalUsers * 0.1) });

  return {
    totalScore,
    breakdown: {
      participation,
      quality,
      expertise,
      community,
    },
    rank,
    totalUsers,
    trend: faker.helpers.arrayElement(['up', 'down', 'stable']),
    methodology: {
      description:
        'Civic engagement score calculated based on participation frequency, contribution quality, demonstrated expertise, and community impact.',
      factors: [
        {
          name: 'Participation',
          weight: 0.3,
          description: 'Frequency and consistency of civic engagement activities',
          currentScore: participation,
        },
        {
          name: 'Quality',
          weight: 0.25,
          description: 'Quality and thoughtfulness of contributions and discussions',
          currentScore: quality,
        },
        {
          name: 'Expertise',
          weight: 0.2,
          description: 'Demonstrated knowledge and expertise in policy areas',
          currentScore: expertise,
        },
        {
          name: 'Community Impact',
          weight: 0.25,
          description: 'Positive impact on community discussions and civic outcomes',
          currentScore: community,
        },
      ],
    },
  };
};

/**
 * Generate community sentiment analysis
 */
export const generateCommunitysentimentAnalysis = (): CommunitysentimentAnalysis => {
  const positive = faker.number.float({ min: 0.3, max: 0.6, fractionDigits: 2 });
  const negative = faker.number.float({ min: 0.1, max: 0.3, fractionDigits: 2 });
  const neutral = Math.round((1 - positive - negative) * 100) / 100;

  const topics = [
    'Healthcare Reform',
    'Education Funding',
    'Environmental Policy',
    'Criminal Justice',
    'Infrastructure',
    'Economic Policy',
  ];

  const trending = topics.slice(0, 4).map(topic => ({
    topic,
    sentiment: faker.helpers.arrayElement(['positive', 'neutral', 'negative'] as const),
    change: faker.number.float({ min: -0.2, max: 0.3, fractionDigits: 2 }),
    volume: faker.number.int({ min: 50, max: 500 }),
  }));

  const polls = Array.from({ length: 3 }, () => {
    const responses = faker.number.int({ min: 100, max: 1000 });
    const options = ['Support', 'Oppose', 'Neutral', 'Need More Info'];
    const results = options.map(option => {
      const votes = faker.number.int({ min: 10, max: Math.floor(responses * 0.4) });
      return {
        option,
        votes,
        percentage: Math.round((votes / responses) * 100),
      };
    });

    return {
      id: generateId('poll'),
      question: faker.helpers.arrayElement([
        'Do you support the proposed healthcare reform?',
        'Should education funding be increased?',
        'Is the environmental protection bill sufficient?',
        'Do you agree with the criminal justice reforms?',
      ]),
      responses,
      results,
      endTime: new Date(
        Date.now() + faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000
      ).toISOString(),
    };
  });

  return {
    overall:
      positive > negative + 0.1 ? 'positive' : negative > positive + 0.1 ? 'negative' : 'neutral',
    distribution: {
      positive,
      neutral,
      negative,
    },
    trending,
    polls,
  };
};

/**
 * Generate expert verification metrics
 */
export const generateExpertVerificationMetrics = (): ExpertVerificationMetrics => {
  const allExperts = [...mockExperts, ...mockOfficialExperts];
  const totalExperts = allExperts.length;
  const activeExperts = faker.number.int({
    min: Math.floor(totalExperts * 0.6),
    max: Math.floor(totalExperts * 0.9),
  });

  const verificationStats = {
    official: allExperts.filter(e => e.verificationType === 'official').length,
    domain: allExperts.filter(e => e.verificationType === 'domain').length,
    identity: allExperts.filter(e => e.verificationType === 'identity').length,
  };

  const topExperts = faker.helpers.arrayElements(allExperts, 5).map(expert => ({
    id: expert.id,
    name: expert.name,
    credibilityScore: expert.credibilityScore,
    specializations: expert.specializations,
    recentContributions: faker.number.int({ min: 5, max: 25 }),
    communityRating: expert.avgCommunityRating,
  }));

  return {
    totalExperts,
    activeExperts,
    averageCredibility: faker.number.float({ min: 0.6, max: 0.85, fractionDigits: 2 }),
    verificationStats,
    topExperts,
  };
};

/**
 * Generate engagement statistics with gamification
 */
export const generateEngagementStatistics = (): EngagementStatistics => {
  const leaderboard = faker.helpers.arrayElements(mockUsers, 10).map((user, index) => ({
    userId: user.id,
    username: user.username || user.name,
    score: faker.number.int({ min: 1000, max: 10000 }) - index * 200,
    rank: index + 1,
    badge: faker.helpers.arrayElement([
      'Civic Champion',
      'Policy Expert',
      'Community Leader',
      'Rising Star',
      'Engaged Citizen',
    ]),
    contributions: {
      comments: faker.number.int({ min: 10, max: 200 }),
      votes: faker.number.int({ min: 50, max: 1000 }),
      shares: faker.number.int({ min: 5, max: 100 }),
    },
  }));

  const achievements = [
    {
      id: 'first_comment',
      name: 'First Comment',
      description: 'Posted your first comment',
      icon: '💬',
      rarity: 'common',
    },
    {
      id: 'expert_recognition',
      name: 'Expert Recognition',
      description: 'Received expert verification',
      icon: '🎓',
      rarity: 'rare',
    },
    {
      id: 'community_leader',
      name: 'Community Leader',
      description: 'Led 5 successful campaigns',
      icon: '👑',
      rarity: 'epic',
    },
    {
      id: 'policy_influencer',
      name: 'Policy Influencer',
      description: 'Influenced major policy decision',
      icon: '⚖️',
      rarity: 'legendary',
    },
    {
      id: 'civic_champion',
      name: 'Civic Champion',
      description: 'Top 1% civic engagement score',
      icon: '🏆',
      rarity: 'legendary',
    },
  ].map(achievement => ({
    ...achievement,
    rarity: achievement.rarity as 'common' | 'rare' | 'epic' | 'legendary',
    unlockedBy: faker.number.int({ min: 10, max: 5000 }),
  }));

  return {
    leaderboard,
    achievements,
    streaks: {
      current: faker.number.int({ min: 0, max: 30 }),
      longest: faker.number.int({ min: 5, max: 100 }),
      type: faker.helpers.arrayElement(['daily', 'weekly']),
    },
  };
};

/**
 * Generate temporal analytics data
 */
export const generateTemporalAnalyticsData = (): TemporalAnalyticsData => {
  return {
    hourly: generateHourlyData(24).map(({ hour, value }) => ({
      hour: String(hour),
      engagement: value,
      participants: Math.floor(value * 0.3),
      sentiment: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
    })),
    daily: generateTimeSeriesData(7, 150).map(({ date, value }) => ({
      date,
      engagement: value,
      participants: Math.floor(value * 0.4),
      sentiment: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
    })),
    weekly: generateTimeSeriesData(4, 800, 0.3).map(({ date, value }) => ({
      week: date,
      engagement: value,
      participants: Math.floor(value * 0.2),
      sentiment: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
    })),
  };
};

/**
 * Generate user engagement profile
 */
export const generateUserEngagementProfile = (userId: string): UserEngagementProfile => {
  const totalScore = faker.number.int({ min: 500, max: 8000 });
  const level = Math.floor(totalScore / 1000) + 1;

  const badges = faker.helpers.arrayElements(
    [
      'First Comment',
      'Active Participant',
      'Quality Contributor',
      'Expert Verified',
      'Community Leader',
      'Policy Advocate',
    ],
    faker.number.int({ min: 2, max: 5 })
  );

  const achievements = faker.helpers.arrayElements(
    ['civic_champion', 'policy_expert', 'community_leader', 'rising_star', 'engaged_citizen'],
    faker.number.int({ min: 1, max: 4 })
  );

  const specializations = faker.helpers.arrayElements(
    [
      'Healthcare Policy',
      'Environmental Law',
      'Education Reform',
      'Criminal Justice',
      'Economic Policy',
      'Civil Rights',
    ],
    faker.number.int({ min: 1, max: 3 })
  );

  const contributionHistory = Array.from({ length: 30 }, () => ({
    date: generateDateInRange(30, 0),
    type: faker.helpers.arrayElement(['comment', 'vote', 'share', 'analysis'] as const),
    billId: faker.number.int({ min: 1, max: 75 }),
    score: faker.number.int({ min: 1, max: 50 }),
  }));

  const impactMetrics: CommunityImpactMetrics = {
    billsInfluenced: faker.number.int({ min: 0, max: 15 }),
    policiesAffected: faker.number.int({ min: 0, max: 8 }),
    citizensReached: faker.number.int({ min: 50, max: 5000 }),
    mediaAttention: faker.number.int({ min: 0, max: 10 }),
    legislativeResponse: faker.number.int({ min: 0, max: 5 }),
  };

  const qualityMetrics: ContributionQualityMetrics = {
    averageLength: faker.number.int({ min: 50, max: 300 }),
    citationCount: faker.number.int({ min: 0, max: 25 }),
    upvoteRatio: faker.number.float({ min: 0.5, max: 0.95, fractionDigits: 2 }),
    expertEndorsements: faker.number.int({ min: 0, max: 15 }),
    factualAccuracy: faker.number.float({ min: 0.7, max: 1.0, fractionDigits: 2 }),
    constructiveness: faker.number.float({ min: 0.6, max: 1.0, fractionDigits: 2 }),
  };

  return {
    userId,
    totalScore,
    level,
    badges,
    achievements,
    specializations,
    contributionHistory,
    impactMetrics,
    qualityMetrics,
  };
};

/**
 * Generate civic engagement goals
 */
export const generateCivicEngagementGoals = (count: number = 5): CivicEngagementGoal[] => {
  const goalTemplates = [
    {
      name: 'Weekly Participation',
      description: 'Participate in civic discussions 5 times this week',
      category: 'participation' as const,
    },
    {
      name: 'Quality Contributions',
      description: 'Maintain 80% upvote ratio on comments',
      category: 'quality' as const,
    },
    {
      name: 'Community Building',
      description: 'Help 10 new users get started',
      category: 'community' as const,
    },
    {
      name: 'Expert Recognition',
      description: 'Earn expert verification in your field',
      category: 'expertise' as const,
    },
    {
      name: 'Policy Impact',
      description: 'Contribute to 3 policy discussions',
      category: 'participation' as const,
    },
  ];

  return faker.helpers.arrayElements(goalTemplates, count).map(template => {
    const targetValue = faker.number.int({ min: 5, max: 100 });
    const currentValue = faker.number.int({ min: 0, max: targetValue });

    return {
      id: generateId('goal'),
      ...template,
      targetValue,
      currentValue,
      progress: Math.round((currentValue / targetValue) * 100),
      deadline: faker.datatype.boolean({ probability: 0.7 })
        ? new Date(
            Date.now() + faker.number.int({ min: 7, max: 30 }) * 24 * 60 * 60 * 1000
          ).toISOString()
        : undefined,
    };
  });
};

/**
 * Generate engagement notifications
 */
export const generateEngagementNotifications = (count: number = 10): EngagementNotification[] => {
  const notificationTypes: Array<
    'achievement' | 'milestone' | 'trending' | 'expert_response' | 'community_update'
  > = ['achievement', 'milestone', 'trending', 'expert_response', 'community_update'];

  const templates = {
    achievement: [
      { title: 'Achievement Unlocked!', message: 'You earned the "Active Participant" badge' },
      {
        title: 'New Badge Earned!',
        message: 'Congratulations on becoming a "Quality Contributor"',
      },
    ],
    milestone: [
      { title: 'Milestone Reached!', message: "You've made 100 civic contributions" },
      { title: 'Level Up!', message: "You've reached civic engagement level 5" },
    ],
    trending: [
      { title: 'Trending Discussion', message: 'Your comment on healthcare reform is trending' },
      { title: 'Popular Contribution', message: 'Your analysis received 50+ upvotes' },
    ],
    expert_response: [
      { title: 'Expert Response', message: 'Dr. Smith responded to your policy question' },
      { title: 'Expert Endorsement', message: 'Your analysis was endorsed by a verified expert' },
    ],
    community_update: [
      {
        title: 'Community Update',
        message: 'New bill discussion started in your area of interest',
      },
      { title: 'Local Impact', message: "A bill you're tracking affects your district" },
    ],
  };

  return Array.from({ length: count }, () => {
    const type = faker.helpers.arrayElement(notificationTypes);
    const template = faker.helpers.arrayElement(templates[type]);

    return {
      id: generateId('notification'),
      type,
      title: template.title,
      message: template.message,
      data: {
        billId: faker.datatype.boolean({ probability: 0.6 })
          ? faker.number.int({ min: 1, max: 75 })
          : undefined,
        expertId: type === 'expert_response' ? generateId('expert') : undefined,
      },
      priority: weightedRandom(['low', 'medium', 'high'], [50, 40, 10]),
      timestamp: generateDateInRange(7, 0),
      read: faker.datatype.boolean({ probability: 0.6 }),
    };
  });
};

/**
 * Generate engagement trends
 */
export const generateEngagementTrends = (periods: string[]): EngagementTrend[] => {
  return periods.map(period => {
    const value = faker.number.int({ min: 100, max: 1000 });
    const change = faker.number.int({ min: -50, max: 100 });
    const changePercentage = value > 0 ? Math.round((change / value) * 100) : 0;

    return {
      period,
      value,
      change,
      changePercentage,
      trend: change > 10 ? 'increasing' : change < -10 ? 'decreasing' : 'stable',
    };
  });
};

/**
 * Default mock analytics datasets
 */
export const mockLiveEngagementMetrics = generateLiveEngagementMetrics();
export const mockPersonalEngagementScore = generatePersonalEngagementScore('current-user');
export const mockCommunitysentimentAnalysis = generateCommunitysentimentAnalysis();
export const mockExpertVerificationMetrics = generateExpertVerificationMetrics();
export const mockEngagementStatistics = generateEngagementStatistics();
export const mockTemporalAnalyticsData = generateTemporalAnalyticsData();
export const mockUserEngagementProfile = generateUserEngagementProfile('current-user');
export const mockCivicEngagementGoals = generateCivicEngagementGoals(6);
export const mockEngagementNotifications = generateEngagementNotifications(15);
export const mockEngagementTrends = generateEngagementTrends([
  'This Week',
  'Last Week',
  'This Month',
  'Last Month',
]);

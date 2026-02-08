/**
 * Mock Community Data
 *
 * Comprehensive mock data for community activities, trending topics,
 * campaigns, petitions, and local impact metrics.
 */

import { faker } from '@faker-js/faker';

import {
  ActivityItem,
  ExpertInsight,
  Campaign,
  Petition,
  CommunityStats,
  LocalImpactMetrics,
} from '@client/lib/types';
import { TrendingTopic } from '@client/lib/types/community/community-base';

import { mockExperts, mockOfficialExperts } from './experts';
import {
  generateId,
  generateDateInRange,
  generateEngagementMetrics,
  generateTrendingMetrics,
  generateLocation,
  generatePolicyAreas,
  generateCommentContent,
  weightedRandom,
} from './generators';
import { mockUsers } from './users';

// Seed faker for consistent data
faker.seed(12345);

/**
 * Generate activity items for community feed
 */
export const generateActivityItems = (count: number = 50): ActivityItem[] => {
  const activityTypes: Array<
    | 'comment'
    | 'discussion'
    | 'expert_contribution'
    | 'bill_save'
    | 'bill_share'
    | 'campaign_join'
    | 'petition_sign'
  > = [
    'comment',
    'discussion',
    'expert_contribution',
    'bill_save',
    'bill_share',
    'campaign_join',
    'petition_sign',
  ];

  const allExperts = [...mockExperts, ...mockOfficialExperts];
  const allUsers = [...mockUsers];

  return Array.from({ length: count }, () => {
    const type = weightedRandom(activityTypes, [30, 15, 20, 10, 10, 10, 5]);
    const isExpertActivity =
      type === 'expert_contribution' || faker.datatype.boolean({ probability: 0.3 });

    const user =
      isExpertActivity && allExperts.length > 0
        ? faker.helpers.arrayElement(allExperts)
        : faker.helpers.arrayElement(allUsers);

    const expertInfo =
      isExpertActivity && allExperts.some(e => e.id === user.id)
        ? {
            verificationType: (user as any).verificationType || 'domain',
            credibilityScore: (user as any).credibilityScore || 0.7,
            specializations: (user as any).specializations || ['Policy Analysis'],
          }
        : undefined;

    const location = generateLocation();
    const trending = generateTrendingMetrics();
    const engagement = generateEngagementMetrics(faker.number.float({ min: 0.5, max: 2.0 }));

    const titles = {
      comment: 'Commented on bill discussion',
      discussion: 'Started new discussion',
      expert_contribution: 'Provided expert analysis',
      bill_save: 'Saved bill for tracking',
      bill_share: 'Shared bill with community',
      campaign_join: 'Joined advocacy campaign',
      petition_sign: 'Signed petition',
    };

    const content =
      type === 'comment' || type === 'discussion' || type === 'expert_contribution'
        ? generateCommentContent(isExpertActivity)
        : undefined;

    return {
      id: generateId('activity'),
      type,
      userId: user.id,
      userName: user.name || `User ${user.id}`,
      userAvatar: (user as any).avatar || faker.image.avatar(),
      expertInfo: expertInfo ? {
        isVerified: true,
        specialty: expertInfo.specializations?.[0],
        credibilityScore: expertInfo.credibilityScore,
      } : undefined,
      title: titles[type],
      content,
      summary: content ? content.substring(0, 150) + '...' : undefined,
      billId: faker.number.int({ min: 1, max: 75 }),
      billTitle: faker.helpers.arrayElement([
        'Healthcare Access Improvement Act',
        'Environmental Protection Enhancement Bill',
        'Education Funding Reform Act',
        'Infrastructure Investment Bill',
        'Criminal Justice Reform Act',
      ]),
      threadId: type === 'discussion' ? generateId('discussion') : undefined,
      commentId: type === 'comment' ? generateId('comment') : undefined,
      timestamp: generateDateInRange(30, 0),
      location,
      likes: engagement.saveCount,
      replies: Math.floor(engagement.commentCount * 0.3),
      shares: engagement.shareCount,
      userHasLiked: faker.datatype.boolean({ probability: 0.2 }),
      trendingScore: trending.trendingScore,
    };
  });
};

/**
 * Generate trending topics
 */
export const generateTrendingTopics = (count: number = 15): TrendingTopic[] => {
  const categories: Array<'bill' | 'policy_area' | 'campaign' | 'general'> = [
    'bill',
    'policy_area',
    'campaign',
    'general',
  ];

  const topicTitles = {
    bill: [
      'Healthcare Reform Debate Intensifies',
      'Infrastructure Bill Gains Momentum',
      'Climate Action Legislation Under Review',
      'Education Funding Controversy',
      'Criminal Justice Reform Progress',
    ],
    policy_area: [
      'Environmental Policy Discussions',
      'Healthcare Access Concerns',
      'Economic Recovery Strategies',
      'Technology Regulation Debates',
      'Immigration Policy Updates',
    ],
    campaign: [
      'Save Our Schools Campaign',
      'Clean Energy Initiative',
      'Healthcare for All Movement',
      'Criminal Justice Reform Coalition',
      'Infrastructure Investment Drive',
    ],
    general: [
      'Civic Engagement Rising',
      'Youth Political Participation',
      'Community Organizing Efforts',
      'Voter Registration Drives',
      'Town Hall Meetings Increase',
    ],
  };

  return Array.from({ length: count }, (): TrendingTopic => {
    const category = faker.helpers.arrayElement(categories);
    const title = faker.helpers.arrayElement(topicTitles[category]);
    const trending = generateTrendingMetrics();

    return {
      id: generateId('topic'),
      name: title,
      category: faker.helpers.arrayElement([
        'healthcare',
        'education',
        'environment',
        'economy',
        'security',
        'infrastructure',
        'social',
        'other',
      ] as const),
      billCount: faker.number.int({ min: 1, max: 10 }),
      isActive: faker.datatype.boolean({ probability: 0.7 }),
      description: faker.lorem.paragraph(2),
      keywords: generatePolicyAreas(faker.number.int({ min: 2, max: 5 })),
      createdAt: generateDateInRange(30, 0),
      updatedAt: generateDateInRange(7, 0),
      trendingScore: trending.trendingScore,
    };
  });
};

/**
 * Generate expert insights
 */
export const generateExpertInsights = (count: number = 20): ExpertInsight[] => {
  const allExperts = [...mockExperts, ...mockOfficialExperts];

  return Array.from({ length: count }, () => {
    const expert = faker.helpers.arrayElement(allExperts);
    const policyAreas = generatePolicyAreas(faker.number.int({ min: 1, max: 2 }));
    const engagement = generateEngagementMetrics(faker.number.float({ min: 1.0, max: 2.5 }));

    return {
      id: generateId('insight'),
      expertId: expert.id,
      expertName: expert.name,
      expertAvatar: expert.avatar,
      title: faker.helpers.arrayElement([
        'Constitutional Analysis of Recent Legislation',
        'Policy Impact Assessment and Recommendations',
        'Comparative Analysis with International Standards',
        'Implementation Challenges and Solutions',
        'Long-term Implications for Governance',
      ]),
      content: generateCommentContent(true),
      summary: faker.lorem.paragraph(1),
      confidence: faker.number.float({ min: 0.7, max: 1.0, fractionDigits: 2 }),
      methodology:
        'Analysis based on constitutional precedent, policy research, and stakeholder consultation.',
      sources: faker.helpers.arrayElements(
        [
          'Congressional Research Service',
          'Government Accountability Office',
          'Supreme Court Decisions',
          'Academic Research',
          'International Policy Studies',
        ],
        faker.number.int({ min: 2, max: 4 })
      ),
      billId: faker.number.int({ min: 1, max: 75 }),
      billTitle: faker.helpers.arrayElement([
        'Healthcare Access Improvement Act',
        'Environmental Protection Enhancement Bill',
        'Education Funding Reform Act',
      ]),
      policyAreas: generatePolicyAreas(faker.number.int({ min: 1, max: 2 })),
      specializations: expert.specializations,
      comments: engagement.commentCount,
      shares: engagement.shareCount,
      communityValidation: {
        upvotes: faker.number.int({ min: 10, max: 150 }),
        downvotes: faker.number.int({ min: 0, max: 20 }),
        validationScore: faker.number.float({ min: 0.6, max: 1.0, fractionDigits: 2 }),
      },
      published: true,
      reviewStatus: 'approved' as const,
      createdAt: generateDateInRange(30, 0),
      lastUpdated: generateDateInRange(7, 0),
    };
  });
};

/**
 * Generate campaigns
 */
export const generateCampaigns = (count: number = 12): Campaign[] => {
  const campaignTypes: Array<'advocacy' | 'petition' | 'awareness' | 'action'> = [
    'advocacy',
    'petition',
    'awareness',
    'action',
  ];

  const statuses: Array<'active' | 'completed' | 'paused' | 'cancelled'> = [
    'active',
    'completed',
    'paused',
    'cancelled',
  ];

  const campaignTitles = [
    'Save Public Education Funding',
    'Clean Energy Transition Initiative',
    'Healthcare Access for All',
    'Criminal Justice Reform Now',
    'Infrastructure Investment Campaign',
    'Climate Action Coalition',
    'Affordable Housing Initiative',
    'Veterans Benefits Protection',
  ];

  return Array.from({ length: count }, (): Campaign => {
    const type = faker.helpers.arrayElement(campaignTypes);
    const status = weightedRandom(statuses, [60, 20, 15, 5]) as 'active' | 'completed' | 'cancelled';
    const title = faker.helpers.arrayElement(campaignTitles);

    const goal = faker.number.int({ min: 1000, max: 50000 });
    const currentProgress =
      status === 'active'
        ? faker.number.int({ min: Math.floor(goal * 0.1), max: Math.floor(goal * 0.9) })
        : status === 'completed'
          ? goal
          : faker.number.int({ min: 0, max: Math.floor(goal * 0.5) });

    return {
      id: generateId('campaign'),
      title,
      description: faker.lorem.paragraph(3),
      organizerId: faker.helpers.arrayElement(mockUsers).id,
      startDate: generateDateInRange(90, 0),
      endDate:
        status === 'active'
          ? new Date(
              Date.now() + faker.number.int({ min: 30, max: 180 }) * 24 * 60 * 60 * 1000
            ).toISOString()
          : generateDateInRange(30, 0),
      goal,
      currentProgress,
      status,
      tags: generatePolicyAreas(faker.number.int({ min: 1, max: 3 })),
    };
  });
};

/**
 * Generate petitions
 */
export const generatePetitions = (count: number = 8): Petition[] => {
  const statuses: Array<'active' | 'successful' | 'closed' | 'expired'> = [
    'active',
    'successful',
    'closed',
    'expired',
  ];

  const petitionTitles = [
    'Stop Cuts to Education Funding',
    'Protect Environmental Regulations',
    'Expand Healthcare Coverage',
    'Reform Criminal Justice System',
    'Increase Infrastructure Investment',
    'Support Renewable Energy Transition',
  ];

  return Array.from({ length: count }, () => {
    const status = weightedRandom(statuses, [50, 25, 15, 10]);
    const title = faker.helpers.arrayElement(petitionTitles);

    const goal = faker.number.int({ min: 5000, max: 100000 });
    const currentSignatures =
      status === 'active'
        ? faker.number.int({ min: Math.floor(goal * 0.1), max: Math.floor(goal * 0.8) })
        : status === 'successful'
          ? faker.number.int({ min: goal, max: goal * 1.5 })
          : faker.number.int({ min: 0, max: Math.floor(goal * 0.6) });

    // Map status to match Petition interface
    const petitionStatus: 'open' | 'closed' | 'submitted' =
      status === 'active' ? 'open' : status === 'successful' ? 'submitted' : 'closed';

    return {
      id: generateId('petition'),
      title,
      summary: faker.lorem.paragraph(1),
      target: faker.helpers.arrayElement([
        'Senator Kiptoo',
        'Hon. Amina Mohamed',
        'Governor Omondi',
        'Cabinet Secretary for Health',
      ]),
      signatureCount: currentSignatures,
      signatureGoal: goal,
      deadline:
        petitionStatus === 'open'
          ? new Date(
              Date.now() + faker.number.int({ min: 30, max: 90 }) * 24 * 60 * 60 * 1000
            ).toISOString()
          : undefined,
      status: petitionStatus,
      creatorId: faker.helpers.arrayElement(mockUsers).id,
      createdAt: generateDateInRange(120, 0),
    };
  });
};

/**
 * Generate community statistics
 */
export const generateCommunityStats = (): CommunityStats => {
  const totalUsers = faker.number.int({ min: 10000, max: 100000 });
  const activeUsers = faker.number.int({
    min: Math.floor(totalUsers * 0.01),
    max: Math.floor(totalUsers * 0.05),
  });

  return {
    totalUsers,
    activeUsers,
    totalComments: faker.number.int({ min: 2000, max: 25000 }),
    totalThreads: faker.number.int({ min: 500, max: 5000 }),
    totalExperts: faker.number.int({ min: 100, max: 1000 }),
    averageCommentLength: faker.number.int({ min: 100, max: 500 }),
    engagementRate: faker.number.float({ min: 0.1, max: 0.5, fractionDigits: 2 }),
  };
};

/**
 * Generate local impact metrics
 */
export const generateLocalImpactMetrics = (location?: {
  state?: string;
  district?: string;
  county?: string;
}): LocalImpactMetrics => {
  const billId = faker.number.int({ min: 1, max: 75 });
  const region = location?.state || faker.location.state();

  return {
    billId,
    region,
    communityReach: faker.number.int({ min: 100, max: 10000 }),
    engagementLevel: faker.helpers.arrayElement(['low', 'medium', 'high', 'very_high'] as const),
    sentimentScore: faker.number.float({ min: -1, max: 1, fractionDigits: 2 }),
    topicsRaised: generatePolicyAreas(faker.number.int({ min: 3, max: 7 })),
  };
};

/**
 * Default mock community datasets
 */
export const mockActivityItems = generateActivityItems(100);
export const mockTrendingTopics = generateTrendingTopics(20);
export const mockExpertInsights = generateExpertInsights(25);
export const mockCampaigns = generateCampaigns(15);
export const mockPetitions = generatePetitions(10);
export const mockCommunityStats = generateCommunityStats();
export const mockLocalImpactMetrics = generateLocalImpactMetrics();

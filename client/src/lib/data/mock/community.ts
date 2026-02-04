/**
 * Mock Community Data
 *
 * Comprehensive mock data for community activities, trending topics,
 * campaigns, petitions, and local impact metrics.
 */

import { faker } from '@faker-js/faker';

import {
  ActivityItem,
  TrendingTopic,
  ExpertInsight,
  Campaign,
  Petition,
  CommunityStats,
  LocalImpactMetrics,
} from '@client/lib/types';

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
      expertInfo,
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
      discussionId: type === 'discussion' ? generateId('discussion') : undefined,
      campaignId: type === 'campaign_join' ? generateId('campaign') : undefined,
      petitionId: type === 'petition_sign' ? generateId('petition') : undefined,
      timestamp: generateDateInRange(30, 0),
      location,
      likes: engagement.saveCount,
      replies: Math.floor(engagement.commentCount * 0.3),
      shares: engagement.shareCount,
      userHasLiked: faker.datatype.boolean({ probability: 0.2 }),
      ...trending,
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

  return Array.from({ length: count }, () => {
    const category = faker.helpers.arrayElement(categories);
    const title = faker.helpers.arrayElement(topicTitles[category]);
    const policyAreas = generatePolicyAreas(faker.number.int({ min: 1, max: 3 }));
    const trending = generateTrendingMetrics();

    const activityCount = faker.number.int({ min: 50, max: 1000 });
    const participantCount = faker.number.int({ min: 20, max: 500 });
    const expertCount = faker.number.int({ min: 2, max: 25 });

    // Generate geographic distribution
    const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu'];
    const geographicDistribution = counties.map(county => {
      const count = faker.number.int({ min: 5, max: 100 });
      return {
        state: county, // Keeping key as 'state' for compatibility
        count,
        percentage: faker.number.float({ min: 5, max: 35, fractionDigits: 1 }),
      };
    });

    return {
      id: generateId('topic'),
      title,
      description: faker.lorem.paragraph(2),
      category,
      billIds:
        category === 'bill'
          ? Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () =>
              faker.number.int({ min: 1, max: 75 })
            )
          : [],
      policyAreas,
      activityCount,
      participantCount,
      expertCount,
      ...trending,
      hourlyActivity: Array.from({ length: 24 }, () => faker.number.int({ min: 0, max: 50 })),
      dailyActivity: Array.from({ length: 7 }, () => faker.number.int({ min: 10, max: 200 })),
      weeklyActivity: Array.from({ length: 4 }, () => faker.number.int({ min: 100, max: 800 })),
      geographicDistribution,
      timestamp: generateDateInRange(7, 0),
      lastUpdated: generateDateInRange(1, 0),
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
      verificationType: expert.verificationType,
      credibilityScore: expert.credibilityScore,
      specializations: expert.specializations,
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
      policyAreas,
      likes: engagement.saveCount,
      comments: engagement.commentCount,
      shares: engagement.shareCount,
      communityValidation: {
        upvotes: faker.number.int({ min: 10, max: 150 }),
        downvotes: faker.number.int({ min: 0, max: 20 }),
        validationScore: faker.number.float({ min: 0.6, max: 1.0, fractionDigits: 2 }),
      },
      timestamp: generateDateInRange(30, 0),
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

  return Array.from({ length: count }, () => {
    const type = faker.helpers.arrayElement(campaignTypes);
    const status = weightedRandom(statuses, [60, 20, 15, 5]);
    const title = faker.helpers.arrayElement(campaignTitles);
    const policyAreas = generatePolicyAreas(faker.number.int({ min: 1, max: 2 }));

    const goal = faker.number.int({ min: 1000, max: 50000 });
    const currentCount =
      status === 'active'
        ? faker.number.int({ min: Math.floor(goal * 0.1), max: Math.floor(goal * 0.9) })
        : status === 'completed'
          ? goal
          : faker.number.int({ min: 0, max: Math.floor(goal * 0.5) });

    const location = generateLocation();

    return {
      id: generateId('campaign'),
      title,
      description: faker.lorem.paragraph(3),
      summary: faker.lorem.paragraph(1),
      type,
      status,
      billIds: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () =>
        faker.number.int({ min: 1, max: 75 })
      ),
      policyAreas,
      organizerId: faker.helpers.arrayElement(mockUsers).id,
      organizerName: faker.person.fullName(),
      organizerType: faker.helpers.arrayElement(['individual', 'organization', 'expert']),
      goal,
      currentCount,
      progressPercentage: Math.round((currentCount / goal) * 100),
      targetGeography: {
        states: [location.state],
        districts: [location.district],
        counties: [location.county],
      },
      participantCount: faker.number.int({ min: 50, max: 2000 }),
      shareCount: faker.number.int({ min: 10, max: 500 }),
      startDate: generateDateInRange(90, 0),
      endDate:
        status === 'active'
          ? new Date(
              Date.now() + faker.number.int({ min: 30, max: 180 }) * 24 * 60 * 60 * 1000
            ).toISOString()
          : generateDateInRange(30, 0),
      createdAt: generateDateInRange(120, 0),
      updatedAt: generateDateInRange(7, 0),
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
    const policyAreas = generatePolicyAreas(faker.number.int({ min: 1, max: 2 }));

    const goal = faker.number.int({ min: 5000, max: 100000 });
    const currentSignatures =
      status === 'active'
        ? faker.number.int({ min: Math.floor(goal * 0.1), max: Math.floor(goal * 0.8) })
        : status === 'successful'
          ? faker.number.int({ min: goal, max: goal * 1.5 })
          : faker.number.int({ min: 0, max: Math.floor(goal * 0.6) });

    // Generate signatures by location
    const counties = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu'];
    const signaturesByLocation = counties.map(county => {
      const count = faker.number.int({ min: 100, max: Math.floor(currentSignatures * 0.3) });
      return {
        state: county, // Keeping key as 'state' for compatibility but value is county
        count,
        percentage: faker.number.float({ min: 5, max: 30, fractionDigits: 1 }),
      };
    });

    return {
      id: generateId('petition'),
      title,
      description: faker.lorem.paragraph(3),
      summary: faker.lorem.paragraph(1),
      billIds: Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () =>
        faker.number.int({ min: 1, max: 75 })
      ),
      policyAreas,
      targetOfficial: faker.helpers.arrayElement([
        'Senator Kiptoo',
        'Hon. Amina Mohamed',
        'Governor Omondi',
        'Cabinet Secretary for Health',
      ]),
      targetOffice: faker.helpers.arrayElement([
        'The Senate',
        'National Assembly',
        "Council of Governors",
        'Ministry of Health',
      ]),
      goal,
      currentSignatures,
      progressPercentage: Math.round((currentSignatures / goal) * 100),
      creatorId: faker.helpers.arrayElement(mockUsers).id,
      creatorName: faker.person.fullName(),
      signaturesByLocation,
      status,
      createdAt: generateDateInRange(120, 0),
      deadline:
        status === 'active'
          ? new Date(
              Date.now() + faker.number.int({ min: 30, max: 90 }) * 24 * 60 * 60 * 1000
            ).toISOString()
          : undefined,
      updatedAt: generateDateInRange(7, 0),
    };
  });
};

/**
 * Generate community statistics
 */
export const generateCommunityStats = (): CommunityStats => {
  const totalMembers = faker.number.int({ min: 10000, max: 100000 });

  return {
    totalMembers,
    activeToday: faker.number.int({
      min: Math.floor(totalMembers * 0.01),
      max: Math.floor(totalMembers * 0.05),
    }),
    activeThisWeek: faker.number.int({
      min: Math.floor(totalMembers * 0.1),
      max: Math.floor(totalMembers * 0.3),
    }),
    totalDiscussions: faker.number.int({ min: 500, max: 5000 }),
    totalComments: faker.number.int({ min: 2000, max: 25000 }),
    expertContributions: faker.number.int({ min: 100, max: 1000 }),
    activeCampaigns: faker.number.int({ min: 5, max: 20 }),
    activePetitions: faker.number.int({ min: 3, max: 15 }),
    lastUpdated: new Date().toISOString(),
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
  const defaultLocation = location || generateLocation();

  return {
    ...defaultLocation,
    totalActivity: faker.number.int({ min: 100, max: 2000 }),
    uniqueParticipants: faker.number.int({ min: 50, max: 800 }),
    expertParticipants: faker.number.int({ min: 5, max: 50 }),
    billsDiscussed: faker.number.int({ min: 10, max: 75 }),
    billsSaved: faker.number.int({ min: 50, max: 500 }),
    billsShared: faker.number.int({ min: 20, max: 200 }),
    campaignsActive: faker.number.int({ min: 2, max: 10 }),
    petitionsActive: faker.number.int({ min: 1, max: 8 }),
    averageEngagement: faker.number.float({ min: 0.3, max: 0.8, fractionDigits: 2 }),
    topTopics: Array.from({ length: 5 }, () => ({
      title: faker.helpers.arrayElement([
        'Healthcare Reform',
        'Education Funding',
        'Infrastructure Investment',
        'Environmental Protection',
        'Criminal Justice Reform',
      ]),
      score: faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 }),
      category: faker.helpers.arrayElement(['bill', 'policy_area', 'campaign']),
    })),
    lastUpdated: new Date().toISOString(),
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

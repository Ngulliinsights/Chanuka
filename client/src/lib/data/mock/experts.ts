/**
 * Mock Expert Data
 *
 * Comprehensive mock data for expert verification, credentials, contributions,
 * and community validation.
 */

import { faker } from '@faker-js/faker';

import {
  Expert,
  ExpertCredential,
  ExpertAffiliation,
  ExpertContribution,
  ExpertConsensus,
  CredibilityMetrics,
  CommunityValidationType,
} from '@client/lib/types';

import {
  generateId,
  generateDateInRange,
  generateVotingMetrics,
  generatePolicyAreas,
  generateCommentContent,
  weightedRandom,
} from './generators';

// Seed faker for consistent data
faker.seed(12345);

/**
 * Generate expert credentials
 */
const generateExpertCredentials = (count: number = 3): ExpertCredential[] => {
  const credentialTypes: Array<'education' | 'certification' | 'experience' | 'publication'> = [
    'education',
    'certification',
    'experience',
    'publication',
  ];

  const institutions = [
    'Harvard University',
    'Stanford University',
    'Yale University',
    'MIT',
    'Georgetown University',
    'American Bar Association',
    'Brookings Institution',
    'Council on Foreign Relations',
    'Heritage Foundation',
    'Urban Institute',
  ];

  const educationTitles = [
    'J.D. in Constitutional Law',
    'Ph.D. in Political Science',
    'M.P.P. in Public Policy',
    'LL.M. in Administrative Law',
    'Ph.D. in Economics',
    'M.A. in International Relations',
  ];

  const certificationTitles = [
    'Certified Public Policy Analyst',
    'Board Certified in Administrative Law',
    'Certified Government Ethics Advisor',
    'Licensed Policy Consultant',
  ];

  const experienceTitles = [
    'Senior Policy Advisor',
    'Legislative Counsel',
    'Chief of Staff',
    'Policy Director',
    'Senior Attorney',
    'Research Director',
  ];

  const publicationTitles = [
    'Constitutional Interpretation in Modern Context',
    'Policy Analysis Quarterly',
    'Administrative Law Review',
    'Journal of Public Policy',
    'Harvard Law Review',
  ];

  return Array.from({ length: count }, () => {
    const type = faker.helpers.arrayElement(credentialTypes);
    let title: string;

    switch (type) {
      case 'education':
        title = faker.helpers.arrayElement(educationTitles);
        break;
      case 'certification':
        title = faker.helpers.arrayElement(certificationTitles);
        break;
      case 'experience':
        title = faker.helpers.arrayElement(experienceTitles);
        break;
      case 'publication':
        title = faker.helpers.arrayElement(publicationTitles);
        break;
    }

    return {
      id: generateId('cred'),
      type,
      title,
      institution: faker.helpers.arrayElement(institutions),
      year: type === 'education' ? faker.number.int({ min: 1990, max: 2020 }) : undefined,
      verified: faker.datatype.boolean({ probability: 0.8 }),
      verificationDate: generateDateInRange(365, 0),
      verificationSource: faker.helpers.arrayElement([
        'Institution',
        'Third Party',
        'Document Review',
      ]),
    };
  });
};

/**
 * Generate expert affiliations
 */
const generateExpertAffiliations = (count: number = 2): ExpertAffiliation[] => {
  const affiliationTypes: Array<'academic' | 'government' | 'ngo' | 'private' | 'judicial'> = [
    'academic',
    'government',
    'ngo',
    'private',
    'judicial',
  ];

  const organizations = {
    academic: ['Harvard Law School', 'Georgetown Public Policy Institute', 'Brookings Institution'],
    government: [
      'Department of Justice',
      'Congressional Research Service',
      'Government Accountability Office',
    ],
    ngo: ['American Civil Liberties Union', 'Common Cause', 'Public Citizen'],
    private: ['Arnold & Porter', 'Covington & Burling', 'Policy Analytics LLC'],
    judicial: ['Federal District Court', 'State Supreme Court', 'Administrative Law Court'],
  };

  const roles = {
    academic: ['Professor', 'Research Fellow', 'Visiting Scholar', 'Department Chair'],
    government: ['Senior Advisor', 'Policy Analyst', 'Legislative Counsel', 'Director'],
    ngo: ['Senior Attorney', 'Policy Director', 'Research Director', 'Board Member'],
    private: ['Partner', 'Senior Associate', 'Consultant', 'Managing Director'],
    judicial: ['Law Clerk', 'Staff Attorney', 'Court Administrator', 'Judicial Fellow'],
  };

  return Array.from({ length: count }, () => {
    const type = faker.helpers.arrayElement(affiliationTypes);
    const organization = faker.helpers.arrayElement(organizations[type]);
    const role = faker.helpers.arrayElement(roles[type]);
    const current = faker.datatype.boolean({ probability: 0.6 });

    return {
      id: generateId('affil'),
      organization,
      role,
      type,
      current,
      verified: faker.datatype.boolean({ probability: 0.9 }),
      startDate: generateDateInRange(2000, current ? 0 : 365),
      endDate: current ? undefined : generateDateInRange(365, 0),
    };
  });
};

/**
 * Generate credibility metrics
 */
const generateCredibilityMetrics = (expertId: string): CredibilityMetrics => {
  const credentialScore = faker.number.float({ min: 0.6, max: 1.0, fractionDigits: 2 });
  const affiliationScore = faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 });
  const communityScore = faker.number.float({ min: 0.3, max: 1.0, fractionDigits: 2 });
  const contributionQuality = faker.number.float({ min: 0.4, max: 1.0, fractionDigits: 2 });
  const consensusAlignment = faker.number.float({ min: 0.2, max: 1.0, fractionDigits: 2 });

  const overallScore =
    credentialScore * 0.25 +
    affiliationScore * 0.2 +
    communityScore * 0.25 +
    contributionQuality * 0.2 +
    consensusAlignment * 0.1;

  return {
    expertId,
    overallScore: Math.round(overallScore * 100) / 100,
    components: {
      credentialScore,
      affiliationScore,
      communityScore,
      contributionQuality,
      consensusAlignment,
    },
    methodology: {
      description:
        'Credibility score calculated using verified credentials, institutional affiliations, community feedback, contribution quality, and consensus alignment.',
      factors: [
        {
          name: 'Credentials',
          weight: 0.25,
          description: 'Verified education, certifications, and professional qualifications',
        },
        {
          name: 'Affiliations',
          weight: 0.2,
          description: 'Current and past institutional relationships and roles',
        },
        {
          name: 'Community Score',
          weight: 0.25,
          description: 'Community validation and peer review ratings',
        },
        {
          name: 'Contribution Quality',
          weight: 0.2,
          description: 'Quality and impact of expert contributions',
        },
        {
          name: 'Consensus Alignment',
          weight: 0.1,
          description: 'Alignment with expert consensus on key issues',
        },
      ],
    },
    lastCalculated: new Date().toISOString(),
  };
};

/**
 * Generate a single mock expert
 */
export const generateMockExpert = (id?: string): Expert => {
  const expertId = id || generateId('expert');
  const name = faker.person.fullName();
  const credentials = generateExpertCredentials(faker.number.int({ min: 2, max: 5 }));
  const affiliations = generateExpertAffiliations(faker.number.int({ min: 1, max: 3 }));
  const specializations = generatePolicyAreas(faker.number.int({ min: 1, max: 4 }));

  const verificationType = weightedRandom(
    ['official', 'domain', 'identity'] as const,
    [20, 60, 20]
  );

  return {
    id: expertId,
    name,
    avatar: faker.image.avatar(),
    verificationType,
    credentials,
    affiliations,
    specializations,
    credibilityScore: faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 }),
    contributionCount: faker.number.int({ min: 5, max: 150 }),
    avgCommunityRating: faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 }),
    verified: faker.datatype.boolean({ probability: 0.85 }),
    verificationDate: generateDateInRange(365, 0),
    bio: faker.lorem.paragraph(3),
    contactInfo: {
      email: faker.internet.email(),
      website: faker.datatype.boolean({ probability: 0.6 }) ? faker.internet.url() : undefined,
      linkedin: faker.datatype.boolean({ probability: 0.8 }) ? faker.internet.url() : undefined,
    },
  };
};

/**
 * Generate expert contributions
 */
export const generateExpertContributions = (
  expertId: string,
  billIds: number[],
  count: number = 5
): ExpertContribution[] => {
  const contributionTypes: Array<'analysis' | 'comment' | 'review' | 'amendment_suggestion'> = [
    'analysis',
    'comment',
    'review',
    'amendment_suggestion',
  ];

  return Array.from({ length: count }, () => {
    const billId = faker.helpers.arrayElement(billIds);
    const type = faker.helpers.arrayElement(contributionTypes);
    const voting = generateVotingMetrics();

    const communityValidation: CommunityValidationType = {
      upvotes: voting.upvotes,
      downvotes: voting.downvotes,
      comments: faker.number.int({ min: 0, max: 25 }),
      userVote: voting.userVote,
      validationScore: faker.number.float({ min: 0.3, max: 1.0, fractionDigits: 2 }),
    };

    return {
      id: generateId('contrib'),
      expertId,
      billId,
      type,
      content: generateCommentContent(true),
      confidence: faker.number.float({ min: 0.6, max: 1.0, fractionDigits: 2 }),
      methodology:
        type === 'analysis'
          ? 'Analysis based on constitutional precedent, policy impact assessment, and comparative legislation review.'
          : undefined,
      sources:
        type === 'analysis' || type === 'review'
          ? faker.helpers.arrayElements(
              [
                'Congressional Research Service Report',
                'Supreme Court Decision',
                'Federal Register Notice',
                'Academic Research Paper',
                'Government Accountability Office Report',
              ],
              faker.number.int({ min: 1, max: 3 })
            )
          : undefined,
      tags: generatePolicyAreas(faker.number.int({ min: 1, max: 3 })),
      createdAt: generateDateInRange(90, 0),
      lastUpdated: generateDateInRange(30, 0),
      communityValidation,
      status: weightedRandom(['published', 'under_review', 'draft', 'disputed'], [70, 15, 10, 5]),
    };
  });
};

/**
 * Generate expert consensus data
 */
export const generateExpertConsensus = (billId: number, topic: string): ExpertConsensus => {
  const totalExperts = faker.number.int({ min: 5, max: 25 });
  const agreementLevel = faker.number.float({ min: 0.3, max: 0.95, fractionDigits: 2 });

  const positions = [
    'Supports with modifications',
    'Strongly supports',
    'Opposes due to constitutional concerns',
    'Neutral - needs more analysis',
    'Supports core provisions',
  ];

  const majorityPosition = faker.helpers.arrayElement(positions);
  const remainingExperts = Math.floor(totalExperts * (1 - agreementLevel));

  const minorityPositions = faker.helpers
    .arrayElements(
      positions.filter(p => p !== majorityPosition),
      faker.number.int({ min: 1, max: 3 })
    )
    .map(position => ({
      position,
      expertCount: faker.number.int({ min: 1, max: Math.max(1, remainingExperts) }),
      experts: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () =>
        generateId('expert')
      ),
    }));

  const controversyLevel = agreementLevel > 0.8 ? 'low' : agreementLevel > 0.6 ? 'medium' : 'high';

  return {
    billId,
    topic,
    totalExperts,
    agreementLevel,
    majorityPosition,
    minorityPositions,
    controversyLevel,
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Generate a collection of mock experts
 */
export const generateMockExperts = (count: number = 20): Expert[] => {
  return Array.from({ length: count }, () => generateMockExpert());
};

/**
 * Generate mock official experts (government verified)
 */
export const generateMockOfficialExperts = (count: number = 5): Expert[] => {
  return Array.from({ length: count }, () => {
    const expert = generateMockExpert();
    return {
      ...expert,
      verificationType: 'official',
      verified: true,
      credibilityScore: faker.number.float({ min: 0.8, max: 1.0, fractionDigits: 2 }),
      contributionCount: faker.number.int({ min: 20, max: 200 }),
      avgCommunityRating: faker.number.float({ min: 4.0, max: 5.0, fractionDigits: 1 }),
    };
  });
};

/**
 * Default mock experts datasets
 */
export const mockExperts = generateMockExperts(30);
export const mockOfficialExperts = generateMockOfficialExperts(8);

/**
 * Generate credibility metrics for all experts
 */
export const mockExpertCredibilityMetrics = [...mockExperts, ...mockOfficialExperts].map(expert =>
  generateCredibilityMetrics(expert.id)
);

/**
 * Get expert by ID
 */
export const getMockExpertById = (id: string): Expert | null => {
  const allExperts = [...mockExperts, ...mockOfficialExperts];
  return allExperts.find(expert => expert.id === id) || null;
};

/**
 * Get experts by specialization
 */
export const getMockExpertsBySpecialization = (specialization: string): Expert[] => {
  const allExperts = [...mockExperts, ...mockOfficialExperts];
  return allExperts.filter(expert => expert.specializations.includes(specialization));
};

/**
 * Get experts by verification type
 */
export const getMockExpertsByVerificationType = (
  type: 'official' | 'domain' | 'identity'
): Expert[] => {
  const allExperts = [...mockExperts, ...mockOfficialExperts];
  return allExperts.filter(expert => expert.verificationType === type);
};

/**
 * Mock Bills Data
 *
 * Comprehensive mock data for bills including metadata, engagement metrics,
 * constitutional analysis, and sponsor information.
 */

import { faker } from '@faker-js/faker';

import {
  BillStatus,
  UrgencyLevel,
  ComplexityLevel,
  type Bill as ReadonlyBill,
} from '../../types/bill/bill-base';


export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ConstitutionalFlag {
  id: number;
  type: string;
  description: string;
  severity: Severity;
  article?: string;
  clause?: string;
}

interface BillsStats {
  totalBills: number;
  urgentCount: number;
  constitutionalFlags: number;
  trendingCount: number;
  lastUpdated: string;
}
import {
  generateId,
  generateDateInRange,
  generateEngagementMetrics,
  generatePolicyAreas,
  generateBillNumber,
  generateBillTitle,
  generateBillSummary,
  weightedRandom,
} from './generators';

// Seed faker for consistent data
faker.seed(12345);

/**
 * Generate constitutional flags for a bill
 */
const generateConstitutionalFlags = (severity: 'low' | 'medium' | 'high' = 'low') => {
  const flagTypes = [
    { category: 'Commerce Clause', description: 'May exceed federal commerce power' },
    { category: 'Due Process', description: 'Potential due process concerns' },
    { category: 'Equal Protection', description: 'May create unequal treatment' },
    { category: 'First Amendment', description: 'Potential free speech implications' },
    { category: 'Tenth Amendment', description: 'May infringe on state powers' },
    { category: 'Separation of Powers', description: 'Executive authority concerns' },
  ];

  const severityLevels: Array<Severity> =
    severity === 'high'
      ? ['critical', 'high']
      : severity === 'medium'
        ? ['high', 'medium']
        : ['medium', 'low'];

  const flagCount =
    severity === 'high'
      ? faker.number.int({ min: 2, max: 4 })
      : severity === 'medium'
        ? faker.number.int({ min: 1, max: 2 })
        : faker.number.int({ min: 0, max: 1 });

  return faker.helpers.arrayElements(flagTypes, flagCount).map(flag => ({
    id: faker.number.int({ min: 1, max: 1000 }),
    type: flag.category,
    description: flag.description,
    severity: faker.helpers.arrayElement(severityLevels),
    article: faker.helpers.maybe(() => `Article ${faker.number.int({ min: 1, max: 7 })}`, {
      probability: 0.7,
    }),
    clause: faker.helpers.maybe(() => `Section ${faker.number.int({ min: 1, max: 10 })}`, {
      probability: 0.5,
    }),
  }));
};

/**
 * Generate sponsors for a bill
 */
const generateSponsors = (count: number = 3) => {
  const parties = ['Republican', 'Democratic', 'Independent'];
  const positions = ['Senator', 'Representative', 'Delegate'];

  const sponsors = [];

  // Always have one primary sponsor
  sponsors.push({
    id: faker.number.int({ min: 1, max: 1000 }),
    name: faker.person.fullName(),
    party: faker.helpers.arrayElement(parties),
    district: faker.location.state() + '-' + faker.number.int({ min: 1, max: 50 }),
    position: faker.helpers.arrayElement(positions),
    isPrimary: true,
  });

  // Add cosponsors
  for (let i = 1; i < count; i++) {
    sponsors.push({
      id: faker.number.int({ min: 1, max: 1000 }),
      name: faker.person.fullName(),
      party: faker.helpers.arrayElement(parties),
      district: faker.location.state() + '-' + faker.number.int({ min: 1, max: 50 }),
      position: faker.helpers.arrayElement(positions),
      role: 'co-sponsor',
      isPrimary: false,
    });
  }

  return sponsors.map(s => ({
    ...s,
    // Map position to state/district format if needed, or leave as extra prop if allowed (it will be ignored by strict type, but we might object-literal it)
    // Sponsor type has: id, name, party, role, district, avatarUrl, state, isPrimary.
    role: s.isPrimary ? ('primary' as const) : ('co-sponsor' as const),
    
  })) as any; // Cast to avoid position mismatch issues for now, or refine Sponsor type
};

/**
 * Generate a single mock bill
 */
export const generateMockBill = (
  id: string,
  options: {
    urgency?: UrgencyLevel;
    status?: BillStatus;
    popularity?: number;
    constitutionalConcerns?: 'low' | 'medium' | 'high';
  } = {}
): ReadonlyBill => {
  const {
    urgency = weightedRandom(
      [UrgencyLevel.LOW, UrgencyLevel.MEDIUM, UrgencyLevel.HIGH, UrgencyLevel.CRITICAL],
      [40, 35, 20, 5]
    ),
    status = weightedRandom(
      [
        BillStatus.INTRODUCED,
        BillStatus.COMMITTEE,
        BillStatus.FLOOR_DEBATE,
        BillStatus.PASSED_HOUSE,
        BillStatus.PASSED_SENATE,
        BillStatus.PASSED,
        BillStatus.FAILED,
        BillStatus.SIGNED,
        BillStatus.VETOED,
      ],
      [25, 30, 10, 8, 7, 10, 5, 3, 2]
    ),
    popularity = faker.number.float({ min: 0.1, max: 2.0 }),
    constitutionalConcerns = weightedRandom(['low', 'medium', 'high'], [70, 25, 5]),
  } = options;

  const introducedDate = generateDateInRange(180, 1);
  const lastUpdated = generateDateInRange(30, 0);
  const policyAreas = generatePolicyAreas(faker.number.int({ min: 1, max: 3 }));
  const sponsors = generateSponsors(faker.number.int({ min: 1, max: 8 }));
  const constitutionalFlags = generateConstitutionalFlags(constitutionalConcerns);
  const engagement = generateEngagementMetrics(popularity);

  // Map constitutionalFlags to constitutionalIssues (string[])
  const constitutionalIssues = constitutionalFlags.map(f => `${f.type}: ${f.description}`);

  return {
    id,
    billNumber: generateBillNumber(),
    title: generateBillTitle(),
    summary: generateBillSummary(),
    status,
    urgency, // Renamed from urgencyLevel
    complexity: weightedRandom(
      [ComplexityLevel.LOW, ComplexityLevel.MEDIUM, ComplexityLevel.HIGH, ComplexityLevel.EXPERT],
      [30, 40, 25, 5]
    ),
    introducedDate,
    lastActionDate: lastUpdated, // Renamed from lastUpdated
    sponsors: sponsors as any, // Cast sponsors to avoid strict check on 'position'
    constitutionalIssues, // Mapped from flags
    ...engagement,
    policyAreas,
    tags: policyAreas, // Use policy areas as tags for now
    readingTime: faker.number.int({ min: 5, max: 45 }),
    // Removed shareCount, viewCount, commentCount if they are not in Bill or use Object.assign
    // Bill has viewCount, commentCount.
    viewCount: engagement.viewCount,
    commentCount: engagement.commentCount,
  };
};

/**
 * Generate a collection of mock bills
 */
export const generateMockBills = (count: number = 50): ReadonlyBill[] => {
  const bills: ReadonlyBill[] = [];

  for (let i = 1; i <= count; i++) {
    // Create some variety in bill characteristics
    const options: Parameters<typeof generateMockBill>[1] = {};

    // Make some bills more urgent/popular for testing
    if (i <= 5) {
      options.urgency = UrgencyLevel.CRITICAL;
      options.popularity = faker.number.float({ min: 1.5, max: 2.0 });
    } else if (i <= 15) {
      options.urgency = UrgencyLevel.HIGH;
      options.popularity = faker.number.float({ min: 1.0, max: 1.8 });
    }

    // Add some constitutional concerns
    if (i <= 8) {
      options.constitutionalConcerns = 'high';
    } else if (i <= 20) {
      options.constitutionalConcerns = 'medium';
    }

    // Vary status distribution
    if (i <= 3) {
      options.status = BillStatus.SIGNED;
    } else if (i <= 8) {
      options.status = BillStatus.PASSED;
    } else if (i <= 12) {
      options.status = BillStatus.FAILED;
    }

    bills.push(generateMockBill(i.toString(), options));
  }

  return bills;
};

/**
 * Generate mock bills statistics
 */
export const generateMockBillsStats = (bills: ReadonlyBill[]): BillsStats => {
  const urgentCount = bills.filter(
    b => b.urgency === 'high' || b.urgency === 'critical'
  ).length;

  const constitutionalFlags = bills.reduce((sum, b) => sum + (b.constitutionalIssues?.length || 0), 0);

  // Calculate trending based on recent activity and engagement
  const trendingCount = bills.filter(b => {
    const recentActivity = new Date(b.lastActionDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    // Bill has viewCount and commentCount
    const highEngagement = (b.viewCount || 0) + (b.commentCount || 0) > 200;
    return recentActivity && highEngagement;
  }).length;

  return {
    totalBills: bills.length,
    urgentCount,
    constitutionalFlags,
    trendingCount,
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * Get mock bills with specific filters for testing
 */
export const getMockBillsByCategory = (category: string, count: number = 10): ReadonlyBill[] => {
  return generateMockBills(count).map(bill => ({
    ...bill,
    policyAreas: [category, ...bill.policyAreas.slice(1)],
  }));
};

/**
 * Get mock bills with high constitutional concerns
 */
export const getMockBillsWithConstitutionalConcerns = (count: number = 5): ReadonlyBill[] => {
  return Array.from({ length: count }, (_, i) =>
    generateMockBill((i + 1000).toString(), { constitutionalConcerns: 'high' })
  );
};

/**
 * Get mock bills with high urgency
 */
export const getMockUrgentBills = (count: number = 5): ReadonlyBill[] => {
  return Array.from({ length: count }, (_, i) =>
    generateMockBill((i + 2000).toString(), { urgency: UrgencyLevel.CRITICAL, popularity: 2.0 })
  );
};

/**
 * Default mock bills dataset
 */
export const mockBills = generateMockBills(75);
export const mockBillsStats = generateMockBillsStats(mockBills);

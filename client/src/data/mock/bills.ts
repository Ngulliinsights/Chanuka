/**
 * Mock Bills Data
 * 
 * Comprehensive mock data for bills including metadata, engagement metrics,
 * constitutional analysis, and sponsor information.
 */

import { faker } from '@faker-js/faker';
import { Bill as ReadonlyBill } from '../../core/api/types';
import { BillsStats } from '../../store/slices/billsSlice';
import {
  generateId,
  generateDateInRange,
  generateEngagementMetrics,
  generatePolicyAreas,
  generateBillNumber,
  generateBillTitle,
  generateBillSummary,
  weightedRandom
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
    { category: 'Separation of Powers', description: 'Executive authority concerns' }
  ];

  const severityLevels: Array<'critical' | 'high' | 'moderate' | 'low'> = 
    severity === 'high' ? ['critical', 'high'] :
    severity === 'medium' ? ['high', 'moderate'] :
    ['moderate', 'low'];

  const flagCount = severity === 'high' ? faker.number.int({ min: 2, max: 4 }) :
                   severity === 'medium' ? faker.number.int({ min: 1, max: 2 }) :
                   faker.number.int({ min: 0, max: 1 });

  return faker.helpers.arrayElements(flagTypes, flagCount).map(flag => ({
    id: generateId('flag'),
    type: flag.category,
    description: flag.description,
    severity: faker.helpers.arrayElement(severityLevels),
    article: faker.helpers.maybe(() => `Article ${faker.number.int({ min: 1, max: 7 })}`, { probability: 0.7 }),
    clause: faker.helpers.maybe(() => `Section ${faker.number.int({ min: 1, max: 10 })}`, { probability: 0.5 })
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
    isPrimary: true
  });
  
  // Add cosponsors
  for (let i = 1; i < count; i++) {
    sponsors.push({
      id: faker.number.int({ min: 1, max: 1000 }),
      name: faker.person.fullName(),
      party: faker.helpers.arrayElement(parties),
      district: faker.location.state() + '-' + faker.number.int({ min: 1, max: 50 }),
      position: faker.helpers.arrayElement(positions),
      isPrimary: false
    });
  }
  
  return sponsors;
};

/**
 * Generate a single mock bill
 */
export const generateMockBill = (id: number, options: {
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'introduced' | 'committee' | 'passed' | 'failed' | 'signed' | 'vetoed';
  popularity?: number;
  constitutionalConcerns?: 'low' | 'medium' | 'high';
} = {}): ReadonlyBill => {
  const {
    urgency = weightedRandom(['low', 'medium', 'high', 'critical'], [40, 35, 20, 5]),
    status = weightedRandom(['introduced', 'committee', 'floor_debate', 'passed_house', 'passed_senate', 'passed', 'failed', 'signed', 'vetoed'], [25, 30, 10, 8, 7, 10, 5, 3, 2]),
    popularity = faker.number.float({ min: 0.1, max: 2.0 }),
    constitutionalConcerns = weightedRandom(['low', 'medium', 'high'], [70, 25, 5])
  } = options;

  const introducedDate = generateDateInRange(180, 1);
  const lastUpdated = generateDateInRange(30, 0);
  const policyAreas = generatePolicyAreas(faker.number.int({ min: 1, max: 3 }));
  const sponsors = generateSponsors(faker.number.int({ min: 1, max: 8 }));
  const constitutionalFlags = generateConstitutionalFlags(constitutionalConcerns);
  const engagement = generateEngagementMetrics(popularity);

  return {
    id,
    billNumber: generateBillNumber(),
    title: generateBillTitle(),
    summary: generateBillSummary(),
    status,
    urgencyLevel: urgency,
    introducedDate,
    lastUpdated,
    sponsors,
    constitutionalFlags,
    ...engagement,
    policyAreas,
    complexity: weightedRandom(['low', 'medium', 'high', 'expert'], [30, 40, 25, 5]),
    readingTime: faker.number.int({ min: 5, max: 45 })
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
      options.urgency = 'critical';
      options.popularity = faker.number.float({ min: 1.5, max: 2.0 });
    } else if (i <= 15) {
      options.urgency = 'high';
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
      options.status = 'signed';
    } else if (i <= 8) {
      options.status = 'passed';
    } else if (i <= 12) {
      options.status = 'failed';
    }
    
    bills.push(generateMockBill(i, options));
  }
  
  return bills;
};

/**
 * Generate mock bills statistics
 */
export const generateMockBillsStats = (bills: ReadonlyBill[]): BillsStats => {
  const urgentCount = bills.filter(b => 
    b.urgencyLevel === 'high' || b.urgencyLevel === 'critical'
  ).length;
  
  const constitutionalFlags = bills.reduce((sum, b) => 
    sum + b.constitutionalFlags.length, 0
  );
  
  // Calculate trending based on recent activity and engagement
  const trendingCount = bills.filter(b => {
    const recentActivity = new Date(b.lastUpdated) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const highEngagement = (b.viewCount + b.commentCount + b.shareCount) > 200;
    return recentActivity && highEngagement;
  }).length;
  
  return {
    totalBills: bills.length,
    urgentCount,
    constitutionalFlags,
    trendingCount,
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Get mock bills with specific filters for testing
 */
export const getMockBillsByCategory = (category: string, count: number = 10): ReadonlyBill[] => {
  return generateMockBills(count).map(bill => ({
    ...bill,
    policyAreas: [category, ...bill.policyAreas.slice(1)]
  }));
};

/**
 * Get mock bills with high constitutional concerns
 */
export const getMockBillsWithConstitutionalConcerns = (count: number = 5): ReadonlyBill[] => {
  return Array.from({ length: count }, (_, i) => 
    generateMockBill(i + 1000, { constitutionalConcerns: 'high' })
  );
};

/**
 * Get mock bills with high urgency
 */
export const getMockUrgentBills = (count: number = 5): ReadonlyBill[] => {
  return Array.from({ length: count }, (_, i) => 
    generateMockBill(i + 2000, { urgency: 'critical', popularity: 2.0 })
  );
};

/**
 * Default mock bills dataset
 */
export const mockBills = generateMockBills(75);
export const mockBillsStats = generateMockBillsStats(mockBills);
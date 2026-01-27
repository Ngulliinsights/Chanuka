/**
 * Demo Data Service for Investor Presentations
 *
 * Provides realistic, coherent demo data that tells a compelling story
 * about the platform's capabilities and value proposition.
 */

export interface DemoBill {
  id: number;
  billNumber: string;
  title: string;
  summary: string;
  status: 'introduced' | 'committee' | 'passed' | 'failed' | 'signed';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  introducedDate: string;
  lastUpdated: string;
  policyAreas: string[];
  viewCount: number;
  commentCount: number;
  saveCount: number;
  shareCount: number;
  constitutionalFlags: number;
  controversyLevel: 'low' | 'medium' | 'high';
  sponsors: Array<{
    id: number;
    name: string;
    party: string;
    district: string;
    isPrimary: boolean;
  }>;
}

export interface DemoEngagementMetrics {
  totalUsers: number;
  activeToday: number;
  commentsToday: number;
  billsViewed: number;
  expertReviews: number;
  issuesFlagged: number;
}

/**
 * Curated demo bills that showcase platform capabilities
 */
export const DEMO_BILLS: DemoBill[] = [
  {
    id: 1,
    billNumber: 'HB-2024-001',
    title: 'Digital Privacy Protection and Data Rights Act',
    summary:
      'Comprehensive legislation establishing individual data ownership rights, regulating tech company data collection, and creating enforcement mechanisms for privacy violations. Includes provisions for data portability, consent management, and algorithmic transparency.',
    status: 'committee',
    urgencyLevel: 'high',
    introducedDate: '2024-01-15T00:00:00Z',
    lastUpdated: '2024-01-20T14:30:00Z',
    policyAreas: ['Technology', 'Privacy Rights', 'Consumer Protection'],
    viewCount: 15420,
    commentCount: 156,
    saveCount: 892,
    shareCount: 234,
    constitutionalFlags: 1,
    controversyLevel: 'medium',
    sponsors: [
      {
        id: 1,
        name: 'Hon. Sarah Johnson',
        party: 'Democratic',
        district: 'District 12',
        isPrimary: true,
      },
      {
        id: 2,
        name: 'Hon. Michael Chen',
        party: 'Republican',
        district: 'District 8',
        isPrimary: false,
      },
    ],
  },
  {
    id: 2,
    billNumber: 'SB-2024-042',
    title: 'Climate Action and Renewable Energy Transition Act',
    summary:
      'Establishes national framework for 50% emissions reduction by 2030 through renewable energy incentives, carbon pricing mechanisms, and just transition support for fossil fuel communities. Creates green jobs program and climate resilience infrastructure fund.',
    status: 'passed',
    urgencyLevel: 'critical',
    introducedDate: '2024-01-08T00:00:00Z',
    lastUpdated: '2024-01-18T16:45:00Z',
    policyAreas: ['Environment', 'Energy', 'Economy'],
    viewCount: 28750,
    commentCount: 342,
    saveCount: 1456,
    shareCount: 567,
    constitutionalFlags: 0,
    controversyLevel: 'high',
    sponsors: [
      {
        id: 3,
        name: 'Hon. Maria Rodriguez',
        party: 'Democratic',
        district: 'District 5',
        isPrimary: true,
      },
      {
        id: 4,
        name: 'Hon. James Wilson',
        party: 'Independent',
        district: 'District 15',
        isPrimary: false,
      },
    ],
  },
  {
    id: 3,
    billNumber: 'HB-2024-078',
    title: 'Healthcare Access and Affordability Enhancement Act',
    summary:
      'Expands healthcare coverage through public option, enables Medicare prescription drug negotiation, and strengthens community health centers. Includes telehealth expansion and mental health parity enforcement provisions.',
    status: 'introduced',
    urgencyLevel: 'high',
    introducedDate: '2024-01-22T00:00:00Z',
    lastUpdated: '2024-01-22T09:15:00Z',
    policyAreas: ['Healthcare', 'Social Services', 'Economy'],
    viewCount: 12340,
    commentCount: 89,
    saveCount: 567,
    shareCount: 123,
    constitutionalFlags: 0,
    controversyLevel: 'medium',
    sponsors: [
      {
        id: 5,
        name: 'Hon. David Kim',
        party: 'Democratic',
        district: 'District 3',
        isPrimary: true,
      },
    ],
  },
  {
    id: 4,
    billNumber: 'HB-2024-095',
    title: 'Education Technology and Digital Equity Act',
    summary:
      'Provides funding for school technology infrastructure, digital literacy programs, and broadband access in underserved communities. Establishes privacy protections for student data and educational technology standards.',
    status: 'committee',
    urgencyLevel: 'medium',
    introducedDate: '2024-01-25T00:00:00Z',
    lastUpdated: '2024-01-26T11:20:00Z',
    policyAreas: ['Education', 'Technology', 'Infrastructure'],
    viewCount: 8920,
    commentCount: 67,
    saveCount: 445,
    shareCount: 89,
    constitutionalFlags: 0,
    controversyLevel: 'low',
    sponsors: [
      {
        id: 6,
        name: 'Hon. Lisa Thompson',
        party: 'Republican',
        district: 'District 7',
        isPrimary: true,
      },
      {
        id: 7,
        name: 'Hon. Robert Garcia',
        party: 'Democratic',
        district: 'District 11',
        isPrimary: false,
      },
    ],
  },
];

/**
 * Generate realistic engagement metrics based on time of day and platform growth
 */
export function getDemoEngagementMetrics(): DemoEngagementMetrics {
  const baseMetrics = {
    totalUsers: 3892,
    expertReviews: 156,
    issuesFlagged: 47,
  };

  // Simulate realistic daily activity patterns
  const hour = new Date().getHours();
  const isBusinessHours = hour >= 9 && hour <= 17;
  const isPeakHours = hour >= 12 && hour <= 14; // Lunch time peak

  let activeMultiplier = 0.15; // Base 15% of users active
  if (isBusinessHours) activeMultiplier = 0.25;
  if (isPeakHours) activeMultiplier = 0.35;

  return {
    ...baseMetrics,
    activeToday: Math.floor(baseMetrics.totalUsers * activeMultiplier),
    commentsToday: Math.floor(Math.random() * 30 + 15),
    billsViewed: Math.floor(Math.random() * 200 + 150),
  };
}

/**
 * Get demo bill by ID with fallback
 */
export function getDemoBillById(id: number): DemoBill | null {
  return DEMO_BILLS.find(bill => bill.id === id) || null;
}

/**
 * Filter demo bills based on criteria
 */
export function filterDemoBills(filters: {
  query?: string;
  status?: string[];
  urgency?: string[];
  policyAreas?: string[];
  controversyLevels?: string[];
}): DemoBill[] {
  let filtered = [...DEMO_BILLS];

  if (filters.query && filters.query.length >= 2) {
    const query = filters.query.toLowerCase();
    filtered = filtered.filter(
      bill =>
        bill.title.toLowerCase().includes(query) ||
        bill.summary.toLowerCase().includes(query) ||
        bill.billNumber.toLowerCase().includes(query)
    );
  }

  if (filters.status && filters.status.length > 0) {
    filtered = filtered.filter(bill => filters.status!.includes(bill.status));
  }

  if (filters.urgency && filters.urgency.length > 0) {
    filtered = filtered.filter(bill => filters.urgency!.includes(bill.urgencyLevel));
  }

  if (filters.policyAreas && filters.policyAreas.length > 0) {
    filtered = filtered.filter(bill =>
      bill.policyAreas.some(area => filters.policyAreas!.includes(area.toLowerCase()))
    );
  }

  if (filters.controversyLevels && filters.controversyLevels.length > 0) {
    filtered = filtered.filter(bill => filters.controversyLevels!.includes(bill.controversyLevel));
  }

  return filtered;
}

/**
 * Generate demo comments for a bill
 */
export function getDemoBillComments(_billId: number) {
  const comments = [
    {
      id: 1,
      author: 'Dr. Jennifer Martinez',
      role: 'Constitutional Law Expert',
      content:
        'This bill addresses critical privacy concerns while maintaining innovation incentives. The enforcement mechanisms are well-structured.',
      timestamp: '2024-01-20T10:30:00Z',
      votes: { up: 23, down: 2 },
      verified: true,
    },
    {
      id: 2,
      author: 'Community Advocate',
      role: 'Citizen',
      content:
        'Finally, legislation that puts individual privacy rights first. The data portability provisions are especially important.',
      timestamp: '2024-01-20T14:15:00Z',
      votes: { up: 15, down: 1 },
      verified: false,
    },
    {
      id: 3,
      author: 'Tech Industry Representative',
      role: 'Industry Expert',
      content:
        'While we support privacy protection, some provisions may hinder innovation. Suggest amendments to Section 4.2.',
      timestamp: '2024-01-21T09:45:00Z',
      votes: { up: 8, down: 12 },
      verified: true,
    },
  ];

  return comments.filter(() => Math.random() > 0.3); // Randomly show subset
}

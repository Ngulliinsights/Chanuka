/**
 * Realistic Demo Data Service
 * 
 * Provides curated, realistic demo data for investor presentations
 * and development. Replaces mock data with authentic-looking content
 * based on real Kenyan legislative patterns.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DemoBill {
  id: number;
  billNumber: string;
  title: string;
  summary: string;
  status: 'introduced' | 'first_reading' | 'committee_review' | 'second_reading' | 'third_reading' | 'presidential_assent' | 'enacted' | 'rejected';
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  introducedDate: string;
  lastUpdated: string;
  policyAreas: string[];
  constitutionalFlags: boolean;
  controversyLevel: 'low' | 'medium' | 'high';
  sponsor: {
    name: string;
    party: string;
    constituency: string;
    avatar?: string;
  };
  cosponsors: Array<{
    name: string;
    party: string;
    constituency: string;
  }>;
  engagement: {
    views: number;
    comments: number;
    votes: {
      support: number;
      oppose: number;
      neutral: number;
    };
    shares: number;
    tracking: number;
  };
  keyProvisions: string[];
  potentialImpact: {
    economic: string;
    social: string;
    legal: string;
  };
  timeline: Array<{
    date: string;
    event: string;
    description: string;
  }>;
  documents: Array<{
    name: string;
    type: 'bill_text' | 'memorandum' | 'committee_report' | 'amendment';
    url: string;
    size: string;
  }>;
}

export interface DemoUser {
  id: string;
  displayName: string;
  anonymityLevel: 'public' | 'pseudonymous' | 'anonymous' | 'private';
  county: string;
  joinDate: string;
  lastActive: string;
  engagementScore: number;
  contributions: {
    comments: number;
    votes: number;
    billsTracked: number;
    campaignsJoined: number;
  };
  badges: string[];
  avatar?: string;
}

export interface DemoComment {
  id: string;
  billId: number;
  userId: string;
  content: string;
  timestamp: string;
  votes: {
    helpful: number;
    unhelpful: number;
  };
  replies: DemoComment[];
  flagged: boolean;
  verified: boolean;
}

// ============================================================================
// REALISTIC DEMO BILLS
// ============================================================================

export const demoBills: DemoBill[] = [
  {
    id: 1,
    billNumber: "Bill No. 2024/001",
    title: "The Public Finance Management (Amendment) Bill, 2024",
    summary: "A Bill to amend the Public Finance Management Act to enhance transparency in government spending, strengthen oversight mechanisms for public resources, and establish mandatory quarterly budget execution reports accessible to the public.",
    status: "committee_review",
    urgencyLevel: "high",
    introducedDate: "2024-10-15",
    lastUpdated: "2024-11-28",
    policyAreas: ["public_finance", "governance", "transparency", "accountability"],
    constitutionalFlags: true,
    controversyLevel: "medium",
    sponsor: {
      name: "Hon. Jane Wanjiku Muthoni",
      party: "Democratic Alliance Party",
      constituency: "Nairobi Central",
      avatar: "/avatars/sponsor-1.jpg"
    },
    cosponsors: [
      {
        name: "Hon. Peter Kimani Waiguru",
        party: "United Democratic Alliance",
        constituency: "Kiambu East"
      },
      {
        name: "Hon. Grace Akinyi Odhiambo",
        party: "Orange Democratic Movement",
        constituency: "Kisumu West"
      }
    ],
    engagement: {
      views: 15420,
      comments: 89,
      votes: {
        support: 234,
        oppose: 45,
        neutral: 23
      },
      shares: 67,
      tracking: 1205
    },
    keyProvisions: [
      "Mandatory quarterly budget execution reports published online within 30 days",
      "Enhanced penalties for financial misconduct by public officials (up to 10 years imprisonment)",
      "Establishment of County Budget Oversight Committees with citizen representation",
      "Real-time procurement tracking system for contracts above KSh 1 million",
      "Whistleblower protection for reporting financial irregularities"
    ],
    potentialImpact: {
      economic: "Could reduce government waste by an estimated 15-20% through improved oversight and transparency mechanisms.",
      social: "Increases public trust in government institutions and empowers citizens to participate in budget oversight.",
      legal: "Strengthens legal framework for prosecuting corruption and financial misconduct in public sector."
    },
    timeline: [
      {
        date: "2024-10-15",
        event: "Bill Introduced",
        description: "First reading in National Assembly"
      },
      {
        date: "2024-10-22",
        event: "Committee Assignment",
        description: "Referred to Budget and Appropriations Committee"
      },
      {
        date: "2024-11-05",
        event: "Public Participation",
        description: "Committee begins public hearings in Nairobi, Mombasa, and Kisumu"
      },
      {
        date: "2024-11-28",
        event: "Committee Review",
        description: "Committee reviewing public submissions and expert testimony"
      }
    ],
    documents: [
      {
        name: "Public Finance Management (Amendment) Bill 2024",
        type: "bill_text",
        url: "/documents/pfm-amendment-2024.pdf",
        size: "2.3 MB"
      },
      {
        name: "Explanatory Memorandum",
        type: "memorandum",
        url: "/documents/pfm-memorandum-2024.pdf",
        size: "856 KB"
      }
    ]
  },
  
  {
    id: 2,
    billNumber: "Bill No. 2024/012",
    title: "The Climate Change (Amendment) Bill, 2024",
    summary: "A Bill to strengthen Kenya's climate change response by establishing mandatory carbon emission targets for industries, creating a National Climate Adaptation Fund, and enhancing penalties for environmental violations.",
    status: "second_reading",
    urgencyLevel: "critical",
    introducedDate: "2024-09-08",
    lastUpdated: "2024-12-01",
    policyAreas: ["environment", "climate_change", "industry", "agriculture"],
    constitutionalFlags: false,
    controversyLevel: "high",
    sponsor: {
      name: "Hon. David Kiprotich Sang",
      party: "Kenya Kwanza Alliance",
      constituency: "Nandi Hills"
    },
    cosponsors: [
      {
        name: "Hon. Fatuma Hassan Ali",
        party: "Jubilee Party",
        constituency: "Wajir East"
      }
    ],
    engagement: {
      views: 28750,
      comments: 156,
      votes: {
        support: 445,
        oppose: 178,
        neutral: 67
      },
      shares: 134,
      tracking: 2340
    },
    keyProvisions: [
      "Mandatory 40% reduction in carbon emissions by 2030 for manufacturing industries",
      "Establishment of KSh 50 billion National Climate Adaptation Fund",
      "Carbon tax of KSh 1,200 per ton of CO2 equivalent for large emitters",
      "Green jobs training program targeting 100,000 youth annually",
      "Climate-resilient infrastructure standards for all public projects"
    ],
    potentialImpact: {
      economic: "Estimated to create 200,000 green jobs while imposing compliance costs of KSh 80 billion on industries over 5 years.",
      social: "Improves air quality in urban areas and builds climate resilience for vulnerable communities, particularly in arid regions.",
      legal: "Aligns Kenya's legal framework with Paris Agreement commitments and establishes clear enforcement mechanisms."
    },
    timeline: [
      {
        date: "2024-09-08",
        event: "Bill Introduced",
        description: "First reading in National Assembly"
      },
      {
        date: "2024-09-15",
        event: "Committee Assignment",
        description: "Referred to Environment and Natural Resources Committee"
      },
      {
        date: "2024-10-10",
        event: "Stakeholder Consultations",
        description: "Meetings with industry associations, environmental groups, and county governments"
      },
      {
        date: "2024-11-20",
        event: "Committee Report",
        description: "Committee submits report with amendments to National Assembly"
      },
      {
        date: "2024-12-01",
        event: "Second Reading Debate",
        description: "Currently under debate in National Assembly"
      }
    ],
    documents: [
      {
        name: "Climate Change (Amendment) Bill 2024",
        type: "bill_text",
        url: "/documents/climate-amendment-2024.pdf",
        size: "3.1 MB"
      },
      {
        name: "Environmental Impact Assessment",
        type: "committee_report",
        url: "/documents/climate-eia-2024.pdf",
        size: "4.7 MB"
      }
    ]
  },
  
  {
    id: 3,
    billNumber: "Bill No. 2024/008",
    title: "The Digital Economy and Data Protection Bill, 2024",
    summary: "A comprehensive bill to regulate Kenya's digital economy, establish data protection standards for tech companies, create a framework for digital taxation, and protect citizens' privacy rights in the digital age.",
    status: "first_reading",
    urgencyLevel: "high",
    introducedDate: "2024-11-10",
    lastUpdated: "2024-11-25",
    policyAreas: ["technology", "data_protection", "taxation", "digital_rights"],
    constitutionalFlags: true,
    controversyLevel: "medium",
    sponsor: {
      name: "Hon. Catherine Wambui Omanwa",
      party: "Azimio la Umoja",
      constituency: "Nyeri Town"
    },
    cosponsors: [
      {
        name: "Hon. Ahmed Hassan Mohamed",
        party: "United Democratic Alliance",
        constituency: "Garissa Township"
      },
      {
        name: "Hon. Mary Njoki Wanjiru",
        party: "Democratic Party",
        constituency: "Starehe"
      }
    ],
    engagement: {
      views: 12890,
      comments: 67,
      votes: {
        support: 189,
        oppose: 34,
        neutral: 45
      },
      shares: 89,
      tracking: 856
    },
    keyProvisions: [
      "Mandatory data localization for financial and health data of Kenyan citizens",
      "Digital services tax of 6% on revenue from digital services provided to Kenyan users",
      "Right to data portability and deletion for all Kenyan internet users",
      "Establishment of Digital Economy Authority with regulatory powers",
      "Cybersecurity standards for critical digital infrastructure"
    ],
    potentialImpact: {
      economic: "Expected to generate KSh 15 billion annually in digital taxes while potentially increasing compliance costs for tech companies.",
      social: "Strengthens privacy protection for 25 million internet users and promotes local digital innovation.",
      legal: "Creates comprehensive legal framework for digital economy regulation and aligns with global data protection standards."
    },
    timeline: [
      {
        date: "2024-11-10",
        event: "Bill Introduced",
        description: "First reading in National Assembly"
      },
      {
        date: "2024-11-25",
        event: "Stakeholder Mapping",
        description: "Identification of key stakeholders for consultation process"
      }
    ],
    documents: [
      {
        name: "Digital Economy and Data Protection Bill 2024",
        type: "bill_text",
        url: "/documents/digital-economy-2024.pdf",
        size: "2.8 MB"
      }
    ]
  }
];

// ============================================================================
// REALISTIC DEMO USERS
// ============================================================================

export const demoUsers: DemoUser[] = [
  {
    id: "user_001",
    displayName: "ConcernedCitizen247",
    anonymityLevel: "pseudonymous",
    county: "Nairobi",
    joinDate: "2024-08-15",
    lastActive: "2024-12-02",
    engagementScore: 85,
    contributions: {
      comments: 23,
      votes: 156,
      billsTracked: 12,
      campaignsJoined: 3
    },
    badges: ["Active Participant", "Bill Tracker", "Community Helper"]
  },
  
  {
    id: "user_002",
    displayName: "Dr. Amina Hassan",
    anonymityLevel: "public",
    county: "Mombasa",
    joinDate: "2024-07-22",
    lastActive: "2024-12-03",
    engagementScore: 92,
    contributions: {
      comments: 45,
      votes: 234,
      billsTracked: 28,
      campaignsJoined: 7
    },
    badges: ["Expert Contributor", "Verified Professional", "Top Commenter", "Climate Advocate"]
  },
  
  {
    id: "user_003",
    displayName: "YouthVoice_KE",
    anonymityLevel: "pseudonymous",
    county: "Kisumu",
    joinDate: "2024-09-03",
    lastActive: "2024-12-03",
    engagementScore: 78,
    contributions: {
      comments: 34,
      votes: 189,
      billsTracked: 15,
      campaignsJoined: 5
    },
    badges: ["Youth Leader", "Digital Rights Advocate", "Rising Star"]
  }
];

// ============================================================================
// REALISTIC DEMO COMMENTS
// ============================================================================

export const demoComments: DemoComment[] = [
  {
    id: "comment_001",
    billId: 1,
    userId: "user_002",
    content: "This bill addresses a critical gap in our public finance oversight. The quarterly reporting requirement will significantly improve transparency. However, I'm concerned about the implementation timeline - 30 days might be too ambitious for counties with limited technical capacity.",
    timestamp: "2024-11-28T14:30:00Z",
    votes: {
      helpful: 12,
      unhelpful: 2
    },
    replies: [
      {
        id: "comment_001_reply_001",
        billId: 1,
        userId: "user_001",
        content: "Good point about the timeline. Maybe a phased implementation starting with national level, then counties with higher capacity, followed by support for smaller counties?",
        timestamp: "2024-11-28T15:45:00Z",
        votes: {
          helpful: 8,
          unhelpful: 0
        },
        replies: [],
        flagged: false,
        verified: false
      }
    ],
    flagged: false,
    verified: true
  },
  
  {
    id: "comment_002",
    billId: 2,
    userId: "user_003",
    content: "As a young Kenyan, I strongly support this climate bill. The green jobs program could be transformative for youth unemployment. But we need to ensure the training programs are accessible in rural areas, not just urban centers.",
    timestamp: "2024-12-01T09:15:00Z",
    votes: {
      helpful: 15,
      unhelpful: 1
    },
    replies: [],
    flagged: false,
    verified: false
  }
];

// ============================================================================
// DEMO DATA SERVICE
// ============================================================================

export class RealisticDemoDataService {
  private static instance: RealisticDemoDataService;
  
  public static getInstance(): RealisticDemoDataService {
    if (!RealisticDemoDataService.instance) {
      RealisticDemoDataService.instance = new RealisticDemoDataService();
    }
    return RealisticDemoDataService.instance;
  }
  
  // Bills
  async getBills(filters?: {
    status?: string;
    urgency?: string;
    policyArea?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ bills: DemoBill[]; total: number; hasMore: boolean }> {
    let filteredBills = [...demoBills];
    
    // Apply filters
    if (filters?.status) {
      filteredBills = filteredBills.filter(bill => bill.status === filters.status);
    }
    
    if (filters?.urgency) {
      filteredBills = filteredBills.filter(bill => bill.urgencyLevel === filters.urgency);
    }
    
    if (filters?.policyArea) {
      filteredBills = filteredBills.filter(bill => 
        bill.policyAreas.includes(filters.policyArea!)
      );
    }
    
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredBills = filteredBills.filter(bill =>
        bill.title.toLowerCase().includes(searchTerm) ||
        bill.summary.toLowerCase().includes(searchTerm) ||
        bill.billNumber.toLowerCase().includes(searchTerm)
      );
    }
    
    // Pagination
    const limit = filters?.limit || 10;
    const offset = filters?.offset || 0;
    const paginatedBills = filteredBills.slice(offset, offset + limit);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      bills: paginatedBills,
      total: filteredBills.length,
      hasMore: offset + limit < filteredBills.length
    };
  }
  
  async getBill(id: number): Promise<DemoBill | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return demoBills.find(bill => bill.id === id) || null;
  }
  
  // Users
  async getUsers(): Promise<DemoUser[]> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return demoUsers;
  }
  
  async getUser(id: string): Promise<DemoUser | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return demoUsers.find(user => user.id === id) || null;
  }
  
  // Comments
  async getComments(billId: number): Promise<DemoComment[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return demoComments.filter(comment => comment.billId === billId);
  }
  
  // Search
  async searchBills(query: string): Promise<DemoBill[]> {
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const searchTerm = query.toLowerCase();
    return demoBills.filter(bill =>
      bill.title.toLowerCase().includes(searchTerm) ||
      bill.summary.toLowerCase().includes(searchTerm) ||
      bill.policyAreas.some(area => area.toLowerCase().includes(searchTerm))
    );
  }
  
  // Analytics
  async getEngagementStats(): Promise<{
    totalViews: number;
    totalComments: number;
    totalVotes: number;
    activeUsers: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const totalViews = demoBills.reduce((sum, bill) => sum + bill.engagement.views, 0);
    const totalComments = demoBills.reduce((sum, bill) => sum + bill.engagement.comments, 0);
    const totalVotes = demoBills.reduce((sum, bill) => 
      sum + bill.engagement.votes.support + bill.engagement.votes.oppose + bill.engagement.votes.neutral, 0
    );
    
    return {
      totalViews,
      totalComments,
      totalVotes,
      activeUsers: demoUsers.length
    };
  }
}

// Export singleton instance
export const demoDataService = RealisticDemoDataService.getInstance();

export default demoDataService;
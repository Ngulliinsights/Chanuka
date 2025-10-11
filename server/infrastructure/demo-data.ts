import { Bill, BillComment, Sponsor, Analysis, BillEngagement } from '../../shared/schema.js';
import { BillAnalysis, SponsorshipAnalysis } from '../../shared/types/bill.js';
import { logger } from '../utils/logger';

// Enhanced types for demo data that match API responses
interface DemoBill extends Omit<Bill, 'id' | 'sponsorId'> {
  id: number;
  sponsorId?: number;
}

interface DemoSponsor extends Omit<Sponsor, 'id'> {
  id: number;
  profileImage?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
  };
}

interface DemoBillComment extends Omit<BillComment, 'id' | 'userId'> {
  id: number;
  userId: string;
  isHighlighted?: boolean;
}

interface DemoBillEngagement extends Omit<BillEngagement, 'id' | 'userId'> {
  id: number;
  userId: string;
  lastViewed?: Date;
}

/**
 * Demo Data Service
 * Provides sample legislative data that matches real API responses
 * Used when database is unavailable or in demo mode
 */
export class DemoDataService {
  private static instance: DemoDataService;
  private demoMode: boolean = false;

  private constructor() {}

  public static getInstance(): DemoDataService {
    if (!DemoDataService.instance) {
      DemoDataService.instance = new DemoDataService();
    }
    return DemoDataService.instance;
  }

  /**
   * Enable or disable demo mode
   */
  public setDemoMode(enabled: boolean): void {
    this.demoMode = enabled;
    console.log(`Demo mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if demo mode is active
   */
  public isDemoMode(): boolean {
    return this.demoMode;
  }

  /**
   * Get sample bills data
   */
  public getBills(): DemoBill[] {
    return [
      {
        id: 1,
        title: "Digital Economy and Data Protection Act 2024",
        description: "Comprehensive legislation to regulate digital platforms and protect citizen data privacy rights in Kenya.",
        content: "WHEREAS the digital economy has become integral to Kenya's economic development...\n\nSection 1: Definitions\nFor the purposes of this Act:\n(a) 'digital platform' means any online service that facilitates interactions between users...\n(b) 'personal data' means any information relating to an identified or identifiable natural person...\n\nSection 2: Data Protection Principles\nAll data controllers shall ensure that personal data is:\n(a) processed lawfully, fairly and transparently...\n(b) collected for specified, explicit and legitimate purposes...",
        summary: "This Act establishes comprehensive data protection framework for Kenya's digital economy, requiring platforms to obtain explicit consent for data collection, implement privacy-by-design principles, and face penalties up to 4% of annual turnover for violations.",
        status: "committee_review",
        billNumber: "HB-2024-001",
        sponsorId: 1,
        category: "technology",
        tags: ["data protection", "digital economy", "privacy", "technology"],
        viewCount: 1247,
        shareCount: 89,
        complexityScore: 8,
        constitutionalConcerns: {
          concerns: ["Right to privacy", "Freedom of expression"],
          severity: "medium",
          analysis: "Balances privacy rights with freedom of expression"
        },
        stakeholderAnalysis: {
          supporters: ["Civil society", "Privacy advocates"],
          opponents: ["Tech companies", "Digital marketers"],
          neutral: ["Small businesses"]
        },
        introducedDate: new Date("2024-01-15"),
        lastActionDate: new Date("2024-01-20"),
        createdAt: new Date("2024-01-15"),
        updatedAt: new Date("2024-01-20")
      },
      {
        id: 2,
        title: "Climate Change Adaptation Fund Bill 2024",
        description: "Establishes a national fund for climate adaptation projects and carbon offset programs.",
        content: "WHEREAS Kenya is vulnerable to the adverse effects of climate change...\n\nSection 1: Establishment of Fund\nThere is hereby established a fund to be known as the Climate Change Adaptation Fund...\n\nSection 2: Objects of the Fund\nThe objects of the Fund shall be to:\n(a) finance climate adaptation projects...\n(b) support carbon offset initiatives...\n(c) promote climate resilience in vulnerable communities...",
        summary: "Creates a KES 50 billion national climate fund financed through carbon taxes and international climate finance, targeting adaptation projects in arid and semi-arid lands, coastal protection, and agricultural resilience programs.",
        status: "first_reading",
        billNumber: "SB-2024-002",
        sponsorId: 2,
        category: "environment",
        tags: ["climate change", "environment", "adaptation", "carbon offset"],
        viewCount: 892,
        shareCount: 156,
        complexityScore: 7,
        constitutionalConcerns: {
          concerns: ["Environmental rights", "Intergenerational equity"],
          severity: "low",
          analysis: "Aligns with constitutional environmental obligations"
        },
        stakeholderAnalysis: {
          supporters: ["Environmental groups", "Rural communities"],
          opponents: ["Industrial lobby", "Carbon-intensive industries"],
          neutral: ["Urban populations"]
        },
        introducedDate: new Date("2024-02-01"),
        lastActionDate: new Date("2024-02-05"),
        createdAt: new Date("2024-02-01"),
        updatedAt: new Date("2024-02-05")
      },
      {
        id: 3,
        title: "Universal Healthcare Financing Amendment Bill 2024",
        description: "Amends the National Hospital Insurance Fund Act to expand coverage and improve healthcare financing.",
        content: "WHEREAS access to healthcare is a fundamental right...\n\nSection 1: Amendment of Principal Act\nThe National Hospital Insurance Fund Act is amended as follows...\n\nSection 2: Expanded Coverage\nThe Fund shall provide coverage for:\n(a) primary healthcare services...\n(b) specialized medical treatment...\n(c) mental health services...\n(d) maternal and child health programs...",
        summary: "Expands NHIF coverage to include mental health, dental care, and specialized treatments while introducing progressive contribution rates based on income levels and establishing quality assurance mechanisms for healthcare providers.",
        status: "second_reading",
        billNumber: "HB-2024-003",
        sponsorId: 3,
        category: "healthcare",
        tags: ["healthcare", "NHIF", "universal coverage", "medical insurance"],
        viewCount: 2156,
        shareCount: 234,
        complexityScore: 9,
        constitutionalConcerns: {
          concerns: ["Right to health", "Social security"],
          severity: "low",
          analysis: "Strengthens constitutional right to healthcare"
        },
        stakeholderAnalysis: {
          supporters: ["Healthcare workers", "Patient advocacy groups"],
          opponents: ["Private insurers", "Some employers"],
          neutral: ["General public"]
        },
        introducedDate: new Date("2024-01-10"),
        lastActionDate: new Date("2024-02-15"),
        createdAt: new Date("2024-01-10"),
        updatedAt: new Date("2024-02-15")
      }
    ];
  }

  /**
   * Get sample sponsors data
   */
  public getSponsors(): DemoSponsor[] {
    return [
      {
        id: 1,
        name: "Hon. Sarah Mwangi",
        role: "Member of Parliament",
        party: "Democratic Alliance",
        constituency: "Nairobi Central",
        email: "s.mwangi@parliament.go.ke",
        phone: "+254-700-123-456",
        bio: "Technology policy expert with 15 years experience in digital governance and data protection advocacy.",
        photoUrl: "/images/sponsors/sarah-mwangi.jpg",
        conflictLevel: "low",
        financialExposure: "15000.00",
        votingAlignment: "85.00",
        transparencyScore: "92.50",
        isActive: true,
        profileImage: "/images/sponsors/sarah-mwangi.jpg",
        socialMedia: {
          twitter: "@SarahMwangiMP",
          facebook: "SarahMwangiOfficial"
        },
        createdAt: new Date("2023-01-01")
      },
      {
        id: 2, 
        name: "Hon. James Kimani",
        role: "Senator",
        party: "Green Party",
        constituency: "Kiambu County",
        email: "j.kimani@senate.go.ke",
        phone: "+254-700-234-567",
        bio: "Environmental lawyer and climate change advocate with extensive experience in environmental policy and sustainable development.",
        photoUrl: "/images/sponsors/james-kimani.jpg",
        conflictLevel: "low",
        financialExposure: "8000.00",
        votingAlignment: "78.00",
        transparencyScore: "88.75",
        isActive: true,
        profileImage: "/images/sponsors/james-kimani.jpg",
        socialMedia: {
          twitter: "@JamesKimaniSen",
          linkedin: "james-kimani-senator"
        },
        createdAt: new Date("2023-01-01")
      },
      {
        id: 3,
        name: "Hon. Dr. Mary Wanjiku",
        role: "Member of Parliament",
        party: "Health First Coalition",
        constituency: "Nakuru East",
        email: "m.wanjiku@parliament.go.ke",
        phone: "+254-700-345-678",
        bio: "Medical doctor and public health specialist with 20 years experience in healthcare policy and universal health coverage advocacy.",
        photoUrl: "/images/sponsors/mary-wanjiku.jpg",
        conflictLevel: "medium",
        financialExposure: "25000.00",
        votingAlignment: "82.00",
        transparencyScore: "90.25",
        isActive: true,
        profileImage: "/images/sponsors/mary-wanjiku.jpg",
        socialMedia: {
          twitter: "@DrMaryWanjiku",
          facebook: "DrMaryWanjikuMP"
        },
        createdAt: new Date("2023-01-01")
      }
    ];
  }

  /**
   * Get sample bill comments
   */
  public getBillComments(billId: number): DemoBillComment[] {
    const baseComments = [
      {
        id: 1,
        billId: 1,
        userId: "user-001",
        content: "This bill is crucial for protecting our digital rights. The penalties seem appropriate for the scale of potential violations.",
        commentType: "general" as const,
        upvotes: 15,
        downvotes: 2,
        parentCommentId: null,
        isVerified: true,
        isHighlighted: false,
        createdAt: new Date("2024-01-16"),
        updatedAt: new Date("2024-01-16")
      },
      {
        id: 2,
        billId: 1,
        userId: "user-002", 
        content: "I'm concerned about the compliance burden on small tech startups. Perhaps a phased implementation would be better?",
        commentType: "concern" as const,
        upvotes: 8,
        downvotes: 1,
        parentCommentId: null,
        isVerified: false,
        isHighlighted: false,
        createdAt: new Date("2024-01-17"),
        updatedAt: new Date("2024-01-17")
      },
      {
        id: 3,
        billId: 2,
        userId: "user-003",
        content: "The climate fund is a step in the right direction. We need more funding for adaptation in coastal areas.",
        commentType: "support" as const,
        upvotes: 22,
        downvotes: 0,
        parentCommentId: null,
        isVerified: true,
        isHighlighted: true,
        createdAt: new Date("2024-02-02"),
        updatedAt: new Date("2024-02-02")
      },
      {
        id: 4,
        billId: 3,
        userId: "user-004",
        content: "Universal healthcare is essential. The progressive contribution model ensures fairness across income levels.",
        commentType: "support" as const,
        upvotes: 31,
        downvotes: 3,
        parentCommentId: null,
        isVerified: true,
        isHighlighted: false,
        createdAt: new Date("2024-02-16"),
        updatedAt: new Date("2024-02-16")
      }
    ];

    return baseComments.filter(comment => comment.billId === billId);
  }

  /**
   * Get sample bill engagement data
   */
  public getBillEngagement(billId: number): DemoBillEngagement | null {
    const engagements: DemoBillEngagement[] = [
      {
        id: 1,
        billId: 1,
        userId: "user-001",
        viewCount: 5,
        commentCount: 2,
        shareCount: 1,
        engagementScore: "8.5",
        lastViewed: new Date("2024-01-18"),
        lastEngaged: new Date("2024-01-18"),
        createdAt: new Date("2024-01-16"),
        updatedAt: new Date("2024-01-18")
      },
      {
        id: 2,
        billId: 2,
        userId: "user-002",
        viewCount: 3,
        commentCount: 1,
        shareCount: 2,
        engagementScore: "6.2",
        lastViewed: new Date("2024-02-03"),
        lastEngaged: new Date("2024-02-03"),
        createdAt: new Date("2024-02-02"),
        updatedAt: new Date("2024-02-03")
      },
      {
        id: 3,
        billId: 3,
        userId: "user-003",
        viewCount: 7,
        commentCount: 1,
        shareCount: 3,
        engagementScore: "9.1",
        lastViewed: new Date("2024-02-17"),
        lastEngaged: new Date("2024-02-17"),
        createdAt: new Date("2024-02-16"),
        updatedAt: new Date("2024-02-17")
      }
    ];

    return engagements.find(e => e.billId === billId) || null;
  }

  /**
   * Get sample bill analysis data
   */
  public getBillAnalysis(billId: number): BillAnalysis | null {
    const analyses = [
      {
        billId: 1,
        complexity: 8,
        transparency: 7,
        conflicts: [
          {
            type: "financial" as const,
            severity: "medium" as const,
            description: "Potential impact on tech company revenues",
            section: "Section 5: Penalties and Enforcement"
          },
          {
            type: "political" as const,
            severity: "low" as const,
            description: "Balancing privacy vs innovation concerns",
            section: "Section 3: Data Processing Requirements"
          }
        ],
        sentiment: {
          positive: 65,
          negative: 20,
          neutral: 15
        },
        keyTerms: ["data protection", "privacy", "digital platforms", "consent", "penalties"],
        summary: "Comprehensive data protection framework with strong enforcement mechanisms",
        riskFactors: [
          "Implementation complexity for small businesses",
          "Potential for regulatory overreach",
          "Cross-border data transfer restrictions"
        ],
        lastUpdated: new Date("2024-01-20")
      },
      {
        billId: 2,
        complexity: 7,
        transparency: 9,
        conflicts: [
          {
            type: "financial" as const,
            severity: "high" as const,
            description: "Significant funding requirements",
            section: "Section 4: Fund Financing"
          }
        ],
        sentiment: {
          positive: 78,
          negative: 12,
          neutral: 10
        },
        keyTerms: ["climate change", "adaptation", "carbon offset", "fund", "resilience"],
        summary: "Well-structured climate adaptation funding mechanism with clear objectives",
        riskFactors: [
          "Funding sustainability concerns",
          "Implementation capacity challenges",
          "Monitoring and evaluation complexity"
        ],
        lastUpdated: new Date("2024-02-05")
      },
      {
        billId: 3,
        complexity: 9,
        transparency: 8,
        conflicts: [
          {
            type: "financial" as const,
            severity: "high" as const,
            description: "Substantial increase in healthcare spending",
            section: "Section 6: Financing Mechanisms"
          },
          {
            type: "professional" as const,
            severity: "medium" as const,
            description: "Impact on private healthcare providers",
            section: "Section 8: Provider Networks"
          }
        ],
        sentiment: {
          positive: 72,
          negative: 18,
          neutral: 10
        },
        keyTerms: ["universal healthcare", "NHIF", "coverage", "financing", "quality"],
        summary: "Ambitious healthcare expansion with progressive financing model",
        riskFactors: [
          "Healthcare system capacity constraints",
          "Provider quality assurance challenges",
          "Fiscal sustainability concerns"
        ],
        lastUpdated: new Date("2024-02-15")
      }
    ];

    return analyses.find(a => a.billId === billId) || null;
  }

  /**
   * Get sample sponsorship analysis data
   */
  public getSponsorshipAnalysis(billId: number): SponsorshipAnalysis | null {
    const sponsorshipAnalyses = [
      {
        billId: 1,
        title: "Digital Economy and Data Protection Act 2024",
        number: "HB-2024-001",
        introduced: "2024-01-15",
        status: "committee_review",
        primarySponsor: {
          id: "sponsor-001",
          name: "Hon. Sarah Mwangi",
          role: "Member of Parliament",
          party: "Democratic Alliance",
          constituency: "Nairobi Central",
          conflictLevel: "low" as const,
          financialExposure: 15000,
          affiliations: [
            {
              organization: "Tech Policy Institute",
              role: "Board Member",
              type: "professional" as const,
              conflictType: "minor" as const
            }
          ],
          votingAlignment: 85,
          transparency: {
            disclosure: "complete" as const,
            lastUpdated: "2024-01-15",
            publicStatements: 12
          }
        },
        coSponsors: [
          {
            id: "sponsor-004",
            name: "Hon. Peter Ochieng",
            role: "Member of Parliament", 
            party: "Progressive Coalition",
            constituency: "Kisumu Central",
            conflictLevel: "low" as const,
            financialExposure: 8000,
            affiliations: [],
            votingAlignment: 78,
            transparency: {
              disclosure: "complete" as const,
              lastUpdated: "2024-01-16",
              publicStatements: 8
            }
          }
        ],
        totalFinancialExposure: 23000,
        industryAlignment: 72,
        sections: [
          {
            number: "3",
            title: "Data Processing Requirements",
            conflictLevel: "medium" as const,
            affectedSponsors: ["sponsor-001"],
            description: "Requirements for lawful data processing"
          }
        ],
        financialBreakdown: {
          primarySponsor: 15000,
          coSponsorsTotal: 8000,
          industryContributions: 45000
        },
        timeline: [
          {
            date: "2024-01-15",
            event: "Bill introduced",
            type: "legislative" as const
          },
          {
            date: "2024-01-20",
            event: "Committee assignment",
            type: "legislative" as const
          }
        ],
        methodology: {
          verificationSources: [
            {
              name: "Parliamentary Records",
              weight: 0.4,
              reliability: "high" as const
            },
            {
              name: "Financial Disclosures",
              weight: 0.3,
              reliability: "high" as const
            },
            {
              name: "Public Statements",
              weight: 0.3,
              reliability: "medium" as const
            }
          ],
          analysisStages: [
            "Data Collection",
            "Conflict Identification",
            "Impact Assessment",
            "Transparency Scoring"
          ]
        }
      }
    ];

    return sponsorshipAnalyses.find(a => a.billId === billId) || null;
  }

  /**
   * Get bill categories with counts
   */
  public getBillCategories() {
    return [
      { id: "technology", name: "Technology & Digital", count: 15 },
      { id: "environment", name: "Environment & Climate", count: 23 },
      { id: "healthcare", name: "Healthcare & Social", count: 18 },
      { id: "economy", name: "Economy & Finance", count: 31 },
      { id: "education", name: "Education & Training", count: 12 },
      { id: "infrastructure", name: "Infrastructure", count: 19 },
      { id: "governance", name: "Governance & Law", count: 25 }
    ];
  }

  /**
   * Get bill statuses with counts
   */
  public getBillStatuses() {
    return [
      { id: "introduced", name: "Introduced", count: 45 },
      { id: "first_reading", name: "First Reading", count: 28 },
      { id: "committee_review", name: "Committee Review", count: 35 },
      { id: "second_reading", name: "Second Reading", count: 22 },
      { id: "third_reading", name: "Third Reading", count: 15 },
      { id: "passed", name: "Passed", count: 67 },
      { id: "rejected", name: "Rejected", count: 8 },
      { id: "withdrawn", name: "Withdrawn", count: 3 }
    ];
  }

  /**
   * Search bills by query
   */
  public searchBills(query: string, filters?: { status?: string; category?: string }): DemoBill[] {
    let bills = this.getBills();
    
    // Apply text search
    if (query) {
      const searchTerm = query.toLowerCase();
      bills = bills.filter(bill => 
        bill.title.toLowerCase().includes(searchTerm) ||
        bill.description?.toLowerCase().includes(searchTerm) ||
        bill.summary?.toLowerCase().includes(searchTerm) ||
        bill.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Apply filters
    if (filters?.status) {
      bills = bills.filter(bill => bill.status === filters.status);
    }
    
    if (filters?.category) {
      bills = bills.filter(bill => bill.category === filters.category);
    }

    return bills;
  }

  /**
   * Get a specific bill by ID
   */
  public getBill(id: number): DemoBill | null {
    return this.getBills().find(bill => bill.id === id) || null;
  }

  /**
   * Get a specific sponsor by ID
   */
  public getSponsor(id: string | number): DemoSponsor | null {
    const numericId = typeof id === 'string' ? parseInt(id) : id;
    return this.getSponsors().find(sponsor => sponsor.id === numericId) || null;
  }

  /**
   * Detect if demo mode should be enabled based on environment or database status
   */
  public detectDemoMode(): boolean {
    // Check environment variables
    if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'demo') {
      return true;
    }

    // Check if database is unavailable (this would be set by database connection logic)
    if (process.env.DATABASE_UNAVAILABLE === 'true') {
      return true;
    }

    return false;
  }

  /**
   * Auto-enable demo mode if conditions are met
   */
  public autoEnableDemoMode(): void {
    if (this.detectDemoMode() && !this.demoMode) {
      this.setDemoMode(true);
      logger.info('🔄 Auto-enabled demo mode due to system conditions', { component: 'SimpleTool' });
    }
  }

  /**
   * Get comprehensive demo data for a bill (includes all related data)
   */
  public getComprehensiveBillData(billId: number) {
    const bill = this.getBill(billId);
    if (!bill) return null;

    return {
      bill,
      comments: this.getBillComments(billId),
      engagement: this.getBillEngagement(billId),
      analysis: this.getBillAnalysis(billId),
      sponsorshipAnalysis: this.getSponsorshipAnalysis(billId),
      sponsor: bill.sponsorId ? this.getSponsor(bill.sponsorId) : null
    };
  }

  /**
   * Get demo data health status
   */
  public getHealthStatus() {
    return {
      demoMode: this.demoMode,
      dataConsistency: this.validateDataConsistency(),
      lastUpdated: new Date().toISOString(),
      availableDataSets: {
        bills: this.getBills().length,
        sponsors: this.getSponsors().length,
        categories: this.getBillCategories().length,
        statuses: this.getBillStatuses().length
      }
    };
  }

  /**
   * Validate data consistency across demo datasets
   */
  private validateDataConsistency(): boolean {
    try {
      const bills = this.getBills();
      const sponsors = this.getSponsors();
      
      // Check that all bill sponsor IDs have corresponding sponsors
      for (const bill of bills) {
        if (bill.sponsorId) {
          const sponsor = sponsors.find(s => s.id === bill.sponsorId);
          if (!sponsor) {
            console.warn(`Bill ${bill.id} references non-existent sponsor ${bill.sponsorId}`);
            return false;
          }
        }
      }

      // Check that all bills have valid dates
      for (const bill of bills) {
        if (!bill.introducedDate || !bill.createdAt || !bill.updatedAt) {
          console.warn(`Bill ${bill.id} has invalid dates`);
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Data consistency validation failed:', { component: 'SimpleTool' }, error);
      return false;
    }
  }
}

// Export singleton instance
export const demoDataService = DemoDataService.getInstance();







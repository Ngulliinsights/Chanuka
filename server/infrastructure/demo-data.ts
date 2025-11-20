import type { Bill, BillComment, Sponsor, BillEngagement } from '@shared/schema';
// Import analysis types from their respective domain features
import type { BillAnalysis } from '@client/features/bills/types/analysis.js';
import type { SponsorshipAnalysis } from '@client/features/sponsors/types/analysis.js';
import { logger   } from '@shared/core/src/index.js';

// Enhanced types for demo data that match API responses
interface DemoBill extends Omit<Bill, 'id' | 'sponsor_id' | 'comment_count' | 'engagement_score'> {
  id: number;
  sponsor_id?: number;
  comment_count?: number;
  engagement_score?: number;
}

interface DemoSponsor extends Omit<Sponsor, 'id' | 'updated_at'> {
  id: number;
  profileImage?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    linkedin?: string;
  };
  updated_at: Date;
}

interface DemoBillComment extends Omit<BillComment, 'id' | 'user_id' | 'is_deleted'> { id: number;
  user_id: string;
  isHighlighted?: boolean;
  is_deleted: boolean;
 }

interface DemoBillEngagement extends Omit<BillEngagement, 'id' | 'user_id'> { id: number;
  user_id: string;
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
  
  // Cache demo data to avoid recreating it on every call
  private billsCache: DemoBill[] | null = null;
  private sponsorsCache: DemoSponsor[] | null = null;

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
    logger.info(`Demo mode ${enabled ? 'enabled' : 'disabled'}`, { component: 'DemoDataService' });
  }

  /**
   * Check if demo mode is active
   */
  public isDemoMode(): boolean {
    return this.demoMode;
  }

  /**
   * Clear cached data (useful for testing or forcing refresh)
   */
  public clearCache(): void {
    this.billsCache = null;
    this.sponsorsCache = null;
  }

  /**
   * Get sample bills data
   * Uses caching to avoid recreating objects on every call
   */
  public getBills(): DemoBill[] {
    if (this.billsCache) {
      return this.billsCache;
    }

    this.billsCache = [
      {
        id: 1,
        title: "Digital Economy and Data Protection Act 2024",
        description: "Comprehensive legislation to regulate digital platforms and protect citizen data privacy rights in Kenya.",
        content: "WHEREAS the digital economy has become integral to Kenya's economic development...\n\nSection 1: Definitions\nFor the purposes of this Act:\n(a) 'digital platform' means any online service that facilitates interactions between users...\n(b) 'personal data' means any information relating to an identified or identifiable natural person...\n\nSection 2: Data Protection Principles\nAll data controllers shall ensure that personal data is:\n(a) processed lawfully, fairly and transparently...\n(b) collected for specified, explicit and legitimate purposes...",
        summary: "This Act establishes comprehensive data protection framework for Kenya's digital economy, requiring platforms to obtain explicit consent for data collection, implement privacy-by-design principles, and face penalties up to 4% of annual turnover for violations.",
        status: "committee_review",
        bill_number: "HB-2024-001",
        sponsor_id: 1,
        category: "technology",
        tags: ["data protection", "digital economy", "privacy", "technology"],
        view_count: 1247,
        share_count: 89,
        complexity_score: 8,
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
        introduced_date: new Date("2024-01-15"),
        last_action_date: new Date("2024-01-20"),
        created_at: new Date("2024-01-15"),
        updated_at: new Date("2024-01-20")
      },
      {
        id: 2,
        title: "Climate Change Adaptation Fund Bill 2024",
        description: "Establishes a national fund for climate adaptation projects and carbon offset programs.",
        content: "WHEREAS Kenya is vulnerable to the adverse effects of climate change...\n\nSection 1: Establishment of Fund\nThere is hereby established a fund to be known as the Climate Change Adaptation Fund...\n\nSection 2: Objects of the Fund\nThe objects of the Fund shall be to:\n(a) finance climate adaptation projects...\n(b) support carbon offset initiatives...\n(c) promote climate resilience in vulnerable communities...",
        summary: "Creates a KES 50 billion national climate fund financed through carbon taxes and international climate finance, targeting adaptation projects in arid and semi-arid lands, coastal protection, and agricultural resilience programs.",
        status: "first_reading",
        bill_number: "SB-2024-002",
        sponsor_id: 2,
        category: "environment",
        tags: ["climate change", "environment", "adaptation", "carbon offset"],
        view_count: 892,
        share_count: 156,
        complexity_score: 7,
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
        introduced_date: new Date("2024-02-01"),
        last_action_date: new Date("2024-02-05"),
        created_at: new Date("2024-02-01"),
        updated_at: new Date("2024-02-05")
      },
      {
        id: 3,
        title: "Universal Healthcare Financing Amendment Bill 2024",
        description: "Amends the National Hospital Insurance Fund Act to expand coverage and improve healthcare financing.",
        content: "WHEREAS access to healthcare is a fundamental right...\n\nSection 1: Amendment of Principal Act\nThe National Hospital Insurance Fund Act is amended as follows...\n\nSection 2: Expanded Coverage\nThe Fund shall provide coverage for:\n(a) primary healthcare services...\n(b) specialized medical treatment...\n(c) mental health services...\n(d) maternal and child health programs...",
        summary: "Expands NHIF coverage to include mental health, dental care, and specialized treatments while introducing progressive contribution rates based on income levels and establishing quality assurance mechanisms for healthcare providers.",
        status: "second_reading",
        bill_number: "HB-2024-003",
        sponsor_id: 3,
        category: "healthcare",
        tags: ["healthcare", "NHIF", "universal coverage", "medical insurance"],
        view_count: 2156,
        share_count: 234,
        complexity_score: 9,
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
        introduced_date: new Date("2024-01-10"),
        last_action_date: new Date("2024-02-15"),
        created_at: new Date("2024-01-10"),
        updated_at: new Date("2024-02-15")
      }
    ];

    return this.billsCache;
  }

  /**
   * Get sample sponsors data
   * Uses caching and eliminates duplicate entries
   */
  public getSponsors(): DemoSponsor[] {
    if (this.sponsorsCache) {
      return this.sponsorsCache;
    }

    this.sponsorsCache = [
      {
        id: 1,
        name: "Hon. Sarah Mwangi",
        role: "Member of Parliament",
        party: "Democratic Alliance",
        constituency: "Nairobi Central",
        email: "s.mwangi@parliament.go.ke",
        phone: "+254-700-123-456",
        bio: "Technology policy expert with 15 years experience in digital governance and data protection advocacy.",
        photo_url: "/images/sponsors/sarah-mwangi.jpg",
        conflict_level: "low",
        financial_exposure: "15000.00",
        voting_alignment: "85.00",
        transparency_score: "92.50",
        is_active: true,
        profileImage: "/images/sponsors/sarah-mwangi.jpg",
        socialMedia: {
          twitter: "@SarahMwangiMP",
          facebook: "SarahMwangiOfficial"
        },
        created_at: new Date("2023-01-01"),
        updated_at: new Date("2024-01-01")
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
        photo_url: "/images/sponsors/james-kimani.jpg",
        conflict_level: "low",
        financial_exposure: "8000.00",
        voting_alignment: "78.00",
        transparency_score: "88.75",
        is_active: true,
        profileImage: "/images/sponsors/james-kimani.jpg",
        socialMedia: {
          twitter: "@JamesKimaniSen",
          linkedin: "james-kimani-senator"
        },
        created_at: new Date("2023-01-01"),
        updated_at: new Date("2024-01-01")
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
        photo_url: "/images/sponsors/mary-wanjiku.jpg",
        conflict_level: "medium",
        financial_exposure: "25000.00",
        voting_alignment: "82.00",
        transparency_score: "90.25",
        is_active: true,
        profileImage: "/images/sponsors/mary-wanjiku.jpg",
        socialMedia: {
          twitter: "@DrMaryWanjiku",
          facebook: "DrMaryWanjikuMP"
        },
        created_at: new Date("2023-01-01"),
        updated_at: new Date("2024-01-01")
      }
    ];

    return this.sponsorsCache;
  }

  /**
   * Get sample bill comments
   * Organized by bill ID for efficient lookup
   */
  public getBillComments(bill_id: number): DemoBillComment[] { const allComments: DemoBillComment[] = [
      {
        id: 1,
        bill_id: 1,
        user_id: "user-001",
        content: "This bill is crucial for protecting our digital rights. The penalties seem appropriate for the scale of potential violations.",
        commentType: "general" as const,
        upvotes: 15,
        downvotes: 2,
        parent_id: null,
        is_verified: true,
        isHighlighted: false,
        is_deleted: false,
        created_at: new Date("2024-01-16"),
        updated_at: new Date("2024-01-16")
        },
      { id: 2,
        bill_id: 1,
        user_id: "user-002",
        content: "I'm concerned about the compliance burden on small tech startups. Perhaps a phased implementation would be better?",
        commentType: "concern" as const,
        upvotes: 8,
        downvotes: 1,
        parent_id: null,
        is_verified: false,
        isHighlighted: false,
        is_deleted: false,
        created_at: new Date("2024-01-17"),
        updated_at: new Date("2024-01-17")
        },
      { id: 3,
        bill_id: 2,
        user_id: "user-003",
        content: "The climate fund is a step in the right direction. We need more funding for adaptation in coastal areas.",
        commentType: "support" as const,
        upvotes: 22,
        downvotes: 0,
        parent_id: null,
        is_verified: true,
        isHighlighted: true,
        is_deleted: false,
        created_at: new Date("2024-02-02"),
        updated_at: new Date("2024-02-02")
        },
      { id: 4,
        bill_id: 3,
        user_id: "user-004",
        content: "Universal healthcare is essential. The progressive contribution model ensures fairness across income levels.",
        commentType: "support" as const,
        upvotes: 31,
        downvotes: 3,
        parent_id: null,
        is_verified: true,
        isHighlighted: false,
        is_deleted: false,
        created_at: new Date("2024-02-16"),
        updated_at: new Date("2024-02-16")
        }
    ];

    return allComments.filter(comment => comment.bill_id === bill_id);
  }

  /**
   * Get sample bill engagement data
   * Returns engagement metrics for a specific bill
   */
  public getBillEngagement(bill_id: number): DemoBillEngagement | null { const allEngagements: DemoBillEngagement[] = [
      {
        id: 1,
        bill_id: 1,
        user_id: "user-001",
        view_count: 5,
        comment_count: 2,
        share_count: 1,
        engagement_score: "8.5",
        lastViewed: new Date("2024-01-18"),
        lastEngaged: new Date("2024-01-18"),
        created_at: new Date("2024-01-16"),
        updated_at: new Date("2024-01-18")
        },
      { id: 2,
        bill_id: 2,
        user_id: "user-002",
        view_count: 3,
        comment_count: 1,
        share_count: 2,
        engagement_score: "6.2",
        lastViewed: new Date("2024-02-03"),
        lastEngaged: new Date("2024-02-03"),
        created_at: new Date("2024-02-02"),
        updated_at: new Date("2024-02-03")
        },
      { id: 3,
        bill_id: 3,
        user_id: "user-003",
        view_count: 7,
        comment_count: 1,
        share_count: 3,
        engagement_score: "9.1",
        lastViewed: new Date("2024-02-17"),
        lastEngaged: new Date("2024-02-17"),
        created_at: new Date("2024-02-16"),
        updated_at: new Date("2024-02-17")
        }
    ];

    return allEngagements.find(e => e.bill_id === bill_id) || null;
  }

  /**
   * Get sample bill analysis data
   * Provides complexity, transparency, and conflict analysis
   */
  public getBillAnalysis(bill_id: number): BillAnalysis | null { // Helper function to generate unique IDs for analysis records
    const generateAnalysisId = (bill_id: number): number => bill_id + 1000;

    const allAnalyses: Record<number, BillAnalysis> = {
      1: {
        id: generateAnalysisId(1),
        bill_id: 1,
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
          neutral: 15,
          overall: "positive" as const
        },
        keyTerms: ["data protection", "privacy", "digital platforms", "consent", "penalties"],
        summary: "Comprehensive data protection framework with strong enforcement mechanisms",
        riskFactors: [
          "Implementation complexity for small businesses",
          "Potential for regulatory overreach",
          "Cross-border data transfer restrictions"
        ],
        created_at: new Date("2024-01-15"),
        lastUpdated: new Date("2024-01-20")
      },
      2: { id: generateAnalysisId(2),
        bill_id: 2,
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
          neutral: 10,
          overall: "positive" as const
        },
        keyTerms: ["climate change", "adaptation", "carbon offset", "fund", "resilience"],
        summary: "Well-structured climate adaptation funding mechanism with clear objectives",
        riskFactors: [
          "Funding sustainability concerns",
          "Implementation capacity challenges",
          "Monitoring and evaluation complexity"
        ],
        created_at: new Date("2024-02-01"),
        lastUpdated: new Date("2024-02-05")
      },
      3: { id: generateAnalysisId(3),
        bill_id: 3,
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
          neutral: 10,
          overall: "positive" as const
        },
        keyTerms: ["universal healthcare", "NHIF", "coverage", "financing", "quality"],
        summary: "Ambitious healthcare expansion with progressive financing model",
        riskFactors: [
          "Healthcare system capacity constraints",
          "Provider quality assurance challenges",
          "Fiscal sustainability concerns"
        ],
        created_at: new Date("2024-01-10"),
        lastUpdated: new Date("2024-02-15")
      }
    };

    return allAnalyses[bill_id] || null;
  }

  /**
   * Get sample sponsorship analysis data
   * Provides detailed sponsor conflict and financial analysis
   */
  public getSponsorshipAnalysis(bill_id: number): SponsorshipAnalysis | null { const allSponsorshipAnalyses: Record<number, SponsorshipAnalysis> = {
      1: {
        bill_id: 1,
        title: "Digital Economy and Data Protection Act 2024",
        number: "HB-2024-001",
        introduced: new Date("2024-01-15").toISOString(),
        status: "committee_review",
        primarySponsor: {
          id: 1,
          name: "Hon. Sarah Mwangi",
          role: "primary" as const,
          party: "Democratic Alliance",
          constituency: "Nairobi Central",
          email: "s.mwangi@parliament.go.ke",
          conflict_level: "low" as const,
          financial_exposure: 15000,
          affiliations: [
            {
              organization: "Tech Policy Institute",
              role: "Board Member",
              type: "professional" as const,
              conflictType: "minor" as const
             }
          ],
          voting_alignment: 85,
          transparency: {
            disclosure: "complete" as const,
            lastUpdated: new Date("2024-01-15"),
            publicStatements: 12
          },
          sponsorshipDate: new Date("2024-01-15"),
          is_active: true,
          created_at: new Date("2023-01-01"),
          updated_at: new Date("2024-01-15")
        },
        coSponsors: [
          {
            id: 4,
            name: "Hon. Peter Ochieng",
            role: "co-sponsor" as const,
            party: "Progressive Coalition",
            constituency: "Kisumu Central",
            email: "p.ochieng@parliament.go.ke",
            conflict_level: "low" as const,
            financial_exposure: 8000,
            affiliations: [],
            voting_alignment: 78,
            transparency: {
              disclosure: "complete" as const,
              lastUpdated: new Date("2024-01-16"),
              publicStatements: 8
            },
            sponsorshipDate: new Date("2024-01-16"),
            is_active: true,
            created_at: new Date("2023-01-01"),
            updated_at: new Date("2024-01-16")
          }
        ],
        totalFinancialExposure: 23000,
        industryAlignment: 72,
        sections: [
          {
            number: "3",
            title: "Data Processing Requirements",
            conflict_level: "medium" as const,
            affectedSponsors: ["1"],
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
            date: new Date("2024-01-15").toISOString(),
            event: "Bill introduced",
            type: "legislative" as const
          },
          {
            date: new Date("2024-01-20").toISOString(),
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
    };

    return allSponsorshipAnalyses[bill_id] || null;
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
   * Search bills by query with optional filters
   * Performs case-insensitive text search across multiple fields
   */
  public searchBills(query: string, filters?: { status?: string; category?: string }): DemoBill[] {
    let bills = this.getBills();

    if (query && query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      bills = bills.filter(bill =>
        bills.title.toLowerCase().includes(searchTerm) ||
        bills.description?.toLowerCase().includes(searchTerm) ||
        bills.summary?.toLowerCase().includes(searchTerm) ||
        bills.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    if (filters?.status) {
      bills = bills.filter(bill => bills.status === filters.status);
    }

    if (filters?.category) {
      bills = bills.filter(bill => bills.category === filters.category);
    }

    return bills;
  }

  /**
   * Get a specific bill by ID
   * Returns null if bill not found
   */
  public getBill(id: number): DemoBill | null {
    return this.getBills().find(bill => bills.id === id) || null;
  }

  /**
   * Get a specific sponsor by ID (accepts string or number)
   * Returns null if sponsor not found
   */
  public getSponsor(id: string | number): DemoSponsor | null {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (isNaN(numericId)) {
      logger.warn(`Invalid sponsor ID provided: ${id}`, { component: 'DemoDataService' });
      return null;
    }
    
    return this.getSponsors().find(sponsor => sponsors.id === numericId) || null;
  }

  /**
   * Detect if demo mode should be enabled based on environment or database status
   */
  public detectDemoMode(): boolean {
    if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'demo') {
      return true;
    }

    if (process.env.DATABASE_UNAVAILABLE === 'true') {
      return true;
    }

    return false;
  }

  /**
   * Auto-enable demo mode if conditions are met
   * Useful for automatic fallback when database is unavailable
   */
  public autoEnableDemoMode(): void {
    if (this.detectDemoMode() && !this.demoMode) {
      this.setDemoMode(true);
      logger.info('🔄 Auto-enabled demo mode due to system conditions', { component: 'DemoDataService' });
    }
  }

  /**
   * Get comprehensive demo data for a bill (includes all related data)
   * Returns a complete dataset for a single bill including comments, engagement, and analysis
   */
  public getComprehensiveBillData(bill_id: number) { const bill = this.getBill(bill_id);
    if (!bill) {
      logger.warn(`Bill with ID ${bill_id } not found`, { component: 'DemoDataService' });
      return null;
    }

    return { bill,
      comments: this.getBillComments(bill_id),
      engagement: this.getBillEngagement(bill_id),
      analysis: this.getBillAnalysis(bill_id),
      sponsorshipAnalysis: this.getSponsorshipAnalysis(bill_id),
      sponsor: bills.sponsor_id ? this.getSponsor(bills.sponsor_id) : null
     };
  }

  /**
   * Get demo data health status
   * Useful for monitoring and debugging
   */
  public getHealthStatus() {
    const consistencyCheck = this.validateDataConsistency();
    
    return {
      demoMode: this.demoMode,
      dataConsistency: consistencyCheck,
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
   * Checks referential integrity between bills and sponsors
   */
  private validateDataConsistency(): boolean {
    try {
      const bills = this.getBills();
      const sponsors = this.getSponsors();
      const sponsor_ids = new Set(sponsors.map(s => s.id));

      for (const bill of bills) {
        if (bills.sponsor_id && !sponsor_ids.has(bills.sponsor_id)) {
          logger.warn(`Bill ${bills.id} references non-existent sponsor ${bills.sponsor_id}`, { 
            component: 'DemoDataService' 
          });
          return false;
        }
      }

      for (const bill of bills) {
        if (!bills.introduced_date || !bills.created_at || !bills.updated_at) {
          logger.warn(`Bill ${bills.id} has invalid dates`, { component: 'DemoDataService' });
          return false;
        }

        if (bills.last_action_date && bills.introduced_date > bills.last_action_date) {
          logger.warn(`Bill ${bills.id} has introduced_date after last_action_date`, { 
            component: 'DemoDataService' 
          });
          return false;
        }
      }

      if (sponsors.length !== sponsor_ids.size) {
        logger.warn('Duplicate sponsor IDs detected', { component: 'DemoDataService' });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Data consistency validation failed:', { component: 'DemoDataService' }, error);
      return false;
    }
  }
}

// Export singleton instance for convenient access
export const demoDataService = DemoDataService.getInstance();







































/**
 * Mock Bill Data Service
 * 
 * Provides realistic bill data for development/testing when database is unavailable.
 * Simulates real API operations with proper data structure and relationships.
 */

import { logger } from '@server/infrastructure/observability';

export interface MockBillWithEngagement {
  id: string;
  title: string;
  summary: string;
  status: string;
  category: string;
  introduced_date: string;
  bill_number: string;
  full_text: string;
  sponsor_id: string | null;
  tags: string[];
  last_action_date: string;
  created_at: Date;
  updated_at: Date;
  comment_count: number;
  view_count: number;
  share_count: number;
  engagement_score: string;
  complexity_score: number;
  search_vector?: string | null;
  constitutionalConcerns?: {
    concerns: string[];
    riskLevel: string;
  };
}

/**
 * Mock Bill Data Repository
 * Simulates database operations with realistic data
 */
export class MockBillDataService {
  private static instance: MockBillDataService;
  private mockBills: Map<string, MockBillWithEngagement> = new Map();
  private initialized = false;

  public static getInstance(): MockBillDataService {
    if (!MockBillDataService.instance) {
      MockBillDataService.instance = new MockBillDataService();
    }
    return MockBillDataService.instance;
  }

  /**
   * Initialize mock data - simulates database seeding
   */
  private initializeMockData(): void {
    if (this.initialized) return;

    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const mockBillsData: MockBillWithEngagement[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Digital Economy and Data Protection Act 2024',
        summary: 'Comprehensive legislation to regulate digital platforms and protect citizen data privacy rights.',
        status: 'committee_stage',
        category: 'technology',
        introduced_date: '2024-01-15',
        bill_number: 'HR-2024-001',
        full_text: 'Full text of the Digital Economy and Data Protection Act...',
        sponsor_id: 'sponsor-001',
        tags: ['technology', 'privacy', 'digital rights'],
        last_action_date: '2024-01-20',
        created_at: twentyDaysAgo,
        updated_at: now,
        comment_count: 45,
        view_count: 1250,
        share_count: 89,
        engagement_score: '156',
        complexity_score: 7,
        constitutionalConcerns: {
          concerns: ['First Amendment implications', 'Commerce Clause considerations'],
          riskLevel: 'medium',
        },
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        title: 'Healthcare Access Improvement Act 2024',
        summary: 'Legislation to expand healthcare access and reduce costs for underserved communities.',
        status: 'passed',
        category: 'healthcare',
        introduced_date: '2024-02-01',
        bill_number: 'HR-2024-002',
        full_text: 'Full text of the Healthcare Access Improvement Act...',
        sponsor_id: 'sponsor-002',
        tags: ['healthcare', 'access', 'affordability'],
        last_action_date: '2024-02-15',
        created_at: tenDaysAgo,
        updated_at: fiveDaysAgo,
        comment_count: 78,
        view_count: 2100,
        share_count: 156,
        engagement_score: '234',
        complexity_score: 8,
        constitutionalConcerns: {
          concerns: ['Commerce Clause', 'Spending Clause'],
          riskLevel: 'low',
        },
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        title: 'Infrastructure Investment and Jobs Act Amendment',
        summary: 'Amendment to increase funding for rural infrastructure projects and green energy initiatives.',
        status: 'draft',
        category: 'infrastructure',
        introduced_date: '2024-02-10',
        bill_number: 'HR-2024-003',
        full_text: 'Full text of the Infrastructure Investment Amendment...',
        sponsor_id: 'sponsor-003',
        tags: ['infrastructure', 'rural', 'green energy'],
        last_action_date: '2024-02-12',
        created_at: fiveDaysAgo,
        updated_at: now,
        comment_count: 23,
        view_count: 890,
        share_count: 34,
        engagement_score: '89',
        complexity_score: 6,
        constitutionalConcerns: {
          concerns: ['Spending Clause', 'Interstate Commerce'],
          riskLevel: 'low',
        },
      },
    ];

    // Populate the mock data store
    mockBillsData.forEach(bill => {
      this.mockBills.set(bill.id, bill);
    });

    this.initialized = true;
    logger.info({ count: mockBillsData.length }, 'Mock bill data initialized');
  }

  /**
   * Simulates database query by ID
   */
  async findById(id: string): Promise<MockBillWithEngagement | null> {
    this.initializeMockData();
    
    // Simulate database query delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    const bill = this.mockBills.get(id) || null;
    
    if (bill) {
      logger.debug({ billId: id }, 'Mock bill data retrieved');
    } else {
      logger.debug({ billId: id }, 'Mock bill data not found');
    }
    
    return bill;
  }

  /**
   * Simulates database query for multiple bills
   */
  async findAll(filters?: {
    status?: string;
    category?: string;
    sponsor_id?: string;
    search?: string;
  }): Promise<MockBillWithEngagement[]> {
    this.initializeMockData();
    
    // Simulate database query delay
    await new Promise(resolve => setTimeout(resolve, 15));
    
    let bills = Array.from(this.mockBills.values());
    
    // Apply filters
    if (filters?.status) {
      bills = bills.filter(bill => bill.status === filters.status);
    }
    
    if (filters?.category) {
      bills = bills.filter(bill => bill.category === filters.category);
    }
    
    if (filters?.sponsor_id) {
      bills = bills.filter(bill => bill.sponsor_id === filters.sponsor_id);
    }
    
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      bills = bills.filter(bill => 
        bill.title.toLowerCase().includes(searchTerm) ||
        bill.summary.toLowerCase().includes(searchTerm) ||
        bill.full_text.toLowerCase().includes(searchTerm)
      );
    }
    
    // Sort by created_at descending (most recent first)
    bills.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
    
    logger.debug({ 
      count: bills.length, 
      filters 
    }, 'Mock bill data query completed');
    
    return bills;
  }

  /**
   * Simulates database count query
   */
  async count(filters?: {
    status?: string;
    category?: string;
    sponsor_id?: string;
    search?: string;
  }): Promise<number> {
    const bills = await this.findAll(filters);
    return bills.length;
  }

  /**
   * Simulates database statistics query
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    this.initializeMockData();
    
    const bills = Array.from(this.mockBills.values());
    
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    
    bills.forEach(bill => {
      byStatus[bill.status] = (byStatus[bill.status] || 0) + 1;
      byCategory[bill.category] = (byCategory[bill.category] || 0) + 1;
    });
    
    return {
      total: bills.length,
      byStatus,
      byCategory,
    };
  }

  /**
   * Check if mock data service is available (always true for mock)
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Get service status for monitoring
   */
  getStatus(): {
    type: 'mock';
    initialized: boolean;
    billCount: number;
  } {
    return {
      type: 'mock',
      initialized: this.initialized,
      billCount: this.mockBills.size,
    };
  }
}

// Export singleton instance
export const mockBillDataService = MockBillDataService.getInstance();
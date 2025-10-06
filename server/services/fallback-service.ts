import type { Bill, User, BillComment } from '../../shared/schema.js';

/**
 * Fallback data service that provides sample data when database is unavailable
 * This ensures the application continues to work even without database connection
 */
export class FallbackService {
  private bills: Bill[] = [];
  private users: User[] = [];
  private comments: BillComment[] = [];
  private isInitialized = false;

  constructor() {
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    if (this.isInitialized) return;

    // Sample bills data
    this.bills = [
      {
        id: 1,
        title: "Digital Rights and Privacy Protection Act",
        billNumber: "HR-2024-001",
        introducedDate: new Date('2024-01-15'),
        status: "committee",
        summary: "Comprehensive legislation to protect digital privacy rights and regulate data collection by technology companies.",
        description: "This bill establishes fundamental digital rights for citizens and creates oversight mechanisms for data protection.",
        content: "Full text of the Digital Rights and Privacy Protection Act...",
        category: "technology",
        tags: ["privacy", "technology", "digital-rights"],
        viewCount: 1250,
        shareCount: 89,
        complexityScore: 7,
        constitutionalConcerns: {
          concerns: ["First Amendment implications", "Commerce Clause considerations"],
          severity: "medium"
        },
        stakeholderAnalysis: {
          primary_beneficiaries: ["citizens", "privacy advocates"],
          potential_opponents: ["tech companies", "data brokers"],
          economic_impact: "moderate"
        },
        sponsorId: null,
        lastActionDate: null,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: 2,
        title: "Climate Action and Green Energy Transition Act",
        billNumber: "S-2024-042",
        introducedDate: new Date('2024-02-03'),
        status: "introduced",
        summary: "Legislation to accelerate transition to renewable energy and establish carbon pricing mechanisms.",
        description: "Comprehensive climate action bill with targets for emissions reduction and renewable energy adoption.",
        content: "Full text of the Climate Action and Green Energy Transition Act...",
        category: "environment",
        tags: ["climate", "energy", "environment"],
        viewCount: 2100,
        shareCount: 156,
        complexityScore: 9,
        constitutionalConcerns: {
          concerns: ["Interstate Commerce regulation", "Federal vs State authority"],
          severity: "low"
        },
        stakeholderAnalysis: {
          primary_beneficiaries: ["environmental groups", "renewable energy sector"],
          potential_opponents: ["fossil fuel industry", "traditional utilities"],
          economic_impact: "significant"
        },
        sponsorId: null,
        lastActionDate: null,
        createdAt: new Date('2024-02-03'),
        updatedAt: new Date('2024-02-03')
      },
      {
        id: 3,
        title: "Healthcare Access and Affordability Act",
        billNumber: "HR-2024-078",
        introducedDate: new Date('2024-03-10'),
        status: "passed",
        summary: "Legislation to expand healthcare access and reduce prescription drug costs.",
        description: "This bill aims to make healthcare more accessible and affordable for all Americans.",
        content: "Full text of the Healthcare Access and Affordability Act...",
        category: "healthcare",
        tags: ["healthcare", "prescription-drugs", "access"],
        viewCount: 3200,
        shareCount: 245,
        complexityScore: 8,
        constitutionalConcerns: {
          concerns: ["Federal spending authority", "State healthcare regulation"],
          severity: "medium"
        },
        stakeholderAnalysis: {
          primary_beneficiaries: ["patients", "healthcare advocates"],
          potential_opponents: ["pharmaceutical companies", "insurance companies"],
          economic_impact: "high"
        },
        sponsorId: null,
        lastActionDate: null,
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-03-10')
      }
    ];

    // Sample users data
    this.users = [
      {
        id: 'fallback-user-1',
        email: 'demo@example.com',
        passwordHash: '$2b$10$dummy.hash.for.demo.user',
        firstName: 'Demo',
        lastName: 'User',
        name: 'Demo User',
        role: 'citizen',
        verificationStatus: 'verified',
        preferences: null,
        isActive: true,
        lastLoginAt: new Date('2024-01-20'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-20')
      },
      {
        id: 'fallback-user-2',
        email: 'citizen@example.com',
        passwordHash: '$2b$10$dummy.hash.for.citizen.user',
        firstName: 'Concerned',
        lastName: 'Citizen',
        name: 'Concerned Citizen',
        role: 'citizen',
        verificationStatus: 'verified',
        preferences: null,
        isActive: true,
        lastLoginAt: new Date('2024-02-05'),
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-02-05')
      }
    ];

    // Sample comments data
    this.comments = [
      {
        id: 1,
        billId: 1,
        userId: 'fallback-user-1',
        content: 'This is a crucial piece of legislation for protecting our digital privacy rights.',
        commentType: 'general',
        isVerified: false,
        parentCommentId: null,
        upvotes: 15,
        downvotes: 2,
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
      },
      {
        id: 2,
        billId: 2,
        userId: 'fallback-user-2',
        content: 'Climate action is essential for our future. This bill takes important steps forward.',
        commentType: 'general',
        isVerified: false,
        parentCommentId: null,
        upvotes: 23,
        downvotes: 1,
        createdAt: new Date('2024-02-05'),
        updatedAt: new Date('2024-02-05')
      }
    ];

    this.isInitialized = true;
    console.log('📋 Fallback data service initialized with sample data');
  }

  // Bill operations
  getBills(): Bill[] {
    return [...this.bills];
  }

  getBill(id: number | string): Bill | null {
    const billId = typeof id === 'string' ? parseInt(id) : id;
    return this.bills.find(bill => bill.id === billId) || null;
  }

  addBill(bill: Omit<Bill, 'id'>): Bill {
    const newBill: Bill = {
      ...bill,
      id: Math.max(...this.bills.map(b => b.id), 0) + 1
    };
    this.bills.push(newBill);
    return newBill;
  }

  // User operations
  getUsers(): User[] {
    return [...this.users];
  }

  getUser(id: string): User | null {
    return this.users.find(user => user.id === id) || null;
  }

  getUserByEmail(email: string): User | null {
    return this.users.find(user => user.email === email) || null;
  }

  addUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const newUser: User = {
      ...user,
      id: `fallback-user-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }

  // Comment operations
  getComments(): BillComment[] {
    return [...this.comments];
  }

  getCommentsByBillId(billId: number | string): BillComment[] {
    const id = typeof billId === 'string' ? parseInt(billId) : billId;
    return this.comments.filter(comment => comment.billId === id);
  }

  addComment(comment: Omit<BillComment, 'id' | 'createdAt' | 'updatedAt'>): BillComment {
    const newComment: BillComment = {
      ...comment,
      id: Math.max(...this.comments.map(c => c.id), 0) + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.comments.push(newComment);
    return newComment;
  }

  // Health check
  isHealthy(): boolean {
    return true; // Fallback service is always "healthy"
  }

  // Clear all data (useful for testing)
  clearAll(): void {
    this.bills = [];
    this.users = [];
    this.comments = [];
    this.isInitialized = false;
    this.initializeSampleData();
  }

  // Get status information
  getStatus(): {
    isActive: boolean;
    billCount: number;
    userCount: number;
    commentCount: number;
  } {
    return {
      isActive: true,
      billCount: this.bills.length,
      userCount: this.users.length,
      commentCount: this.comments.length
    };
  }
}

// Export singleton instance
export const fallbackService = new FallbackService();
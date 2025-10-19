import { database as db, users, bills, sponsors, notifications, billComments, billEngagement } from '../shared/database/connection';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { performance } from 'perf_hooks';
import { logger } from '../../../shared/core/src/observability/logging';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: string;
  token: string;
  passwordHash: string;
  verificationStatus: string;
  isActive: boolean;
}

export interface TestBill {
  id: number;
  title: string;
  billNumber: string;
  status: string;
  category: string;
}

export interface TestSponsor {
  id: number;
  name: string;
  party: string;
  constituency: string;
  email: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: NodeJS.MemoryUsage;
  };
  timestamp: number;
}

export class TestDataManager {
  private createdUsers: TestUser[] = [];
  private createdBills: TestBill[] = [];
  private createdSponsors: TestSponsor[] = [];
  private createdNotifications: any[] = [];

  async createTestUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    const defaultUserData = {
      email: `test-user-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
      name: 'Test User',
      role: 'citizen',
      passwordHash: 'hashed-password',
      verificationStatus: 'verified',
      isActive: true,
      firstName: 'Test',
      lastName: 'User',
      preferences: null,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...userData
    };

    try {
      const user = await db.insert(users).values(defaultUserData).returning();
      
      const token = jwt.sign(
        { 
          id: user[0].id, 
          email: user[0].email, 
          role: user[0].role,
          verificationStatus: user[0].verificationStatus,
          isActive: user[0].isActive
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const testUser: TestUser = {
        ...user[0],
        token
      };

      this.createdUsers.push(testUser);
      return testUser;
    } catch (error) {
      console.warn('Failed to create test user:', error);
      throw error;
    }
  }

  async createTestBill(billData: Partial<TestBill> = {}): Promise<TestBill> {
    const defaultBillData = {
      title: `Test Bill ${Date.now()}`,
      billNumber: `TEST-${Date.now()}`,
      introducedDate: new Date(),
      status: 'introduced',
      summary: 'Test bill for integration testing',
      description: 'This bill is used for testing purposes',
      content: 'Full content of test bill...',
      category: 'technology',
      tags: ['test'],
      viewCount: 0,
      shareCount: 0,
      complexityScore: 5,
      constitutionalConcerns: { concerns: [], severity: 'low' },
      stakeholderAnalysis: { 
        primary_beneficiaries: ['test users'], 
        potential_opponents: [], 
        economic_impact: 'minimal' 
      },
      ...billData
    };

    try {
      const bill = await db.insert(bills).values(defaultBillData).returning();
      const testBill: TestBill = bill[0];
      
      this.createdBills.push(testBill);
      return testBill;
    } catch (error) {
      console.warn('Failed to create test bill:', error);
      throw error;
    }
  }

  async createTestSponsor(sponsorData: Partial<TestSponsor> = {}): Promise<TestSponsor> {
    const defaultSponsorData = {
      name: `Test Sponsor ${Date.now()}`,
      party: 'Test Party',
      constituency: 'Test District',
      email: `sponsor-${Date.now()}@parliament.gov`,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...sponsorData
    };

    try {
      const sponsor = await db.insert(sponsors).values(defaultSponsorData).returning();
      const testSponsor: TestSponsor = sponsor[0];
      
      this.createdSponsors.push(testSponsor);
      return testSponsor;
    } catch (error) {
      console.warn('Failed to create test sponsor:', error);
      throw error;
    }
  }

  async createTestNotification(notificationData: any): Promise<any> {
    const defaultNotificationData = {
      type: 'test_notification',
      title: 'Test Notification',
      message: 'This is a test notification',
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...notificationData
    };

    try {
      const notification = await db.insert(notifications).values(defaultNotificationData).returning();
      const testNotification = notification[0];
      
      this.createdNotifications.push(testNotification);
      return testNotification;
    } catch (error) {
      console.warn('Failed to create test notification:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up in reverse order to handle foreign key constraints
      
      // Clean up notifications
      for (const notification of this.createdNotifications) {
        await db.delete(notifications).where(eq(notifications.id, notification.id));
      }
      
      // Clean up bill-related data
      for (const bill of this.createdBills) {
        await db.delete(billComments).where(eq(billComments.billId, bill.id));
        await db.delete(billEngagement).where(eq(billEngagement.billId, bill.id));
        await db.delete(bills).where(eq(bills.id, bill.id));
      }
      
      // Clean up sponsors
      for (const sponsor of this.createdSponsors) {
        await db.delete(sponsors).where(eq(sponsors.id, sponsor.id));
      }
      
      // Clean up users
      for (const user of this.createdUsers) {
        await db.delete(users).where(eq(users.id, user.id));
      }

      // Reset arrays
      this.createdUsers = [];
      this.createdBills = [];
      this.createdSponsors = [];
      this.createdNotifications = [];
      
    } catch (error) {
      console.warn('Test data cleanup failed:', error);
    }
  }

  getCreatedUsers(): TestUser[] {
    return [...this.createdUsers];
  }

  getCreatedBills(): TestBill[] {
    return [...this.createdBills];
  }

  getCreatedSponsors(): TestSponsor[] {
    return [...this.createdSponsors];
  }
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];

  startMeasurement(): { end: () => PerformanceMetrics } {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    return {
      end: (): PerformanceMetrics => {
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        
        const metric: PerformanceMetrics = {
          responseTime: endTime - startTime,
          memoryUsage: {
            before: startMemory,
            after: endMemory,
            delta: {
              rss: endMemory.rss - startMemory.rss,
              heapTotal: endMemory.heapTotal - startMemory.heapTotal,
              heapUsed: endMemory.heapUsed - startMemory.heapUsed,
              external: endMemory.external - startMemory.external,
              arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
            }
          },
          timestamp: Date.now()
        };

        this.metrics.push(metric);
        return metric;
      }
    };
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    return total / this.metrics.length;
  }

  getMaxResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    return Math.max(...this.metrics.map(m => m.responseTime));
  }

  getMinResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    return Math.min(...this.metrics.map(m => m.responseTime));
  }

  getTotalMemoryDelta(): NodeJS.MemoryUsage {
    if (this.metrics.length === 0) {
      return { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 };
    }

    return this.metrics.reduce((total, metric) => ({
      rss: total.rss + metric.memoryUsage.delta.rss,
      heapTotal: total.heapTotal + metric.memoryUsage.delta.heapTotal,
      heapUsed: total.heapUsed + metric.memoryUsage.delta.heapUsed,
      external: total.external + metric.memoryUsage.delta.external,
      arrayBuffers: total.arrayBuffers + metric.memoryUsage.delta.arrayBuffers
    }), { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 });
  }

  reset(): void {
    this.metrics = [];
  }
}

export class ApiResponseValidator {
  static validateSuccessResponse(response: any, expectedStatus: number = 200): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('metadata');
    expect(response.body.metadata).toHaveProperty('timestamp');
  }

  static validateErrorResponse(response: any, expectedStatus: number): void {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('metadata');
  }

  static validatePaginationResponse(response: any): void {
    this.validateSuccessResponse(response);
    expect(response.body.data).toHaveProperty('pagination');
    expect(response.body.data.pagination).toHaveProperty('page');
    expect(response.body.data.pagination).toHaveProperty('limit');
    expect(response.body.data.pagination).toHaveProperty('total');
    expect(response.body.data.pagination).toHaveProperty('totalPages');
  }

  static validateArrayResponse(response: any, arrayProperty: string): void {
    this.validateSuccessResponse(response);
    expect(response.body.data).toHaveProperty(arrayProperty);
    expect(Array.isArray(response.body.data[arrayProperty])).toBe(true);
  }
}

export class SecurityTestHelper {
  static readonly XSS_PAYLOADS = [
    '<script>alert("xss")</script>',
    '"><script>alert("xss")</script>',
    'javascript:alert("xss")',
    '<img src=x onerror=alert("xss")>',
    '<svg onload=alert("xss")>',
    '&lt;script&gt;alert("xss")&lt;/script&gt;'
  ];

  static readonly SQL_INJECTION_PAYLOADS = [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "1' UNION SELECT * FROM users --",
    "'; DELETE FROM bills; --",
    "' OR 1=1 --",
    "admin'--",
    "admin'/*"
  ];

  static readonly INVALID_IDS = [
    'abc',
    '1.5',
    '-1',
    '',
    'null',
    'undefined',
    '999999999999999999999',
    '<script>',
    'DROP TABLE'
  ];

  static generateLongString(length: number = 10000): string {
    return 'x'.repeat(length);
  }

  static generateSpecialCharacters(): string {
    return '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
  }

  static generateUnicodeString(): string {
    return '测试数据 🚀 émojis ñoño';
  }

  static validateXSSPrevention(input: string, output: string): void {
    // Check that dangerous scripts are not present in output
    expect(output).not.toContain('<script>');
    expect(output).not.toContain('javascript:');
    expect(output).not.toContain('onerror=');
    expect(output).not.toContain('onload=');
  }

  static validateSQLInjectionPrevention(response: any): void {
    // Response should not indicate SQL error or success
    expect(response.status).not.toBe(500);
    if (response.body.error) {
      expect(response.body.error.toLowerCase()).not.toContain('sql');
      expect(response.body.error.toLowerCase()).not.toContain('syntax');
      expect(response.body.error.toLowerCase()).not.toContain('table');
    }
  }
}

export class ConcurrencyTestHelper {
  static async runConcurrentRequests<T>(
    requestFunction: () => Promise<T>,
    concurrency: number = 10
  ): Promise<T[]> {
    const requests = Array(concurrency).fill(null).map(() => requestFunction());
    return Promise.all(requests);
  }

  static async runSequentialRequests<T>(
    requestFunction: () => Promise<T>,
    count: number = 10,
    delay: number = 100
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < count; i++) {
      const result = await requestFunction();
      results.push(result);
      
      if (delay > 0 && i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
  }

  static validateConcurrentResponses(responses: any[], expectedStatus: number = 200): void {
    expect(responses.length).toBeGreaterThan(0);
    
    const statusCodes = responses.map(r => r.status);
    const successCount = statusCodes.filter(s => s === expectedStatus).length;
    
    // At least 80% should succeed
    expect(successCount / responses.length).toBeGreaterThanOrEqual(0.8);
  }
}

export class DatabaseTestHelper {
  static async waitForDatabaseOperation(
    operation: () => Promise<any>,
    maxRetries: number = 5,
    delay: number = 100
  ): Promise<any> {
    let lastError: Error;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  static async verifyRecordExists(
    table: any,
    condition: any
  ): Promise<boolean> {
    try {
      const records = await db.select().from(table).where(condition);
      return records.length > 0;
    } catch (error) {
      return false;
    }
  }

  static async verifyRecordCount(
    table: any,
    condition: any,
    expectedCount: number
  ): Promise<boolean> {
    try {
      const records = await db.select().from(table).where(condition);
      return records.length === expectedCount;
    } catch (error) {
      return false;
    }
  }
}

export class MockDataGenerator {
  static generateRandomEmail(): string {
    const domains = ['example.com', 'test.org', 'demo.net'];
    const username = Math.random().toString(36).substring(7);
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
  }

  static generateRandomName(): string {
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  static generateRandomBillTitle(): string {
    const adjectives = ['Comprehensive', 'Enhanced', 'Improved', 'Advanced', 'Modern'];
    const subjects = ['Healthcare', 'Education', 'Technology', 'Environment', 'Security'];
    const types = ['Act', 'Bill', 'Amendment', 'Resolution', 'Initiative'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    
    return `${adjective} ${subject} ${type}`;
  }

  static generateRandomBillNumber(): string {
    const prefixes = ['HR', 'S', 'HB', 'SB'];
    const year = new Date().getFullYear();
    const number = Math.floor(Math.random() * 9999) + 1;
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    
    return `${prefix}-${year}-${number.toString().padStart(4, '0')}`;
  }

  static generateRandomText(minWords: number = 10, maxWords: number = 50): string {
    const words = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
      'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
      'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
      'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo'
    ];
    
    const wordCount = Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
    const selectedWords = [];
    
    for (let i = 0; i < wordCount; i++) {
      selectedWords.push(words[Math.floor(Math.random() * words.length)]);
    }
    
    return selectedWords.join(' ');
  }
}

// Export a default instance for convenience
export const testDataManager = new TestDataManager();
export const performanceMonitor = new PerformanceMonitor();












































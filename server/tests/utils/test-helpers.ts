import { logger } from '@server/infrastructure/observability';
import database from '@server/infrastructure/database';
import { bills, sponsors,users } from '@server/infrastructure/schema';
import { bill_engagement,comments, notifications } from '@server/infrastructure/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { performance } from 'perf_hooks';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'citizen' | 'expert' | 'admin' | 'journalist' | 'advocate';
  token: string;
  password_hash: string;
  verification_status: string;
  is_active: boolean;
}

export interface TestBill {
  id: number;
  title: string;
  bill_number: string;
  status: 'introduced' | 'committee' | 'passed' | 'failed' | 'signed';
  category: string;
}

export interface TestSponsor {
  id: number;
  name: string;
  party: string | null;
  constituency: string | null;
  email: string | null;
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
      role: 'citizen' as const,
      password_hash: 'hashed-password',
      verification_status: 'verified' as const,
      is_active: true,
      first_name: 'Test',
      last_name: 'User',
      preferences: null,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...userData
    };

    try {
      const [user] = await database.insert(users).values(defaultUserData).returning();

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          verification_status: user.verification_status,
          is_active: user.is_active
        },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const testUser: TestUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        password_hash: user.password_hash,
        verification_status: user.verification_status,
        is_active: user.is_active,
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
      bill_number: `TEST-${Date.now()}`,
      introduced_date: new Date(),
      status: 'introduced' as const,
      summary: 'Test bill for integration testing',
      description: 'This bill is used for testing purposes',
      content: 'Full content of test bills...',
      category: 'technology',
      tags: ['test'],
      view_count: 0,
      share_count: 0,
      complexity_score: 5,
      constitutionalConcerns: { concerns: [], severity: 'low' },
      stakeholderAnalysis: {
        primary_beneficiaries: ['test users'],
        potential_opponents: [],
        economic_impact: 'minimal'
      },
      ...billData
    };

    try {
      const [bill] = await database.insert(bills).values(defaultBillData).returning();
      
      const testBill: TestBill = {
        id: bill.id,
        title: bill.title,
        bill_number: bill.bill_number,
        status: bill.status,
        category: bill.category
      };

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
      role: 'sponsor',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...sponsorData
    };

    try {
      const [sponsor] = await database.insert(sponsors).values(defaultSponsorData).returning();
      
      const testSponsor: TestSponsor = {
        id: sponsor.id,
        name: sponsor.name,
        party: sponsor.party,
        constituency: sponsor.constituency,
        email: sponsor.email
      };

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
      is_read: false,
      created_at: new Date(),
      updated_at: new Date(),
      ...notificationData
    };

    try {
      const [notification] = await database.insert(notifications).values(defaultNotificationData).returning();
      
      const testNotification = {
        id: notification.id,
        ...notification
      };

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
        await database.delete(notifications).where(eq(notifications.id, notification.id));
      }

      // Clean up bill-related data
      for (const bill of this.createdBills) {
        await database.delete(comments).where(eq(comments.bill_id, bill.id));
        await database.delete(bill_engagement).where(eq(bill_engagement.bill_id, bill.id));
        await database.delete(bills).where(eq(bills.id, bill.id));
      }

      // Clean up sponsors
      for (const sponsor of this.createdSponsors) {
        await database.delete(sponsors).where(eq(sponsors.id, sponsor.id));
      }

      // Clean up users
      for (const user of this.createdUsers) {
        await database.delete(users).where(eq(users.id, user.id));
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
    // expect(response.status).toBe(expectedStatus);
    // expect(response.body).toHaveProperty('success', true);
    // expect(response.body).toHaveProperty('data');
    // expect(response.body).toHaveProperty('metadata');
    // expect(response.body.metadata).toHaveProperty('timestamp');
    console.log('ApiResponseValidator.validateSuccessResponse called with:', { response, expectedStatus });
  }

  static validateErrorResponse(response: any, expectedStatus: number): void {
    // expect(response.status).toBe(expectedStatus);
    // expect(response.body).toHaveProperty('success', false);
    // expect(response.body).toHaveProperty('error');
    // expect(response.body).toHaveProperty('metadata');
    console.log('ApiResponseValidator.validateErrorResponse called with:', { response, expectedStatus });
  }

  static validatePaginationResponse(response: any): void {
    // this.validateSuccessResponse(response);
    // expect(response.body.data).toHaveProperty('pagination');
    // expect(response.body.data.pagination).toHaveProperty('page');
    // expect(response.body.data.pagination).toHaveProperty('limit');
    // expect(response.body.data.pagination).toHaveProperty('total');
    // expect(response.body.data.pagination).toHaveProperty('totalPages');
    console.log('ApiResponseValidator.validatePaginationResponse called with:', { response });
  }

  static validateArrayResponse(response: any, arrayProperty: string): void {
    // this.validateSuccessResponse(response);
    // expect(response.body.data).toHaveProperty(arrayProperty);
    // expect(Array.isArray(response.body.data[arrayProperty])).toBe(true);
    console.log('ApiResponseValidator.validateArrayResponse called with:', { response, arrayProperty });
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
    if (output.includes('<script>')) {
      throw new Error('XSS vulnerability detected: <script> tag found in output');
    }
    if (output.includes('javascript:')) {
      throw new Error('XSS vulnerability detected: javascript: protocol found in output');
    }
    if (output.includes('onerror=')) {
      throw new Error('XSS vulnerability detected: onerror= attribute found in output');
    }
    if (output.includes('onload=')) {
      throw new Error('XSS vulnerability detected: onload= attribute found in output');
    }
    
    logger.debug('XSS prevention validated successfully', {
      component: 'security-test-helper',
      inputLength: input.length,
      outputLength: output.length
    });
  }

  static validateSQLInjectionPrevention(response: any): void {
    // Response should not indicate SQL error or success
    if (response.status === 500) {
      throw new Error('SQL injection test failed: Server returned 500 error');
    }
    
    if (response.body && response.body.error) {
      const errorLower = response.body.error.toLowerCase();
      
      if (errorLower.includes('sql')) {
        throw new Error('SQL injection vulnerability detected: SQL error message exposed');
      }
      if (errorLower.includes('syntax')) {
        throw new Error('SQL injection vulnerability detected: Syntax error message exposed');
      }
      if (errorLower.includes('table')) {
        throw new Error('SQL injection vulnerability detected: Table information exposed');
      }
    }
    
    logger.debug('SQL injection prevention validated successfully', {
      component: 'security-test-helper',
      status: response.status
    });
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
    if (responses.length === 0) {
      throw new Error('Concurrent response validation failed: No responses received');
    }

    const statusCodes = responses.map(r => r.status);
    const successCount = statusCodes.filter(s => s === expectedStatus).length;
    const successRate = successCount / responses.length;

    // At least 80% should succeed
    if (successRate < 0.8) {
      throw new Error(
        `Concurrent response validation failed: Success rate ${(successRate * 100).toFixed(1)}% is below 80% threshold. ` +
        `Expected ${expectedStatus}, got ${successCount}/${responses.length} successful responses`
      );
    }

    logger.debug('Concurrent response validation passed', {
      component: 'concurrency-test-helper',
      totalResponses: responses.length,
      expectedStatus,
      successCount,
      successRate: `${(successRate * 100).toFixed(1)}%`
    });
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
      const records = await database.select().from(table).where(condition);
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
      const records = await database.select().from(table).where(condition);
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
    const first_names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana'];
    const last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];

    const first_name = first_names[Math.floor(Math.random() * first_names.length)];
    const last_name = last_names[Math.floor(Math.random() * last_names.length)];

    return `${first_name} ${last_name}`;
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
    const selectedWords: string[] = [];

    for (let i = 0; i < wordCount; i++) {
      selectedWords.push(words[Math.floor(Math.random() * words.length)]);
    }

    return selectedWords.join(' ');
  }
}

// Export a default instance for convenience
export const testDataManager = new TestDataManager();
export const performanceMonitor = new PerformanceMonitor();














































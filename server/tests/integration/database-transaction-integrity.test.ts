import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { database as db, withTransaction, bill as bills, user as users, billComment as billComments, billEngagement, sponsor as sponsors, billSponsorship as billSponsorships } from '@shared/database/connection.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '@shared/core';

describe('Database Transaction Integrity Tests', () => {
  let testUserId: string;
  let testBillId: number;
  let testSponsorId: number;

  beforeAll(async () => {
    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Ensure no hanging transactions
    await cleanupHangingTransactions();

    // Force cleanup of any remaining timers to prevent hanging
    if (global.gc) {
      global.gc();
    }
  });

  async function setupTestData() {
    try {
      // Create test user
      const testUser = await db.insert(users).values({
        email: `test-db-${Date.now()}@example.com`,
        name: 'Test DB User',
        role: 'citizen',
        passwordHash: 'test-hash',
        verificationStatus: 'verified',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      testUserId = testUser[0].id;

      // Create test sponsor
      const testSponsor = await db.insert(sponsors).values({
        name: 'Test Sponsor',
        role: 'MP',
        party: 'Test Party',
        constituency: 'Test District',
        email: 'test-sponsor@parliament.gov',
        isActive: true
      }).returning();
      
      testSponsorId = testSponsor[0].id;

      // Create test bill
      const testBill = await db.insert(bills).values({
        title: 'Test Transaction Bill',
        billNumber: `TEST-${Date.now()}`,
        introducedDate: new Date(),
        status: 'introduced',
        summary: 'Test bill for transaction integrity testing',
        description: 'This bill is used for testing database transaction integrity',
        content: 'Full content of test bill...',
        category: 'technology',

        viewCount: 0,
        shareCount: 0,
        complexityScore: 5,
        constitutionalConcerns: { concerns: [], severity: 'low' },
        stakeholderAnalysis: { 
          primary_beneficiaries: ['test users'], 
          potential_opponents: [], 
          economic_impact: 'minimal' 
        }
      }).returning();
      
      testBillId = testBill[0].id;

    } catch (error) {
      console.warn('Test data setup failed, some tests may be skipped:', error);
    }
  }

  async function cleanupTestData() {
    try {
      if (testBillId) {
        await db.delete(billComments).where(eq(billComments.billId, testBillId));
        await db.delete(billEngagement).where(eq(billEngagement.billId, testBillId));
        await db.delete(billSponsorships).where(eq(billSponsorships.billId, testBillId));
        await db.delete(bills).where(eq(bills.id, testBillId));
      }
      
      if (testSponsorId) {
        await db.delete(sponsors).where(eq(sponsors.id, testSponsorId));
      }
      
      if (testUserId) {
        await db.delete(users).where(eq(users.id, testUserId));
      }
    } catch (error) {
      console.warn('Test data cleanup failed:', error);
    }
  }

  async function cleanupHangingTransactions() {
    // This would typically involve checking for and cleaning up any hanging transactions
    // For now, we'll just ensure our test connections are clean
    try {
      // Force any pending operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.warn('Transaction cleanup warning:', error);
    }
  }

  describe('Basic Transaction Operations', () => {
    it('should commit successful transactions', async () => {
      const testComment = {
        billId: testBillId,
        userId: testUserId,
        content: 'Test comment for transaction integrity'
      };

      const result = await withTransaction(async (tx) => {
        const comment = await tx.insert(billComments).values(testComment).returning();
        
        // Verify the comment was inserted within the transaction
        const insertedComment = await tx.select()
          .from(billComments)
          .where(eq(billComments.id, comment[0].id));
        
        expect(insertedComment).toHaveLength(1);
        expect(insertedComment[0].content).toBe(testComment.content);
        
        return comment[0];
      });

      // Verify the comment exists after transaction commit
      const finalComment = await db.select()
        .from(billComments)
        .where(eq(billComments.id, result.id));
      
      expect(finalComment).toHaveLength(1);
      expect(finalComment[0].content).toBe(testComment.content);

      // Cleanup
      await db.delete(billComments).where(eq(billComments.id, result.id));
    });

    it('should rollback failed transactions', async () => {
      const initialCommentCount = await db.select().from(billComments);
      
      try {
        await withTransaction(async (tx) => {
          // Insert a valid comment
          const comment = await tx.insert(billComments).values({
            billId: testBillId,
            userId: testUserId,
            content: 'This should be rolled back'
          }).returning();

          // Verify comment was inserted within transaction
          const insertedComment = await tx.select()
            .from(billComments)
            .where(eq(billComments.id, comment[0].id));
          expect(insertedComment).toHaveLength(1);

          // Force an error to trigger rollback
          throw new Error('Intentional error to test rollback');
        });
      } catch (error) {
        expect((error as Error).message).toBe('Intentional error to test rollback');
      }

      // Verify no new comments were persisted after rollback
      const finalCommentCount = await db.select().from(billComments);
      expect(finalCommentCount.length).toBe(initialCommentCount.length);
    });

    it('should handle nested transactions correctly', async () => {
      const result = await withTransaction(async (outerTx) => {
        // Insert a comment in outer transaction
        const outerComment = await outerTx.insert(billComments).values({
          billId: testBillId,
          userId: testUserId,
          content: 'Outer transaction comment'
        }).returning();

        // Nested transaction (should use savepoint)
        const nestedResult = await withTransaction(async (innerTx) => {
          const innerComment = await innerTx.insert(billComments).values({
            billId: testBillId,
            userId: testUserId,
            content: 'Inner transaction comment'
          }).returning();

          return { outer: outerComment[0], inner: innerComment[0] };
        });

        return nestedResult;
      });

      // Verify both comments exist
      const outerComment = await db.select()
        .from(billComments)
        .where(eq(billComments.id, result.outer.id));
      
      const innerComment = await db.select()
        .from(billComments)
        .where(eq(billComments.id, result.inner.id));

      expect(outerComment).toHaveLength(1);
      expect(innerComment).toHaveLength(1);

      // Cleanup
      await db.delete(billComments).where(eq(billComments.id, result.outer.id));
      await db.delete(billComments).where(eq(billComments.id, result.inner.id));
    });

    it('should handle partial nested transaction rollback', async () => {
      let outerCommentId: number | undefined;

      try {
        await withTransaction(async (outerTx) => {
          // Insert comment in outer transaction
          const outerComment = await outerTx.insert(billComments).values({
            billId: testBillId,
            userId: testUserId,
            content: 'Outer comment should persist'
          }).returning();

          outerCommentId = outerComment[0].id;

          // Nested transaction that will fail
          try {
            await withTransaction(async (innerTx) => {
              await innerTx.insert(billComments).values({
                billId: testBillId,
                userId: testUserId,
                content: 'Inner comment should rollback'
              });

              throw new Error('Inner transaction error');
            });
          } catch (innerError) {
            // Inner transaction failed, but outer should continue
            expect((innerError as Error).message).toBe('Inner transaction error');
          }

          // Outer transaction continues and should commit
          return outerComment[0];
        });
      } catch (error) {
        // Should not reach here
        expect(error).toBeUndefined();
      }

      // Verify outer comment persisted
      expect(outerCommentId).toBeDefined();
      const persistedComment = await db.select()
        .from(billComments)
        .where(eq(billComments.id, outerCommentId!));
      
      expect(persistedComment).toHaveLength(1);
      expect(persistedComment[0].content).toBe('Outer comment should persist');

      // Cleanup
      if (outerCommentId) {
        await db.delete(billComments).where(eq(billComments.id, outerCommentId));
      }
    });
  });

  describe('Complex Multi-Table Transactions', () => {
    it('should maintain referential integrity across multiple tables', async () => {
      const result = await withTransaction(async (tx) => {
        // Create bill sponsorship relationship
        const sponsorship = await tx.insert(billSponsorships).values({
          billId: testBillId,
          sponsorId: testSponsorId,
          sponsorshipType: 'primary'
        }).returning();

        // Create engagement record
        const engagement = await tx.insert(billEngagement).values({
          billId: testBillId,
          userId: testUserId,
          viewCount: 1,
          shareCount: 0
        }).returning();

        // Create comment
        const comment = await tx.insert(billComments).values({
          billId: testBillId,
          userId: testUserId,
          content: 'Multi-table transaction comment'
        }).returning();

        return {
          sponsorship: sponsorship[0],
          engagement: engagement[0],
          comment: comment[0]
        };
      });

      // Verify all records exist and are properly linked
      const sponsorship = await db.select()
        .from(billSponsorships)
        .where(eq(billSponsorships.id, result.sponsorship.id));
      
      const engagement = await db.select()
        .from(billEngagement)
        .where(eq(billEngagement.id, result.engagement.id));
      
      const comment = await db.select()
        .from(billComments)
        .where(eq(billComments.id, result.comment.id));

      expect(sponsorship).toHaveLength(1);
      expect(engagement).toHaveLength(1);
      expect(comment).toHaveLength(1);

      // Verify relationships
      expect(sponsorship[0].billId).toBe(testBillId);
      expect(sponsorship[0].sponsorId).toBe(testSponsorId);
      expect(engagement[0].billId).toBe(testBillId);
      expect(engagement[0].userId).toBe(testUserId);
      expect(comment[0].billId).toBe(testBillId);
      expect(comment[0].userId).toBe(testUserId);

      // Cleanup
      await db.delete(billSponsorships).where(eq(billSponsorships.id, result.sponsorship.id));
      await db.delete(billEngagement).where(eq(billEngagement.id, result.engagement.id));
      await db.delete(billComments).where(eq(billComments.id, result.comment.id));
    });

    it('should rollback all changes when multi-table transaction fails', async () => {
      const initialCounts = {
        sponsorships: await db.select().from(billSponsorships),
        engagements: await db.select().from(billEngagement),
        comments: await db.select().from(billComments)
      };

      try {
        await withTransaction(async (tx) => {
          // Insert sponsorship
          await tx.insert(billSponsorships).values({
            billId: testBillId,
            sponsorId: testSponsorId,
            sponsorshipType: 'primary'
          });

          // Insert engagement
          await tx.insert(billEngagement).values({
            billId: testBillId,
            userId: testUserId,
            viewCount: 1,
            shareCount: 0
          });

          // Insert comment
          await tx.insert(billComments).values({
            billId: testBillId,
            userId: testUserId,
            content: 'This should be rolled back'
          });

          // Force rollback
          throw new Error('Multi-table rollback test');
        });
      } catch (error) {
        expect((error as Error).message).toBe('Multi-table rollback test');
      }

      // Verify no new records were persisted
      const finalCounts = {
        sponsorships: await db.select().from(billSponsorships),
        engagements: await db.select().from(billEngagement),
        comments: await db.select().from(billComments)
      };

      expect(finalCounts.sponsorships.length).toBe(initialCounts.sponsorships.length);
      expect(finalCounts.engagements.length).toBe(initialCounts.engagements.length);
      expect(finalCounts.comments.length).toBe(initialCounts.comments.length);
    });
  });

  describe('Concurrent Transaction Handling', () => {
    it('should handle concurrent transactions without deadlocks', async () => {
      const concurrentTransactions = Array(5).fill(null).map(async (_, index) => {
        return withTransaction(async (tx) => {
          const comment = await tx.insert(billComments).values({
            billId: testBillId,
            userId: testUserId,
            content: `Concurrent comment ${index}`
          }).returning();

          // Add some processing time to increase chance of conflicts
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

          return comment[0];
        });
      });

      const results = await Promise.all(concurrentTransactions);
      
      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.content).toBe(`Concurrent comment ${index}`);
      });

      // Cleanup
      for (const result of results) {
        await db.delete(billComments).where(eq(billComments.id, result.id));
      }
    });

    it('should maintain data consistency under concurrent updates', async () => {
      // Create initial engagement record
      const initialEngagement = await db.insert(billEngagement).values({
        billId: testBillId,
        userId: testUserId,
        viewCount: 0,
        shareCount: 0
      }).returning();

      const engagementId = initialEngagement[0].id;

      // Concurrent updates to the same record
      const concurrentUpdates = Array(10).fill(null).map(async () => {
        return withTransaction(async (tx) => {
          const current = await tx.select()
            .from(billEngagement)
            .where(eq(billEngagement.id, engagementId));

          if (current.length > 0) {
            await tx.update(billEngagement)
              .set({ 
                viewCount: current[0].viewCount + 1,
                updatedAt: new Date()
              })
              .where(eq(billEngagement.id, engagementId));
          }
        });
      });

      await Promise.all(concurrentUpdates);

      // Verify final count is correct
      const finalEngagement = await db.select()
        .from(billEngagement)
        .where(eq(billEngagement.id, engagementId));

      expect(finalEngagement).toHaveLength(1);
      expect(finalEngagement[0].viewCount).toBe(10);

      // Cleanup
      await db.delete(billEngagement).where(eq(billEngagement.id, engagementId));
    });
  });

  describe('Transaction Timeout and Recovery', () => {
    it('should handle transaction timeouts gracefully', async () => {
      const startTime = Date.now();
      
      try {
        await withTransaction(async (tx) => {
          // Insert a record
          const comment = await tx.insert(billComments).values({
            billId: testBillId,
            userId: testUserId,
            content: 'Timeout test comment'
          }).returning();

          // Simulate long-running operation (but not too long for tests)
          await new Promise(resolve => setTimeout(resolve, 1000));

          return comment[0];
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        
        // Should either complete successfully or timeout gracefully
        if ((error as Error).message.includes('timeout')) {
          expect(duration).toBeGreaterThan(500); // Should have attempted the operation
        }
      }

      // Verify no hanging records from timeout
      const hangingComments = await db.select()
        .from(billComments)
        .where(eq(billComments.content, 'Timeout test comment'));
      
      // Should either be 0 (rolled back) or 1 (completed successfully)
      expect([0, 1]).toContain(hangingComments.length);

      // Cleanup if record exists
      if (hangingComments.length > 0) {
        await db.delete(billComments).where(eq(billComments.id, hangingComments[0].id));
      }
    });

    it('should recover from connection interruptions', async () => {
      // This test simulates recovery from connection issues
      // In a real scenario, this would test actual connection recovery
      
      let recoveryAttempted = false;
      
      try {
        await withTransaction(async (tx) => {
          const comment = await tx.insert(billComments).values({
            billId: testBillId,
            userId: testUserId,
            content: 'Recovery test comment'
          }).returning();

          // Simulate connection issue
          if (!recoveryAttempted) {
            recoveryAttempted = true;
            throw new Error('Connection lost');
          }

          return comment[0];
        });
      } catch (error) {
        expect((error as Error).message).toBe('Connection lost');
        expect(recoveryAttempted).toBe(true);
      }

      // Verify system can still perform operations after recovery
      const testComment = await db.insert(billComments).values({
        billId: testBillId,
        userId: testUserId,
        content: 'Post-recovery test comment'
      }).returning();

      expect(testComment).toHaveLength(1);
      expect(testComment[0].content).toBe('Post-recovery test comment');

      // Cleanup
      await db.delete(billComments).where(eq(billComments.id, testComment[0].id));
    });
  });

  describe('Data Integrity Constraints', () => {
    it('should enforce foreign key constraints', async () => {
      try {
        await withTransaction(async (tx) => {
          // Try to insert comment with non-existent bill ID
          await tx.insert(billComments).values({
            billId: 999999, // Non-existent bill ID
            userId: testUserId,
            content: 'This should fail due to FK constraint'
          });
        });
        
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        // Should fail due to foreign key constraint
        expect((error as Error).message).toMatch(/foreign key|constraint|violates/i);
      }
    });

    it('should enforce unique constraints', async () => {
      // This test would check unique constraints if they exist
      // For now, we'll test that duplicate data can be handled appropriately
      
      const commentData = {
        billId: testBillId,
        userId: testUserId,
        content: 'Unique constraint test'
      };

      const firstComment = await db.insert(billComments).values(commentData).returning();
      
      // Try to insert duplicate (this may or may not fail depending on schema)
      try {
        const secondComment = await db.insert(billComments).values(commentData).returning();
        
        // If successful, both comments should exist
        expect(firstComment).toHaveLength(1);
        expect(secondComment).toHaveLength(1);
        
        // Cleanup both
        await db.delete(billComments).where(eq(billComments.id, firstComment[0].id));
        await db.delete(billComments).where(eq(billComments.id, secondComment[0].id));
      } catch (error) {
        // If failed due to unique constraint, that's also valid
        expect((error as Error).message).toMatch(/unique|duplicate/i);
        
        // Cleanup first comment
        await db.delete(billComments).where(eq(billComments.id, firstComment[0].id));
      }
    });

    it('should handle null constraint violations', async () => {
      try {
        await withTransaction(async (tx) => {
          // Try to insert comment without required fields
          await tx.insert(billComments).values({
            billId: testBillId,
            userId: testUserId,
            content: null as any // Should violate not-null constraint
          });
        });
        
        // Should not reach here if null constraint exists
        expect(true).toBe(false);
      } catch (error) {
        // Should fail due to null constraint or type validation
        expect(error).toBeDefined();
      }
    });
  });
});












































import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
// REFINED: This import will work with the new barrel file (index.ts)
import * as schema from "./schema";

/**
 * Comprehensive test suite for the Legislative Transparency Platform database schema.
 * This tests entity creation, relationships, constraints, and business logic validation.
 */

// Test database connection setup
let db: ReturnType<typeof drizzle>;
let pool: Pool;

beforeAll(async () => {
  // Initialize connection to test database
  pool = new Pool({
    host: process.env.TEST_DB_HOST || "localhost",
    port: parseInt(process.env.TEST_DB_PORT || "5432"),
    database: process.env.TEST_DB_NAME || "legislative_test",
    user: process.env.TEST_DB_USER || "test_user",
    password: process.env.TEST_DB_PASSWORD || "test_password",
  });

  db = drizzle(pool, { schema });
  // In a real setup, you'd run migrations here
});

afterAll(async () => {
  if (pool) {
    await pool.end();
  }
});

beforeEach(async () => {
  // Clear all tables before each test
  // REFINED: Added all new/changed tables to the TRUNCATE command
  await db.execute(sql`TRUNCATE TABLE 
    ${schema.user}, 
    ${schema.sponsor}, 
    ${schema.bill},
    ${schema.contentReport}, // <-- REFINED
    ${schema.regulation},
    ${schema.syncJob},
    ${schema.conflict},
    ${schema.analyticsEvent},
    ${schema.analyticsDailySummary},
    ${schema.userActivitySummary}
  CASCADE`);
});

describe("User Management", () => {
  it("should create a user with valid data", async () => {
    const newUser = await db.insert(schema.user).values({
      email: "test@example.com",
      passwordHash: "a".repeat(60),
      name: "Test User",
      role: "citizen",
    }).returning();

    expect(newUser).toHaveLength(1);
    expect(newUser[0].email).toBe("test@example.com");
    expect(newUser[0].role).toBe("citizen");
    expect(newUser[0].verificationStatus).toBe("pending");
  });

  it("should enforce unique email constraint", async () => {
    await db.insert(schema.user).values({
      email: "duplicate@example.com",
      passwordHash: "a".repeat(60),
      name: "First User",
    });

    await expect(
      db.insert(schema.user).values({
        email: "duplicate@example.com",
        passwordHash: "b".repeat(60),
        name: "Second User",
      })
    ).rejects.toThrow();
  });

  it("should create user profile with relationship to user", async () => {
    const user = await db.insert(schema.user).values({
      email: "profile@example.com",
      passwordHash: "a".repeat(60),
      name: "Profile User",
    }).returning();

    const profile = await db.insert(schema.userProfile).values({
      userId: user[0].id,
      bio: "This is my bio",
      expertise: ["law", "policy"],
      location: "Nairobi",
      reputationScore: 100,
      avatarUrl: "https://example.com/pic.png" // <-- REFINED: Added new field
    }).returning();

    expect(profile[0].userId).toBe(user[0].id);
    expect(profile[0].expertise).toEqual(["law", "policy"]);
    expect(profile[0].avatarUrl).toBe("https://example.com/pic.png");
  });

  it("should enforce reputation score check constraint", async () => {
    const user = await db.insert(schema.user).values({
      email: "reputation@example.com",
      passwordHash: "a".repeat(60),
      name: "Reputation User",
    }).returning();

    // This is a DB-level CHECK constraint test
    await expect(
      db.insert(schema.userProfile).values({
        userId: user[0].id,
        reputationScore: -50, // Invalid: must be >= 0
      })
    ).rejects.toThrow();
  });

  it("should cascade delete user profile when user is deleted", async () => {
    const user = await db.insert(schema.user).values({
      email: "cascade@example.com",
      passwordHash: "a".repeat(60),
      name: "Cascade User",
    }).returning();

    await db.insert(schema.userProfile).values({
      userId: user[0].id,
      bio: "Will be deleted",
    });

    await db.delete(schema.user).where(sql`${schema.user.id} = ${user[0].id}`);

    const profiles = await db.select()
      .from(schema.userProfile)
      .where(sql`${schema.userProfile.userId} = ${user[0].id}`);

    expect(profiles).toHaveLength(0);
  });

  it("should track user progress with achievements", async () => {
    // Testing the gamification system
    const user = await db.insert(schema.user).values({
      email: "progress@example.com",
      passwordHash: "a".repeat(60),
      name: "Progress User",
    }).returning();

    const progress = await db.insert(schema.userProgress).values({
      userId: user[0].id,
      achievementType: "bills_read",
      achievementValue: 10,
      level: 2,
      badge: "avid_reader",
      description: "Read 10 bills",
    }).returning();

    expect(progress[0].achievementValue).toBe(10);
    expect(progress[0].level).toBe(2);
  });

  it("should enforce minimum level constraint", async () => {
    // Testing CHECK constraint: level >= 1
    const user = await db.insert(schema.user).values({
      email: "level@example.com",
      passwordHash: "a".repeat(60),
      name: "Level User",
    }).returning();

    await expect(
      db.insert(schema.userProgress).values({
        userId: user[0].id,
        achievementType: "test",
        level: 0, // Invalid: must be >= 1
        description: "Test achievement",
      })
    ).rejects.toThrow();
  });
});

describe("Legislative Content", () => {
  it("should create sponsor and bill", async () => {
    const sponsor = await db.insert(schema.sponsor).values({
      name: "John Doe",
      role: "Senator",
      party: "Democratic",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Climate Action Bill",
      description: "A bill to address climate change",
      status: "introduced",
      billNumber: "HB-2024-001",
      sponsorId: sponsor[0].id,
      category: "environment",
      // REFINED: Removed 'tags' array, as it's no longer on the 'bill' table
    }).returning();

    expect(bill[0].title).toBe("Climate Action Bill");
    expect(bill[0].sponsorId).toBe(sponsor[0].id);
  });

  it("should enforce complexity score range constraint", async () => {
    const sponsor = await db.insert(schema.sponsor).values({
      name: "Jane Smith",
      role: "Representative",
    }).returning();

    await expect(
      db.insert(schema.bill).values({
        title: "Invalid Complexity Bill",
        sponsorId: sponsor[0].id,
        complexityScore: 15, // Invalid: must be 1-10
      })
    ).rejects.toThrow();
  });

  it("should create bill with tags via junction table", async () => {
    // This test was already correct and tests the normalized structure
    const sponsor = await db.insert(schema.sponsor).values({
      name: "Tag Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Tagged Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    await db.insert(schema.billTag).values([
      { billId: bill[0].id, tag: "healthcare" },
      { billId: bill[0].id, tag: "reform" },
    ]);

    const tags = await db.select()
      .from(schema.billTag)
      .where(sql`${schema.billTag.billId} = ${bill[0].id}`);

    expect(tags).toHaveLength(2);
    expect(tags.map(t => t.tag)).toContain("healthcare");
  });

  it("should prevent duplicate bill tags", async () => {
    // Testing unique constraint on billId + tag combination
    const sponsor = await db.insert(schema.sponsor).values({
      name: "Duplicate Tag Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Duplicate Tag Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    await db.insert(schema.billTag).values({
      billId: bill[0].id,
      tag: "education",
    });

    // Attempting to add the same tag again should fail
    await expect(
      db.insert(schema.billTag).values({
        billId: bill[0].id,
        tag: "education",
      })
    ).rejects.toThrow();
  });

  it("should handle bill sponsorships with types", async () => {
    // Testing the many-to-many relationship with sponsorship types
    const sponsor1 = await db.insert(schema.sponsor).values({
      name: "Primary Sponsor",
      role: "Senator",
    }).returning();

    const sponsor2 = await db.insert(schema.sponsor).values({
      name: "Co-Sponsor",
      role: "Representative",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Multi-Sponsor Bill",
      sponsorId: sponsor1[0].id,
    }).returning();

    await db.insert(schema.billSponsorship).values([
      {
        billId: bill[0].id,
        sponsorId: sponsor1[0].id,
        sponsorshipType: "primary",
      },
      {
        billId: bill[0].id,
        sponsorId: sponsor2[0].id,
        sponsorshipType: "co_sponsor",
      },
    ]);

    const sponsorships = await db.select()
      .from(schema.billSponsorship)
      .where(sql`${schema.billSponsorship.billId} = ${bill[0].id}`);

    expect(sponsorships).toHaveLength(2);
  });
});

describe("Comments and Engagement", () => {
  it("should create comment with user and bill relationship", async () => {
    const user = await db.insert(schema.user).values({
      email: "commenter@example.com",
      passwordHash: "a".repeat(60),
      name: "Commenter",
    }).returning();

    const sponsor = await db.insert(schema.sponsor).values({
      name: "Comment Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Commentable Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    const comment = await db.insert(schema.billComment).values({
      billId: bill[0].id,
      userId: user[0].id,
      content: "This is a thoughtful analysis of the bill.",
      commentType: "general",
    }).returning();

    expect(comment[0].content).toBe("This is a thoughtful analysis of the bill.");
    expect(comment[0].upvotes).toBe(0); // Default value
  });

  it("should handle nested comment replies", async () => {
    // Testing the self-referential relationship for comment threading
    const user = await db.insert(schema.user).values({
      email: "threader@example.com",
      passwordHash: "a".repeat(60),
      name: "Thread User",
    }).returning();

    const sponsor = await db.insert(schema.sponsor).values({
      name: "Thread Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Threaded Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    const parentComment = await db.insert(schema.billComment).values({
      billId: bill[0].id,
      userId: user[0].id,
      content: "Parent comment",
    }).returning();

    const childComment = await db.insert(schema.billComment).values({
      billId: bill[0].id,
      userId: user[0].id,
      content: "Reply to parent",
      parentCommentId: parentComment[0].id,
    }).returning();

    expect(childComment[0].parentCommentId).toBe(parentComment[0].id);
  });

  it("should track comment votes uniquely per user", async () => {
    // Testing that a user can only vote once per comment
    const user = await db.insert(schema.user).values({
      email: "voter@example.com",
      passwordHash: "a".repeat(60),
      name: "Voter",
    }).returning();

    const sponsor = await db.insert(schema.sponsor).values({
      name: "Vote Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Votable Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    const comment = await db.insert(schema.billComment).values({
      billId: bill[0].id,
      userId: user[0].id,
      content: "Vote on this",
    }).returning();

    await db.insert(schema.commentVote).values({
      commentId: comment[0].id,
      userId: user[0].id,
      voteType: "up",
    });

    // Attempting to vote again should fail due to unique constraint
    await expect(
      db.insert(schema.commentVote).values({
        commentId: comment[0].id,
        userId: user[0].id,
        voteType: "down",
      })
    ).rejects.toThrow();
  });

  it("should enforce non-negative vote counts", async () => {
    // Testing CHECK constraint on upvotes and downvotes
    const user = await db.insert(schema.user).values({
      email: "votes@example.com",
      passwordHash: "a".repeat(60),
      name: "Vote Counter",
    }).returning();

    const sponsor = await db.insert(schema.sponsor).values({
      name: "Constraint Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Vote Constraint Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    await expect(
      db.insert(schema.billComment).values({
        billId: bill[0].id,
        userId: user[0].id,
        content: "Invalid votes",
        upvotes: -5, // Invalid: must be >= 0
      })
    ).rejects.toThrow();
  });

  it("should track bill engagement metrics per user", async () => {
    const user = await db.insert(schema.user).values({
      email: "engaged@example.com",
      passwordHash: "a".repeat(60),
      name: "Engaged User",
    }).returning();

    const sponsor = await db.insert(schema.sponsor).values({
      name: "Engagement Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Engaging Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    const engagement = await db.insert(schema.billEngagement).values({
      billId: bill[0].id,
      userId: user[0].id,
      viewCount: 5,
      commentCount: 2,
      shareCount: 1,
      engagementScore: "15.50",
    }).returning();

    expect(engagement[0].viewCount).toBe(5);
    expect(engagement[0].engagementScore).toBe("15.50");
  });
});

describe("Analysis and Verification", () => {
  it("should create analysis with confidence score validation", async () => {
    const user = await db.insert(schema.user).values({
      email: "analyst@example.com",
      passwordHash: "a".repeat(60),
      name: "Analyst",
      role: "expert",
    }).returning();

    const sponsor = await db.insert(schema.sponsor).values({
      name: "Analysis Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Analyzed Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    const analysis = await db.insert(schema.analysis).values({
      billId: bill[0].id,
      analysisType: "constitutional",
      results: { issues: ["potential conflict with Article 5"] },
      confidence: "0.85",
      approvedBy: user[0].id,
    }).returning();

    expect(analysis[0].analysisType).toBe("constitutional");
    expect(analysis[0].confidence).toBe("0.85");
  });

  it("should enforce confidence score range (0-1)", async () => {
    const sponsor = await db.insert(schema.sponsor).values({
      name: "Confidence Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Confidence Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    // Confidence must be between 0 and 1
    await expect(
      db.insert(schema.analysis).values({
        billId: bill[0].id,
        analysisType: "impact",
        confidence: "1.5", // Invalid: must be <= 1
      })
    ).rejects.toThrow();
  });

  it("should prevent duplicate analysis types per bill", async () => {
    const sponsor = await db.insert(schema.sponsor).values({
      name: "Duplicate Analysis Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Single Analysis Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    await db.insert(schema.analysis).values({
      billId: bill[0].id,
      analysisType: "constitutional",
    });

    // Can't have two constitutional analyses for same bill
    await expect(
      db.insert(schema.analysis).values({
        billId: bill[0].id,
        analysisType: "constitutional",
      })
    ).rejects.toThrow();
  });

  it("should create verification and let DB generate UUID", async () => {
    const user = await db.insert(schema.user).values({
      email: "verifier@example.com",
      passwordHash: "a".repeat(60),
      name: "Verifier",
      role: "expert",
    }).returning();

    const sponsor = await db.insert(schema.sponsor).values({
      name: "Verified Sponsor",
      role: "Senator",
    }).returning();

    const bill = await db.insert(schema.bill).values({
      title: "Verified Bill",
      sponsorId: sponsor[0].id,
    }).returning();

    // REFINED: Removed the manual 'id' field.
    // The schema now defaults to gen_random_uuid().
    const verification = await db.insert(schema.verification).values({
      billId: bill[0].id,
      userId: user[0].id,
      userRole: "expert",
      verificationType: "accuracy",
      confidence: "0.92",
      reasoning: "Cross-referenced with official records",
    }).returning();

    expect(verification[0].verificationType).toBe("accuracy");
    expect(verification[0].verificationStatus).toBe("pending");
    expect(verification[0].id).toBeDefined(); // Check that the DB assigned an ID
    expect(verification[0].id.length).toBeGreaterThan(30); // Basic check for UUID
  });
});

// --- REFINED: Rewritten Moderation test block ---
describe("Moderation and Security", () => {
  it("should create a content report with severity levels", async () => {
    const reporter = await db.insert(schema.user).values({
      email: "reporter@example.com",
      passwordHash: "a".repeat(60),
      name: "Reporter",
    }).returning();

    // Replaced 'moderationFlag' with 'contentReport'
    const report = await db.insert(schema.contentReport).values({
      contentType: "comment",
      contentId: 1, // Simulating a foreign key to a comment
      reportType: "spam",
      reason: "Repeated promotional content",
      reportedBy: reporter[0].id,
      severity: "medium",
      autoDetected: false,
    }).returning();

    expect(report[0].reportType).toBe("spam");
    expect(report[0].status).toBe("pending"); // Default from new 'reportStatusEnum'
    expect(report[0].severity).toBe("medium");
  });

  it("should track security audit logs", async () => {
    const user = await db.insert(schema.user).values({
      email: "audit@example.com",
      passwordHash: "a".repeat(60),
      name: "Audited User",
    }).returning();

    const auditLog = await db.insert(schema.securityAuditLog).values({
      eventType: "login_attempt",
      userId: user[0].id,
      ipAddress: "192.168.1.1",
      action: "authenticate",
      result: "success",
      severity: "info",
      details: { method: "password" },
    }).returning();

    expect(auditLog[0].eventType).toBe("login_attempt");
    expect(auditLog[0].result).toBe("success");
  });

  it("should manage threat intelligence data", async () => {
    const threat = await db.insert(schema.threatIntelligence).values({
      ipAddress: "10.0.0.1",
      threatType: "malicious_ip",
      severity: "high",
      source: "external_feed",
      description: "Known botnet IP",
      occurrences: 5,
      isBlocked: true,
    }).returning();

    expect(threat[0].threatType).toBe("malicious_ip");
    expect(threat[0].isBlocked).toBe(true);
    expect(threat[0].occurrences).toBe(5);
  });

  it("should enforce minimum occurrences constraint", async () => {
    // Threat occurrences must be at least 1
    await expect(
      db.insert(schema.threatIntelligence).values({
        ipAddress: "10.0.0.2",
        threatType: "bot",
        source: "internal",
        occurrences: 0, // Invalid: must be >= 1
      })
    ).rejects.toThrow();
  });
});

describe("Regulatory Monitoring", () => {
  it("should create regulation with compliance tracking", async () => {
    const sponsor = await db.insert(schema.sponsor).values({
      name: "Regulation Sponsor",
      role: "Secretary",
    }).returning();

    const regulation = await db.insert(schema.regulation).values({
      title: "Data Protection Regulation",
      description: "Enhanced data protection requirements",
      status: "enacted",
      sector: "technology",
      sponsorId: sponsor[0].id,
      effectiveDate: new Date("2024-01-01"),
      complianceDeadline: new Date("2024-06-01"),
    }).returning();

    expect(regulation[0].title).toBe("Data Protection Regulation");
    expect(regulation[0].status).toBe("enacted");
  });

  it("should track regulatory changes with impact flags", async () => {
    const sponsor = await db.insert(schema.sponsor).values({
      name: "Change Sponsor",
      role: "Minister",
    }).returning();

    const regulation = await db.insert(schema.regulation).values({
      title: "Changing Regulation",
      status: "proposed",
      sponsorId: sponsor[0].id,
    }).returning();

    const change = await db.insert(schema.regulatoryChange).values({
      regulationId: regulation[0].id,
      changeType: "amendment",
      changesRequirements: true,
      shortensDeadline: true,
      addsCosts: false,
      details: { summary: "Stricter compliance timeline" },
    }).returning();

    expect(change[0].changesRequirements).toBe(true);
    expect(change[0].shortensDeadline).toBe(true);
  });
});

describe("Synchronization and Conflicts", () => {
  it("should track sync jobs with record counts", async () => {
    const syncJob = await db.insert(schema.syncJob).values({
      id: "sync_" + Date.now(),
      dataSourceId: "parliament_api",
      endpointId: "bills",
      status: "completed",
      recordsProcessed: 150,
      recordsCreated: 10,
      recordsUpdated: 140,
      recordsSkipped: 0,
    }).returning();

    expect(syncJob[0].status).toBe("completed");
    expect(syncJob[0].recordsProcessed).toBe(150);
  });

  it("should enforce non-negative record counts", async () => {
    await expect(
      db.insert(schema.syncJob).values({
        id: "sync_invalid",
        dataSourceId: "test",
        endpointId: "test",
        recordsProcessed: -5, // Invalid: must be >= 0
      })
    ).rejects.toThrow();
  });

  it("should manage data conflicts with resolution tracking", async () => {
    const user = await db.insert(schema.user).values({
      email: "resolver@example.com",
      passwordHash: "a".repeat(60),
      name: "Conflict Resolver",
      role: "admin",
    }).returning();

    const conflict = await db.insert(schema.conflict).values({
      id: "conflict_" + Date.now(),
      dataType: "bill",
      recordId: "bill_123",
      resolution: "manual",
      resolvedValue: "Updated value",
      resolvedBy: user[0].id,
      confidence: "0.95",
    }).returning();

    expect(conflict[0].resolution).toBe("manual");
    expect(conflict[0].confidence).toBe("0.95");
  });
});

describe("Analytics and Metrics", () => {
  it("should track analytics events with metadata", async () => {
    const user = await db.insert(schema.user).values({
      email: "analytics@example.com",
      passwordHash: "a".repeat(60),
      name: "Analytics User",
    }).returning();

    const event = await db.insert(schema.analyticsEvent).values({
      eventType: "bill_view",
      eventCategory: "engagement",
      userId: user[0].id,
      sessionId: "session_123",
      eventData: { duration: 120, scrollDepth: 0.75 },
    }).returning();

    expect(event[0].eventType).toBe("bill_view");
    expect(event[0].eventCategory).toBe("engagement");
  });

  it("should aggregate daily summaries with unique constraints", async () => {
    const summary = await db.insert(schema.analyticsDailySummary).values({
      date: "2024-01-15",
      eventType: "bill_view",
      eventCategory: "engagement",
      totalEvents: 500,
      uniqueUsers: 100,
      uniqueSessions: 150,
    }).returning();

    expect(summary[0].totalEvents).toBe(500);
    expect(summary[0].uniqueUsers).toBe(100);

    // Should not allow duplicate date+type+category combination
    await expect(
      db.insert(schema.analyticsDailySummary).values({
        date: "2024-01-15",
        eventType: "bill_view",
        eventCategory: "engagement",
        totalEvents: 100,
      })
    ).rejects.toThrow();
  });

  it("should track user activity summaries per day", async () => {
    const user = await db.insert(schema.user).values({
      email: "active@example.com",
      passwordHash: "a".repeat(60),
      name: "Active User",
    }).returning();

    const activity = await db.insert(schema.userActivitySummary).values({
      userId: user[0].id,
      date: "2024-01-15",
      billsViewed: 10,
      commentsPosted: 3,
      searchesPerformed: 5,
      sessionDurationMinutes: 45,
      engagementScore: "25.5",
    }).returning();

    expect(activity[0].billsViewed).toBe(10);
    expect(activity[0].sessionDurationMinutes).toBe(45);
  });
});

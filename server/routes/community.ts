
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db, bills, billComments, users, userProfiles, isDatabaseConnected } from "../db";
import { eq, desc, and, sql, count } from "drizzle-orm";

const app = new Hono();

// Input schemas
const createCommentSchema = z.object({
  billId: z.string(),
  content: z.string().min(10).max(2000),
  expertise: z.string().optional(),
  section: z.string().optional(),
  parentId: z.string().optional(),
});

const createPollSchema = z.object({
  billId: z.string(),
  question: z.string().min(5).max(200),
  options: z.array(z.string()).min(2).max(6),
  section: z.string().optional(),
});

const voteSchema = z.object({
  type: z.enum(['up', 'down']),
});

const pollVoteSchema = z.object({
  optionIndex: z.number().min(0),
});

// Sample community data for fallback
const sampleComments = [
  {
    id: "1",
    billId: "1",
    userId: "user1",
    username: "Dr. Amina Hassan",
    userInitials: "AH",
    expertise: "Constitutional Law",
    content: "This bill raises several constitutional concerns regarding the separation of powers. The proposed amendments to Article 94 could potentially undermine Parliament's legislative authority by giving excessive discretionary powers to the executive branch.",
    createdAt: new Date("2024-01-18T10:30:00Z"),
    upvotes: 23,
    downvotes: 2,
    endorsements: 8,
    verifiedClaims: 3,
    isHighlighted: true,
    replies: []
  },
  {
    id: "2", 
    billId: "1",
    userId: "user2",
    username: "James Kiprotich",
    userInitials: "JK",
    expertise: "Digital Rights Advocate",
    content: "From a digital rights perspective, Section 15 of this bill is particularly concerning. The broad definition of 'digital platforms' could inadvertently capture small-scale online businesses and community forums, potentially stifling innovation and free expression.",
    createdAt: new Date("2024-01-19T14:15:00Z"),
    upvotes: 18,
    downvotes: 1,
    endorsements: 12,
    verifiedClaims: 2,
    isHighlighted: false,
    replies: []
  }
];

const samplePolls = [
  {
    id: "1",
    billId: "1",
    question: "Should the data protection provisions apply to all businesses or only those with over 1000 users?",
    options: [
      { text: "All businesses", votes: 156 },
      { text: "Only large businesses (1000+ users)", votes: 89 },
      { text: "Tiered approach based on business size", votes: 234 },
      { text: "Only tech companies", votes: 23 }
    ],
    totalVotes: 502,
    userVote: undefined
  }
];

// Community input endpoints
app.get("/comments/:billId", async (c) => {
  try {
    const billId = c.req.param("billId");
    const sort = c.req.query("sort") || "recent";
    const expert = c.req.query("expert") === "true";
    const section = c.req.query("section");

    if (!isDatabaseConnected) {
      let filteredComments = sampleComments.filter(comment => comment.billId === billId);
      
      if (expert) {
        filteredComments = filteredComments.filter(comment => comment.expertise);
      }
      
      if (section) {
        // In a real implementation, this would filter by section
      }

      // Sort comments
      switch (sort) {
        case "popular":
          filteredComments.sort((a, b) => (b.upvotes + b.endorsements) - (a.upvotes + a.endorsements));
          break;
        case "verified":
          filteredComments.sort((a, b) => b.verifiedClaims - a.verifiedClaims);
          break;
        default: // recent
          filteredComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      return c.json(filteredComments);
    }

    // Database implementation would go here
    const comments = await db.select().from(billComments)
      .where(eq(billComments.billId, parseInt(billId)))
      .orderBy(desc(billComments.createdAt));

    return c.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return c.json({ error: "Failed to fetch comments" }, 500);
  }
});

app.post("/comments", zValidator("json", createCommentSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    
    if (!isDatabaseConnected) {
      // In sample mode, just return success
      return c.json({ success: true, id: Date.now().toString() });
    }

    // Database implementation
    const [comment] = await db.insert(billComments).values({
      billId: parseInt(data.billId),
      userId: "current-user-id", // This would come from auth
      content: data.content,
      commentType: data.expertise ? "expert_analysis" : "general",
    }).returning();

    return c.json({ success: true, comment });
  } catch (error) {
    console.error("Error creating comment:", error);
    return c.json({ error: "Failed to create comment" }, 500);
  }
});

app.post("/polls", zValidator("json", createPollSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    
    // For now, return success - real implementation would save to database
    return c.json({ success: true, id: Date.now().toString() });
  } catch (error) {
    console.error("Error creating poll:", error);
    return c.json({ error: "Failed to create poll" }, 500);
  }
});

app.post("/comments/:id/vote", zValidator("json", voteSchema), async (c) => {
  try {
    const commentId = c.req.param("id");
    const { type } = c.req.valid("json");
    
    // For now, return success - real implementation would update vote counts
    return c.json({ success: true });
  } catch (error) {
    console.error("Error voting on comment:", error);
    return c.json({ error: "Failed to vote" }, 500);
  }
});

app.post("/comments/:id/poll-vote", zValidator("json", pollVoteSchema), async (c) => {
  try {
    const commentId = c.req.param("id");
    const { optionIndex } = c.req.valid("json");
    
    // For now, return success - real implementation would update poll votes
    return c.json({ success: true });
  } catch (error) {
    console.error("Error voting on poll:", error);
    return c.json({ error: "Failed to vote on poll" }, 500);
  }
});

app.post("/comments/:id/highlight", async (c) => {
  try {
    const commentId = c.req.param("id");
    
    // For now, return success - real implementation would highlight comment
    return c.json({ success: true });
  } catch (error) {
    console.error("Error highlighting comment:", error);
    return c.json({ error: "Failed to highlight comment" }, 500);
  }
});

// Public participation metrics
app.get("/participation/stats", async (c) => {
  try {
    const stats = {
      totalComments: 1247,
      activeParticipants: 892,
      expertContributions: 156,
      verifiedAnalyses: 89,
      communityPolls: 23,
      impactfulFeedback: 67 // Comments that led to bill amendments
    };

    return c.json(stats);
  } catch (error) {
    console.error("Error fetching participation stats:", error);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// Community engagement features
app.get("/engagement/recent", async (c) => {
  try {
    const recentActivity = [
      {
        type: "comment",
        billTitle: "Digital Economy and Data Protection Act 2024",
        contributor: "Dr. Amina Hassan",
        action: "provided constitutional analysis",
        timestamp: new Date("2024-01-19T16:30:00Z"),
        impact: "high"
      },
      {
        type: "poll_created",
        billTitle: "Climate Change Adaptation Fund Bill 2024",
        contributor: "Community Coalition",
        action: "created stakeholder poll",
        timestamp: new Date("2024-01-19T15:45:00Z"),
        impact: "medium"
      }
    ];

    return c.json(recentActivity);
  } catch (error) {
    console.error("Error fetching recent engagement:", error);
    return c.json({ error: "Failed to fetch engagement data" }, 500);
  }
});

export default app;

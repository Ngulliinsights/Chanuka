
import { Router } from "express";
import { z } from "zod";

export const router = Router();

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
router.get("/comments/:billId", async (req, res) => {
  try {
    const billId = req.params.billId;
    const sort = req.query.sort as string || "recent";
    const expert = req.query.expert === "true";
    const section = req.query.section as string;

    // Use sample data for now
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

    res.json(filteredComments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/comments", async (req, res) => {
  try {
    const data = req.body;
    
    // Validate input
    const result = createCommentSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid input", details: result.error });
    }
    
    // In sample mode, just return success
    res.json({ success: true, id: Date.now().toString() });
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

router.post("/polls", async (req, res) => {
  try {
    const data = req.body;
    
    // Validate input
    const result = createPollSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid input", details: result.error });
    }
    
    // For now, return success - real implementation would save to database
    res.json({ success: true, id: Date.now().toString() });
  } catch (error) {
    console.error("Error creating poll:", error);
    res.status(500).json({ error: "Failed to create poll" });
  }
});

router.post("/comments/:id/vote", async (req, res) => {
  try {
    const commentId = req.params.id;
    const data = req.body;
    
    // Validate input
    const result = voteSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid input", details: result.error });
    }
    
    // For now, return success - real implementation would update vote counts
    res.json({ success: true });
  } catch (error) {
    console.error("Error voting on comment:", error);
    res.status(500).json({ error: "Failed to vote" });
  }
});

router.post("/comments/:id/poll-vote", async (req, res) => {
  try {
    const commentId = req.params.id;
    const data = req.body;
    
    // Validate input
    const result = pollVoteSchema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({ error: "Invalid input", details: result.error });
    }
    
    // For now, return success - real implementation would update poll votes
    res.json({ success: true });
  } catch (error) {
    console.error("Error voting on poll:", error);
    res.status(500).json({ error: "Failed to vote on poll" });
  }
});

router.post("/comments/:id/highlight", async (req, res) => {
  try {
    const commentId = req.params.id;
    
    // For now, return success - real implementation would highlight comment
    res.json({ success: true });
  } catch (error) {
    console.error("Error highlighting comment:", error);
    res.status(500).json({ error: "Failed to highlight comment" });
  }
});

// Public participation metrics
router.get("/participation/stats", async (req, res) => {
  try {
    const stats = {
      totalComments: 1247,
      activeParticipants: 892,
      expertContributions: 156,
      verifiedAnalyses: 89,
      communityPolls: 23,
      impactfulFeedback: 67 // Comments that led to bill amendments
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching participation stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Community engagement features
router.get("/engagement/recent", async (req, res) => {
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

    res.json(recentActivity);
  } catch (error) {
    console.error("Error fetching recent engagement:", error);
    res.status(500).json({ error: "Failed to fetch engagement data" });
  }
});

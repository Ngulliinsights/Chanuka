import { Router } from "express";
import { db, bills, billComments, billEngagement, isDatabaseConnected } from "../db";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { z } from "zod";
import { cacheService, CACHE_KEYS, CACHE_TTL } from "../services/cache.js";

export const router = Router();

// Sample data for fallback mode
const sampleBills = [
  {
    id: "1",
    title: "Digital Economy and Data Protection Act 2024",
    summary: "Comprehensive legislation to regulate digital platforms and protect citizen data privacy rights in Kenya.",
    status: "committee_review",
    category: "technology",
    introducedDate: new Date("2024-01-15"),
    priority: "high",
    chamber: "national_assembly",
    sponsor: "Hon. Sarah Mwangi",
    stage: "second_reading",
    lastUpdated: new Date("2024-01-20"),
    fullText: "Full text of the Digital Economy and Data Protection Act...",
    keyProvisions: ["Data protection rights", "Platform accountability", "Digital taxation"],
    estimatedImpact: "Affects 30+ million digital users",
    conflictScore: 85,
    transparencyGrade: "B+"
  },
  {
    id: "2", 
    title: "Climate Change Adaptation Fund Bill 2024",
    summary: "Establishes a national fund for climate adaptation projects and carbon offset programs.",
    status: "first_reading",
    category: "environment",
    introducedDate: new Date("2024-02-01"),
    priority: "high",
    chamber: "senate",
    sponsor: "Hon. James Kimani",
    stage: "first_reading",
    lastUpdated: new Date("2024-02-05"),
    fullText: "Full text of the Climate Change Adaptation Fund Bill...",
    keyProvisions: ["Climate fund establishment", "Carbon offset programs", "Adaptation financing"],
    estimatedImpact: "National climate resilience",
    conflictScore: 45,
    transparencyGrade: "A-"
  }
];

// Get all bills with filtering and pagination
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || "1");
    const limit = parseInt(req.query.limit as string || "10");
    const status = req.query.status as string;
    const category = req.query.category as string;
    const search = req.query.search as string;

    if (!isDatabaseConnected) {
      console.log("Database unavailable, using sample data for demonstration");
      // Filter sample data based on query parameters
      let filteredBills = sampleBills;

      if (status) filteredBills = filteredBills.filter(bill => bill.status === status);
      if (category) filteredBills = filteredBills.filter(bill => bill.category === category);
      if (search) {
        const searchTerm = search.toLowerCase();
        filteredBills = filteredBills.filter(bill => 
          bill.title.toLowerCase().includes(searchTerm) || 
          bill.summary.toLowerCase().includes(searchTerm)
        );
      }

      const offset = (page - 1) * limit;
      const paginatedBills = filteredBills.slice(offset, offset + limit);

      return res.json({
        bills: paginatedBills,
        pagination: {
          page,
          limit,
          total: filteredBills.length,
          pages: Math.ceil(filteredBills.length / limit)
        },
        mode: "sample_data"
      });
    }

    // Create cache key based on query parameters
    const filters = JSON.stringify({ status, category, search, page, limit });
    const cacheKey = CACHE_KEYS.BILL_SEARCH(search || 'all', filters);

    // Use caching for search results
    const searchResults = await cacheService.getOrSet(
      cacheKey,
      async () => {
        const offset = (page - 1) * limit;
        let query = db.select().from(bills);

        // Build optimized query with proper filtering
        const conditions: any[] = [];
        if (status) conditions.push(eq(bills.status, status));
        if (category) conditions.push(eq(bills.category, category));
        if (search) {
          // Optimized search across multiple fields with proper indexing support
          const searchTerm = `%${search}%`;
          conditions.push(sql`(
            ${bills.title} ILIKE ${searchTerm} OR 
            ${bills.summary} ILIKE ${searchTerm} OR 
            ${bills.description} ILIKE ${searchTerm} OR
            ${bills.billNumber} ILIKE ${searchTerm}
          )`);
        }

        // Apply filters to main query
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        // Execute optimized queries in parallel for better performance
        const [result, totalResult] = await Promise.all([
          query
            .limit(limit)
            .offset(offset)
            .orderBy(desc(bills.introducedDate)),
          
          // Optimized count query with same conditions
          db.select({ count: count() })
            .from(bills)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
        ]);

        const total = totalResult[0]?.count || 0;

        return {
          bills: result,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          },
          mode: "database"
        };
      },
      CACHE_TTL.SEARCH_RESULTS
    );

    return res.json(searchResults);
  } catch (error) {
    console.error("Error fetching bills:", error);

    // Fallback to sample data on error
    console.log("Database error, falling back to sample data");
    return res.json({
      bills: sampleBills,
      pagination: {
        page: 1,
        limit: 10,
        total: sampleBills.length,
        pages: 1
      },
      mode: "fallback",
      error: "Database temporarily unavailable"
    });
  }
});

// Get bill categories with caching
router.get("/categories", async (req, res) => {
  try {
    const categories = await cacheService.getOrSet(
      CACHE_KEYS.BILL_CATEGORIES,
      async () => {
        // In a real implementation, this would query the database
        // For now, returning static data but with caching infrastructure
        return [
          { id: "technology", name: "Technology & Digital", count: 15 },
          { id: "environment", name: "Environment & Climate", count: 23 },
          { id: "healthcare", name: "Healthcare & Social", count: 18 },
          { id: "economy", name: "Economy & Finance", count: 31 },
          { id: "education", name: "Education & Training", count: 12 },
          { id: "infrastructure", name: "Infrastructure", count: 19 },
          { id: "governance", name: "Governance & Law", count: 25 }
        ];
      },
      CACHE_TTL.STATIC_DATA
    );

    return res.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get bill statuses with caching
router.get("/statuses", async (req, res) => {
  try {
    const statuses = await cacheService.getOrSet(
      CACHE_KEYS.BILL_STATUSES,
      async () => {
        // In a real implementation, this would query the database
        // For now, returning static data but with caching infrastructure
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
      },
      CACHE_TTL.STATIC_DATA
    );

    return res.json({ statuses });
  } catch (error) {
    console.error("Error fetching statuses:", error);
    return res.status(500).json({ error: "Failed to fetch statuses" });
  }
});

// Get specific bill by ID with caching
router.get("/:id", async (req, res) => {
  try {
    const billId = req.params.id;

    if (!isDatabaseConnected) {
      const sampleBill = sampleBills.find(b => b.id === billId);
      if (!sampleBill) {
        return res.status(404).json({ error: "Bill not found" });
      }
      return res.json({ 
        bill: sampleBill,
        mode: "sample_data"
      });
    }

    // Use caching for bill details with shorter TTL due to dynamic engagement data
    const billData = await cacheService.getOrSet(
      CACHE_KEYS.BILL_DETAIL(parseInt(billId)),
      async () => {
        const [bill] = await db.select().from(bills).where(eq(bills.id, parseInt(billId)));

        if (!bill) {
          return null;
        }

        // Get comprehensive engagement stats with optimized single query
        const [engagementStats] = await db
          .select({
            totalViews: sql<number>`COALESCE(SUM(${billEngagement.viewCount}), 0)`,
            totalComments: sql<number>`COALESCE(SUM(${billEngagement.commentCount}), 0)`,
            totalShares: sql<number>`COALESCE(SUM(${billEngagement.shareCount}), 0)`,
            uniqueViewers: sql<number>`COUNT(DISTINCT ${billEngagement.userId})`,
            totalEngagements: sql<number>`COUNT(${billEngagement.id})`
          })
          .from(billEngagement)
          .where(eq(billEngagement.billId, parseInt(billId)));

        // Get recent comments with user info in single query
        const recentComments = await db
          .select({
            id: billComments.id,
            content: billComments.content,
            commentType: billComments.commentType,
            upvotes: billComments.upvotes,
            downvotes: billComments.downvotes,
            createdAt: billComments.createdAt,
            userId: billComments.userId,
            isVerified: billComments.isVerified
          })
          .from(billComments)
          .where(eq(billComments.billId, parseInt(billId)))
          .orderBy(desc(billComments.createdAt))
          .limit(5);

        return {
          ...bill,
          engagement: engagementStats,
          recentComments
        };
      },
      CACHE_TTL.BILL_DATA
    );

    if (!billData) {
      return res.status(404).json({ error: "Bill not found" });
    }

    return res.json({
      bill: billData,
      mode: "database"
    });
  } catch (error) {
    console.error("Error fetching bill:", error);
    return res.status(500).json({ error: "Failed to fetch bill" });
  }
});

// Get workarounds for a bill
router.get("/:id/workarounds", async (req, res) => {
  try {
    const billId = req.params.id;
    const status = req.query.status as string || 'all';
    const sort = req.query.sort as string || 'popular';

    // Mock data for now - replace with actual database query
    const mockWorkarounds = [
      {
        id: 1,
        title: "Alternative Implementation Timeline",
        description: "Propose a phased implementation approach to reduce immediate compliance burden on small businesses.",
        category: "Compliance",
        priority: "high",
        status: "under_review",
        upvotes: 15,
        downvotes: 3,
        implementationCost: 50000,
        timelineEstimate: 90,
        stakeholderSupport: {
          small_business: "strong",
          labor_unions: "moderate"
        },
        createdAt: new Date(),
        author: {
          name: "Sarah Chen",
          expertise: "Business Policy Analyst"
        }
      }
    ];

    return res.json(mockWorkarounds);
  } catch (error) {
    console.error('Error fetching workarounds:', error);
    return res.status(500).json({ error: 'Failed to fetch workarounds' });
  }
});

// Create a new workaround
router.post("/:id/workarounds", async (req, res) => {
  try {
    const billId = req.params.id;
    const { title, description, category, priority, implementationCost, timelineEstimate } = req.body;

    // Mock response - replace with actual database insert
    const newWorkaround = {
      id: Date.now(),
      title,
      description,
      category,
      priority,
      status: 'proposed',
      upvotes: 0,
      downvotes: 0,
      implementationCost: implementationCost ? parseFloat(implementationCost) : null,
      timelineEstimate: timelineEstimate ? parseInt(timelineEstimate) : null,
      stakeholderSupport: {},
      createdAt: new Date(),
      author: {
        name: 'Current User', // Replace with actual user data
        expertise: 'Community Member'
      }
    };

    return res.status(201).json(newWorkaround);
  } catch (error) {
    console.error('Error creating workaround:', error);
    return res.status(500).json({ error: 'Failed to create workaround' });
  }
});

// Vote on a workaround
router.post('/workarounds/:workaroundId/vote', async (req, res) => {
  try {
    const workaroundId = req.params.workaroundId;
    const { type } = req.body; // 'up' or 'down'

    // Mock response - replace with actual database update
    return res.json({ success: true, message: `Vote ${type} recorded` });
  } catch (error) {
    console.error('Error voting on workaround:', error);
    return res.status(500).json({ error: 'Failed to record vote' });
  }
});
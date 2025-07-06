import { Hono } from "hono";
import { db, bills, billComments, billEngagement, isDatabaseConnected } from "../db";
import { eq, desc, and, sql, count, avg } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const app = new Hono();

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
app.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "10");
    const status = c.req.query("status");
    const category = c.req.query("category");
    const search = c.req.query("search");

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

      return c.json({
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

    const offset = (page - 1) * limit;

    let query = db.select().from(bills);

    // Add filters
    const conditions = [];
    if (status) conditions.push(eq(bills.status, status));
    if (category) conditions.push(eq(bills.category, category));
    if (search) {
      conditions.push(sql`${bills.title} ILIKE ${`%${search}%`} OR ${bills.summary} ILIKE ${`%${search}%`}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const result = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(bills.introducedDate));

    // Get total count for pagination
    const totalQuery = db.select({ count: count() }).from(bills);
    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }
    const [{ count: total }] = await totalQuery;

    return c.json({
      bills: result,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      mode: "database"
    });
  } catch (error) {
    console.error("Error fetching bills:", error);

    // Fallback to sample data on error
    console.log("Database error, falling back to sample data");
    return c.json({
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

// Get bill categories
app.get("/categories", async (c) => {
  const categories = [
    { id: "technology", name: "Technology & Digital", count: 15 },
    { id: "environment", name: "Environment & Climate", count: 23 },
    { id: "healthcare", name: "Healthcare & Social", count: 18 },
    { id: "economy", name: "Economy & Finance", count: 31 },
    { id: "education", name: "Education & Training", count: 12 },
    { id: "infrastructure", name: "Infrastructure", count: 19 },
    { id: "governance", name: "Governance & Law", count: 25 }
  ];

  return c.json({ categories });
});

// Get bill statuses
app.get("/statuses", async (c) => {
  const statuses = [
    { id: "introduced", name: "Introduced", count: 45 },
    { id: "first_reading", name: "First Reading", count: 28 },
    { id: "committee_review", name: "Committee Review", count: 35 },
    { id: "second_reading", name: "Second Reading", count: 22 },
    { id: "third_reading", name: "Third Reading", count: 15 },
    { id: "passed", name: "Passed", count: 67 },
    { id: "rejected", name: "Rejected", count: 8 },
    { id: "withdrawn", name: "Withdrawn", count: 3 }
  ];

  return c.json({ statuses });
});

// Get specific bill by ID
app.get("/:id", async (c) => {
  try {
    const billId = c.req.param("id");

    if (!isDatabaseConnected) {
      const sampleBill = sampleBills.find(b => b.id === billId);
      if (!sampleBill) {
        return c.json({ error: "Bill not found" }, 404);
      }
      return c.json({ 
        bill: sampleBill,
        mode: "sample_data"
      });
    }

    const [bill] = await db.select().from(bills).where(eq(bills.id, billId));

    if (!bill) {
      return c.json({ error: "Bill not found" }, 404);
    }

    // Get engagement stats
    const [engagementStats] = await db
      .select({
        views: count(billEngagement.id),
        avgRating: avg(billEngagement.rating)
      })
      .from(billEngagement)
      .where(eq(billEngagement.billId, billId));

    // Get recent comments
    const recentComments = await db
      .select()
      .from(billComments)
      .where(eq(billComments.billId, billId))
      .orderBy(desc(billComments.createdAt))
      .limit(5);

    return c.json({
      bill: {
        ...bill,
        engagement: engagementStats,
        recentComments
      },
      mode: "database"
    });
  } catch (error) {
    console.error("Error fetching bill:", error);
    return c.json({ error: "Failed to fetch bill" }, 500);
  }
});

// Get workarounds for a bill
app.get("/:id/workarounds", async (c) => {
  try {
    const billId = c.req.param("id");
    const status = c.req.query("status") || 'all';
    const sort = c.req.query("sort") || 'popular';

    // Mock data for now - replace with actual database query
    const mockWorkarounds = [
      {
        id: 1,
        title: 'Phased Implementation Approach',
        description: 'Implement the bill in phases to reduce compliance burden on small businesses while maintaining regulatory effectiveness.',
        category: 'Compliance',
        priority: 'high',
        status: 'approved',
        upvotes: 23,
        downvotes: 3,
        implementationCost: 150000,
        timelineEstimate: 180,
        stakeholderSupport: {
          small_business: 'strong',
          labor_unions: 'moderate',
          government: 'strong'
        },
        createdAt: new Date('2024-01-15'),
        author: {
          name: 'Sarah Johnson',
          expertise: 'Policy Implementation'
        }
      },
      {
        id: 2,
        title: 'Digital Infrastructure Support',
        description: 'Establish digital infrastructure and training programs before full implementation to ensure smooth transition.',
        category: 'Infrastructure',
        priority: 'critical',
        status: 'under_review',
        upvotes: 45,
        downvotes: 7,
        implementationCost: 500000,
        timelineEstimate: 365,
        stakeholderSupport: {
          tech_sector: 'strong',
          rural_communities: 'strong',
          government: 'moderate'
        },
        createdAt: new Date('2024-01-20'),
        author: {
          name: 'Michael Chen',
          expertise: 'Digital Transformation'
        }
      }
    ];

    return c.json(mockWorkarounds);
  } catch (error) {
    console.error('Error fetching workarounds:', error);
    return c.json({ error: 'Failed to fetch workarounds' }, 500);
  }
});

// Create a new workaround
app.post("/:id/workarounds", async (c) => {
  try {
    const billId = c.req.param("id");
    const { title, description, category, priority, implementationCost, timelineEstimate } = await c.req.json();

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

    return c.json(newWorkaround, 201);
  } catch (error) {
    console.error('Error creating workaround:', error);
    return c.json({ error: 'Failed to create workaround' }, 500);
  }
});

// Vote on a workaround
app.post('/workarounds/:workaroundId/vote', async (c) => {
  try {
    const workaroundId = c.req.param("workaroundId");
    const { type } = await c.req.json(); // 'up' or 'down'

    // Mock response - replace with actual database update
    return c.json({ success: true, message: `Vote ${type} recorded` });
  } catch (error) {
    console.error('Error voting on workaround:', error);
    return c.json({ error: 'Failed to record vote' }, 500);
  }
});

export default app;
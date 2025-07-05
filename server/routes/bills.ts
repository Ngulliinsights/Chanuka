import express from 'express';
import { legislativeStorage } from '../storage/legislative-storage';
import { insertBillSchema, insertBillCommentSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

export function setupBillRoutes(app: express.Router) {
  // Get all bills with optional filtering
  app.get('/', async (req, res) => {
    try {
      const { category, status, search } = req.query;
      
      let bills;
      try {
        if (search) {
          bills = await legislativeStorage.searchBills(search as string);
        } else if (category) {
          bills = await legislativeStorage.getBillsByCategory(category as string);
        } else if (status) {
          bills = await legislativeStorage.getBillsByStatus(status as string);
        } else {
          bills = await legislativeStorage.getBills();
        }
      } catch (dbError) {
        console.log('Database unavailable, using sample data for demonstration');
        // Provide sample legislative data that represents typical Kenyan bills
        bills = [
          {
            id: 1,
            billNumber: "HB-001/2024",
            title: "Public Finance Management (Amendment) Bill, 2024",
            description: "A bill to amend the Public Finance Management Act to enhance transparency in public procurement and improve oversight of county government expenditures.",
            status: "committee",
            category: "Governance",
            introducedDate: "2024-01-15T00:00:00.000Z",
            complexityScore: 7,
            tags: ["transparency", "procurement", "county-government"],
            sponsor: "Hon. Jane Kihika",
            urgency: "medium"
          },
          {
            id: 2,
            billNumber: "SB-012/2024", 
            title: "Universal Health Coverage Enhancement Bill, 2024",
            description: "A bill to strengthen the implementation of Universal Health Coverage by improving healthcare infrastructure and ensuring equitable access to quality healthcare services across all counties.",
            status: "introduced",
            category: "Healthcare",
            introducedDate: "2024-02-20T00:00:00.000Z",
            complexityScore: 9,
            tags: ["healthcare", "universal-coverage", "infrastructure"],
            sponsor: "Hon. Dr. James Nyong'o",
            urgency: "high"
          },
          {
            id: 3,
            billNumber: "HB-045/2024",
            title: "Digital Economy and Technology Innovation Bill, 2024", 
            description: "A bill to promote digital innovation, support tech startups, and establish frameworks for digital financial services and cryptocurrency regulation.",
            status: "passed",
            category: "Technology",
            introducedDate: "2023-11-10T00:00:00.000Z",
            complexityScore: 8,
            tags: ["digital-economy", "fintech", "innovation"],
            sponsor: "Hon. Peter Kaluma",
            urgency: "medium"
          },
          {
            id: 4,
            billNumber: "SB-008/2024",
            title: "Climate Change (Amendment) Bill, 2024",
            description: "A bill to enhance Kenya's climate resilience through improved environmental conservation, renewable energy promotion, and adaptation strategies for vulnerable communities.",
            status: "introduced",
            category: "Environment", 
            introducedDate: "2024-03-05T00:00:00.000Z",
            complexityScore: 6,
            tags: ["climate-change", "renewable-energy", "conservation"],
            sponsor: "Hon. Soipan Tuya",
            urgency: "high"
          },
          {
            id: 5,
            billNumber: "HB-023/2024",
            title: "Education Sector Funding Bill, 2024",
            description: "A bill to increase allocation of resources to education, improve teacher welfare, and enhance infrastructure in public schools, particularly in marginalized areas.",
            status: "committee",
            category: "Education",
            introducedDate: "2024-01-30T00:00:00.000Z", 
            complexityScore: 5,
            tags: ["education", "teacher-welfare", "infrastructure"],
            sponsor: "Hon. Ezekiel Machogu",
            urgency: "medium"
          }
        ];

        // Apply filtering to sample data
        if (search) {
          const searchTerm = (search as string).toLowerCase();
          bills = bills.filter(bill => 
            bill.title.toLowerCase().includes(searchTerm) ||
            bill.description.toLowerCase().includes(searchTerm) ||
            bill.billNumber.toLowerCase().includes(searchTerm) ||
            bill.tags.some(tag => tag.toLowerCase().includes(searchTerm))
          );
        }
        if (category && category !== 'all') {
          bills = bills.filter(bill => bill.category === category);
        }
        if (status && status !== 'all') {
          bills = bills.filter(bill => bill.status === status);
        }
      }

      res.json(bills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      res.status(500).json({ error: 'Failed to fetch bills' });
    }
  });

  // Get specific bill with details
  app.get('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid bill ID' });
      }

      try {
        const bill = await legislativeStorage.getBill(id);
        if (!bill) {
          return res.status(404).json({ error: 'Bill not found' });
        }

        // Get additional bill data
        const [sponsors, analysis, conflicts, engagementStats] = await Promise.all([
          legislativeStorage.getBillSponsors(id),
          legislativeStorage.getBillAnalysis(id),
          legislativeStorage.getBillConflicts(id),
          legislativeStorage.getBillEngagementStats(id)
        ]);

        res.json({
          ...bill,
          sponsors,
          analysis,
          conflicts,
          engagementStats
        });
      } catch (dbError) {
        console.log('Database unavailable, providing sample bill data');
        
        // Sample bill data based on the ID
        const sampleBills: Record<number, any> = {
          1: {
            id: 1,
            billNumber: "HB-001/2024",
            title: "Public Finance Management (Amendment) Bill, 2024",
            description: "A bill to amend the Public Finance Management Act to enhance transparency in public procurement and improve oversight of county government expenditures.",
            status: "committee",
            category: "Governance",
            introducedDate: "2024-01-15T00:00:00.000Z",
            complexityScore: 7,
            tags: ["transparency", "procurement", "county-government"],
            sponsor: "Hon. Jane Kihika",
            urgency: "medium",
            fullText: "WHEREAS the Constitution of Kenya under Article 201 requires adherence to principles of openness and accountability in public financial management...",
            sponsors: [
              { id: 1, name: "Hon. Jane Kihika", party: "UDA", role: "Primary Sponsor", constituency: "Nakuru County" }
            ],
            analysis: {
              summary: "This bill strengthens oversight mechanisms for county expenditures and introduces mandatory reporting requirements.",
              constitutionalImplications: "Aligns with Article 201 of the Constitution on public financial management principles.",
              stakeholderImpact: "Primarily benefits taxpayers through improved accountability. May require additional administrative capacity in counties.",
              fiscalImpact: "Estimated implementation cost of KSh 2.5 billion over 3 years."
            },
            conflicts: [],
            engagementStats: {
              views: 1247,
              comments: 23,
              shares: 45,
              bookmarks: 67
            }
          },
          2: {
            id: 2,
            billNumber: "SB-012/2024", 
            title: "Universal Health Coverage Enhancement Bill, 2024",
            description: "A bill to strengthen the implementation of Universal Health Coverage by improving healthcare infrastructure and ensuring equitable access to quality healthcare services across all counties.",
            status: "introduced",
            category: "Healthcare",
            introducedDate: "2024-02-20T00:00:00.000Z",
            complexityScore: 9,
            tags: ["healthcare", "universal-coverage", "infrastructure"],
            sponsor: "Hon. Dr. James Nyong'o",
            urgency: "high",
            fullText: "RECOGNIZING that health is a fundamental human right as enshrined in Article 43 of the Constitution...",
            sponsors: [
              { id: 2, name: "Hon. Dr. James Nyong'o", party: "ODM", role: "Primary Sponsor", constituency: "Kisumu County" }
            ],
            analysis: {
              summary: "Comprehensive healthcare reform focusing on infrastructure development and service delivery improvements.",
              constitutionalImplications: "Directly implements Article 43 constitutional right to healthcare.",
              stakeholderImpact: "Benefits all Kenyans, particularly those in underserved areas. Significant impact on healthcare workers and facilities.",
              fiscalImpact: "Estimated budget requirement of KSh 150 billion over 5 years."
            },
            conflicts: [],
            engagementStats: {
              views: 2156,
              comments: 67,
              shares: 123,
              bookmarks: 89
            }
          }
        };

        const bill = sampleBills[id];
        if (!bill) {
          return res.status(404).json({ error: 'Bill not found' });
        }

        res.json(bill);
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
      res.status(500).json({ error: 'Failed to fetch bill' });
    }
  });

  // Get bill comments
  app.get('/:id/comments', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid bill ID' });
      }

      const comments = await legislativeStorage.getBillComments(id);
      res.json(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });

  // Add comment to bill (requires authentication in real app)
  app.post('/:id/comments', async (req, res) => {
    try {
      const billId = parseInt(req.params.id);
      if (isNaN(billId)) {
        return res.status(400).json({ error: 'Invalid bill ID' });
      }

      // Validate request body
      const commentData = insertBillCommentSchema.parse({
        ...req.body,
        billId
      });

      const comment = await legislativeStorage.createBillComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid comment data', details: error.errors });
      }
      console.error('Error creating comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  });

  // Record bill engagement (view, bookmark, share, etc.)
  app.post('/:id/engagement', async (req, res) => {
    try {
      const billId = parseInt(req.params.id);
      if (isNaN(billId)) {
        return res.status(400).json({ error: 'Invalid bill ID' });
      }

      const { userId, viewCount, commentCount, shareCount } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const engagement = await legislativeStorage.recordBillEngagement({
        billId,
        userId: userId as string,
        viewCount: viewCount || null,
        commentCount: commentCount || null,
        shareCount: shareCount || null,
        engagementScore: "0",
        lastEngaged: new Date(),
        updatedAt: new Date()
      });

      res.status(201).json(engagement);
    } catch (error) {
      console.error('Error recording engagement:', error);
      res.status(500).json({ error: 'Failed to record engagement' });
    }
  });

  // Get bill categories (for filtering)
  app.get('/categories', async (req, res) => {
    try {
      // This would typically come from a database query to get distinct categories
      const categories = [
        'Healthcare',
        'Education', 
        'Economic Development',
        'Infrastructure',
        'Environment',
        'Social Services',
        'Technology',
        'Governance',
        'Security',
        'Agriculture'
      ];
      res.json(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // Get bill statuses (for filtering)
  app.get('/statuses', async (req, res) => {
    try {
      const statuses = [
        'introduced',
        'committee',
        'passed',
        'failed',
        'signed'
      ];
      res.json(statuses);
    } catch (error) {
      console.error('Error fetching statuses:', error);
      res.status(500).json({ error: 'Failed to fetch statuses' });
    }
  });

  // Create new bill (admin only in real app)
  app.post('/', async (req, res) => {
    try {
      const billData = insertBillSchema.parse(req.body);
      const bill = await legislativeStorage.createBill(billData);
      res.status(201).json(bill);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid bill data', details: error.errors });
      }
      console.error('Error creating bill:', error);
      res.status(500).json({ error: 'Failed to create bill' });
    }
  });

  // Update bill (admin only in real app)
  app.put('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid bill ID' });
      }

      const bill = await legislativeStorage.updateBill(id, req.body);
      if (!bill) {
        return res.status(404).json({ error: 'Bill not found' });
      }

      res.json(bill);
    } catch (error) {
      console.error('Error updating bill:', error);
      res.status(500).json({ error: 'Failed to update bill' });
    }
  });
}

// Set up the routes on the router
setupBillRoutes(router);

// Export both the router and setup function for flexibility
export { router };
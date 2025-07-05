import express from 'express';
import { legislativeStorage } from '../storage/legislative-storage';
import { insertBillSchema, insertBillCommentSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

export function setupBillRoutes(app: express.Router) {
  // Get all bills with optional filtering
  app.get('/bills', async (req, res) => {
    try {
      const { category, status, search } = req.query;
      
      let bills;
      if (search) {
        bills = await legislativeStorage.searchBills(search as string);
      } else if (category) {
        bills = await legislativeStorage.getBillsByCategory(category as string);
      } else if (status) {
        bills = await legislativeStorage.getBillsByStatus(status as string);
      } else {
        bills = await legislativeStorage.getBills();
      }

      res.json(bills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      res.status(500).json({ error: 'Failed to fetch bills' });
    }
  });

  // Get specific bill with details
  app.get('/bills/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid bill ID' });
      }

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
    } catch (error) {
      console.error('Error fetching bill:', error);
      res.status(500).json({ error: 'Failed to fetch bill' });
    }
  });

  // Get bill comments
  app.get('/bills/:id/comments', async (req, res) => {
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
  app.post('/bills/:id/comments', async (req, res) => {
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
  app.post('/bills/:id/engagement', async (req, res) => {
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
  app.get('/bills/meta/categories', async (req, res) => {
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
  app.get('/bills/meta/statuses', async (req, res) => {
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
  app.post('/bills', async (req, res) => {
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
  app.put('/bills/:id', async (req, res) => {
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
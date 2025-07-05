
import express from 'express';
import { db } from '../db';
import { users, bills, billComments, sponsors } from '@shared/schema';
import { count, desc } from 'drizzle-orm';

const router = express.Router();

export function setupHealthRoutes(app: express.Router) {
  // Database health check
  app.get('/health', async (req, res) => {
    try {
      const result = await db.select({ count: count() }).from(users);
      res.json({
        status: "healthy",
        database: "connected",
        timestamp: new Date().toISOString(),
        userCount: result[0].count
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({
        status: "unhealthy",
        database: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Database statistics
  app.get('/stats', async (req, res) => {
    try {
      const [userCount, billCount, commentCount, sponsorCount] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(bills),
        db.select({ count: count() }).from(billComments),
        db.select({ count: count() }).from(sponsors)
      ]);

      res.json({
        users: userCount[0].count,
        bills: billCount[0].count,
        comments: commentCount[0].count,
        sponsors: sponsorCount[0].count,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Stats failed:', error);
      res.status(500).json({ error: 'Failed to get database statistics' });
    }
  });

  // Recent activity
  app.get('/activity', async (req, res) => {
    try {
      const [recentUsers, recentBills] = await Promise.all([
        db.select({
          id: users.id,
          name: users.name,
          createdAt: users.createdAt
        }).from(users).orderBy(desc(users.createdAt)).limit(5),
        
        db.select({
          id: bills.id,
          title: bills.title,
          createdAt: bills.createdAt
        }).from(bills).orderBy(desc(bills.createdAt)).limit(5)
      ]);

      res.json({
        recentUsers,
        recentBills,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Activity failed:', error);
      res.status(500).json({ error: 'Failed to get recent activity' });
    }
  });
}

// Set up the routes on the router
setupHealthRoutes(router);

// Export both the router and setup function for flexibility
export { router };

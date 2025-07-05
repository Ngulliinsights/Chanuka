
import express from 'express';
import { db } from '../db';
import { users, bills, comments, sessions } from '@shared/schema';
import { count } from 'drizzle-orm';
import { asyncHandler } from '../utils/errors';

const router = express.Router();

export function setupHealthRoutes(app: express.Router) {
  // Database health check
  app.get('/health', asyncHandler(async (req, res) => {
    const result = await db.select({ count: count() }).from(users);
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
      userCount: result[0].count
    });
  }));

  // Database statistics
  app.get('/stats', asyncHandler(async (req, res) => {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [billCount] = await db.select({ count: count() }).from(bills);
    const [commentCount] = await db.select({ count: count() }).from(comments);
    const [sessionCount] = await db.select({ count: count() }).from(sessions);

    res.json({
      users: userCount.count,
      bills: billCount.count,
      comments: commentCount.count,
      activeSessions: sessionCount.count,
      lastUpdated: new Date().toISOString()
    });
  }));

  // Recent activity
  app.get('/activity', asyncHandler(async (req, res) => {
    const [recentUsers, recentBills] = await Promise.all([
      db.select({
        id: users.id,
        name: users.name,
        createdAt: users.createdAt
      }).from(users).orderBy(users.createdAt).limit(5),
      
      db.select({
        id: bills.id,
        title: bills.title,
        createdAt: bills.createdAt
      }).from(bills).orderBy(bills.createdAt).limit(5)
    ]);

    res.json({
      recentUsers,
      recentBills,
      timestamp: new Date().toISOString()
    });
  }));
}

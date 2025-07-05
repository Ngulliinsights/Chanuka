
import express from 'express';
import { db } from '../db';
import { sponsors, billSponsorships } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken } from '../middleware';
import { asyncHandler } from '../utils/errors';
import { ValidationError } from '../utils/errors';

const router = express.Router();

export function setupSponsorRoutes(app: express.Router) {
  // Get all active sponsors
  app.get('/sponsors', asyncHandler(async (req, res) => {
    const allSponsors = await db.select().from(sponsors).where(eq(sponsors.isActive, true));
    res.json(allSponsors);
  }));

  // Create new sponsor
  app.post('/sponsors', authenticateToken, asyncHandler(async (req, res) => {
    const sponsorData = req.body;
    
    // Validate required fields
    if (!sponsorData.name || !sponsorData.role) {
      throw new ValidationError('Name and role are required');
    }
    
    const newSponsor = await db.insert(sponsors).values(sponsorData).returning();
    res.status(201).json(newSponsor[0]);
  }));

  // Add sponsor to bill
  app.post('/bills/:billId/sponsors/:sponsorId', authenticateToken, asyncHandler(async (req, res) => {
    const { billId, sponsorId } = req.params;
    const { sponsorshipType } = req.body;

    if (!sponsorshipType) {
      throw new ValidationError('Sponsorship type is required');
    }

    const sponsorship = await db.insert(billSponsorships).values({
      billId: parseInt(billId),
      sponsorId: parseInt(sponsorId),
      sponsorshipType,
      sponsorshipDate: new Date(),
      isActive: true
    }).returning();

    res.status(201).json(sponsorship[0]);
  }));

  // Update sponsor
  app.put('/sponsors/:sponsorId', authenticateToken, asyncHandler(async (req, res) => {
    const { sponsorId } = req.params;
    const updateData = req.body;
    
    const updatedSponsor = await db
      .update(sponsors)
      .set(updateData)
      .where(eq(sponsors.id, parseInt(sponsorId)))
      .returning();
    
    if (!updatedSponsor.length) {
      throw new ValidationError('Sponsor not found');
    }
    
    res.json(updatedSponsor[0]);
  }));

  // Deactivate sponsor
  app.delete('/sponsors/:sponsorId', authenticateToken, asyncHandler(async (req, res) => {
    const { sponsorId } = req.params;
    
    await db
      .update(sponsors)
      .set({ isActive: false })
      .where(eq(sponsors.id, parseInt(sponsorId)));
    
    res.status(204).send();
  }));
}

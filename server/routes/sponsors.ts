
import express from 'express';
import { legislativeStorage } from '../storage/legislative-storage';
import { insertSponsorSchema } from '@shared/schema';
import { z } from 'zod';

const router = express.Router();

export function setupSponsorRoutes(app: express.Router) {
  // Get all sponsors
  app.get('/sponsors', async (req, res) => {
    try {
      const sponsors = await legislativeStorage.getSponsors();
      res.json(sponsors);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      res.status(500).json({ error: 'Failed to fetch sponsors' });
    }
  });

  // Get specific sponsor with details
  app.get('/sponsors/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid sponsor ID' });
      }

      const sponsor = await legislativeStorage.getSponsor(id);
      if (!sponsor) {
        return res.status(404).json({ error: 'Sponsor not found' });
      }

      // Get additional sponsor data
      const [affiliations, transparency] = await Promise.all([
        legislativeStorage.getSponsorAffiliations(id),
        legislativeStorage.getSponsorTransparency(id)
      ]);

      res.json({
        ...sponsor,
        affiliations,
        transparency
      });
    } catch (error) {
      console.error('Error fetching sponsor:', error);
      res.status(500).json({ error: 'Failed to fetch sponsor' });
    }
  });

  // Get sponsor affiliations
  app.get('/sponsors/:id/affiliations', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid sponsor ID' });
      }

      const affiliations = await legislativeStorage.getSponsorAffiliations(id);
      res.json(affiliations);
    } catch (error) {
      console.error('Error fetching affiliations:', error);
      res.status(500).json({ error: 'Failed to fetch affiliations' });
    }
  });

  // Get sponsor transparency records
  app.get('/sponsors/:id/transparency', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid sponsor ID' });
      }

      const transparency = await legislativeStorage.getSponsorTransparency(id);
      res.json(transparency);
    } catch (error) {
      console.error('Error fetching transparency records:', error);
      res.status(500).json({ error: 'Failed to fetch transparency records' });
    }
  });

  // Create new sponsor (admin only in real app)
  app.post('/sponsors', async (req, res) => {
    try {
      const sponsorData = insertSponsorSchema.parse(req.body);
      const sponsor = await legislativeStorage.createSponsor(sponsorData);
      res.status(201).json(sponsor);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid sponsor data', details: error.errors });
      }
      console.error('Error creating sponsor:', error);
      res.status(500).json({ error: 'Failed to create sponsor' });
    }
  });

  // Update sponsor (admin only in real app)
  app.put('/sponsors/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid sponsor ID' });
      }

      const sponsor = await legislativeStorage.updateSponsor(id, req.body);
      if (!sponsor) {
        return res.status(404).json({ error: 'Sponsor not found' });
      }

      res.json(sponsor);
    } catch (error) {
      console.error('Error updating sponsor:', error);
      res.status(500).json({ error: 'Failed to update sponsor' });
    }
  });
}

// Set up the routes on the router
setupSponsorRoutes(router);

// Export both the router and setup function for flexibility
export { router };

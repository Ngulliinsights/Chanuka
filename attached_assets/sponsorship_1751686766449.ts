
import express from 'express';
import { db } from '../db';
import { bills, billSponsorships, sponsors, sponsorTransparency, sponsorAffiliations, billSectionConflicts } from '@shared/schema';
import { eq, desc, count, sql, and } from 'drizzle-orm';
import { asyncHandler } from '../utils/errors';
import { SponsorshipAnalysisService } from '../services/sponsorship-analysis';

const router = express.Router();

export function setupSponsorshipRoutes(app: express.Router) {
  const analysisService = new SponsorshipAnalysisService();

  // Main sponsorship analysis endpoint
  app.get('/bills/:billId/sponsorship-analysis', asyncHandler(async (req, res) => {
    const { billId } = req.params;
    const analysis = await analysisService.getComprehensiveAnalysis(parseInt(billId));
    res.json(analysis);
  }));

  // Primary sponsor detailed analysis
  app.get('/bills/:billId/sponsorship-analysis/primary-sponsor', asyncHandler(async (req, res) => {
    const { billId } = req.params;
    const analysis = await analysisService.getPrimarySponsorAnalysis(parseInt(billId));
    res.json(analysis);
  }));

  // Co-sponsors analysis
  app.get('/bills/:billId/sponsorship-analysis/co-sponsors', asyncHandler(async (req, res) => {
    const { billId } = req.params;
    const analysis = await analysisService.getCoSponsorsAnalysis(parseInt(billId));
    res.json(analysis);
  }));

  // Financial network analysis
  app.get('/bills/:billId/sponsorship-analysis/financial-network', asyncHandler(async (req, res) => {
    const { billId } = req.params;
    const analysis = await analysisService.getFinancialNetworkAnalysis(parseInt(billId));
    res.json(analysis);
  }));
}

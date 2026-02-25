/**
 * Sponsors Routes
 * 
 * HTTP endpoints for sponsor management and conflict analysis
 */

import { sponsorConflictAnalysisService } from './application/sponsor-conflict-analysis.service';
import { type SponsorAffiliationInput, sponsorService, type SponsorTransparencyInput } from './application/sponsor-service-direct';
import { logger } from '@server/infrastructure/observability';
import express, { type Request, type Response, type Router } from 'express';
import { asyncHandler } from '@server/middleware';

export const router: Router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseIntParam(value: string | undefined, paramName: string): number {
  if (value === undefined) {
    throw new Error(`${paramName} route parameter is required`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error(`${paramName} must be a positive integer`);
  }
  return parsed;
}

function parseIntQuery(
  value: string | undefined,
  paramName: string,
  defaultValue: number,
  min: number = 1,
  max: number = 1000
): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    throw new Error(`${paramName} must be an integer between ${min} and ${max}`);
  }
  return parsed;
}

// ============================================================================
// SPONSOR CRUD ROUTES
// ============================================================================

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'listSponsors' };
  logger.info(logContext, 'Listing sponsors');

  const limit = parseIntQuery(req.query.limit as string, 'limit', 50, 1, 1000);
  const offset = parseIntQuery(req.query.offset as string, 'offset', 0, 0, 10000);

  const options = {
    party: req.query.party as string | undefined,
    role: req.query.role as string | undefined,
    constituency: req.query.constituency as string | undefined,
    is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
    limit,
    offset,
    sortBy: (req.query.sortBy as 'name' | 'party' | 'transparency_score' | 'financial_exposure') || 'name',
    sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc'
  };

  const sponsors = await sponsorService.list(options);
  res.json({ data: sponsors, count: sponsors.length });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'getSponsor' };
  const sponsor_id = parseIntParam(req.params.id, 'id');
  logger.info({ ...logContext, sponsor_id }, 'Getting sponsor');

  const sponsor = await sponsorService.findById(sponsor_id);
  if (!sponsor) {
    res.status(404).json({ error: 'Sponsor not found' });
    return;
  }

  res.json({ data: sponsor });
}));

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'createSponsor' };
  logger.info(logContext, 'Creating sponsor');

  const { name, party, role, constituency, contact_info } = req.body;

  if (!name || !party) {
    res.status(400).json({ error: 'Name and party are required' });
    return;
  }

  const newSponsor = await sponsorService.create({ name, party, role, constituency, contact_info });
  res.status(201).json({ data: newSponsor });
}));

router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'updateSponsor' };
  const sponsor_id = parseIntParam(req.params.id, 'id');
  logger.info({ ...logContext, sponsor_id }, 'Updating sponsor');

  if (Object.keys(req.body).length === 0) {
    res.status(400).json({ error: 'Request body cannot be empty' });
    return;
  }

  const updatedSponsor = await sponsorService.update(sponsor_id, req.body);
  if (!updatedSponsor) {
    res.status(404).json({ error: 'Sponsor not found' });
    return;
  }

  res.json({ data: updatedSponsor });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'deleteSponsor' };
  const sponsor_id = parseIntParam(req.params.id, 'id');
  logger.info({ ...logContext, sponsor_id }, 'Deleting sponsor');

  const deactivated = await sponsorService.deactivate(sponsor_id);
  if (!deactivated) {
    res.status(404).json({ error: 'Sponsor not found' });
    return;
  }

  res.status(204).send();
}));

// ============================================================================
// AFFILIATION ROUTES
// ============================================================================

router.get('/:id/affiliations', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'listAffiliations' };
  const sponsor_id = parseIntParam(req.params.id, 'id');
  logger.info({ ...logContext, sponsor_id }, 'Listing affiliations');

  const affiliations = await sponsorService.listAffiliations(sponsor_id);
  res.json({ data: affiliations, count: affiliations.length });
}));

router.post('/:id/affiliations', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'addAffiliation' };
  const sponsor_id = parseIntParam(req.params.id, 'id');
  logger.info({ ...logContext, sponsor_id }, 'Adding affiliation');

  const { organization, role, type, conflictType, start_date, end_date, is_active } = req.body;

  if (!organization || !type) {
    res.status(400).json({ error: 'Organization and type are required' });
    return;
  }

  const affiliationInput: SponsorAffiliationInput = {
    sponsor_id,
    organization,
    role,
    type,
    conflictType,
    start_date: start_date ? new Date(start_date) : null,
    end_date: end_date ? new Date(end_date) : null,
    is_active
  };

  const newAffiliation = await sponsorService.addAffiliation(affiliationInput);
  res.status(201).json({ data: newAffiliation });
}));

// ============================================================================
// TRANSPARENCY ROUTES
// ============================================================================

router.get('/:id/transparency', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'listTransparency' };
  const sponsor_id = parseIntParam(req.params.id, 'id');
  logger.info({ ...logContext, sponsor_id }, 'Listing transparency records');

  const records = await sponsorService.listTransparencyRecords(sponsor_id);
  res.json({ data: records, count: records.length });
}));

router.post('/:id/transparency', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'addTransparency' };
  const sponsor_id = parseIntParam(req.params.id, 'id');
  logger.info({ ...logContext, sponsor_id }, 'Adding transparency record');

  const { disclosureType, description, amount, source, dateReported, is_verified } = req.body;

  if (!disclosureType || !description) {
    res.status(400).json({ error: 'Disclosure type and description are required' });
    return;
  }

  const transparencyInput: SponsorTransparencyInput = {
    sponsor_id,
    disclosureType,
    description,
    amount,
    source,
    dateReported: dateReported ? new Date(dateReported) : null,
    is_verified
  };

  const newRecord = await sponsorService.addTransparencyRecord(transparencyInput);
  res.status(201).json({ data: newRecord });
}));

// ============================================================================
// CONFLICT ANALYSIS ROUTES
// ============================================================================

router.get('/:id/conflicts', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'detectConflicts' };
  const sponsor_id = parseIntParam(req.params.id, 'id');
  logger.info({ ...logContext, sponsor_id }, 'Detecting conflicts');

  const conflicts = await sponsorConflictAnalysisService.detectConflicts(sponsor_id);
  res.json({ data: conflicts, count: conflicts.length });
}));

router.get('/:id/risk-profile', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'getRiskProfile' };
  const sponsor_id = parseIntParam(req.params.id, 'id');
  logger.info({ ...logContext, sponsor_id }, 'Getting risk profile');

  const riskProfile = await sponsorConflictAnalysisService.generateRiskProfile(sponsor_id);
  res.json({ data: riskProfile });
}));

router.get('/conflicts/mapping', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'getConflictMapping' };
  logger.info(logContext, 'Getting conflict mapping');

  const bill_id = req.query.bill_id ? parseInt(req.query.bill_id as string, 10) : undefined;
  const mapping = await sponsorConflictAnalysisService.createConflictMapping(bill_id);
  res.json({ data: mapping });
}));

router.get('/:id/trends', asyncHandler(async (req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'analyzeConflictTrends' };
  const sponsor_id = parseIntParam(req.params.id, 'id');
  const timeframeMonths = parseIntQuery(req.query.timeframe as string, 'timeframe', 12, 1, 60);
  logger.info({ ...logContext, sponsor_id, timeframeMonths }, 'Analyzing conflict trends');

  const trends = await sponsorConflictAnalysisService.analyzeConflictTrends(sponsor_id, timeframeMonths);
  res.json({ data: trends });
}));

// ============================================================================
// METADATA ROUTES
// ============================================================================

router.get('/metadata/parties', asyncHandler(async (_req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'listParties' };
  logger.info(logContext, 'Listing parties');

  const parties = await sponsorService.listParties();
  res.json({ data: parties });
}));

router.get('/metadata/constituencies', asyncHandler(async (_req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'listConstituencies' };
  logger.info(logContext, 'Listing constituencies');

  const constituencies = await sponsorService.listConstituencies();
  res.json({ data: constituencies });
}));

router.get('/metadata/statistics', asyncHandler(async (_req: Request, res: Response) => {
  const logContext = { component: 'SponsorRoutes', operation: 'getStatistics' };
  logger.info(logContext, 'Getting statistics');

  const statistics = await sponsorService.getStatistics();
  res.json({ data: statistics });
}));

export default router;

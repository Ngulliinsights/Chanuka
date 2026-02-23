import { sponsorConflictAnalysisService } from '@shared/application/sponsor-conflict-analysis.service';
import { SponsorAffiliationInput, sponsorService, SponsorTransparencyInput } from '@shared/application/sponsor-service-direct';
import { BaseError, ValidationError } from '@shared/core/errors';
import { ErrorCode, ErrorDomain, ErrorSeverity  } from '@shared/core';
import { logger } from '@server/infrastructure/observability';
import express, { Response } from 'express';
import { asyncHandler } from '@server/middleware';
import { createErrorContext } from '@server/infrastructure/error-handling';

const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseIntParam(value: string | undefined, paramName: string): number {
  if (value === undefined) {
    throw new ValidationError('Parameter is required', {
      field: paramName,
      message: `${paramName} route parameter is required`
    });
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new ValidationError('Invalid parameter format', {
      field: paramName,
      message: `${paramName} must be a positive integer`
    });
  }
  return parsed;
}

function parseOptionalIntParam(
  value: string | undefined,
  paramName: string,
  defaultValue: number,
  min = 1,
  max = Infinity
): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed < min || parsed > max) {
    throw new ValidationError('Invalid query parameter', {
      field: paramName,
      message: `${paramName} must be an integer between ${min} and ${max}`
    });
  }
  return parsed;
}

// ============================================================================
// SPONSOR CRUD & LISTING ROUTES
// ============================================================================

/**
 * GET /api/sponsors
 * List sponsors with optional filtering and pagination
 */
router.get('/', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /');
  try {
    const { party, role, constituency, conflict_level, is_active, search } = req.query;
    const limit = parseOptionalIntParam(req.query.limit as string, 'limit', 50, 1, 200);
    const offset = parseOptionalIntParam(req.query.offset as string, 'offset', 0, 0);
    const sortBy = (req.query.sortBy as string) || 'name';
    const sortOrder = (req.query.sortOrder as string) || 'asc';
    const is_activeBool = is_active === undefined ? true : is_active === 'true';

    const options = {
      party: party as string | undefined,
      role: role as string | undefined,
      constituency: constituency as string | undefined,
      conflict_level: conflict_level as string | undefined,
      is_active: is_activeBool,
      limit,
      offset,
      sortBy,
      sortOrder
    };

    const sponsors = search
      ? await sponsorService.search(search as string, options)
      : await sponsorService.list(options);

    res.json({ data: sponsors });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to list sponsors', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to list sponsors', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * GET /api/sponsors/:id
 * Retrieve a single sponsor with all related data
 */
router.get('/:id', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /:id');
  try {
    const id = parseIntParam(req.params.id, 'Sponsor ID');
    const sponsor = await sponsorService.findByIdWithRelations(id);

    if (!sponsor) {
      throw new BaseError('Sponsor not found', {
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW,
        details: { sponsor_id: id }
      });
    }

    res.json({ data: sponsor });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to retrieve sponsor', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to retrieve sponsor', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * POST /api/sponsors
 * Create a new sponsor
 */
router.post('/', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /');
  try {
    const { name, party, role, constituency, is_active } = req.body;

    if (!name || !party) {
      throw new ValidationError('Missing required fields', {
        field: 'body',
        message: 'Name and party are required'
      });
    }

    const sponsorData = { name, party, role, constituency, is_active };
    const newSponsor = await sponsorService.create(sponsorData);

    res.status(201).json({ data: newSponsor });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    if (error instanceof Error && error.message.includes('duplicate')) {
      throw new BaseError('Sponsor already exists', {
        statusCode: 409,
        code: ErrorCode.RESOURCE_CONFLICT,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW
      });
    }
    logger.error('Failed to create sponsor', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to create sponsor', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * PUT /api/sponsors/:id
 * Update an existing sponsor
 */
router.put('/:id', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'PUT /:id');
  try {
    const id = parseIntParam(req.params.id, 'Sponsor ID');

    if (Object.keys(req.body).length === 0) {
      throw new ValidationError('Empty request body', {
        field: 'body',
        message: 'Request body cannot be empty for update'
      });
    }

    const updatedSponsor = await sponsorService.update(id, req.body);

    if (!updatedSponsor) {
      throw new BaseError('Sponsor not found', {
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW,
        details: { sponsor_id: id }
      });
    }

    res.json({ data: updatedSponsor });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to update sponsor', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to update sponsor', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * DELETE /api/sponsors/:id
 * Soft delete (deactivate) a sponsor
 */
router.delete('/:id', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'DELETE /:id');
  try {
    const id = parseIntParam(req.params.id, 'Sponsor ID');
    const deactivatedSponsor = await sponsorService.setActiveStatus(id, false);

    if (!deactivatedSponsor) {
      throw new BaseError('Sponsor not found', {
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW,
        details: { sponsor_id: id }
      });
    }

    res.status(204).send();
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to delete sponsor', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to delete sponsor', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

// ============================================================================
// AFFILIATION ROUTES
// ============================================================================

/**
 * GET /api/sponsors/:id/affiliations
 * List all affiliations for a sponsor
 */
router.get('/:id/affiliations', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /:id/affiliations');
  try {
    const id = parseIntParam(req.params.id, 'Sponsor ID');
    const activeOnly = req.query.activeOnly !== 'false';
    const affiliations = await sponsorService.listAffiliations(id, activeOnly);

    res.json({ data: affiliations });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to list affiliations', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to list affiliations', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * POST /api/sponsors/:id/affiliations
 * Add a new affiliation for a sponsor
 */
router.post('/:id/affiliations', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /:id/affiliations');
  try {
    const sponsor_id = parseIntParam(req.params.id, 'Sponsor ID');
    const { organization, type, role, conflictType, start_date, end_date, is_active } = req.body;

    if (!organization || !type) {
      throw new ValidationError('Missing required fields', {
        field: 'body',
        message: 'Organization and type are required'
      });
    }

    const affiliationData: SponsorAffiliationInput = {
      sponsor_id,
      organization,
      type,
      role,
      conflictType,
      start_date: start_date ? new Date(start_date) : undefined,
      end_date: end_date ? new Date(end_date) : undefined,
      is_active
    };

    const newAffiliation = await sponsorService.addAffiliation(affiliationData);
    res.status(201).json({ data: newAffiliation });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to add affiliation', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to add affiliation', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * PUT /api/sponsors/:id/affiliations/:affiliationId
 * Update an existing affiliation
 */
router.put('/:id/affiliations/:affiliationId', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'PUT /:id/affiliations/:affiliationId');
  try {
    const affiliationId = parseIntParam(req.params.affiliationId, 'Affiliation ID');

    if (Object.keys(req.body).length === 0) {
      throw new ValidationError('Empty request body', {
        field: 'body',
        message: 'Request body cannot be empty for update'
      });
    }

    const updateData = { ...req.body };
    if (updateData.start_date) updateData.start_date = new Date(updateData.start_date);
    if (updateData.end_date) updateData.end_date = new Date(updateData.end_date);

    const updatedAffiliation = await sponsorService.updateAffiliation(affiliationId, updateData);

    if (!updatedAffiliation) {
      throw new BaseError('Affiliation not found', {
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW,
        details: { affiliation_id: affiliationId }
      });
    }

    res.json({ data: updatedAffiliation });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to update affiliation', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to update affiliation', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * DELETE /api/sponsors/:id/affiliations/:affiliationId
 * Deactivate an affiliation
 */
router.delete('/:id/affiliations/:affiliationId', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'DELETE /:id/affiliations/:affiliationId');
  try {
    const affiliationId = parseIntParam(req.params.affiliationId, 'Affiliation ID');
    const end_date = req.body.end_date ? new Date(req.body.end_date) : undefined;

    const deactivatedAffiliation = await sponsorService.setAffiliationActiveStatus(
      affiliationId,
      false,
      end_date
    );

    if (!deactivatedAffiliation) {
      throw new BaseError('Affiliation not found', {
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW,
        details: { affiliation_id: affiliationId }
      });
    }

    res.status(204).send();
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to delete affiliation', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to delete affiliation', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

// ============================================================================
// TRANSPARENCY ROUTES
// ============================================================================

/**
 * GET /api/sponsors/:id/transparency
 * List all transparency records for a sponsor
 */
router.get('/:id/transparency', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /:id/transparency');
  try {
    const id = parseIntParam(req.params.id, 'Sponsor ID');
    const records = await sponsorService.listTransparencyRecords(id);

    res.json({ data: records });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to list transparency records', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to list transparency records', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * POST /api/sponsors/:id/transparency
 * Add a new transparency disclosure record
 */
router.post('/:id/transparency', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /:id/transparency');
  try {
    const sponsor_id = parseIntParam(req.params.id, 'Sponsor ID');
    const { disclosureType, description, amount, source, dateReported, is_verified } = req.body;

    if (!disclosureType || !description) {
      throw new ValidationError('Missing required fields', {
        field: 'body',
        message: 'Disclosure type and description are required'
      });
    }

    const transparencyData: SponsorTransparencyInput = {
      sponsor_id,
      disclosureType,
      description,
      amount,
      source,
      dateReported: dateReported ? new Date(dateReported) : undefined,
      is_verified
    };

    const newRecord = await sponsorService.addTransparencyRecord(transparencyData);
    res.status(201).json({ data: newRecord });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to add transparency record', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to add transparency record', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * PUT /api/sponsors/:id/transparency/:transparencyId
 * Update a transparency record
 */
router.put('/:id/transparency/:transparencyId', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'PUT /:id/transparency/:transparencyId');
  try {
    const transparencyId = parseIntParam(req.params.transparencyId, 'Transparency ID');

    if (Object.keys(req.body).length === 0) {
      throw new ValidationError('Empty request body', {
        field: 'body',
        message: 'Request body cannot be empty for update'
      });
    }

    const updateData = { ...req.body };
    if (updateData.dateReported) updateData.dateReported = new Date(updateData.dateReported);

    const updatedRecord = await sponsorService.updateTransparencyRecord(transparencyId, updateData);

    if (!updatedRecord) {
      throw new BaseError('Transparency record not found', {
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW,
        details: { transparency_id: transparencyId }
      });
    }

    res.json({ data: updatedRecord });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to update transparency record', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to update transparency record', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * POST /api/sponsors/:id/transparency/:transparencyId/verify
 * Mark a transparency record as verified
 */
router.post('/:id/transparency/:transparencyId/verify', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'POST /:id/transparency/:transparencyId/verify');
  try {
    const transparencyId = parseIntParam(req.params.transparencyId, 'Transparency ID');
    const verifiedRecord = await sponsorService.verifyTransparencyRecord(transparencyId);

    if (!verifiedRecord) {
      throw new BaseError('Transparency record not found', {
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        domain: ErrorDomain.SYSTEM,
        severity: ErrorSeverity.LOW,
        details: { transparency_id: transparencyId }
      });
    }

    res.json({ data: verifiedRecord });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to verify transparency record', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to verify transparency record', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

// ============================================================================
// CONFLICT ANALYSIS ROUTES
// ============================================================================

/**
 * GET /api/sponsors/:id/conflicts
 * Detect potential conflicts of interest for a sponsor
 */
router.get('/:id/conflicts', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /:id/conflicts');
  try {
    const id = parseIntParam(req.params.id, 'Sponsor ID');
    const conflicts = await sponsorConflictAnalysisService.detectConflicts(id);

    res.json({ data: conflicts });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to detect conflicts', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to detect conflicts', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * GET /api/sponsors/:id/risk-profile
 * Generate a comprehensive risk assessment profile
 */
router.get('/:id/risk-profile', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /:id/risk-profile');
  try {
    const id = parseIntParam(req.params.id, 'Sponsor ID');
    const riskProfile = await sponsorConflictAnalysisService.generateRiskProfile(id);

    res.json({ data: riskProfile });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to generate risk profile', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to generate risk profile', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * GET /api/sponsors/:id/conflict-trends
 * Analyze how conflicts have evolved over time
 */
router.get('/:id/conflict-trends', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /:id/conflict-trends');
  try {
    const id = parseIntParam(req.params.id, 'Sponsor ID');
    const timeframe = parseOptionalIntParam(req.query.timeframe as string, 'timeframe', 12, 1, 60);

    const trends = await sponsorConflictAnalysisService.analyzeConflictTrends(id, timeframe);

    const result = trends.length > 0 ? trends[0] : {
      sponsor_id: id,
      timeframe: `${timeframe} months`,
      conflictCount: 0,
      severityTrend: 'stable',
      risk_score: 0,
      predictions: []
    };

    res.json({ data: result });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to analyze conflict trends', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to analyze conflict trends', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * GET /api/sponsors/conflicts/all
 * Detect conflicts across all active sponsors
 */
router.get('/conflicts/all', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /conflicts/all');
  try {
    const allConflicts = await sponsorConflictAnalysisService.detectConflicts();

    const sponsor_ids = Array.from(new Set(allConflicts.map((c: unknown) => c.sponsor_id)));
    const sponsors = await sponsorService.findByIds(sponsor_ids);
    const sponsorMap = new Map(sponsors.map((s: unknown) => [s.id, { name: s.name, party: s.party }]));

    const conflictsBySponsor: Record<number, { sponsorInfo: any; conflicts: unknown[] }> = {};
    allConflicts.forEach((conflict: unknown) => {
      if (!conflictsBySponsor[conflict.sponsor_id]) {
        conflictsBySponsor[conflict.sponsor_id] = {
          sponsorInfo: sponsorMap.get(conflict.sponsor_id) || { name: 'Unknown', party: null },
          conflicts: []
        };
      }
      conflictsBySponsor[conflict.sponsor_id].conflicts.push(conflict);
    });

    res.json({
      data: {
        conflictsBySponsor: Object.values(conflictsBySponsor),
        totalConflicts: allConflicts.length,
        sponsorsAnalyzed: sponsor_ids.length
      }
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to detect all conflicts', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to detect all conflicts', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * GET /api/sponsors/conflicts/network
 * Generate network visualization data showing conflict relationships
 */
router.get('/conflicts/network', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /conflicts/network');
  try {
    const bill_idParam = req.query.bill_id as string | undefined;
    const bill_id = bill_idParam ? parseIntParam(bill_idParam, 'Bill ID') : undefined;

    const conflictMapping = await sponsorConflictAnalysisService.createConflictMapping(bill_id);
    res.json({ data: conflictMapping });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to create conflict network', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to create conflict network', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

// ============================================================================
// SPONSORSHIP ROUTES
// ============================================================================

/**
 * GET /api/sponsors/:id/sponsored-bills
 * List all bills sponsored by this sponsor
 */
router.get('/:id/sponsored-bills', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /:id/sponsored-bills');
  try {
    const id = parseIntParam(req.params.id, 'Sponsor ID');
    const activeOnly = req.query.activeOnly !== 'false';

    const sponsorships = await sponsorService.listBillSponsorshipsBySponsor(id, activeOnly);
    const bill_ids = sponsorships.map((s: unknown) => s.bill_id);

    const bills = await sponsorService.getBillsByIds(bill_ids);
    const billsMap = new Map(bills.map((b: unknown) => [b.id, b]));

    const sponsoredBillsData = sponsorships.map((sp: unknown) => ({
      sponsorshipId: sp.id,
      sponsorshipType: sp.sponsorshipType,
      sponsorshipDate: sp.sponsorshipDate,
      is_active: sp.is_active,
      bill: billsMap.get(sp.bill_id) || { id: sp.bill_id, title: 'Bill details not found' }
    }));

    res.json({ data: sponsoredBillsData });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to list sponsored bills', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to list sponsored bills', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

// ============================================================================
// METADATA ROUTES
// ============================================================================

/**
 * GET /api/sponsors/meta/parties
 * Get list of all unique political parties
 */
router.get('/meta/parties', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /meta/parties');
  try {
    const parties = await sponsorService.getUniqueParties();
    res.json({ data: { parties } });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to fetch parties', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to fetch parties', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * GET /api/sponsors/meta/constituencies
 * Get list of all unique constituencies
 */
router.get('/meta/constituencies', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /meta/constituencies');
  try {
    const constituencies = await sponsorService.getUniqueConstituencies();
    res.json({ data: { constituencies } });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to fetch constituencies', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to fetch constituencies', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

/**
 * GET /api/sponsors/meta/stats
 * Get overall statistics about sponsors
 */
router.get('/meta/stats', asyncHandler(async (req, res: Response) => {
  const context = createErrorContext(req, 'GET /meta/stats');
  try {
    const [activeCount, parties, constituencies] = await Promise.all([
      sponsorService.getActiveSponsorCount(),
      sponsorService.getUniqueParties(),
      sponsorService.getUniqueConstituencies()
    ]);

    res.json({
      data: {
        totalActive: activeCount,
        partyCount: parties.length,
        constituencyCount: constituencies.length
      }
    });
  } catch (error) {
    if (error instanceof ValidationError || error instanceof BaseError) throw error;
    logger.error('Failed to fetch sponsor stats', { component: 'SponsorRoutes', context }, error as Error);
    throw new BaseError('Failed to fetch sponsor stats', {
      statusCode: 500,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      domain: ErrorDomain.SYSTEM,
      severity: ErrorSeverity.MEDIUM
    });
  }
}));

export { router };
export { router as sponsorsRouter };

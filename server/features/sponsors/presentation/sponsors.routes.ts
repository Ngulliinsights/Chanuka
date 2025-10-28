import express from 'express';
import { sponsorRepository, SponsorAffiliationInput, SponsorTransparencyInput } from '../infrastructure/repositories/sponsor.repository';
import { sponsorConflictAnalysisService } from '../application/sponsor-conflict-analysis.service';
import { insertSponsorSchema } from '../../../../shared/schema/validation';
import { z } from 'zod';
import { ApiSuccess, ApiError, ApiNotFound, ApiValidationError } from '@shared/core/utils/api'-utils.js';
import { logger } from '../../../../shared/core/src/observability/logging/index.js';

const router = express.Router();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely parse an integer route parameter with validation
 */
function parseIntParam(value: string | undefined, paramName: string): number {
    if (value === undefined) {
        throw new Error(`${paramName} route parameter is required.`);
    }
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid ${paramName}: Must be a positive integer.`);
    }
    return parsed;
}

/**
 * Parse optional integer query parameters with bounds checking
 */
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
        throw new Error(`Invalid query parameter '${paramName}': Must be an integer between ${min} and ${max}.`);
    }
    return parsed;
}

/**
 * Transform Zod validation errors into our API error format
 * Zod uses 'path' arrays, but our API expects 'field' strings
 */
function formatZodErrors(zodErrors: z.ZodIssue[]): { field: string; message: string }[] {
    return zodErrors.map(error => ({
        field: error.path.join('.') || 'unknown',
        message: error.message
    }));
}

/**
 * Type-safe request body accessor
 */
type RequestBody = Record<string, any>;
function getRequestBody(req: express.Request): RequestBody {
    return req.body as RequestBody;
}

// ============================================================================
// SPONSOR CRUD & LISTING ROUTES
// ============================================================================

/**
 * GET /api/sponsors
 * List sponsors with optional filtering and pagination
 */
router.get('/', async (req, res, next) => {
    try {
        const { party, role, constituency, conflictLevel, isActive, search } = req.query;
        const limit = parseOptionalIntParam(req.query.limit as string, 'limit', 50, 1, 200);
        const offset = parseOptionalIntParam(req.query.offset as string, 'offset', 0, 0);
        const sortBy = req.query.sortBy as any || 'name';
        const sortOrder = req.query.sortOrder as any || 'asc';
        const isActiveBool = isActive === undefined ? true : isActive === 'true';

        const options = {
            party: party as string | undefined,
            role: role as string | undefined,
            constituency: constituency as string | undefined,
            conflictLevel: conflictLevel as string | undefined,
            isActive: isActiveBool,
            limit,
            offset,
            sortBy,
            sortOrder
        };

        const sponsors = search
            ? await sponsorRepository.search(search as string, options)
            : await sponsorRepository.list(options);

        return ApiSuccess(res, sponsors);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sponsors/:id
 * Retrieve a single sponsor with all related data
 */
router.get('/:id', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const sponsor = await sponsorRepository.findByIdWithRelations(id);

        if (!sponsor) {
            return ApiNotFound(res, `Sponsor with ID ${id} not found.`);
        }

        return ApiSuccess(res, sponsor);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/sponsors
 * Create a new sponsor with validation
 */
router.post('/', async (req: express.Request, res, next) => {
    try {
        // Validate the incoming data against our schema
        const validationResult = insertSponsorSchema.safeParse(req.body);

        if (!validationResult.success) {
            // Transform Zod errors to our API format
            return ApiValidationError(res, formatZodErrors(validationResult.error.errors));
        }

        const sponsorData = validationResult.data;
        const newSponsor = await sponsorRepository.create(sponsorData);

        // Success response with 201 status wrapped in metadata object
        return ApiSuccess(res, newSponsor, undefined, 201);
    } catch (error) {
        // Handle database constraint violations
        if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
            return ApiError(res, {
                code: 'DUPLICATE_SPONSOR',
                message: 'A sponsor with this information already exists',
                details: error.message
            });
        }
        next(error);
    }
});

/**
 * PUT /api/sponsors/:id
 * Update an existing sponsor
 */
router.put('/:id', async (req: express.Request, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');

        if (Object.keys(req.body).length === 0) {
            return ApiValidationError(res, [{
                field: 'body',
                message: 'Request body cannot be empty for update.'
            }]);
        }

        const updateData = getRequestBody(req);
        const updatedSponsor = await sponsorRepository.update(id, updateData);

        if (!updatedSponsor) {
            return ApiNotFound(res, `Sponsor with ID ${id} not found.`);
        }

        return ApiSuccess(res, updatedSponsor);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/sponsors/:id
 * Soft delete (deactivate) a sponsor
 */
router.delete('/:id', async (req: express.Request, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const deactivatedSponsor = await sponsorRepository.setActiveStatus(id, false);

        if (!deactivatedSponsor) {
            return ApiNotFound(res, `Sponsor with ID ${id} not found.`);
        }

        // 204 No Content for successful deletion
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// AFFILIATION ROUTES
// ============================================================================

/**
 * GET /api/sponsors/:id/affiliations
 * List all affiliations for a sponsor
 */
router.get('/:id/affiliations', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const activeOnly = req.query.activeOnly !== 'false';
        const affiliations = await sponsorRepository.listAffiliations(id, activeOnly);

        return ApiSuccess(res, affiliations);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/sponsors/:id/affiliations
 * Add a new affiliation for a sponsor
 */
router.post('/:id/affiliations', async (req: express.Request, res, next) => {
    try {
        const sponsorId = parseIntParam(req.params.id, 'Sponsor ID');

        const affiliationData: SponsorAffiliationInput = {
            sponsorId,
            organization: req.body.organization,
            type: req.body.type,
            role: req.body.role,
            conflictType: req.body.conflictType,
            startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
            isActive: req.body.isActive,
        };

        // Validate required fields
        if (!affiliationData.organization || !affiliationData.type) {
            return ApiValidationError(res, [
                { field: 'organization', message: 'Organization is required' },
                { field: 'type', message: 'Affiliation type is required' }
            ].filter(err =>
                (err.field === 'organization' && !affiliationData.organization) ||
                (err.field === 'type' && !affiliationData.type)
            ));
        }

        const newAffiliation = await sponsorRepository.addAffiliation(affiliationData);
        return ApiSuccess(res, newAffiliation, undefined, 201);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/sponsors/:id/affiliations/:affiliationId
 * Update an existing affiliation
 */
router.put('/:id/affiliations/:affiliationId', async (req: express.Request, res, next) => {
    try {
        const affiliationId = parseIntParam(req.params.affiliationId, 'Affiliation ID');

        if (Object.keys(req.body).length === 0) {
            return ApiValidationError(res, [{
                field: 'body',
                message: 'Request body cannot be empty for update.'
            }]);
        }

        const updateData = getRequestBody(req);

        // Parse date strings into Date objects
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

        const updatedAffiliation = await sponsorRepository.updateAffiliation(affiliationId, updateData);

        if (!updatedAffiliation) {
            return ApiNotFound(res, `Affiliation with ID ${affiliationId} not found.`);
        }

        return ApiSuccess(res, updatedAffiliation);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/sponsors/:id/affiliations/:affiliationId
 * Deactivate an affiliation
 */
router.delete('/:id/affiliations/:affiliationId', async (req: express.Request, res, next) => {
    try {
        const affiliationId = parseIntParam(req.params.affiliationId, 'Affiliation ID');
        const endDate = req.body.endDate ? new Date(req.body.endDate) : undefined;

        const deactivatedAffiliation = await sponsorRepository.setAffiliationActiveStatus(
            affiliationId,
            false,
            endDate
        );

        if (!deactivatedAffiliation) {
            return ApiNotFound(res, `Affiliation with ID ${affiliationId} not found.`);
        }

        return res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// TRANSPARENCY ROUTES
// ============================================================================

/**
 * GET /api/sponsors/:id/transparency
 * List all transparency records for a sponsor
 */
router.get('/:id/transparency', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const records = await sponsorRepository.listTransparencyRecords(id);

        return ApiSuccess(res, records);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/sponsors/:id/transparency
 * Add a new transparency disclosure record
 */
router.post('/:id/transparency', async (req: express.Request, res, next) => {
    try {
        const sponsorId = parseIntParam(req.params.id, 'Sponsor ID');

        const transparencyData: SponsorTransparencyInput = {
            sponsorId,
            disclosureType: req.body.disclosureType,
            description: req.body.description,
            amount: req.body.amount,
            source: req.body.source,
            dateReported: req.body.dateReported ? new Date(req.body.dateReported) : undefined,
            isVerified: req.body.isVerified,
        };

        // Validate required fields
        if (!transparencyData.disclosureType || !transparencyData.description) {
            return ApiValidationError(res, [
                { field: 'disclosureType', message: 'Disclosure type is required' },
                { field: 'description', message: 'Description is required' }
            ].filter(err =>
                (err.field === 'disclosureType' && !transparencyData.disclosureType) ||
                (err.field === 'description' && !transparencyData.description)
            ));
        }

        const newRecord = await sponsorRepository.addTransparencyRecord(transparencyData);
        return ApiSuccess(res, newRecord, undefined, 201);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/sponsors/:id/transparency/:transparencyId
 * Update a transparency record
 */
router.put('/:id/transparency/:transparencyId', async (req: express.Request, res, next) => {
    try {
        const transparencyId = parseIntParam(req.params.transparencyId, 'Transparency ID');

        if (Object.keys(req.body).length === 0) {
            return ApiValidationError(res, [{
                field: 'body',
                message: 'Request body cannot be empty for update.'
            }]);
        }

        const updateData = getRequestBody(req);
        if (updateData.dateReported) {
            updateData.dateReported = new Date(updateData.dateReported);
        }

        const updatedRecord = await sponsorRepository.updateTransparencyRecord(transparencyId, updateData);

        if (!updatedRecord) {
            return ApiNotFound(res, `Transparency record with ID ${transparencyId} not found.`);
        }

        return ApiSuccess(res, updatedRecord);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/sponsors/:id/transparency/:transparencyId/verify
 * Mark a transparency record as verified
 */
router.post('/:id/transparency/:transparencyId/verify', async (req: express.Request, res, next) => {
    try {
        const transparencyId = parseIntParam(req.params.transparencyId, 'Transparency ID');
        const verifiedRecord = await sponsorRepository.verifyTransparencyRecord(transparencyId);

        if (!verifiedRecord) {
            return ApiNotFound(res, `Transparency record with ID ${transparencyId} not found.`);
        }

        return ApiSuccess(res, verifiedRecord);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// CONFLICT ANALYSIS ROUTES
// ============================================================================

/**
 * GET /api/sponsors/:id/conflicts
 * Detect potential conflicts of interest for a sponsor
 */
router.get('/:id/conflicts', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const conflicts = await sponsorConflictAnalysisService.detectConflicts(id);

        return ApiSuccess(res, conflicts);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sponsors/:id/risk-profile
 * Generate a comprehensive risk assessment profile
 */
router.get('/:id/risk-profile', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const riskProfile = await sponsorConflictAnalysisService.generateRiskProfile(id);

        return ApiSuccess(res, riskProfile);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sponsors/:id/conflict-trends
 * Analyze how conflicts have evolved over time
 */
router.get('/:id/conflict-trends', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const timeframe = parseOptionalIntParam(req.query.timeframe as string, 'timeframe', 12, 1, 60);

        const trends = await sponsorConflictAnalysisService.analyzeConflictTrends(id, timeframe);

        // Provide a default response if no trend data exists
        const result = trends.length > 0 ? trends[0] : {
            sponsorId: id,
            timeframe: `${timeframe} months`,
            conflictCount: 0,
            severityTrend: 'stable',
            riskScore: 0,
            predictions: []
        };

        return ApiSuccess(res, result);
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sponsors/conflicts/all
 * Detect conflicts across all active sponsors (resource-intensive)
 */
router.get('/conflicts/all', async (req, res, next) => {
    try {
        const allConflicts = await sponsorConflictAnalysisService.detectConflicts();

        // Enrich the response with sponsor metadata
        const sponsorIds = Array.from(new Set(allConflicts.map(c => c.sponsorId)));
        const sponsors = await sponsorRepository.findByIds(sponsorIds);
        const sponsorMap = new Map(sponsors.map(s => [s.id, { name: s.name, party: s.party }]));

        // Group conflicts by sponsor for better client consumption
        const conflictsBySponsor: Record<number, { sponsorInfo: any; conflicts: any[] }> = {};
        allConflicts.forEach(conflict => {
            if (!conflictsBySponsor[conflict.sponsorId]) {
                conflictsBySponsor[conflict.sponsorId] = {
                    sponsorInfo: sponsorMap.get(conflict.sponsorId) || { name: 'Unknown', party: null },
                    conflicts: []
                };
            }
            conflictsBySponsor[conflict.sponsorId].conflicts.push(conflict);
        });

        return ApiSuccess(res, {
            conflictsBySponsor: Object.values(conflictsBySponsor),
            totalConflicts: allConflicts.length,
            sponsorsAnalyzed: sponsorIds.length
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sponsors/conflicts/network
 * Generate network visualization data showing conflict relationships
 */
router.get('/conflicts/network', async (req, res, next) => {
    try {
        const billIdParam = req.query.billId as string | undefined;
        const billId = billIdParam ? parseIntParam(billIdParam, 'Bill ID') : undefined;

        const conflictMapping = await sponsorConflictAnalysisService.createConflictMapping(billId);
        return ApiSuccess(res, conflictMapping);
    } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid Bill ID')) {
            return ApiValidationError(res, [{
                field: 'billId',
                message: error.message
            }]);
        }
        next(error);
    }
});

// ============================================================================
// SPONSORSHIP ROUTES
// ============================================================================

/**
 * GET /api/sponsors/:id/sponsored-bills
 * List all bills sponsored by this sponsor
 */
router.get('/:id/sponsored-bills', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const activeOnly = req.query.activeOnly !== 'false';

        const sponsorships = await sponsorRepository.listBillSponsorshipsBySponsor(id, activeOnly);
        const billIds = sponsorships.map(s => s.billId);

        const bills = await sponsorRepository.getBillsByIds(billIds);
        const billsMap = new Map(bills.map(b => [b.id, b]));

        // Combine sponsorship and bill data
        const sponsoredBillsData = sponsorships.map(sp => ({
            sponsorshipId: sp.id,
            sponsorshipType: sp.sponsorshipType,
            sponsorshipDate: sp.sponsorshipDate,
            isActive: sp.isActive,
            bill: billsMap.get(sp.billId) || { id: sp.billId, title: "Bill details not found" }
        }));

        return ApiSuccess(res, sponsoredBillsData);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// METADATA ROUTES
// ============================================================================

/**
 * GET /api/sponsors/meta/parties
 * Get list of all unique political parties
 */
router.get('/meta/parties', async (req, res, next) => {
    try {
        const parties = await sponsorRepository.getUniqueParties();
        return ApiSuccess(res, { parties });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sponsors/meta/constituencies
 * Get list of all unique constituencies
 */
router.get('/meta/constituencies', async (req, res, next) => {
    try {
        const constituencies = await sponsorRepository.getUniqueConstituencies();
        return ApiSuccess(res, { constituencies });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/sponsors/meta/stats
 * Get overall statistics about sponsors
 */
router.get('/meta/stats', async (req, res, next) => {
    try {
        const [activeCount, parties, constituencies] = await Promise.all([
            sponsorRepository.getActiveSponsorCount(),
            sponsorRepository.getUniqueParties(),
            sponsorRepository.getUniqueConstituencies(),
        ]);

        return ApiSuccess(res, {
            totalActive: activeCount,
            partyCount: parties.length,
            constituencyCount: constituencies.length
        });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Log with structured context for debugging
    logger.error(`Error in Sponsor route ${req.method} ${req.originalUrl}:`, {
        component: 'SponsorRoutes',
        path: req.path,
        errorName: err.name,
        errorMessage: err.message
    });

    // Handle 'not found' messages from our route handlers
    if (err.message.includes('not found')) {
        return ApiNotFound(res, err.message);
    }

    // Handle Zod validation errors
    if (err instanceof z.ZodError) {
        return ApiValidationError(res, formatZodErrors(err.errors));
    }

    // Handle parameter validation errors from our helper functions
    if (err.message.startsWith('Invalid')) {
        return ApiValidationError(res, [{
            field: 'parameter',
            message: err.message
        }]);
    }

    // Handle database unique constraint violations
    if (err.message.includes('duplicate key value violates unique constraint')) {
        return ApiError(res, {
            code: 'DUPLICATE_ENTRY',
            message: 'Operation failed due to duplicate data',
            details: err.message
        });
    }

    // Generic server error fallback
    return ApiError(res, {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred processing the sponsor request.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Export the configured router
export { router };
export { router as sponsorsRouter };

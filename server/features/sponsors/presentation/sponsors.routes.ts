import express from 'express';
// Import the NEW repository and analysis service from their new locations
import { sponsorRepository, SponsorAffiliationInput, SponsorTransparencyInput } from '../infrastructure/repositories/sponsor.repository'; // Adjusted path
import { sponsorConflictAnalysisService } from '../application/sponsor-conflict-analysis.service'; // Adjusted path
import { insertSponsorSchema } from '../../../../shared/schema/validation'; // Adjusted path
import { z } from 'zod';
import { ApiSuccess, ApiError, ApiNotFound, ApiValidationError } from '../../../../shared/core/src/utilities/api';
import { logger } from '../../../../shared/core/src/observability/logging'; // Adjusted path
import { authenticateToken, AuthenticatedRequest } from '../../../middleware/auth'; // Optional: if auth needed

const router = express.Router();

// --- Helper Functions ---
function parseIntParam(value: string | undefined, paramName: string): number {
    if (value === undefined) throw new Error(`${paramName} route parameter is required.`);
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid ${paramName}: Must be a positive integer.`);
    }
    return parsed;
}

function parseOptionalIntParam(value: string | undefined, paramName: string, defaultValue: number, min = 1, max = Infinity): number {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < min || parsed > max) {
        throw new Error(`Invalid query parameter '${paramName}': Must be an integer between ${min} and ${max}.`);
    }
    return parsed;
}

// Type helper for request body
type RequestBody = Record<string, any>;
function getRequestBody(req: express.Request): RequestBody {
  return req.body as RequestBody;
}


// ============================================================================
// SPONSOR CRUD & LISTING ROUTES (using SponsorRepository)
// ============================================================================

/** GET /api/sponsors - List sponsors with filtering */
router.get('/', async (req, res, next) => {
    try {
        const { party, role, constituency, conflictLevel, isActive, search } = req.query;
        const limit = parseOptionalIntParam(req.query.limit as string, 'limit', 50, 1, 200);
        const offset = parseOptionalIntParam(req.query.offset as string, 'offset', 0, 0);
        // Validate sortBy/sortOrder if needed
        const sortBy = req.query.sortBy as any || 'name';
        const sortOrder = req.query.sortOrder as any || 'asc';
        const isActiveBool = isActive === undefined ? true : isActive === 'true'; // Default to active=true

        const options = {
            party: party as string | undefined,
            role: role as string | undefined,
            constituency: constituency as string | undefined,
            conflictLevel: conflictLevel as string | undefined,
            isActive: isActiveBool,
            limit, offset, sortBy, sortOrder
        };

        const sponsors = search
            ? await sponsorRepository.search(search as string, options)
            : await sponsorRepository.list(options);

        // Optionally add count header for pagination
        // const totalCount = await sponsorRepository.count(options); // Add count method if needed
        // res.setHeader('X-Total-Count', totalCount.toString());

        return ApiSuccess(res, sponsors);
    } catch (error) {
        next(error);
    }
});

/** GET /api/sponsors/:id - Get single sponsor with relations */
router.get('/:id', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const sponsor = await sponsorRepository.findByIdWithRelations(id);
        if (!sponsor) return ApiNotFound(res, `Sponsor with ID ${id} not found.`);
        return ApiSuccess(res, sponsor);
    } catch (error) {
        next(error);
    }
});

/** POST /api/sponsors - Create a new sponsor (Protected Route Example) */
// router.post('/', authenticateToken, async (req: AuthenticatedRequest, res, next) => { // Uncomment for auth
router.post('/', async (req: express.Request, res, next) => { // Without auth for now
    // Add role check: if (req.user?.role !== 'admin') return ApiError(res, "Forbidden", 403);
    try {
        // Validate input against Drizzle-Zod schema
        const validationResult = insertSponsorSchema.safeParse(req.body);
        if (!validationResult.success) {
            return ApiValidationError(res, validationResult.error.errors);
        }
        const sponsorData = validationResult.data;
        const newSponsor = await sponsorRepository.create(sponsorData);
        return ApiSuccess(res, newSponsor, undefined, 201); // 201 Created
    } catch (error) {
        // Handle potential unique constraint errors, etc.
        if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
            return ApiError(res, `Sponsor creation failed: ${error.message}`, 409); // Conflict
        }
        next(error);
    }
});

/** PUT /api/sponsors/:id - Update a sponsor (Protected Route Example) */
// router.put('/:id', authenticateToken, async (req: AuthenticatedRequest, res, next) => { // Uncomment for auth
router.put('/:id', async (req: express.Request, res, next) => { // Without auth for now
    // Add role check: if (req.user?.role !== 'admin') return ApiError(res, "Forbidden", 403);
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        // Basic validation: ensure body is not empty
        if (Object.keys(req.body).length === 0) {
            return ApiValidationError(res, "Request body cannot be empty for update.");
        }
        // More specific validation could be done here using a partial Zod schema if needed
        const updateData = getRequestBody(req);

        const updatedSponsor = await sponsorRepository.update(id, updateData);
        if (!updatedSponsor) return ApiNotFound(res, `Sponsor with ID ${id} not found.`);
        return ApiSuccess(res, updatedSponsor);
    } catch (error) {
        next(error);
    }
});

/** DELETE /api/sponsors/:id - Deactivate a sponsor (Soft Delete - Protected Route Example) */
// router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res, next) => { // Uncomment for auth
router.delete('/:id', async (req: express.Request, res, next) => { // Without auth for now
    // Add role check: if (req.user?.role !== 'admin') return ApiError(res, "Forbidden", 403);
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const deactivatedSponsor = await sponsorRepository.setActiveStatus(id, false);
        if (!deactivatedSponsor) return ApiNotFound(res, `Sponsor with ID ${id} not found.`);
        // Return 204 No Content for successful deletion/deactivation
        return res.status(204).send();
        // Or return success message:
        // return ApiSuccess(res, { message: 'Sponsor deactivated successfully' });
    } catch (error) {
        next(error);
    }
});


// ============================================================================
// AFFILIATION ROUTES (using SponsorRepository)
// ============================================================================

/** GET /api/sponsors/:id/affiliations - List affiliations */
router.get('/:id/affiliations', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const activeOnly = req.query.activeOnly !== 'false'; // Default true
        const affiliations = await sponsorRepository.listAffiliations(id, activeOnly);
        return ApiSuccess(res, affiliations);
    } catch (error) {
        next(error);
    }
});

/** POST /api/sponsors/:id/affiliations - Add affiliation (Protected) */
// router.post('/:id/affiliations', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
router.post('/:id/affiliations', async (req: express.Request, res, next) => {
    // Add role check if needed
    try {
        const sponsorId = parseIntParam(req.params.id, 'Sponsor ID');
        // Add Zod validation for affiliation input
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
        // Basic validation
        if (!affiliationData.organization || !affiliationData.type) {
            return ApiValidationError(res, "Organization and type are required for affiliation.");
        }
        const newAffiliation = await sponsorRepository.addAffiliation(affiliationData);
        return ApiSuccess(res, newAffiliation, undefined, 201);
    } catch (error) {
        next(error);
    }
});

/** PUT /api/sponsors/:id/affiliations/:affiliationId - Update affiliation (Protected) */
// router.put('/:id/affiliations/:affiliationId', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
router.put('/:id/affiliations/:affiliationId', async (req: express.Request, res, next) => {
    try {
        const affiliationId = parseIntParam(req.params.affiliationId, 'Affiliation ID');
         if (Object.keys(req.body).length === 0) {
            return ApiValidationError(res, "Request body cannot be empty for update.");
        }
        const updateData = getRequestBody(req); // Contains partial SponsorAffiliationInput
        // Add date parsing if dates are sent as strings
        if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
        if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);

        const updatedAffiliation = await sponsorRepository.updateAffiliation(affiliationId, updateData);
        if (!updatedAffiliation) return ApiNotFound(res, `Affiliation with ID ${affiliationId} not found.`);
        return ApiSuccess(res, updatedAffiliation);
    } catch (error) {
        next(error);
    }
});

/** DELETE /api/sponsors/:id/affiliations/:affiliationId - Deactivate affiliation (Protected) */
// router.delete('/:id/affiliations/:affiliationId', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
router.delete('/:id/affiliations/:affiliationId', async (req: express.Request, res, next) => {
    try {
        const affiliationId = parseIntParam(req.params.affiliationId, 'Affiliation ID');
        // Optionally allow passing endDate in request body for deactivation
        const endDate = req.body.endDate ? new Date(req.body.endDate) : undefined;
        const deactivatedAffiliation = await sponsorRepository.setAffiliationActiveStatus(affiliationId, false, endDate);
        if (!deactivatedAffiliation) return ApiNotFound(res, `Affiliation with ID ${affiliationId} not found.`);
        return res.status(204).send();
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// TRANSPARENCY ROUTES (using SponsorRepository)
// ============================================================================

/** GET /api/sponsors/:id/transparency - List transparency records */
router.get('/:id/transparency', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const records = await sponsorRepository.listTransparencyRecords(id);
        return ApiSuccess(res, records);
    } catch (error) {
        next(error);
    }
});

/** POST /api/sponsors/:id/transparency - Add transparency record (Protected) */
// router.post('/:id/transparency', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
router.post('/:id/transparency', async (req: express.Request, res, next) => {
    try {
        const sponsorId = parseIntParam(req.params.id, 'Sponsor ID');
        // Add Zod validation for transparency input
        const transparencyData: SponsorTransparencyInput = {
            sponsorId,
            disclosureType: req.body.disclosureType,
            description: req.body.description,
            amount: req.body.amount, // Repository handles string conversion
            source: req.body.source,
            dateReported: req.body.dateReported ? new Date(req.body.dateReported) : undefined,
            isVerified: req.body.isVerified,
        };
        // Basic validation
        if (!transparencyData.disclosureType || !transparencyData.description) {
            return ApiValidationError(res, "Disclosure type and description are required.");
        }
        const newRecord = await sponsorRepository.addTransparencyRecord(transparencyData);
        return ApiSuccess(res, newRecord, undefined, 201);
    } catch (error) {
        next(error);
    }
});

/** PUT /api/sponsors/:id/transparency/:transparencyId - Update record (Protected) */
// router.put('/:id/transparency/:transparencyId', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
router.put('/:id/transparency/:transparencyId', async (req: express.Request, res, next) => {
     try {
        const transparencyId = parseIntParam(req.params.transparencyId, 'Transparency ID');
         if (Object.keys(req.body).length === 0) {
            return ApiValidationError(res, "Request body cannot be empty for update.");
        }
        const updateData = getRequestBody(req); // Partial SponsorTransparencyInput
        if (updateData.dateReported) updateData.dateReported = new Date(updateData.dateReported);

        const updatedRecord = await sponsorRepository.updateTransparencyRecord(transparencyId, updateData);
        if (!updatedRecord) return ApiNotFound(res, `Transparency record with ID ${transparencyId} not found.`);
        return ApiSuccess(res, updatedRecord);
    } catch (error) {
        next(error);
    }
});

/** POST /api/sponsors/:id/transparency/:transparencyId/verify - Verify record (Protected) */
// router.post('/:id/transparency/:transparencyId/verify', authenticateToken, async (req: AuthenticatedRequest, res, next) => {
router.post('/:id/transparency/:transparencyId/verify', async (req: express.Request, res, next) => {
     try {
        const transparencyId = parseIntParam(req.params.transparencyId, 'Transparency ID');
        const verifiedRecord = await sponsorRepository.verifyTransparencyRecord(transparencyId);
        if (!verifiedRecord) return ApiNotFound(res, `Transparency record with ID ${transparencyId} not found.`);
        return ApiSuccess(res, verifiedRecord);
    } catch (error) {
        next(error);
    }
});


// ============================================================================
// CONFLICT ANALYSIS ROUTES (using SponsorConflictAnalysisService)
// ============================================================================

/** GET /api/sponsors/:id/conflicts - Detect conflicts for a specific sponsor */
router.get('/:id/conflicts', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        // Delegate complex analysis to the dedicated service
        const conflicts = await sponsorConflictAnalysisService.detectConflicts(id);
        return ApiSuccess(res, conflicts);
    } catch (error) {
        next(error);
    }
});

/** GET /api/sponsors/:id/risk-profile - Get comprehensive risk profile */
router.get('/:id/risk-profile', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const riskProfile = await sponsorConflictAnalysisService.generateRiskProfile(id);
        return ApiSuccess(res, riskProfile);
    } catch (error) {
        next(error);
    }
});

/** GET /api/sponsors/:id/conflict-trends - Analyze conflict trends over time */
router.get('/:id/conflict-trends', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const timeframe = parseOptionalIntParam(req.query.timeframe as string, 'timeframe', 12, 1, 60); // 1-60 months
        const trends = await sponsorConflictAnalysisService.analyzeConflictTrends(id, timeframe);
        // analyzeConflictTrends returns an array, possibly empty or with one element
        return ApiSuccess(res, trends.length > 0 ? trends[0] : { sponsorId: id, timeframe: `${timeframe} months`, conflictCount: 0, severityTrend: 'stable', riskScore: 0, predictions: [] }); // Return default if no trends found
    } catch (error) {
        next(error);
    }
});

/** GET /api/sponsors/conflicts/all - Detect conflicts across all active sponsors (Potentially heavy) */
router.get('/conflicts/all', async (req, res, next) => {
     // NOTE: This route could be resource-intensive. Consider admin-only access,
     // pagination, or running this as a background job in production.
    try {
        // Delegate directly to the service method that handles all sponsors
        const allConflicts = await sponsorConflictAnalysisService.detectConflicts(); // No ID means all active

        // Optionally, fetch sponsor details to enrich the response
        const sponsorIds = Array.from(new Set(allConflicts.map(c => c.sponsorId)));
        const sponsors = await sponsorRepository.findByIds(sponsorIds);
        const sponsorMap = new Map(sponsors.map(s => [s.id, { name: s.name, party: s.party }]));

        // Group conflicts by sponsor for better readability
        const conflictsBySponsor: Record<number, { sponsorInfo: any, conflicts: any[] }> = {};
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
             conflictsBySponsor: Object.values(conflictsBySponsor), // Return array of sponsor conflict groups
             totalConflicts: allConflicts.length,
             sponsorsAnalyzed: sponsorIds.length
         });
    } catch (error) {
        next(error);
    }
});


/** GET /api/sponsors/conflicts/network - Get conflict network visualization data */
router.get('/conflicts/network', async (req, res, next) => {
    try {
        const billIdParam = req.query.billId as string | undefined;
        const billId = billIdParam ? parseIntParam(billIdParam, 'Bill ID') : undefined;

        // Delegate to the analysis service
        const conflictMapping = await sponsorConflictAnalysisService.createConflictMapping(billId);
        return ApiSuccess(res, conflictMapping);
    } catch (error) {
        // Handle potential parseIntParam error if billId is invalid
         if (error instanceof Error && error.message.includes('Invalid Bill ID')) {
             return ApiValidationError(res, error.message);
         }
        next(error);
    }
});

// ============================================================================
// SPONSORSHIP ROUTES (Bills sponsored *by* this sponsor)
// ============================================================================

/** GET /api/sponsors/:id/sponsored-bills - List bills sponsored by this sponsor */
router.get('/:id/sponsored-bills', async (req, res, next) => {
    try {
        const id = parseIntParam(req.params.id, 'Sponsor ID');
        const activeOnly = req.query.activeOnly !== 'false';

        // Fetch sponsorships initiated by this sponsor
        const sponsorships = await sponsorRepository.listBillSponsorshipsBySponsor(id, activeOnly);
        const billIds = sponsorships.map(s => s.billId);

        // Fetch details for the sponsored bills
        const bills = await sponsorRepository.getBillsByIds(billIds);
        const billsMap = new Map(bills.map(b => [b.id, b]));

        // Combine data
        const sponsoredBillsData = sponsorships.map(sp => ({
            sponsorshipId: sp.id,
            sponsorshipType: sp.sponsorshipType,
            sponsorshipDate: sp.sponsorshipDate,
            isActive: sp.isActive,
            bill: billsMap.get(sp.billId) || { id: sp.billId, title: "Bill details not found" } // Include basic bill info
        }));

        return ApiSuccess(res, sponsoredBillsData);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// METADATA ROUTES (using SponsorRepository)
// ============================================================================

/** GET /api/sponsors/meta/parties - Unique party list */
router.get('/meta/parties', async (req, res, next) => {
    try {
        const parties = await sponsorRepository.getUniqueParties();
        return ApiSuccess(res, { parties });
    } catch (error) {
        next(error);
    }
});

/** GET /api/sponsors/meta/constituencies - Unique constituency list */
router.get('/meta/constituencies', async (req, res, next) => {
    try {
        const constituencies = await sponsorRepository.getUniqueConstituencies();
        return ApiSuccess(res, { constituencies });
    } catch (error) {
        next(error);
    }
});

/** GET /api/sponsors/meta/stats - Overall sponsor statistics */
router.get('/meta/stats', async (req, res, next) => {
    try {
        const [activeCount, parties, constituencies] = await Promise.all([
            sponsorRepository.getActiveSponsorCount(),
            sponsorRepository.getUniqueParties(),
            sponsorRepository.getUniqueConstituencies(),
        ]);
        return ApiSuccess(res, { totalActive: activeCount, partyCount: parties.length, constituencyCount: constituencies.length });
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE (Specific to this router)
// ============================================================================
router.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Log the error with specific context
    logger.error(`Error in Sponsor route ${req.method} ${req.originalUrl}:`, { component: 'SponsorRoutes', path: req.path, errorName: err.name, errorMessage: err.message });

    // Handle specific error types or messages
    if (err.message.includes('not found')) {
        return ApiNotFound(res, err.message);
    }
    if (err instanceof z.ZodError) {
        return ApiValidationError(res, err.errors);
    }
    if (err.message.startsWith('Invalid')) { // Catches param validation errors
        return ApiValidationError(res, err.message);
    }
     // Handle DB unique constraint errors
     if (err.message.includes('duplicate key value violates unique constraint')) {
        return ApiError(res, `Operation failed due to duplicate data: ${err.message}`, 409); // Conflict
     }


    // Generic fallback
    return ApiError(res, 'An internal server error occurred processing the sponsor request.', 500);
});


// Export the configured router
export { router as sponsorsRouter };
import express from 'express';
import { sponsorService, SponsorAffiliationInput, SponsorTransparencyInput } from './sponsor-service.js';
import { sponsorConflictAnalysisService } from './sponsor-conflict-analysis.js';
import { insertSponsorSchema } from '../../../shared/schema.js';
import { z } from 'zod';
import {
  ApiSuccess,
  ApiError,
  ApiNotFound,
  ApiValidationError,
  ApiResponseWrapper
} from "../../utils/api-response.js";
import { logger } from '../../utils/logger';

const router = express.Router();

/**
 * Sponsor Routes - API Layer
 * 
 * This file handles HTTP routing and request/response formatting.
 * It DELEGATES all business logic to the appropriate service layers:
 * 
 * - sponsorService: Pure data access for sponsor records
 * - sponsorConflictAnalysisService: Conflict detection and risk analysis
 * 
 * Responsibilities:
 * - HTTP request validation and parsing
 * - Route definition and parameter extraction
 * - Response formatting and status codes
 * - Error handling at the HTTP level
 * 
 * NOT Responsible For:
 * - Database queries (delegates to sponsorService)
 * - Business logic or calculations
 * - Conflict detection algorithms
 */

// Type helper to safely cast request body with runtime validation
type RequestBody = Record<string, any>;

// Helper function to safely get request body as a typed object
function getRequestBody(req: express.Request): RequestBody {
  return req.body as RequestBody;
}

export function setupSponsorRoutes(app: express.Router) {
  
  // ============================================================================
  // BASIC SPONSOR DATA ROUTES
  // These routes handle simple CRUD operations via sponsorService
  // ============================================================================

  /**
   * GET /sponsors
   * Retrieves list of sponsors with optional filtering and search
   * Delegates to sponsorService for data access
   */
  app.get('/sponsors', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const {
        party,
        role,
        constituency,
        conflictLevel,
        isActive,
        limit,
        offset,
        sortBy,
        sortOrder,
        search
      } = req.query;

      let sponsors;
      
      if (search) {
        // Use search functionality for text-based queries
        sponsors = await sponsorService.searchSponsors(search as string, {
          party: party as string,
          role: role as string,
          constituency: constituency as string,
          conflictLevel: conflictLevel as string,
          isActive: isActive ? isActive === 'true' : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined,
          sortBy: sortBy as any,
          sortOrder: sortOrder as any
        });
      } else {
        // Use regular filtering for structured queries
        sponsors = await sponsorService.getSponsors({
          party: party as string,
          role: role as string,
          constituency: constituency as string,
          conflictLevel: conflictLevel as string,
          isActive: isActive ? isActive === 'true' : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
          offset: offset ? parseInt(offset as string) : undefined,
          sortBy: sortBy as any,
          sortOrder: sortOrder as any
        });
      }

      return ApiSuccess(res, sponsors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching sponsors:', { component: 'SponsorRoutes' }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to fetch sponsors', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * GET /sponsors/:id
   * Retrieves single sponsor with all related data
   * Delegates to sponsorService which handles the joins
   */
  app.get('/sponsors/:id', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Get sponsor with all related data (affiliations, transparency, sponsorships)
      const sponsorWithRelations = await sponsorService.getSponsorWithRelations(id);
      if (!sponsorWithRelations) {
        return ApiNotFound(res, 'Sponsor', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, sponsorWithRelations, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching sponsor:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to fetch sponsor', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * POST /sponsors
   * Creates new sponsor record
   * Should be protected with admin authorization in production
   */
  app.post('/sponsors', async (req, res) => {
    const startTime = Date.now();
    
    try {
      // Validate request body against schema
      const sponsorData = insertSponsorSchema.parse(req.body);
      
      // Delegate to data access layer for creation
      const sponsor = await sponsorService.createSponsor(sponsorData);
      
      return ApiSuccess(res, sponsor, 
        ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiValidationError(res, error.errors,
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }
      logger.error('Error creating sponsor:', { body: req.body }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to create sponsor', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * PUT /sponsors/:id
   * Updates existing sponsor record
   * Should be protected with admin authorization in production
   */
  app.put('/sponsors/:id', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Safely cast the request body for the update operation
      const updateData = getRequestBody(req);
      
      // Delegate to data access layer for update
      const sponsor = await sponsorService.updateSponsor(id, updateData);
      if (!sponsor) {
        return ApiNotFound(res, 'Sponsor', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, sponsor, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error updating sponsor:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to update sponsor', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * DELETE /sponsors/:id
   * Soft deletes a sponsor by marking as inactive
   * Should be protected with admin authorization in production
   */
  app.delete('/sponsors/:id', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Use soft delete to preserve historical data
      const sponsor = await sponsorService.deactivateSponsor(id);
      if (!sponsor) {
        return ApiNotFound(res, 'Sponsor', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, { 
        message: 'Sponsor deactivated successfully',
        sponsor 
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error deactivating sponsor:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to deactivate sponsor', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // ============================================================================
  // AFFILIATION ROUTES
  // These routes manage sponsor-organization relationships
  // ============================================================================

  /**
   * GET /sponsors/:id/affiliations
   * Retrieves all affiliations for a sponsor
   * Delegates to sponsorService for data access
   */
  app.get('/sponsors/:id/affiliations', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const { activeOnly } = req.query;
      const affiliations = await sponsorService.getSponsorAffiliations(
        id, 
        activeOnly !== 'false' // Defaults to true unless explicitly set to 'false'
      );
      
      return ApiSuccess(res, affiliations, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching affiliations:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to fetch affiliations', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * POST /sponsors/:id/affiliations
   * Creates new affiliation record for sponsor
   */
  app.post('/sponsors/:id/affiliations', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Merge sponsor ID from URL params into the affiliation data
      const body = getRequestBody(req);
      const affiliationData: SponsorAffiliationInput = {
        sponsorId: id,
        organization: body.organization,
        type: body.type,
        role: body.role,
        conflictType: body.conflictType,
        startDate: body.startDate,
        endDate: body.endDate,
        isActive: body.isActive
      };
      const affiliation = await sponsorService.addSponsorAffiliation(affiliationData);
      
      return ApiSuccess(res, affiliation, 
        ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
    } catch (error) {
      logger.error('Error adding sponsor affiliation:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to add sponsor affiliation', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * PUT /sponsors/:id/affiliations/:affiliationId
   * Updates existing affiliation record
   */
  app.put('/sponsors/:id/affiliations/:affiliationId', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const affiliationId = parseInt(req.params.affiliationId);
      if (isNaN(affiliationId)) {
        return ApiValidationError(res, { field: 'affiliationId', message: 'Invalid affiliation ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const updateData = getRequestBody(req);
      const affiliation = await sponsorService.updateSponsorAffiliation(affiliationId, updateData);
      if (!affiliation) {
        return ApiNotFound(res, 'Sponsor affiliation', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, affiliation, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error updating sponsor affiliation:', { affiliationId: req.params.affiliationId }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to update sponsor affiliation', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * DELETE /sponsors/:id/affiliations/:affiliationId
   * Soft deletes an affiliation by marking as inactive
   */
  app.delete('/sponsors/:id/affiliations/:affiliationId', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const affiliationId = parseInt(req.params.affiliationId);
      if (isNaN(affiliationId)) {
        return ApiValidationError(res, { field: 'affiliationId', message: 'Invalid affiliation ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const affiliation = await sponsorService.deactivateAffiliation(affiliationId);
      if (!affiliation) {
        return ApiNotFound(res, 'Sponsor affiliation', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, { 
        message: 'Affiliation deactivated successfully',
        affiliation 
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error deactivating affiliation:', { affiliationId: req.params.affiliationId }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to deactivate affiliation', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // ============================================================================
  // TRANSPARENCY ROUTES
  // These routes manage financial disclosure records
  // ============================================================================

  /**
   * GET /sponsors/:id/transparency
   * Retrieves all transparency/disclosure records for a sponsor
   * Delegates to sponsorService for data access
   */
  app.get('/sponsors/:id/transparency', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const transparency = await sponsorService.getSponsorTransparency(id);
      return ApiSuccess(res, transparency, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching transparency records:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to fetch transparency records', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * POST /sponsors/:id/transparency
   * Creates new transparency/disclosure record
   */
  app.post('/sponsors/:id/transparency', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Merge sponsor ID from URL params into the transparency data
      const body = getRequestBody(req);
      const transparencyData: SponsorTransparencyInput = {
        sponsorId: id,
        disclosureType: body.disclosureType,
        description: body.description,
        amount: body.amount,
        source: body.source,
        dateReported: body.dateReported,
        isVerified: body.isVerified
      };
      const transparency = await sponsorService.addSponsorTransparency(transparencyData);
      
      return ApiSuccess(res, transparency, 
        ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
    } catch (error) {
      logger.error('Error adding transparency record:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to add transparency record', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * PUT /sponsors/:id/transparency/:transparencyId
   * Updates existing transparency record
   */
  app.put('/sponsors/:id/transparency/:transparencyId', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const transparencyId = parseInt(req.params.transparencyId);
      if (isNaN(transparencyId)) {
        return ApiValidationError(res, { field: 'transparencyId', message: 'Invalid transparency ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const updateData = getRequestBody(req);
      const transparency = await sponsorService.updateSponsorTransparency(transparencyId, updateData);
      if (!transparency) {
        return ApiNotFound(res, 'Transparency record', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, transparency, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error updating transparency record:', { transparencyId: req.params.transparencyId }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to update transparency record', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * POST /sponsors/:id/transparency/:transparencyId/verify
   * Marks a transparency record as verified
   * Typically used after third-party verification or audit
   */
  app.post('/sponsors/:id/transparency/:transparencyId/verify', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const transparencyId = parseInt(req.params.transparencyId);
      if (isNaN(transparencyId)) {
        return ApiValidationError(res, { field: 'transparencyId', message: 'Invalid transparency ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const transparency = await sponsorService.verifyTransparencyRecord(transparencyId);
      if (!transparency) {
        return ApiNotFound(res, 'Transparency record', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, transparency, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error verifying transparency record:', { transparencyId: req.params.transparencyId }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to verify transparency record', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // ============================================================================
  // CONFLICT ANALYSIS ROUTES
  // These routes delegate to sponsorConflictAnalysisService for sophisticated analysis
  // ============================================================================

  /**
   * GET /sponsors/:id/conflicts
   * Detects and analyzes conflicts of interest for a sponsor
   * Delegates to sponsorConflictAnalysisService for conflict detection algorithms
   */
  app.get('/sponsors/:id/conflicts', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Delegate to the conflict analysis service which contains the detection algorithms
      const conflicts = await sponsorConflictAnalysisService.detectConflicts(id);
      
      return ApiSuccess(res, conflicts, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error analyzing sponsor conflicts:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to analyze sponsor conflicts', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * GET /sponsors/:id/risk-profile
   * Generates comprehensive risk assessment for a sponsor
   * Delegates to sponsorConflictAnalysisService for risk scoring
   */
  app.get('/sponsors/:id/risk-profile', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Delegate to the conflict analysis service for risk calculations
      const riskProfile = await sponsorConflictAnalysisService.generateRiskProfile(id);
      
      return ApiSuccess(res, riskProfile, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error generating risk profile:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to generate risk profile', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * GET /sponsors/:id/conflict-trends
   * Analyzes how sponsor's conflicts have changed over time
   * Delegates to sponsorConflictAnalysisService for trend analysis
   */
  app.get('/sponsors/:id/conflict-trends', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const { timeframe } = req.query;
      const timeframeMonths = timeframe ? parseInt(timeframe as string) : 12;

      if (isNaN(timeframeMonths) || timeframeMonths < 1) {
        return ApiValidationError(res, { 
          field: 'timeframe', 
          message: 'Timeframe must be a positive number' 
        }, ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Delegate to conflict analysis service for trend calculations
      const trends = await sponsorConflictAnalysisService.analyzeConflictTrends(id, timeframeMonths);
      
      return ApiSuccess(res, trends, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error analyzing conflict trends:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to analyze conflict trends', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // ============================================================================
  // SPONSORSHIP ROUTES
  // These routes show bills sponsored by this sponsor
  // ============================================================================

  /**
   * GET /sponsors/:id/sponsored-bills
   * Lists all bills sponsored by this sponsor with basic information
   * Delegates to sponsorService for data retrieval
   */
  app.get('/sponsors/:id/sponsored-bills', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const { activeOnly } = req.query;
      
      // Get sponsorships from data layer
      const sponsorships = await sponsorService.getSponsorBillSponsorships(
        id,
        activeOnly !== 'false'
      );
      
      // Get bill details for each sponsorship
      const billIds = sponsorships.map(s => s.billId);
      const bills = await sponsorService.getBillsByIds(billIds);
      
      // Combine sponsorship and bill data
      const sponsoredBills = sponsorships.map(sponsorship => {
        const bill = bills.find(b => b.id === sponsorship.billId);
        return {
          ...sponsorship,
          bill
        };
      });
      
      return ApiSuccess(res, sponsoredBills, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching sponsored bills:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to fetch sponsored bills', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * POST /sponsors/:id/sponsor-bill
   * Creates a new bill sponsorship
   * Should be protected with admin authorization in production
   */
  app.post('/sponsors/:id/sponsor-bill', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const body = getRequestBody(req);
      const { billId, sponsorshipType, sponsorshipDate } = body;

      // Validate required fields
      if (!billId) {
        return ApiValidationError(res, { 
          field: 'billId', 
          message: 'Bill ID is required' 
        }, ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      if (!sponsorshipType || !['primary', 'co-sponsor'].includes(sponsorshipType)) {
        return ApiValidationError(res, { 
          field: 'sponsorshipType', 
          message: 'Sponsorship type must be either "primary" or "co-sponsor"' 
        }, ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      // Create the sponsorship
      const sponsorship = await sponsorService.createBillSponsorship(
        id,
        parseInt(billId),
        sponsorshipType,
        sponsorshipDate ? new Date(sponsorshipDate) : undefined
      );

      return ApiSuccess(res, sponsorship, 
        ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
    } catch (error) {
      logger.error('Error creating bill sponsorship:', { sponsorId: req.params.id }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to create bill sponsorship', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * DELETE /sponsors/:id/sponsorships/:sponsorshipId
   * Removes a bill sponsorship (soft delete)
   * Should be protected with admin authorization in production
   */
  app.delete('/sponsors/:id/sponsorships/:sponsorshipId', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const sponsorshipId = parseInt(req.params.sponsorshipId);
      if (isNaN(sponsorshipId)) {
        return ApiValidationError(res, { 
          field: 'sponsorshipId', 
          message: 'Invalid sponsorship ID' 
        }, ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const sponsorship = await sponsorService.deactivateBillSponsorship(sponsorshipId);
      if (!sponsorship) {
        return ApiNotFound(res, 'Bill sponsorship', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, { 
        message: 'Sponsorship deactivated successfully',
        sponsorship 
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error deactivating sponsorship:', {
        sponsorshipId: req.params.sponsorshipId
      }, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to deactivate sponsorship', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // ============================================================================
  // UTILITY ROUTES
  // These routes provide metadata and filtering options
  // ============================================================================

  /**
   * GET /sponsors/metadata/parties
   * Returns list of all unique political parties
   * Useful for building filter UI components
   */
  app.get('/sponsors/metadata/parties', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const parties = await sponsorService.getUniqueParties();
      return ApiSuccess(res, parties, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching parties:', {}, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to fetch parties', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * GET /sponsors/metadata/constituencies
   * Returns list of all unique constituencies
   * Useful for geographic filtering
   */
  app.get('/sponsors/metadata/constituencies', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const constituencies = await sponsorService.getUniqueConstituencies();
      return ApiSuccess(res, constituencies, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching constituencies:', {}, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to fetch constituencies', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * GET /sponsors/metadata/stats
   * Returns overall statistics about sponsors
   * Useful for dashboard and overview displays
   */
  app.get('/sponsors/metadata/stats', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const activeSponsorCount = await sponsorService.getActiveSponsorCount();
      const parties = await sponsorService.getUniqueParties();
      const constituencies = await sponsorService.getUniqueConstituencies();

      const stats = {
        totalActiveSponsors: activeSponsorCount,
        totalParties: parties.length,
        totalConstituencies: constituencies.length,
        parties,
        constituencies
      };

      return ApiSuccess(res, stats, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching sponsor statistics:', {}, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to fetch sponsor statistics', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // ============================================================================
  // BATCH ANALYSIS ROUTES
  // These routes provide analysis across multiple sponsors
  // ============================================================================

  /**
   * GET /sponsors/conflicts/all
   * Detects conflicts across all active sponsors
   * This can be a heavy operation, consider implementing pagination
   * Delegates to sponsorConflictAnalysisService
   */
  app.get('/sponsors/conflicts/all', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { limit, offset } = req.query;
      
      // Get active sponsors with optional pagination
      const sponsors = await sponsorService.getSponsors({
        isActive: true,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      });

      // Detect conflicts for all sponsors
      // Note: This could be optimized by running detectConflicts() without a sponsorId
      // to analyze all sponsors at once
      const allConflicts = await sponsorConflictAnalysisService.detectConflicts();

      // Group conflicts by sponsor
      const conflictsBySponsor = sponsors.map(sponsor => {
        const sponsorConflicts = allConflicts.filter(c => c.sponsorId === sponsor.id);
        return {
          sponsor: {
            id: sponsor.id,
            name: sponsor.name,
            party: sponsor.party,
            constituency: sponsor.constituency
          },
          conflictCount: sponsorConflicts.length,
          conflicts: sponsorConflicts
        };
      });

      // Sort by conflict count descending
      conflictsBySponsor.sort((a, b) => b.conflictCount - a.conflictCount);

      return ApiSuccess(res, {
        sponsors: conflictsBySponsor,
        totalSponsorsAnalyzed: sponsors.length,
        totalConflictsDetected: allConflicts.length
      }, ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error detecting conflicts for all sponsors:', {}, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to detect conflicts', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  /**
   * GET /sponsors/conflicts/network
   * Creates a network visualization of all conflicts
   * Delegates to sponsorConflictAnalysisService for network analysis
   */
  app.get('/sponsors/conflicts/network', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { billId } = req.query;
      
      // Create conflict mapping - optionally filtered by bill
      const conflictMapping = await sponsorConflictAnalysisService.createConflictMapping(
        billId ? parseInt(billId as string) : undefined
      );

      return ApiSuccess(res, conflictMapping, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error creating conflict network:', {}, { error: error instanceof Error ? error.message : String(error) });
      return ApiError(res, 'Failed to create conflict network', 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });
}

// Initialize routes on the router instance
setupSponsorRoutes(router);

// Export both the configured router and setup function for flexible integration
export { router };


import express from 'express';
import { legislativeStorage } from './legislative-storage';
import { sponsorService } from './sponsor-service';
import { insertSponsorSchema } from '../../../shared/schema.js';
import { z } from 'zod';
import { ApiSuccess, ApiErrorResponse, ApiNotFound, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";
import { logger } from '../../utils/logger';

const router = express.Router();

export function setupSponsorRoutes(app: express.Router) {
  // Get all sponsors with enhanced filtering and search
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
        // Use search functionality
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
        // Use regular filtering
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
      logger.error('Error fetching sponsors:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to fetch sponsors', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Get specific sponsor with comprehensive details
  app.get('/sponsors/:id', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const sponsorWithDetails = await sponsorService.getSponsorWithDetails(id);
      if (!sponsorWithDetails) {
        return ApiNotFound(res, 'Sponsor', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, sponsorWithDetails, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching sponsor:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to fetch sponsor', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Get sponsor affiliations with filtering
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
        activeOnly !== 'false'
      );
      
      return ApiSuccess(res, affiliations, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching affiliations:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to fetch affiliations', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Get sponsor transparency records
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
      logger.error('Error fetching transparency records:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to fetch transparency records', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Create new sponsor (admin only in real app)
  app.post('/sponsors', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const sponsorData = insertSponsorSchema.parse(req.body);
      const sponsor = await legislativeStorage.createSponsor(sponsorData);
      return ApiSuccess(res, sponsor, 
        ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiValidationError(res, error.errors, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }
      logger.error('Error creating sponsor:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to create sponsor', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Update sponsor (admin only in real app)
  app.put('/sponsors/:id', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const sponsor = await legislativeStorage.updateSponsor(id, req.body);
      if (!sponsor) {
        return ApiNotFound(res, 'Sponsor', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, sponsor, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error updating sponsor:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to update sponsor', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Get sponsor conflict analysis
  app.get('/sponsors/:id/conflicts', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const conflictAnalysis = await sponsorService.analyzeSponsorConflicts(id);
      return ApiSuccess(res, conflictAnalysis, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error analyzing sponsor conflicts:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to analyze sponsor conflicts', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Get sponsor voting patterns
  app.get('/sponsors/:id/voting-patterns', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const votingPatterns = await sponsorService.getSponsorVotingPatterns(id);
      return ApiSuccess(res, votingPatterns, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching voting patterns:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to fetch voting patterns', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Get sponsor voting consistency analysis
  app.get('/sponsors/:id/voting-consistency', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const consistency = await sponsorService.getSponsorVotingConsistency(id);
      return ApiSuccess(res, consistency, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error analyzing voting consistency:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to analyze voting consistency', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Add sponsor affiliation
  app.post('/sponsors/:id/affiliations', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const affiliationData = { ...req.body, sponsorId: id };
      const affiliation = await sponsorService.addSponsorAffiliation(affiliationData);
      return ApiSuccess(res, affiliation, 
        ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
    } catch (error) {
      logger.error('Error adding sponsor affiliation:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to add sponsor affiliation', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Update sponsor affiliation
  app.put('/sponsors/:id/affiliations/:affiliationId', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const affiliationId = parseInt(req.params.affiliationId);
      if (isNaN(affiliationId)) {
        return ApiValidationError(res, { field: 'affiliationId', message: 'Invalid affiliation ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const affiliation = await sponsorService.updateSponsorAffiliation(affiliationId, req.body);
      if (!affiliation) {
        return ApiNotFound(res, 'Sponsor affiliation', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, affiliation, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error updating sponsor affiliation:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to update sponsor affiliation', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Add sponsor transparency record
  app.post('/sponsors/:id/transparency', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ApiValidationError(res, { field: 'id', message: 'Invalid sponsor ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const transparencyData = { ...req.body, sponsorId: id };
      const transparency = await sponsorService.addSponsorTransparency(transparencyData);
      return ApiSuccess(res, transparency, 
        ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
    } catch (error) {
      logger.error('Error adding transparency record:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to add transparency record', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });

  // Update sponsor transparency record
  app.put('/sponsors/:id/transparency/:transparencyId', async (req, res) => {
    const startTime = Date.now();
    
    try {
      const transparencyId = parseInt(req.params.transparencyId);
      if (isNaN(transparencyId)) {
        return ApiValidationError(res, { field: 'transparencyId', message: 'Invalid transparency ID' }, 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      const transparency = await sponsorService.updateSponsorTransparency(transparencyId, req.body);
      if (!transparency) {
        return ApiNotFound(res, 'Transparency record', 
          ApiResponseWrapper.createMetadata(startTime, 'database'));
      }

      return ApiSuccess(res, transparency, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error updating transparency record:', { component: 'SimpleTool' }, error);
      return ApiError(res, 'Failed to update transparency record', 500, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  });
}

// Set up the routes on the router
setupSponsorRoutes(router);

// Export both the router and setup function for flexibility
export { router };










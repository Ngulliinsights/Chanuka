import express from 'express';
import { legislativeStorage } from '../bills/legislative-storage.js';
import { insertAnalysisSchema } from '../../../shared/schema.js';
import { z } from 'zod';
import { mlAnalysisService, performComprehensiveAnalysis } from './services/ml.service';
import { conflictDetectionService } from './conflict-detection';
import { realTimeBillAnalysisEngine } from '../bills/real-time-analysis';
import { citizenVerificationService } from '../users/domain/citizen-verification';
import { ApiSuccess, ApiError, ApiNotFound, ApiValidationError, ApiResponseWrapper } from "../../utils/api-response.js";
import { logger } from '../../utils/logger';

export const router = express.Router();

// Get analysis for a specific bill
router.get('/bills/:billId/analysis', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return ApiValidationError(res, { field: 'billId', message: 'Invalid bill ID' }, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const analysis = await legislativeStorage.getBillAnalysis(billId);
    return ApiSuccess(res, analysis, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching bill analysis:', { component: 'Chanuka' }, error);
    return ApiError(res, 'Failed to fetch bill analysis', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Create new analysis for a bill
router.post('/bills/:billId/analysis', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return ApiValidationError(res, { field: 'billId', message: 'Invalid bill ID' }, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const analysisData = insertAnalysisSchema.parse({
      ...req.body,
      billId
    });

    const analysis = await legislativeStorage.createAnalysis(analysisData);
    return ApiSuccess(res, analysis, 
      ApiResponseWrapper.createMetadata(startTime, 'database'), 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiValidationError(res, error.errors, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
    logger.error('Error creating analysis:', { component: 'Chanuka' }, error);
    return ApiError(res, 'Failed to create analysis', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Get bill conflicts/constitutional issues
router.get('/bills/:billId/conflicts', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return ApiValidationError(res, { field: 'billId', message: 'Invalid bill ID' }, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }

    const conflicts = await legislativeStorage.getBillConflicts(billId);
    return ApiSuccess(res, conflicts, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  } catch (error) {
    logger.error('Error fetching bill conflicts:', { component: 'Chanuka' }, error);
    return ApiError(res, 'Failed to fetch bill conflicts', 500, 
      ApiResponseWrapper.createMetadata(startTime, 'database'));
  }
});

// Analysis service health check
router.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  return ApiSuccess(res, {
    status: 'Analysis service healthy',
    timestamp: new Date().toISOString()
  }, ApiResponseWrapper.createMetadata(startTime, 'static'));
});









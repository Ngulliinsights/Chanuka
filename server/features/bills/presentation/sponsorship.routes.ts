import express, { Router } from 'express';
import { bills, bill_sponsorships, sponsors, sponsorTransparency, sponsorAffiliations, billSectionConflicts } from '@shared/schema/index.ts';
import { eq, desc, count, sql, and } from 'drizzle-orm';
import { asyncHandler } from '@shared/core/observability/error-management/middleware/express-error-middleware';
import { SponsorshipAnalysisService } from '../application/sponsorship-analysis.service';
import { ApiSuccess, ApiError, ApiResponseWrapper  } from '@shared/core/utils/api-utils.js';
import { logger   } from '@shared/core/src/index.js';

const router = Router();

export function setupSponsorshipRoutes(routerInstance: Router) { const analysisService = new SponsorshipAnalysisService();

  // Main sponsorship analysis endpoint
  routerInstance.get('/bills/:bill_id/sponsorship-analysis', asyncHandler(async (req, res) => {
    const startTime = Date.now();
    
    try {
      const { bill_id  } = req.params;
  const analysis = await analysisService.getComprehensiveAnalysis(parseInt(bill_id));
      return ApiSuccess(res, analysis, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching sponsorship analysis:', { component: 'Chanuka' }, error as any);
      return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to fetch sponsorship analysis' }, 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }));

  // Primary sponsor detailed analysis
  routerInstance.get('/bills/:bill_id/sponsorship-analysis/primary-sponsor', asyncHandler(async (req, res) => { const startTime = Date.now();
    
    try {
      const { bill_id  } = req.params;
      const analysis = await analysisService.getPrimarySponsorAnalysis(parseInt(bill_id));
      return ApiSuccess(res, analysis, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching primary sponsor analysis:', { component: 'Chanuka' }, error as any);
      return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to fetch primary sponsor analysis' }, 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }));

  // Co-sponsors analysis
  routerInstance.get('/bills/:bill_id/sponsorship-analysis/co-sponsors', asyncHandler(async (req, res) => { const startTime = Date.now();
    
    try {
      const { bill_id  } = req.params;
      const analysis = await analysisService.getCoSponsorsAnalysis(parseInt(bill_id));
      return ApiSuccess(res, analysis, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching co-sponsors analysis:', { component: 'Chanuka' }, error as any);
      return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to fetch co-sponsors analysis' }, 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }));

  // Financial network analysis
  routerInstance.get('/bills/:bill_id/sponsorship-analysis/financial-network', asyncHandler(async (req, res) => { const startTime = Date.now();
    
    try {
      const { bill_id  } = req.params;
      const analysis = await analysisService.getFinancialNetworkAnalysis(parseInt(bill_id));
      return ApiSuccess(res, analysis, 
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    } catch (error) {
      logger.error('Error fetching financial network analysis:', { component: 'Chanuka' }, error as any);
      return ApiError(res, { code: 'INTERNAL_ERROR', message: 'Failed to fetch financial network analysis' }, 500,
        ApiResponseWrapper.createMetadata(startTime, 'database'));
    }
  }));
}

// Set up the routes on the router
setupSponsorshipRoutes(router);

// Export both the router and setup function for flexibility
export { router };






















































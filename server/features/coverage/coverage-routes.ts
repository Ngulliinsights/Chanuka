import { Router, type Request, type Response } from 'express';
import type { Router as RouterType } from 'express';
import { logger } from '../../infrastructure/observability/core/logger';

const router: RouterType = Router();

/**
 * GET /api/coverage/report
 * Generate comprehensive coverage report
 */
router.get('/report', async (_req: Request, res: Response) => {
  try {
  // Create analyzer lazily to respect test mocks and avoid early module-side instantiation
  const { CoverageAnalyzer: Analyzer } = await import('../../services/coverage-analyzer');
  const coverageAnalyzer = new Analyzer();
  const report = await coverageAnalyzer.generateCoverageReport();
    // Ensure any Date objects are converted to ISO strings so JSON responses
    // and mocked objects remain consistent during tests
    const serializeDates = (obj: unknown): unknown => {
      if (!obj || typeof obj !== 'object') return obj;
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const val = record[key];
        if (val instanceof Date) {
          record[key] = val.toISOString();
        } else if (Array.isArray(val)) {
          val.forEach(item => serializeDates(item));
        } else if (val && typeof val === 'object') {
          serializeDates(val);
        }
      }
      return obj;
    };

    serializeDates(report);
    res.json({
      success: true,
      data: report
    });
    } catch (error) {
    logger.error({ error }, 'Error generating coverage report');
    res.status(500).json({
      success: false,
      error: 'Failed to generate coverage report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/coverage/server
 * Get server-side coverage analysis
 */
router.get('/server', async (_req: Request, res: Response) => {
  try {
  // Lazily instantiate analyzer to ensure tests that mock the class are used
  const { CoverageAnalyzer: Analyzer } = await import('../../services/coverage-analyzer');
  const coverageAnalyzer = new Analyzer();
  const coverage = await coverageAnalyzer.analyzeServerCoverage();
    // Normalize any Date instances
    const serializeDates = (obj: unknown): unknown => {
      if (!obj || typeof obj !== 'object') return obj;
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const val = record[key];
        if (val instanceof Date) {
          record[key] = val.toISOString();
        } else if (Array.isArray(val)) {
          val.forEach(item => serializeDates(item));
        } else if (val && typeof val === 'object') {
          serializeDates(val);
        }
      }
      return obj;
    };

    serializeDates(coverage);
    res.json({
      success: true,
      data: coverage
    });
    } catch (error) {
    logger.error({ error }, 'Error analyzing server coverage');
    res.status(500).json({
      success: false,
      error: 'Failed to analyze server coverage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/coverage/client
 * Get client-side coverage analysis
 */
router.get('/client', async (_req: Request, res: Response) => {
  try {
  // Lazily instantiate analyzer to ensure tests that mock the class are used
  const { CoverageAnalyzer: Analyzer } = await import('../../services/coverage-analyzer');
  const coverageAnalyzer = new Analyzer();
  const coverage = await coverageAnalyzer.analyzeClientCoverage();
    const serializeDates = (obj: unknown): unknown => {
      if (!obj || typeof obj !== 'object') return obj;
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const val = record[key];
        if (val instanceof Date) {
          record[key] = val.toISOString();
        } else if (Array.isArray(val)) {
          val.forEach(item => serializeDates(item));
        } else if (val && typeof val === 'object') {
          serializeDates(val);
        }
      }
      return obj;
    };

    serializeDates(coverage);
    res.json({
      success: true,
      data: coverage
    });
    } catch (error) {
    logger.error({ error }, 'Error analyzing client coverage');
    res.status(500).json({
      success: false,
      error: 'Failed to analyze client coverage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/coverage/integration
 * Get integration test coverage analysis
 */
router.get('/integration', async (_req: Request, res: Response) => {
  try {
  // Lazily instantiate analyzer to ensure tests that mock the class are used
  const { CoverageAnalyzer: Analyzer } = await import('../../services/coverage-analyzer');
  const coverageAnalyzer = new Analyzer();
  const coverage = await coverageAnalyzer.analyzeIntegrationCoverage();
    const serializeDates = (obj: unknown): unknown => {
      if (!obj || typeof obj !== 'object') return obj;
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const val = record[key];
        if (val instanceof Date) {
          record[key] = val.toISOString();
        } else if (Array.isArray(val)) {
          val.forEach(item => serializeDates(item));
        } else if (val && typeof val === 'object') {
          serializeDates(val);
        }
      }
      return obj;
    };

    serializeDates(coverage);
    res.json({
      success: true,
      data: coverage
    });
    } catch (error) {
    logger.error({ error }, 'Error analyzing integration coverage');
    res.status(500).json({
      success: false,
      error: 'Failed to analyze integration coverage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/coverage/gaps
 * Get coverage gaps analysis
 */
router.get('/gaps', async (_req: Request, res: Response) => {
  try {
  // Lazily instantiate analyzer to ensure tests that mock the class are used
  const { CoverageAnalyzer: Analyzer } = await import('../../services/coverage-analyzer');
  const coverageAnalyzer = new Analyzer();
  const serverCoverage = await coverageAnalyzer.analyzeServerCoverage();
  const clientCoverage = await coverageAnalyzer.analyzeClientCoverage();
  const integrationCoverage = await coverageAnalyzer.analyzeIntegrationCoverage();
    
    const gaps = await coverageAnalyzer.identifyGaps([
      serverCoverage,
      clientCoverage,
      integrationCoverage
    ]);
    
    // Normalize Dates in the gaps and summary objects if present
    const serializeDates = (obj: unknown): unknown => {
      if (!obj || typeof obj !== 'object') return obj;
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const val = record[key];
        if (val instanceof Date) {
          record[key] = val.toISOString();
        } else if (Array.isArray(val)) {
          val.forEach(item => serializeDates(item));
        } else if (val && typeof val === 'object') {
          serializeDates(val);
        }
      }
      return obj;
    };

    serializeDates(serverCoverage);
    serializeDates(clientCoverage);
    serializeDates(integrationCoverage);

    res.json({
      success: true,
      data: {
        gaps,
        summary: {
          total: gaps.length,
          critical: gaps.filter(g => g.severity === 'critical').length,
          high: gaps.filter(g => g.severity === 'high').length,
          medium: gaps.filter(g => g.severity === 'medium').length,
          low: gaps.filter(g => g.severity === 'low').length
        }
      }
    });
  } catch (error) {
    logger.error({ error }, 'Error analyzing coverage gaps');
    res.status(500).json({
      success: false,
      error: 'Failed to analyze coverage gaps',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/coverage/analyze
 * Trigger fresh coverage analysis
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    
    let result;
    // Lazily instantiate analyzer to ensure tests that mock the class are used
    const { CoverageAnalyzer: Analyzer } = await import('../../services/coverage-analyzer');
    const coverageAnalyzer = new Analyzer();
    switch (type) {
      case 'server':
        result = await coverageAnalyzer.analyzeServerCoverage();
        break;
      case 'client':
        result = await coverageAnalyzer.analyzeClientCoverage();
        break;
      case 'integration':
        result = await coverageAnalyzer.analyzeIntegrationCoverage();
        break;
      case 'all':
      default:
        result = await coverageAnalyzer.generateCoverageReport();
        break;
    }
    
    // Ensure date normalization for returned result
    const serializeDates = (obj: unknown): unknown => {
      if (!obj || typeof obj !== 'object') return obj;
      const record = obj as Record<string, unknown>;
      for (const key of Object.keys(record)) {
        const val = record[key];
        if (val instanceof Date) {
          record[key] = val.toISOString();
        } else if (Array.isArray(val)) {
          val.forEach(item => serializeDates(item));
        } else if (val && typeof val === 'object') {
          serializeDates(val);
        }
      }
      return obj;
    };

    serializeDates(result);

    res.json({
      success: true,
      data: result,
      message: `Coverage analysis completed for ${type || 'all'} tests`
    });
  } catch (error) {
    logger.error({ error }, 'Error running coverage analysis');
    res.status(500).json({
      success: false,
      error: 'Failed to run coverage analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;













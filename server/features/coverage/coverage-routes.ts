import { Router } from 'express';
import { CoverageAnalyzer } from '../../services/coverage-analyzer';

const router = Router();

/**
 * GET /api/coverage/report
 * Generate comprehensive coverage report
 */
router.get('/report', async (req, res) => {
  try {
  // Create analyzer lazily to respect test mocks and avoid early module-side instantiation
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { CoverageAnalyzer: Analyzer } = await import('../../services/coverage-analyzer');
  const coverageAnalyzer = new Analyzer();
  const report = await coverageAnalyzer.generateCoverageReport();
    // Ensure any Date objects are converted to ISO strings so JSON responses
    // and mocked objects remain consistent during tests
    const serializeDates = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val instanceof Date) {
          obj[key] = val.toISOString();
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
    // Lazy-load logger to avoid initializing config during module import
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { logger } = require('../../utils/logger');
      logger.error('Error generating coverage report:', { error });
    } catch (e) {
      // Fallback
      // eslint-disable-next-line no-console
      console.error('Error generating coverage report:', error);
    }
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
router.get('/server', async (req, res) => {
  try {
  // Lazily instantiate analyzer to ensure tests that mock the class are used
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { CoverageAnalyzer: Analyzer } = await import('../../services/coverage-analyzer');
  const coverageAnalyzer = new Analyzer();
  const coverage = await coverageAnalyzer.analyzeServerCoverage();
    // Normalize any Date instances
    const serializeDates = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val instanceof Date) {
          obj[key] = val.toISOString();
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
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { logger } = require('../../utils/logger');
      logger.error('Error analyzing server coverage:', { error });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error analyzing server coverage:', error);
    }
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
router.get('/client', async (req, res) => {
  try {
  // Lazily instantiate analyzer to ensure tests that mock the class are used
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { CoverageAnalyzer: Analyzer } = await import('../../services/coverage-analyzer');
  const coverageAnalyzer = new Analyzer();
  const coverage = await coverageAnalyzer.analyzeClientCoverage();
    const serializeDates = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val instanceof Date) {
          obj[key] = val.toISOString();
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
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { logger } = require('../../utils/logger');
      logger.error('Error analyzing client coverage:', { error });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error analyzing client coverage:', error);
    }
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
router.get('/integration', async (req, res) => {
  try {
  // Lazily instantiate analyzer to ensure tests that mock the class are used
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { CoverageAnalyzer: Analyzer } = await import('../../services/coverage-analyzer');
  const coverageAnalyzer = new Analyzer();
  const coverage = await coverageAnalyzer.analyzeIntegrationCoverage();
    const serializeDates = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val instanceof Date) {
          obj[key] = val.toISOString();
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
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { logger } = require('../../utils/logger');
      logger.error('Error analyzing integration coverage:', { error });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error analyzing integration coverage:', error);
    }
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
router.get('/gaps', async (req, res) => {
  try {
  // Lazily instantiate analyzer to ensure tests that mock the class are used
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    const serializeDates = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val instanceof Date) {
          obj[key] = val.toISOString();
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
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { logger } = require('../../utils/logger');
      logger.error('Error analyzing coverage gaps:', { error });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error analyzing coverage gaps:', error);
    }
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
router.post('/analyze', async (req, res) => {
  try {
    const { type } = req.body;
    
    let result;
    // Lazily instantiate analyzer to ensure tests that mock the class are used
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    const serializeDates = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val instanceof Date) {
          obj[key] = val.toISOString();
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
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { logger } = require('../../utils/logger');
      logger.error('Error running coverage analysis:', { error });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error running coverage analysis:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to run coverage analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;










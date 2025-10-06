import { Router } from 'express';
import { CoverageAnalyzer } from '../../services/coverage-analyzer';

const router = Router();
const coverageAnalyzer = new CoverageAnalyzer();

/**
 * GET /api/coverage/report
 * Generate comprehensive coverage report
 */
router.get('/report', async (req, res) => {
  try {
    const report = await coverageAnalyzer.generateCoverageReport();
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating coverage report:', error);
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
    const coverage = await coverageAnalyzer.analyzeServerCoverage();
    res.json({
      success: true,
      data: coverage
    });
  } catch (error) {
    console.error('Error analyzing server coverage:', error);
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
    const coverage = await coverageAnalyzer.analyzeClientCoverage();
    res.json({
      success: true,
      data: coverage
    });
  } catch (error) {
    console.error('Error analyzing client coverage:', error);
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
    const coverage = await coverageAnalyzer.analyzeIntegrationCoverage();
    res.json({
      success: true,
      data: coverage
    });
  } catch (error) {
    console.error('Error analyzing integration coverage:', error);
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
    const serverCoverage = await coverageAnalyzer.analyzeServerCoverage();
    const clientCoverage = await coverageAnalyzer.analyzeClientCoverage();
    const integrationCoverage = await coverageAnalyzer.analyzeIntegrationCoverage();
    
    const gaps = await coverageAnalyzer.identifyGaps([
      serverCoverage,
      clientCoverage,
      integrationCoverage
    ]);
    
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
    console.error('Error analyzing coverage gaps:', error);
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
    
    res.json({
      success: true,
      data: result,
      message: `Coverage analysis completed for ${type || 'all'} tests`
    });
  } catch (error) {
    console.error('Error running coverage analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run coverage analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
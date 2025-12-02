import { Router } from 'express';
import { performanceMonitor   } from '@shared/core';
import { logger   } from '@shared/core';
import { errorTracker } from '@server/core/errors/error-tracker.ts';

export const router = Router();

/**
 * Performance Dashboard API Routes
 *
 * Provides endpoints for performance monitoring, budget tracking,
 * and trend analysis in the analytics dashboard.
 */

// Get current performance status
router.get('/status', async (req, res) => {
  try {
    const status = performanceMonitor.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Failed to get performance status', {
      component: 'performance-dashboard',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance status',
    });
  }
});

// Get performance report
router.get('/report', async (req, res) => {
  try {
    const report = performanceMonitor.generateReport();
    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Failed to generate performance report', {
      component: 'performance-dashboard',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report',
    });
  }
});

// Get Core Web Vitals metrics
router.get('/core-web-vitals', async (req, res) => {
  try {
    const report = performanceMonitor.generateReport();
    const coreWebVitals = report.metrics.filter(m =>
      ['lcp', 'fid', 'cls', 'fcp', 'ttfb'].includes(m.name)
    );

    // Group by metric type
    const vitals = coreWebVitals.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push({
        value: metric.value,
        timestamp: metric.timestamp,
        unit: metric.unit,
      });
      return acc;
    }, {} as Record<string, Array<{value: number, timestamp: number, unit: string}>>);

    res.json({
      success: true,
      data: {
        vitals,
        latest: Object.fromEntries(
          Object.entries(vitals).map(([key, values]) => [
            key,
            values.sort((a, b) => b.timestamp - a.timestamp)[0]
          ])
        ),
      },
    });
  } catch (error) {
    logger.error('Failed to get Core Web Vitals', {
      component: 'performance-dashboard',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Core Web Vitals',
    });
  }
});

// Get bundle size metrics
router.get('/bundle-metrics', async (req, res) => {
  try {
    const report = performanceMonitor.generateReport();
    const bundleMetrics = report.metrics.filter(m =>
      m.name.includes('Size') || m.metadata?.bundle
    );

    res.json({
      success: true,
      data: {
        metrics: bundleMetrics,
        summary: {
          totalJsSize: bundleMetrics.find(m => m.name === 'totalJsSize')?.value,
          initialChunkSize: bundleMetrics.find(m => m.name === 'initialChunkSize')?.value,
          largestChunkSize: bundleMetrics.find(m => m.name === 'largestChunkSize')?.value,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get bundle metrics', {
      component: 'performance-dashboard',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve bundle metrics',
    });
  }
});

// Get budget violations
router.get('/violations', async (req, res) => {
  try {
    const report = performanceMonitor.generateReport();

    // Group violations by severity
    const violations = report.violations.reduce((acc, violation) => {
      const severity = violation.severity;
      if (!acc[severity]) {
        acc[severity] = [];
      }
      acc[severity].push({
        budget: violation.budget.name,
        description: violation.budget.description,
        expected: violation.threshold,
        actual: violation.actualValue,
        unit: violation.budget.unit,
        timestamp: violation.timestamp,
      });
      return acc;
    }, {} as Record<string, Array<{
      budget: string;
      description: string;
      expected: number;
      actual: number;
      unit: string;
      timestamp: number;
    }>>);

    res.json({
      success: true,
      data: {
        violations,
        summary: {
          total: report.violations.length,
          errors: violations.error?.length || 0,
          warnings: violations.warning?.length || 0,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get budget violations', {
      component: 'performance-dashboard',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve budget violations',
    });
  }
});

// Get performance trends (requires historical data)
router.get('/trends', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const daysNum = parseInt(days as string) || 7;

    // This would typically read from a database or file system
    // For now, return current metrics as a placeholder
    const report = performanceMonitor.generateReport();

    res.json({
      success: true,
      data: {
        period: `${daysNum} days`,
        trends: report.metrics.map(metric => ({
          metric: metric.name,
          current: metric.value,
          unit: metric.unit,
          // Placeholder for trend data - would be calculated from historical data
          trend: 'stable',
          changePercent: 0,
        })),
        healthScore: report.healthScore,
      },
    });
  } catch (error) {
    logger.error('Failed to get performance trends', {
      component: 'performance-dashboard',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance trends',
    });
  }
});

// Record manual performance metric (for testing/debugging)
router.post('/record-metric', async (req, res) => {
  try {
    const { name, value, unit, metadata } = req.body;

    if (!name || typeof value !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Metric name and numeric value are required',
      });
    }

    performanceMonitor.recordMetric({
      name,
      value,
      unit: unit || '',
      metadata: metadata || {},
    });

    res.json({
      success: true,
      message: 'Metric recorded successfully',
    });
  } catch (error) {
    logger.error('Failed to record metric', {
      component: 'performance-dashboard',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to record metric',
    });
  }
});

// Get performance recommendations
router.get('/recommendations', async (req, res) => {
  try {
    const report = performanceMonitor.generateReport();

    res.json({
      success: true,
      data: {
        recommendations: report.recommendations,
        healthScore: report.healthScore,
        violationsCount: report.violations.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get recommendations', {
      component: 'performance-dashboard',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve recommendations',
    });
  }
});

// Health check for performance monitoring
router.get('/health', async (req, res) => {
  try {
    const status = performanceMonitor.getStatus();
    const isHealthy = status.healthScore >= 70 && status.violationsCount === 0;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      monitoring: status.isMonitoring,
      healthScore: status.healthScore,
      violations: status.violationsCount,
      lastMetric: status.lastMetricTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Performance monitoring health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;


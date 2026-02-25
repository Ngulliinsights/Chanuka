/**
 * Constitutional Intelligence API Routes
 */

import { Router } from 'express';
import { constitutionalService } from './application/constitutional-service';

const router = Router();

// Analyze bill for constitutional compliance
router.post('/analyze', async (req, res) => {
  try {
    const { billId, billText, billTitle, billType, affectedInstitutions, proposedChanges } = req.body;

    if (!billId || !billText || !billTitle || !billType) {
      return res.status(400).json({
        error: 'Missing required fields: billId, billText, billTitle, billType'
      });
    }

    const result = await constitutionalService.analyzeBill({
      billId,
      billText,
      billTitle,
      billType,
      affectedInstitutions,
      proposedChanges,
    });

    res.json({
      success: true,
      analysis: result
    });
  } catch (error) {
    console.error('Error analyzing bill:', error);
    res.status(500).json({ error: 'Failed to analyze bill' });
  }
});

// Get constitutional analysis for a bill
router.get('/bill/:billId', async (req, res) => {
  try {
    const { billId } = req.params;

    const analysis = await constitutionalService.getAnalysis(billId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found for bill'
      });
    }

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// Get constitutional statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await constitutionalService.getStatistics();

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Clear analysis cache
router.delete('/cache/:billId', async (req, res) => {
  try {
    const { billId } = req.params;

    await constitutionalService.clearCache(billId);

    res.json({
      success: true,
      message: 'Cache cleared'
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Expert review endpoints
router.post('/review/request', async (req, res) => {
  try {
    const { analysisId, billId, expertIds } = req.body;

    if (!analysisId || !billId || !expertIds || !Array.isArray(expertIds)) {
      return res.status(400).json({
        error: 'Missing required fields: analysisId, billId, expertIds (array)'
      });
    }

    const reviews = await constitutionalService.createReviewRequest(analysisId, billId, expertIds);

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Error creating review request:', error);
    res.status(500).json({ error: 'Failed to create review request' });
  }
});

router.post('/review/submit', async (req, res) => {
  try {
    const { analysisId, billId, expertId, status, comments, recommendations } = req.body;

    if (!analysisId || !billId || !expertId || !status || !comments) {
      return res.status(400).json({
        error: 'Missing required fields: analysisId, billId, expertId, status, comments'
      });
    }

    if (!['approved', 'rejected', 'needs_revision'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Must be: approved, rejected, or needs_revision'
      });
    }

    const review = await constitutionalService.submitReview({
      analysisId,
      billId,
      expertId,
      status,
      comments,
      recommendations
    });

    res.json({
      success: true,
      review
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

router.get('/review/analysis/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;

    const reviews = await constitutionalService.getReviewsForAnalysis(analysisId);

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.get('/review/pending/:expertId', async (req, res) => {
  try {
    const { expertId } = req.params;

    const reviews = await constitutionalService.getPendingReviews(expertId);

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
});

router.get('/review/statistics', async (req, res) => {
  try {
    const stats = await constitutionalService.getReviewStatistics();

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching review statistics:', error);
    res.status(500).json({ error: 'Failed to fetch review statistics' });
  }
});

// Monitoring endpoints
router.get('/monitoring/metrics', async (req, res) => {
  try {
    const metrics = await constitutionalService.getMonitoringMetrics();

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error fetching monitoring metrics:', error);
    res.status(500).json({ error: 'Failed to fetch monitoring metrics' });
  }
});

router.get('/monitoring/health', async (req, res) => {
  try {
    const health = await constitutionalService.healthCheck();

    res.json({
      success: true,
      health
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({ error: 'Failed to check health' });
  }
});

export default router;

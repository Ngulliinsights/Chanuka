/**
 * Argument Intelligence API Routes
 */

import { Router } from 'express';

import { argumentIntelligenceService } from './application/argument-intelligence-service';
import { nlpPipelineConfig } from './application/nlp-pipeline-config';
import { commentIntegrationService } from './application/comment-integration';

const router = Router();

// Process comment into argument
router.post('/process', async (req, res) => {
  try {
    const { commentText, billId, userId } = req.body;

    if (!commentText || !billId || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: commentText, billId, userId'
      });
    }

    const argument = await argumentIntelligenceService.processComment({
      text: commentText,
      billId,
      userId
    });

    res.status(201).json({
      success: true,
      argument: {
        id: argument.id,
        claims: argument.claims.length,
        evidence: argument.evidence.length,
        position: argument.position,
        strength: argument.strength
      }
    });
  } catch (error) {
    console.error('Error processing comment:', error);
    res.status(500).json({ error: 'Failed to process comment' });
  }
});

// Process comment with full analysis
router.post('/process-comment', async (req, res) => {
  try {
    const { commentId, commentText, billId, userId } = req.body;

    if (!commentId || !commentText || !billId || !userId) {
      return res.status(400).json({
        error: 'Missing required fields: commentId, commentText, billId, userId'
      });
    }

    const analysis = await commentIntegrationService.processComment(
      commentId,
      commentText,
      billId,
      userId
    );

    res.status(200).json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error processing comment:', error);
    res.status(500).json({ error: 'Failed to process comment' });
  }
});

// Batch process comments
router.post('/batch-process', async (req, res) => {
  try {
    const { comments } = req.body;

    if (!Array.isArray(comments) || comments.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid comments array'
      });
    }

    const results = await commentIntegrationService.batchProcessComments(comments);

    res.status(200).json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Error batch processing comments:', error);
    res.status(500).json({ error: 'Failed to batch process comments' });
  }
});

// Get comment analysis
router.get('/comment/:commentId/analysis', async (req, res) => {
  try {
    const { commentId } = req.params;

    const analysis = await commentIntegrationService.getCommentAnalysis(commentId);

    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found for comment'
      });
    }

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error fetching comment analysis:', error);
    res.status(500).json({ error: 'Failed to fetch comment analysis' });
  }
});

// Get bill comment analysis
router.get('/bill/:billId/analysis', async (req, res) => {
  try {
    const { billId } = req.params;

    const analysis = await commentIntegrationService.getBillCommentAnalysis(billId);

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error fetching bill analysis:', error);
    res.status(500).json({ error: 'Failed to fetch bill analysis' });
  }
});

// Get arguments for a bill
router.get('/bill/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const arguments = await argumentIntelligenceService.getArgumentsByBill(billId);

    res.json({
      success: true,
      count: arguments.length,
      arguments
    });
  } catch (error) {
    console.error('Error fetching arguments:', error);
    res.status(500).json({ error: 'Failed to fetch arguments' });
  }
});

// Cluster arguments for a bill
router.post('/cluster/:billId', async (req, res) => {
  try {
    const { billId } = req.params;
    const { method = 'kmeans', maxClusters } = req.body;

    const clusters = await argumentIntelligenceService.clusterArguments(billId, {
      method,
      maxClusters
    });

    res.json({
      success: true,
      billId,
      clusters: clusters.map(c => ({
        id: c.id,
        name: c.name,
        size: c.size,
        position: c.position,
        cohesion: c.cohesion,
        representativeClaims: c.representativeClaims.slice(0, 3)
      }))
    });
  } catch (error) {
    console.error('Error clustering arguments:', error);
    res.status(500).json({ error: 'Failed to cluster arguments' });
  }
});

// Analyze sentiment
router.post('/sentiment', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }

    const result = await nlpPipelineConfig.analyzeSentiment(text);

    res.json({
      success: true,
      sentiment: result
    });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// Calculate quality metrics
router.post('/quality', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }

    const result = await nlpPipelineConfig.calculateQuality(text);

    res.json({
      success: true,
      quality: result
    });
  } catch (error) {
    console.error('Error calculating quality:', error);
    res.status(500).json({ error: 'Failed to calculate quality' });
  }
});

// Get NLP pipeline configuration
router.get('/config', async (req, res) => {
  try {
    const config = nlpPipelineConfig.getConfig();

    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Update NLP pipeline configuration
router.put('/config', async (req, res) => {
  try {
    const updates = req.body;

    nlpPipelineConfig.updateConfig(updates);

    res.json({
      success: true,
      config: nlpPipelineConfig.getConfig()
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Get NLP pipeline statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = nlpPipelineConfig.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Clear NLP caches
router.post('/cache/clear', async (req, res) => {
  try {
    nlpPipelineConfig.clearCaches();

    res.json({
      success: true,
      message: 'All caches cleared'
    });
  } catch (error) {
    console.error('Error clearing caches:', error);
    res.status(500).json({ error: 'Failed to clear caches' });
  }
});

// Prune expired cache entries
router.post('/cache/prune', async (req, res) => {
  try {
    const pruned = nlpPipelineConfig.pruneExpiredCaches();

    res.json({
      success: true,
      pruned
    });
  } catch (error) {
    console.error('Error pruning caches:', error);
    res.status(500).json({ error: 'Failed to prune caches' });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    const health = await nlpPipelineConfig.healthCheck();

    res.json({
      success: true,
      ...health
    });
  } catch (error) {
    console.error('Error checking health:', error);
    res.status(500).json({ error: 'Failed to check health' });
  }
});

export default router;

/**
 * Argument Intelligence API Routes
 */

import { Router } from 'express';

import { argumentIntelligenceService } from './application/argument-intelligence-service';

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

export default router;

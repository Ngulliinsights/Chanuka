import express from 'express';
import { legislativeStorage } from '../storage/legislative-storage.js';
import { insertAnalysisSchema } from '../../shared/schema.js';
import { z } from 'zod';
import { mlAnalysisService, performComprehensiveAnalysis } from '../services/ml-analysis';
import { conflictDetectionService } from '../services/conflict-detection';
import { realTimeBillAnalysisEngine } from '../services/real-time-analysis';
import { citizenVerificationService } from '../services/citizen-verification';

export const router = express.Router();

// Get analysis for a specific bill
router.get('/bills/:billId/analysis', async (req, res) => {
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return res.status(400).json({ error: 'Invalid bill ID' });
    }

    const analysis = await legislativeStorage.getBillAnalysis(billId);
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching bill analysis:', error);
    res.status(500).json({ error: 'Failed to fetch bill analysis' });
  }
});

// Create new analysis for a bill
router.post('/bills/:billId/analysis', async (req, res) => {
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return res.status(400).json({ error: 'Invalid bill ID' });
    }

    const analysisData = insertAnalysisSchema.parse({
      ...req.body,
      billId
    });

    const analysis = await legislativeStorage.createAnalysis(analysisData);
    res.status(201).json(analysis);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid analysis data', details: error.errors });
    }
    console.error('Error creating analysis:', error);
    res.status(500).json({ error: 'Failed to create analysis' });
  }
});

// Get bill conflicts/constitutional issues
router.get('/bills/:billId/conflicts', async (req, res) => {
  try {
    const billId = parseInt(req.params.billId);
    if (isNaN(billId)) {
      return res.status(400).json({ error: 'Invalid bill ID' });
    }

    const conflicts = await legislativeStorage.getBillConflicts(billId);
    res.json(conflicts);
  } catch (error) {
    console.error('Error fetching bill conflicts:', error);
    res.status(500).json({ error: 'Failed to fetch bill conflicts' });
  }
});

// Analysis service health check
router.get('/health', async (req, res) => {
  res.json({
    status: 'Analysis service healthy',
    timestamp: new Date().toISOString()
  });
});
/**
 * USSD Routes
 * 
 * Express routes for USSD service endpoints
 */

import { Router } from 'express';
import { ussdController } from './ussd.controller';

const router = Router();

// Main USSD endpoint (called by gateway)
router.post('/ussd', (req, res) => ussdController.handleUSSDRequest(req, res));

// Health check
router.get('/ussd/health', (req, res) => ussdController.healthCheck(req, res));

export default router;

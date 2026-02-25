/**
 * USSD Controller
 * 
 * HTTP endpoint handler for USSD gateway requests
 */

import { Request, Response } from 'express';
import { logger } from '@server/infrastructure/observability';
import { ussdService } from './ussd.service';
import type { USSDRequest } from './ussd.types';

export class USSDController {
  /**
   * Handle incoming USSD request from gateway
   */
  async handleUSSDRequest(req: Request, res: Response): Promise<void> {
    const logContext = { component: 'USSDController', operation: 'handleUSSDRequest' };
    logger.info(logContext, 'Received USSD request');

    try {
      // Parse request body (format depends on gateway)
      const ussdRequest: USSDRequest = {
        sessionId: req.body.sessionId || req.body.session_id || '',
        serviceCode: req.body.serviceCode || req.body.service_code || '',
        phoneNumber: req.body.phoneNumber || req.body.phone_number || '',
        text: req.body.text || '',
        networkCode: req.body.networkCode || req.body.network_code
      };

      // Validate request
      if (!ussdRequest.sessionId || !ussdRequest.phoneNumber) {
        logger.warn({ ...logContext, body: req.body }, 'Invalid USSD request');
        res.status(400).send('END Invalid request');
        return;
      }

      // Process request
      const response = await ussdService.processRequest(ussdRequest);

      // Send response
      res.set('Content-Type', 'text/plain');
      res.send(response.message);

      logger.info({ ...logContext, sessionId: ussdRequest.sessionId }, 'USSD request handled');
    } catch (error) {
      logger.error({ ...logContext, error }, 'Error handling USSD request');
      res.status(500).send('END Service error. Please try again.');
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(_req: Request, res: Response): Promise<void> {
    res.json({
      status: 'healthy',
      service: 'ussd',
      timestamp: new Date().toISOString()
    });
  }
}

export const ussdController = new USSDController();

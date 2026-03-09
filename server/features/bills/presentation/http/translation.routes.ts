import { Router, type Request, type Response } from 'express';
import { translationService } from '../../application/translation.service';
import { impactCalculator } from '../../application/impact-calculator.service';

export const translationRouter: Router = Router();

/**
 * POST /api/bills/:billId/translate
 * Translate bill clauses to plain language
 */
translationRouter.post('/:billId/translate', async (req: Request, res: Response): Promise<void> => {
  try {
    const billId = req.params.billId;
    if (!billId) {
      res.status(400).json({ error: 'billId is required' });
      return;
    }
    
    const { clauseRef, fullBill } = req.body;

    const translation = await translationService.translate({
      billId,
      clauseRef,
      fullBill: fullBill || false
    });

    res.json(translation);
  } catch (error: any) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      error: 'Failed to translate bill',
      message: error.message 
    });
  }
});

/**
 * GET /api/bills/:billId/clauses
 * Get available clauses for translation
 */
translationRouter.get('/:billId/clauses', async (req: Request, res: Response): Promise<void> => {
  try {
    const billId = req.params.billId;
    if (!billId) {
      res.status(400).json({ error: 'billId is required' });
      return;
    }
    
    const clauses = await translationService.getAvailableClauses(billId);
    res.json({ clauses });
  } catch (error: any) {
    console.error('Get clauses error:', error);
    res.status(500).json({ 
      error: 'Failed to get clauses',
      message: error.message 
    });
  }
});

/**
 * POST /api/bills/:billId/calculate-impact
 * Calculate personal impact of a bill
 */
translationRouter.post('/:billId/calculate-impact', async (req: Request, res: Response): Promise<void> => {
  try {
    const billId = req.params.billId;
    if (!billId) {
      res.status(400).json({ error: 'billId is required' });
      return;
    }
    
    const userContext = req.body;

    const impact = await impactCalculator.calculateImpact({
      billId,
      userContext
    });

    res.json(impact);
  } catch (error: any) {
    console.error('Impact calculation error:', error);
    res.status(400).json({ 
      error: 'Failed to calculate impact',
      message: error.message 
    });
  }
});

export default translationRouter;

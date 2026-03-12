import { Request, Response } from 'express';
import { logger } from '@server/infrastructure/observability';
import { marketService } from './market.service';

export const marketController = {
  addPrice: async (req: Request, res: Response): Promise<void> => {
    const { productId, price, currency, location } = req.body;
    const result = await marketService.addPrice(productId, price, currency, location);

    if (result.isOk()) {
      res.status(201).json({ message: 'Price signal recorded successfully' });
    } else {
      logger.error({ error: result.error }, 'Failed to record price signal');
      res.status(500).json({ error: 'Failed to record price signal' });
    }
  },

  getMetrics: async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    const result = await marketService.getMarketMetrics(productId);

    if (result.isOk()) {
      res.json(result.value);
    } else {
      const error = result.error;
      const status = error.name === 'NotFoundError' ? 404 : 500;
      res.status(status).json({ error: error.message });
    }
  },

  getPriceHistory: async (req: Request, res: Response): Promise<void> => {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;

    const result = await marketService.getPriceHistory(productId, limit);

    if (result.isOk()) {
      res.json(result.value);
    } else {
      res.status(500).json({ error: 'Failed to retrieve price history' });
    }
  }
};
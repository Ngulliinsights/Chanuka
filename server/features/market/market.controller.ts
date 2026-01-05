import { Router, Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPost } from 'inversify-express-utils';
import { MarketService } from './market.service';

@controller('/api/market')
export class MarketController {
  constructor(@inject(MarketService) private marketService: MarketService) {}

  @httpPost('/price')
  async addPrice(req: Request, res: Response): Promise<void> {
    try {
      const { productId, price, currency, location } = req.body;

      if (!productId || !price || !currency) {
        res.status(400).json({ error: 'Missing required fields: productId, price, currency' });
        return;
      }

      await this.marketService.addPrice(productId, Number(price), currency, location);
      res.status(201).json({ message: 'Price signal recorded successfully' });
    } catch (error) {
      console.error("Market Signal Error:", error);
      res.status(500).json({ error: 'Failed to record price signal' });
    }
  }

  @httpGet('/metrics/:productId')
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const metrics = await this.marketService.getMarketMetrics(productId);

      if (!metrics) {
        res.status(404).json({ error: 'Insufficient data for this commodity' });
        return;
      }

      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to calculate metrics' });
    }
  }

  @httpGet('/history/:productId')
  async getPriceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const limit = parseInt(req.query.limit as string) || 30;

      const history = await this.marketService.getPriceHistory(productId, limit);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve price history' });
    }
  }
}
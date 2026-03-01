import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPost } from 'inversify-express-utils';

import { LedgerService } from './ledger.service';

@controller('/api/ledger')
export class LedgerController {
  constructor(@inject(LedgerService) private ledgerService: LedgerService) {}

  @httpPost('/record')
  async recordAction(req: Request, res: Response): Promise<void> {
    try {
      const { action, actor, resource, details } = req.body;

      // Basic validation
      if (!action || !actor) {
        res.status(400).json({ error: 'Missing required fields: action, actor' });
        return;
      }

      const id = await this.ledgerService.recordAction(
        action,
        actor,
        resource || 'Manual Entry',
        details || {}
      );
      res.status(201).json({ id, message: 'Violation recorded in Shadow Ledger' });
    } catch (error) {
      // In production, send this to your observability stack (e.g. Sentry)
      res.status(500).json({ error: 'Failed to record violation' });
    }
  }

  @httpGet('/entries')
  async getEntries(req: Request, res: Response): Promise<void> {
    try {
      const filters = {
        actor: req.query.actor as string,
        action: req.query.action as string,
        limit: req.query.limit ? Number(req.query.limit) : 50
      };

      const entries = await this.ledgerService.getEntries(filters);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch ledger entries' });
    }
  }

  @httpGet('/summary')
  async getSummary(_req: Request, res: Response): Promise<void> {
    try {
      const summary = await this.ledgerService.getSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch system summary' });
    }
  }
}
import { Router, Request, Response } from 'express';
import { actionPromptGenerator } from '../notifications/action-prompt-generator';
import { readDatabase } from '../../infrastructure/database';
import { bills } from '../../infrastructure/schema/foundation';
import { eq } from 'drizzle-orm';

export const actionPromptsRouter: Router = Router();

/**
 * GET /api/bills/:billId/action-prompts
 * Get action prompts for a specific bill
 */
actionPromptsRouter.get('/:billId/action-prompts', async (req: Request, res: Response) => {
  try {
    const { billId } = req.params;
    
    if (!billId) {
      return res.status(400).json({ error: 'Bill ID is required' });
    }
    
    const userId = (req as any).user?.id; // Assuming auth middleware sets req.user

    // Fetch bill
    const [bill] = await readDatabase
      .select()
      .from(bills)
      .where(eq(bills.id, billId))
      .limit(1);

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Get user context if authenticated
    let userContext;
    if (userId) {
      // For now, use simplified context without database queries
      // TODO: Fetch user profile, comments, and votes when auth is fully implemented
      userContext = {
        county: undefined,
        constituency: undefined,
        hasCommented: false,
        hasVoted: false,
      };
    }

    // Generate action prompts
    const prompts = actionPromptGenerator.generatePrompts(bill as any, userContext);

    return res.json(prompts);
  } catch (error) {
    console.error('Error generating action prompts:', error);
    return res.status(500).json({ error: 'Failed to generate action prompts' });
  }
});

export default actionPromptsRouter;

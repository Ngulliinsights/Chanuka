import { Router } from 'express';
import { logger } from '../../shared/core/src/observability/logging';
// import { dashboardRouter } from './routes/dashboard'; // Dashboard route doesn't exist

export const setupApi = () => {
  const router = Router();

  // Add authentication middleware
  router.use((req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  });

  // Mount dashboard routes (commented out - dashboard router doesn't exist)
  // router.use('/dashboard', dashboardRouter);

  return router;
};

/**
 * Server-side API request function for making HTTP requests
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: any,
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response;
  } catch (error) {
    logger.error('API request failed', { method, url, error });
    throw error;
  }
}












































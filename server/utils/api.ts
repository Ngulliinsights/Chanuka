import { Router } from 'express';
import { logger } from '../utils/logger';
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







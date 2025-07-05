import { Router } from 'express';
import { dashboardRouter } from './routes/dashboard';

export const setupApi = () => {
  const router = Router();
  
  // Add authentication middleware
  router.use((req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  });

  // Mount dashboard routes
  router.use('/dashboard', dashboardRouter);

  return router;
};
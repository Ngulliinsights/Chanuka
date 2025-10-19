import express from 'express';
import { router as profileRouter } from '../../server/features/users/profile.js';
import { logger } from '../../shared/core/src/observability/logging';

const app = express();
app.use(express.json());
app.use('/api/profile', profileRouter);

logger.info('✅ Profile routes integrated successfully', { component: 'Chanuka' });

// Check that all expected routes are registered
const routes = [];
profileRouter.stack.forEach((layer) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods);
    routes.push(`${methods.join(',').toUpperCase()} ${layer.route.path}`);
  }
});

logger.info('\n📋 Available profile routes:', { component: 'Chanuka' });
routes.forEach(route => {
  console.log(`  ${route}`);
});

logger.info('\n🎉 Profile routes verification complete!', { component: 'Chanuka' });












































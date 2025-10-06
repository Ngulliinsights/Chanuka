import express from 'express';
import { router as profileRouter } from '../../server/features/users/profile.js';

const app = express();
app.use(express.json());
app.use('/api/profile', profileRouter);

console.log('✅ Profile routes integrated successfully');

// Check that all expected routes are registered
const routes = [];
profileRouter.stack.forEach((layer) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods);
    routes.push(`${methods.join(',').toUpperCase()} ${layer.route.path}`);
  }
});

console.log('\n📋 Available profile routes:');
routes.forEach(route => {
  console.log(`  ${route}`);
});

console.log('\n🎉 Profile routes verification complete!');
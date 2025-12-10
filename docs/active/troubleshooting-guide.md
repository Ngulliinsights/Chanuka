# Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered during development, deployment, and usage of the Chanuka Platform. Issues are organized by category for quick reference.

## Development Environment Issues

### PNPM Installation Problems

**Issue**: `pnpm: command not found`

**Solutions**:
```bash
# Install PNPM globally
npm install -g pnpm

# Or using other package managers
brew install pnpm          # macOS
choco install pnpm         # Windows
```

**Issue**: PNPM workspace errors

**Solutions**:
```bash
# Clear PNPM cache
pnpm store prune

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check workspace configuration
cat pnpm-workspace.yaml
```

### Node.js Version Conflicts

**Issue**: "Node version X required, but Y is installed"

**Solutions**:
```bash
# Using nvm (recommended)
nvm install 18
nvm use 18
nvm alias default 18

# Check version
node --version
npm --version
```

### Port Conflicts

**Issue**: "Port 5173/4200 already in use"

**Solutions**:
```bash
# Find process using port
lsof -i :5173          # macOS/Linux
netstat -ano | findstr :5173  # Windows

# Kill process
kill -9 <PID>          # macOS/Linux
taskkill /PID <PID> /F # Windows

# Or use different ports
pnpm dev --port 5174
```

## Database Issues

### PostgreSQL Connection Problems

**Issue**: "Can't connect to database"

**Solutions**:
```bash
# Check if PostgreSQL is running
brew services list | grep postgres  # macOS
sudo systemctl status postgresql    # Linux
services.msc                        # Windows

# Start PostgreSQL
brew services start postgresql      # macOS
sudo systemctl start postgresql     # Linux

# Check connection
psql -h localhost -U chanuka -d chanuka

# Reset database
pnpm run db:reset
```

### Migration Failures

**Issue**: Database migrations fail

**Solutions**:
```bash
# Check migration status
pnpm run db:migrate:status

# Rollback and retry
pnpm run db:migrate:rollback
pnpm run db:migrate

# Manual migration
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Seed Data Issues

**Issue**: Development data not loading

**Solutions**:
```bash
# Clear existing data
pnpm run db:reset

# Run seeds
pnpm run db:seed

# Check seeded data
psql -d chanuka -c "SELECT COUNT(*) FROM bills;"
```

## Frontend Issues

### Build Failures

**Issue**: Vite build fails

**Solutions**:
```bash
# Clear cache
rm -rf node_modules/.vite
pnpm build

# Check TypeScript errors
pnpm type-check

# Verify environment variables
cat .env.production
```

### Hot Reload Not Working

**Issue**: Changes not reflecting in browser

**Solutions**:
```bash
# Restart dev server
Ctrl+C
pnpm dev

# Clear browser cache
# Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)

# Check file watching
ls -la client/src/
```

### Component Rendering Issues

**Issue**: React components not rendering correctly

**Solutions**:
```typescript
// Check for console errors
console.log('Component props:', props);

// Verify component imports
import { BillCard } from '@/components/BillCard';

// Check conditional rendering
{loading ? <Spinner /> : <BillList bills={bills} />}
```

### Styling Problems

**Issue**: Tailwind CSS not applying

**Solutions**:
```bash
# Rebuild CSS
pnpm build:css

# Check Tailwind config
cat tailwind.config.js

# Verify class names
<div className="bg-blue-500 text-white p-4">
```

## Backend Issues

### Server Startup Failures

**Issue**: Express server won't start

**Solutions**:
```bash
# Check for syntax errors
npx tsc --noEmit

# Verify environment variables
cat .env.development

# Check port availability
lsof -i :4200

# Run with debug logging
DEBUG=* pnpm dev:server
```

### API Route Errors

**Issue**: API endpoints returning 500 errors

**Solutions**:
```typescript
// Add error logging
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ error: error.message });
});

// Check route definitions
console.log('Routes:', app._router.stack);

// Test with curl
curl -X GET http://localhost:4200/api/health
```

### Authentication Problems

**Issue**: JWT tokens not working

**Solutions**:
```typescript
// Verify token generation
const token = jwt.sign(payload, process.env.JWT_SECRET);

// Check token decoding
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
} catch (error) {
  console.error('Token verification failed:', error);
}
```

## Testing Issues

### Test Failures

**Issue**: Unit tests failing

**Solutions**:
```bash
# Run specific test
pnpm test -- BillCard.test.tsx

# Update snapshots
pnpm test -- -u

# Check test coverage
pnpm test:coverage

# Debug test
pnpm test -- --verbose
```

### E2E Test Timeouts

**Issue**: Playwright tests timing out

**Solutions**:
```typescript
// Increase timeout
test.setTimeout(60000);

// Wait for elements properly
await page.waitForSelector('[data-testid="bill-list"]', { timeout: 10000 });

// Debug with screenshots
await page.screenshot({ path: 'debug.png' });
```

### Mock Data Issues

**Issue**: API mocks not working in tests

**Solutions**:
```typescript
// Setup MSW (Mock Service Worker)
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/bills', (req, res, ctx) => {
    return res(ctx.json({ data: mockBills }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Deployment Issues

### Docker Build Failures

**Issue**: Docker images won't build

**Solutions**:
```bash
# Build with no cache
docker build --no-cache -t chanuka .

# Check Docker context
ls -la

# Verify Dockerfile
cat Dockerfile

# Build with verbose output
docker build --progress=plain -t chanuka .
```

### Environment Variable Problems

**Issue**: Production environment variables not working

**Solutions**:
```bash
# Check environment file
cat .env.production

# Verify variable loading
console.log('SENTRY_DSN:', process.env.VITE_SENTRY_DSN);

# Use correct prefix for client
VITE_API_URL=https://api.chanuka.go.ke
```

### SSL/HTTPS Issues

**Issue**: SSL certificate problems

**Solutions**:
```nginx
# Nginx SSL configuration
server {
    listen 443 ssl http2;
    server_name chanuka.go.ke;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}
```

## Performance Issues

### Slow Page Loads

**Issue**: Frontend loading slowly

**Solutions**:
```typescript
// Code splitting
const BillDetails = lazy(() => import('./BillDetails'));

// Image optimization
import image from './bill-image.jpg';
<img src={image} loading="lazy" />

// Bundle analysis
pnpm build
npx vite-bundle-analyzer dist/
```

### Database Query Performance

**Issue**: Slow database queries

**Solutions**:
```sql
-- Add indexes
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_sponsor ON bills(sponsor_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM bills WHERE status = 'introduced';

-- Use pagination
SELECT * FROM bills LIMIT 20 OFFSET 0;
```

### Memory Leaks

**Issue**: Application memory usage growing

**Solutions**:
```typescript
// Clean up event listeners
useEffect(() => {
  const handleResize = () => setWidth(window.innerWidth);
  window.addEventListener('resize', handleResize);

  return () => window.removeEventListener('resize', handleResize);
}, []);

// Avoid memory leaks in subscriptions
useEffect(() => {
  const subscription = api.subscribe(callback);
  return () => subscription.unsubscribe();
}, []);
```

## Security Issues

### CORS Errors

**Issue**: Cross-origin request blocked

**Solutions**:
```typescript
// Backend CORS configuration
import cors from 'cors';

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://chanuka.go.ke']
    : ['http://localhost:5173'],
  credentials: true
}));
```

### CSP Violations

**Issue**: Content Security Policy blocking resources

**Solutions**:
```typescript
// Update CSP headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.example.com;"
  );
  next();
});
```

## Mobile Responsiveness Issues

### Layout Breaking on Mobile

**Issue**: Components not responsive

**Solutions**:
```css
/* Use responsive classes */
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

/* Mobile-first approach */
@media (min-width: 768px) {
  .bill-card { flex-direction: row; }
}
```

### Touch Interactions Not Working

**Issue**: Touch events not responding

**Solutions**:
```typescript
// Use touch-friendly event handlers
<button
  onClick={handleClick}
  onTouchStart={handleTouchStart}
  className="min-h-[44px] min-w-[44px]" // Minimum touch target
>
```

## Monitoring and Logging

### Log Analysis

**Issue**: Can't find error logs

**Solutions**:
```bash
# Check application logs
tail -f logs/app.log

# Search for specific errors
grep "ERROR" logs/app.log

# Log levels
logger.info('Info message');
logger.error('Error message', error);
```

### Error Tracking

**Issue**: Errors not appearing in Sentry

**Solutions**:
```typescript
// Verify Sentry configuration
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});

// Test error reporting
Sentry.captureException(new Error('Test error'));
```

## Getting Help

### When to Ask for Help

- Issue persists after trying solutions
- Error messages are unclear
- Problem affects multiple developers
- Security-related issues

### How to Report Issues

1. **Gather Information**:
   - Error messages
   - Steps to reproduce
   - Environment details
   - Screenshots/logs

2. **Check Existing Issues**:
   - GitHub Issues
   - Slack channels
   - Documentation

3. **Create Issue Report**:
   - Clear title
   - Detailed description
   - Code snippets
   - Environment info

### Emergency Contacts

- **Critical Production Issues**: On-call engineer via Slack
- **Security Incidents**: security@chanuka.go.ke
- **General Support**: dev-support@chanuka.go.ke

## Prevention Best Practices

### Code Quality

- Run tests before committing
- Use TypeScript for type safety
- Follow ESLint rules
- Code review all changes

### Development Workflow

- Keep branches up to date
- Write descriptive commit messages
- Test in multiple browsers
- Verify mobile responsiveness

### Deployment Safety

- Use staging environment for testing
- Gradual rollouts for major changes
- Monitor error rates post-deployment
- Have rollback plans ready

---

*This guide is continuously updated. Last updated: December 2025*
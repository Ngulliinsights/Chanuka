# Server-Client Integration Checklist

This checklist ensures proper integration between the Chanuka Platform's server and client applications.

## Pre-Integration Setup

### Server Setup
- [ ] Server dependencies installed (`cd server && npm install`)
- [ ] `.env` file created with required variables
- [ ] Database connection configured
- [ ] JWT_SECRET and ENCRYPTION_KEY set
- [ ] PORT configured (default: 4200)
- [ ] CORS_ORIGIN set to client URL

### Client Setup
- [ ] Client dependencies installed (`cd client && npm install`)
- [ ] `.env.development` file created
- [ ] VITE_API_URL set to server URL
- [ ] Feature flags configured
- [ ] Build configuration verified

## Configuration Validation

### Environment Variables

**Server** (`.env`):
```bash
✅ DATABASE_URL=postgresql://...
✅ JWT_SECRET=<secret>
✅ ENCRYPTION_KEY=<key>
✅ KEY_DERIVATION_SALT=<salt>
✅ PORT=4200
✅ HOST=0.0.0.0
✅ NODE_ENV=development
✅ CORS_ORIGIN=http://localhost:5173
```

**Client** (`.env.development`):
```bash
✅ VITE_API_URL=http://localhost:4200/api
✅ VITE_ENABLE_WEBSOCKET=true
✅ VITE_ENABLE_ANALYTICS=true
```

### CORS Configuration

- [ ] Server CORS origin matches client URL
- [ ] Credentials enabled on both sides
- [ ] Allowed methods include: GET, POST, PUT, DELETE, OPTIONS, PATCH
- [ ] Allowed headers include: Authorization, Content-Type, X-CSRF-Token

## API Integration

### Core Endpoints
- [ ] `/api` - API info endpoint working
- [ ] `/api/health` - Health check working
- [ ] `/api/frontend-health` - Frontend health working
- [ ] `/api/service-status` - Service status working

### Authentication Endpoints
- [ ] `POST /api/auth/login` - Login working
- [ ] `POST /api/auth/register` - Registration working
- [ ] `POST /api/auth/logout` - Logout working
- [ ] `POST /api/auth/refresh` - Token refresh working
- [ ] `POST /api/auth/validate-tokens` - Token validation working

### Feature Endpoints
- [ ] `/api/bills` - Bills API working
- [ ] `/api/community` - Community API working
- [ ] `/api/analytics` - Analytics API working
- [ ] `/api/notifications` - Notifications API working
- [ ] `/api/users` - Users API working
- [ ] `/api/search` - Search API working

### Security Endpoints
- [ ] `GET /api/security/status` - Security status working
- [ ] `GET /api/security/csrf-token` - CSRF token generation working
- [ ] `POST /api/security/csp-report` - CSP reporting working

## Client API Services

### Service Files
- [ ] `client/src/infrastructure/api/index.ts` - Main API export
- [ ] `client/src/infrastructure/api/client.ts` - Unified API client
- [ ] `client/src/infrastructure/api/authentication.ts` - Auth interceptors
- [ ] `client/src/infrastructure/api/retry.ts` - Retry logic
- [ ] `client/src/infrastructure/api/cache-manager.ts` - Caching

### Feature Services
- [ ] Bills API service implemented
- [ ] Community API service implemented
- [ ] Analytics API service implemented
- [ ] User API service implemented
- [ ] Notifications API service implemented
- [ ] Search API service implemented

## Authentication Flow

### Login Process
- [ ] Login form submits to `/api/auth/login`
- [ ] Tokens stored in httpOnly cookies
- [ ] User data stored in state/context
- [ ] Redirect to dashboard after login
- [ ] Error handling for failed login

### Token Management
- [ ] Access token automatically included in requests
- [ ] Refresh token used for renewal
- [ ] Automatic token refresh before expiry
- [ ] Token refresh on 401 responses
- [ ] Logout clears tokens and state

### Protected Routes
- [ ] Protected routes check authentication
- [ ] Unauthenticated users redirected to login
- [ ] Auth state persists across page reloads
- [ ] Logout redirects to home/login

## Real-time Features

### WebSocket Integration
- [ ] WebSocket service initialized on server
- [ ] WebSocket client connects successfully
- [ ] Connection reconnects on disconnect
- [ ] Events can be subscribed to
- [ ] Events can be published
- [ ] Connection status displayed in UI

### Event Handling
- [ ] Bill updates received in real-time
- [ ] Notifications received in real-time
- [ ] User activity tracked
- [ ] Connection errors handled gracefully

## Security Implementation

### Input Validation
- [ ] Server validates all input
- [ ] Client validates before submission
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output sanitization)
- [ ] CSRF protection enabled

### Rate Limiting
- [ ] Rate limiting configured on server
- [ ] Different limits for different endpoints
- [ ] Rate limit errors handled on client
- [ ] User notified of rate limit

### Security Headers
- [ ] Content-Security-Policy configured
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] Strict-Transport-Security set (production)

## Error Handling

### Server Errors
- [ ] Standardized error format
- [ ] Appropriate HTTP status codes
- [ ] Error logging implemented
- [ ] Stack traces hidden in production

### Client Errors
- [ ] API errors caught and handled
- [ ] User-friendly error messages
- [ ] Error logging to console/service
- [ ] Retry logic for transient errors
- [ ] Circuit breaker for repeated failures

## Performance Optimization

### Caching
- [ ] API responses cached appropriately
- [ ] Cache invalidation on mutations
- [ ] Cache TTL configured
- [ ] Cache size limits set

### Request Optimization
- [ ] Request deduplication enabled
- [ ] Pagination implemented for lists
- [ ] Lazy loading for large datasets
- [ ] Compression enabled

### Bundle Optimization
- [ ] Code splitting configured
- [ ] Lazy loading for routes
- [ ] Tree shaking enabled
- [ ] Production build optimized

## Testing

### Unit Tests
- [ ] Server API endpoints tested
- [ ] Client API services tested
- [ ] Authentication flow tested
- [ ] Error handling tested

### Integration Tests
- [ ] End-to-end user flows tested
- [ ] API integration tested
- [ ] Authentication integration tested
- [ ] Real-time features tested

### Manual Testing
- [ ] Login/logout flow works
- [ ] All major features accessible
- [ ] Error states display correctly
- [ ] Loading states display correctly
- [ ] Real-time updates work

## Development Workflow

### Local Development
- [ ] Server starts without errors
- [ ] Client starts without errors
- [ ] Hot reload works on both
- [ ] API calls succeed
- [ ] WebSocket connects

### Build Process
- [ ] Server builds successfully
- [ ] Client builds successfully
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Build output is correct

## Deployment Preparation

### Environment Configuration
- [ ] Production environment variables set
- [ ] Database connection configured
- [ ] API URLs updated for production
- [ ] Security keys rotated
- [ ] CORS configured for production domain

### Build Verification
- [ ] Production build created
- [ ] Build size acceptable
- [ ] All assets included
- [ ] Source maps generated (if needed)

### Security Checklist
- [ ] Secrets not in code
- [ ] Environment variables secured
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled

## Monitoring and Observability

### Logging
- [ ] Server logs configured
- [ ] Client errors logged
- [ ] API calls logged
- [ ] Performance metrics tracked

### Health Checks
- [ ] Server health endpoint working
- [ ] Database health checked
- [ ] External services health checked
- [ ] Monitoring alerts configured

## Documentation

### Code Documentation
- [ ] API endpoints documented
- [ ] Client services documented
- [ ] Integration guide created
- [ ] Deployment guide created

### User Documentation
- [ ] Feature documentation updated
- [ ] API documentation published
- [ ] Troubleshooting guide created

## Validation

### Automated Validation
Run the validation script:
```bash
npm run validate:integration
# or
tsx scripts/validate-integration.ts
```

### Manual Validation
1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev`
3. Open browser to `http://localhost:5173`
4. Test login flow
5. Test main features
6. Check browser console for errors
7. Check server logs for errors

## Sign-off

- [ ] All checklist items completed
- [ ] Validation script passes
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Team review completed
- [ ] Ready for deployment

---

**Validated by**: _______________  
**Date**: _______________  
**Environment**: [ ] Development [ ] Staging [ ] Production

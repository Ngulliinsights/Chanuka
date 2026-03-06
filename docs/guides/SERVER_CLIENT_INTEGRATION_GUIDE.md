# Server-Client Integration Guide

## Overview

This guide documents the integration between the Chanuka Platform's server (Express/Node.js) and client (React/Vite) applications, including API communication, authentication, real-time features, and deployment considerations.

## Architecture

### Server Architecture
- **Framework**: Express.js with TypeScript
- **Port**: 4200 (configurable via PORT env var)
- **API Base**: `/api`
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket support
- **Security**: CSRF protection, rate limiting, input validation

### Client Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **API Client**: Unified API client with retry, caching, circuit breaker
- **State Management**: React Query + Context API
- **Routing**: React Router v6

## API Integration

### Base Configuration

**Server** (`server/config/index.ts`):
```typescript
export const config = {
  server: {
    port: process.env.PORT || 4200,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }
};
```

**Client** (`client/src/infrastructure/api/config.ts`):
```typescript
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4200/api',
  timeout: 30000,
  withCredentials: true
};
```

### Environment Variables

**Server** (`.env`):
```bash
# Server Configuration
PORT=4200
HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/chanuka

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key
KEY_DERIVATION_SALT=your-salt

# CORS
CORS_ORIGIN=http://localhost:5173
```

**Client** (`.env.development`):
```bash
# API Configuration
VITE_API_URL=http://localhost:4200/api

# Feature Flags
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_ANALYTICS=true
```

## API Endpoints

### Core Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api` | GET | API info and available endpoints | No |
| `/api/health` | GET | Server health check | No |
| `/api/frontend-health` | GET | Frontend serving status | No |
| `/api/service-status` | GET | Service availability | No |

### Feature Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/validate-tokens` - Validate auth tokens

#### Bills
- `GET /api/bills` - List bills with pagination
- `GET /api/bills/:id` - Get bill details
- `POST /api/bills` - Create bill (admin)
- `PUT /api/bills/:id` - Update bill (admin)
- `GET /api/bills/:id/analysis` - Get bill analysis

#### Community
- `GET /api/community/comments` - Get comments
- `POST /api/community/comments` - Create comment
- `GET /api/community/arguments` - Get argument analysis
- `POST /api/community/arguments` - Submit argument

#### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/bills/:id` - Bill-specific analytics
- `GET /api/analytics/engagement` - Engagement metrics

#### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-read` - Mark as read
- `GET /api/notifications/preferences` - Get preferences
- `PUT /api/notifications/preferences` - Update preferences

#### Security
- `GET /api/security/status` - Security status
- `GET /api/security/csrf-token` - Get CSRF token
- `POST /api/security/csp-report` - Report CSP violations
- `POST /api/security/vulnerability-report` - Report vulnerabilities

## Client API Services

### Service Structure

Each feature has its own API service following this pattern:

```typescript
// client/src/features/{feature}/services/api.ts
import { globalApiClient } from '@client/infrastructure/api';

export class FeatureApiService {
  private readonly endpoint: string;

  constructor(private apiClient: UnifiedApiClient) {
    this.endpoint = '/feature';
  }

  async getItems(params?: QueryParams): Promise<Item[]> {
    const response = await this.apiClient.get<Item[]>(
      this.endpoint,
      { params }
    );
    return response.data;
  }

  async createItem(data: CreateItemRequest): Promise<Item> {
    const response = await this.apiClient.post<Item>(
      this.endpoint,
      data
    );
    return response.data;
  }
}

export const featureApiService = new FeatureApiService(globalApiClient);
```

### Available Services

- **Bills API**: `@client/features/bills/services/api`
- **Community API**: `@client/features/community/services/api`
- **Analytics API**: `@client/features/analytics/services/api`
- **User API**: `@client/features/users/services/api`
- **Search API**: `@client/features/search/services/api`
- **Notifications API**: `@client/features/notifications/services/api`
- **Feature Flags API**: `@client/features/feature-flags/api/feature-flags-api`

## Authentication Flow

### 1. Login Process

```typescript
// Client
import { authService } from '@client/features/auth/services/auth-service';

const { user, tokens } = await authService.login({
  email: 'user@example.com',
  password: 'password'
});

// Tokens are automatically stored in httpOnly cookies
// Access token: 15 minutes expiry
// Refresh token: 7 days expiry
```

### 2. Automatic Token Refresh

```typescript
// Client - Automatic via interceptor
import { TokenRefreshInterceptor } from '@client/infrastructure/api/authentication';

// Interceptor automatically refreshes tokens when:
// - Access token expires
// - API returns 401 Unauthorized
// - Token is within 5 minutes of expiry (proactive refresh)
```

### 3. Protected Routes

```typescript
// Client
import { ProtectedRoute } from '@client/features/auth/components/ProtectedRoute';

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

## Real-time Features

### WebSocket Integration

**Server** (`server/index.ts`):
```typescript
import { webSocketService } from '@server/utils/websocket';

// Initialize WebSocket on server start
webSocketService.initialize(server);

// Emit events
webSocketService.emit('bill:updated', { billId, changes });
webSocketService.broadcast('notification:new', notification);
```

**Client** (`client/src/infrastructure/api/websocket/client.ts`):
```typescript
import { createWebSocketClient } from '@client/infrastructure/api';

const wsClient = createWebSocketClient({
  url: 'ws://localhost:4200',
  reconnect: true,
  reconnectInterval: 3000
});

// Subscribe to events
wsClient.subscribe('bill:updated', (data) => {
  console.log('Bill updated:', data);
});

// Send events
wsClient.send('user:activity', { action: 'view', billId });
```

### Real-time Event Hub

```typescript
// Client
import { realtimeEventHub } from '@client/infrastructure/api';

// Subscribe to events
realtimeEventHub.subscribe('notifications', (notification) => {
  showToast(notification.message);
});

// Publish events
realtimeEventHub.publish('user:action', { type: 'vote', billId });
```

## Error Handling

### Server Error Responses

```typescript
// Standardized error format
{
  success: false,
  error: {
    message: "User-friendly error message",
    code: "ERROR_CODE",
    details: { /* additional context */ }
  },
  timestamp: "2026-03-01T12:00:00Z"
}
```

### Client Error Handling

```typescript
// Automatic error handling via interceptor
import { globalErrorHandler } from '@client/infrastructure/api/errors';

try {
  await apiService.getData();
} catch (error) {
  // Automatically logged and displayed to user
  // Retries for transient errors
  // Circuit breaker for repeated failures
}
```

## Security

### CSRF Protection

**Server**:
```typescript
// CSRF token generation
app.get('/api/security/csrf-token', (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.json({ token });
});
```

**Client**:
```typescript
// Automatic CSRF token inclusion
import { createAuthRequestInterceptor } from '@client/infrastructure/api';

// Interceptor adds X-CSRF-Token header to all requests
```

### Input Validation

**Server**:
```typescript
import { securityMiddleware } from '@server/middleware/security.middleware';

app.use(securityMiddleware.create({
  validateInput: true,
  sanitizeOutput: true,
  rateLimit: {
    windowMs: 60000,
    maxRequests: 100
  }
}));
```

**Client**:
```typescript
import { validateInput } from '@client/lib/utils/validation';

const validated = validateInput(userInput, schema);
```

### Rate Limiting

**Server**:
```typescript
import { standardRateLimits } from '@server/middleware/rate-limiter';

// Different limits for different endpoints
app.use('/api/auth', standardRateLimits.auth); // 30 req/min
app.use('/api/admin', standardRateLimits.admin); // 20 req/min
app.use('/api', standardRateLimits.api); // 100 req/min
```

## Performance Optimization

### Client-side Caching

```typescript
// Automatic caching via API client
import { globalCache } from '@client/infrastructure/api';

// Cache configuration
const cacheConfig = {
  ttl: 300000, // 5 minutes
  maxSize: 100,
  strategy: 'lru'
};

// Automatic cache invalidation on mutations
```

### Request Deduplication

```typescript
// Automatic deduplication of identical requests
import { requestDeduplicator } from '@client/infrastructure/api';

// Multiple components requesting same data
// Only one actual HTTP request is made
```

### Circuit Breaker

```typescript
// Automatic circuit breaking for failing services
import { circuitBreakerMonitor } from '@client/infrastructure/api';

// Monitors service health
// Opens circuit after threshold failures
// Prevents cascading failures
```

## Development Workflow

### Running Locally

1. **Start Server**:
```bash
cd server
npm install
npm run dev
# Server runs on http://localhost:4200
```

2. **Start Client**:
```bash
cd client
npm install
npm run dev
# Client runs on http://localhost:5173
```

3. **Integrated Development**:
```bash
# From project root
npm run dev
# Starts both server and client concurrently
```

### Vite Integration

**Development Mode**:
- Server proxies to Vite dev server
- Hot module replacement (HMR)
- Fast refresh for React components

**Production Mode**:
- Client built to `client/dist`
- Server serves static files
- Optimized bundles with code splitting

## Testing Integration

### API Testing

**Server**:
```bash
cd server
npm run test
npm run test:integration
```

**Client**:
```bash
cd client
npm run test
npm run test:e2e
```

### End-to-End Testing

```typescript
// tests/e2e/integration.spec.ts
import { test, expect } from '@playwright/test';

test('full user flow', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:5173');
  
  // Login
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Verify API call
  const response = await page.waitForResponse(
    resp => resp.url().includes('/api/auth/login')
  );
  expect(response.status()).toBe(200);
  
  // Verify navigation
  await expect(page).toHaveURL('/dashboard');
});
```

## Deployment

### Production Build

```bash
# Build client
cd client
npm run build
# Output: client/dist

# Build server
cd server
npm run build
# Output: server/dist
```

### Environment Configuration

**Production** (`.env.production`):
```bash
# Server
NODE_ENV=production
PORT=4200
DATABASE_URL=postgresql://prod-user:password@prod-host:5432/chanuka
CORS_ORIGIN=https://chanuka.gov

# Client
VITE_API_URL=https://api.chanuka.gov
```

### Deployment Options

1. **Single Server Deployment**:
   - Server serves both API and static client files
   - Simplest deployment model
   - Good for small to medium scale

2. **Separate Deployment**:
   - Client deployed to CDN (Vercel, Netlify, Cloudflare)
   - Server deployed to container platform (AWS ECS, Google Cloud Run)
   - Better scalability and performance

3. **Containerized Deployment**:
   ```dockerfile
   # Dockerfile
   FROM node:18-alpine
   
   # Build client
   WORKDIR /app/client
   COPY client/package*.json ./
   RUN npm ci
   COPY client/ ./
   RUN npm run build
   
   # Build server
   WORKDIR /app/server
   COPY server/package*.json ./
   RUN npm ci
   COPY server/ ./
   RUN npm run build
   
   # Copy client build to server
   RUN cp -r /app/client/dist /app/server/dist/public
   
   EXPOSE 4200
   CMD ["node", "dist/index.js"]
   ```

## Monitoring and Observability

### Server Monitoring

```typescript
// Health check endpoint
GET /api/health
{
  status: "ok",
  database: "connected",
  memory: { heapUsed: "150 MB", heapTotal: "200 MB" },
  uptime: 3600
}
```

### Client Monitoring

```typescript
// Performance monitoring
import { performanceMonitor } from '@client/infrastructure/monitoring';

performanceMonitor.trackPageLoad();
performanceMonitor.trackApiCall('/api/bills', 250);
```

### Error Tracking

```typescript
// Centralized error logging
import { logger } from '@client/lib/utils/logger';

logger.error('API call failed', {
  endpoint: '/api/bills',
  status: 500,
  error: errorMessage
});
```

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Verify `CORS_ORIGIN` in server `.env`
   - Check client `VITE_API_URL` matches server URL
   - Ensure `credentials: true` in both server and client

2. **Authentication Failures**:
   - Check JWT_SECRET is set
   - Verify tokens are being sent in cookies
   - Check token expiry times

3. **WebSocket Connection Issues**:
   - Verify WebSocket URL (ws:// not http://)
   - Check firewall/proxy settings
   - Ensure server WebSocket is initialized

4. **API Timeout**:
   - Increase timeout in client config
   - Check server response times
   - Verify database connection

## Best Practices

1. **API Design**:
   - Use RESTful conventions
   - Version APIs (`/api/v1/...`)
   - Return consistent error formats
   - Include pagination for lists

2. **Security**:
   - Always validate input on server
   - Use parameterized queries
   - Implement rate limiting
   - Enable CSRF protection

3. **Performance**:
   - Cache frequently accessed data
   - Use pagination for large datasets
   - Implement request deduplication
   - Enable compression

4. **Error Handling**:
   - Provide user-friendly error messages
   - Log errors with context
   - Implement retry logic for transient errors
   - Use circuit breakers for failing services

## Migration Guide

### From Legacy API to Unified API

```typescript
// Old approach
import axios from 'axios';
const response = await axios.get('/api/bills');

// New approach
import { globalApiClient } from '@client/infrastructure/api';
const response = await globalApiClient.get('/bills');
// Includes: retry, caching, circuit breaker, auth, error handling
```

### From Individual Services to Feature Services

```typescript
// Old: Centralized API service
import { apiService } from '@client/infrastructure/api';
await apiService.getBills();

// New: Feature-specific service
import { billsApiService } from '@client/features/bills/services/api';
await billsApiService.getBills();
```

## Resources

- [Server API Documentation](./API_DOCUMENTATION.md)
- [Client Architecture Guide](../client/docs/ARCHITECTURE.md)
- [Security Best Practices](./SECURITY_BEST_PRACTICES.md)
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## Support

For integration issues or questions:
- Check the troubleshooting section above
- Review the API documentation
- Check server logs: `server/logs/`
- Check client console for errors
- Review network tab in browser DevTools

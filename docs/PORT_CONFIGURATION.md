# Port Configuration Standard

## Official Port Assignments

The Chanuka platform uses the following standardized ports:

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Backend API** | `4200` | `http://localhost:4200` | Express server with REST API |
| **Frontend Client** | `5173` | `http://localhost:5173` | Vite dev server (React app) |
| **Database** | `5432` | `localhost:5432` | PostgreSQL database |
| **Redis** | `6379` | `localhost:6379` | Redis cache (optional) |
| **Neo4j** | `7687` | `bolt://localhost:7687` | Neo4j graph database (optional) |

## Why Port 4200?

- **No conflicts**: Avoids common ports like 3000 (Create React App), 3001 (common backend), 5000 (Flask/Python)
- **Memorable**: Easy to remember alongside 5173 (Vite default)
- **Consistent**: Already configured in most of the codebase

## Configuration Files

### Environment Variables

All environment files should use port 4200:

```bash
# .env, .env.development, .env.example
PORT=4200
API_BASE_URL=http://localhost:4200/api
VITE_API_BASE_URL=http://localhost:4200/api
```

### Server Config

Default port in `server/config/index.ts`:
```typescript
port: getEnvNumber('PORT', 4200)
```

### Client Config

API base URL in client code:
```typescript
// client/src/lib/utils/env-config.ts
apiUrl: getEnv('VITE_API_URL') || 'http://localhost:4200'

// client/src/lib/constants/index.ts
export const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:4200/api';
```

### Vite Proxy

Vite dev server proxies API requests:
```typescript
// client/vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:4200',
    changeOrigin: true,
    secure: false,
  }
}
```

## Starting the Application

```bash
# Start both services (recommended)
npm run dev

# Or start individually:
npm run dev:server  # Backend on port 4200
npm run dev:client  # Frontend on port 5173
```

## Accessing the Application

- **Frontend**: http://localhost:5173
- **API Health Check**: http://localhost:4200/api/health
- **API Documentation**: http://localhost:4200/api

## Port Conflicts

If port 4200 is already in use:

```bash
# Option 1: Stop the process using port 4200
# Windows:
netstat -ano | findstr :4200
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:4200 | xargs kill -9

# Option 2: Use a different port
PORT=4201 npm run dev:server
```

Then update your `.env`:
```bash
PORT=4201
API_BASE_URL=http://localhost:4201/api
VITE_API_BASE_URL=http://localhost:4201/api
```

## Testing

Test servers may use different ports to avoid conflicts:

```bash
# Test server
TEST_SERVER_PORT=4201

# ML test server
ML_TEST_PORT=3001
```

## Production

In production, the port is typically set by the hosting platform:

```bash
# Heroku, Railway, etc. set PORT automatically
PORT=${PORT:-4200}
```

## Troubleshooting

### Client can't connect to API

1. Verify server is running: `curl http://localhost:4200/api/health`
2. Check `.env` has `PORT=4200`
3. Check client has `VITE_API_BASE_URL=http://localhost:4200/api`
4. Restart both services

### CORS errors

Ensure CORS is configured for the client port:

```bash
# .env
CORS_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

## Summary

**Always use port 4200 for the backend API server.** This is the standard across all configuration files, documentation, and code examples.

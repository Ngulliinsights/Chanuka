# Port Configuration and CSP Fixes

## Date: March 6, 2026

## Issues Fixed

### 1. Inconsistent Port Configuration ✅

**Problem**: The codebase had inconsistent port configurations across different files:
- `.env` used port 4200
- `.env.example` used port 3000
- `server/config/index.ts` had defaults of 5000 and 3000
- Documentation was mixed

**Solution**: Standardized all configurations to use port **4200** for the backend API server.

**Files Updated**:
- `.env.example` - Changed default PORT from 3000 to 4200
- `server/config/index.ts` - Changed defaults from 5000/3000 to 4200
- Created `docs/PORT_CONFIGURATION.md` - Comprehensive port documentation

**Standard Ports**:
| Service | Port |
|---------|------|
| Backend API | 4200 |
| Frontend Client | 5173 |
| PostgreSQL | 5432 |
| Redis | 6379 |

### 2. TypeScript Logger Errors in server/vite.ts ✅

**Problem**: Logger calls had arguments in wrong order, causing TypeScript compilation errors:
```typescript
// Wrong (message first, object second)
logger.info('message', { component: 'ViteIntegration' })

// Correct (object first, message second - Pino style)
logger.info({ component: 'ViteIntegration' }, 'message')
```

**Solution**: Fixed all three logger calls in `server/vite.ts` to use correct Pino signature.

**Files Updated**:
- `server/vite.ts` - Fixed 3 logger calls (lines 19, 47, 51)

### 3. CSP Blocking Google Fonts in Service Worker ✅

**Problem**: Service worker was trying to fetch Google Fonts, but Content Security Policy was blocking the requests:
```
Refused to connect to 'https://fonts.googleapis.com/...' because it violates the document's Content Security Policy
```

**Root Cause**: Service workers intercept all fetch requests, including external resources. The CSP `connect-src` directive didn't allow service workers to fetch from Google Fonts domains.

**Solution**: Updated service worker to skip Google Fonts requests and let the browser handle them directly:
```javascript
// Skip external font/style requests (let browser handle them directly)
if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
  return;
}
```

**Files Updated**:
- `client/public/sw.js` - Added font domain checks in both development and production fetch handlers

## Impact

### Before Fixes
- ❌ Server wouldn't start due to TypeScript errors
- ❌ Client couldn't connect to API (wrong port expectations)
- ❌ Google Fonts failed to load with CSP violations
- ❌ Console flooded with fetch errors

### After Fixes
- ✅ Server compiles and starts successfully
- ✅ Client connects to API on correct port (4200)
- ✅ Google Fonts load without CSP violations
- ✅ Clean console with no fetch errors
- ✅ Consistent configuration across all files

## Testing

To verify the fixes:

1. **Start the server**:
   ```bash
   npm run dev:server
   # Should start on http://localhost:4200
   ```

2. **Check API health**:
   ```bash
   curl http://localhost:4200/api/health
   # Should return 200 OK
   ```

3. **Start the client**:
   ```bash
   npm run dev:client
   # Should start on http://localhost:5173
   ```

4. **Verify fonts load**:
   - Open http://localhost:5173
   - Check browser console - no CSP violations
   - Check Network tab - fonts load from googleapis.com

5. **Verify API connection**:
   - Navigate to /bills page
   - Check Network tab - API calls go to localhost:4200
   - Data loads successfully

## Configuration Reference

### Environment Variables (.env)
```bash
PORT=4200
API_BASE_URL=http://localhost:4200/api
VITE_API_BASE_URL=http://localhost:4200/api
```

### Server Config (server/config/index.ts)
```typescript
port: getEnvNumber('PORT', 4200)
```

### Client Config (client/src/lib/constants/index.ts)
```typescript
export const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:4200/api';
```

### Vite Proxy (client/vite.config.ts)
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:4200',
    changeOrigin: true,
  }
}
```

## Related Documentation

- `docs/PORT_CONFIGURATION.md` - Comprehensive port configuration guide
- `QUICK_START.md` - Updated with correct ports
- `README.md` - Updated with correct ports

## Notes

- The port 4200 was chosen to avoid conflicts with common development ports (3000, 3001, 5000)
- Service worker now explicitly skips external font requests for better CSP compliance
- All logger calls now use Pino's standard signature: `logger.level(object, message)`

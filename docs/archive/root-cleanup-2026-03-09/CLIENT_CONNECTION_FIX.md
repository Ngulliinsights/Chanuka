# Client Connection Fix - March 9, 2026

**Issue:** Client trying to connect directly to `http://localhost:4200` instead of using Vite proxy  
**Error:** `net::ERR_FAILED` when fetching from `http://localhost:4200/bills`  
**Status:** 🔴 CONFIGURATION ISSUE

---

## Root Cause

The client is bypassing the Vite proxy and trying to connect directly to the server at `http://localhost:4200`. This fails because:

1. **CORS**: Direct connections from `localhost:5173` to `localhost:4200` may be blocked
2. **Service Worker**: The service worker is intercepting requests and trying to fetch directly
3. **Environment Variables**: `VITE_API_URL` may not be loaded properly

---

## The Correct Flow

### How It Should Work:
```
Browser (localhost:5173)
  ↓
Vite Dev Server (localhost:5173)
  ↓ /api/* requests proxied to
Server (localhost:4200)
```

### How It's Currently Working:
```
Browser (localhost:5173)
  ↓ Direct connection (FAILS)
Server (localhost:4200)
```

---

## Solution

### Step 1: Restart Development Servers

The environment variables need to be reloaded. Stop the current `npm run dev` and restart:

```bash
# Press Ctrl+C to stop

# Restart
npm run dev
```

### Step 2: Verify Environment Variables

After restart, check the browser console:

```javascript
// Open browser console (F12) and run:
console.log(import.meta.env.VITE_API_URL)
// Should output: "/api"
```

If it shows `undefined` or `http://localhost:4200`, the environment variable isn't loading.

### Step 3: Clear Browser Cache

The service worker may have cached the old configuration:

1. Open DevTools (F12)
2. Go to Application tab
3. Click "Clear storage"
4. Check "Unregister service workers"
5. Click "Clear site data"
6. Refresh the page (Ctrl+F5)

### Step 4: Disable Service Worker (Temporary)

If the issue persists, temporarily disable the service worker:

1. Open DevTools (F12)
2. Go to Application tab
3. Click "Service Workers"
4. Check "Bypass for network"
5. Refresh the page

---

## Verification

After applying the fix, verify:

### 1. Check Network Tab

Open DevTools → Network tab and look for API requests:

**Correct:**
```
Request URL: http://localhost:5173/api/bills?page=1&limit=10
Status: 200 OK
```

**Incorrect:**
```
Request URL: http://localhost:4200/bills?page=1&limit=10
Status: (failed) net::ERR_FAILED
```

### 2. Check Console

Should see NO errors like:
```
Failed to fetch
net::ERR_FAILED
```

### 3. Test API Call

Open browser console and test:

```javascript
fetch('/api/frontend-health')
  .then(r => r.json())
  .then(console.log)
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2026-03-09T...",
  "environment": "development"
}
```

---

## Alternative: Manual Configuration Fix

If restarting doesn't work, manually update the API configuration:

### Option 1: Update client/src/lib/constants/index.ts

```typescript
// BEFORE:
export const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:4200/api';

// AFTER:
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
```

### Option 2: Update client/src/infrastructure/api/config.ts

```typescript
// Find getDefaultApiUrl() method
private getDefaultApiUrl(): string {
  // BEFORE:
  if (typeof window === 'undefined') {
    return 'http://localhost:4200';
  }
  
  // AFTER:
  if (typeof window === 'undefined') {
    return '/api';  // Use relative path
  }
  
  // Also update the baseUrl fallback:
  // BEFORE:
  baseUrl: this.getEnvString('VITE_API_URL') || 'http://localhost:4200',
  
  // AFTER:
  baseUrl: this.getEnvString('VITE_API_URL') || '/api',
}
```

### Option 3: Update client/src/lib/utils/env-config.ts

```typescript
// BEFORE:
apiUrl: getEnv('VITE_API_URL') || (isDevelopment ? 'http://localhost:4200' : ''),

// AFTER:
apiUrl: getEnv('VITE_API_URL') || (isDevelopment ? '/api' : ''),
```

---

## Service Worker Issue

The service worker (`client/public/sw.js`) is intercepting fetch requests. It needs to handle proxy requests correctly.

### Check Service Worker

Look at line 53 in `sw.js`:

```javascript
// This line is causing the error:
event.respondWith(fetch(event.request));
```

The service worker should NOT intercept API requests in development. Update it:

```javascript
// Add this check at the top of the fetch event handler:
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Don't intercept API requests - let them go through Vite proxy
  if (url.pathname.startsWith('/api/')) {
    return; // Let the browser handle it normally
  }
  
  // Rest of service worker logic...
});
```

---

## Quick Fix Script

Create a file `fix-api-url.sh`:

```bash
#!/bin/bash

echo "Fixing API URL configuration..."

# Kill existing processes
pkill -f "tsx.*index.ts"
pkill -f "vite"

# Clear service worker cache
echo "Clear browser cache and service workers manually"

# Restart with correct environment
export VITE_API_URL=/api
npm run dev
```

Run it:
```bash
chmod +x fix-api-url.sh
./fix-api-url.sh
```

---

## Why This Happens

### 1. Environment Variable Loading

Vite loads environment variables at startup. If you:
- Change `.env` file
- Don't restart Vite
- Variables aren't reloaded

### 2. Fallback Values

The code has fallback values:
```typescript
VITE_API_URL || 'http://localhost:4200'
```

If `VITE_API_URL` isn't loaded, it falls back to direct connection.

### 3. Service Worker Caching

Service workers cache:
- API responses
- Configuration
- Network strategies

Old cached values persist even after code changes.

---

## Prevention

### 1. Always Use Relative Paths in Development

```typescript
// GOOD:
const API_URL = '/api';

// BAD:
const API_URL = 'http://localhost:4200';
```

### 2. Check Environment Variables on Startup

Add to `client/src/main.tsx`:

```typescript
console.log('🔍 Environment Check:');
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('Expected: /api');

if (import.meta.env.VITE_API_URL !== '/api') {
  console.error('❌ VITE_API_URL is not set correctly!');
  console.error('Please restart the development server');
}
```

### 3. Service Worker Development Mode

Add a development check in service worker:

```javascript
// At the top of sw.js
const isDevelopment = location.hostname === 'localhost' || 
                      location.hostname === '127.0.0.1';

if (isDevelopment) {
  console.log('🔧 Service Worker in development mode - minimal caching');
}
```

---

## Summary

**Problem:** Client bypassing Vite proxy, connecting directly to server  
**Cause:** Environment variables not loaded or service worker caching  
**Solution:** Restart dev servers and clear browser cache  

**Steps:**
1. Stop `npm run dev` (Ctrl+C)
2. Restart: `npm run dev`
3. Clear browser cache (F12 → Application → Clear storage)
4. Disable service worker temporarily (Application → Service Workers → Bypass)
5. Refresh page (Ctrl+F5)

**Verification:**
- Network tab shows requests to `localhost:5173/api/*`
- No `net::ERR_FAILED` errors
- API calls succeed

---

**Status:** ⏳ AWAITING USER ACTION  
**Next Step:** Restart development servers

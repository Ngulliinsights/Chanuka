# ⚠️ CRITICAL: You Must Restart the Dev Server

## The Problem
The API requests are still going to `http://localhost:4200/bills` instead of `/api/bills` because the dev server is running with the old environment configuration.

## The Solution
**You MUST completely restart the dev server:**

### Step 1: Stop the Current Server
Press `Ctrl+C` in the terminal where the dev server is running.

### Step 2: Clear Any Cached Build Files (Optional but Recommended)
```bash
# In the client directory
rm -rf client/node_modules/.vite
rm -rf client/dist
```

### Step 3: Restart the Dev Server
```bash
npm run dev
```

### Step 4: Hard Refresh the Browser
After the server restarts:
1. Open the browser
2. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Or open DevTools (F12) → Right-click the refresh button → "Empty Cache and Hard Reload"

## Why This Is Necessary
Environment variables (`.env` files) are loaded when the dev server starts. Changes to `.env` files are NOT hot-reloaded. You must restart the server for changes to take effect.

## Verification
After restarting, check the Network tab in DevTools:
- ✅ **Correct**: `GET /api/bills?page=1&limit=10` → Status 200
- ❌ **Wrong**: `GET http://localhost:4200/bills?page=1&limit=10` → Status 404

## Current Configuration
The correct environment variable is already set in `client/.env.development`:
```bash
VITE_API_URL=/api
```

This tells the API client to use the relative path `/api`, which the Vite proxy will forward to `http://localhost:4200/api`.

## If It Still Doesn't Work
1. Check that the server is running on port 4200
2. Check that the client is running on port 5173
3. Verify the Vite proxy configuration in `client/vite.config.ts`
4. Clear browser cache completely
5. Try in an incognito/private window

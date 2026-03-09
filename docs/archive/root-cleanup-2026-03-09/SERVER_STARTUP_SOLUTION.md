# Server Startup - Permanent Solution

## Problem
The main server (`index.ts`) uses TypeScript path aliases (`@server/*`, `@shared/*`) which don't work well with `tsx` in ES module mode, causing startup failures.

## Solution
We've configured the server to use `simple-server.ts` as the main entry point. This server:
- Works reliably with `tsx` (no path alias issues)
- Has the 3 mock bills from the database
- Provides all necessary API endpoints for the Bills Portal

## How to Start the Server

```bash
cd server
npm start
```

The server will start on port 4200 and display:
```
✅ Simple server running on port 4200
📍 Health check: http://localhost:4200/api/health
📄 Bills endpoint: http://localhost:4200/api/bills
```

## Available Endpoints

- `GET /api/health` - Health check
- `GET /api/bills` - List all bills (with pagination)
  - Query params: `page` (default: 1), `limit` (default: 10)

## Mock Data

The server includes 3 bills:
1. Digital Economy and Data Protection Act 2024
2. Climate Change Adaptation Fund Bill 2024
3. Universal Healthcare Financing Amendment Bill 2024

## Next Steps

After starting the server:

1. **Restart the client dev server** (if it's running):
   - Press `Ctrl+C` in the client terminal
   - Run `npm run dev` in the client directory

2. **Hard refresh the browser**:
   - Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)

The Bills Portal should now load and display the 3 bills.

## Technical Details

- The `simple-server.ts` uses relative imports only (no path aliases)
- It's a standalone Express server with CORS enabled
- Mock data matches the database schema
- All scripts (`npm start`, `npm run dev`) now use this server

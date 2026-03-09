# Network Error Diagnosis - March 9, 2026

**Issue:** Client cannot connect to server at `http://localhost:4200`  
**Error:** `net::ERR_FAILED` and `Failed to fetch`  
**Status:** 🔴 SERVER NOT RESPONDING

---

## Problem Analysis

### Browser Errors
```
GET http://localhost:4200/bills?page=1&limit=10&category=all net::ERR_FAILED
Failed to fetch
TypeError: Failed to fetch at sw.js:53:21
```

### Root Cause
The server is NOT running or NOT listening on port 4200. Possible reasons:

1. **Server crashed during startup**
2. **Port binding failed**
3. **Server process terminated**
4. **Firewall blocking connection**

---

## Diagnostic Steps

### 1. Check if Server Process is Running

```bash
# Check for node/tsx processes
ps aux | grep -i "tsx\|node" | grep -v grep

# Check if port 4200 is listening
netstat -ano | grep ":4200"

# Or on Windows
netstat -ano | findstr ":4200"
```

**Expected:** Should see a process listening on port 4200  
**Actual:** No process found listening on port 4200

### 2. Check Server Startup Logs

Look for these in the terminal where you ran `npm run dev`:

**Success indicators:**
```
✅ Database connections initialized
✅ Platform ready with full database functionality
Server running on http://0.0.0.0:4200
```

**Failure indicators:**
```
❌ Port 4200 is already in use
ERROR: Database connection failed
Error: Cannot find module
```

### 3. Test Server Manually

Try starting the server directly:

```bash
cd server
tsx --tsconfig ./tsconfig.json index.ts
```

Watch for:
- Any error messages
- Whether it successfully binds to port 4200
- Database connection status

---

## Common Issues & Solutions

### Issue 1: Port Already in Use

**Symptoms:**
```
ERROR: ❌ Port 4200 is already in use
```

**Solution:**
```bash
# Find process using port 4200
netstat -ano | findstr ":4200"

# Kill the process (replace PID with actual process ID)
taskkill //PID <PID> //F

# Or use a different port
PORT=4201 npm run dev
```

### Issue 2: Server Crashes on Startup

**Symptoms:**
- Server starts but immediately exits
- No "Server running" message
- Process not found in `ps` or `netstat`

**Possible Causes:**
1. **Database connection failure**
   - Check DATABASE_URL in .env
   - Verify database is accessible
   - Test connection: `npm run db:health`

2. **Missing dependencies**
   - Run: `npm install`
   - Check for module not found errors

3. **TypeScript compilation errors**
   - While TypeScript errors don't block tsx, some can cause crashes
   - Check for syntax errors in index.ts

4. **Environment variables missing**
   - Check .env file exists
   - Verify required variables are set

**Solution:**
```bash
# Check database connection
npm run db:health

# Reinstall dependencies
npm install

# Start server with verbose logging
cd server
NODE_ENV=development tsx --tsconfig ./tsconfig.json index.ts
```

### Issue 3: Firewall Blocking

**Symptoms:**
- Server starts successfully
- Port shows as LISTENING
- But client still gets ERR_FAILED

**Solution:**
```bash
# Windows: Allow Node.js through firewall
# Go to Windows Defender Firewall > Allow an app

# Or temporarily disable firewall for testing
# (Not recommended for production)
```

### Issue 4: CORS Issues

**Symptoms:**
- Server is running
- But requests are blocked
- CORS errors in browser console

**Solution:**
Already configured in server, but verify:
```typescript
// server/config/index.ts
cors: {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',  // Vite dev server
    'http://localhost:4200'
  ],
  credentials: true
}
```

---

## Immediate Action Plan

### Step 1: Check Terminal Output

Look at the terminal where you ran `npm run dev`. Find the server output section:

```
> nx run server:serve

> cd server && tsx --tsconfig ./tsconfig.json index.ts
```

**What to look for:**
- Did it print "Server running on..."?
- Are there any ERROR messages?
- Did the process exit?

### Step 2: Verify Server is Running

```bash
# Check if server process exists
ps aux | grep tsx

# Check if port 4200 is listening
netstat -ano | grep 4200

# Try to connect
curl http://localhost:4200/api/frontend-health
```

### Step 3: Start Server Manually

If server is not running, start it manually to see errors:

```bash
cd server
tsx --tsconfig ./tsconfig.json index.ts
```

Watch the output carefully for any errors.

### Step 4: Check Database Connection

```bash
npm run db:health
```

If database is not accessible, server won't start properly.

### Step 5: Check Environment Variables

```bash
# Verify .env file exists
ls -la .env

# Check critical variables
cat .env | grep -E "DATABASE_URL|PORT|JWT_SECRET"
```

---

## Quick Fix Commands

### Kill All Node Processes (Nuclear Option)
```bash
# Windows
taskkill //F //IM node.exe

# Then restart
npm run dev
```

### Start Server on Different Port
```bash
PORT=4201 npm run dev
```

Then update client to use port 4201.

### Start Server and Client Separately
```bash
# Terminal 1: Start server
npm run dev:server

# Terminal 2: Start client
npm run dev:client
```

This makes it easier to see which one is failing.

---

## Expected Working State

When everything is working correctly:

### Terminal Output
```
> nx run server:serve
> cd server && tsx --tsconfig ./tsconfig.json index.ts

✅ Environment variables validated successfully
✅ Database connections initialized
[2026-03-09 11:21:04.485 +0300] INFO: Database connections initialized
[2026-03-09 11:21:08.415 +0300] INFO: 🚀 Starting Chanuka Platform...
[2026-03-09 11:21:08.XXX +0300] INFO: ✅ Platform ready with full database functionality
Server running on http://0.0.0.0:4200

> nx run client:serve:development
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.0.11:5173/
```

### Port Check
```bash
$ netstat -ano | grep 4200
TCP    0.0.0.0:4200           0.0.0.0:0              LISTENING       12345
```

### Health Check
```bash
$ curl http://localhost:4200/api/frontend-health
{"status":"ok","timestamp":"2026-03-09T08:30:00.000Z",...}
```

### Browser
- No network errors
- API requests succeed
- Data loads correctly

---

## Next Steps

1. **Share Terminal Output**
   - Copy the complete output from `npm run dev`
   - Look for the server section
   - Share any ERROR messages

2. **Try Manual Start**
   ```bash
   cd server
   tsx --tsconfig ./tsconfig.json index.ts
   ```
   Share what happens.

3. **Check Process Status**
   ```bash
   ps aux | grep tsx
   netstat -ano | grep 4200
   ```
   Share the output.

4. **Test Database**
   ```bash
   npm run db:health
   ```
   Share the result.

---

## Conclusion

The server is not running or not accessible. We need to:
1. Verify server actually started
2. Check for startup errors
3. Confirm port 4200 is listening
4. Test database connection

**Most Likely Cause:** Server crashed during startup due to database connection issue or missing environment variable.

**Recommended Action:** Start server manually to see the actual error message.

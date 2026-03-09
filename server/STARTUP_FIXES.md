# Server Startup Fixes

This document describes the fixes implemented for the two critical server startup issues.

## Bug 1: Module Resolution Failure

### Problem
The `@server/*` path aliases weren't resolving when starting `server/index.ts`, causing "Cannot find package '@server/infrastructure'" errors.

### Root Cause
The server was being started without properly registering the TypeScript path mappings defined in `tsconfig.json`. The `tsx` command needs to be explicitly told to use `tsconfig-paths` to resolve the `@server/*` aliases.

### Solution

#### 1. Updated Package Scripts
Modified `server/package.json` to include the `-r tsconfig-paths/register` flag:

```json
{
  "scripts": {
    "dev": "tsx --tsconfig tsconfig.json -r tsconfig-paths/register index.ts",
    "start": "tsx --tsconfig tsconfig.json -r tsconfig-paths/register index.ts"
  }
}
```

#### 2. Created Startup Wrapper
Created `server/server-startup.ts` that provides:
- Environment validation
- Startup diagnostics
- Better error messages for module resolution issues

#### 3. Created Port Manager Utility
Created `server/utils/port-manager.ts` with utilities for:
- Checking port availability
- Finding alternative ports
- Getting process IDs using ports
- Killing processes (Windows-compatible)

### Usage

Start the server with proper path resolution:

```bash
# From server directory
npm run dev

# Or directly with tsx
tsx --tsconfig tsconfig.json -r tsconfig-paths/register index.ts
```

## Bug 2: Port Conflict Handling

### Problem
Server crashed when port 4200 was already in use with no graceful error handling or recovery options.

### Root Cause
The server's error handler for `EADDRINUSE` errors simply logged a message and exited, providing no automatic recovery mechanism.

### Solution

#### 1. Enhanced Error Handler
Updated `server/index.ts` to include intelligent port conflict handling:

```typescript
server.on('error', async (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    // Get detailed port information
    const portInfo = await checkPort(PORT);
    const suggestedPorts = getSuggestedPorts(PORT);
    
    // Log helpful error message
    logger.warn(formatPortConflictMessage(PORT, portInfo.pid, suggestedPorts));
    
    // Attempt to find available port
    try {
      const availablePort = await findAvailablePort(PORT + 1);
      logger.info(`✅ Found available port: ${availablePort}`);
      
      // Restart on new port
      config.server.port = availablePort;
      server.listen(availablePort, config.server.host);
    } catch (portError) {
      logger.error('❌ Could not find an available port');
      process.exit(1);
    }
  }
});
```

#### 2. Port Manager Utilities
Created comprehensive port management utilities in `server/utils/port-manager.ts`:

- `isPortAvailable(port)` - Check if a port is free
- `findAvailablePort(startPort, maxAttempts)` - Find next available port
- `getPortPid(port)` - Get PID of process using port (Windows)
- `killProcess(pid)` - Kill process by PID (Windows)
- `checkPort(port)` - Get detailed port status
- `freePort(port)` - Attempt to free a port
- `formatPortConflictMessage(port, pid, suggestions)` - Format helpful error messages

#### 3. Pre-flight Checks
Created `server/utils/preflight-check.ts` to validate environment before startup:

- Node.js version check
- Environment variable validation
- Port availability check
- Critical directory verification
- tsconfig.json existence check

### Features

1. **Automatic Port Discovery**: If the configured port is in use, the server automatically finds the next available port and starts there.

2. **Detailed Error Messages**: When a port conflict occurs, the error message includes:
   - The PID of the process using the port
   - Command to kill the conflicting process
   - Suggested alternative ports
   - Environment variable override instructions

3. **Graceful Recovery**: The server doesn't crash immediately but attempts to recover by finding an alternative port.

4. **Windows Compatibility**: All port management utilities are Windows-compatible using `netstat` and `taskkill`.

### Usage

The port conflict handling is automatic. If port 4200 is in use:

```bash
# Server will automatically try ports 4201, 4202, etc.
npm run dev

# Or manually specify a different port
PORT=4201 npm run dev

# Or kill the existing process (Windows)
taskkill //PID <PID> //F
```

## Testing the Fixes

### Test Module Resolution

```bash
cd server
npm run dev
```

Expected output:
```
🔍 Server Startup Diagnostics:
  - Node version: v20.x.x
  - Environment: development
  - Working directory: /path/to/server
  - Platform: win32
📦 Loading server modules...
✅ Server modules loaded successfully
✅ Path aliases registered successfully
```

### Test Port Conflict Handling

1. Start the server on port 4200:
```bash
npm run dev
```

2. In another terminal, try to start another instance:
```bash
npm run dev
```

Expected output:
```
⚠️  Port 4200 is already in use by process 12345

💡 Solutions:
   1. Kill the existing process: taskkill //PID 12345 //F
   2. Use a different port: PORT=4201 npm run dev
   3. Try one of these available ports: 4201, 4202, 4203, 4204, 4205

🔄 Attempting to find an available port...
✅ Found available port: 4201
🔄 Restarting server on port 4201...
Server running on http://0.0.0.0:4201
```

## Files Created/Modified

### Created Files
- `server/start.ts` - Startup script with path alias registration
- `server/server-startup.ts` - Enhanced startup wrapper with diagnostics
- `server/utils/port-manager.ts` - Port management utilities
- `server/utils/preflight-check.ts` - Environment validation utilities
- `server/STARTUP_FIXES.md` - This documentation

### Modified Files
- `server/package.json` - Updated scripts to use tsconfig-paths
- `server/index.ts` - Enhanced error handling with port conflict recovery

## Environment Variables

The server checks for these environment variables:

### Required
- `DATABASE_URL` - PostgreSQL connection string

### Optional
- `JWT_SECRET` - Secret for JWT token signing
- `ENCRYPTION_KEY` - Key for data encryption
- `KEY_DERIVATION_SALT` - Salt for key derivation
- `PORT` - Server port (defaults to 4200)
- `HOST` - Server host (defaults to 0.0.0.0)
- `NODE_ENV` - Environment mode (development/production)

## Troubleshooting

### Module Resolution Still Failing

1. Verify tsconfig.json exists in server directory
2. Check that paths are correctly configured:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@server": ["."],
      "@server/*": ["./*"]
    }
  }
}
```
3. Ensure tsconfig-paths is installed: `npm install tsconfig-paths`
4. Run with explicit flags: `tsx --tsconfig tsconfig.json -r tsconfig-paths/register index.ts`

### Port Conflict Not Resolving

1. Check if the port is actually in use: `netstat -ano | findstr :4200`
2. Manually kill the process: `taskkill //PID <PID> //F`
3. Try a different port: `PORT=4201 npm run dev`
4. Check firewall settings if ports seem blocked

### Pre-flight Checks Failing

1. Verify Node.js version: `node --version` (should be 18+)
2. Check environment variables: `echo %DATABASE_URL%`
3. Verify directory structure exists
4. Check file permissions

## Future Improvements

1. Add support for Unix/Linux/macOS port management
2. Implement port preference configuration
3. Add automatic process cleanup on server restart
4. Create health check endpoint for port status
5. Add metrics for port conflict frequency
6. Implement port reservation system

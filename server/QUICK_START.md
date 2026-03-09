# Server Quick Start Guide

## Starting the Server

### Development Mode (Full Server)
```bash
cd server
npm run dev
```

This starts the full server with:
- All API routes and features
- Database connectivity
- WebSocket support
- Authentication
- Automatic port conflict resolution
- Module path alias resolution

### Development Mode (Simple Server)
```bash
cd server
npm run dev:simple
```

This starts a minimal server with:
- Basic health check endpoint
- Mock bills endpoint
- No database required
- Faster startup

## Common Issues & Solutions

### Issue 1: "Cannot find package '@server/infrastructure'"

**Cause**: Path aliases not resolving

**Solution**: Make sure you're using the correct start command:
```bash
npm run dev
```

Or run directly with:
```bash
tsx --tsconfig tsconfig.json -r tsconfig-paths/register index.ts
```

### Issue 2: "Port 4200 is already in use"

**Cause**: Another process is using port 4200

**Solutions**:

1. **Automatic (Recommended)**: The server will automatically find an available port
   ```bash
   npm run dev
   # Server will try 4201, 4202, etc.
   ```

2. **Manual Port Selection**:
   ```bash
   PORT=4201 npm run dev
   ```

3. **Kill Existing Process** (Windows):
   ```bash
   # Find the process ID
   netstat -ano | findstr :4200
   
   # Kill the process (replace <PID> with actual process ID)
   taskkill //PID <PID> //F
   ```

### Issue 3: Missing Environment Variables

**Cause**: Required environment variables not set

**Solution**: Create a `.env` file in the server directory:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/chanuka
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key
KEY_DERIVATION_SALT=your-salt
PORT=4200
NODE_ENV=development
```

## Testing the Fixes

Run the startup test suite:
```bash
npm run test:startup
```

This will test:
- Module resolution with @server/* aliases
- Port conflict detection and handling
- Pre-flight environment checks

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start full development server with path aliases |
| `npm run dev:simple` | Start simple mock server (no dependencies) |
| `npm run start` | Start production server |
| `npm run test` | Run unit tests |
| `npm run test:startup` | Test startup fixes |
| `npm run type-check` | Check TypeScript types |

## Port Configuration

The server uses these ports by default:

- **4200**: Main server port
- **4201-4210**: Fallback ports (automatic)

To use a custom port:
```bash
PORT=8080 npm run dev
```

## Environment Modes

### Development
```bash
NODE_ENV=development npm run dev
```
- Detailed logging
- Hot reload support
- Development middleware
- Mock data fallbacks

### Production
```bash
NODE_ENV=production npm run start
```
- Optimized performance
- Production logging
- Security hardening
- No mock data

## Troubleshooting Commands

### Check if port is in use
```bash
netstat -ano | findstr :4200
```

### View server logs
The server logs to console. For persistent logs, redirect output:
```bash
npm run dev > server.log 2>&1
```

### Check Node version
```bash
node --version
# Should be v18.0.0 or higher
```

### Verify environment variables
```bash
# Windows CMD
echo %DATABASE_URL%

# Windows PowerShell
$env:DATABASE_URL

# Git Bash
echo $DATABASE_URL
```

### Clear node_modules and reinstall
```bash
rm -rf node_modules
npm install
```

## Architecture Overview

```
server/
├── index.ts                    # Main server entry point
├── simple-server.ts           # Minimal server for testing
├── server-startup.ts          # Enhanced startup wrapper
├── test-startup.ts            # Startup tests
├── config/                    # Configuration
├── features/                  # Feature modules
├── infrastructure/            # Core infrastructure
├── middleware/                # Express middleware
└── utils/
    ├── port-manager.ts        # Port conflict handling
    └── preflight-check.ts     # Environment validation
```

## Getting Help

1. Check this guide first
2. Review `STARTUP_FIXES.md` for detailed technical information
3. Run `npm run test:startup` to diagnose issues
4. Check the server logs for error messages
5. Verify environment variables are set correctly

## Next Steps

After starting the server:

1. **Verify it's running**: Visit http://localhost:4200/api/health
2. **Check API docs**: Visit http://localhost:4200/api
3. **Test endpoints**: Use the frontend or API client
4. **Monitor logs**: Watch console output for errors

## Performance Tips

1. Use `dev:simple` for quick testing without database
2. Set `NODE_ENV=production` for better performance
3. Increase Node memory if needed: `NODE_OPTIONS=--max-old-space-size=4096`
4. Use `npm run type-check` before committing to catch errors early

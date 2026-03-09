# Bugfix Requirements Document

## Introduction

The server is currently unable to start properly due to two critical issues:
1. **Module Resolution Failure**: The full server (server/index.ts) cannot start because TypeScript path aliases (`@server/*`) are not resolving correctly, causing `ERR_MODULE_NOT_FOUND` errors
2. **Port Conflict Handling**: When port 4200 is already in use, the server crashes with an unhandled `EADDRINUSE` error instead of providing helpful guidance or automatically recovering

These bugs prevent developers from running the full server with all API endpoints and features. The simple-server.ts works as a workaround but lacks the complete API functionality needed for development and testing.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN attempting to start the full server using `npx tsx index.ts` or `npx tsx --tsconfig tsconfig.json index.ts` THEN the system crashes with error "Cannot find package '@server/infrastructure'" and exits immediately

1.2 WHEN attempting to start the server using `npm run dev` while port 4200 is already occupied by another process THEN the system crashes with "Error: listen EADDRINUSE: address already in use :::4200" and exits without providing recovery options

1.3 WHEN the server encounters the EADDRINUSE error THEN the system emits an unhandled 'error' event causing the Node.js process to terminate abruptly

1.4 WHEN TypeScript path aliases like `@server/infrastructure`, `@server/config`, `@server/middleware` are imported in server/index.ts THEN the module resolution fails despite being correctly configured in tsconfig.json

### Expected Behavior (Correct)

2.1 WHEN attempting to start the full server using `npx tsx index.ts` or the appropriate npm script THEN the system SHALL successfully resolve all `@server/*` path aliases and start the server without module resolution errors

2.2 WHEN attempting to start the server while port 4200 is already occupied THEN the system SHALL detect the port conflict, log a clear error message with instructions (e.g., "Port 4200 is in use. Try: PORT=4201 npm run dev"), and exit gracefully without crashing

2.3 WHEN the server encounters an EADDRINUSE error THEN the system SHALL handle the error gracefully with proper error handling instead of emitting an unhandled error event

2.4 WHEN the server starts successfully THEN the system SHALL serve all API endpoints defined in server/index.ts including authentication, bills, analytics, and other features

### Unchanged Behavior (Regression Prevention)

3.1 WHEN starting the simple-server.ts using `npm run dev` (after fixing the main server) THEN the system SHALL CONTINUE TO start successfully and serve the basic API endpoints at /api/health and /api/bills

3.2 WHEN the server starts successfully on an available port THEN the system SHALL CONTINUE TO display the startup success messages and endpoint information

3.3 WHEN environment variables like PORT are set THEN the system SHALL CONTINUE TO respect those configuration values

3.4 WHEN the server is running in development mode THEN the system SHALL CONTINUE TO use the development configuration with appropriate CORS settings and logging levels

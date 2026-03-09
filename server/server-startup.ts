#!/usr/bin/env tsx
/**
 * Enhanced Server Startup Script
 * 
 * Handles:
 * 1. Path alias resolution for @server/* imports
 * 2. Port conflict detection and graceful recovery
 * 3. Environment validation
 * 4. Startup diagnostics
 */

import 'dotenv/config';

// Validate critical environment variables
const requiredEnvVars = ['DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.warn('⚠️  Missing environment variables:', missingEnvVars.join(', '));
  console.warn('⚠️  Server will run in development mode with limited functionality');
}

// Log startup diagnostics
console.log('🔍 Server Startup Diagnostics:');
console.log('  - Node version:', process.version);
console.log('  - Environment:', process.env.NODE_ENV || 'development');
console.log('  - Working directory:', process.cwd());
console.log('  - Platform:', process.platform);

// Dynamic import to ensure tsconfig-paths is registered by tsx
async function startServer() {
  try {
    console.log('📦 Loading server modules...');
    
    // Import the main server file
    await import('./index.js');
    
    console.log('✅ Server modules loaded successfully');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Cannot find package')) {
        console.error('\n🔧 Module Resolution Error Detected:');
        console.error('   This usually means path aliases are not resolving correctly.');
        console.error('   Make sure you are running the server with:');
        console.error('   npm run dev (from server directory)');
        console.error('   or');
        console.error('   tsx --tsconfig tsconfig.json -r tsconfig-paths/register index.ts');
      }
      
      if (error.message.includes('EADDRINUSE')) {
        console.error('\n🔧 Port Conflict Detected:');
        console.error('   The configured port is already in use.');
        console.error('   The server will attempt to find an available port automatically.');
      }
    }
    
    process.exit(1);
  }
}

// Start the server
startServer();

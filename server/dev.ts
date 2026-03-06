#!/usr/bin/env node
/**
 * Development server entry point
 * This wrapper ensures proper module resolution for @server/* paths
 */

import { register } from 'tsx/esm/api';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

// Register tsx for TypeScript support
const unregister = register();

// Import and start the server
const serverPath = resolve(process.cwd(), 'server/index.ts');
await import(pathToFileURL(serverPath).href);

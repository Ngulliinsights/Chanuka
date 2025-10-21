// Compatibility shim to re-export the canonical shared database pool and drizzle instances.
// This file lets existing imports that reference `db/index.ts` continue to work while the
// authoritative implementation lives in `shared/database/pool.ts`.
export { db, readDb, writeDb, pool, getPools, executeQuery, closePools } from '@shared/database/pool';

// Provide convenience functions to match older code that expected functions like readDatabase()
export const readDatabase = () => readDb;
export const writeDatabase = () => writeDb;

export default db;
import * as dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";
import { logger } from '../shared/core/src/observability/logging';

// Configure WebSocket for Neon serverless
if (typeof window === 'undefined') {
  // Node.js environment
  neonConfig.webSocketConstructor = ws;
} else {
  // Browser environment - use native WebSocket
  neonConfig.webSocketConstructor = WebSocket;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });












































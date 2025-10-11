import * as dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema.js";
import { logger } from '../utils/logger';

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







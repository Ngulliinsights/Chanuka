/**
 * Test Server Setup
 * Manages Express server lifecycle for integration tests
 */

import express, { Express } from 'express';
import { Server } from 'http';

let testServer: Server | null = null;
let testApp: Express | null = null;

/**
 * Create and start test server
 */
export async function setupTestServer(): Promise<{ app: Express; server: Server; baseUrl: string }> {
  // Import server app (assuming it exports an Express app)
  const { createApp } = await import('../../../server/index');
  
  testApp = createApp();
  
  // Use random port for tests
  const port = process.env.TEST_PORT || 0; // 0 = random available port
  
  return new Promise((resolve, reject) => {
    testServer = testApp!.listen(port, () => {
      const address = testServer!.address();
      const actualPort = typeof address === 'object' ? address?.port : port;
      const baseUrl = `http://localhost:${actualPort}`;
      
      console.log(`Test server started on ${baseUrl}`);
      resolve({ app: testApp!, server: testServer!, baseUrl });
    });
    
    testServer!.on('error', reject);
  });
}

/**
 * Stop test server
 */
export async function teardownTestServer(): Promise<void> {
  if (testServer) {
    return new Promise((resolve, reject) => {
      testServer!.close((err) => {
        if (err) reject(err);
        else {
          testServer = null;
          testApp = null;
          console.log('Test server stopped');
          resolve();
        }
      });
    });
  }
}

/**
 * Get test app instance
 */
export function getTestApp(): Express {
  if (!testApp) {
    throw new Error('Test server not initialized. Call setupTestServer() first.');
  }
  return testApp;
}

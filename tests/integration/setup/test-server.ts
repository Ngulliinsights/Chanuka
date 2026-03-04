/**
 * Test Server Setup
 * Manages test server lifecycle
 */

import { spawn, ChildProcess } from 'child_process';

let serverProcess: ChildProcess | null = null;
let serverBaseUrl: string = '';

/**
 * Setup test server
 */
export async function setupTestServer(): Promise<{ baseUrl: string }> {
  const port = process.env.TEST_SERVER_PORT || '4201';
  serverBaseUrl = `http://localhost:${port}`;
  
  // Check if server is already running
  try {
    const response = await fetch(`${serverBaseUrl}/api/frontend-health`);
    if (response.ok) {
      console.log('✅ Test server already running');
      return { baseUrl: serverBaseUrl };
    }
  } catch {
    // Server not running, start it
  }
  
  // Start server process
  console.log('🚀 Starting test server...');
  serverProcess = spawn('npm', ['run', 'dev:server'], {
    env: {
      ...process.env,
      PORT: port,
      NODE_ENV: 'test',
    },
    stdio: 'pipe',
  });
  
  // Wait for server to be ready
  await waitForServer(serverBaseUrl, 30000);
  
  console.log('✅ Test server ready');
  return { baseUrl: serverBaseUrl };
}

/**
 * Teardown test server
 */
export async function teardownTestServer(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

/**
 * Wait for server to be ready
 */
async function waitForServer(baseUrl: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${baseUrl}/api/frontend-health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  throw new Error(`Server did not start within ${timeout}ms`);
}

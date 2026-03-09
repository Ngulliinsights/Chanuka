/**
 * Port Management Utilities
 * 
 * Provides utilities for:
 * - Checking if a port is in use
 * - Finding available ports
 * - Gracefully handling port conflicts
 */

import { createServer } from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface PortCheckResult {
  available: boolean;
  port: number;
  pid?: number;
}

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number, host: string = '0.0.0.0'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    
    server.listen(port, host);
  });
}

/**
 * Find an available port starting from a given port
 */
export async function findAvailablePort(
  startPort: number,
  host: string = '0.0.0.0',
  maxAttempts: number = 10
): Promise<number> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const testPort = startPort + attempt;
    const available = await isPortAvailable(testPort, host);
    
    if (available) {
      return testPort;
    }
  }
  
  throw new Error(
    `No available ports found in range ${startPort}-${startPort + maxAttempts - 1}`
  );
}

/**
 * Get the PID of the process using a port (Windows)
 */
export async function getPortPid(port: number): Promise<number | null> {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    const lines = stdout.trim().split('\n');
    
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(pid)) {
          return pid;
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Kill a process by PID (Windows)
 */
export async function killProcess(pid: number, force: boolean = false): Promise<boolean> {
  try {
    const forceFlag = force ? '//F' : '';
    await execAsync(`taskkill //PID ${pid} ${forceFlag}`);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check port status and get detailed information
 */
export async function checkPort(port: number, host: string = '0.0.0.0'): Promise<PortCheckResult> {
  const available = await isPortAvailable(port, host);
  
  if (available) {
    return { available: true, port };
  }
  
  const pid = await getPortPid(port);
  return { available: false, port, pid: pid || undefined };
}

/**
 * Attempt to free a port by killing the process using it
 */
export async function freePort(port: number, force: boolean = false): Promise<boolean> {
  const portInfo = await checkPort(port);
  
  if (portInfo.available) {
    return true;
  }
  
  if (!portInfo.pid) {
    return false;
  }
  
  return await killProcess(portInfo.pid, force);
}

/**
 * Get a list of suggested alternative ports
 */
export function getSuggestedPorts(basePort: number, count: number = 5): number[] {
  const suggestions: number[] = [];
  let offset = 1;
  
  while (suggestions.length < count) {
    suggestions.push(basePort + offset);
    offset++;
  }
  
  return suggestions;
}

/**
 * Format port conflict error message with helpful suggestions
 */
export function formatPortConflictMessage(
  port: number,
  pid?: number,
  suggestedPorts?: number[]
): string {
  let message = `❌ Port ${port} is already in use`;
  
  if (pid) {
    message += ` by process ${pid}`;
  }
  
  message += '\n\n💡 Solutions:\n';
  message += `   1. Kill the existing process: taskkill //PID ${pid || '<PID>'} //F\n`;
  message += `   2. Use a different port: PORT=${port + 1} npm run dev\n`;
  
  if (suggestedPorts && suggestedPorts.length > 0) {
    message += `   3. Try one of these available ports: ${suggestedPorts.join(', ')}\n`;
  }
  
  return message;
}

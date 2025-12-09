/**
 * Server Status Utilities
 * Provides functions to check server connectivity and handle offline states
 */

export interface ServerStatus {
  isOnline: boolean;
  lastChecked: Date;
  error?: string;
}

let serverStatus: ServerStatus = {
  isOnline: false,
  lastChecked: new Date(),
};

/**
 * Check if the server is reachable
 */
export async function checkServerStatus(): Promise<ServerStatus> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch('/api/health', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    serverStatus = {
      isOnline: response.ok,
      lastChecked: new Date(),
      error: response.ok ? undefined : `Server responded with ${response.status}`,
    };
  } catch (error) {
    serverStatus = {
      isOnline: false,
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  return serverStatus;
}

/**
 * Get the current server status without making a new request
 */
export function getCurrentServerStatus(): ServerStatus {
  return serverStatus;
}

/**
 * Initialize server status checking
 */
export function initializeServerStatusCheck(): void {
  // Check immediately
  checkServerStatus().then(status => {
    if (!status.isOnline) {
      console.warn('Server is not reachable. App will run in offline mode.');
    }
  });

  // Check periodically (every 30 seconds)
  setInterval(() => {
    checkServerStatus();
  }, 30000);
}
import { api } from '../services/api.js';
import { API_ENDPOINTS } from '../config/api.js';
import { logger } from '../utils/logger';

export interface HealthStatus {
  api: boolean;
  frontend: boolean;
  database: boolean;
  timestamp: string;
  latency?: number;
}

export interface ConnectionInfo {
  isOnline: boolean;
  apiReachable: boolean;
  corsEnabled: boolean;
  lastChecked: string;
  errors: string[];
}

/**
 * Check API health and connectivity
 */
export async function checkApiHealth(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    const healthResponse = await api.get(API_ENDPOINTS.health);
    const frontendResponse = await api.get(API_ENDPOINTS.frontendHealth);
    
    const latency = Date.now() - startTime;
    
    return {
      api: true,
      frontend: frontendResponse.status === 'ok',
      database: healthResponse.database?.connected || false,
      timestamp: new Date().toISOString(),
      latency
    };
  } catch (error) {
    logger.error('Health check failed:', { component: 'SimpleTool' }, error);
    
    return {
      api: false,
      frontend: false,
      database: false,
      timestamp: new Date().toISOString(),
      latency: Date.now() - startTime
    };
  }
}

/**
 * Check connection and CORS configuration
 */
export async function checkConnection(): Promise<ConnectionInfo> {
  const errors: string[] = [];
  let apiReachable = false;
  let corsEnabled = false;
  
  try {
    // Test basic connectivity
    const response = await fetch(api.getBaseUrl() + API_ENDPOINTS.health, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include'
    });
    
    apiReachable = response.ok;
    corsEnabled = response.headers.has('Access-Control-Allow-Origin') || 
                  response.headers.has('access-control-allow-origin');
    
    if (!response.ok) {
      errors.push(`API returned status ${response.status}: ${response.statusText}`);
    }
    
    if (!corsEnabled) {
      errors.push('CORS headers not found in response');
    }
    
  } catch (error: any) {
    apiReachable = false;
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      errors.push('Network error: Unable to reach API server');
      corsEnabled = false;
    } else if (error.message.includes('CORS')) {
      errors.push('CORS error: Cross-origin requests blocked');
      corsEnabled = false;
    } else {
      errors.push(`Connection error: ${error.message}`);
    }
  }
  
  return {
    isOnline: navigator.onLine,
    apiReachable,
    corsEnabled,
    lastChecked: new Date().toISOString(),
    errors
  };
}

/**
 * Test CORS preflight request
 */
export async function testCorsPreflightRequest(): Promise<boolean> {
  try {
    const response = await fetch(api.getBaseUrl() + API_ENDPOINTS.health, {
      method: 'OPTIONS',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    return response.ok && (
      response.headers.has('Access-Control-Allow-Methods') ||
      response.headers.has('access-control-allow-methods')
    );
  } catch (error) {
    logger.error('CORS preflight test failed:', { component: 'SimpleTool' }, error);
    return false;
  }
}

/**
 * Diagnose API connection issues
 */
export async function diagnoseConnection(): Promise<{
  status: 'healthy' | 'degraded' | 'failed';
  issues: string[];
  recommendations: string[];
}> {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check network connectivity
  if (!navigator.onLine) {
    issues.push('No internet connection detected');
    recommendations.push('Check your internet connection and try again');
  }
  
  // Check API connectivity
  const connectionInfo = await checkConnection();
  
  if (!connectionInfo.apiReachable) {
    issues.push('API server is not reachable');
    recommendations.push('Ensure the server is running and accessible');
  }
  
  if (!connectionInfo.corsEnabled) {
    issues.push('CORS is not properly configured');
    recommendations.push('Check server CORS configuration');
  }
  
  // Check CORS preflight
  const corsWorking = await testCorsPreflightRequest();
  if (!corsWorking) {
    issues.push('CORS preflight requests are failing');
    recommendations.push('Verify CORS preflight handling on the server');
  }
  
  // Check API health
  try {
    const health = await checkApiHealth();
    if (!health.api) {
      issues.push('API health check failed');
      recommendations.push('Check server logs for errors');
    }
    
    if (!health.database) {
      issues.push('Database connection is not available');
      recommendations.push('Check database configuration and connectivity');
    }
    
    if (health.latency && health.latency > 5000) {
      issues.push('API response time is slow');
      recommendations.push('Check server performance and network latency');
    }
  } catch (error) {
    issues.push('Unable to perform health check');
    recommendations.push('Check API endpoint availability');
  }
  
  // Determine overall status
  let status: 'healthy' | 'degraded' | 'failed';
  if (issues.length === 0) {
    status = 'healthy';
  } else if (connectionInfo.apiReachable) {
    status = 'degraded';
  } else {
    status = 'failed';
  }
  
  return { status, issues, recommendations };
}

/**
 * Monitor connection status with periodic checks
 */
export class ConnectionMonitor {
  private checkInterval: number | null = null;
  private listeners: ((status: ConnectionInfo) => void)[] = [];
  private lastStatus: ConnectionInfo | null = null;
  
  start(intervalMs: number = 30000): void {
    if (this.checkInterval) {
      this.stop();
    }
    
    // Initial check
    this.performCheck();
    
    // Periodic checks
    this.checkInterval = window.setInterval(() => {
      this.performCheck();
    }, intervalMs);
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnlineStatusChange);
    window.addEventListener('offline', this.handleOnlineStatusChange);
  }
  
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    window.removeEventListener('online', this.handleOnlineStatusChange);
    window.removeEventListener('offline', this.handleOnlineStatusChange);
  }
  
  private handleOnlineStatusChange = (): void => {
    // Perform immediate check when online status changes
    setTimeout(() => this.performCheck(), 1000);
  };
  
  private async performCheck(): Promise<void> {
    try {
      const status = await checkConnection();
      
      // Only notify listeners if status changed
      if (!this.lastStatus || this.hasStatusChanged(this.lastStatus, status)) {
        this.lastStatus = status;
        this.notifyListeners(status);
      }
    } catch (error) {
      logger.error('Connection check failed:', { component: 'SimpleTool' }, error);
    }
  }
  
  private hasStatusChanged(oldStatus: ConnectionInfo, newStatus: ConnectionInfo): boolean {
    return (
      oldStatus.isOnline !== newStatus.isOnline ||
      oldStatus.apiReachable !== newStatus.apiReachable ||
      oldStatus.corsEnabled !== newStatus.corsEnabled ||
      oldStatus.errors.length !== newStatus.errors.length
    );
  }
  
  private notifyListeners(status: ConnectionInfo): void {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        logger.error('Connection monitor listener error:', { component: 'SimpleTool' }, error);
      }
    });
  }
  
  addListener(listener: (status: ConnectionInfo) => void): void {
    this.listeners.push(listener);
    
    // Immediately notify with current status if available
    if (this.lastStatus) {
      listener(this.lastStatus);
    }
  }
  
  removeListener(listener: (status: ConnectionInfo) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  getCurrentStatus(): ConnectionInfo | null {
    return this.lastStatus;
  }
}

// Export singleton instance
export const connectionMonitor = new ConnectionMonitor();







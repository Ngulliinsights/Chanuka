interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

class ServiceRecoveryManager {
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffFactor: 2
  };

  private failedRequests = new Map<string, number>();
  private serviceStatus = {
    isOnline: true,
    lastFailure: null as Date | null,
    consecutiveFailures: 0
  };

  async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    const requestKey = `${options.method || 'GET'} ${url}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        // Handle 503 Service Unavailable
        if (response.status === 503) {
          throw new Error(`Service unavailable (503): ${url}`);
        }

        // Success - reset failure count
        this.failedRequests.delete(requestKey);
        this.serviceStatus.consecutiveFailures = 0;
        this.serviceStatus.isOnline = true;

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Track failure
        const failures = this.failedRequests.get(requestKey) || 0;
        this.failedRequests.set(requestKey, failures + 1);
        this.serviceStatus.consecutiveFailures++;
        this.serviceStatus.lastFailure = new Date();

        // Don't retry on the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
          this.retryConfig.maxDelay
        );

        console.warn(`Request failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}): ${url}. Retrying in ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }

    // Mark service as offline after multiple failures
    if (this.serviceStatus.consecutiveFailures >= 5) {
      this.serviceStatus.isOnline = false;
    }

    throw lastError || new Error('Request failed after all retries');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public isServiceOnline(): boolean {
    return this.serviceStatus.isOnline;
  }

  public getServiceStatus() {
    return {
      ...this.serviceStatus,
      failedRequestsCount: this.failedRequests.size,
      totalFailures: Array.from(this.failedRequests.values()).reduce((sum, count) => sum + count, 0)
    };
  }

  public resetServiceStatus() {
    this.serviceStatus.isOnline = true;
    this.serviceStatus.consecutiveFailures = 0;
    this.serviceStatus.lastFailure = null;
    this.failedRequests.clear();
  }

  // Health check method
  public async performHealthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry('/api/service-status', {
        method: 'GET'
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.status === 'online';
      }
      
      return false;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const serviceRecovery = new ServiceRecoveryManager();

// Auto-recovery mechanism
let healthCheckInterval: NodeJS.Timeout | null = null;

export function startAutoRecovery() {
  if (healthCheckInterval) {
    return; // Already started
  }

  healthCheckInterval = setInterval(async () => {
    if (!serviceRecovery.isServiceOnline()) {
      console.log('Service offline, attempting recovery...');
      
      const isHealthy = await serviceRecovery.performHealthCheck();
      if (isHealthy) {
        console.log('Service recovered successfully');
        serviceRecovery.resetServiceStatus();
        
        // Reload the page to restore full functionality
        if (window.location.pathname !== '/offline') {
          window.location.reload();
        }
      }
    }
  }, 30000); // Check every 30 seconds
}

export function stopAutoRecovery() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

// Initialize auto-recovery on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', startAutoRecovery);
  window.addEventListener('beforeunload', stopAutoRecovery);
}
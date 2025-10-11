import { defaultApiConfig, CORS_CONFIG, RETRY_CONFIG, ERROR_CONFIG } from '../config/api.js';
import { logger } from '../utils/logger';

// Request/Response interceptor types
interface RequestInterceptor {
  (config: RequestInit & { url: string }): RequestInit & { url: string } | Promise<RequestInit & { url: string }>;
}

interface ResponseInterceptor {
  onFulfilled?: (response: Response) => Response | Promise<Response>;
  onRejected?: (error: any) => any;
}

// Enhanced API client with interceptors and retry logic
class ApiClient {
  private baseUrl: string;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private defaultTimeout = 10000; // 10 seconds
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor(baseUrl: string = defaultApiConfig.baseUrl) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultApiConfig.timeout;
    this.maxRetries = defaultApiConfig.retries;
    this.retryDelay = defaultApiConfig.retryDelay;
    this.setupDefaultInterceptors();
  }

  private setupDefaultInterceptors() {
    // Default request interceptor for authentication and headers
    this.addRequestInterceptor((config) => {
      const token = localStorage.getItem('token');
      const headers = new Headers(config.headers);
      
      // Add authentication header if token exists
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      // Add CSRF token if available
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
      }
      
      // Add request ID for tracking
      headers.set('X-Request-ID', this.generateRequestId());
      
      // Ensure JSON content type for POST/PUT requests
      if ((config.method === 'POST' || config.method === 'PUT') && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      
      return {
        ...config,
        headers
      };
    });

    // Default response interceptor for error handling
    this.addResponseInterceptor({
      onFulfilled: (response) => {
        // Log successful requests in development
        if (import.meta.env.DEV) {
          console.log(`✅ ${response.status} ${response.url}`);
        }
        return response;
      },
      onRejected: (error) => {
        // Handle authentication errors
        if (error.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/auth';
          return Promise.reject(new Error('Authentication expired. Please log in again.'));
        }
        
        // Handle CORS errors
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          return Promise.reject(new Error('Network error. Please check your connection and try again.'));
        }
        
        return Promise.reject(error);
      }
    });
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = this.maxRetries,
    requestId?: string
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on non-retryable status codes
        if (error.status && ERROR_CONFIG.nonRetryableStatusCodes.includes(error.status)) {
          throw error;
        }
        
        // Only retry on retryable status codes or network errors
        if (error.status && !ERROR_CONFIG.retryableStatusCodes.includes(error.status)) {
          throw error;
        }
        
        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }
        
        // Calculate exponential backoff delay with jitter to prevent thundering herd
        const baseDelay = this.retryDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        const delayMs = baseDelay + jitter;
        
        await this.delay(delayMs);
        
        console.warn(`Retrying request (attempt ${attempt + 1}/${retries + 1}) after ${delayMs.toFixed(0)}ms:`, error.message);
      }
    }
    
    throw lastError;
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  private async processRequestInterceptors(config: RequestInit & { url: string }): Promise<RequestInit & { url: string }> {
    let processedConfig = config;
    
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    
    return processedConfig;
  }

  private async processResponseInterceptors(response: Response): Promise<Response> {
    let processedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onFulfilled) {
        processedResponse = await interceptor.onFulfilled(processedResponse);
      }
    }
    
    return processedResponse;
  }

  private async processErrorInterceptors(error: any): Promise<any> {
    let processedError = error;
    
    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onRejected) {
        try {
          processedError = await interceptor.onRejected(processedError);
        } catch (interceptorError) {
          processedError = interceptorError;
        }
      }
    }
    
    return processedError;
  }

  private async makeRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    return this.retryRequest(async () => {
      // Process request interceptors
      const config = await this.processRequestInterceptors({
        ...CORS_CONFIG,
        ...options,
        url,
        signal: AbortSignal.timeout(this.defaultTimeout)
      });
      
      try {
        const response = await fetch(config.url, config);
        
        // Process response interceptors
        const processedResponse = await this.processResponseInterceptors(response);
        
        if (!processedResponse.ok) {
          const error = new Error(`HTTP error! status: ${processedResponse.status}`);
          (error as any).status = processedResponse.status;
          (error as any).response = processedResponse;
          throw error;
        }
        
        // Handle empty responses
        const contentType = processedResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await processedResponse.json();
        } else {
          return await processedResponse.text() as T;
        }
      } catch (error: any) {
        // Process error interceptors
        const processedError = await this.processErrorInterceptors(error);
        throw processedError;
      }
    });
  }

  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'GET',
      ...options
    });
  }

  async post<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  }

  async put<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  }

  async patch<T = any>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...options
    });
  }

  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'DELETE',
      ...options
    });
  }

  // Configuration methods
  setTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  setMaxRetries(retries: number): void {
    this.maxRetries = retries;
  }

  setRetryDelay(delay: number): void {
    this.retryDelay = delay;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Create and export the main API client instance
export const api = new ApiClient();

// Bills API
export const billsApi = {
  async getBills() {
    return api.get('/api/bills');
  },
  
  async getBill(id: number) {
    return api.get(`/api/bills/${id}`);
  },
  
  async getBillComments(id: number) {
    return api.get(`/api/bills/${id}/comments`);
  },
  
  async createBillComment(billId: number, comment: any) {
    return api.post(`/api/bills/${billId}/comments`, comment);
  },
  
  async recordEngagement(billId: number, engagement: any) {
    return api.post(`/api/bills/${billId}/engagement`, engagement);
  },
  
  async getBillCategories() {
    return api.get('/api/bills/meta/categories');
  },
  
  async getBillStatuses() {
    return api.get('/api/bills/meta/statuses');
  }
};

// System API
export const systemApi = {
  async getHealth() {
    return api.get('/api/health');
  },
  
  async getStats() {
    return api.get('/api/health/stats');
  },
  
  async getActivity() {
    return api.get('/api/health/activity');
  },
  
  async getSchema() {
    return api.get('/api/system/schema');
  }
};







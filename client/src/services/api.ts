/**
 * Simple API service for frontend
 * Provides a clean interface for making HTTP requests
 */

import { logger } from '../utils/browser-logger';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3000';
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as ApiError;
        error.status = response.status;
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response.text() as unknown as T;
    } catch (error) {
      logger.error('API request failed:', { component: 'ApiService' }, error);
      throw error;
    }
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers = data instanceof FormData 
      ? {} 
      : { 'Content-Type': 'application/json' };

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
      headers: { ...headers, ...options?.headers },
    });
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers = data instanceof FormData 
      ? {} 
      : { 'Content-Type': 'application/json' };

    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
      headers: { ...headers, ...options?.headers },
    });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiService();

// Bills API
export const billsApi = {
  getAll: (params?: any) => api.get('/api/bills', { ...params }),
  getById: (id: string | number) => api.get(`/api/bills/${id}`),
  getComments: (billId: string | number) => api.get(`/api/bills/${billId}/comments`),
  getSponsors: (billId: string | number) => api.get(`/api/bills/${billId}/sponsors`),
  getAnalysis: (billId: string | number) => api.get(`/api/bills/${billId}/analysis`),
  getCategories: () => api.get('/api/bills/categories'),
  getStatuses: () => api.get('/api/bills/statuses'),
  addComment: (billId: string | number, comment: any) => api.post(`/api/bills/${billId}/comments`, comment),
  recordEngagement: (billId: string | number, engagement: any) => api.post(`/api/bills/${billId}/engagement`, engagement),
};

// System API
export const systemApi = {
  getHealth: () => api.get('/api/system/health'),
  getStats: () => api.get('/api/system/stats'),
  getActivity: () => api.get('/api/system/activity'),
  getSchema: () => api.get('/api/system/schema'),
  getEnvironment: () => api.get('/api/system/environment'),
};


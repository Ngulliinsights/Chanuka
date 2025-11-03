/**
 * Simple API service for frontend
 * Provides a clean interface for making HTTP requests with runtime validation
 */

import { logger } from '../utils/browser-logger';
import { validationService } from '@shared/core';
import { ZodSchema } from 'zod';
import { envConfig } from '../utils/env-config';

export interface ApiError extends Error {
  status?: number;
  code?: string;
  details?: any;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    // Use validated environment configuration
    this.baseUrl = envConfig.apiUrl;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    responseSchema?: ZodSchema<T>
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add authentication token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      };
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        // Try to get more detailed error from response body
        try {
          const errorBody = await response.json();
          if (errorBody.error || errorBody.message) {
            errorMessage = errorBody.error || errorBody.message;
          }
        } catch {
          // Ignore JSON parsing errors for error responses
        }
        
        const error = new Error(errorMessage) as ApiError;
        error.status = response.status;
        
        // Handle specific HTTP status codes
        if (response.status === 401) {
          // Unauthorized - clear token and redirect to auth
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          if (window.location.pathname !== '/auth') {
            window.location.href = '/auth';
          }
        }
        
        throw error;
      }

      const content_type = response.headers.get('content-type');
      let data: T;

      if (content_type && content_type.includes('application/json')) {
        data = await response.json();
        
        // Basic response validation for API responses with success/error structure
        if (data && typeof data === 'object' && 'success' in data && (data as any).success === false) {
          const error = new Error((data as any).error || 'API request failed') as ApiError;
          error.code = (data as any).code;
          error.details = (data as any).details;
          throw error;
        }
      } else {
        data = response.text() as unknown as T;
      }

      // Validate response data if schema is provided
      if (responseSchema) {
        try {
          data = await validationService.validate(responseSchema, data);
        } catch (validationError) {
          logger.error('API response validation failed:', { component: 'ApiService', endpoint }, validationError);
          throw validationError;
        }
      }

      return data;
    } catch (error) {
      logger.error('API request failed:', { component: 'ApiService', url, method: options.method || 'GET' }, error);
      
      // Re-throw with additional context
      if (error instanceof Error) {
        const apiError = error as ApiError;
        apiError.details = { url, method: options.method || 'GET', ...apiError.details };
      }
      
      throw error;
    }
  }

  async get<T>(endpoint: string, options?: RequestInit, responseSchema?: ZodSchema<T>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' }, responseSchema);
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit, responseSchema?: ZodSchema<T>): Promise<T> {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers = data instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' };

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
      headers: { ...headers, ...options?.headers },
    }, responseSchema);
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit, responseSchema?: ZodSchema<T>): Promise<T> {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    const headers = data instanceof FormData
      ? {}
      : { 'Content-Type': 'application/json' };

    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
      headers: { ...headers, ...options?.headers },
    }, responseSchema);
  }

  async delete<T>(endpoint: string, options?: RequestInit, responseSchema?: ZodSchema<T>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' }, responseSchema);
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestInit, responseSchema?: ZodSchema<T>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    }, responseSchema);
  }
}

export const api = new ApiService();

// Bills API
export const billsApi = {
  getAll: (params?: any) => api.get('/api/bills', { ...params }),
  getById: (id: string | number) => api.get(`/api/bills/${id}`),
  getComments: (bill_id: string | number) => api.get(`/api/bills/${ bill_id }/comments`),
  getSponsors: (bill_id: string | number) => api.get(`/api/bills/${ bill_id }/sponsors`),
  getAnalysis: (bill_id: string | number) => api.get(`/api/bills/${ bill_id }/analysis`),
  getCategories: () => api.get('/api/bills/categories'),
  getStatuses: () => api.get('/api/bills/statuses'),
  addComment: (bill_id: string | number, comment: any) => api.post(`/api/bills/${ bill_id }/comments`, comment),
  recordEngagement: (bill_id: string | number, engagement: any) => api.post(`/api/bills/${ bill_id }/engagement`, engagement),
};

// Import schemas for validation
import {
  selectBillSchema,
  selectBillCommentSchema,
  selectSponsorSchema,
  selectAnalysisSchema,
  insertBillCommentSchema
} from '@shared/schema';

// Bills API with validation
export const billsApiValidated = {
  getAll: (params?: any) => api.get('/api/bills', { ...params }, selectBillSchema.array()),
  getById: (id: string | number) => api.get(`/api/bills/${id}`, undefined, selectBillSchema),
  getComments: (bill_id: string | number) => api.get(`/api/bills/${ bill_id }/comments`, undefined, selectBillCommentSchema.array()),
  getSponsors: (bill_id: string | number) => api.get(`/api/bills/${ bill_id }/sponsors`, undefined, selectSponsorSchema.array()),
  getAnalysis: (bill_id: string | number) => api.get(`/api/bills/${ bill_id }/analysis`, undefined, selectAnalysisSchema),
  getCategories: () => api.get('/api/bills/categories'),
  getStatuses: () => api.get('/api/bills/statuses'),
  addComment: (bill_id: string | number, comment: any) => api.post(`/api/bills/${ bill_id }/comments`, comment, undefined, selectBillCommentSchema),
  recordEngagement: (bill_id: string | number, engagement: any) => api.post(`/api/bills/${ bill_id }/engagement`, engagement),
};

// System API
export const systemApi = {
  getHealth: () => api.get('/api/system/health'),
  getStats: () => api.get('/api/system/stats'),
  getActivity: () => api.get('/api/system/activity'),
  getSchema: () => api.get('/api/system/schema'),
  getEnvironment: () => api.get('/api/system/environment'),
};


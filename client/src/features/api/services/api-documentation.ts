/**
 * API Documentation Service
 * Delegates to centralized infrastructure, adds feature-specific logic
 */
import { globalApiClient } from '@client/infrastructure/api/client';
import type { ApiDocumentation, ApiAccessRequest } from '../types';

export const apiDocumentationService = {
  async fetchDocumentation(): Promise<ApiDocumentation> {
    const response = await globalApiClient.get('/api/documentation');
    return response.data;
  },

  async requestAccess(request: ApiAccessRequest): Promise<{ accessKey: string; expiresAt: string }> {
    const response = await globalApiClient.post('/api/access-request', request);
    return response.data;
  },

  async getEndpointDetails(endpoint: string): Promise<unknown> {
    const response = await globalApiClient.get(`/api/documentation/endpoints/${endpoint}`);
    return response.data;
  },
};

export const apiDocService = apiDocumentationService;

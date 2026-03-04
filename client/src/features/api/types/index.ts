/**
 * API Documentation Feature Types
 */

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  authentication?: string;
  parameters?: Record<string, unknown>;
  response: Record<string, unknown>;
}

export interface ApiDocumentation {
  version: string;
  endpoints: ApiEndpoint[];
  baseUrl: string;
  authMethods: string[];
}

export interface ApiAccessRequest {
  userId: string;
  endpoint: string;
  rateLimitTier: 'free' | 'pro' | 'enterprise';
}

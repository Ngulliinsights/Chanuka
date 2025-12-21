/**
 * Error Response Types
 * 
 * Comprehensive type definitions for API error responses to replace any types
 */

export interface ApiErrorResponse {
  message?: string;
  error?: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
  timestamp?: string;
  path?: string;
  method?: string;
}

export interface AxiosErrorResponse {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    statusText?: string;
  };
  message?: string;
  config?: {
    url?: string;
    method?: string;
  };
}

export interface FetchErrorResponse {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
    statusText?: string;
  };
  message?: string;
  config?: {
    url?: string;
    method?: string;
  };
}

export type UnknownError = AxiosErrorResponse | FetchErrorResponse | Error | unknown;

export interface ErrorContext {
  component?: string;
  operation?: string;
  status?: number;
  endpoint?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface PrivacySettings {
  profile_visibility: 'public' | 'registered' | 'private';
  email_visibility: 'public' | 'registered' | 'private';
  activity_tracking: boolean;
  analytics_consent: boolean;
  marketing_consent: boolean;
  data_sharing_consent: boolean;
  location_tracking: boolean;
  personalized_content: boolean;
  third_party_integrations: boolean;
}

export interface DataExportRequest {
  format?: 'json' | 'csv';
  includePersonalData?: boolean;
  includeActivityData?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface DataExportResponse {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: string;
  estimatedSize?: number;
}

export interface DataDeletionRequest {
  confirmPassword?: string;
  reason?: string;
  retainAnonymizedData?: boolean;
}

export interface DataDeletionResponse {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledDeletionDate?: string;
  retentionPeriod?: number;
}
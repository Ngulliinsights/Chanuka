// Standardized API response types for consistent error handling and responses

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    source: 'database' | 'cache' | 'fallback';
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// Request types for common operations
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
}

// Bill-related types
export interface BillFilters {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BillEngagementStats {
  totalViews: number;
  totalComments: number;
  totalShares: number;
  uniqueViewers: number;
  totalEngagements: number;
}

// Verification types
export interface VerificationRequest {
  billId: number;
  expertId: number;
  verificationStatus: string;
  confidence?: number;
  feedback?: string;
  metadata?: any;
}

// System health types
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'error';
  timestamp: string;
  uptime?: number;
  error?: string;
}

// Helper function to create standardized responses
export function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: string,
  metadata?: ApiResponse['metadata']
): ApiResponse<T> {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error }),
    metadata: {
      timestamp: new Date().toISOString(),
      source: 'database',
      ...metadata,
    },
  };
}

export function createErrorResponse(error: string, code?: string, details?: any): ErrorResponse {
  return {
    error,
    ...(code && { code }),
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };
}
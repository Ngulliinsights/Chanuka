/**
 * Global type declarations
 */

// Environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    VITE_API_URL?: string;
    VITE_WS_URL?: string;
    VITE_ENABLE_ANALYTICS?: string;
    VITE_ENABLE_SECURITY_MONITORING?: string;
    VITE_LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  }
}

// Utility types
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

// Common interfaces
interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export {};

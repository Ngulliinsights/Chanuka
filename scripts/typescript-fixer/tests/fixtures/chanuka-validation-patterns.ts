// Test fixtures for Chanuka validation patterns that need exactOptionalPropertyTypes fixes

// User Profile Interfaces
export interface UserProfileData {
  bio?: string;
  expertise?: string[];
  location?: string;
  organization?: string;
  is_public?: boolean;
}

export interface UserPreferences {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
  notificationFrequency?: 'immediate' | 'daily' | 'weekly';
  billCategories?: string[];
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export interface UserVerificationData {
  verification_status: 'pending' | 'verified' | 'rejected';
  verificationDocuments?: any;
  verificationNotes?: string;
}

// Validation Middleware Interfaces
export interface RequestValidationConfig {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
  options?: ValidationOptions;
  onError?: (error: ValidationError, req: Request, res: Response, next: NextFunction) => void;
  skipIf?: (req: Request) => boolean;
  transform?: (data: any, req: Request) => any;
}

export interface ValidationOptions {
  strict?: boolean;
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  errorMessage?: string;
  context?: ValidationContext;
}

export interface ValidationDecoratorOptions {
  schema: ZodSchema;
  property?: string;
  options?: ValidationOptions;
  errorMessage?: string;
}

// Configuration Objects
export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  connectionTimeout?: number;
  maxConnections?: number;
}

export interface CacheConfig {
  enabled?: boolean;
  ttl?: number;
  maxSize?: number;
  strategy?: 'lru' | 'fifo' | 'lfu';
  prefix?: string;
}

// API Response Types
export interface ApiResponseMetadata {
  timestamp?: Date;
  requestId?: string;
  processingTime?: number;
  source?: string;
  version?: string;
}

export interface ApiErrorDetails {
  code?: string;
  field?: string;
  message?: string;
  context?: any;
}

// Middleware Function Types
export type ValidationMiddleware = (
  req: Request,
  res: Response,
  next?: NextFunction
) => Promise<void> | void;

export type ErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next?: NextFunction
) => void;

// Complex nested optional types
export interface NestedOptionalConfig {
  database?: {
    primary?: DatabaseConfig;
    replica?: DatabaseConfig;
    migrations?: {
      enabled?: boolean;
      directory?: string;
      table?: string;
    };
  };
  cache?: {
    redis?: CacheConfig;
    memory?: CacheConfig;
  };
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error';
    format?: 'json' | 'text';
    outputs?: string[];
  };
}
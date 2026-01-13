/**
 * Common Utility Types - STANDARDIZED
 *
 * Standardized utility types following the exemplary patterns
 * Key improvements:
 * - Consistent naming conventions
 * - Proper generic typing
 * - Comprehensive documentation
 * - Type-safe utility functions
 */

// ============================================================================
// Common Utility Types
// ============================================================================

/**
 * Generic hook result type
 * Standardized pattern for all hook return types
 */
export interface UseHookResult<T, E = Error> {
  data: T | null;
  loading: boolean;
  error: E | null;
  refetch: () => Promise<void>;

  // Additional metadata
  lastUpdated?: Date;
  isStale?: boolean;
  isFetching?: boolean;
}

/**
 * Generic API response type
 * Standardized pattern for API responses
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  metadata?: Record<string, unknown>;

  // Pagination support
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * Generic error response type
 * Standardized error handling
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  code: string;
  errors: Array<{
    field?: string;
    message: string;
    code?: string;
  }>;
  timestamp: string;
  requestId?: string;
}

/**
 * Generic pagination type
 * Standardized pagination interface
 */
export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Generic sorting type
 * Standardized sorting interface
 */
export interface SortInfo {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Generic filtering type
 * Standardized filtering interface
 */
export interface FilterInfo {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: unknown;
}

/**
 * Generic query parameters type
 * Standardized API query interface
 */
export interface QueryParams {
  page?: number;
  pageSize?: number;
  sort?: SortInfo | SortInfo[];
  filter?: FilterInfo | FilterInfo[];
  search?: string;
  fields?: string[];
  include?: string[];
  exclude?: string[];
}

/**
 * Generic entity with metadata
 * Standardized entity pattern
 */
export interface EntityWithMetadata<T> {
  data: T;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    version?: number;
  };
}

/**
 * Generic async function result
 * Standardized async operation result
 */
export type AsyncResult<T> = Promise<{
  success: boolean;
  data?: T;
  error?: Error;
  timestamp: Date;
}>;

/**
 * Generic validation result
 * Standardized validation interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  message?: string;
}

/**
 * Generic form field validation
 * Standardized form validation
 */
export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestions?: string[];
}

/**
 * Generic cache interface
 * Standardized caching pattern
 */
export interface CacheInterface<T> {
  get: (key: string) => T | undefined;
  set: (key: string, value: T, ttl?: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  has: (key: string) => boolean;
  keys: () => string[];
}

/**
 * Generic event interface
 * Standardized event pattern
 */
export interface EventInterface<T = any> {
  type: string;
  timestamp: Date;
  payload: T;
  metadata?: Record<string, unknown>;
}

/**
 * Generic state management action
 * Standardized action pattern
 */
export interface StateAction<T = any> {
  type: string;
  payload?: T;
  meta?: Record<string, unknown>;
  timestamp?: Date;
}

/**
 * Generic reducer interface
 * Standardized reducer pattern
 */
export interface ReducerInterface<S, A> {
  (state: S, action: A): S;
}

/**
 * Generic middleware interface
 * Standardized middleware pattern
 */
export interface MiddlewareInterface<S, A> {
  (store: { getState: () => S; dispatch: (action: A) => void }, next: (action: A) => void, action: A): void;
}

/**
 * Generic subscription interface
 * Standardized subscription pattern
 */
export interface SubscriptionInterface {
  subscribe: (listener: () => void) => () => void;
  unsubscribe: (listener: () => void) => void;
  notify: () => void;
}

/**
 * Generic debounce options
 * Standardized debounce configuration
 */
export interface DebounceOptions {
  wait?: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

/**
 * Generic throttle options
 * Standardized throttle configuration
 */
export interface ThrottleOptions {
  wait?: number;
  leading?: boolean;
  trailing?: boolean;
}

/**
 * Generic retry options
 * Standardized retry configuration
 */
export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetries?: (error: Error) => void;
}

/**
 * Generic timeout options
 * Standardized timeout configuration
 */
export interface TimeoutOptions {
  timeout?: number;
  onTimeout?: () => void;
  signal?: AbortSignal;
}

/**
 * Generic logging interface
 * Standardized logging pattern
 */
export interface LoggerInterface {
  debug: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, context?: Record<string, unknown>) => void;
  trace: (message: string, context?: Record<string, unknown>) => void;
}

/**
 * Generic metrics interface
 * Standardized metrics pattern
 */
export interface MetricsInterface {
  increment: (metric: string, value?: number, tags?: Record<string, string>) => void;
  decrement: (metric: string, value?: number, tags?: Record<string, string>) => void;
  gauge: (metric: string, value: number, tags?: Record<string, string>) => void;
  histogram: (metric: string, value: number, tags?: Record<string, string>) => void;
  timing: (metric: string, duration: number, tags?: Record<string, string>) => void;
}

/**
 * Generic feature flag interface
 * Standardized feature flag pattern
 */
export interface FeatureFlagsInterface {
  isEnabled: (feature: string) => boolean;
  getValue: (feature: string) => any;
  getAll: () => Record<string, any>;
  onChange: (feature: string, callback: (value: any) => void) => () => void;
}

/**
 * Generic internationalization interface
 * Standardized i18n pattern
 */
export interface I18nInterface {
  t: (key: string, options?: Record<string, any>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: Date, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (value: number, currency?: string, options?: Intl.NumberFormatOptions) => string;
  getLocale: () => string;
  setLocale: (locale: string) => void;
}

/**
 * Generic analytics interface
 * Standardized analytics pattern
 */
export interface AnalyticsInterface {
  track: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, traits?: Record<string, any>) => void;
  page: (name?: string, properties?: Record<string, any>) => void;
  screen: (name: string, properties?: Record<string, any>) => void;
  group: (groupId: string, traits?: Record<string, any>) => void;
}

/**
 * Generic storage interface
 * Standardized storage pattern
 */
export interface StorageInterface {
  getItem: <T>(key: string) => T | null;
  setItem: <T>(key: string, value: T) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  key: (index: number) => string | null;
  length: number;
}

/**
 * Generic queue interface
 * Standardized queue pattern
 */
export interface QueueInterface<T> {
  enqueue: (item: T) => void;
  dequeue: () => T | undefined;
  peek: () => T | undefined;
  size: () => number;
  isEmpty: () => boolean;
  clear: () => void;
}

/**
 * Generic stack interface
 * Standardized stack pattern
 */
export interface StackInterface<T> {
  push: (item: T) => void;
  pop: () => T | undefined;
  peek: () => T | undefined;
  size: () => number;
  isEmpty: () => boolean;
  clear: () => void;
}

/**
 * Generic observable interface
 * Standardized observable pattern
 */
export interface ObservableInterface<T> {
  subscribe: (observer: (value: T) => void) => { unsubscribe: () => void };
  next: (value: T) => void;
  error: (error: Error) => void;
  complete: () => void;
}
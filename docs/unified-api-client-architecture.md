# Unified API Client Architecture Design

## Executive Summary

This document presents a comprehensive design for a unified API client architecture that consolidates the identified fragmentation issues in the Chanuka civic engagement platform. The design addresses multiple service layers, inconsistent caching, fragmented WebSocket implementations, and scattered error handling patterns.

## Current Fragmentation Issues Identified

### 1. Multiple Service Layers
- **apiService.ts**: Core API service with retry logic, caching, and validation
- **billsApiService.ts**: Bills-specific service extending core API
- ~~**webSocketService.ts**: Error analytics WebSocket service~~ (DEPRECATED - consolidated into UnifiedWebSocketManager)
- **billsWebSocketService.ts**: Bills-specific WebSocket service
- **community-backend-service.ts**: Community features service
- **errorAnalyticsBridge.ts**: Error analytics integration

### 2. Inconsistent Caching Strategies
- Memory cache in apiService with LRU eviction
- Offline data manager for persistence
- Search cache in billsApiService
- No unified cache key generation
- Different TTL strategies across services

### 3. Fragmented WebSocket Implementations
- Separate WebSocket clients for different domains
- Inconsistent connection management
- Different message handling patterns
- No unified subscription management

### 4. Scattered Error Handling
- Multiple error creation functions
- Inconsistent error types and structures
- Different retry and fallback strategies
- No unified error reporting pipeline

### 5. Configuration Management Issues
- Environment config scattered across files
- Hard-coded timeouts and limits
- No centralized service configuration
- Inconsistent API endpoint management

## Unified API Client Architecture

### Core Architecture Principles

1. **Single Entry Point**: One unified client for all API interactions
2. **Modular Services**: Domain-specific services built on unified core
3. **Consistent Patterns**: Unified caching, error handling, and WebSocket management
4. **Type Safety**: Comprehensive TypeScript interfaces and validation
5. **Performance**: Optimized caching, batching, and connection management

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Unified API Client                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Service    │ │   Cache     │ │ WebSocket   │           │
│  │  Registry   │ │  Manager    │ │  Manager    │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Bills API   │ │ Community   │ │ Auth API    │           │
│  │ Service     │ │ Service     │ │ Service     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Repository  │ │ Repository  │ │ Repository  │           │
│  │ Layer       │ │ Layer       │ │ Layer       │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## 1. Unified API Client Structure

### Core Client Interface

```typescript
interface UnifiedApiClient {
  // Core HTTP methods
  get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>>;

  // Service management
  registerService(name: string, service: ApiService): void;
  getService<T extends ApiService>(name: string): T;

  // Configuration
  configure(config: ClientConfig): void;
  getConfig(): ClientConfig;

  // Lifecycle
  initialize(): Promise<void>;
  cleanup(): void;
}

interface RequestOptions {
  timeout?: number;
  retry?: RetryConfig;
  cache?: CacheOptions;
  validate?: ValidationOptions;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: ApiError;
  metadata: {
    requestId: string;
    duration: number;
    cached: boolean;
    fromFallback: boolean;
  };
}
```

### Service Registry Pattern

```typescript
class ServiceRegistry {
  private services = new Map<string, ApiService>();
  private dependencies = new Map<string, string[]>();

  register(name: string, service: ApiService, dependencies: string[] = []): void {
    this.services.set(name, service);
    this.dependencies.set(name, dependencies);

    // Initialize service with dependencies
    this.injectDependencies(service, dependencies);
  }

  get<T extends ApiService>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found in registry`);
    }
    return service as T;
  }

  private injectDependencies(service: ApiService, dependencyNames: string[]): void {
    const dependencies: Record<string, ApiService> = {};

    for (const depName of dependencyNames) {
      const dependency = this.services.get(depName);
      if (!dependency) {
        throw new Error(`Dependency '${depName}' not found for service '${service.constructor.name}'`);
      }
      dependencies[depName] = dependency;
    }

    if ('setDependencies' in service) {
      (service as any).setDependencies(dependencies);
    }
  }
}
```

## 2. Repository Pattern Implementation

### Base Repository Interface

```typescript
interface Repository<T, K = number> {
  findById(id: K): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  findByCriteria(criteria: Partial<T>): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: K, updates: Partial<T>): Promise<T>;
  delete(id: K): Promise<boolean>;
  exists(id: K): Promise<boolean>;
  count(criteria?: Partial<T>): Promise<number>;
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: SortOptions;
  include?: string[];
  filter?: Record<string, any>;
}

interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}
```

### Domain-Specific Repositories

```typescript
// Bills Repository
class BillsRepository implements Repository<Bill> {
  constructor(private apiClient: UnifiedApiClient) {}

  async findById(id: number): Promise<Bill | null> {
    const response = await this.apiClient.get<Bill>(`/api/bills/${id}`);
    return response.success ? response.data : null;
  }

  async findAll(options?: QueryOptions): Promise<Bill[]> {
    const params = this.buildQueryParams(options);
    const response = await this.apiClient.get<Bill[]>(`/api/bills${params}`);
    return response.success ? response.data : [];
  }

  async search(query: BillsSearchParams): Promise<PaginatedBillsResponse> {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else if (typeof value === 'object') {
          params.append(key, JSON.stringify(value));
        } else {
          params.append(key, String(value));
        }
      }
    });

    const response = await this.apiClient.get<PaginatedBillsResponse>(
      `/api/bills/search?${params.toString()}`
    );

    return response.success ? response.data : { bills: [], pagination: {}, stats: {} };
  }

  private buildQueryParams(options?: QueryOptions): string {
    if (!options) return '';

    const params = new URLSearchParams();

    if (options.limit) params.append('limit', options.limit.toString());
    if (options.offset) params.append('offset', options.offset.toString());
    if (options.sort) {
      params.append('sort_by', options.sort.field);
      params.append('sort_order', options.sort.direction);
    }

    return `?${params.toString()}`;
  }
}

// Community Repository
class CommunityRepository implements Repository<DiscussionThread> {
  constructor(private apiClient: UnifiedApiClient) {}

  async findById(id: number): Promise<DiscussionThread | null> {
    const response = await this.apiClient.get<DiscussionThread>(`/api/community/discussions/${id}`);
    return response.success ? response.data : null;
  }

  async getComments(billId: number, options?: QueryOptions): Promise<Comment[]> {
    const params = this.buildQueryParams(options);
    const response = await this.apiClient.get<Comment[]>(`/api/bills/${billId}/comments${params}`);
    return response.success ? response.data : [];
  }

  async addComment(billId: number, comment: CommentFormData): Promise<Comment> {
    const response = await this.apiClient.post<Comment>(`/api/bills/${billId}/comments`, comment);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to add comment');
    }
    return response.data;
  }
}
```

## 3. Unified Caching Strategy

### Cache Manager Architecture

```typescript
interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  storage: 'memory' | 'localStorage' | 'indexedDB';
  compression: boolean;
  encryption: boolean;
}

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  metadata: {
    size: number;
    compressed: boolean;
    encrypted: boolean;
  };
}

class UnifiedCacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private persistentCache: PersistentCacheAdapter;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.persistentCache = this.createPersistentCache(config.storage);
    this.startCleanupTimer();
  }

  async get<T>(key: string): Promise<T | null> {
    // Try memory cache first
    let entry = this.memoryCache.get(key);
    if (entry && !this.isExpired(entry)) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      return entry.data;
    }

    // Try persistent cache
    entry = await this.persistentCache.get(key);
    if (entry && !this.isExpired(entry)) {
      // Restore to memory cache
      this.memoryCache.set(key, entry);
      return entry.data;
    }

    return null;
  }

  async set<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || this.config.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      metadata: {
        size: this.calculateSize(data),
        compressed: options?.compress || false,
        encrypted: options?.encrypt || false
      }
    };

    // Compress if enabled
    if (this.config.compression && !entry.metadata.compressed) {
      entry.data = await this.compress(data);
      entry.metadata.compressed = true;
    }

    // Encrypt if enabled
    if (this.config.encryption && !entry.metadata.encrypted) {
      entry.data = await this.encrypt(entry.data);
      entry.metadata.encrypted = true;
    }

    // Store in memory
    this.memoryCache.set(key, entry);

    // Store persistently if configured
    if (options?.persist !== false) {
      await this.persistentCache.set(key, entry);
    }

    // Enforce size limits
    this.enforceSizeLimits();
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private async compress(data: any): Promise<any> {
    // Implementation would use a compression library like pako
    return data; // Placeholder
  }

  private async encrypt(data: any): Promise<any> {
    // Implementation would use Web Crypto API
    return data; // Placeholder
  }

  private enforceSizeLimits(): void {
    if (this.memoryCache.size <= this.config.maxSize) return;

    // Remove least recently used items
    const entries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toRemove = Math.ceil(this.config.maxSize * 0.1); // Remove 10%
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Clean up every minute
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Clean memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.memoryCache.delete(key));

    // Clean persistent cache
    await this.persistentCache.cleanup();
  }
}
```

### Cache Key Generation Strategy

```typescript
class CacheKeyGenerator {
  static generate(endpoint: string, params?: Record<string, any>, method: string = 'GET'): string {
    const baseKey = `${method}:${endpoint}`;

    if (!params || method !== 'GET') {
      return baseKey;
    }

    // Sort parameters for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);

    return `${baseKey}:${JSON.stringify(sortedParams)}`;
  }

  static generateEntityKey(entityType: string, id: string | number): string {
    return `entity:${entityType}:${id}`;
  }

  static generateCollectionKey(entityType: string, query?: Record<string, any>): string {
    if (!query) {
      return `collection:${entityType}`;
    }

    const sortedQuery = Object.keys(query)
      .sort()
      .reduce((result, key) => {
        result[key] = query[key];
        return result;
      }, {} as Record<string, any>);

    return `collection:${entityType}:${JSON.stringify(sortedQuery)}`;
  }

  static generateSearchKey(searchType: string, query: string, filters?: Record<string, any>): string {
    const filterString = filters ? JSON.stringify(this.sortObject(filters)) : '';
    return `search:${searchType}:${query}:${filterString}`;
  }

  private static sortObject(obj: Record<string, any>): Record<string, any> {
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = obj[key];
        return result;
      }, {} as Record<string, any>);
  }
}
```

## 4. Consolidated WebSocket Service

### Unified WebSocket Manager

```typescript
interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnect: {
    enabled: boolean;
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  heartbeat: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  message: {
    compression: boolean;
    batching: boolean;
    batchSize: number;
    batchInterval: number;
  };
}

interface Subscription {
  id: string;
  topic: string;
  filters?: Record<string, any>;
  callback: (message: any) => void;
  priority: 'high' | 'medium' | 'low';
}

class UnifiedWebSocketManager {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private subscriptions = new Map<string, Subscription>();
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private batchTimer: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private isConnecting = false;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connectionState === 'connected' || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.connectionState = 'connecting';

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);

      return new Promise((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not initialized'));

        this.ws.onopen = () => {
          this.onConnected();
          resolve();
        };

        this.ws.onmessage = (event) => this.onMessage(event);
        this.ws.onclose = (event) => this.onDisconnected(event);
        this.ws.onerror = (error) => {
          this.onError(error);
          reject(error);
        };
      });
    } catch (error) {
      this.isConnecting = false;
      this.connectionState = 'error';
      throw error;
    }
  }

  subscribe(topic: string, callback: (message: any) => void, options?: {
    filters?: Record<string, any>;
    priority?: 'high' | 'medium' | 'low';
  }): string {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: Subscription = {
      id: subscriptionId,
      topic,
      filters: options?.filters,
      callback,
      priority: options?.priority || 'medium'
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send subscription message if connected
    if (this.connectionState === 'connected') {
      this.sendSubscriptionMessage(subscription);
    }

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.subscriptions.delete(subscriptionId);

    // Send unsubscription message if connected
    if (this.connectionState === 'connected') {
      this.sendUnsubscriptionMessage(subscription);
    }
  }

  private onConnected(): void {
    this.isConnecting = false;
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;

    // Start heartbeat if enabled
    if (this.config.heartbeat.enabled) {
      this.startHeartbeat();
    }

    // Start batch processing if enabled
    if (this.config.message.batching) {
      this.startBatchProcessing();
    }

    // Re-subscribe to all topics
    this.resubscribeAll();

    // Emit connection event
    this.emit('connected');
  }

  private onMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      // Handle heartbeat
      if (message.type === 'heartbeat') {
        this.handleHeartbeat(message);
        return;
      }

      // Route message to subscribers
      this.routeMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private routeMessage(message: any): void {
    const matchingSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => this.matchesSubscription(sub, message));

    matchingSubscriptions.forEach(sub => {
      try {
        sub.callback(message);
      } catch (error) {
        console.error(`Error in subscription callback for ${sub.topic}:`, error);
      }
    });
  }

  private matchesSubscription(subscription: Subscription, message: any): boolean {
    // Check topic match
    if (subscription.topic !== message.topic && subscription.topic !== '*') {
      return false;
    }

    // Check filters
    if (subscription.filters) {
      return this.matchesFilters(message, subscription.filters);
    }

    return true;
  }

  private matchesFilters(message: any, filters: Record<string, any>): boolean {
    for (const [key, expectedValue] of Object.entries(filters)) {
      const actualValue = message[key];

      if (Array.isArray(expectedValue)) {
        if (!expectedValue.includes(actualValue)) {
          return false;
        }
      } else if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  private sendSubscriptionMessage(subscription: Subscription): void {
    this.send({
      type: 'subscribe',
      topic: subscription.topic,
      filters: subscription.filters,
      subscriptionId: subscription.id
    });
  }

  private sendUnsubscriptionMessage(subscription: Subscription): void {
    this.send({
      type: 'unsubscribe',
      topic: subscription.topic,
      subscriptionId: subscription.id
    });
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach(subscription => {
      this.sendSubscriptionMessage(subscription);
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'heartbeat', timestamp: Date.now() });
    }, this.config.heartbeat.interval);
  }

  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      if (this.messageQueue.length > 0) {
        this.processBatch();
      }
    }, this.config.message.batchInterval);
  }

  private processBatch(): void {
    const batch = this.messageQueue.splice(0, this.config.message.batchSize);

    if (batch.length > 0) {
      this.send({
        type: 'batch',
        messages: batch,
        timestamp: Date.now()
      });
    }
  }

  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const messageString = JSON.stringify(message);
      this.ws.send(messageString);
    }
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emit(event: string, data?: any): void {
    // Implementation would use an event emitter
    console.log(`WebSocket event: ${event}`, data);
  }
}
```

## 5. Standardized Error Handling

### Unified Error Types

```typescript
enum ErrorDomain {
  NETWORK = 'network',
  AUTHENTICATION = 'auth',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business',
  SYSTEM = 'system',
  EXTERNAL_SERVICE = 'external'
}

enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

enum ErrorCode {
  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_DISCONNECTED = 'NETWORK_DISCONNECTED',
  NETWORK_SERVER_ERROR = 'NETWORK_SERVER_ERROR',

  // Authentication errors
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',

  // Validation errors
  VALIDATION_INVALID_INPUT = 'VALIDATION_INVALID_INPUT',
  VALIDATION_MISSING_REQUIRED = 'VALIDATION_MISSING_REQUIRED',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',

  // Business logic errors
  BUSINESS_ENTITY_NOT_FOUND = 'BUSINESS_ENTITY_NOT_FOUND',
  BUSINESS_DUPLICATE_ENTITY = 'BUSINESS_DUPLICATE_ENTITY',
  BUSINESS_INVALID_STATE = 'BUSINESS_INVALID_STATE'
}

interface UnifiedError {
  id: string;
  code: ErrorCode;
  domain: ErrorDomain;
  severity: ErrorSeverity;
  message: string;
  details?: Record<string, any>;
  context?: {
    component: string;
    operation: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
    timestamp: string;
  };
  cause?: UnifiedError;
  stack?: string;
  recoverable: boolean;
  retryable: boolean;
  reported: boolean;
}
```

### Error Handler Service

```typescript
class UnifiedErrorHandler {
  private errorReporters: ErrorReporter[] = [];
  private errorTransformers: ErrorTransformer[] = [];
  private recoveryStrategies: Map<ErrorCode, RecoveryStrategy> = new Map();

  registerReporter(reporter: ErrorReporter): void {
    this.errorReporters.push(reporter);
  }

  registerTransformer(transformer: ErrorTransformer): void {
    this.errorTransformers.push(transformer);
  }

  registerRecoveryStrategy(code: ErrorCode, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(code, strategy);
  }

  async handleError(error: UnifiedError | Error, context?: Record<string, any>): Promise<void> {
    // Transform error if needed
    const unifiedError = this.transformError(error, context);

    // Log error
    this.logError(unifiedError);

    // Report error
    await this.reportError(unifiedError);

    // Attempt recovery if possible
    if (unifiedError.recoverable) {
      await this.attemptRecovery(unifiedError);
    }

    // Emit error event for UI handling
    this.emitErrorEvent(unifiedError);
  }

  private transformError(error: UnifiedError | Error, context?: Record<string, any>): UnifiedError {
    // Apply transformers
    let unifiedError: UnifiedError;

    if (this.isUnifiedError(error)) {
      unifiedError = error;
    } else {
      // Transform raw error to unified format
      unifiedError = {
        id: this.generateErrorId(),
        code: this.mapErrorToCode(error),
        domain: this.detectDomain(error),
        severity: this.detectSeverity(error),
        message: error.message,
        context: {
          component: context?.component || 'unknown',
          operation: context?.operation || 'unknown',
          timestamp: new Date().toISOString(),
          ...context
        },
        recoverable: this.isRecoverable(error),
        retryable: this.isRetryable(error),
        reported: false
      };

      if (error instanceof Error && error.stack) {
        unifiedError.stack = error.stack;
      }
    }

    // Apply custom transformers
    for (const transformer of this.errorTransformers) {
      unifiedError = transformer.transform(unifiedError);
    }

    return unifiedError;
  }

  private async reportError(error: UnifiedError): Promise<void> {
    if (error.reported) return;

    const reportPromises = this.errorReporters.map(reporter =>
      reporter.report(error).catch(err =>
        console.error('Error reporter failed:', err)
      )
    );

    await Promise.allSettled(reportPromises);
    error.reported = true;
  }

  private async attemptRecovery(error: UnifiedError): Promise<void> {
    const strategy = this.recoveryStrategies.get(error.code);

    if (strategy) {
      try {
        await strategy.recover(error);
      } catch (recoveryError) {
        console.error('Recovery strategy failed:', recoveryError);
      }
    }
  }

  private logError(error: UnifiedError): void {
    const logLevel = this.mapSeverityToLogLevel(error.severity);
    const logMessage = `[${error.domain}:${error.code}] ${error.message}`;

    console[logLevel](logMessage, {
      errorId: error.id,
      context: error.context,
      details: error.details
    });
  }

  private emitErrorEvent(error: UnifiedError): void {
    window.dispatchEvent(new CustomEvent('unifiedError', {
      detail: error
    }));
  }

  private isUnifiedError(error: any): error is UnifiedError {
    return error && typeof error.id === 'string' && typeof error.code === 'string';
  }

  private mapErrorToCode(error: Error): ErrorCode {
    // Map common error types to codes
    if (error.name === 'TimeoutError') return ErrorCode.NETWORK_TIMEOUT;
    if (error.message.includes('401')) return ErrorCode.AUTH_INVALID_CREDENTIALS;
    if (error.message.includes('403')) return ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS;
    if (error.message.includes('404')) return ErrorCode.BUSINESS_ENTITY_NOT_FOUND;

    return ErrorCode.SYSTEM_UNKNOWN_ERROR;
  }

  private detectDomain(error: Error): ErrorDomain {
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return ErrorDomain.NETWORK;
    }
    if (error.message.includes('auth')) {
      return ErrorDomain.AUTHENTICATION;
    }
    return ErrorDomain.SYSTEM;
  }

  private detectSeverity(error: Error): ErrorSeverity {
    if (error.message.includes('critical') || error.name === 'CriticalError') {
      return ErrorSeverity.CRITICAL;
    }
    if (error.message.includes('high') || error.name === 'HighPriorityError') {
      return ErrorSeverity.HIGH;
    }
    return ErrorSeverity.MEDIUM;
  }

  private isRecoverable(error: Error): boolean {
    // Define which errors are recoverable
    return !error.message.includes('permanent') && !error.message.includes('fatal');
  }

  private isRetryable(error: Error): boolean {
    // Define which errors are retryable
    return error.name === 'TimeoutError' || error.message.includes('temporary');
  }

  private mapSeverityToLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

interface ErrorReporter {
  report(error: UnifiedError): Promise<void>;
}

interface ErrorTransformer {
  transform(error: UnifiedError): UnifiedError;
}

interface RecoveryStrategy {
  recover(error: UnifiedError): Promise<void>;
}
```

## 6. Centralized Configuration Management

### Configuration Service

```typescript
interface ServiceConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retry: RetryConfig;
    cache: CacheConfig;
  };
  websocket: WebSocketConfig;
  features: Record<string, boolean>;
  limits: {
    maxConcurrentRequests: number;
    maxCacheSize: number;
    maxWebSocketSubscriptions: number;
  };
  monitoring: {
    enableMetrics: boolean;
    enableTracing: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

class ConfigurationService {
  private config: ServiceConfig;
  private configValidators: ConfigValidator[] = [];
  private configObservers: ConfigObserver[] = [];

  constructor(initialConfig: Partial<ServiceConfig>) {
    this.config = this.mergeWithDefaults(initialConfig);
    this.validateConfig();
  }

  get<K extends keyof ServiceConfig>(key: K): ServiceConfig[K] {
    return this.config[key];
  }

  getNested<T>(path: string): T | undefined {
    return path.split('.').reduce((obj: any, key) => obj?.[key], this.config) as T;
  }

  set<K extends keyof ServiceConfig>(key: K, value: ServiceConfig[K]): void {
    const oldValue = this.config[key];
    this.config[key] = value;

    this.validateConfig();
    this.notifyObservers(key, value, oldValue);
  }

  update(updates: Partial<ServiceConfig>): void {
    const oldConfig = { ...this.config };

    this.config = this.mergeWithDefaults({ ...this.config, ...updates });

    this.validateConfig();
    this.notifyObservers('config', this.config, oldConfig);
  }

  registerValidator(validator: ConfigValidator): void {
    this.configValidators.push(validator);
  }

  registerObserver(observer: ConfigObserver): void {
    this.configObservers.push(observer);
  }

  loadFromEnvironment(): void {
    const envConfig = {
      api: {
        baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000',
        timeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '10000'),
      },
      websocket: {
        url: process.env.REACT_APP_WS_URL || 'ws://localhost:8080',
      },
      features: {
        offlineMode: process.env.REACT_APP_OFFLINE_MODE === 'true',
        realTimeUpdates: process.env.REACT_APP_REALTIME_UPDATES !== 'false',
        analytics: process.env.REACT_APP_ANALYTICS !== 'false',
      },
      monitoring: {
        logLevel: (process.env.REACT_APP_LOG_LEVEL as any) || 'info',
      }
    };

    this.update(envConfig);
  }

  export(): ServiceConfig {
    return { ...this.config };
  }

  private mergeWithDefaults(partialConfig: Partial<ServiceConfig>): ServiceConfig {
    const defaults: ServiceConfig = {
      api: {
        baseUrl: 'http://localhost:5000',
        timeout: 10000,
        retry: {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2
        },
        cache: {
          defaultTTL: 5 * 60 * 1000, // 5 minutes
          maxSize: 100,
          storage: 'memory',
          compression: false,
          encryption: false
        }
      },
      websocket: {
        url: 'ws://localhost:8080',
        reconnect: {
          enabled: true,
          maxAttempts: 5,
          baseDelay: 1000,
          maxDelay: 30000,
          backoffMultiplier: 2
        },
        heartbeat: {
          enabled: true,
          interval: 30000,
          timeout: 5000
        },
        message: {
          compression: false,
          batching: true,
          batchSize: 10,
          batchInterval: 1000
        }
      },
      features: {
        offlineMode: true,
        realTimeUpdates: true,
        analytics: true,
        errorReporting: true,
        performanceMonitoring: true
      },
      limits: {
        maxConcurrentRequests: 10,
        maxCacheSize: 100,
        maxWebSocketSubscriptions: 50
      },
      monitoring: {
        enableMetrics: true,
        enableTracing: true,
        logLevel: 'info'
      }
    };

    return this.deepMerge(defaults, partialConfig);
  }

  private deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          result[key] = sourceValue as T[typeof key];
        }
      }
    }

    return result;
  }

  private isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private validateConfig(): void {
    for (const validator of this.configValidators) {
      const errors = validator.validate(this.config);
      if (errors.length > 0) {
        throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
      }
    }
  }

  private notifyObservers(key: string, newValue: any, oldValue: any): void {
    for (const observer of this.configObservers) {
      try {
        observer.onConfigChange(key, newValue, oldValue);
      } catch (error) {
        console.error('Config observer error:', error);
      }
    }
  }
}

interface ConfigValidator {
  validate(config: ServiceConfig): string[];
}

interface ConfigObserver {
  onConfigChange(key: string, newValue: any, oldValue: any): void;
}
```

## 7. Type Safety and Validation

### Unified Type Definitions

```typescript
// Base API Types
interface ApiRequest<T = any> {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  body?: T;
  timeout: number;
  timestamp: string;
}

interface ApiResponse<T = any> {
  id: string;
  requestId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: T;
  timestamp: string;
  duration: number;
  cached: boolean;
  fromFallback: boolean;
}

// Domain Types
interface Bill {
  id: number;
  billNumber: string;
  title: string;
  summary: string;
  status: BillStatus;
  urgencyLevel: UrgencyLevel;
  introducedDate: string;
  lastUpdated: string;
  sponsors: Sponsor[];
  constitutionalFlags: ConstitutionalFlag[];
  viewCount: number;
  saveCount: number;
  commentCount: number;
  shareCount: number;
  policyAreas: string[];
  complexity: ComplexityLevel;
  readingTime: number;
}

interface Comment {
  id: number;
  billId: number;
  userId: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  replies?: Comment[];
  voteCount: number;
  userVote?: 'up' | 'down' | null;
  moderated: boolean;
  moderationReason?: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  expertStatus?: ExpertStatus;
  reputation: number;
  joinedAt: string;
}

interface DiscussionThread {
  id: number;
  billId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  participantCount: number;
  messageCount: number;
  lastActivity: string;
  pinned: boolean;
  locked: boolean;
}

// Enums
enum BillStatus {
  INTRODUCED = 'introduced',
  COMMITTEE = 'committee',
  PASSED = 'passed',
  FAILED = 'failed',
  SIGNED = 'signed',
  VETOED = 'vetoed'
}

enum UrgencyLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

enum ExpertStatus {
  NONE = 'none',
  VERIFIED = 'verified',
  CONTRIBUTOR = 'contributor',
  MODERATOR = 'moderator'
}

// Validation Schemas
const BillSchema = z.object({
  id: z.number(),
  billNumber: z.string(),
  title: z.string(),
  summary: z.string(),
  status: z.nativeEnum(BillStatus),
  urgencyLevel: z.nativeEnum(UrgencyLevel),
  introducedDate: z.string(),
  lastUpdated: z.string(),
  sponsors: z.array(SponsorSchema),
  constitutionalFlags: z.array(ConstitutionalFlagSchema),
  viewCount: z.number(),
  saveCount: z.number(),
  commentCount: z.number(),
  shareCount: z.number(),
  policyAreas: z.array(z.string()),
  complexity: z.nativeEnum(ComplexityLevel),
  readingTime: z.number()
});

const CommentSchema = z.object({
  id: z.number(),
  billId: z.number(),
  userId: z.number(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: UserSchema,
  replies: z.array(z.lazy(() => CommentSchema)).optional(),
  voteCount: z.number(),
  userVote: z.enum(['up', 'down']).nullable().optional(),
  moderated: z.boolean(),
  moderationReason: z.string().optional()
});

// Service Interfaces
interface BillsService {
  getBill(id: number): Promise<Bill>;
  getBills(params?: BillsQueryParams): Promise<PaginatedResponse<Bill>>;
  searchBills(query: BillsSearchParams): Promise<PaginatedResponse<Bill>>;
  recordEngagement(billId: number, type: EngagementType): Promise<void>;
}

interface CommunityService {
  getDiscussionThread(billId: number): Promise<DiscussionThread>;
  getComments(billId: number, params?: CommentsQueryParams): Promise<PaginatedResponse<Comment>>;
  addComment(comment: CommentFormData): Promise<Comment>;
  updateComment(id: number, content: string): Promise<Comment>;
  voteComment(id: number, vote: 'up' | 'down'): Promise<Comment>;
  reportComment(id: number, reason: string): Promise<void>;
}

interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthResult>;
  getCurrentUser(): Promise<User>;
  updateProfile(updates: Partial<User>): Promise<User>;
}

// Query and Response Types
interface BillsQueryParams {
  status?: BillStatus[];
  urgency?: UrgencyLevel[];
  policyAreas?: string[];
  sponsors?: number[];
  dateRange?: DateRange;
  sortBy?: 'date' | 'title' | 'urgency' | 'engagement';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface BillsSearchParams extends BillsQueryParams {
  query?: string;
  constitutionalFlags?: boolean;
  controversyLevels?: string[];
}

interface CommentsQueryParams {
  sort?: 'newest' | 'oldest' | 'most_voted' | 'controversial' | 'expert_first';
  expertOnly?: boolean;
  limit?: number;
  offset?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  metadata?: {
    timestamp: string;
    duration: number;
  };
}

interface DateRange {
  start?: string;
  end?: string;
}

enum EngagementType {
  VIEW = 'view',
  SAVE = 'save',
  SHARE = 'share',
  COMMENT = 'comment'
}

// Form Types
interface CommentFormData {
  billId: number;
  content: string;
  parentId?: number;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResult {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: string;
}
```

## Architectural Diagrams

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Application                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │
│  │ React       │ │ State       │ │ Components  │ │ Services    │ │
│  │ Components  │ │ Management  │ │            │ │ Layer        │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Unified API Client Layer                     │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │ │
│  │  │ Service     │ │ Cache       │ │ WebSocket   │           │ │
│  │  │ Registry    │ │ Manager     │ │ Manager     │           │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘           │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Repository Layer                             │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │ │
│  │  │ Bills       │ │ Community   │ │ User        │           │ │
│  │  │ Repository  │ │ Repository  │ │ Repository  │           │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘           │ │
│  └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                Infrastructure Layer                         │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │ │
│  │  │ Error       │ │ Config      │ │ Validation  │           │ │
│  │  │ Handler     │ │ Service     │ │ Service     │           │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Service Interaction Flow

```
User Interaction
       │
       ▼
┌─────────────┐
│ Component   │
└─────────────┘
       │
       ▼
┌─────────────┐    ┌─────────────┐
│ Service     │───▶│ Repository  │
│ (Business   │    │ (Data       │
│  Logic)     │    │  Access)    │
└─────────────┘    └─────────────┘
       │                   │
       └───────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ Unified API Client              │
│ ┌─────────────┐ ┌─────────────┐ │
│ │ HTTP Client │ │ WS Client   │ │
│ └─────────────┘ └─────────────┘ │
└─────────────────────────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐    ┌─────────────┐
│ REST API    │    │ WebSocket   │
│ Endpoints   │    │ Server      │
└─────────────┘    └─────────────┘
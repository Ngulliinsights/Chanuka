# Infrastructure Integration - Design

**Spec ID:** infrastructure-integration  
**Created:** February 27, 2026  
**Status:** Planning  
**Version:** 1.0

---

## 1. Architecture Overview

### 1.1 System Context

The infrastructure integration follows a layered approach where features consume standardized infrastructure services. This creates a solid foundation before strategic feature integrations.

```
┌─────────────────────────────────────────────────────────────┐
│                    Feature Layer                             │
│  (Bills, Users, Community, Pretext Detection, etc.)         │
│                                                              │
│  • Business logic                                           │
│  • Feature-specific operations                              │
│  • Domain models                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Infrastructure Services Layer                   │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Security Services (CRITICAL)                  │        │
│  │  • secureQueryBuilderService                   │        │
│  │  • inputSanitizationService                    │        │
│  │  • queryValidationService                      │        │
│  │  • encryptionService                           │        │
│  │  • securityAuditService                        │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Performance Services                           │        │
│  │  • cacheService                                 │        │
│  │  • cacheKeys                                    │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Reliability Services                           │        │
│  │  • Result<T, E> types                          │        │
│  │  • Error factory                                │        │
│  │  • Transaction helpers                          │        │
│  └────────────────────────────────────────────────┘        │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Validation Services                            │        │
│  │  • inputValidationService                       │        │
│  │  • schemaValidationService                      │        │
│  │  • Validation middleware                        │        │
│  └────────────────────────────────────────────────┘        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Layer                                  │
│  • PostgreSQL  • Redis  • Monitoring                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Phase 0: Foundation Design

### 2.1 Security Service Enhancement

**Current State:**
```typescript
// server/features/security/application/services/secure-query-builder.service.ts
export class SecureQueryBuilderService {
  buildParameterizedQuery(template: string, params: Record<string, any>) {
    // Basic implementation
  }
}
```

**Enhanced Design:**
```typescript
export class SecureQueryBuilderService {
  /**
   * Build parameterized query with validation
   */
  buildParameterizedQuery(
    template: string,
    params: Record<string, any>,
    options?: {
      validateParams?: boolean;
      sanitizeOutput?: boolean;
      auditLog?: boolean;
      performanceMonitoring?: boolean;
    }
  ): SecureQuery {
    // 1. Validate parameters
    if (options?.validateParams !== false) {
      const validation = queryValidationService.validateInputs(
        Object.values(params)
      );
      if (validation.hasErrors()) {
        throw new ValidationError(validation.getErrorMessage());
      }
    }
    
    // 2. Build query
    const sql = this.buildSQL(template, params);
    const queryId = this.generateQueryId();
    
    // 3. Audit log
    if (options?.auditLog) {
      securityAuditService.logSecurityEvent({
        type: 'query_executed',
        query_id: queryId,
        template,
        params_count: Object.keys(params).length
      });
    }
    
    // 4. Performance monitoring
    if (options?.performanceMonitoring) {
      this.monitorQueryPerformance(queryId, template);
    }
    
    return SecureQuery.create(sql, params, queryId);
  }
  
  /**
   * Build bulk operation query
   */
  buildBulkQuery(
    template: string,
    items: any[],
    options?: BulkQueryOptions
  ): SecureQuery {
    // Validate bulk size
    if (items.length > (options?.maxBulkSize || 1000)) {
      throw new ValidationError('Bulk operation too large');
    }
    
    // Build bulk query
    const sql = this.buildBulkSQL(template, items);
    const queryId = this.generateQueryId();
    
    return SecureQuery.create(sql, { items }, queryId);
  }
  
  /**
   * Validate query for common patterns
   */
  validateQuery(query: string): QueryValidationResult {
    const issues: string[] = [];
    
    // Check for SQL injection patterns
    if (this.hasSQLInjectionPattern(query)) {
      issues.push('Potential SQL injection detected');
    }
    
    // Check for performance issues
    if (this.hasPerformanceIssues(query)) {
      issues.push('Query may have performance issues');
    }
    
    return issues.length === 0
      ? QueryValidationResult.valid()
      : QueryValidationResult.invalid(issues);
  }
}
```

**Security Middleware:**
```typescript
// server/infrastructure/security/middleware/security.middleware.ts
export function securityMiddleware(options?: SecurityMiddlewareOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 1. Rate limiting
      await rateLimiter.checkLimit(req);
      
      // 2. Input validation
      if (req.body) {
        const validation = inputValidationService.validate(req.body);
        if (validation.hasErrors()) {
          return res.status(400).json({ 
            error: 'Validation failed',
            details: validation.errors 
          });
        }
      }
      
      // 3. Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // 4. Audit log
      await securityAuditService.logSecurityEvent({
        type: 'api_request',
        method: req.method,
        path: req.path,
        user_id: req.user?.id,
        ip: req.ip
      });
      
      next();
    } catch (error) {
      next(error);
    }
  };
}
```

---

### 2.2 Caching Service Standardization

**Cache Key Generation:**
```typescript
// server/infrastructure/cache/key-generator.ts
export class CacheKeyGenerator {
  /**
   * Generate cache key for entity
   */
  entity(type: string, id: string): string {
    return `entity:${type}:${id}`;
  }
  
  /**
   * Generate cache key for list
   */
  list(type: string, filters?: Record<string, any>): string {
    const filterKey = filters 
      ? `:${this.hashFilters(filters)}`
      : '';
    return `list:${type}${filterKey}`;
  }
  
  /**
   * Generate cache key for query result
   */
  query(queryId: string, params?: Record<string, any>): string {
    const paramKey = params
      ? `:${this.hashParams(params)}`
      : '';
    return `query:${queryId}${paramKey}`;
  }
  
  /**
   * Generate cache key for user-specific data
   */
  user(userId: string, dataType: string): string {
    return `user:${userId}:${dataType}`;
  }
  
  private hashFilters(filters: Record<string, any>): string {
    return crypto
      .createHash('md5')
      .update(JSON.stringify(filters))
      .digest('hex')
      .substring(0, 8);
  }
}

export const cacheKeys = new CacheKeyGenerator();
```

**Cache Invalidation Patterns:**
```typescript
// server/infrastructure/cache/invalidation.ts
export class CacheInvalidationService {
  /**
   * Invalidate entity cache
   */
  async invalidateEntity(type: string, id: string): Promise<void> {
    const key = cacheKeys.entity(type, id);
    await cacheService.delete(key);
    
    // Also invalidate related lists
    await this.invalidateRelatedLists(type);
  }
  
  /**
   * Invalidate list cache
   */
  async invalidateList(type: string): Promise<void> {
    const pattern = `list:${type}:*`;
    await cacheService.deletePattern(pattern);
  }
  
  /**
   * Invalidate user cache
   */
  async invalidateUser(userId: string): Promise<void> {
    const pattern = `user:${userId}:*`;
    await cacheService.deletePattern(pattern);
  }
  
  /**
   * Invalidate on entity update
   */
  async onEntityUpdate(type: string, id: string): Promise<void> {
    await Promise.all([
      this.invalidateEntity(type, id),
      this.invalidateList(type),
      this.invalidateRelatedEntities(type, id)
    ]);
  }
}

export const cacheInvalidation = new CacheInvalidationService();
```

**Caching Decorators:**
```typescript
// server/infrastructure/cache/decorators.ts
export function Cacheable(options: CacheOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      // Generate cache key
      const key = options.keyGenerator(...args);
      
      // Check cache
      const cached = await cacheService.get(key);
      if (cached) {
        return cached;
      }
      
      // Execute method
      const result = await originalMethod.apply(this, args);
      
      // Cache result
      await cacheService.set(key, result, options.ttl);
      
      return result;
    };
    
    return descriptor;
  };
}

// Usage
class BillService {
  @Cacheable({
    keyGenerator: (billId: string) => cacheKeys.entity('bill', billId),
    ttl: 300 // 5 minutes
  })
  async getBillById(billId: string): Promise<Bill> {
    return await db.query.bills.findFirst({
      where: eq(bills.id, billId)
    });
  }
}
```

---

### 2.3 Error Handling Standardization

**Result Type Enhancement:**
```typescript
// server/infrastructure/error-handling/result-types.ts
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E; context?: ErrorContext };

export interface ErrorContext {
  operation: string;
  timestamp: Date;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export class ResultFactory {
  /**
   * Create success result
   */
  static success<T>(data: T): Result<T, never> {
    return { success: true, data };
  }
  
  /**
   * Create error result with context
   */
  static error<E extends Error>(
    error: E,
    context?: Partial<ErrorContext>
  ): Result<never, E> {
    return {
      success: false,
      error,
      context: {
        operation: context?.operation || 'unknown',
        timestamp: new Date(),
        ...context
      }
    };
  }
  
  /**
   * Create not found error
   */
  static notFound(
    message: string,
    context?: Partial<ErrorContext>
  ): Result<never, NotFoundError> {
    return this.error(new NotFoundError(message), context);
  }
  
  /**
   * Create validation error
   */
  static validationError(
    message: string,
    details?: any,
    context?: Partial<ErrorContext>
  ): Result<never, ValidationError> {
    return this.error(
      new ValidationError(message, details),
      context
    );
  }
}
```

**Error Handling Middleware:**
```typescript
// server/infrastructure/error-handling/middleware.ts
export function errorHandlingMiddleware() {
  return (
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // 1. Log error
    logger.error('Request error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.id
    });
    
    // 2. Determine status code
    const statusCode = getStatusCode(error);
    
    // 3. Create error response
    const response = {
      error: error.message,
      code: getErrorCode(error),
      timestamp: new Date().toISOString(),
      path: req.path
    };
    
    // 4. Add details in development
    if (process.env.NODE_ENV === 'development') {
      response['stack'] = error.stack;
    }
    
    // 5. Send response
    res.status(statusCode).json(response);
  };
}
```

---

### 2.4 Validation Service Enhancement

**Input Validation Service:**
```typescript
// server/infrastructure/validation/input-validation-service.ts
export class InputValidationService {
  /**
   * Validate request body against schema
   */
  async validateBody<T>(
    body: unknown,
    schema: z.ZodSchema<T>
  ): Promise<ValidationResult<T>> {
    try {
      const validated = await schema.parseAsync(body);
      return ValidationResult.success(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ValidationResult.error(
          'Validation failed',
          error.errors
        );
      }
      throw error;
    }
  }
  
  /**
   * Validate query parameters
   */
  async validateQuery<T>(
    query: unknown,
    schema: z.ZodSchema<T>
  ): Promise<ValidationResult<T>> {
    return this.validateBody(query, schema);
  }
  
  /**
   * Validate pagination parameters
   */
  validatePagination(
    page?: string,
    limit?: string
  ): ValidationResult<PaginationParams> {
    try {
      const pagination = PaginationParams.create(page, limit);
      return ValidationResult.success(pagination);
    } catch (error) {
      return ValidationResult.error(
        'Invalid pagination parameters',
        { page, limit }
      );
    }
  }
}

export const inputValidationService = new InputValidationService();
```

**Validation Middleware:**
```typescript
// server/infrastructure/validation/middleware.ts
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = await inputValidationService.validateBody(
      req.body,
      schema
    );
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.errors
      });
    }
    
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const result = await inputValidationService.validateQuery(
      req.query,
      schema
    );
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.errors
      });
    }
    
    req.query = result.data as any;
    next();
  };
}

// Usage
router.post(
  '/bills',
  validateBody(CreateBillSchema),
  async (req, res) => {
    // req.body is now typed and validated
    const bill = await billService.createBill(req.body);
    res.json(bill);
  }
);
```

---

## 3. Phase 1: Critical Security Design

### 3.1 Feature Security Integration Pattern

**Standard Pattern for All Features:**

```typescript
// Example: Bills Feature Security Integration
// server/features/bills/application/services/bill.service.ts

import {
  secureQueryBuilderService,
  PaginationParams,
  inputSanitizationService,
  queryValidationService,
  securityAuditService
} from '@server/features/security';

export class BillService {
  /**
   * Get bill by ID (secured)
   */
  async getBillById(billId: string): Promise<Result<Bill, Error>> {
    try {
      // 1. Validate input
      const validation = queryValidationService.validateInputs([billId]);
      if (validation.hasErrors()) {
        return ResultFactory.validationError(
          validation.getErrorMessage()
        );
      }
      
      // 2. Build secure query
      const query = secureQueryBuilderService.buildParameterizedQuery(
        'SELECT * FROM bills WHERE id = ${billId}',
        { billId }
      );
      
      // 3. Execute query
      const bill = await db.execute(query.sql, query.params);
      
      // 4. Sanitize output
      const sanitized = queryValidationService.sanitizeOutput(bill);
      
      // 5. Audit log
      await securityAuditService.logSecurityEvent({
        type: 'bill_accessed',
        bill_id: billId,
        user_id: getCurrentUserId()
      });
      
      return ResultFactory.success(sanitized);
    } catch (error) {
      logger.error('Failed to get bill', { error, billId });
      return ResultFactory.error(error);
    }
  }
  
  /**
   * Search bills (secured)
   */
  async searchBills(
    searchTerm: string,
    page: string,
    limit: string
  ): Promise<Result<{ bills: Bill[]; pagination: any }, Error>> {
    try {
      // 1. Validate pagination
      const pagination = PaginationParams.create(page, limit);
      
      // 2. Sanitize search term
      const sanitizedTerm = inputSanitizationService.sanitizeString(
        searchTerm
      );
      
      // 3. Create safe LIKE pattern
      const pattern = inputSanitizationService.createSafeLikePattern(
        sanitizedTerm
      );
      
      // 4. Build secure query
      const query = secureQueryBuilderService.buildParameterizedQuery(
        `SELECT * FROM bills 
         WHERE title ILIKE \${pattern} 
         LIMIT \${limit} OFFSET \${offset}`,
        {
          pattern,
          limit: pagination.limit,
          offset: pagination.offset
        }
      );
      
      // 5. Execute query
      const bills = await db.execute(query.sql, query.params);
      
      // 6. Sanitize output
      const sanitized = queryValidationService.sanitizeOutput(bills);
      
      return ResultFactory.success({
        bills: sanitized,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: bills.length
        }
      });
    } catch (error) {
      logger.error('Failed to search bills', { error, searchTerm });
      return ResultFactory.error(error);
    }
  }
  
  /**
   * Create bill (secured)
   */
  async createBill(
    billData: CreateBillDTO,
    userId: string
  ): Promise<Result<Bill, Error>> {
    try {
      // 1. Sanitize inputs
      const sanitizedTitle = inputSanitizationService.sanitizeString(
        billData.title
      );
      const sanitizedText = inputSanitizationService.sanitizeHtml(
        billData.text
      );
      
      // 2. Validate inputs
      const validation = queryValidationService.validateInputs([
        sanitizedTitle,
        sanitizedText,
        userId
      ]);
      
      if (validation.hasErrors()) {
        return ResultFactory.validationError(
          validation.getErrorMessage()
        );
      }
      
      // 3. Create bill
      const bill = await db.insert(bills).values({
        title: sanitizedTitle,
        text: sanitizedText,
        created_by: userId
      });
      
      // 4. Audit log
      await securityAuditService.logSecurityEvent({
        type: 'bill_created',
        bill_id: bill.id,
        user_id: userId,
        description: `User created bill: ${sanitizedTitle}`
      });
      
      return ResultFactory.success(bill);
    } catch (error) {
      logger.error('Failed to create bill', { error, billData });
      return ResultFactory.error(error);
    }
  }
}
```

---

### 3.2 Security Middleware Deployment

**Route Protection:**
```typescript
// server/app.ts or server/routes/index.ts
import { securityMiddleware } from '@server/infrastructure/security/middleware';

// Apply security middleware to all routes
app.use(securityMiddleware({
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  validateInput: true,
  sanitizeOutput: true,
  auditLog: true
}));

// Apply stricter limits to sensitive routes
app.use('/api/admin', securityMiddleware({
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 20 // stricter limit for admin routes
  },
  requireAuth: true,
  requireRole: ['admin'],
  auditLog: true
}));
```

---

## 4. Phase 2: Performance & Reliability Design

### 4.1 Caching Integration Pattern

**Standard Caching Pattern:**
```typescript
export class BillService {
  /**
   * Get bill with caching
   */
  @Cacheable({
    keyGenerator: (billId: string) => cacheKeys.entity('bill', billId),
    ttl: 300 // 5 minutes
  })
  async getBillById(billId: string): Promise<Result<Bill, Error>> {
    // Implementation (caching handled by decorator)
  }
  
  /**
   * Update bill with cache invalidation
   */
  async updateBill(
    billId: string,
    updates: Partial<Bill>
  ): Promise<Result<Bill, Error>> {
    try {
      // 1. Update bill
      const bill = await db.update(bills)
        .set(updates)
        .where(eq(bills.id, billId));
      
      // 2. Invalidate cache
      await cacheInvalidation.onEntityUpdate('bill', billId);
      
      return ResultFactory.success(bill);
    } catch (error) {
      return ResultFactory.error(error);
    }
  }
}
```

---

### 4.2 Transaction Pattern

**Standard Transaction Pattern:**
```typescript
export class UserService {
  /**
   * Create user with profile (transactional)
   */
  async createUserWithProfile(
    userData: CreateUserDTO,
    profileData: CreateProfileDTO
  ): Promise<Result<User, Error>> {
    try {
      const result = await withTransaction(async (tx) => {
        // 1. Create user
        const user = await tx.insert(users).values(userData);
        
        // 2. Create profile
        await tx.insert(user_profiles).values({
          ...profileData,
          user_id: user.id
        });
        
        // 3. Audit log
        await securityAuditService.logSecurityEvent({
          type: 'user_created',
          user_id: user.id
        });
        
        return user;
      });
      
      return ResultFactory.success(result);
    } catch (error) {
      logger.error('Failed to create user', { error });
      return ResultFactory.error(error);
    }
  }
}
```

---

## 5. Testing Strategy

### 5.1 Security Testing

**SQL Injection Testing:**
```typescript
describe('BillService Security', () => {
  it('should prevent SQL injection in search', async () => {
    const maliciousInput = "test'; DROP TABLE bills; --";
    
    const result = await billService.searchBills(
      maliciousInput,
      '1',
      '20'
    );
    
    // Should not throw error
    expect(result.success).toBe(true);
    
    // Database should still exist
    const bills = await db.query.bills.findMany();
    expect(bills).toBeDefined();
  });
});
```

**XSS Testing:**
```typescript
describe('Community Security', () => {
  it('should prevent XSS in comments', async () => {
    const xssInput = '<script>alert("XSS")</script>';
    
    const result = await commentService.createComment({
      text: xssInput,
      billId: 'test-bill-id'
    });
    
    expect(result.success).toBe(true);
    expect(result.data.text).not.toContain('<script>');
  });
});
```

---

### 5.2 Caching Testing

```typescript
describe('BillService Caching', () => {
  it('should cache bill data', async () => {
    const billId = 'test-bill-id';
    
    // First call - cache miss
    const result1 = await billService.getBillById(billId);
    
    // Second call - cache hit
    const result2 = await billService.getBillById(billId);
    
    // Verify cache was used
    const cacheStats = await cacheService.getStats();
    expect(cacheStats.hits).toBeGreaterThan(0);
  });
  
  it('should invalidate cache on update', async () => {
    const billId = 'test-bill-id';
    
    // Cache the bill
    await billService.getBillById(billId);
    
    // Update the bill
    await billService.updateBill(billId, { title: 'New Title' });
    
    // Verify cache was invalidated
    const cached = await cacheService.get(
      cacheKeys.entity('bill', billId)
    );
    expect(cached).toBeNull();
  });
});
```

---

## 6. Monitoring & Observability

### 6.1 Security Monitoring

**Security Dashboard Metrics:**
- SQL injection attempts blocked
- XSS attempts blocked
- Rate limit violations
- Authentication failures
- Authorization failures
- Security audit log volume

**Alerts:**
- High rate of security violations
- Unusual access patterns
- Failed authentication spikes
- Unauthorized access attempts

---

### 6.2 Performance Monitoring

**Performance Dashboard Metrics:**
- Cache hit rate
- Cache miss rate
- Average response time
- P95 response time
- P99 response time
- Database query time

**Alerts:**
- Cache hit rate < 60%
- Response time > 1s
- Database query time > 500ms
- High error rate

---

## 7. Rollout Strategy

### 7.1 Gradual Rollout

**Week 1: Foundation**
- Deploy enhanced services to staging
- Test thoroughly
- Deploy to production (no feature changes yet)

**Week 2: Core Features**
- Enable security for Bills (10% of traffic)
- Monitor for 24 hours
- Increase to 50% of traffic
- Monitor for 24 hours
- Full rollout (100%)
- Repeat for Users and Community

**Week 3: Performance Features**
- Enable caching for high-traffic endpoints
- Monitor cache hit rates
- Adjust TTLs as needed
- Full rollout

**Week 4: Remaining Features**
- Enable security for remaining features
- Enable caching for remaining features
- Full rollout

---

## 8. Success Metrics

### 8.1 Security Metrics

- Zero SQL injection vulnerabilities
- Zero XSS vulnerabilities
- 100% of features using security services
- Security audit passed
- Penetration testing passed

### 8.2 Performance Metrics

- Cache hit rate > 70%
- Response time improved by 30%+
- Database load reduced by 40%+
- Error rate < 0.1%

### 8.3 Reliability Metrics

- Transaction success rate > 99.9%
- Error handling consistent across features
- Validation coverage > 90%
- System uptime > 99.9%

---

**Design Status:** ✅ Complete  
**Next Step:** Create tasks document  
**Review Required:** Engineering Lead, Security Engineer

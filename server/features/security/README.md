# Security Feature Documentation

## Overview

The Security feature provides comprehensive protection against common web vulnerabilities including SQL injection, XSS attacks, and other security threats. It implements a defense-in-depth strategy using multiple layers of protection.

## Architecture

### Core Components

1. **Secure Query Builder Service** - Parameterized query construction with validation
2. **Input Sanitization Service** - Input cleaning and validation
3. **Query Validation Service** - SQL injection pattern detection
4. **Security Middleware** - Request/response security layer
5. **Security Audit Service** - Security event logging

## Usage Guide

### 1. Secure Query Builder

The `SecureQueryBuilderService` provides safe database query construction using parameterized queries.

#### Basic Parameterized Query

```typescript
import { secureQueryBuilderService } from '@server/features/security';

// Build a simple parameterized query
const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM users WHERE id = ${id}',
  { id: userId }
);

// Execute with Drizzle
const result = await db.execute(query.sql);
```

#### Complex Queries with JOINs

```typescript
const query = secureQueryBuilderService.buildJoinQuery(
  'users',
  [
    { table: 'profiles', on: 'users.id = profiles.user_id', type: 'INNER' },
    { table: 'settings', on: 'users.id = settings.user_id', type: 'LEFT' }
  ],
  { 'users.active': true },
  ['users.name', 'profiles.bio', 'settings.theme']
);
```

#### Subqueries

```typescript
const query = secureQueryBuilderService.buildSubquery(
  'SELECT * FROM users WHERE id IN {{SUBQUERY}}',
  'SELECT user_id FROM orders WHERE total > 100',
  {}
);
```

#### Common Table Expressions (CTEs)

```typescript
const query = secureQueryBuilderService.buildCTEQuery(
  [
    { name: 'active_users', query: 'SELECT * FROM users WHERE active = true' },
    { name: 'recent_orders', query: 'SELECT * FROM orders WHERE created_at > NOW() - INTERVAL \'30 days\'' }
  ],
  'SELECT * FROM active_users JOIN recent_orders ON active_users.id = recent_orders.user_id',
  {}
);
```

#### Bulk Operations

```typescript
const items = [
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' }
];

const result = await secureQueryBuilderService.executeBulkOperation(
  items,
  async (item) => {
    return await db.insert(users).values(item);
  },
  {
    batchSize: 100,
    validateEach: true,
    continueOnError: false
  }
);

console.log(`Processed: ${result.totalProcessed}`);
console.log(`Successful: ${result.successful.length}`);
console.log(`Failed: ${result.failed.length}`);
```

### 2. Input Sanitization

```typescript
import { inputSanitizationService } from '@server/features/security';

// Sanitize string input
const sanitized = inputSanitizationService.sanitizeString(userInput);

// Sanitize HTML content
const safeHtml = inputSanitizationService.sanitizeHtml(htmlContent);

// Create safe LIKE pattern for search
const pattern = inputSanitizationService.createSafeLikePattern(searchTerm);
const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM bills WHERE title ILIKE ${pattern}',
  { pattern }
);
```

### 3. Security Middleware

Apply security middleware to protect routes:

```typescript
import { securityMiddleware } from '@server/middleware/security.middleware';

// Apply to all routes
app.use(securityMiddleware.create({
  validateInput: true,
  sanitizeOutput: true,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100
  },
  auditLog: true
}));

// Apply stricter limits to sensitive routes
app.use('/api/admin', securityMiddleware.create({
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 20
  },
  auditLog: true
}));
```

### 4. Pagination

```typescript
// Validate and sanitize pagination parameters
const pagination = secureQueryBuilderService.validatePaginationParams(
  req.query.page,
  req.query.limit
);

const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM bills LIMIT ${limit} OFFSET ${offset}',
  {
    limit: pagination.limit,
    offset: pagination.offset
  }
);
```

### 5. Output Sanitization

```typescript
// Sanitize output data to prevent data leakage
const sanitized = secureQueryBuilderService.sanitizeOutput(userData);

// This removes sensitive fields like passwords, tokens, etc.
res.json(sanitized);
```

## Security Best Practices

### 1. Always Use Parameterized Queries

❌ **NEVER do this:**
```typescript
const query = `SELECT * FROM users WHERE id = ${userId}`;
```

✅ **ALWAYS do this:**
```typescript
const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM users WHERE id = ${id}',
  { id: userId }
);
```

### 2. Sanitize User Inputs

```typescript
// Sanitize before using in queries
const sanitizedName = inputSanitizationService.sanitizeString(req.body.name);

const query = secureQueryBuilderService.buildParameterizedQuery(
  'SELECT * FROM users WHERE name = ${name}',
  { name: sanitizedName }
);
```

### 3. Validate Inputs

```typescript
// Validate inputs before processing
const validation = secureQueryBuilderService.validateInputs([
  userId,
  userName,
  userEmail
]);

if (validation.hasErrors()) {
  return res.status(400).json({
    error: validation.getErrorMessage()
  });
}
```

### 4. Sanitize Outputs

```typescript
// Remove sensitive data before sending to client
const sanitized = secureQueryBuilderService.sanitizeOutput(user);
res.json(sanitized);
```

### 5. Use Security Middleware

```typescript
// Protect all routes with security middleware
app.use(securityMiddleware.create({
  validateInput: true,
  sanitizeOutput: true,
  rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  auditLog: true
}));
```

## Performance Monitoring

The Secure Query Builder includes built-in performance monitoring:

```typescript
// Get performance metrics
const metrics = secureQueryBuilderService.getPerformanceMetrics();

console.log(`Average query build time: ${metrics.averageDuration}ms`);
console.log(`Max query build time: ${metrics.maxDuration}ms`);
console.log(`Total queries built: ${metrics.totalQueries}`);
console.log(`Recent queries:`, metrics.recentMetrics);

// Clear metrics
secureQueryBuilderService.clearPerformanceMetrics();
```

## Testing

### Unit Tests

```typescript
import { secureQueryBuilderService } from '@server/features/security';

describe('Security Tests', () => {
  it('should prevent SQL injection', () => {
    const maliciousInput = "'; DROP TABLE users;--";
    
    const query = secureQueryBuilderService.buildParameterizedQuery(
      'SELECT * FROM users WHERE name = ${name}',
      { name: maliciousInput }
    );
    
    // Query should be built safely
    expect(query).toBeDefined();
  });
});
```

### Integration Tests

```typescript
import {
  testSQLInjection,
  testXSSProtection,
  SQL_INJECTION_PATTERNS,
  XSS_PATTERNS
} from '@server/features/security/__tests__/test-utilities';

describe('Security Integration Tests', () => {
  it('should protect against SQL injection patterns', () => {
    for (const pattern of SQL_INJECTION_PATTERNS) {
      const result = testSQLInjection(pattern.input);
      expect(result.passed).toBe(true);
    }
  });
  
  it('should protect against XSS patterns', () => {
    for (const pattern of XSS_PATTERNS) {
      const result = testXSSProtection(pattern.input);
      expect(result.passed).toBe(true);
    }
  });
});
```

## Security Headers

The security middleware automatically sets the following headers:

- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-XSS-Protection: 1; mode=block` - Enables XSS protection
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` - Enforces HTTPS
- `Content-Security-Policy: default-src 'self'` - Restricts resource loading
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Permissions-Policy: geolocation=(), microphone=(), camera=()` - Restricts browser features

## Rate Limiting

The security middleware includes built-in rate limiting:

```typescript
app.use(securityMiddleware.create({
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100 // Max 100 requests per window
  }
}));
```

When rate limit is exceeded, the middleware returns:
- Status: `429 Too Many Requests`
- Response: `{ error: 'Too many requests', retryAfter: <seconds> }`

## Security Audit Logging

All security events are logged for audit purposes:

```typescript
import { securityAuditService } from '@server/features/security';

// Log security event
await securityAuditService.logSecurityEvent({
  eventType: 'user_login',
  userId: user.id,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  resource: '/api/auth/login',
  action: 'POST',
  timestamp: new Date(),
  metadata: {
    success: true
  }
});
```

## Common Patterns

### Pattern 1: Secure Search

```typescript
async function searchBills(searchTerm: string, page: string, limit: string) {
  // 1. Validate pagination
  const pagination = secureQueryBuilderService.validatePaginationParams(page, limit);
  
  // 2. Sanitize search term
  const sanitized = inputSanitizationService.sanitizeString(searchTerm);
  
  // 3. Create safe LIKE pattern
  const pattern = inputSanitizationService.createSafeLikePattern(sanitized);
  
  // 4. Build secure query
  const query = secureQueryBuilderService.buildParameterizedQuery(
    'SELECT * FROM bills WHERE title ILIKE ${pattern} LIMIT ${limit} OFFSET ${offset}',
    {
      pattern,
      limit: pagination.limit,
      offset: pagination.offset
    }
  );
  
  // 5. Execute and sanitize output
  const bills = await db.execute(query.sql);
  return secureQueryBuilderService.sanitizeOutput(bills);
}
```

### Pattern 2: Secure Create

```typescript
async function createBill(billData: CreateBillDTO, userId: string) {
  // 1. Sanitize inputs
  const sanitizedTitle = inputSanitizationService.sanitizeString(billData.title);
  const sanitizedText = inputSanitizationService.sanitizeHtml(billData.text);
  
  // 2. Validate inputs
  const validation = secureQueryBuilderService.validateInputs([
    sanitizedTitle,
    sanitizedText,
    userId
  ]);
  
  if (validation.hasErrors()) {
    throw new Error(validation.getErrorMessage());
  }
  
  // 3. Create with sanitized data
  const bill = await db.insert(bills).values({
    title: sanitizedTitle,
    text: sanitizedText,
    created_by: userId
  });
  
  // 4. Audit log
  await securityAuditService.logSecurityEvent({
    eventType: 'bill_created',
    userId,
    resource: '/api/bills',
    action: 'POST',
    metadata: { billId: bill.id }
  });
  
  return bill;
}
```

### Pattern 3: Secure Update with Cache Invalidation

```typescript
async function updateBill(billId: string, updates: Partial<Bill>) {
  // 1. Sanitize inputs
  const sanitized = {
    title: updates.title ? inputSanitizationService.sanitizeString(updates.title) : undefined,
    text: updates.text ? inputSanitizationService.sanitizeHtml(updates.text) : undefined
  };
  
  // 2. Update
  const bill = await db.update(bills)
    .set(sanitized)
    .where(eq(bills.id, billId));
  
  // 3. Invalidate cache
  await cacheInvalidation.onEntityUpdate('bill', billId);
  
  // 4. Audit log
  await securityAuditService.logSecurityEvent({
    eventType: 'bill_updated',
    resource: `/api/bills/${billId}`,
    action: 'PUT',
    metadata: { updates: Object.keys(sanitized) }
  });
  
  return bill;
}
```

## Troubleshooting

### Issue: Query validation fails

**Problem:** `Query validation failed: Invalid input detected`

**Solution:** Check that all inputs are properly sanitized before passing to the query builder.

```typescript
// Sanitize first
const sanitized = inputSanitizationService.sanitizeString(input);

// Then build query
const query = secureQueryBuilderService.buildParameterizedQuery(template, { input: sanitized });
```

### Issue: Rate limit exceeded

**Problem:** `429 Too Many Requests`

**Solution:** Adjust rate limit settings or implement user-specific rate limiting.

```typescript
app.use(securityMiddleware.create({
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 200 // Increase limit
  }
}));
```

### Issue: Performance overhead

**Problem:** Security checks adding latency

**Solution:** Monitor performance metrics and optimize as needed.

```typescript
const metrics = secureQueryBuilderService.getPerformanceMetrics();
if (metrics.averageDuration > 50) {
  // Investigate slow queries
  console.log('Slow queries:', metrics.recentMetrics.filter(m => m.duration > 50));
}
```

## API Reference

### SecureQueryBuilderService

- `buildParameterizedQuery(template, params)` - Build parameterized query
- `buildJoinQuery(baseTable, joins, where, select?)` - Build JOIN query
- `buildSubquery(outerQuery, subquery, params)` - Build subquery
- `buildCTEQuery(ctes, mainQuery, params)` - Build CTE query
- `executeBulkOperation(items, operation, options?)` - Execute bulk operations
- `validateInputs(inputs)` - Validate inputs
- `sanitizeOutput(data)` - Sanitize output
- `createSafeLikePattern(searchTerm)` - Create safe LIKE pattern
- `validatePaginationParams(page?, limit?)` - Validate pagination
- `getPerformanceMetrics()` - Get performance metrics
- `clearPerformanceMetrics()` - Clear metrics

### SecurityMiddleware

- `create(options?)` - Create security middleware
- `cleanupRateLimits()` - Clean up old rate limit records

## Support

For security issues or questions:
- Review this documentation
- Check the test files for examples
- Consult the security team

## Version History

- **v1.0.0** - Initial release with core security features
  - Parameterized query builder
  - Input sanitization
  - Security middleware
  - Rate limiting
  - Audit logging

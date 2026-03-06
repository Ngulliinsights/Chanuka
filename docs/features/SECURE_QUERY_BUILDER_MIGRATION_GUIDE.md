# Secure Query Builder Migration Guide: V1 → V2

## Executive Summary

This guide documents the migration from SecureQueryBuilderService V1 to V2, addressing critical security and architectural issues identified in the code quality deep dive.

## Critical Issues Fixed

### 1. SQL Injection Vulnerability (CRITICAL)
**Issue**: V1 used `sql.raw()` which bypasses Drizzle's parameterization
```typescript
// V1 - DANGEROUS
return sql.raw(template);
```

**Fix**: V2 uses proper SQL template tags
```typescript
// V2 - SAFE
const queryBuilder = (params) => sql`SELECT * FROM users WHERE id = ${params.id}`;
```

### 2. Singleton Pattern Limitations
**Issue**: V1 used singleton, making testing and configuration difficult

**Fix**: V2 uses dependency injection
```typescript
// V1 - Singleton
const service = SecureQueryBuilderService.getInstance();

// V2 - Dependency Injection
const service = createSecureQueryBuilderService(config, metricsService);
```

### 3. In-Memory Metrics
**Issue**: V1 stored metrics in service, lost on restart

**Fix**: V2 externalizes metrics to dedicated service
```typescript
// V2 - Externalized
const metricsService = new QueryMetricsService(1000);
const service = createSecureQueryBuilderService({}, metricsService);
```

### 4. Missing Query Timeout
**Issue**: V1 had no timeout protection against long-running queries

**Fix**: V2 adds configurable timeouts
```typescript
// V2 - With timeout
const query = service.buildParameterizedQuery(
  queryBuilder,
  params,
  { timeout: 30000 } // 30 seconds
);
```

### 5. Bulk Operation Error Handling
**Issue**: V1 had limited error recovery information

**Fix**: V2 adds retryable flag and checkpoint support
```typescript
// V2 - Enhanced error handling
const result = await service.executeBulkOperation(items, operation);
const retryableFailures = result.failed.filter(f => f.retryable);
// Retry only the retryable failures
```

## Migration Steps

### Step 1: Update Imports

```typescript
// Before
import { secureQueryBuilderService } from '@server/features/security/application/services/secure-query-builder.service';

// After
import { createSecureQueryBuilderService } from '@server/features/security/application/services/secure-query-builder.service.v2';
```

### Step 2: Change Query Building Pattern

The most significant change is how queries are built.

#### V1 Pattern (String Templates - UNSAFE)
```typescript
// V1 - DON'T USE THIS
const query = service.buildParameterizedQuery(
  'SELECT * FROM users WHERE email = ${email}',
  { email: userInput }
);
```

#### V2 Pattern (Query Builder Functions - SAFE)
```typescript
// V2 - USE THIS
const queryBuilder = (params: Record<string, unknown>) => 
  sql`SELECT * FROM users WHERE email = ${params.email}`;

const query = service.buildParameterizedQuery(
  queryBuilder,
  { email: userInput }
);
```

### Step 3: Initialize Service with Configuration

```typescript
// V2 - Configure the service
const service = createSecureQueryBuilderService({
  maxMetricsHistory: 1000,
  defaultBatchSize: 100,
  defaultQueryTimeout: 30000,
  enablePerformanceMonitoring: true,
  enableQueryLogging: true
});
```

### Step 4: Update Bulk Operations

```typescript
// V1
const result = await service.executeBulkOperation(items, operation, {
  continueOnError: true
});

// V2 - Same interface, but with enhanced results
const result = await service.executeBulkOperation(items, operation, {
  continueOnError: true,
  timeout: 60000 // NEW: per-operation timeout
});

// NEW: Handle retryable failures
const retryableFailures = result.failed.filter(f => f.retryable);
if (retryableFailures.length > 0) {
  await service.executeBulkOperation(
    retryableFailures.map(f => f.data),
    operation,
    { continueOnError: false }
  );
}
```

## Complete Migration Examples

### Example 1: Simple Query

```typescript
// V1 - BEFORE
const query = service.buildParameterizedQuery(
  'SELECT * FROM bills WHERE user_id = ${userId} AND status = ${status}',
  { userId: 123, status: 'pending' }
);

// V2 - AFTER
const queryBuilder = (params: Record<string, unknown>) => sql`
  SELECT * FROM bills 
  WHERE user_id = ${params.userId} 
  AND status = ${params.status}
`;

const query = service.buildParameterizedQuery(
  queryBuilder,
  { userId: 123, status: 'pending' },
  { timeout: 5000 }
);
```

### Example 2: JOIN Query

```typescript
// V1 - BEFORE
const query = service.buildJoinQuery(
  'bills',
  [{ table: 'users', on: 'bills.user_id = users.id' }],
  { 'bills.status': 'pending' },
  ['bills.*', 'users.email']
);

// V2 - AFTER (same interface, but safer implementation)
const query = service.buildJoinQuery(
  'bills',
  [{ table: 'users', on: 'bills.user_id = users.id' }],
  { 'bills.status': 'pending' },
  ['bills.*', 'users.email']
);
```

### Example 3: Complex Query with Dynamic Conditions

```typescript
// V2 - NEW PATTERN
const buildDynamicQuery = (filters: Record<string, unknown>) => {
  return (params: Record<string, unknown>) => {
    const conditions = Object.entries(params).map(([key, value]) => 
      sql`${sql.identifier(key)} = ${value}`
    );
    
    return sql`
      SELECT * FROM bills
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY created_at DESC
      LIMIT 100
    `;
  };
};

const query = service.buildParameterizedQuery(
  buildDynamicQuery(filters),
  { status: 'pending', user_id: 123 }
);
```

### Example 4: Bulk Import with Error Recovery

```typescript
// V2 - Enhanced bulk operations
const importRecords = async (records: any[]) => {
  const result = await service.executeBulkOperation(
    records,
    async (record) => {
      // Insert logic here
      return await db.insert(table).values(record);
    },
    {
      batchSize: 500,
      continueOnError: true,
      timeout: 60000
    }
  );

  // Log results
  console.log(`Processed: ${result.totalProcessed}`);
  console.log(`Successful: ${result.successful.length}`);
  console.log(`Failed: ${result.failed.length}`);
  console.log(`Checkpoint: ${result.checkpointId}`);

  // Retry retryable failures
  const retryable = result.failed.filter(f => f.retryable);
  if (retryable.length > 0) {
    console.log(`Retrying ${retryable.length} failed records...`);
    
    const retryResult = await service.executeBulkOperation(
      retryable.map(f => f.data),
      async (record) => await db.insert(table).values(record),
      { continueOnError: false }
    );
    
    console.log(`Retry successful: ${retryResult.successful.length}`);
  }

  // Export permanently failed records
  const permanentFailures = result.failed.filter(f => !f.retryable);
  if (permanentFailures.length > 0) {
    await fs.writeFile(
      'failed-records.json',
      JSON.stringify(permanentFailures, null, 2)
    );
  }

  return result;
};
```

## Testing Migration

### V1 Tests (Update These)
```typescript
// V1 - Old test pattern
describe('SecureQueryBuilderService', () => {
  const service = SecureQueryBuilderService.getInstance();
  
  it('should build query', () => {
    const query = service.buildParameterizedQuery(
      'SELECT * FROM users WHERE id = ${id}',
      { id: 1 }
    );
    expect(query).toBeDefined();
  });
});
```

### V2 Tests (New Pattern)
```typescript
// V2 - New test pattern
describe('SecureQueryBuilderService V2', () => {
  let service: SecureQueryBuilderService;
  
  beforeEach(() => {
    service = createSecureQueryBuilderService({
      enableQueryLogging: false // Disable logging in tests
    });
  });
  
  it('should build query', () => {
    const queryBuilder = (params: Record<string, unknown>) => 
      sql`SELECT * FROM users WHERE id = ${params.id}`;
    
    const query = service.buildParameterizedQuery(
      queryBuilder,
      { id: 1 }
    );
    
    expect(query).toBeDefined();
  });
});
```

## Configuration Options

```typescript
interface SecurityConfig {
  /** Maximum number of performance metrics to keep in memory */
  maxMetricsHistory: number;
  
  /** Default batch size for bulk operations */
  defaultBatchSize: number;
  
  /** Default query timeout in milliseconds */
  defaultQueryTimeout: number;
  
  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;
  
  /** Enable detailed query logging */
  enableQueryLogging: boolean;
}

// Defaults
const defaultConfig = {
  maxMetricsHistory: 1000,
  defaultBatchSize: 100,
  defaultQueryTimeout: 30000,
  enablePerformanceMonitoring: true,
  enableQueryLogging: true
};
```

## Performance Considerations

### V1 Performance Issues
- Singleton shared state across all requests
- In-memory metrics grow unbounded
- No query timeout protection

### V2 Performance Improvements
- Configurable metrics history limit
- Query timeout prevents runaway queries
- Externalized metrics can be persisted
- Multiple instances for different use cases

## Security Improvements

### V1 Security Issues
1. `sql.raw()` bypasses parameterization
2. Limited identifier validation
3. No timeout protection (DoS risk)
4. Error messages may leak information

### V2 Security Enhancements
1. Proper SQL template tag usage
2. Enhanced identifier validation (rejects SQL keywords)
3. Query timeout protection
4. Retryable error classification
5. Checkpoint support for audit trails

## Rollback Plan

If you need to rollback to V1:

1. Keep V1 file as `secure-query-builder.service.v1.ts`
2. Update imports back to V1
3. Revert query building patterns to string templates
4. Remove timeout configurations

However, we strongly recommend NOT rolling back due to the critical security fix in V2.

## Gradual Migration Strategy

You can run both versions side-by-side:

```typescript
// Use V2 for new code
import { createSecureQueryBuilderService as createV2Service } from './secure-query-builder.service.v2';

// Keep V1 for legacy code
import { secureQueryBuilderService as v1Service } from './secure-query-builder.service';

// Gradually migrate endpoints
if (useV2) {
  const service = createV2Service();
  // Use V2 pattern
} else {
  // Use V1 pattern (legacy)
}
```

## Checklist

- [ ] Update all imports to V2
- [ ] Convert string templates to query builder functions
- [ ] Add timeout configurations where needed
- [ ] Update bulk operation error handling
- [ ] Update tests to use new patterns
- [ ] Configure service instances appropriately
- [ ] Test in staging environment
- [ ] Monitor performance metrics
- [ ] Update documentation
- [ ] Train team on new patterns

## Support

For questions or issues during migration:
1. Review the code quality deep dive document
2. Check the test files for examples
3. Consult the security team for validation

## Conclusion

V2 addresses critical security vulnerabilities and architectural limitations in V1. The migration requires updating query building patterns but provides significant security and maintainability improvements.

The most important change: **Always use SQL template tags, never string concatenation or sql.raw()**.

# Task 1.1.4: Investigate retry-handler.ts (legacy) - Findings

## Investigation Date
2026-02-18

## Search Results

### Command Executed
```bash
grep -r "LegacyRetryHandler\|createRetryHandler\|retryHandlers" client/src/ --include='*.ts' --include='*.tsx' | grep -v "retry-handler.ts" | grep -v "index.ts"
```

### Usages Found
1. **client/src/infrastructure/api/circuit-breaker-client.ts**
   - Imports: `RetryHandler`, `createRetryHandler`, `RetryConfig`
   - Usage: `this.retryHandler = createRetryHandler(this.config.serviceName, this.config.retryConfig);`

2. **client/src/infrastructure/api/examples/circuit-breaker-usage.ts**
   - Imports: `retryOperation`, `createRetryHandler`
   - Usage: `const retryHandler = createRetryHandler('payment-service', {...});`

## Analysis

### Files Using retry-handler.ts
Both files that use `retry-handler.ts` are **scheduled for deletion** in Task 1.1.6:
- `circuit-breaker-client.ts` - Confirmed dead (0 usages)
- `examples/` directory - Example code only

### Export Alias in index.ts
The `index.ts` file exports retry-handler.ts with a "Legacy" alias:
```typescript
export {
  RetryHandler as LegacyRetryHandler,
  createRetryHandler,
  retryHandlers,
} from './retry-handler';
```

This confirms it's the **legacy implementation**.

### Canonical Implementation
The canonical retry implementation is in `client/src/infrastructure/api/retry.ts`:
- Exported as `RetryHandler` (without "Legacy" prefix)
- Has modern API with `retryOperation`, `safeRetryOperation`
- Has service-specific configurations
- Already exported from index.ts as the primary implementation

## Decision

**ADD retry-handler.ts to deletion list**

### Rationale
1. ✅ Only used by files scheduled for deletion (circuit-breaker-client.ts, examples/)
2. ✅ Explicitly marked as "Legacy" in exports
3. ✅ Canonical implementation exists in retry.ts
4. ✅ No production code depends on it
5. ✅ Removing it aligns with the goal of removing dead API clients

### Files to Delete (Updated List)
- `client/src/infrastructure/api/base-client.ts`
- `client/src/infrastructure/api/authenticated-client.ts`
- `client/src/infrastructure/api/safe-client.ts`
- `client/src/infrastructure/api/circuit-breaker-client.ts`
- `client/src/infrastructure/api/examples/` (entire directory)
- **`client/src/infrastructure/api/retry-handler.ts`** ← ADD THIS

### Index.ts Exports to Remove
When updating `client/src/infrastructure/api/index.ts`, also remove:
```typescript
export {
  RetryHandler as LegacyRetryHandler,
  createRetryHandler,
  retryHandlers,
} from './retry-handler';
```

The canonical retry exports should remain:
```typescript
export {
  RetryHandler,
  retryOperation,
  safeRetryOperation,
  createHttpRetryHandler,
  createServiceRetryHandler,
  DEFAULT_RETRY_CONFIG,
  SERVICE_RETRY_CONFIGS,
  type RetryConfig,
  type RetryContext,
  type RetryResult,
} from './retry';
```

## Conclusion

**retry-handler.ts should be DELETED** as part of Task 1.1.6 (Delete unused client files).

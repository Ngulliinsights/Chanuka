# Race Condition Prevention Guide

## Quick Reference for Developers

### When to Use Atomic Operations

Use atomic operations when:
- Multiple requests can modify the same resource simultaneously
- Order of operations matters for data consistency
- You need to prevent duplicate entries or assignments
- Resource limits need to be enforced accurately

### Available Atomic Methods

#### Rate Limiting
```typescript
// ✅ Use this for atomic rate limit checks
const result = await rateLimitService.checkAndRecordRateLimit(context);

// ❌ Avoid separate check and record (race condition)
const check = await rateLimitService.checkRateLimit(context);
await rateLimitService.recordAttempt(context, true);
```

#### Moderation Queue
```typescript
// ✅ Use this to prevent duplicate queue entries
const result = await moderationService.queueForModerationAtomic(context);

// ❌ Avoid non-atomic queueing for critical content
const result = await moderationService.queueForModeration(context);
```

#### Queue Assignment
```typescript
// ✅ Use this to prevent assignment conflicts
const success = await moderationService.assignModeratorAtomic(queueId, moderatorId);

// ❌ Avoid non-atomic assignment for concurrent scenarios
const success = await moderationService.assignModerator(queueId, moderatorId);
```

### Database Transaction Patterns

#### Basic Transaction
```typescript
await withTransaction(async (tx) => {
  // All operations here are atomic
  const result = await tx.select().from(table).where(condition);
  await tx.update(table).set(updates).where(condition);
  return result;
});
```

#### Row-Level Locking
```typescript
await withTransaction(async (tx) => {
  // Lock row to prevent concurrent modifications
  const item = await tx
    .select()
    .from(table)
    .where(condition)
    .for('update'); // This locks the row
    
  if (item.length === 0) return null;
  
  // Safe to modify now
  await tx.update(table).set(updates).where(condition);
});
```

### Job Execution Patterns

#### Overlap Prevention
```typescript
// ✅ Use this pattern for background jobs
const job = Cron(schedule, async () => {
  const result = await executeJobWithOverlapPrevention(jobName, handler, timeout);
  // Job will be skipped if previous execution is still running
});

// ❌ Avoid direct job execution without overlap protection
const job = Cron(schedule, async () => {
  await handler(); // Can overlap with previous execution
});
```

### Singleton Patterns

#### Thread-Safe Singleton
```typescript
class MyService {
  private static instance: MyService;
  private static initializing = false;

  static getInstance(): MyService {
    if (MyService.instance) {
      return MyService.instance;
    }
    
    if (!MyService.initializing) {
      MyService.initializing = true;
      MyService.instance = new MyService();
      MyService.initializing = false;
    }
    
    return MyService.instance;
  }
}
```

### Common Pitfalls to Avoid

#### 1. Check-Then-Act Race Conditions
```typescript
// ❌ BAD: Race condition between check and action
if (!await exists(resource)) {
  await create(resource); // Another thread might create it first
}

// ✅ GOOD: Atomic check-and-create
await withTransaction(async (tx) => {
  const existing = await tx.select().from(table).where(condition).for('update');
  if (existing.length === 0) {
    await tx.insert(table).values(data);
  }
});
```

#### 2. Non-Atomic Counter Updates
```typescript
// ❌ BAD: Race condition in counter increment
const current = await getCount();
await setCount(current + 1);

// ✅ GOOD: Atomic increment
await tx.update(table).set({ count: sql`${table.count} + 1` });
```

#### 3. Unprotected Shared Resources
```typescript
// ❌ BAD: Multiple jobs can run simultaneously
setInterval(async () => {
  await heavyOperation(); // Can overlap
}, 60000);

// ✅ GOOD: Protected job execution
setInterval(async () => {
  if (acquireJobLock('heavy-operation')) {
    try {
      await heavyOperation();
    } finally {
      releaseJobLock('heavy-operation');
    }
  }
}, 60000);
```

### Testing Race Conditions

#### Concurrent Test Pattern
```typescript
// Test concurrent operations
const promises = Array(10).fill().map(() => 
  performOperation(sameResource)
);

const results = await Promise.all(promises);

// Verify only expected number succeeded
const successful = results.filter(r => r.success).length;
expect(successful).toBe(1); // Only one should succeed
```

### Performance Considerations

#### Lock Duration
- Keep database locks as short as possible
- Perform expensive operations outside transactions when possible
- Use appropriate isolation levels

#### Error Handling
```typescript
try {
  await withTransaction(async (tx) => {
    // Atomic operations
  });
} catch (error) {
  if (isTransientError(error)) {
    // Retry transient errors
    await retry(() => operation());
  } else {
    // Handle permanent errors
    throw error;
  }
}
```

### Monitoring and Debugging

#### Key Metrics
- Transaction timeout rates
- Lock wait times  
- Retry attempt counts
- Concurrent operation conflicts

#### Debug Logging
```typescript
logger.info('Starting atomic operation', { 
  operation: 'rate-limit-check',
  context: { userId, actionType }
});

const result = await atomicOperation();

logger.info('Atomic operation completed', {
  operation: 'rate-limit-check', 
  success: result.success,
  duration: Date.now() - startTime
});
```

### Emergency Procedures

#### If Race Conditions Occur in Production
1. **Immediate**: Enable fail-safe mode (allow operations to proceed)
2. **Short-term**: Increase monitoring and alerting
3. **Long-term**: Implement additional safeguards and testing

#### Rollback Strategy
- Keep original non-atomic methods for emergency rollback
- Feature flags to switch between atomic and non-atomic operations
- Database migration scripts for data cleanup if needed

Remember: **When in doubt, use atomic operations**. The small performance overhead is worth the data consistency and security benefits.

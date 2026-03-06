# Operational Blindspot Audit Template

## Purpose

This template identifies common operational oversights that occur when building systems with AI assistance without traditional hands-on production experience. Use this to audit every service, repository, and infrastructure component in your codebase.

## How to Use This Template

1. **Select a component** (service, repository, utility, infrastructure)
2. **Go through each category** systematically
3. **Mark findings** as: ✅ Good, ⚠️ Needs Review, ❌ Critical Issue
4. **Document issues** in a tracking sheet
5. **Prioritize fixes** by severity and impact

---

## Category 1: Security Vulnerabilities

### 1.1 Input Validation & Sanitization

**What to Check**:
- [ ] All user inputs are validated before use
- [ ] Validation happens on both client AND server
- [ ] Validation rules match business requirements
- [ ] Error messages don't leak sensitive information
- [ ] Special characters are properly escaped

**Common Blindspots**:
```typescript
// ❌ BAD: No validation
function getUser(userId: string) {
  return db.query(`SELECT * FROM users WHERE id = ${userId}`);
}

// ✅ GOOD: Validated and parameterized
function getUser(userId: string) {
  const validation = validateUserId(userId);
  if (!validation.isValid) throw new Error('Invalid user ID');
  return db.query(sql`SELECT * FROM users WHERE id = ${userId}`);
}
```

**Questions to Ask**:
- What happens if I pass null, undefined, empty string, or extremely long string?
- What happens if I pass SQL injection payloads?
- What happens if I pass script tags (XSS)?
- Are file uploads validated for type, size, and content?

### 1.2 SQL Injection Prevention

**What to Check**:
- [ ] All database queries use parameterization
- [ ] No string concatenation for SQL queries
- [ ] No use of `sql.raw()` or similar unsafe methods
- [ ] Table/column names are validated if dynamic
- [ ] ORM is used correctly (not bypassed)

**Common Blindspots**:
```typescript
// ❌ CRITICAL: sql.raw() bypasses parameterization
const query = sql.raw(`SELECT * FROM ${tableName} WHERE id = ${id}`);

// ✅ GOOD: Proper parameterization
const query = sql`SELECT * FROM ${sql.identifier(tableName)} WHERE id = ${id}`;
```

**Red Flags**:
- `sql.raw()`
- String template literals for SQL: `` `SELECT * FROM ${table}` ``
- `.query()` with string concatenation
- Dynamic table/column names without validation

### 1.3 Authentication & Authorization

**What to Check**:
- [ ] Authentication is required for protected endpoints
- [ ] Authorization checks happen on every request (not just once)
- [ ] User permissions are checked before data access
- [ ] Session tokens expire appropriately
- [ ] Password requirements are enforced
- [ ] Rate limiting is implemented

**Common Blindspots**:
```typescript
// ❌ BAD: No authorization check
async function getBill(billId: string) {
  return await db.select().from(bills).where(eq(bills.id, billId));
}

// ✅ GOOD: Authorization check
async function getBill(billId: string, userId: string) {
  const bill = await db.select().from(bills).where(eq(bills.id, billId));
  if (bill.userId !== userId) throw new UnauthorizedError();
  return bill;
}
```

**Questions to Ask**:
- Can user A access user B's data?
- What happens if I remove the auth token?
- What happens if I modify the user ID in the token?
- Are admin-only endpoints actually protected?

### 1.4 Data Exposure

**What to Check**:
- [ ] Sensitive data is not logged
- [ ] Error messages don't expose internal details
- [ ] API responses don't include unnecessary fields
- [ ] Database errors are sanitized before sending to client
- [ ] Stack traces are not exposed in production

**Common Blindspots**:
```typescript
// ❌ BAD: Exposes password in logs
logger.info({ user }, 'User logged in');

// ✅ GOOD: Sanitizes sensitive fields
logger.info({ userId: user.id, email: user.email }, 'User logged in');

// ❌ BAD: Exposes database structure
catch (error) {
  res.status(500).json({ error: error.message });
}

// ✅ GOOD: Generic error message
catch (error) {
  logger.error({ error }, 'Database error');
  res.status(500).json({ error: 'Internal server error' });
}
```

### 1.5 Cryptography & Secrets

**What to Check**:
- [ ] Passwords are hashed (bcrypt, argon2)
- [ ] Secrets are not hardcoded
- [ ] Environment variables are used for sensitive config
- [ ] API keys are not committed to git
- [ ] Encryption uses strong algorithms (AES-256, not DES)
- [ ] Random values use cryptographically secure generators

**Common Blindspots**:
```typescript
// ❌ BAD: Hardcoded secret
const JWT_SECRET = 'my-secret-key';

// ✅ GOOD: Environment variable
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET not configured');

// ❌ BAD: Weak random
const token = Math.random().toString(36);

// ✅ GOOD: Cryptographically secure
const token = crypto.randomBytes(32).toString('hex');
```

---

## Category 2: Performance & Scalability

### 2.1 N+1 Query Problems

**What to Check**:
- [ ] Loops don't contain database queries
- [ ] Related data is fetched with joins or includes
- [ ] Batch operations are used for multiple inserts/updates
- [ ] Pagination is implemented for large datasets

**Common Blindspots**:
```typescript
// ❌ BAD: N+1 queries
const users = await db.select().from(users);
for (const user of users) {
  user.bills = await db.select().from(bills).where(eq(bills.userId, user.id));
}

// ✅ GOOD: Single query with join
const usersWithBills = await db
  .select()
  .from(users)
  .leftJoin(bills, eq(users.id, bills.userId));
```

**Red Flags**:
- `await` inside `for` loop
- Database queries inside `.map()` or `.forEach()`
- No pagination on list endpoints

### 2.2 Memory Leaks

**What to Check**:
- [ ] Event listeners are cleaned up
- [ ] Timers/intervals are cleared
- [ ] Large arrays are not kept in memory indefinitely
- [ ] Caches have size limits
- [ ] Streams are properly closed

**Common Blindspots**:
```typescript
// ❌ BAD: Unbounded cache
class CacheService {
  private cache = new Map();
  
  set(key: string, value: any) {
    this.cache.set(key, value); // Never cleaned up!
  }
}

// ✅ GOOD: Bounded cache with TTL
class CacheService {
  private cache = new Map();
  private readonly maxSize = 1000;
  
  set(key: string, value: any) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiry: Date.now() + 3600000 });
  }
}
```

### 2.3 Resource Exhaustion

**What to Check**:
- [ ] Database connections are pooled and limited
- [ ] File uploads have size limits
- [ ] API requests have timeouts
- [ ] Queries have result limits
- [ ] Recursive functions have depth limits

**Common Blindspots**:
```typescript
// ❌ BAD: No timeout
async function fetchExternalData(url: string) {
  return await fetch(url); // Could hang forever
}

// ✅ GOOD: With timeout
async function fetchExternalData(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
```

### 2.4 Inefficient Algorithms

**What to Check**:
- [ ] No O(n²) algorithms on large datasets
- [ ] Sorting is done in database, not in application
- [ ] Filtering is done in database, not in application
- [ ] Indexes exist on frequently queried columns
- [ ] Full table scans are avoided

**Common Blindspots**:
```typescript
// ❌ BAD: Fetch all, filter in memory
const allBills = await db.select().from(bills);
const userBills = allBills.filter(b => b.userId === userId);

// ✅ GOOD: Filter in database
const userBills = await db.select().from(bills).where(eq(bills.userId, userId));
```

### 2.5 Caching Strategy

**What to Check**:
- [ ] Frequently accessed data is cached
- [ ] Cache has TTL (time to live)
- [ ] Cache invalidation strategy exists
- [ ] Cache keys are namespaced
- [ ] Cache size is limited

**Common Blindspots**:
```typescript
// ❌ BAD: No cache invalidation
async function getUser(userId: string) {
  const cached = cache.get(`user:${userId}`);
  if (cached) return cached;
  
  const user = await db.select().from(users).where(eq(users.id, userId));
  cache.set(`user:${userId}`, user); // Never expires!
  return user;
}

// ✅ GOOD: With TTL and invalidation
async function getUser(userId: string) {
  const cached = cache.get(`user:${userId}`);
  if (cached) return cached;
  
  const user = await db.select().from(users).where(eq(users.id, userId));
  cache.set(`user:${userId}`, user, { ttl: 3600 }); // 1 hour
  return user;
}

async function updateUser(userId: string, data: any) {
  await db.update(users).set(data).where(eq(users.id, userId));
  cache.delete(`user:${userId}`); // Invalidate cache
}
```

---

## Category 3: Error Handling & Resilience

### 3.1 Error Handling Completeness

**What to Check**:
- [ ] All async operations have try-catch
- [ ] Errors are logged with context
- [ ] Errors are classified (retryable vs. permanent)
- [ ] User-facing errors are helpful
- [ ] Errors don't crash the application

**Common Blindspots**:
```typescript
// ❌ BAD: Unhandled promise rejection
async function processPayment(paymentId: string) {
  const payment = await getPayment(paymentId); // Could throw
  await chargeCard(payment.cardToken); // Could throw
  await updatePaymentStatus(paymentId, 'completed'); // Could throw
}

// ✅ GOOD: Comprehensive error handling
async function processPayment(paymentId: string) {
  try {
    const payment = await getPayment(paymentId);
    await chargeCard(payment.cardToken);
    await updatePaymentStatus(paymentId, 'completed');
  } catch (error) {
    logger.error({ error, paymentId }, 'Payment processing failed');
    await updatePaymentStatus(paymentId, 'failed');
    throw new PaymentError('Payment processing failed', { cause: error });
  }
}
```

### 3.2 Retry Logic

**What to Check**:
- [ ] Transient failures are retried
- [ ] Retry has exponential backoff
- [ ] Maximum retry attempts are defined
- [ ] Idempotency is ensured for retries
- [ ] Circuit breaker pattern for external services

**Common Blindspots**:
```typescript
// ❌ BAD: No retry logic
async function sendEmail(to: string, subject: string, body: string) {
  return await emailService.send({ to, subject, body });
}

// ✅ GOOD: With retry and backoff
async function sendEmail(to: string, subject: string, body: string) {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await emailService.send({ to, subject, body });
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      await sleep(delay);
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts`, { cause: lastError });
}
```

### 3.3 Transaction Management

**What to Check**:
- [ ] Related operations are wrapped in transactions
- [ ] Transactions are rolled back on error
- [ ] Transactions have timeouts
- [ ] Deadlock scenarios are handled
- [ ] Transaction isolation level is appropriate

**Common Blindspots**:
```typescript
// ❌ BAD: No transaction
async function transferFunds(fromAccount: string, toAccount: string, amount: number) {
  await debitAccount(fromAccount, amount);
  await creditAccount(toAccount, amount); // If this fails, money is lost!
}

// ✅ GOOD: With transaction
async function transferFunds(fromAccount: string, toAccount: string, amount: number) {
  return await db.transaction(async (tx) => {
    await debitAccount(fromAccount, amount, tx);
    await creditAccount(toAccount, amount, tx);
  });
}
```

### 3.4 Graceful Degradation

**What to Check**:
- [ ] Non-critical features can fail without breaking core functionality
- [ ] Fallback values exist for external service failures
- [ ] Feature flags allow disabling problematic features
- [ ] Circuit breakers prevent cascading failures

**Common Blindspots**:
```typescript
// ❌ BAD: Recommendation failure breaks entire page
async function getUserDashboard(userId: string) {
  const user = await getUser(userId);
  const bills = await getBills(userId);
  const recommendations = await getRecommendations(userId); // If this fails, everything fails
  
  return { user, bills, recommendations };
}

// ✅ GOOD: Graceful degradation
async function getUserDashboard(userId: string) {
  const user = await getUser(userId);
  const bills = await getBills(userId);
  
  let recommendations = [];
  try {
    recommendations = await getRecommendations(userId);
  } catch (error) {
    logger.warn({ error, userId }, 'Failed to load recommendations');
    // Continue without recommendations
  }
  
  return { user, bills, recommendations };
}
```

---

## Category 4: Data Integrity & Consistency

### 4.1 Race Conditions

**What to Check**:
- [ ] Concurrent updates are handled correctly
- [ ] Optimistic locking is used where appropriate
- [ ] Database constraints prevent invalid states
- [ ] Idempotency keys are used for critical operations

**Common Blindspots**:
```typescript
// ❌ BAD: Race condition
async function incrementCounter(userId: string) {
  const user = await getUser(userId);
  user.loginCount += 1;
  await updateUser(userId, user); // Another request could have updated in between
}

// ✅ GOOD: Atomic update
async function incrementCounter(userId: string) {
  await db
    .update(users)
    .set({ loginCount: sql`login_count + 1` })
    .where(eq(users.id, userId));
}
```

### 4.2 Data Validation

**What to Check**:
- [ ] Database constraints match application validation
- [ ] Foreign key constraints are defined
- [ ] Unique constraints are defined
- [ ] Check constraints for business rules
- [ ] NOT NULL constraints where appropriate

**Common Blindspots**:
```typescript
// ❌ BAD: Only application-level validation
function createUser(email: string, name: string) {
  if (!email || !name) throw new Error('Email and name required');
  return db.insert(users).values({ email, name });
}

// ✅ GOOD: Database constraints + application validation
// In schema:
// email: varchar(255) NOT NULL UNIQUE
// name: varchar(255) NOT NULL
// created_at: timestamp NOT NULL DEFAULT NOW()

function createUser(email: string, name: string) {
  if (!email || !name) throw new Error('Email and name required');
  if (!isValidEmail(email)) throw new Error('Invalid email');
  return db.insert(users).values({ email, name });
}
```

### 4.3 Orphaned Data

**What to Check**:
- [ ] Cascade deletes are configured
- [ ] Soft deletes are used where appropriate
- [ ] Cleanup jobs exist for temporary data
- [ ] Foreign key constraints prevent orphans

**Common Blindspots**:
```typescript
// ❌ BAD: Orphaned bills
async function deleteUser(userId: string) {
  await db.delete(users).where(eq(users.id, userId));
  // Bills still reference this user!
}

// ✅ GOOD: Cascade delete or soft delete
async function deleteUser(userId: string) {
  // Option 1: Cascade delete
  await db.transaction(async (tx) => {
    await tx.delete(bills).where(eq(bills.userId, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });
  
  // Option 2: Soft delete
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId));
}
```

### 4.4 Data Migration Safety

**What to Check**:
- [ ] Migrations are reversible
- [ ] Migrations are tested on production-like data
- [ ] Migrations handle existing data correctly
- [ ] Migrations don't lock tables for long periods
- [ ] Backups are taken before migrations

**Common Blindspots**:
```typescript
// ❌ BAD: Irreversible migration
export async function up(db: Database) {
  await db.schema.alterTable('users').dropColumn('old_field').execute();
}

// ✅ GOOD: Reversible migration
export async function up(db: Database) {
  await db.schema.alterTable('users').addColumn('new_field', 'varchar(255)').execute();
  await db.raw('UPDATE users SET new_field = old_field');
}

export async function down(db: Database) {
  await db.schema.alterTable('users').dropColumn('new_field').execute();
}
```

---

## Category 5: Observability & Debugging

### 5.1 Logging

**What to Check**:
- [ ] All errors are logged with context
- [ ] Important business events are logged
- [ ] Logs include correlation IDs for tracing
- [ ] Log levels are appropriate (debug, info, warn, error)
- [ ] Sensitive data is not logged

**Common Blindspots**:
```typescript
// ❌ BAD: No context
catch (error) {
  logger.error('Error occurred');
}

// ✅ GOOD: Rich context
catch (error) {
  logger.error({
    error,
    userId,
    billId,
    operation: 'processBill',
    correlationId: req.correlationId
  }, 'Failed to process bill');
}
```

### 5.2 Metrics & Monitoring

**What to Check**:
- [ ] Performance metrics are collected
- [ ] Business metrics are tracked
- [ ] Alerts are configured for critical issues
- [ ] Dashboards exist for key metrics
- [ ] SLOs/SLAs are defined and monitored

**Common Blindspots**:
```typescript
// ❌ BAD: No metrics
async function processPayment(paymentId: string) {
  return await paymentService.process(paymentId);
}

// ✅ GOOD: With metrics
async function processPayment(paymentId: string) {
  const startTime = Date.now();
  
  try {
    const result = await paymentService.process(paymentId);
    metrics.increment('payment.success');
    metrics.histogram('payment.duration', Date.now() - startTime);
    return result;
  } catch (error) {
    metrics.increment('payment.failure');
    throw error;
  }
}
```

### 5.3 Distributed Tracing

**What to Check**:
- [ ] Requests have correlation IDs
- [ ] Correlation IDs are passed to external services
- [ ] Spans are created for important operations
- [ ] Trace context is propagated

**Common Blindspots**:
```typescript
// ❌ BAD: No tracing
async function getUserBills(userId: string) {
  const user = await userService.getUser(userId);
  const bills = await billService.getBills(userId);
  return { user, bills };
}

// ✅ GOOD: With tracing
async function getUserBills(userId: string, correlationId: string) {
  const span = tracer.startSpan('getUserBills', { correlationId });
  
  try {
    const user = await userService.getUser(userId, correlationId);
    const bills = await billService.getBills(userId, correlationId);
    return { user, bills };
  } finally {
    span.end();
  }
}
```

### 5.4 Health Checks

**What to Check**:
- [ ] Health check endpoint exists
- [ ] Health check verifies database connectivity
- [ ] Health check verifies external service connectivity
- [ ] Health check has timeout
- [ ] Readiness vs. liveness checks are differentiated

**Common Blindspots**:
```typescript
// ❌ BAD: Fake health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ✅ GOOD: Real health check
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    externalApi: await checkExternalApi()
  };
  
  const isHealthy = Object.values(checks).every(c => c.status === 'ok');
  const statusCode = isHealthy ? 200 : 503;
  
  res.status(statusCode).json({
    status: isHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  });
});
```

---

## Category 6: Testing Gaps

### 6.1 Test Coverage

**What to Check**:
- [ ] Unit tests exist for business logic
- [ ] Integration tests exist for database operations
- [ ] End-to-end tests exist for critical flows
- [ ] Edge cases are tested
- [ ] Error scenarios are tested

**Common Blindspots**:
```typescript
// ❌ BAD: Only happy path tested
describe('createUser', () => {
  it('should create user', async () => {
    const user = await createUser('test@example.com', 'Test User');
    expect(user).toBeDefined();
  });
});

// ✅ GOOD: Edge cases and errors tested
describe('createUser', () => {
  it('should create user with valid data', async () => {
    const user = await createUser('test@example.com', 'Test User');
    expect(user.email).toBe('test@example.com');
  });
  
  it('should reject invalid email', async () => {
    await expect(createUser('invalid', 'Test')).rejects.toThrow('Invalid email');
  });
  
  it('should reject duplicate email', async () => {
    await createUser('test@example.com', 'Test User');
    await expect(createUser('test@example.com', 'Another')).rejects.toThrow();
  });
  
  it('should reject missing name', async () => {
    await expect(createUser('test@example.com', '')).rejects.toThrow();
  });
});
```

### 6.2 Security Testing

**What to Check**:
- [ ] SQL injection tests exist
- [ ] XSS tests exist
- [ ] Authorization tests exist
- [ ] Rate limiting tests exist
- [ ] Input validation tests exist

**Common Blindspots**:
```typescript
// ✅ GOOD: Security tests
describe('Security', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "1' OR '1'='1";
    const result = await getUser(maliciousInput);
    expect(result).toBeNull(); // Should not return all users
  });
  
  it('should prevent unauthorized access', async () => {
    const bill = await createBill(user1.id, { amount: 100 });
    await expect(getBill(bill.id, user2.id)).rejects.toThrow('Unauthorized');
  });
  
  it('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() => makeRequest());
    const results = await Promise.allSettled(requests);
    const rejected = results.filter(r => r.status === 'rejected');
    expect(rejected.length).toBeGreaterThan(0);
  });
});
```

---

## Category 7: Placeholder & Template Code

### 7.1 TODO Comments & Incomplete Implementation

**What to Check**:
- [ ] No TODO comments in production code
- [ ] No FIXME comments without tracking tickets
- [ ] No "Coming soon" placeholders
- [ ] No commented-out code blocks
- [ ] No temporary workarounds without documentation

**Common Blindspots**:
```typescript
// ❌ BAD: TODO in production
async function processPayment(paymentId: string) {
  // TODO: Add proper error handling
  const payment = await getPayment(paymentId);
  // TODO: Implement retry logic
  return await chargeCard(payment);
}

// ❌ BAD: Placeholder implementation
async function sendNotification(userId: string, message: string) {
  // Coming soon: Will implement push notifications
  console.log('Notification:', message);
  return true;
}

// ✅ GOOD: Complete implementation or tracked issue
async function processPayment(paymentId: string) {
  try {
    const payment = await getPayment(paymentId);
    return await retryWithBackoff(() => chargeCard(payment));
  } catch (error) {
    logger.error({ error, paymentId }, 'Payment processing failed');
    throw new PaymentError('Payment failed', { cause: error });
  }
}
```

**Red Flags**:
- `TODO:`
- `FIXME:`
- `HACK:`
- `XXX:`
- `TEMP:`
- `Coming soon`
- `Not implemented yet`
- `Placeholder`

### 7.2 Mock/Stub Implementations in Production

**What to Check**:
- [ ] No mock services in production code
- [ ] No stub implementations
- [ ] No fake data generators
- [ ] No test doubles outside test directories
- [ ] Feature flags properly configured

**Common Blindspots**:
```typescript
// ❌ CRITICAL: Mock in production
export class PaymentService {
  async processPayment(amount: number) {
    // Mock implementation for testing
    console.log('Processing payment:', amount);
    return { success: true, transactionId: 'mock-123' };
  }
}

// ❌ BAD: Stub with fake data
async function getUserRecommendations(userId: string) {
  // Stub: Return fake recommendations until ML model is ready
  return [
    { id: 1, title: 'Sample Bill 1' },
    { id: 2, title: 'Sample Bill 2' }
  ];
}

// ✅ GOOD: Real implementation or feature flag
async function getUserRecommendations(userId: string) {
  if (!featureFlags.isEnabled('ml-recommendations')) {
    return []; // Return empty, don't fake data
  }
  return await mlService.getRecommendations(userId);
}
```

**Red Flags**:
- `mock`
- `stub`
- `fake`
- `dummy`
- `test-`
- `sample-`
- `example-`

### 7.3 Hardcoded Test Data

**What to Check**:
- [ ] No hardcoded user IDs
- [ ] No hardcoded email addresses
- [ ] No test credit card numbers
- [ ] No sample phone numbers
- [ ] No lorem ipsum text

**Common Blindspots**:
```typescript
// ❌ BAD: Hardcoded test data
const ADMIN_USER_ID = 'test-admin-123';
const TEST_EMAIL = 'test@example.com';

async function sendWelcomeEmail(userId: string) {
  const user = await getUser(userId);
  await emailService.send({
    to: user.email || 'test@example.com', // Fallback to test email!
    subject: 'Welcome',
    body: 'Lorem ipsum dolor sit amet...' // Placeholder text!
  });
}

// ✅ GOOD: No hardcoded test data
async function sendWelcomeEmail(userId: string) {
  const user = await getUser(userId);
  
  if (!user.email) {
    throw new Error('User email is required');
  }
  
  const template = await getEmailTemplate('welcome');
  await emailService.send({
    to: user.email,
    subject: template.subject,
    body: template.render({ userName: user.name })
  });
}
```

**Red Flags**:
- `test@`
- `example.com`
- `lorem ipsum`
- `123-456-7890`
- `4111111111111111` (test credit card)
- `user-123`
- `admin-test`

### 7.4 Incomplete Error Messages

**What to Check**:
- [ ] Error messages are descriptive
- [ ] No generic "Error occurred" messages
- [ ] No placeholder error text
- [ ] Error codes are defined
- [ ] User-facing errors are helpful

**Common Blindspots**:
```typescript
// ❌ BAD: Generic error messages
catch (error) {
  throw new Error('Something went wrong');
}

catch (error) {
  throw new Error('Error'); // Useless!
}

catch (error) {
  throw new Error('TODO: Add proper error message');
}

// ✅ GOOD: Descriptive error messages
catch (error) {
  throw new PaymentError(
    'Failed to process payment: Card declined',
    {
      code: 'PAYMENT_CARD_DECLINED',
      userId,
      amount,
      cause: error
    }
  );
}
```

### 7.5 Commented-Out Code

**What to Check**:
- [ ] No large blocks of commented code
- [ ] No old implementation left in comments
- [ ] No "backup" code in comments
- [ ] Use version control instead of comments

**Common Blindspots**:
```typescript
// ❌ BAD: Commented-out code
async function processOrder(orderId: string) {
  const order = await getOrder(orderId);
  
  // Old implementation - keeping for reference
  // const total = order.items.reduce((sum, item) => sum + item.price, 0);
  // const tax = total * 0.1;
  // const finalTotal = total + tax;
  
  // New implementation
  const calculator = new OrderCalculator();
  const finalTotal = calculator.calculate(order);
  
  return finalTotal;
}

// ✅ GOOD: Clean code, use git history
async function processOrder(orderId: string) {
  const order = await getOrder(orderId);
  const calculator = new OrderCalculator();
  return calculator.calculate(order);
}
```

### 7.6 Incomplete Feature Implementations

**What to Check**:
- [ ] All exported functions are implemented
- [ ] No empty function bodies
- [ ] No functions that just throw "Not implemented"
- [ ] Feature flags for incomplete features
- [ ] Documentation matches implementation

**Common Blindspots**:
```typescript
// ❌ BAD: Exported but not implemented
export async function generateReport(userId: string) {
  throw new Error('Not implemented yet');
}

export async function exportToPDF(data: any) {
  // TODO: Implement PDF export
  return null;
}

export async function sendSMS(phone: string, message: string) {
  // Placeholder - SMS not configured yet
  console.log('Would send SMS:', message);
}

// ✅ GOOD: Don't export until implemented
// Keep in separate file or mark as internal
async function generateReportInternal(userId: string) {
  throw new Error('Feature not yet available');
}

// Or use feature flag
export async function generateReport(userId: string) {
  if (!featureFlags.isEnabled('report-generation')) {
    throw new FeatureNotAvailableError('Report generation is not available');
  }
  return await reportService.generate(userId);
}
```

### 7.7 Debug Code & Console Logs

**What to Check**:
- [ ] No console.log in production
- [ ] No debugger statements
- [ ] No alert() calls
- [ ] Use proper logging library
- [ ] Log levels are appropriate

**Common Blindspots**:
```typescript
// ❌ BAD: Debug code in production
async function processData(data: any) {
  console.log('Processing data:', data); // Debug log!
  debugger; // Forgot to remove!
  
  const result = transform(data);
  console.log('Result:', result); // More debug logs!
  
  return result;
}

// ❌ BAD: Alert in production
async function saveData(data: any) {
  try {
    await db.save(data);
    alert('Data saved!'); // This is not a browser!
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// ✅ GOOD: Proper logging
async function processData(data: any) {
  logger.debug({ data }, 'Processing data');
  
  const result = transform(data);
  
  logger.info({ 
    dataSize: data.length,
    resultSize: result.length 
  }, 'Data processed successfully');
  
  return result;
}
```

### 7.8 Placeholder Configuration Values

**What to Check**:
- [ ] No default passwords
- [ ] No localhost URLs in production config
- [ ] No example API keys
- [ ] No placeholder database names
- [ ] Environment-specific configs exist

**Common Blindspots**:
```typescript
// ❌ BAD: Placeholder configuration
const config = {
  database: {
    host: process.env.DB_HOST || 'localhost', // Localhost in production!
    password: process.env.DB_PASSWORD || 'password123', // Default password!
    database: process.env.DB_NAME || 'test_db' // Test database!
  },
  api: {
    key: process.env.API_KEY || 'your-api-key-here', // Placeholder!
    url: 'http://localhost:3000' // Hardcoded localhost!
  }
};

// ✅ GOOD: Required configuration
const config = {
  database: {
    host: requireEnv('DB_HOST'),
    password: requireEnv('DB_PASSWORD'),
    database: requireEnv('DB_NAME')
  },
  api: {
    key: requireEnv('API_KEY'),
    url: requireEnv('API_URL')
  }
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}
```

### 7.9 Copy-Paste Template Code

**What to Check**:
- [ ] No duplicate code blocks
- [ ] No repeated patterns that should be abstracted
- [ ] Function names match their purpose
- [ ] Comments match the code
- [ ] No references to wrong entities

**Common Blindspots**:
```typescript
// ❌ BAD: Copy-paste with wrong names
// Copied from UserService but forgot to update
export class BillService {
  async getBill(billId: string) {
    // Get user from database  <-- Wrong comment!
    const bill = await this.userRepository.findById(billId); // <-- Wrong repository!
    
    if (!bill) {
      throw new Error('User not found'); // <-- Wrong error message!
    }
    
    return bill;
  }
}

// ❌ BAD: Template code not customized
export class ProductService {
  // TODO: Replace 'Entity' with actual entity name
  async getEntity(id: string) {
    return await this.repository.findById(id);
  }
  
  async createEntity(data: any) {
    return await this.repository.create(data);
  }
}

// ✅ GOOD: Properly customized
export class BillService {
  async getBill(billId: string) {
    const bill = await this.billRepository.findById(billId);
    
    if (!bill) {
      throw new NotFoundError('Bill not found');
    }
    
    return bill;
  }
}
```

### 7.10 Incomplete Type Definitions

**What to Check**:
- [ ] No `any` types without justification
- [ ] No `unknown` without proper type guards
- [ ] No empty interfaces
- [ ] No placeholder type names
- [ ] All types are properly documented

**Common Blindspots**:
```typescript
// ❌ BAD: Placeholder types
interface UserData {
  // TODO: Define proper user fields
  [key: string]: any;
}

type PaymentResult = any; // Placeholder

interface Config {
  // Add config fields here
}

// ❌ BAD: Lazy typing
async function processData(data: any): Promise<any> {
  // Process data
  return data;
}

// ✅ GOOD: Proper types
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  timestamp: Date;
}

async function processUser(user: User): Promise<ProcessedUser> {
  // Process user
  return {
    userId: user.id,
    displayName: user.name,
    verified: true
  };
}
```

---

## Category 8: Configuration & Deployment

### 7.1 Configuration Management

**What to Check**:
- [ ] All configuration is externalized
- [ ] Environment-specific configs exist
- [ ] Secrets are not in code or git
- [ ] Configuration validation happens at startup
- [ ] Default values are sensible

**Common Blindspots**:
```typescript
// ❌ BAD: Hardcoded configuration
const DATABASE_URL = 'postgresql://localhost:5432/mydb';
const API_KEY = 'abc123';

// ✅ GOOD: Environment-based configuration
const config = {
  database: {
    url: process.env.DATABASE_URL || throwError('DATABASE_URL required'),
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
    timeout: parseInt(process.env.DB_TIMEOUT || '30000')
  },
  api: {
    key: process.env.API_KEY || throwError('API_KEY required'),
    baseUrl: process.env.API_BASE_URL || 'https://api.example.com'
  }
};

// Validate at startup
validateConfig(config);
```

### 7.2 Graceful Shutdown

**What to Check**:
- [ ] SIGTERM/SIGINT handlers exist
- [ ] In-flight requests are completed before shutdown
- [ ] Database connections are closed
- [ ] Background jobs are stopped
- [ ] Health check returns unhealthy during shutdown

**Common Blindspots**:
```typescript
// ❌ BAD: Abrupt shutdown
process.on('SIGTERM', () => {
  process.exit(0);
});

// ✅ GOOD: Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, starting graceful shutdown');
  
  // Stop accepting new requests
  server.close();
  
  // Wait for in-flight requests (with timeout)
  await Promise.race([
    waitForInFlightRequests(),
    sleep(30000) // 30 second timeout
  ]);
  
  // Close database connections
  await db.destroy();
  
  // Close other resources
  await redis.quit();
  
  logger.info('Graceful shutdown complete');
  process.exit(0);
});
```

### 7.3 Database Migrations

**What to Check**:
- [ ] Migration strategy is defined
- [ ] Migrations are version controlled
- [ ] Rollback procedure exists
- [ ] Migrations are tested before production
- [ ] Zero-downtime migration strategy for breaking changes

**Common Blindspots**:
- Running migrations manually instead of automated
- No rollback plan
- Breaking changes without backward compatibility period
- Not testing migrations on production-like data

---

## Audit Checklist Summary

Use this quick checklist for each component:

### Critical (Must Fix Immediately)
- [ ] SQL injection vulnerabilities
- [ ] Authentication/authorization bypasses
- [ ] Hardcoded secrets
- [ ] Unhandled promise rejections
- [ ] Race conditions in critical operations

### High Priority (Fix Within Sprint)
- [ ] N+1 query problems
- [ ] Memory leaks
- [ ] Missing error handling
- [ ] No transaction management
- [ ] Missing input validation

### Medium Priority (Fix Within Month)
- [ ] Missing logging/metrics
- [ ] No retry logic
- [ ] Inefficient algorithms
- [ ] Missing health checks
- [ ] Poor test coverage

### Low Priority (Technical Debt)
- [ ] Singleton patterns
- [ ] Missing documentation
- [ ] Code duplication
- [ ] Inconsistent naming
- [ ] Missing type safety

---

## Audit Report Template

```markdown
# Component Audit Report: [Component Name]

**Auditor**: [Your Name]
**Date**: [Date]
**Component**: [Path to component]
**Type**: [Service/Repository/Utility/Infrastructure]

## Executive Summary
[Brief overview of findings]

## Critical Issues (Fix Immediately)
1. [Issue description]
   - **Severity**: Critical
   - **Impact**: [What could go wrong]
   - **Location**: [File:Line]
   - **Fix**: [How to fix]

## High Priority Issues
[Same format as above]

## Medium Priority Issues
[Same format as above]

## Low Priority Issues
[Same format as above]

## Positive Findings
[Things that are done well]

## Recommendations
[General recommendations for improvement]

## Next Steps
1. [Action item 1]
2. [Action item 2]
```

---

## Automation Opportunities

Consider creating automated checks for:

1. **Static Analysis**:
   - ESLint rules for security patterns
   - Custom rules for SQL injection patterns
   - Dependency vulnerability scanning

2. **Code Review Checklist**:
   - Automated PR comments for common issues
   - Required security review for certain file changes

3. **CI/CD Checks**:
   - Security tests must pass
   - Code coverage thresholds
   - Performance regression tests

4. **Monitoring Alerts**:
   - Error rate spikes
   - Performance degradation
   - Security event detection

---

## Conclusion

This template helps systematically identify operational blindspots that commonly occur when building systems without traditional production experience. Use it regularly to maintain code quality and operational readiness.

Remember: The goal is not perfection, but continuous improvement and awareness of potential issues before they become production problems.

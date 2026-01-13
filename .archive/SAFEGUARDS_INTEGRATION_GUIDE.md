/**
 * SAFEGUARDS INTEGRATION GUIDE
 * Step-by-step instructions for wiring everything together
 */

# SAFEGUARDS SYSTEM - INTEGRATION GUIDE

## QUICK START CHECKLIST

```
Phase 1: Infrastructure Setup (1-2 hours)
  [ ] Verify safeguards.ts exists and is complete (925 lines)
  [ ] Verify all 3 service files exist and compile
  [ ] Verify safeguard-jobs.ts created successfully
  [ ] Run `npm run build` - should have 0 errors
  [ ] Database migration for 14 safeguard tables

Phase 2: Service Wiring (2-3 hours)
  [ ] Create safeguards middleware wrapper
  [ ] Integrate rate limit checks into request pipeline
  [ ] Wire moderation service into content handlers
  [ ] Wire CIB detection into analytics pipeline
  [ ] Add admin endpoints for manual job triggers

Phase 3: Testing (2-3 hours)
  [ ] Unit test rate limiter (blocked scenarios)
  [ ] Unit test moderation workflow (queue → decision → appeal)
  [ ] Unit test CIB pattern detection
  [ ] Integration test job execution
  [ ] Load test with fake concurrent requests

Phase 4: Deployment (1 hour)
  [ ] Enable safeguard jobs at startup
  [ ] Monitor job execution logs
  [ ] Verify metrics reporting
  [ ] Set up alerts for SLA violations
```

---

## PHASE 1: INFRASTRUCTURE SETUP

### 1.1 Verify Schema File

```bash
# Check file exists and has all 14 tables
wc -l shared/schema/safeguards.ts
# Expected: ~925 lines

# Verify exports
grep -c "export const" shared/schema/safeguards.ts
# Expected: 14 tables + 14 relations + 7 enums = 35 exports

# Check types
grep -c "export type" shared/schema/safeguards.ts
# Expected: 30 type exports (15 tables × 2)
```

### 1.2 Create Database Migration

```bash
# Generate migration from schema
npm run db:generate

# Review generated migration
cat migrations/[timestamp]_safeguards_schema.sql
# Should contain 14 CREATE TABLE statements

# Apply migration to development DB
npm run db:push

# Verify tables created
psql -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%rate%' OR table_name LIKE '%moderation%' OR table_name LIKE '%reputation%';"
# Should list 14 safeguard tables
```

### 1.3 Verify Service Files Compile

```bash
# Type check all services
npx tsc --noEmit server/features/safeguards/**/*.ts

# Should have 0 errors. If errors:
# - Check imports are correct
# - Verify database config exports
# - Check logger is properly exported

# Build entire project
npm run build

# Confirm no safeguards-related errors in output
```

---

## PHASE 2: SERVICE WIRING

### 2.1 Create Safeguards Middleware

**File**: `server/middleware/safeguards-middleware.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { rateLimitService } from "@/server/features/safeguards/application/rate-limit-service";
import { logger } from "@/server/utils/logger";

/**
 * Safeguards middleware - wraps all incoming requests
 * Checks rate limits before processing
 */
export async function safeguardsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract identifying info
    const userId = (req.user as any)?.id;
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("User-Agent") || "";

    // Determine action type from request
    const actionType = determineActionType(req);

    // Check rate limit
    const rateLimitResult = await rateLimitService.checkRateLimit({
      userId,
      ipAddress: ip,
      userAgent,
      actionType,
    });

    if (!rateLimitResult.allowed) {
      logger.warn("Rate limit exceeded", {
        userId,
        actionType,
        resetTime: rateLimitResult.resetTime,
      });

      return res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded for ${actionType}`,
        retryAfter: rateLimitResult.resetTime,
        remaining: 0,
      });
    }

    // Record successful attempt
    await rateLimitService.recordAttempt(
      {
        userId,
        ipAddress: ip,
        userAgent,
        actionType,
      },
      true
    );

    // Continue to next middleware
    next();
  } catch (error) {
    logger.error("Safeguards middleware error", { error });
    // Fail open - allow request if safeguards fail
    next();
  }
}

/**
 * Determine action type from request path
 */
function determineActionType(req: Request): string {
  const path = req.path.toLowerCase();
  const method = req.method;

  if (path.includes("/auth/login")) return "login_attempt";
  if (path.includes("/comments") && method === "POST") return "comment_post";
  if (path.includes("/bills") && method === "POST") return "bill_analysis_submit";
  if (path.includes("/vote") && method === "POST") return "vote_cast";
  if (path.includes("/flag")) return "flag_content";
  if (path.includes("/search")) return "api_search";

  return method === "GET" ? "api_read" : "api_write";
}
```

### 2.2 Wire Into Express App

**File**: `server/app.ts` (main application file)

```typescript
import { safeguardsMiddleware } from "@/server/middleware/safeguards-middleware";
import { initializeSafeguardJobs } from "@/server/features/safeguards/infrastructure/safeguard-jobs";

// ... existing middleware ...

// Add safeguards middleware EARLY (before route handlers)
// But AFTER authentication (so we know who the user is)
app.use(authenticateUser); // Your existing auth middleware
app.use(safeguardsMiddleware); // NEW: Safeguards checks

// ... rest of middleware and routes ...

/**
 * Initialize background jobs on app startup
 */
app.on("ready", async () => {
  try {
    await initializeSafeguardJobs();
    logger.info("Safeguard background jobs initialized");
  } catch (error) {
    logger.error("Failed to initialize safeguard jobs", { error });
    // Don't crash app, but log the error
  }
});

/**
 * Clean up jobs on shutdown
 */
process.on("SIGTERM", async () => {
  logger.info("Shutting down safeguard jobs");
  await stopAllSafeguardJobs();
  process.exit(0);
});
```

### 2.3 Add Content Moderation Hook

**File**: `server/features/content/handlers/create-comment.ts`

```typescript
import { moderationService } from "@/server/features/safeguards/application/moderation-service";

/**
 * Create comment with automatic moderation queue trigger
 */
export async function createCommentHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { content, billId } = req.body;
  const userId = req.user.id;

  // ... validation ...

  try {
    // Create comment in DB
    const comment = await db.insert(comments).values({
      user_id: userId,
      bill_id: billId,
      content,
    });

    // Check if should be queued for moderation
    const shouldQueue = await shouldQueueForModeration(content);

    if (shouldQueue) {
      // Add to moderation queue
      const queueResult = await moderationService.queueForModeration({
        contentType: "comment",
        contentId: comment.id,
        authorId: userId,
        billId,
        triggerType: "ai_detection", // or 'user_flag'
        triggerConfidence: 0.75,
      });

      logger.info("Comment queued for moderation", {
        commentId: comment.id,
        queueItemId: queueResult.queueItemId,
      });
    }

    return res.json({ success: true, commentId: comment.id });
  } catch (error) {
    logger.error("Failed to create comment", { error });
    return res.status(500).json({ error: "Failed to create comment" });
  }
}

/**
 * Simple AI check for moderation-worthy content
 */
async function shouldQueueForModeration(content: string): Promise<boolean> {
  // Check for obvious red flags
  const hateSpeechPatterns = /nigger|faggot|kike|spic/i; // Example - use real list
  if (hateSpeechPatterns.test(content)) return true;

  // Check for tribal slurs (Kenya-specific)
  const tribalSlurs = /nyeusi|mkamba|somali/i; // Placeholder
  if (tribalSlurs.test(content)) return true;

  // Could integrate with ML model here
  // const mlScore = await classifyContent(content);
  // return mlScore.harmfulness > 0.7;

  return false; // Safe content
}
```

### 2.4 Add CIB Detection Hook

**File**: `server/features/analytics/middleware/cib-tracking.ts`

```typescript
import { cibDetectionService } from "@/server/features/safeguards/application/cib-detection-service";

/**
 * Track user behavior for CIB detection
 * Should be called after each user action
 */
export async function trackUserBehavior(
  userId: string,
  actionType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // Collect behavior snapshot
    const userBehavior: UserBehaviorContext = {
      userId,
      typicalPostingHours: {}, // Would populate from analytics
      averageSessionDurationMinutes: 30,
      typicalDevices: ["firefox"],
      topicsOfInterest: ["healthcare"],
      averageCommentLength: 150,
      // ... more fields ...
    };

    // Record behavior profile (or update if exists)
    await cibDetectionService.recordUserBehavior(userBehavior);

    // Check for anomalies
    // This happens in background via jobs, not here
  } catch (error) {
    logger.warn("Failed to track user behavior", { userId, error });
    // Don't block user action for analytics failure
  }
}
```

### 2.5 Add Admin Endpoints

**File**: `server/routes/admin/safeguards.ts`

```typescript
import { Router } from "express";
import { manuallyTriggerJob, getSafeguardJobStatus } from "@/server/features/safeguards/infrastructure/safeguard-jobs";
import { requireAdminRole } from "@/server/middleware/auth";

const router = Router();

/**
 * GET /admin/safeguards/jobs - View job status
 */
router.get("/jobs", requireAdminRole, (req, res) => {
  const jobStatus = getSafeguardJobStatus();
  res.json(jobStatus);
});

/**
 * POST /admin/safeguards/jobs/:jobName - Manually trigger job
 */
router.post("/jobs/:jobName", requireAdminRole, async (req, res) => {
  const jobName = req.params.jobName;

  try {
    const result = await manuallyTriggerJob(jobName);
    if (!result) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      success: true,
      jobName: result.jobName,
      duration: result.duration,
      processed: result.itemsProcessed,
      failed: result.itemsFailed,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to trigger job" });
  }
});

export default router;
```

---

## PHASE 3: TESTING

### 3.1 Rate Limiting Tests

```typescript
// test/safeguards/rate-limiter.test.ts
import { rateLimitService } from "@/server/features/safeguards/application/rate-limit-service";

describe("Rate Limiting", () => {
  it("should block after threshold exceeded", async () => {
    const context = {
      userId: "test-user-1",
      actionType: "comment_post",
    };

    // First 10 requests succeed
    for (let i = 0; i < 10; i++) {
      const result = await rateLimitService.checkRateLimit(context);
      expect(result.allowed).toBe(true);
    }

    // 11th request blocked
    const result = await rateLimitService.checkRateLimit(context);
    expect(result.allowed).toBe(false);
    expect(result.blockedUntil).toBeDefined();
  });

  it("should allow verified users higher limits", async () => {
    // TODO: Implement with verified user context
  });

  it("should escalate block duration on repeat violations", async () => {
    // TODO: Test exponential backoff
  });
});
```

### 3.2 Moderation Workflow Tests

```typescript
// test/safeguards/moderation-service.test.ts
import { moderationService } from "@/server/features/safeguards/application/moderation-service";

describe("Moderation Service", () => {
  it("should create queue item from flags", async () => {
    const context: ModerationContext = {
      contentType: "comment",
      contentId: "comment-123",
      authorId: "user-456",
      triggerType: "flag_detection",
      triggerConfidence: 0.85,
    };

    const result = await moderationService.queueForModeration(context);
    expect(result.success).toBe(true);
    expect(result.queueItemId).toBeDefined();
  });

  it("should prevent duplicate queue items", async () => {
    // Both should succeed but return same ID
  });

  it("should escalate appeals to board", async () => {
    // TODO: Test appeal workflow
  });
});
```

### 3.3 Load Testing

```bash
# Use Apache Bench or similar
ab -n 1000 -c 100 https://localhost:3000/api/comments

# Should see rate limit responses at expected threshold
# Monitor database for proper rate_limits table growth
```

---

## PHASE 4: DEPLOYMENT

### 4.1 Pre-deployment Checklist

```bash
# 1. Run all tests
npm test

# 2. Type check
npm run type-check

# 3. Build
npm run build

# 4. Check for any console logs that should be removed
grep -r "console\\.log" server/features/safeguards/
# Should be: 0 results (use logger instead)

# 5. Verify schema migration is ready
ls -la migrations/ | grep safeguards

# 6. Check database backup
pg_dump production > backup.sql
```

### 4.2 Staging Deployment

```bash
# 1. Deploy to staging
git push staging main

# 2. Run migrations
npm run db:push -- --database staging

# 3. Initialize safeguard data
# - Create rate limit configs for all action types
# - Create moderation priority rules
# - Set up moderator accounts

# 4. Monitor logs
tail -f logs/staging.log | grep safeguard

# 5. Test from staging URL
curl -X POST https://staging.example.com/api/comments \
  -H "Authorization: Bearer token" \
  -d '{"content":"test"}'
```

### 4.3 Production Deployment

```bash
# 1. Create production backup
pg_dump production > backup-$(date +%Y%m%d).sql

# 2. Deploy to production
git push production main

# 3. Run migrations in transactions
psql << EOF
BEGIN;
  -- Migration SQL here
COMMIT;
EOF

# 4. Verify tables created
psql -c "SELECT COUNT(*) FROM rate_limits;"
# Should return: 0 (initially empty)

# 5. Start safeguard jobs
# (They initialize automatically on app startup)

# 6. Monitor for 1 hour
# - Check job execution logs
# - Verify rate limiting working
# - Monitor error rates
# - Check database query performance
```

### 4.4 Monitoring & Alerting

```typescript
// Create alerts for:
1. High rate limit violation rate (>100/hour)
2. Moderation SLA violations (>10% overdue)
3. CIB detection validation failures
4. Job execution timeout (any job > timeout value)
5. Database table growth rate (rapid growth = issue)
6. False positive rate in moderation (>10%)
```

---

## COMMON ISSUES & SOLUTIONS

### Issue 1: Rate Limiter Blocking All Requests
**Symptom**: All requests return 429 (Too Many Requests)
**Cause**: Likely missing valid rate_limit_config entries
**Solution**:
```sql
INSERT INTO rate_limit_config (action_type, default_limit, verified_user_limit, new_user_limit, ussd_limit, window_minutes)
VALUES
  ('comment_post', 10, 20, 5, 10, 60),
  ('login_attempt', 5, 10, 3, 5, 60),
  ('api_call', 100, 200, 50, 100, 60),
  -- ... etc for all 9 action types
```

### Issue 2: Jobs Not Executing
**Symptom**: No job log entries, jobs silently skipped
**Cause**: Cron schedule syntax error or jobs not initialized
**Solution**:
```typescript
// Check cron is valid with croner library
import { Cron } from "croner";
const test = Cron("0 0 * * *"); // Should not throw
test.stop();

// Verify initializeSafeguardJobs() called in app startup
```

### Issue 3: CIB Detection False Positives
**Symptom**: Legitimate users flagged as coordinated
**Cause**: Thresholds too aggressive (confidence < 0.7)
**Solution**:
```sql
-- Increase minimum confidence for auto-confirmation
UPDATE cib_detections SET confidence_score = 0.85 
WHERE confidence_score BETWEEN 0.70 AND 0.85;
```

### Issue 4: Moderation Queue Growing Uncontrolled
**Symptom**: Queue has 1000+ pending items, growing
**Cause**: Not enough moderators assigned, or auto-moderation disabled
**Solution**:
```sql
-- Check unassigned items
SELECT COUNT(*) FROM moderation_queue WHERE assigned_to IS NULL AND status = 'pending';

-- Auto-assign to available moderators
UPDATE moderation_queue SET assigned_to = 'moderator-id' 
WHERE assigned_to IS NULL LIMIT 50;
```

---

## FINAL VERIFICATION

After deployment, verify:

```bash
# 1. Database tables exist
psql -c "\dt" | grep -E "rate_limits|moderation|reputation|cib_detections"
# Should show: 14 tables

# 2. Rate limiter working
curl -X GET http://localhost:3000/api/test?user=test-user
# First 10: 200 OK
# 11th: 429 Too Many Requests

# 3. Jobs running
grep "Job scheduled" logs/app.log | wc -l
# Should show: 9 jobs scheduled

# 4. Services initialized
grep "Safeguard.*initialized" logs/app.log
# Should appear once on startup

# 5. Metrics reporting
curl http://localhost:3000/api/admin/safeguards/jobs
# Should return array of 9 jobs with status
```

---

## NEXT: IMPLEMENT SCHEMA REFINEMENTS

Once core system is stable, add 6 high-priority tables:
- See `SAFEGUARDS_SCHEMA_REFINEMENTS.md` for production-ready code

---

## SUPPORT

If you encounter issues:
1. Check logs: `grep -i error logs/app.log | tail -50`
2. Review this guide's "Common Issues" section
3. Check database: `SELECT COUNT(*) FROM rate_limits;`
4. Verify services are exported: `grep "export" server/features/safeguards/application/*.ts`

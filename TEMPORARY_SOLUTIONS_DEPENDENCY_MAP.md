# SimpleTool Temporary Solutions - DEPENDENCY CHART

**Critical Dependency Mapping** | March 21, 2026

---

## 🔴 BLOCKING ISSUE #1: missing-modules-fallback.ts

```
server/utils/missing-modules-fallback.ts (200 LOC - FALLBACK HUB)
│
├─ FALLBACK: apmService
│  ├─ Used by: server/infrastructure/observability
│  ├─ Types: startTransaction(), captureError(), setUserContext()
│  ├─ Impact: Monitoring breaks
│  └─ Status: ❌ NEEDS REAL IMPLEMENTATION
│
├─ FALLBACK: webSocketService
│  ├─ Used by: server/index.ts, server/routes/**
│  ├─ Types: emit(), broadcast()
│  ├─ Impact: Real-time updates break
│  └─ Status: ❌ NEEDS REAL IMPLEMENTATION
│
├─ FALLBACK: UnifiedExternalAPIManagementService
│  ├─ Used by: Features requiring external data
│  ├─ Types: getHealthStatus(), makeRequest(), getAnalytics()
│  ├─ Impact: External data integration breaks
│  └─ Status: ❌ NEEDS REAL IMPLEMENTATION
│
├─ FALLBACK: performanceMonitor & monitorOperation
│  ├─ Used by: Decorators on service methods
│  ├─ Types: startOperation(), endOperation()
│  ├─ Impact: Performance tracking breaks
│  └─ Status: ❌ NEEDS REAL IMPLEMENTATION
│
├─ FALLBACK: featureFlagsService
│  ├─ Used by: Feature toggle logic
│  ├─ Types: isEnabled(), getFlags()
│  ├─ Impact: Feature flags always disabled
│  └─ Status: ⚠️ PARTIAL (has mock in shared, needs backend)
│
├─ FALLBACK: validationService
│  ├─ Used by: Data validation logic
│  ├─ Types: validate()
│  ├─ Impact: Input validation is no-op
│  └─ Status: ❌ NEEDS REAL IMPLEMENTATION
│
├─ FALLBACK: enhancedSecurityService
│  ├─ Used by: Security middleware
│  ├─ Types: csrfProtection(), rateLimiting(), vulnerabilityScanning()
│  ├─ Impact: Security features disabled
│  └─ Status: ❌ NEEDS REAL IMPLEMENTATION
│
└─ FALLBACK: errorAdapter & errorHandler
   ├─ Used by: Global error handling
   ├─ Types: adaptError(), handleError()
   ├─ Impact: Error normalization breaks
   └─ Status: ❌ NEEDS REAL IMPLEMENTATION


REMOVAL BLOCKER:
────────────────
❌ Cannot remove missing-modules-fallback.ts until ALL services above are replaced
❌ Application will NOT COMPILE without this file
❌ Dependencies cascade through entire system

REPLACEMENT STRATEGY:
━━━━━━━━━━━━━━━━━━━━
1. Create real service for EACH item above
2. Import real service in missing-modules-fallback.ts
3. Update all imports to use real service instead
4. Only then remove fallback
```

---

## 🔴 BLOCKING ISSUE #2: Client Build Stubs

```
CLIENT BUILD CONFIGURATION
│
├─ vite.config.ts (line 215-216)
│  ├─ ALIAS: '@server-stub/database' → './src/lib/stubs/database-stub.ts'
│  └─ ALIAS: '@server-stub/middleware' → './src/lib/stubs/middleware-stub.ts'
│
├─ vite.production.config.ts (line 136-140)
│  ├─ ALIAS: '@server/infrastructure/database' → './src/lib/stubs/database-stub.ts'
│  └─ ALIAS: '@shared/core/middleware' → './src/lib/stubs/middleware-stub.ts'
│
└─ vitest.config.ts (line 78-82)
   ├─ ALIAS: '@server/infrastructure/database' → './src/lib/stubs/database-stub.ts'
   └─ ALIAS: '@shared/core/middleware' → './src/lib/stubs/middleware-stub.ts'


STUB: client/src/lib/stubs/database-stub.ts
├─ Purpose: Block imports of '@server/infrastructure/database' in client
├─ Current: Throws error "Database operations are not available in the client"
├─ Problem: Indicates there ARE client files importing server database code
├─ Files importing database module: ❓ UNKNOWN - MUST AUDIT
├─ Fix Required: 
│  ├─ Find all imports of '@server/infrastructure/database' in client
│  ├─ Replace with API calls instead of direct database access
│  ├─ Create client-safe API proxy layer if needed
│  └─ Only then remove stub
└─ Impact: ❌ Client build FAILS if stub removed without fixing imports


STUB: client/src/lib/stubs/middleware-stub.ts
├─ Purpose: Block imports of '@shared/core/middleware' in client
├─ Current: Throws error "Server middleware is not available in the client"
├─ Problem: Client code is importing server middleware module
├─ Files importing middleware: ❓ UNKNOWN - MUST AUDIT
├─ Fix Required:
│  ├─ Find all imports of '@shared/core/middleware' in client
│  ├─ Extract client interfaces/types to truly shared location
│  ├─ Create client-only middleware if needed
│  └─ Only then remove stub
└─ Impact: ❌ Client build FAILS if stub removed without fixing imports


REMOVAL BLOCKER:
────────────────
❌ Cannot remove stubs until ALL cross-boundary imports are fixed
❌ Stubs are SYMPTOMS of architectural issue (server code in client reach)
❌ Real issue: boundary violation, not stubs themselves

REMEDY STRATEGY:
━━━━━━━━━━━━━━━━
1. AUDIT: Find ALL imports in client code
2. MOVE: Relocate types to truly shared location  
3. REDESIGN: Create API-only communication pattern
4. TEST: Client builds without stubs
5. REMOVE: Delete stubs once boundaries are proven fixed
```

---

## 🟠 PRODUCTION MOCK IMPLEMENTATIONS

```
PRODUCTION CODE WITH "MOCK" IN NAME (Ambiguous Status)
│
├─ server/features/bills/infrastructure/data-sources/mock-bill-data-source.ts
│  ├─ Class: MockBillDataSource implements BillDataSource
│  ├─ Issue: "Mock" label but uses REAL database transactions
│  ├─ Methods: findById(), findAll(), count(), getStats()
│  ├─ Database: Uses real withTransaction() for ACTUAL database writes
│  ├─ Decision Needed: 
│  │  A) Rename to "BillDataSource" (it's the real implementation)
│  │  B) Create separate real implementation
│  │  C) Move to tests if this is test utility
│  └─ Impact: ❓ Bills feature depends on this
│
├─ server/features/community/infrastructure/mock/MockCommentRepository.ts
│  ├─ Class: MockCommentRepository implements ICommentRepository
│  ├─ Issue: "Mock" label but uses REAL database with SQL queries
│  ├─ Methods: create(), findById(), find(), update(), delete()
│  ├─ Database: Complex multi-condition SQL queries, transactions
│  ├─ Decision Needed:
│  │  A) Rename to "CommentRepository" (it's complete)
│  │  B) Move to tests and create real version
│  │  C) Document as "primary" implementation
│  └─ Impact: ❓ Comments feature completely broken without this
│
├─ server/features/community/infrastructure/mock/MockArgumentAnalysisService.ts
│  ├─ Class: MockArgumentAnalysisService implements IArgumentAnalysisService
│  ├─ Issue: Unclear if placeholder or complete implementation
│  ├─ Decision Needed:
│  │  A) Complete full analysis algorithms
│  │  B) Move to tests and create AI-powered version
│  │  C) Document as simplified/demo version
│  └─ Impact: ❓ Argument analysis feature impact unknown
│
└─ server/infrastructure/messaging/email/email-service.ts:279
   ├─ Class: MockEmailService extends BaseEmailService
   ├─ Issue: Fallback when SMTP unavailable
   ├─ Decision Needed:
   │  A) Keep for resilience (queue-based fallback)
   │  B) Remove and force real SMTP only
   │  C) Document as production fallback
   └─ Impact: Email notifications may be unavailable


NAMING AMBIGUITY PROBLEM:
████████████████████████
"Mock" prefix implies:
  - Temporary/incomplete ❌
  - For testing only ❌
  - Can be removed ❌

But these are:
  - Feature-complete implementations ✓
  - Live in production code ✓
  - Required for features to work ✓

RESOLUTION REQUIRED:
━━━━━━━━━━━━━━━━━━━━
Decision Matrix:
┌─────────────────────┬──────────────┬──────────────┬──────────────┐
│ Implementation      │ Is Complete? │ Location     │ Action       │
├─────────────────────┼──────────────┼──────────────┼──────────────┤
│ MockBillDataSource  │ YES          │ Production   │ Rename to    │
│                     │              │ code         │ real name    │
├─────────────────────┼──────────────┼──────────────┼──────────────┤
│ MockCommentRepo     │ YES          │ Production   │ Rename to    │
│                     │              │ code         │ real name    │
├─────────────────────┼──────────────┼──────────────┼──────────────┤
│ MockArgumentAnalys. │ UNCLEAR      │ Production   │ Complete or  │
│                     │              │ code         │ move to test │
├─────────────────────┼──────────────┼──────────────┼──────────────┤
│ MockEmailService    │ PARTIAL      │ Production   │ Keep as      │
│                     │ (fallback)    │ code         │ fallback or  │
│                     │              │              │ remove forced│
└─────────────────────┴──────────────┴──────────────┴──────────────┘
```

---

## 🟡 ADAPTER ECOSYSTEM (Likely OK to Keep)

```
ARCHITECTURE DECISION: Multiple Implementation Pattern
════════════════════════════════════════════════════════

CACHE ABSTRACTION LAYER:
┌─────────────────────────────────────────────────────┐
│ BaseCacheAdapter (Abstract Interface)                │
├─────┬─────────────┬──────────────┬─────────┬────────┤
│     │             │              │         │        │
v     v             v              v         v        v

MemoryAdapter    RedisAdapter    MultiTier  AICache  Browser
(Dev/Test)       (Prod Single)    (Prod     (AI      (Client
                                   Multi)   Ops)     Tests)

Environment Selection:
  Development → MemoryAdapter (fast, in-process)
  Production  → RedisAdapter (shared, scalable)
  Horizontal  → MultiTierAdapter (L1: Memory, L2: Redis)
  AI Systems  → AICache (specialized)


WEBSOCKET ABSTRACTION LAYER:
┌─────────────────────────────────────────────────────┐
│ WebSocketAdapter (Abstract Interface)               │
├──────────────────┬──────────────┬───────────────────┤
│                  │              │                   │
v                  v              v                   v

SocketIOAdapter   NativeWS      RedisAdapter      Mock
(Default)         (Low-level)   (Multi-instance)  (Tests)

Environment Selection:
  Development → SocketIOAdapter (rich features)
  Production  → SocketIOAdapter + RedisAdapter (scaling)
  Horizontal  → RedisAdapter only (stateless)


STATUS: ✓ LEGITIMATE ARCHITECTURE
────────────────────────────────
This is proper adapter pattern:
  ✓ Different implementations for different contexts
  ✓ Swappable per environment
  ✓ Enables scaling and optimization
  ✓ Not a temporary workaround

ACTION: Keep them, but:
  1. Document adapter selection strategy
  2. Ensure only correct one is active per environment
  3. Add adapter selection to configuration
  4. Remove any unused adapters
```

---

## 🟢 FEATURE FLAG ROUTING (Operational Infrastructure)

```
FEATURE FLAG SYSTEM:
════════════════════

Location: shared/constants/feature-flags.ts
           shared/core/types/feature-flags.ts
           server/utils/featureFlags.ts

Flags Defined:
  ADVANCED_SEARCH: true
  REAL_TIME_UPDATES: true
  ENHANCED_ANALYTICS: true
  ... (more)

Usage Pattern:
  
  shared/core/utils/examples.disabled/concurrency-migration-example.ts
  shows pattern for feature-flag-based routing:
  
  const featureFlagsService = new MockFeatureFlagsService();
  const router = getConcurrencyRouter(featureFlagsService);
  
  // Route between old/new implementations based on flag
  await featureFlagsService.enableGradualRollout(
    'utilities-concurrency-adapter', 
    50  // 50% rollout
  );
  
  const result = await router.withMutexLock(async () => {
    // Could use old or new mutex based on flag value
  });


DECISION NEEDED:
════════════════
1. Should this pattern be used elsewhere in codebase?
2. Is feature flag rollout logic implemented?
3. Should flags control adapter selection?

CURRENT STATUS:
════════════════
  ✓ Feature flag infrastructure exists
  ✓ Mock service for testing exists
  ✗ Real backend rollout logic unclear
  ✗ Pattern example is in "disabled" folder (not used actively)
```

---

## 📦 RIPPLE EFFECTS OF REMOVAL

```
If you remove missing-modules-fallback.ts WITHOUT replacing services:
╔════════════════════════════════════════════════════════════════════╗
║ COMPILATION BREAKS                                                 ║
║  - All imports from @shared/monitoring/apm fail                    ║
║  - All imports from @shared/websocket fail                         ║
║  - All imports from @shared/external-data fail                     ║
║  - All imports from @shared/validation fail                        ║
║                                                                    ║
║ RUNTIME BREAKS (if somehow passed compilation)                    ║
║  - APM monitoring unavailable                                      ║
║  - WebSocket real-time updates fail                               ║
║  - External API calls fail                                        ║
║  - Input validation skipped (SECURITY ISSUE)                      ║
║  - Security middleware disabled (SECURITY ISSUE)                  ║
║  - Error handling broken                                          ║
║  - Feature flags cannot be toggled                                ║
║                                                                    ║
║ STARTUP SEQUENCE                                                  ║
║  1. TypeScript compilation fails                                  ║
║  2. Build fails                                                   ║
║  3. Cannot even start development                                 ║
╚════════════════════════════════════════════════════════════════════╝


If you remove client stubs WITHOUT fixing imports:
╔════════════════════════════════════════════════════════════════════╗
║ CLIENT BUILD BREAKS                                                ║
║  - Alias '@server/infrastructure/database' no longer exists        ║
║  - Any client file importing database module fails                 ║
║  - Build process exits with module resolution errors              ║
║                                                                    ║
║ IMPACTS                                                            ║
║  - Cannot build client for development                            ║
║  - Cannot build client for production                             ║
║  - CI/CD pipeline broken                                          ║
║  - Deploy becomes impossible                                      ║
╚════════════════════════════════════════════════════════════════════╝


Safe removal order:
══════════════════
  1. Create real services (APM, WebSocket, etc.)
  2. Update missing-modules-fallback.ts to import real services
  3. Test entire application with new services
  4. Only THEN consider removing fallback file

  1. Audit all client imports of server modules
  2. Fix those imports (use API instead of direct access)
  3. Test client builds without stubs
  4. Only THEN remove stubs
```

---

## 🔧 IMPLEMENTATION CHECKLIST

### Before removing ANYTHING:

- [ ] **Missing Services** - Create real implementations
  - [ ] APM Service (monitoring)
  - [ ] WebSocket Service (real-time)
  - [ ] External API Manager
  - [ ] Validation Service
  - [ ] Email Service (or decide to keep fallback)
  - [ ] Security Service
  - [ ] Error Handler
  - [ ] Performance Monitor

- [ ] **Import Audit** - Find boundary violations
  - [ ] Search client code for `@server/` imports
  - [ ] Search client code for imports that should be API calls
  - [ ] Document each violation and its fix

- [ ] **Mock Clarification** - Rename or relocate
  - [ ] MockBillDataSource (rename or create real version)
  - [ ] MockCommentRepository (rename or create real version)
  - [ ] MockArgumentAnalysisService (complete or move)
  - [ ] MockEmailService (keep as fallback or remove)

- [ ] **Adapter Strategy** - Document selection
  - [ ] How are cache adapters selected?
  - [ ] How are WebSocket adapters selected?
  - [ ] What's the production configuration?
  - [ ] Can operators switch adapters without code change?

---

## 📞 DECISION GATE: Before Proceeding

**MUST BE ANSWERED:**

1. ⚠️ **APM/Monitoring**: 
   - Will we implement real monitoring OR use external service?
   
2. ⚠️ **WebSocket Architecture**:
   - Single instance or horizontally scaled?
   - Socket.IO + Redis or Native WebSocket?
   
3. ⚠️ **External Data API**:
   - Will this service be implemented OR removed?
   
4. ⚠️ **Validation**:
   - Schema-based (Zod/Joi) or custom logic?
   
5. ⚠️ **Email Fallback**:
   - Keep mock fallback for resilience OR force SMTP only?
   
6. ⚠️ **Import Boundaries**:
   - API-only communication OR allow selective server imports in client?
   
7. ⚠️ **Mock Implementations**:
   - Are these complete features OR incomplete stubs?

**Cannot proceed with removal until these are answered.**

---

**Generated**: March 21, 2026  
**For Details**: See [TEMPORARY_SOLUTIONS_AUDIT.md](./TEMPORARY_SOLUTIONS_AUDIT.md) and [TEMPORARY_SOLUTIONS_ACTION_PLAN.md](./TEMPORARY_SOLUTIONS_ACTION_PLAN.md)

# FSD Import Guide - Quick Reference

**Last Updated:** February 24, 2026

---

## Quick Decision Tree

```
Need to import something?
│
├─ Is it a tracking/monitoring mechanism?
│  └─ Import from infrastructure/
│
├─ Is it business logic or domain-specific?
│  └─ Import from features/
│
├─ Is it a UI component or utility?
│  └─ Import from lib/
│
└─ Is it app-level configuration?
   └─ Import from app/
```

---

## Common Imports by Use Case

### Analytics

```typescript
// ✅ CORRECT - Tracking engine
import { 
  ComprehensiveAnalyticsTracker,
  AnalyticsProvider 
} from '@client/infrastructure/analytics';

// ✅ CORRECT - Business logic & UI
import { 
  useAnalyticsDashboard,
  AnalyticsDashboard,
  analyticsService,
  analyticsApiService
} from '@client/features/analytics';

// ❌ WRONG - Don't import features from infrastructure
import { useAnalyticsDashboard } from '@client/infrastructure/analytics';
```

### Community

```typescript
// ✅ CORRECT - Community business logic
import { 
  useUnifiedCommunity,
  useComments,
  useThreads,
  communityApiService
} from '@client/features/community';

// ✅ CORRECT - WebSocket infrastructure
import { 
  UnifiedWebSocketManager,
  RealTimeHub 
} from '@client/infrastructure/realtime';

// ❌ WRONG - Don't use old community WebSocket manager
import { WebSocketManager } from '@client/infrastructure/community';
```

### Realtime/WebSocket

```typescript
// ✅ CORRECT - WebSocket infrastructure
import { 
  RealTimeHub,
  UnifiedWebSocketManager,
  realTimeHub
} from '@client/infrastructure/realtime';

// ✅ CORRECT - Optional optimization
import { realtimeOptimizer } from '@client/infrastructure/realtime';

// ❌ WRONG - Don't import from old features/realtime
import { realtimeOptimizer } from '@client/features/realtime';
```

### API Calls

```typescript
// ✅ CORRECT - Generic HTTP client
import { 
  globalApiClient,
  RetryHandler,
  ApiCacheManager 
} from '@client/infrastructure/api';

// ✅ CORRECT - Domain-specific APIs
import { analyticsApiService } from '@client/features/analytics';
import { billsApiService } from '@client/features/bills';
import { communityApiService } from '@client/features/community';
import { searchApiService } from '@client/features/search';

// ✅ CORRECT - Auth (cross-cutting)
import { authApiService } from '@client/infrastructure/api';

// ❌ WRONG - Don't import domain APIs from infrastructure
import { analyticsApiService } from '@client/infrastructure/api/analytics';
```

### Bills

```typescript
// ✅ CORRECT - Bills feature
import { 
  useBills,
  BillCard,
  BillList,
  billsApiService
} from '@client/features/bills';

// ❌ WRONG - Don't import bills API from infrastructure
import { billsApiService } from '@client/infrastructure/api/bills';
```

### Search

```typescript
// ✅ CORRECT - Search feature
import { 
  useSearch,
  searchService,
  searchApiService
} from '@client/features/search';

// ❌ WRONG - Don't import from infrastructure
import { searchApiService } from '@client/infrastructure/api/search';
```

### Users

```typescript
// ✅ CORRECT - User feature
import { 
  useUsers,
  useUserAPI,
  userApiService
} from '@client/features/users';

// ✅ CORRECT - Auth (cross-cutting)
import { 
  useAuth,
  authApiService 
} from '@client/infrastructure/auth';

// ❌ WRONG - Don't import user API from infrastructure
import { userApiService } from '@client/infrastructure/api/user';
```

---

## Layer-by-Layer Reference

### Infrastructure Layer

**What to import:**
- HTTP client, retry logic, caching
- WebSocket infrastructure
- Analytics tracking engine
- Auth services (cross-cutting)
- Error handling
- Performance monitoring
- Storage, cache, events

**Examples:**
```typescript
import { globalApiClient } from '@client/infrastructure/api';
import { RealTimeHub } from '@client/infrastructure/realtime';
import { ComprehensiveAnalyticsTracker } from '@client/infrastructure/analytics';
import { authApiService } from '@client/infrastructure/auth';
import { ErrorBoundary } from '@client/infrastructure/error';
import { PerformanceMonitor } from '@client/infrastructure/performance';
```

### Features Layer

**What to import:**
- Domain-specific APIs
- Business logic hooks
- Domain services
- Feature UI components
- Feature pages

**Examples:**
```typescript
import { analyticsApiService, useAnalyticsDashboard } from '@client/features/analytics';
import { billsApiService, useBills, BillCard } from '@client/features/bills';
import { communityApiService, useComments } from '@client/features/community';
import { searchApiService, useSearch } from '@client/features/search';
import { userApiService, useUsers } from '@client/features/users';
```

### Lib Layer

**What to import:**
- Design system components
- Shared UI components
- Pure utility functions
- Type definitions

**Examples:**
```typescript
import { Button, Card } from '@client/lib/design-system';
import { Navigation } from '@client/lib/ui';
import { formatDate, debounce } from '@client/lib/utils';
import type { Bill, User } from '@client/lib/types';
```

---

## Migration Patterns

### Pattern 1: Analytics

```typescript
// OLD (Before Feb 24, 2026)
import { 
  useAnalyticsDashboard,
  AnalyticsDashboard 
} from '@client/infrastructure/analytics';

// NEW (After Feb 24, 2026)
import { 
  ComprehensiveAnalyticsTracker,
  AnalyticsProvider 
} from '@client/infrastructure/analytics';

import { 
  useAnalyticsDashboard,
  AnalyticsDashboard 
} from '@client/features/analytics';
```

### Pattern 2: Community

```typescript
// OLD
import { 
  useUnifiedCommunity,
  WebSocketManager 
} from '@client/infrastructure/community';

// NEW
import { useUnifiedCommunity } from '@client/features/community';
import { UnifiedWebSocketManager } from '@client/infrastructure/realtime';
```

### Pattern 3: Domain APIs

```typescript
// OLD
import { analyticsApiService } from '@client/infrastructure/api/analytics';
import { billsApiService } from '@client/infrastructure/api/bills';
import { communityApiService } from '@client/infrastructure/api/community';

// NEW
import { analyticsApiService } from '@client/features/analytics';
import { billsApiService } from '@client/features/bills';
import { communityApiService } from '@client/features/community';
```

---

## Rules of Thumb

### ✅ DO

1. **Import infrastructure for technical primitives**
   - HTTP client, WebSocket manager, cache
   - Tracking engines, monitoring
   - Cross-cutting concerns (auth, error handling)

2. **Import features for business logic**
   - Domain-specific APIs
   - Business logic hooks
   - Feature UI components

3. **Import lib for shared utilities**
   - Design system
   - Pure utilities
   - Type definitions

### ❌ DON'T

1. **Don't import features from infrastructure**
   ```typescript
   // WRONG
   import { useAnalyticsDashboard } from '@client/infrastructure/analytics';
   ```

2. **Don't import infrastructure from features for domain logic**
   ```typescript
   // WRONG - billsApiService is domain logic
   import { billsApiService } from '@client/infrastructure/api/bills';
   ```

3. **Don't create circular dependencies**
   ```typescript
   // WRONG - Infrastructure importing from features
   // infrastructure/analytics/index.ts
   export { useAnalyticsDashboard } from '@client/features/analytics';
   ```

---

## Troubleshooting

### Error: "Cannot find module '@client/infrastructure/api/analytics'"

**Solution:** Import from features instead
```typescript
// Change this:
import { analyticsApiService } from '@client/infrastructure/api/analytics';

// To this:
import { analyticsApiService } from '@client/features/analytics';
```

### Error: "Cannot find module '@client/infrastructure/community/services/websocket-manager'"

**Solution:** Use realtime infrastructure
```typescript
// Change this:
import { WebSocketManager } from '@client/infrastructure/community';

// To this:
import { UnifiedWebSocketManager } from '@client/infrastructure/realtime';
```

### Error: "Module has no exported member 'useAnalyticsDashboard'"

**Solution:** Import from features, not infrastructure
```typescript
// Change this:
import { useAnalyticsDashboard } from '@client/infrastructure/analytics';

// To this:
import { useAnalyticsDashboard } from '@client/features/analytics';
```

---

## When in Doubt

Ask yourself:

1. **Is this a mechanism or business logic?**
   - Mechanism → infrastructure
   - Business logic → features

2. **Is this used by multiple features?**
   - Yes, and it's technical → infrastructure
   - Yes, and it's UI → lib
   - No → features

3. **Does this know about domain concepts?**
   - Yes (bills, users, community) → features
   - No (HTTP, WebSocket, cache) → infrastructure

---

## Getting Help

If you're unsure where to import from:

1. Check this guide first
2. Look at the module's index.ts for documentation
3. Check `docs/ARCHITECTURE_MIGRATION_2026-02-24.md` for details
4. Ask the team in #architecture channel

---

## Quick Reference Table

| What You Need | Import From | Example |
|--------------|-------------|---------|
| HTTP client | `infrastructure/api` | `globalApiClient` |
| WebSocket | `infrastructure/realtime` | `RealTimeHub` |
| Analytics tracking | `infrastructure/analytics` | `ComprehensiveAnalyticsTracker` |
| Analytics dashboard | `features/analytics` | `useAnalyticsDashboard` |
| Bills API | `features/bills` | `billsApiService` |
| Community hooks | `features/community` | `useComments` |
| Search | `features/search` | `useSearch` |
| Auth | `infrastructure/auth` | `useAuth` |
| Design system | `lib/design-system` | `Button` |
| Utilities | `lib/utils` | `formatDate` |
| Types | `lib/types` | `Bill`, `User` |

---

**Remember:** Infrastructure provides mechanisms, features provide business logic, lib provides shared utilities.

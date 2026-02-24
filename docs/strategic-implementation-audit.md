# Strategic Implementation Audit: client/src Architecture

**Date:** February 24, 2026  
**Methodology:** Code-level analysis of actual implementations  
**Focus:** Identifying most strategic implementations and optimal locations

---

## Executive Summary

After examining actual code implementations across `features/` and `infrastructure/`, this audit reveals:

1. **Infrastructure implementations are significantly more mature** - production-ready with comprehensive error handling, singleton patterns, and lifecycle management
2. **Feature implementations are business-logic focused** - higher-level abstractions built on infrastructure
3. **Current architecture violates FSD** - infrastructure depends on features (circular dependencies)
4. **Strategic consolidation needed** - not elimination, but proper layering

---

## 1. Realtime/WebSocket Analysis

### Infrastructure Implementation (`infrastructure/realtime/`)

**Quality Assessment: ⭐⭐⭐⭐⭐ (Production-Ready)**

#### `hub.ts` - RealTimeHub (1,000+ lines)
**Strategic Value: CRITICAL**

```typescript
export class RealTimeHub {
  private static instance: RealTimeHub | null = null;
  private wsManager: UnifiedWebSocketManager;
  private billTrackingService: BillTrackingService;
  private communityService: CommunityService;
  private notificationService: NotificationService;
  private eventEmitter = new EventEmitter();
  
  // Comprehensive state management
  private state: RealTimeHubState;
  private stateListeners: Set<(state: RealTimeHubState) => void>;
```

**Strengths:**
- Singleton pattern with proper lifecycle management
- Comprehensive state management with immutable updates
- Service orchestration (bills, community, notifications)
- Event-driven architecture with EventEmitter
- Subscription management with automatic re-subscription
- Connection quality monitoring
- Message routing and filtering
- Proper error handling and logging

**Architecture:**
- Acts as central coordinator for all realtime features
- Manages WebSocket connection lifecycle
- Provides unified API for all realtime operations
- Handles reconnection logic
- Maintains subscription state

#### `manager.ts` - UnifiedWebSocketManager (800+ lines)
**Strategic Value: CRITICAL**

```typescript
export class UnifiedWebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Subscription>();
  private reconnectAttempts = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
```

**Strengths:**
- Low-level WebSocket management
- Automatic reconnection with exponential backoff
- Heartbeat/ping-pong for connection health
- Message queuing for offline resilience
- Subscription filtering and routing
- Batch message processing
- Connection state machine
- Comprehensive error recovery

**Architecture:**
- Pure WebSocket infrastructure
- No business logic
- Reusable across any WebSocket use case
- Protocol-agnostic message handling

### Feature Implementation (`features/realtime/`)

**Quality Assessment: ⭐⭐ (Minimal/Incomplete)**

#### `model/realtime-optimizer.ts` (300 lines)
**Strategic Value: LOW (Optimization layer)**

```typescript
class RealtimeOptimizer {
  optimizeMessage(message: string, channel: string): string
  batchMessage(message: string, callback: (batch: string[]) => void): void
  private applyDeltaCompression(message: string, channel: string): string
  private compressMessage(message: string): string
```

**Strengths:**
- Message optimization (compression, batching, delta updates)
- Performance metrics tracking
- Bandwidth optimization

**Weaknesses:**
- Not integrated with infrastructure
- Placeholder compression implementation
- No actual usage in codebase
- Optimization premature without performance data

### Strategic Recommendation: REALTIME

**KEEP IN INFRASTRUCTURE** ✅

**Rationale:**
1. **Infrastructure is production-ready** - Hub and Manager are comprehensive, battle-tested implementations
2. **Feature layer adds minimal value** - Optimizer is speculative optimization without proven need
3. **Proper separation exists** - Infrastructure handles connection, features would handle business logic
4. **No business logic in infrastructure** - Pure technical concerns

**Action Plan:**
- **Keep:** `infrastructure/realtime/` (hub, manager, services, hooks)
- **Evaluate:** Move `realtime-optimizer.ts` to `infrastructure/realtime/optimization/` if needed
- **Remove:** `features/realtime/` module (or repurpose for business-specific realtime features)

**Nuanced Insight:**
The infrastructure implementation demonstrates proper separation of concerns:
- `UnifiedWebSocketManager` = transport layer (WebSocket protocol)
- `RealTimeHub` = application layer (service orchestration)
- `BillTrackingService`, `CommunityService` = domain services

This is CORRECT architecture. The feature layer should contain business logic that USES these services, not duplicate them.

---

## 2. Community Analysis

### Infrastructure Implementation (`infrastructure/community/`)

**Quality Assessment: ⭐⭐⭐ (Functional but Limited)**

#### `hooks/useUnifiedCommunity.ts` (100 lines)
**Strategic Value: MEDIUM**

```typescript
export function useUnifiedCommunity({
  billId,
  autoSubscribe = true,
  enableTypingIndicators = true,
  enableRealtime = true,
}: UseUnifiedCommunityOptions): UseUnifiedCommunityReturn {
  const discussion = useUnifiedDiscussion({ billId, ... });
  
  // Community stats, expert insights, trending topics
  const { data: stats } = useQuery({ ... });
  const { data: expertInsights = [] } = useQuery({ ... });
  const { data: trendingTopics = [] } = useQuery({ ... });
```

**Strengths:**
- Composition pattern (uses `useUnifiedDiscussion`)
- React Query integration
- Aggregates multiple data sources
- Social features (share, bookmark, follow)

**Weaknesses:**
- Thin wrapper around feature hooks
- Limited infrastructure concerns
- Mostly data fetching, not infrastructure

#### `services/websocket-manager.ts` (200 lines)
**Strategic Value: LOW (Duplicate)**

```typescript
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private eventHandlers = new Map<keyof WebSocketEvents, EventHandler[]>();
  private reconnectAttempts = 0;
```

**Critical Issue:** This is a DUPLICATE of `infrastructure/realtime/manager.ts` with less functionality.

### Feature Implementation (`features/community/`)

**Quality Assessment: ⭐⭐⭐⭐ (Comprehensive Business Logic)**

#### `hooks/useCommunity.ts` (600+ lines)
**Strategic Value: HIGH**

```typescript
export function useComments(bill_id?: string, filters?: CommentQueryOptions)
export function useThreads(billId?: number)
export function useThread(threadId: string | undefined)
export function useSocialSharing()
export function useCommunityStats()
export function useThreadParticipation(threadId: string)
export function useCommunitySearch(query: string, options?: {...})
export function usePopularTags(limit = 20)
export function useActivityFeed(filters?: CommunityFilters, ...)
export function useTrendingTopics(limit: number = 10)
export function useExpertInsights(billId?: number, filters?: CommunityFilters)
export function useCampaigns()
export function usePetitions()
export function useLocalImpact(location?: {...})
export function useRealtimeCommunity(_threadId?: string)
```

**Strengths:**
- Comprehensive business logic hooks
- React Query integration with proper cache management
- CRUD operations for comments, threads
- Social features (sharing, bookmarking)
- Community analytics (stats, trending, insights)
- Civic engagement (campaigns, petitions)
- Geographic filtering (local impact)
- Toast notifications for user feedback

**Architecture:**
- Uses `communityApiService` from infrastructure
- Proper separation: hooks handle state, API service handles HTTP
- Business logic: voting, moderation, participation
- User-facing features: campaigns, petitions, local impact

#### `services/backend.ts` (400+ lines)
**Strategic Value: HIGH**

```typescript
class CommunityBackendService {
  async initialize(): Promise<void>
  private setupWebSocketListeners(): void
  private handleCommunityUpdate(data: WebSocketBillUpdate): void
  private handleCommunityNotification(data: WebSocketNotification): void
  
  async getDiscussionThread(billId: number): Promise<DiscussionThreadMetadata>
  async getBillComments(billId: number, options: CommentQueryOptions = {}): Promise<Comment[]>
  async addComment(data: CommentFormData): Promise<Comment>
  subscribeToDiscussion(billId: number | string): void
  subscribeToCommunityUpdates(): void
}
```

**Strengths:**
- Integration layer between infrastructure and features
- WebSocket event handling for community-specific events
- Custom event dispatching to DOM
- Notification routing (expert verification, comment replies, campaigns)
- Uses `realTimeService` from infrastructure correctly
- Business logic: discussion threads, comment management

**Architecture:**
- Bridges infrastructure (realtime, API) with feature logic
- Handles community-specific WebSocket events
- Dispatches custom DOM events for UI updates
- Proper initialization and cleanup

### Strategic Recommendation: COMMUNITY

**SPLIT RESPONSIBILITIES** ⚖️

**Rationale:**
1. **Infrastructure community hooks are thin wrappers** - mostly composition, not infrastructure
2. **Feature community hooks contain rich business logic** - proper feature layer
3. **Infrastructure WebSocketManager is duplicate** - should use realtime infrastructure
4. **Backend service is integration layer** - belongs in features

**Action Plan:**

**KEEP IN INFRASTRUCTURE:**
- `infrastructure/community/types.ts` - shared type definitions
- Remove `infrastructure/community/services/websocket-manager.ts` (use `infrastructure/realtime/`)
- Remove `infrastructure/community/hooks/` (move to features)

**KEEP IN FEATURES:**
- `features/community/hooks/` - ALL hooks (business logic)
- `features/community/services/backend.ts` - integration service
- `features/community/ui/` - UI components
- `features/community/pages/` - page components

**Nuanced Insight:**
The confusion here stems from misunderstanding FSD layers:
- **Infrastructure** = technical primitives (WebSocket, HTTP, caching)
- **Features** = business domains (community, bills, users)

Community is a BUSINESS DOMAIN, not infrastructure. The fact that it uses WebSockets doesn't make it infrastructure. The `useUnifiedCommunity` hook is business logic that happens to use infrastructure services - it belongs in features.

**Correct Architecture:**
```
features/community/
  ├── hooks/
  │   ├── useCommunity.ts          ← Business logic
  │   ├── useUnifiedCommunity.ts   ← Composition of business logic
  │   └── useDiscussion.ts         ← Business logic
  ├── services/
  │   └── backend.ts               ← Integration with infrastructure
  └── ui/                          ← UI components

infrastructure/realtime/
  ├── hub.ts                       ← WebSocket orchestration
  ├── manager.ts                   ← WebSocket transport
  └── services/
      └── community.ts             ← Community-specific WebSocket protocol
```

---

## 3. Analytics Analysis

### Infrastructure Implementation (`infrastructure/analytics/`)

**Quality Assessment: ⭐⭐⭐⭐⭐ (Enterprise-Grade)**

#### `comprehensive-tracker.ts` (1,200+ lines)
**Strategic Value: CRITICAL**

```typescript
export class ComprehensiveAnalyticsTracker {
  private static instance: ComprehensiveAnalyticsTracker;
  private journeyTracker: typeof userJourneyTracker;
  private performanceMonitor: PerformanceMonitor | undefined;
  private errorAnalytics: ErrorAnalyticsService;
  
  private events: AnalyticsEvent[] = [];
  private pageMetrics: Map<string, PagePerformanceMetrics[]> = new Map();
  private userEngagement: Map<string, UserEngagementMetrics> = new Map();
  private personaConfigs: Record<string, PersonaAnalyticsConfig> = {...};
```

**Strengths:**
- Singleton pattern with comprehensive lifecycle
- Multi-persona analytics configuration
- Performance tracking integration (Web Vitals)
- Error tracking integration
- User journey tracking integration
- Event batching and flushing
- Automatic threshold monitoring
- Dashboard data aggregation
- Real-time metrics calculation
- Alert generation
- Export functionality

**Architecture:**
- Orchestrates multiple analytics subsystems
- Persona-aware tracking (public, citizen, expert, admin)
- Performance budget enforcement
- Automatic metric collection
- State management for analytics data

#### `service.ts` (300 lines)
**Strategic Value: MEDIUM**

```typescript
export interface AnalyticsService {
  trackEvent(event: AnalyticsEvent): Promise<TrackingResult>;
  trackPageView(pageView: PageViewData): Promise<TrackingResult>;
  trackUserAction(action: UserAction): Promise<TrackingResult>;
  trackPerformance(metrics: AnalyticsPerformanceMetrics): Promise<TrackingResult>;
  trackError(error: ErrorData): Promise<TrackingResult>;
  setUserProperties(properties: UserProperties): Promise<UpdateResult>;
  setSessionProperties(properties: SessionProperties): Promise<UpdateResult>;
}
```

**Strengths:**
- Clean interface definition
- Proper error handling
- Session management
- Timestamp validation
- Logging integration

**Weaknesses:**
- Simpler than ComprehensiveAnalyticsTracker
- Overlapping functionality
- Not integrated with comprehensive tracker

#### `AnalyticsProvider.tsx` (200 lines)
**Strategic Value: HIGH**

```typescript
export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  enabled = true,
  config = {},
}) => {
  const [tracker, setTracker] = useState<ComprehensiveAnalyticsTracker | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
```

**Strengths:**
- React Context integration
- Lifecycle management
- Configuration support
- HOC for component tracking
- Status component for debugging
- Proper cleanup

### Feature Implementation (`features/analytics/`)

**Quality Assessment: ⭐⭐⭐⭐ (Business Logic Layer)**

#### `services/analytics.ts` (800+ lines)
**Strategic Value: HIGH**

```typescript
export class AnalyticsService {
  private cache = new Map<string, CacheEntry<unknown>>();
  
  async getDashboard(filters?: AnalyticsFilters): Promise<ExtendedDashboardData>
  async getSummary(filters?: AnalyticsFilters): Promise<ExtendedAnalyticsSummary>
  async getBillAnalytics(billId: string, filters?: AnalyticsFilters): Promise<ExtendedBillAnalytics>
  async getEngagementReport(billId: string, filters?: AnalyticsFilters): Promise<ExtendedEngagementReport>
  async getConflictReport(billId: string): Promise<ExtendedConflictReport>
  async getUserActivity(userId?: string, filters?: AnalyticsFilters): Promise<AnalyticsResponse<ExtendedUserActivity[]>>
  async getTopBills(limit = 10, filters?: AnalyticsFilters): Promise<BillAnalytics[]>
  async getAlerts(acknowledged = false): Promise<ExtendedAnalyticsAlert[]>
  async getTrendingTopics(limit = 20): Promise<ExtendedTopic[]>
  async getStakeholderAnalysis(billId?: string): Promise<ExtendedStakeholder[]>
  async exportAnalytics(filters?: AnalyticsFilters, format: 'csv' | 'json' = 'json'): Promise<unknown>
  async getRealtimeMetrics(): Promise<ExtendedRealtimeMetrics>
```

**Strengths:**
- Comprehensive business logic layer
- Caching with TTL
- Data transformation and enrichment
- Conflict analysis and recommendations
- Engagement scoring algorithms
- Trend analysis
- Risk assessment
- Alert prioritization
- Stakeholder impact calculation
- Export formatting (CSV/JSON)
- Type normalization

**Architecture:**
- Uses `analyticsApiService` from infrastructure
- Adds business logic on top of raw API data
- Caching layer for performance
- Data enrichment and scoring
- Proper separation from infrastructure

#### `model/user-journey-tracker.ts` (400+ lines)
**Strategic Value: HIGH**

```typescript
class UserJourneyTracker {
  private currentJourney: UserJourney | null = null;
  private journeyHistory: UserJourney[] = [];
  
  startJourney(userId?: string, userRole: UserRole = 'guest'): string
  trackPageVisit(pageId: string, section: NavigationSection, referrer?: string): void
  trackInteraction(interactionType: string): void
  endJourney(goalAchieved: boolean = false): UserJourney | null
  getJourneyAnalytics(timeRange?: { start: Date; end: Date }): JourneyAnalytics
  private calculatePopularPaths(journeys: UserJourney[]): PathAnalytics[]
  private calculateDropOffPoints(journeys: UserJourney[]): DropOffPoint[]
  private calculateConversionFunnels(journeys: UserJourney[]): ConversionFunnel[]
}
```

**Strengths:**
- User journey tracking
- Path analysis
- Drop-off point identification
- Conversion funnel calculation
- Bounce rate tracking
- Export functionality
- Session management

### Strategic Recommendation: ANALYTICS

**KEEP BOTH LAYERS** ✅✅

**Rationale:**
1. **Infrastructure provides tracking engine** - event collection, performance monitoring, error tracking
2. **Features provide business intelligence** - dashboards, reports, analysis, scoring
3. **Proper separation exists** - infrastructure tracks, features analyze
4. **No circular dependencies** - features use infrastructure correctly
5. **Both are production-ready** - high quality implementations

**Action Plan:**

**INFRASTRUCTURE LAYER (Keep):**
- `comprehensive-tracker.ts` - Core tracking engine
- `AnalyticsProvider.tsx` - React integration
- `service.ts` - Basic tracking interface
- Integration with performance, error, journey tracking

**FEATURE LAYER (Keep):**
- `services/analytics.ts` - Business logic and data enrichment
- `model/user-journey-tracker.ts` - Journey analysis
- `hooks/` - React hooks for analytics features
- `ui/` - Analytics dashboards and visualizations

**Fix Circular Dependency:**
Currently, `infrastructure/analytics/index.ts` imports from `features/analytics/`:

```typescript
// WRONG - Infrastructure importing from features
export { useAnalyticsDashboard } from '@client/features/analytics/hooks/useAnalytics';
export { default as AnalyticsDashboard } from '@client/features/analytics/ui/dashboard/AnalyticsDashboard';
```

**Solution:**
Remove these re-exports from infrastructure. Features should import directly:

```typescript
// CORRECT - Features import from infrastructure
import { ComprehensiveAnalyticsTracker } from '@client/infrastructure/analytics';

// CORRECT - App imports from features
import { AnalyticsDashboard } from '@client/features/analytics';
```

**Nuanced Insight:**
This is the BEST example of proper FSD layering in the codebase:
- **Infrastructure** = tracking mechanism (how to collect data)
- **Features** = business intelligence (what the data means)

The infrastructure tracker collects raw events, performance metrics, and user actions. The feature service transforms this into business insights: engagement scores, risk assessments, trend analysis, conflict detection.

This is EXACTLY how FSD should work. The only issue is the circular dependency in the index file.

---

## 4. API Layer Analysis

### Current State

**Infrastructure (`infrastructure/api/`):**
- `client.ts` - HTTP client configuration
- `interceptors.ts` - Request/response interceptors
- `retry.ts` - Retry logic
- `circuit-breaker/` - Circuit breaker pattern
- Domain-specific files: `bills.ts`, `community.ts`, `analytics.ts`, `auth.ts`, `user.ts`

**Issue:** Domain-specific API logic in infrastructure layer.

### Strategic Recommendation: API

**SPLIT BY DOMAIN** ⚖️

**Rationale:**
1. **Generic HTTP infrastructure belongs in infrastructure** - client, interceptors, retry, circuit breaker
2. **Domain-specific API logic belongs in features** - bills API, community API, analytics API
3. **Auth is cross-cutting** - can stay in infrastructure as it's used by all features

**Action Plan:**

**KEEP IN INFRASTRUCTURE:**
- `client.ts` - Generic HTTP client
- `interceptors.ts` - Generic interceptors
- `retry.ts` - Retry logic
- `circuit-breaker/` - Circuit breaker
- `auth.ts` - Authentication API (cross-cutting)
- `config.ts` - API configuration

**MOVE TO FEATURES:**
- `bills.ts` → `features/bills/services/api.ts`
- `community.ts` → `features/community/services/api.ts`
- `analytics.ts` → `features/analytics/services/api.ts`
- `user.ts` → `features/users/services/api.ts`
- `search.ts` → `features/search/services/api.ts`

**Nuanced Insight:**
The API layer confusion stems from conflating HTTP infrastructure with domain logic. The HTTP client is infrastructure. The knowledge of what endpoints exist for bills is domain knowledge that belongs in the bills feature.

---

## 5. Navigation Analysis

### Current State

**Infrastructure (`infrastructure/navigation/`):**
- 20+ files including hooks, context, analytics, breadcrumbs, route validation
- Comprehensive navigation system

**Features (`features/navigation/`):**
- Only `model/index.ts` (empty or minimal)

### Strategic Recommendation: NAVIGATION

**KEEP IN INFRASTRUCTURE** ✅

**Rationale:**
1. **Navigation is cross-cutting infrastructure** - used by all features
2. **No business logic** - pure routing and navigation concerns
3. **Feature module is empty** - no value

**Action Plan:**
- Keep all navigation in `infrastructure/navigation/`
- Remove `features/navigation/` module

---

## 6. Search Analysis

### Current State

**Infrastructure (`infrastructure/search/`):**
- `search-strategy-selector.ts`
- `UnifiedSearchInterface.tsx`

**Features (`features/search/`):**
- `hooks/` - useSearch, useIntelligentSearch, useStreamingSearch
- `services/` - intelligent-search, streaming-search, search-api
- `ui/` - Search UI components
- `pages/` - Search pages

### Strategic Recommendation: SEARCH

**MOVE TO FEATURES** ➡️

**Rationale:**
1. **Search is a business feature** - not infrastructure
2. **Infrastructure components are minimal** - can move to features
3. **Most logic already in features** - proper location

**Action Plan:**
- Move `infrastructure/search/` contents to `features/search/infrastructure/`
- Keep all search logic in `features/search/`

---

## 7. Security Analysis

### Current State

**Infrastructure (`infrastructure/security/`):**
- Comprehensive security infrastructure
- CSP, CSRF, rate limiting, input sanitization
- Security monitoring

**Features (`features/security/`):**
- `hooks/useSecurity.ts`
- `pages/SecurityDemoPage.tsx`

### Strategic Recommendation: SECURITY

**KEEP SPLIT** ✅

**Rationale:**
1. **Infrastructure handles security mechanisms** - correct
2. **Features handle security UI/demos** - correct
3. **Proper separation** - no issues

---

## 8. Lib Layer Analysis

### Current Issues

**Lib contains:**
- UI components
- Design system
- Utilities
- Types
- Hooks
- Services
- Context
- Testing
- Demo data
- Examples
- Pages

**Problem:** Lib has become a catch-all.

### Strategic Recommendation: LIB

**REFACTOR TO FOCUSED PURPOSE** 🔧

**Keep in Lib:**
- `lib/design-system/` - Design tokens, primitives
- `lib/ui/` - Shared UI components (not feature-specific)
- `lib/utils/` - Pure utility functions
- `lib/types/` - Shared type definitions
- `lib/testing/` - Test utilities

**Move Out:**
- `lib/services/` → `infrastructure/` or `features/`
- `lib/pages/` → `features/` or `app/`
- `lib/context/` → `app/providers/` or `features/`
- `lib/demo/` → `features/` or remove
- `lib/examples/` → documentation or remove

---

## 9. Summary of Strategic Locations

### Infrastructure Layer (Technical Primitives)

**KEEP:**
- ✅ Realtime (hub, manager, WebSocket infrastructure)
- ✅ Analytics tracking engine (comprehensive-tracker, provider)
- ✅ API client (HTTP infrastructure, not domain APIs)
- ✅ Auth (cross-cutting concern)
- ✅ Error handling
- ✅ Performance monitoring
- ✅ Navigation
- ✅ Security mechanisms
- ✅ Storage
- ✅ Cache
- ✅ Events

**REMOVE/MOVE:**
- ❌ Community (move to features)
- ❌ Domain-specific APIs (move to features)
- ❌ Search (move to features)

### Feature Layer (Business Domains)

**KEEP:**
- ✅ Community (all hooks, services, UI)
- ✅ Analytics business logic (dashboards, reports, scoring)
- ✅ Bills
- ✅ Users
- ✅ Search
- ✅ All domain-specific features

**ADD:**
- ➕ Domain-specific API services (from infrastructure)
- ➕ Community hooks (from infrastructure)
- ➕ Search infrastructure (from infrastructure)

### Lib Layer (Shared UI & Utilities)

**KEEP:**
- ✅ Design system
- ✅ Shared UI components
- ✅ Utilities
- ✅ Types
- ✅ Testing utilities

**REMOVE:**
- ❌ Services (move to infrastructure/features)
- ❌ Pages (move to features/app)
- ❌ Context (move to app/features)

---

## 10. Architectural Principles

### Correct FSD Layering

```
app/
  └── Imports from: features, infrastructure, lib

features/<domain>/
  ├── model/      ← Business logic
  ├── services/   ← Domain API, integration with infrastructure
  ├── hooks/      ← React hooks for domain logic
  ├── ui/         ← Domain-specific UI
  └── pages/      ← Domain pages
  └── Imports from: infrastructure, lib

infrastructure/<concern>/
  ├── Core technical primitives
  ├── No business logic
  ├── Reusable across features
  └── Imports from: lib only

lib/
  ├── Pure utilities
  ├── Design system
  ├── Shared UI
  └── No imports from other layers
```

### Dependency Rules

1. **App** → features, infrastructure, lib
2. **Features** → infrastructure, lib (NOT other features)
3. **Infrastructure** → lib only (NOT features)
4. **Lib** → nothing (self-contained)

### Decision Framework

**Is it Infrastructure?**
- ✅ Used by multiple features
- ✅ No business logic
- ✅ Technical concern (HTTP, WebSocket, caching, auth)
- ✅ Protocol or mechanism

**Is it a Feature?**
- ✅ Business domain (bills, community, users)
- ✅ Domain-specific logic
- ✅ User-facing functionality
- ✅ Uses infrastructure services

**Is it Lib?**
- ✅ Pure utility
- ✅ Design system component
- ✅ Shared type
- ✅ No dependencies on app logic

---

## 11. Migration Priority

### Phase 1: Fix Circular Dependencies (Critical)
1. Remove infrastructure → features imports in `infrastructure/analytics/index.ts`
2. Remove infrastructure → features imports in `infrastructure/api/index.ts`
3. Update import paths in consuming code

### Phase 2: Consolidate Duplicates (High Priority)
1. Remove `infrastructure/community/services/websocket-manager.ts` (use realtime)
2. Consolidate analytics services (keep both layers, fix imports)
3. Remove empty feature modules (navigation, realtime if empty)

### Phase 3: Move Domain Logic (Medium Priority)
1. Move domain APIs from infrastructure to features
2. Move community hooks from infrastructure to features
3. Move search from infrastructure to features

### Phase 4: Clean Lib Layer (Low Priority)
1. Move services out of lib
2. Move pages out of lib
3. Move context out of lib
4. Consolidate context/contexts directories

---

## 12. Conclusion

### Key Findings

1. **Infrastructure implementations are superior** - more mature, comprehensive, production-ready
2. **Feature implementations contain business logic** - proper separation when it exists
3. **Main issue is circular dependencies** - infrastructure importing from features
4. **Secondary issue is misplaced code** - domain logic in infrastructure, infrastructure in features

### Strategic Insight

The codebase doesn't need massive refactoring. It needs:
1. **Dependency direction fixes** - remove circular imports
2. **Clear boundaries** - move domain logic to features, keep infrastructure pure
3. **Consolidation** - remove duplicates, use infrastructure services

### Success Criteria

After refactoring:
- ✅ No circular dependencies
- ✅ Infrastructure has no business logic
- ✅ Features use infrastructure services
- ✅ Lib is pure utilities and UI
- ✅ Clear dependency flow: app → features → infrastructure → lib

### Estimated Effort

- Phase 1 (Critical): 2-3 days
- Phase 2 (High): 1 week
- Phase 3 (Medium): 2 weeks
- Phase 4 (Low): 1 week

**Total: 4-5 weeks for complete migration**

---

## Appendix: Code Quality Metrics

### Infrastructure Realtime
- Lines of Code: 2,000+
- Test Coverage: Unknown
- Complexity: High (appropriate for infrastructure)
- Maturity: Production-ready
- Documentation: Good

### Infrastructure Analytics
- Lines of Code: 1,500+
- Test Coverage: Unknown
- Complexity: Very High (appropriate for analytics)
- Maturity: Production-ready
- Documentation: Excellent

### Features Community
- Lines of Code: 1,000+
- Test Coverage: Unknown
- Complexity: Medium (appropriate for business logic)
- Maturity: Production-ready
- Documentation: Good

### Features Analytics
- Lines of Code: 1,200+
- Test Coverage: Unknown
- Complexity: High (appropriate for business intelligence)
- Maturity: Production-ready
- Documentation: Good

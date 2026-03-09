# ADR 012: Analysis Feature Client Implementation

## Status
Accepted

## Context

The server-side comprehensive bill analysis feature was implemented with four main endpoints providing constitutional analysis, stakeholder impact assessment, transparency scoring, and public interest evaluation. However, the client-side implementation was incomplete, with only basic conflict detection functionality and no integration with the comprehensive analysis API.

This created a gap between server capabilities and client functionality, preventing users from accessing the full analysis features through the UI.

## Decision

We will implement a complete client-side analysis feature that achieves 100% congruence with the server API, following these principles:

### 1. Shared Type System

Create shared types in `shared/types/features/analysis.ts` that are used by both client and server:

- `ComprehensiveBillAnalysis` - Main analysis result
- `ConstitutionalAnalysisResult` - Constitutional review
- `StakeholderAnalysisResult` - Stakeholder impact
- `ConflictSummary` - Conflict of interest
- `TransparencyScoreResult` - Transparency scoring
- `PublicInterestScoreResult` - Public interest assessment

### 2. API Service Layer

Implement `AnalysisApiService` following the same pattern as `BillsApiService`:

```typescript
class AnalysisApiService {
  getComprehensiveAnalysis(params): Promise<ComprehensiveBillAnalysis>
  triggerAnalysis(params): Promise<ComprehensiveBillAnalysis>
  getAnalysisHistory(params): Promise<AnalysisHistoryEntry[]>
  checkHealth(): Promise<HealthStatus>
}
```

### 3. React Query Integration

Create three specialized hooks using React Query:

- `useComprehensiveAnalysis` - Fetch analysis with caching
- `useAnalysisHistory` - Fetch historical data with pagination
- `useTriggerAnalysis` - Trigger new analysis (admin only)

### 4. UI Components

Create `ComprehensiveAnalysisPanel` component to display:

- Overall confidence score
- Constitutional analysis with concerns and precedents
- Conflict of interest summary with financial exposure
- Stakeholder impact (economic and social)
- Transparency score breakdown
- Public interest assessment
- Recommended actions

### 5. Error Handling

Use the consolidated error system (`ErrorFactory`, `errorHandler`) for consistent error handling across all analysis operations.

### 6. Caching Strategy

Implement intelligent caching:

- Comprehensive analysis: 5-minute stale time
- Analysis history: 10-minute stale time
- Force reanalysis: Bypass cache completely
- Mutations: Automatic cache invalidation

## Consequences

### Positive

1. **100% Client-Server Congruence**: Complete feature parity between client and server
2. **Type Safety**: Shared types ensure compile-time safety across the stack
3. **Performance**: React Query caching reduces unnecessary API calls
4. **User Experience**: Rich, interactive analysis display with real-time data
5. **Maintainability**: Clear separation of concerns (service, hooks, UI)
6. **Extensibility**: Easy to add new analysis types or visualizations
7. **Consistency**: Follows established patterns from bills feature
8. **Error Resilience**: Consolidated error handling with automatic retries

### Negative

1. **Bundle Size**: Additional code increases client bundle size (~15KB)
2. **Complexity**: More moving parts to understand and maintain
3. **API Dependency**: Client now tightly coupled to analysis API structure
4. **Cache Management**: Need to carefully manage cache invalidation

### Neutral

1. **Learning Curve**: Developers need to understand React Query patterns
2. **Testing Requirements**: More comprehensive testing needed for hooks and services
3. **Documentation Burden**: Need to maintain documentation for multiple layers

## Implementation Details

### File Structure

```
shared/types/features/
└── analysis.ts                            # Shared types

client/src/features/analysis/
├── model/
│   ├── hooks/
│   │   ├── useComprehensiveAnalysis.ts
│   │   ├── useAnalysisHistory.ts
│   │   ├── useTriggerAnalysis.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── analysis-api.service.ts
│   │   └── index.ts
│   └── index.ts
└── index.ts

client/src/features/bills/ui/analysis/
└── ComprehensiveAnalysisPanel.tsx
```

### API Endpoints Covered

1. `GET /api/analysis/bills/:bill_id/comprehensive` ✅
2. `POST /api/analysis/bills/:bill_id/comprehensive/run` ✅
3. `GET /api/analysis/bills/:bill_id/history` ✅
4. `GET /api/analysis/health` ✅

### Integration Points

1. **Bills Feature**: Can use analysis hooks in bill detail pages
2. **Conflict Detection**: Complements existing conflict visualization
3. **Admin Panel**: Trigger analysis functionality for admins
4. **Notifications**: Can notify users when analysis completes

## Alternatives Considered

### Alternative 1: Direct API Calls

Use `fetch` or `axios` directly in components without service layer.

**Rejected because:**
- Violates separation of concerns
- No centralized error handling
- Difficult to test
- No caching strategy

### Alternative 2: Redux State Management

Store analysis data in Redux instead of React Query.

**Rejected because:**
- Overkill for server state management
- React Query provides better caching and invalidation
- More boilerplate code required
- Harder to implement optimistic updates

### Alternative 3: GraphQL

Use GraphQL instead of REST for analysis endpoints.

**Rejected because:**
- Requires significant server refactoring
- Adds complexity without clear benefits
- REST API already well-designed
- Team more familiar with REST patterns

### Alternative 4: Monolithic Hook

Create single `useAnalysis` hook that handles all analysis operations.

**Rejected because:**
- Violates single responsibility principle
- Harder to optimize caching per operation
- Less flexible for different use cases
- Larger bundle size for simple operations

## Validation

### Type Safety

All files pass TypeScript diagnostics with zero errors:

```bash
✓ shared/types/features/analysis.ts
✓ client/src/features/analysis/model/services/analysis-api.service.ts
✓ client/src/features/analysis/model/hooks/useComprehensiveAnalysis.ts
✓ client/src/features/analysis/model/hooks/useAnalysisHistory.ts
✓ client/src/features/analysis/model/hooks/useTriggerAnalysis.ts
✓ client/src/features/bills/ui/analysis/ComprehensiveAnalysisPanel.tsx
```

### API Congruence

Client implementation matches server API 1:1:

| Server Endpoint | Client Method | Status |
|----------------|---------------|--------|
| GET /bills/:id/comprehensive | getComprehensiveAnalysis() | ✅ |
| POST /bills/:id/comprehensive/run | triggerAnalysis() | ✅ |
| GET /bills/:id/history | getAnalysisHistory() | ✅ |
| GET /health | checkHealth() | ✅ |

### Pattern Consistency

Follows established patterns from bills feature:

- ✅ Service class with singleton export
- ✅ React Query hooks with proper configuration
- ✅ Error handling with ErrorFactory
- ✅ Logging with logger utility
- ✅ Type imports from shared types
- ✅ Component structure with Card components

## Related Decisions

- [ADR 010: Natural Branching Architecture](./010-natural-branching-architecture.md)
- [ADR 011: Bills Feature Server Implementation](./011-bills-feature-server-implementation.md)

## References

- [Analysis Feature Client Implementation Guide](../features/ANALYSIS_FEATURE_CLIENT_IMPLEMENTATION.md)
- [Server Analysis Routes](../../server/features/analysis/analysis.routes.ts)
- [Server Analysis Types](../../server/features/analysis/types/index.ts)
- [Bills Feature Complete](../DCS/BILLS_FEATURE_COMPLETE.md)

## Notes

This implementation completes the analysis feature stack, providing end-to-end functionality from database to UI. The natural branching architecture pattern is evident in how data flows through the system:

1. **Database Layer**: Analysis results stored in database
2. **Service Layer**: Business logic orchestrates multiple analyses
3. **API Layer**: REST endpoints expose analysis functionality
4. **Client Service**: API client handles HTTP communication
5. **Hooks Layer**: React Query manages state and caching
6. **UI Layer**: Components display analysis results

Each layer has a clear responsibility and communicates through well-defined interfaces, following the same efficient branching pattern found in natural systems like trees and lungs.

---

**Date**: 2026-03-09
**Author**: Kiro AI Assistant
**Reviewers**: Development Team

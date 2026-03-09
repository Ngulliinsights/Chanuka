# Analysis Feature Client Implementation

## Overview

Complete client-side implementation of the comprehensive bill analysis feature, achieving 100% congruence with the server-side analysis API. This implementation provides React hooks, API services, and UI components for displaying constitutional analysis, stakeholder impact, transparency scores, and public interest assessments.

## Architecture

### Layered Structure

```
client/src/features/analysis/
├── model/
│   ├── hooks/
│   │   ├── useComprehensiveAnalysis.ts    # Fetch comprehensive analysis
│   │   ├── useAnalysisHistory.ts          # Fetch analysis history
│   │   ├── useTriggerAnalysis.ts          # Trigger new analysis (admin)
│   │   └── index.ts
│   ├── services/
│   │   ├── analysis-api.service.ts        # API client for analysis endpoints
│   │   ├── conflict-detection.ts          # Existing conflict detection
│   │   └── index.ts
│   └── index.ts
├── ui/
│   └── (existing UI components)
├── types/
│   └── index.ts                           # Feature-specific types
└── index.ts

shared/types/features/
└── analysis.ts                            # Shared types (client + server)

client/src/features/bills/ui/analysis/
└── ComprehensiveAnalysisPanel.tsx         # Main display component
```

## Components

### 1. Shared Types (`shared/types/features/analysis.ts`)

Comprehensive type definitions shared between client and server:

- `ComprehensiveBillAnalysis` - Main analysis result type
- `ConstitutionalAnalysisResult` - Constitutional review data
- `StakeholderAnalysisResult` - Stakeholder impact data
- `ConflictSummary` - Conflict of interest summary
- `TransparencyScoreResult` - Transparency scoring
- `PublicInterestScoreResult` - Public interest assessment
- API request/response types

### 2. API Service (`analysis-api.service.ts`)

Client-side service for interacting with analysis endpoints:

```typescript
class AnalysisApiService {
  // Get comprehensive analysis for a bill
  async getComprehensiveAnalysis(params: GetComprehensiveAnalysisParams): Promise<ComprehensiveBillAnalysis>
  
  // Trigger new analysis run (admin only)
  async triggerAnalysis(params: TriggerAnalysisParams): Promise<ComprehensiveBillAnalysis>
  
  // Get analysis history
  async getAnalysisHistory(params: GetAnalysisHistoryParams): Promise<AnalysisHistoryEntry[]>
  
  // Health check
  async checkHealth(): Promise<{ status: string; timestamp: string }>
}
```

### 3. React Hooks

#### `useComprehensiveAnalysis`

Fetch comprehensive analysis for a bill with React Query integration:

```typescript
const { data, isLoading, error } = useComprehensiveAnalysis({
  billId: 'bill-123',
  force: false,  // Force reanalysis
  enabled: true  // Enable/disable query
});
```

Features:
- Automatic caching (5 minutes)
- Retry logic (2 retries)
- Garbage collection (30 minutes)
- Force reanalysis option

#### `useAnalysisHistory`

Fetch historical analysis data with pagination:

```typescript
const { data, isLoading } = useAnalysisHistory({
  bill_id: 'bill-123',
  limit: 20,
  offset: 0,
  type: 'comprehensive'  // Filter by type
});
```

Features:
- Pagination support
- Type filtering
- 10-minute stale time
- Automatic refetching

#### `useTriggerAnalysis`

Trigger new analysis runs (admin only):

```typescript
const { mutate, isPending } = useTriggerAnalysis();

mutate({
  bill_id: 'bill-123',
  priority: 'high',
  notify_on_complete: true
});
```

Features:
- Automatic cache invalidation
- Optimistic updates
- Error handling
- Success callbacks

### 4. UI Component (`ComprehensiveAnalysisPanel`)

Comprehensive display component for analysis results:

```typescript
<ComprehensiveAnalysisPanel analysis={analysisData} />
```

Displays:
- Overall confidence score
- Constitutional analysis with concerns and precedents
- Conflict of interest summary
- Stakeholder impact (economic and social)
- Transparency score breakdown
- Public interest assessment
- Recommended actions

## API Endpoints

### Public Endpoints

1. **GET** `/api/analysis/bills/:bill_id/comprehensive`
   - Get comprehensive analysis
   - Query params: `force` (optional)
   - Returns: `ComprehensiveBillAnalysis`

2. **GET** `/api/analysis/bills/:bill_id/history`
   - Get analysis history
   - Query params: `limit`, `offset`, `type`
   - Returns: `AnalysisHistoryEntry[]`

3. **GET** `/api/analysis/health`
   - Health check
   - Returns: `{ status, timestamp }`

### Protected Endpoints (Admin Only)

4. **POST** `/api/analysis/bills/:bill_id/comprehensive/run`
   - Trigger new analysis
   - Body: `{ priority?, notify_on_complete? }`
   - Returns: `ComprehensiveBillAnalysis`

## Usage Examples

### Basic Usage

```typescript
import { useComprehensiveAnalysis } from '@client/features/analysis';
import { ComprehensiveAnalysisPanel } from '@client/features/bills/ui/analysis';

function BillAnalysisTab({ billId }: { billId: string }) {
  const { data, isLoading, error } = useComprehensiveAnalysis({ billId });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return null;

  return <ComprehensiveAnalysisPanel analysis={data} />;
}
```

### With History

```typescript
function AnalysisHistoryView({ billId }: { billId: string }) {
  const { data: history } = useAnalysisHistory({
    bill_id: billId,
    limit: 10
  });

  return (
    <div>
      {history?.map(entry => (
        <HistoryCard key={entry.analysis_id} entry={entry} />
      ))}
    </div>
  );
}
```

### Admin Trigger

```typescript
function AdminAnalysisControls({ billId }: { billId: string }) {
  const { mutate, isPending } = useTriggerAnalysis();

  const handleTrigger = () => {
    mutate({
      bill_id: billId,
      priority: 'high',
      notify_on_complete: true
    });
  };

  return (
    <Button onClick={handleTrigger} disabled={isPending}>
      {isPending ? 'Analyzing...' : 'Run Analysis'}
    </Button>
  );
}
```

## Integration with Existing Features

### Bills Feature Integration

The analysis feature integrates seamlessly with the existing bills feature:

1. **BillAnalysis.tsx** - Can now use `useComprehensiveAnalysis` hook
2. **BillAnalysisTab.tsx** - Can display `ComprehensiveAnalysisPanel`
3. **Bills API Service** - Already has `getBillAnalysis()` method

### Conflict Detection Integration

The new comprehensive analysis complements existing conflict detection:

- Existing: `useConflictAnalysis` for detailed conflict visualization
- New: `useComprehensiveAnalysis` for overall bill assessment
- Both can be used together for complete analysis view

## Error Handling

All services use the consolidated error system:

```typescript
try {
  const analysis = await analysisApiService.getComprehensiveAnalysis({ bill_id });
} catch (error) {
  // Error is automatically logged and handled
  // by ErrorFactory and errorHandler
}
```

## Caching Strategy

React Query caching configuration:

- **Comprehensive Analysis**: 5-minute stale time, 30-minute GC
- **Analysis History**: 10-minute stale time, 30-minute GC
- **Force Reanalysis**: Bypasses cache completely
- **Mutations**: Automatically invalidate related queries

## Performance Considerations

1. **Lazy Loading**: Analysis data only fetched when needed
2. **Pagination**: History supports pagination to limit data transfer
3. **Caching**: Aggressive caching reduces server load
4. **Optimistic Updates**: Mutations provide instant feedback
5. **Retry Logic**: Automatic retries for transient failures

## Testing

### Unit Tests

```typescript
describe('AnalysisApiService', () => {
  it('should fetch comprehensive analysis', async () => {
    const analysis = await analysisApiService.getComprehensiveAnalysis({
      bill_id: 'test-bill'
    });
    expect(analysis).toBeDefined();
    expect(analysis.bill_id).toBe('test-bill');
  });
});
```

### Integration Tests

```typescript
describe('useComprehensiveAnalysis', () => {
  it('should fetch and cache analysis data', async () => {
    const { result } = renderHook(() => 
      useComprehensiveAnalysis({ billId: 'test-bill' })
    );
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live analysis updates
2. **Comparison View**: Compare multiple analysis runs side-by-side
3. **Export Functionality**: Export analysis reports as PDF/CSV
4. **Visualization**: Interactive charts for stakeholder impact
5. **Notifications**: Push notifications for analysis completion
6. **Batch Analysis**: Analyze multiple bills simultaneously

## Migration Notes

### From Mock Data

If migrating from mock data:

1. Replace mock service calls with `analysisApiService`
2. Update component props to use `ComprehensiveBillAnalysis` type
3. Add React Query provider if not already present
4. Update error handling to use consolidated error system

### Backward Compatibility

The implementation maintains backward compatibility:

- Existing `useConflictAnalysis` hook still works
- Existing conflict detection UI components unchanged
- New hooks can be adopted incrementally
- Types are additive, not breaking

## Documentation

- [Server Analysis Implementation](../adr/011-bills-feature-server-implementation.md)
- [Natural Branching Architecture](../adr/010-natural-branching-architecture.md)
- [Bills Feature Complete](../DCS/BILLS_FEATURE_COMPLETE.md)
- [Migration Log](../technical/MIGRATION_LOG.md)

## Conclusion

The analysis feature client implementation achieves 100% congruence with the server API, providing a complete, type-safe, and performant solution for comprehensive bill analysis. The implementation follows natural branching architecture principles and integrates seamlessly with existing features.

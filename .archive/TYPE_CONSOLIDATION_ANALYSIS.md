# Type System Consolidation Analysis

## Current State: 3 Competing Loading Type Definitions

### 1. **`@client/core/loading/types.ts`** (Complex Core Version - 317 lines)
**Focus:** State management, operations tracking, adaptive loading

**Key Types:**
- `LoadingStateData` - Full state with: operations, globalLoading, highPriorityLoading, connectionInfo, isOnline, adaptiveSettings, assetLoadingProgress, stats
- `LoadingOperation` - startTime: **number**, includes estimatedTime, timeoutWarningShown, cancelled
- `LoadingState` - 'idle' | 'loading' | 'success' | 'error' | 'timeout' | 'cancelled'
- `LoadingType` - 'page' | 'component' | 'api' | 'asset' | 'progressive' | 'form' | 'navigation'
- `LoadingPriority` - 'high' | 'medium' | 'low'
- Complete action types: START_OPERATION, UPDATE_OPERATION, COMPLETE_OPERATION, etc.
- Context interface with all convenience methods

**Status:** ✅ Most comprehensive, used by context.tsx

---

### 2. **`@client/shared/types/loading.ts`** (Shared Types - 160 lines)
**Focus:** Generic async operations, connection info, queues

**Key Types:**
- `LoadingStateData` - Simple: isLoading, operations, stats, error (missing context-needed fields)
- `LoadingOperation` - startTime: **Date**, includes description, endTime, dependencies
- `LoadingState` - 'idle' | 'loading' | 'success' | 'error' (no timeout/cancelled)
- `LoadingType` - **string** (not strongly typed)
- `ConnectionInfo` - Detailed: online, connectionType, effectiveType, downlink, rtt
- `LoadingQueue`, `LoadingBatch`, `LoadingResult` types

**Status:** ⚠️ Incomplete, missing context-level types, different startTime type

---

### 3. **`@client/shared/ui/loading/types.ts`** (UI Component Version - 133 lines)
**Focus:** Component props, UI display configuration

**Key Types:**
- `LoadingProps`, `LoadingConfig` - UI-focused
- `LoadingOperation` - Simplified version, no state tracking details
- `LoadingType` - 'page' | 'component' | 'asset' | 'data' | 'network' | 'inline' | 'progressive' | 'network-aware' | 'timeout-aware'
- `LoadingStats` - loaded/failed counts, connectionType (different from core version)
- `LoadingProgress`, `AssetLoadingIndicatorProps`

**Status:** ⚠️ UI-specific, doesn't match operational needs

---

## Root Conflicts

| Issue | Impact |
|-------|--------|
| **startTime type** | core/types: `number`, shared/types: `Date` → Requires type guards |
| **LoadingStateData shape** | core has 8 fields, shared has 4 fields → Type mismatch in context |
| **LoadingOperation properties** | core: estimatedTime/timeout, shared: description/dependencies → Different purposes |
| **LoadingState enum** | core: 6 states, shared: 4 states → Incomplete coverage |
| **Action types** | core: 10+ action types, shared: generic LoadingAction → Reducer mismatch |
| **Three separate files** | No single source of truth → Maintenance nightmare |

---

## Consolidation Strategy

### **Single Source of Truth: `@client/shared/types/loading.ts`**

**Why shared/types?**
- ✅ Central location for cross-cutting concerns
- ✅ Used by context.tsx (already imports from here)
- ✅ Serves UI, core, and features equally
- ✅ Semantic correctness (shared = used everywhere)

### **Unified LoadingStateData**
```typescript
// Complete state combining all necessary fields
export interface LoadingStateData {
  // Operational state
  isLoading: boolean;
  operations: Record<string, LoadingOperation>;
  stats: LoadingMetrics;
  error?: string;
  
  // Connection & adaptation
  connectionInfo: ConnectionInfo;
  isOnline: boolean;
  adaptiveSettings: AdaptiveSettings;
  
  // Global loading indicators
  globalLoading: boolean;
  highPriorityLoading: boolean;
  
  // Asset tracking
  assetLoadingProgress: AssetLoadingProgress;
}
```

### **Unified LoadingOperation**
```typescript
export interface LoadingOperation {
  id: string;
  type: LoadingType;
  priority: LoadingPriority;
  
  // Timing (use number for consistency)
  startTime: number;  // Date.now() milliseconds
  endTime?: number;
  timeout?: number;
  estimatedTime?: number;
  
  // Retry & recovery
  retryCount: number;
  maxRetries: number;
  retryStrategy: RetryStrategy;
  retryDelay: number;
  
  // State & messaging
  state: LoadingState;
  message?: string;
  error?: Error | string;
  progress?: number;
  
  // Advanced
  stage?: string;
  connectionAware: boolean;
  dependencies?: string[];
  metadata?: Record<string, any>;
  
  // UI hints
  timeoutWarningShown?: boolean;
  cancelled?: boolean;
}
```

### **Unified LoadingState**
```typescript
export type LoadingState = 
  | 'idle' 
  | 'loading' 
  | 'success' 
  | 'error' 
  | 'timeout' 
  | 'cancelled';
```

---

## Files to Delete
- ❌ `@client/core/loading/types.ts` → Move content to shared/types/loading.ts
- ❌ `@client/shared/ui/loading/types.ts` → Export UI-specific interfaces from shared/types/loading.ts

## Files to Update
- ✅ `@client/shared/types/loading.ts` → Consolidate all definitions
- ✅ `@client/core/loading/context.tsx` → Import from @client/shared/types/loading (already does)
- ✅ `@client/core/loading/reducer.ts` → Use unified types
- ✅ `@client/core/loading/utils.ts` → Update for number startTime
- ✅ `@client/shared/types/index.ts` → Ensure loading.ts is exported

## Expected Impact
- **Errors reduced:** ~15-20 (by removing type conflicts)
- **Codebase clarity:** ++++ (single source of truth)
- **Maintenance cost:** ---- (no duplicate definitions)

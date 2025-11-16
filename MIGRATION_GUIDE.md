# Migration Guide: Improved Separation of Concerns

This guide documents the migration from mixed concerns to proper separation of concerns in the Chanuka civic engagement platform.

## 🎯 Migration Summary

### ✅ Completed Migrations

#### 1. **Type System Standardization**
- ✅ Created `client/src/types/api.ts` with consistent types
- ✅ Eliminated `bill_id` vs `billId` inconsistencies
- ✅ Standardized WebSocket and engagement types

#### 2. **Business Logic Services**
- ✅ `StateManagementService`: Centralized Redux operations
- ✅ `BillTrackingService`: Bill tracking business logic
- ✅ `WebSocketService`: Connection and subscription management

#### 3. **Hook Simplification**
- ✅ Replaced `use-websocket.ts` with UI-focused version
- ✅ Removed business logic from hooks
- ✅ Added service delegation patterns

#### 4. **Component Updates**
- ✅ Updated `RealTimeBillTracker` to use new services
- ✅ Separated UI logic from business logic
- ✅ Implemented service-based preferences

#### 5. **Service Integration**
- ✅ Updated `billsApiService.ts` to use new services
- ✅ Removed direct Redux store access
- ✅ Added dependency injection support

## 🔄 Migration Patterns

### Before (Mixed Concerns)
```typescript
// ❌ Business logic mixed with UI logic
const handleBillUpdate = useCallback((update: BillUpdate) => {
  // Redux store updates (business logic)
  store.dispatch(updateBill({ id: update.bill_id, updates: update.data }));
  
  // UI state management (presentation logic)
  setBillUpdates(prev => { /* ... */ });
}, []);
```

### After (Separated Concerns)
```typescript
// ✅ UI logic only in hooks
const handleBillUpdate = useCallback((update: BillUpdate) => {
  // Only UI state updates
  setBillUpdates(prev => { /* ... */ });
  
  // Business logic handled by service
  handlersRef.current.onBillUpdate?.(update);
}, []);

// ✅ Business logic in services
class BillTrackingService {
  async processBillUpdate(update: BillUpdate): Promise<void> {
    // Business rules and state management
    const processedUpdates = this.applyBusinessRules(update);
    stateManagementService.updateBill(billId, processedUpdates);
  }
}
```

## 📁 New Architecture

```
client/src/
├── types/
│   └── api.ts                    # Standardized type definitions
├── services/
│   ├── stateManagementService.ts # Redux store operations
│   ├── billTrackingService.ts    # Bill tracking business logic
│   ├── webSocketService.ts       # WebSocket management
│   └── index.ts                  # Service exports
├── hooks/
│   ├── use-websocket.ts          # UI-focused WebSocket hook
│   └── useService.ts             # Dependency injection hook
└── components/
    └── bill-tracking/
        └── real-time-tracker.tsx # UI-focused component
```

## 🔧 Usage Examples

### Using Services in Components
```typescript
import { useService } from '../hooks/useService';
import { BillTrackingService } from '../services/billTrackingService';

function MyComponent() {
  const trackingService = useService<BillTrackingService>('billTrackingService');
  
  const handlePreferenceChange = (prefs) => {
    trackingService?.updatePreferences(prefs);
  };
}
```

### Using Simplified WebSocket Hook
```typescript
import { useWebSocket } from '../hooks/use-websocket';

function BillTracker({ billId }) {
  const { isConnected, subscribe, billUpdates } = useWebSocket({
    subscriptions: [{ type: 'bill', id: billId }],
    handlers: {
      onBillUpdate: (update) => {
        // UI-only logic here
        toast.info(`Bill ${update.data.billId} updated`);
      }
    }
  });
}
```

### Service-Based State Management
```typescript
// Instead of direct store access
store.dispatch(updateBill({ id: billId, updates }));

// Use service
stateManagementService.updateBill(billId, updates);
```

## 🎯 Benefits Achieved

### 1. **Clear Separation of Concerns**
- **Data Layer**: Core API modules handle HTTP/WebSocket communication
- **Business Logic Layer**: Services handle domain logic and state management
- **Presentation Layer**: Hooks and components focus on UI concerns only

### 2. **Improved Testability**
- Services can be unit tested independently
- Components can be tested with mocked services
- Clear interfaces enable easy mocking

### 3. **Better Maintainability**
- Business logic centralized in services
- Consistent patterns across the application
- Easier to modify business rules without affecting UI

### 4. **Type Safety**
- Standardized type definitions across layers
- Eliminated property name inconsistencies
- Better IDE support and error detection

## 📊 Architecture Quality Score

**Before**: 7/10
- ✅ Clear API abstraction
- ✅ Service encapsulation
- ⚠️ Business logic in hooks
- ⚠️ Direct store access
- ⚠️ Mixed component concerns

**After**: 9/10
- ✅ Clear API abstraction
- ✅ Service encapsulation
- ✅ Business logic in services
- ✅ Service-based state management
- ✅ UI-focused components
- ✅ Dependency injection
- ✅ Consistent type system

## 🚀 Next Steps

### For New Components
1. Use `useService` hook for dependency injection
2. Keep components focused on UI rendering
3. Delegate business logic to services
4. Use standardized types from `types/api.ts`

### For Existing Components
1. Identify mixed concerns (business logic in UI components)
2. Extract business logic to appropriate services
3. Update components to use service hooks
4. Test thoroughly to ensure functionality is preserved

## 🔍 Code Review Checklist

When reviewing new code, ensure:

- [ ] Components only contain UI logic
- [ ] Business logic is in appropriate services
- [ ] No direct Redux store access in components/hooks
- [ ] Services are accessed via dependency injection
- [ ] Types are imported from standardized locations
- [ ] WebSocket operations use `webSocketService`
- [ ] State updates use `stateManagementService`

## 📚 Additional Resources

- **Service Registry**: `client/src/core/api/registry.ts`
- **Type Definitions**: `client/src/types/api.ts`
- **Service Examples**: `client/src/services/`
- **Hook Examples**: `client/src/hooks/use-websocket.ts`
- **Component Examples**: `client/src/components/bill-tracking/real-time-tracker.tsx`

This migration establishes a solid foundation for scalable, maintainable code with clear separation of concerns.
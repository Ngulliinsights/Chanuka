# Bills Feature - Flattened Structure

## Overview

The bills feature has been restructured to eliminate unnecessary nesting while maintaining clear separation of concerns and keeping the API centralized.

## New Structure

```
client/src/features/bills/
├── index.ts                    # Main feature exports
├── types.ts                    # Feature-specific types
├── hooks.ts                    # React Query hooks
├── services.ts                 # Business logic services
├── BillCard.tsx               # Bill card component
├── BillList.tsx               # Bill list component
├── BillAnalysis.tsx           # Bill analysis component
├── BillDetail.tsx             # Bill detail component
├── services/                   # Service implementations
│   ├── cache.ts               # Caching service
│   ├── pagination.ts          # Pagination service
│   └── tracking.ts            # Tracking service
└── ui/                        # Legacy UI structure (for compatibility)
```

## Key Changes

### ✅ Flattened Structure

- Eliminated `model/hooks/` nesting - hooks are now in `hooks.ts`
- Eliminated `api/` directory - API stays centralized in `client/src/infrastructure/api/bills.ts`
- Main UI components moved to feature root
- Types consolidated into single `types.ts` file

### ✅ Centralized API

- All API logic remains in `client/src/infrastructure/api/bills.ts`
- No duplication between core and feature API
- Single source of truth for data access
- Better reusability across features

### ✅ Backward Compatibility

- Legacy exports maintained in `ui/index.ts`
- Existing imports continue to work
- Gradual migration path available

## Benefits

1. **Reduced Complexity**: Fewer nested directories to navigate
2. **Clearer Dependencies**: Features depend on core services, not vice versa
3. **Better Reusability**: Bills API can be used by multiple features
4. **Easier Testing**: Single place to mock API responses
5. **Consistent Patterns**: Follows established core/feature separation

## Import Examples

```typescript
// New flattened imports
import { useBills, BillCard, BillsQueryParams } from '@client/features/bills';

// Legacy imports still work
import { BillCard } from '@client/features/bills/ui';
import { useBills } from '@client/features/bills';

// API remains centralized
import { billsApiService } from '@client/infrastructure/api/bills';
```

## Migration Notes

- All existing functionality preserved
- No breaking changes to public API
- Legacy nested structure maintained for compatibility
- Services remain in subdirectory for organization

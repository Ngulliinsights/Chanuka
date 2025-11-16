# Search API Migration Guide

## Overview

The search API has been refactored to improve separation of concerns and eliminate redundancy. The changes include:

1. **API Client moved**: `search-api.ts` → `client/src/core/api/search.ts`
2. **Intelligent Search updated**: Now uses the centralized API client
3. **Improved architecture**: Clear separation between API client and business logic

## Migration Steps

### For Direct API Usage

**Before:**
```typescript
import { searchApi } from '../features/search/services/search-api';

const results = await searchApi.search(request);
const suggestions = await searchApi.getSuggestions(query);
```

**After:**
```typescript
import { searchApiClient } from '../core/api/search';
// OR
import { searchApiClient } from '../features/search';

const results = await searchApiClient.search(request);
const suggestions = await searchApiClient.getSuggestions(query);
```

### For Business Logic Usage

**Before:**
```typescript
import { intelligentSearch } from '../features/search/services/intelligent-search';

const results = await intelligentSearch.search(request);
```

**After:**
```typescript
import { searchService } from '../features/search';
// OR
import { intelligentSearch } from '../features/search/services/intelligent-search';

const results = await searchService.search(request);
```

### Recommended Usage Patterns

#### For Components
```typescript
// Use the intelligent search service for UI components
import { searchService } from '../features/search';

const SearchComponent = () => {
  const handleSearch = async (query: string) => {
    const results = await searchService.search({ q: query });
    // Handle results...
  };
};
```

#### For Other Services
```typescript
// Use the API client for other services that need raw API access
import { searchApiClient } from '../core/api/search';

const SomeOtherService = {
  async getSearchData() {
    return await searchApiClient.getSearchData('bills');
  }
};
```

## Benefits

1. **Clear Separation**: API client vs business logic
2. **Reusability**: API client can be used across features
3. **Maintainability**: Single source of truth for API endpoints
4. **Consistency**: Follows established patterns in the codebase
5. **Performance**: Eliminated duplicate API calls

## Backward Compatibility

The old `search-api.ts` file still exists with a deprecation notice and re-exports for backward compatibility. However, it will be removed in a future version.

## Breaking Changes

None - all existing functionality is preserved with backward compatibility exports.

## Timeline

- **Phase 1**: ✅ API client moved to core
- **Phase 2**: ✅ Intelligent search updated  
- **Phase 3**: ✅ Duplicate API calls removed
- **Phase 4**: ✅ Imports updated
- **Phase 5**: 🔄 Update consuming code (ongoing)
- **Phase 6**: 📅 Remove deprecated file (future release)

## Files Updated

### Core Files
- ✅ `client/src/core/api/search.ts` - New centralized API client
- ✅ `client/src/core/api/index.ts` - Added search client export

### Feature Files  
- ✅ `client/src/features/search/services/search-api.ts` - Deprecated with re-export
- ✅ `client/src/features/search/services/intelligent-search.ts` - Updated imports
- ✅ `client/src/features/search/hooks/useSearch.ts` - Updated imports
- ✅ `client/src/features/search/index.ts` - Updated public API

### Documentation
- ✅ `client/src/features/search/MIGRATION_GUIDE.md` - This guide

## Next Steps

1. **Update Components**: Gradually migrate components to use new imports
2. **Update Tests**: Update test files to use new import paths
3. **Remove Deprecated File**: After ensuring all code is migrated
4. **Add Integration Tests**: Test the new API client and updated intelligent search service
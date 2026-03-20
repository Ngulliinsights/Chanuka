# API Client Migration Guide

## Quick Reference: Files to Refactor

### File-by-File Migration Checklist

**Total files to migrate: 8**  
**Total API calls to update: ~38**  
**Estimated effort: 1-2 hours**

---

## File 1: `client/src/features/advocacy/hooks/use-advocacy.ts`

**Status:** 🔴 CRITICAL - ~20 API calls  
**Issue:** Imports from old wrapper; heavy API usage

**Update Pattern:**
```diff
- import { api } from '@client/services/apiService';
+ import { globalApiClient } from '@client/infrastructure/api';

// Keep all api.get(), api.post() calls as-is (globalApiClient has same interface)
// OR to be explicit:
- const response = await api.get(`/api/advocacy/campaigns?${params.toString()}`);
+ const response = await globalApiClient.get(`/api/advocacy/campaigns?${params.toString()}`);
```

**API Calls in this file:**
- `api.get()` - 5 calls (lines ~70, 85, 182, 197, 259, 275, 325, 340)
- `api.post()` - 8 calls (lines ~101, 125, 143, 161, 212, 238, 302, ...)
- `api.put()` - 1 call (line ~125)

---

## File 2: `client/src/features/advocacy/ElectoralPressure.tsx`

**Status:** 🔴 CRITICAL - 3 API calls  
**Issue:** Imports from old wrapper

**API Calls:**
- `api.get()` - 3 calls (lines ~38, 39, 45)

---

## File 3: `client/src/features/constitutional-intelligence/hooks/use-constitutional-analysis.ts`

**Status:** 🔴 CRITICAL - ~10 API calls  
**Issue:** Imports from old wrapper

**API Calls:**
- `api.get()` - 3 calls
- `api.post()` - 1 call
- `api.delete()` - 1 call

---

## File 4: `client/src/features/bills/pages/bill-detail.tsx`

**Status:** 🔴 CRITICAL - 1 API call  
**Issue:** Imports from old wrapper

**API Call:**
- `api.get()` - 1 call (line ~47)

---

## File 5: `client/src/features/bills/ui/translation/PlainLanguageView.tsx`

**Status:** 🔴 CRITICAL - 1 API call  
**Issue:** Imports from old wrapper

**API Call:**
- `api.post()` - 1 call (line ~17)

---

## File 6: `client/src/features/bills/ui/legislative-brief/BriefViewer.tsx`

**Status:** 🔴 CRITICAL - 1 API call  
**Issue:** Imports from old wrapper

**API Call:**
- `api.post()` - 1 call (line ~47)

---

## File 7: `client/src/features/bills/ui/legislative-brief/ArgumentMap.tsx`

**Status:** 🔴 CRITICAL - 1 API call  
**Issue:** Imports from old wrapper

**API Call:**
- `api.get()` - 1 call (line ~25)

---

## File 8: `client/src/features/bills/ui/impact/ImpactCalculator.tsx`

**Status:** 🔴 CRITICAL - 1 API call  
**Issue:** Imports from old wrapper

**API Call:**
- `api.post()` - 1 call (line ~22)

---

## Bonus: Modernization Opportunities

### Current Pattern (Using globalApiClient directly):
```typescript
// Infrastructure services already do this correctly
import { globalApiClient } from '@client/infrastructure/api';

async function submitReport(request: ModerationRequest) {
  const response = await globalApiClient.post('/api/moderation/report', request);
  return response.data as UnifiedModeration;
}
```

### Consider Creating Feature-Specific API Services
After migration, you could create domain-specific API services:

```typescript
// client/src/features/advocacy/services/api.ts
import { globalApiClient } from '@client/infrastructure/api';
import type { Campaign, CampaignInput } from '../types';

export const advocacyApiService = {
  async listCampaigns(params: URLSearchParams) {
    const response = await globalApiClient.get(`/api/advocacy/campaigns?${params}`);
    return response.data as Campaign[];
  },

  async createCampaign(data: CampaignInput) {
    const response = await globalApiClient.post('/api/advocacy/campaigns', data);
    return response.data as Campaign;
  },

  // ... other methods
};
```

Then in hooks:
```typescript
// client/src/features/advocacy/hooks/use-advocacy.ts
import { advocacyApiService } from '../services/api';

export function useAdvocacyList() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: () => advocacyApiService.listCampaigns(new URLSearchParams()),
  });
}
```

**Benefits:**
- Cleaner hook code (no inline API calls)
- Easier testing (mock the service)
- Better code organization
- Type safety
- DRY (Don't Repeat Yourself)

---

## Implementation Order

**Recommended Order** (by dependency):

1. ✅ **First:** auth-service-init.ts (already done - pure infrastructure)
2. ✅ **Already Done:** Notifications, Moderation, Auth services
3. 🔄 **Next:** Features using advocacy API (1-3 files)
4. 🔄 **Then:** Features using bills API (4-8 files)

---

## Testing Checklist

After each file migration:

- [ ] Import statement updated
- [ ] All `api.*` references updated to `globalApiClient.*`
- [ ] No TypeScript errors
- [ ] Feature still works in dev mode
- [ ] Related tests pass
- [ ] No console warnings

---

## Automated Migration Script (Optional)

```bash
#!/bin/bash
# Replace old imports with new ones

find client/src/features -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s/from '@client\/services\/apiService'/from '@client\/infrastructure\/api'/g" {} \;

# Find and replace variable name (if you want to be extra clean)
find client/src/features -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s/import { api }/import { globalApiClient }/g" {} \;
```

**Warning:** Test manually first before running automation!

---

## Architecture After Migration

```
Features Layer
    ├─ use-advocacy.ts ──┐
    ├─ use-constitutional-analysis.ts ─┤
    └─ use-bills.ts ────┤
                         │
                         ▼
    Infrastructure Layer
    ├─ @client/infrastructure/api ◄──── globalApiClient (SINGLE SOURCE)
    │                                    ├─ Retry logic
    │                                    ├─ Caching
    │                                    ├─ Circuit breaker
    │                                    └─ Auth interceptors
    │
    └─ Domain Services (Optional)
        ├─ advocacyApiService
        ├─ billsApiService
        └─ notificationsService (already done)
```

---

## Common Patterns to Update

### Pattern 1: Simple GET
```diff
- const response = await api.get('/api/advocacy/campaigns');
+ const response = await globalApiClient.get('/api/advocacy/campaigns');
```

### Pattern 2: GET with Parameters
```diff
- const response = await api.get(`/api/advocacy/campaigns?${params.toString()}`);
+ const response = await globalApiClient.get(`/api/advocacy/campaigns?${params.toString()}`);
```

### Pattern 3: POST with Data
```diff
- const response = await api.post('/api/advocacy/campaigns', data);
+ const response = await globalApiClient.post('/api/advocacy/campaigns', data);
```

### Pattern 4: PUT/PATCH
```diff
- const response = await api.put(`/api/advocacy/campaigns/${id}`, data);
+ const response = await globalApiClient.put(`/api/advocacy/campaigns/${id}`, data);
```

### Pattern 5: DELETE
```diff
- const response = await api.delete(`/api/constitutional-intelligence/cache/${billId}`);
+ const response = await globalApiClient.delete(`/api/constitutional-intelligence/cache/${billId}`);
```

---

## TypeScript Interface Check

After migration, verify that `globalApiClient` has all needed methods:

```typescript
// From client/src/infrastructure/api/client.ts
interface UnifiedApiClient {
  get<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>>;
  post<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  put<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  patch<T>(url: string, data?: any, options?: RequestOptions): Promise<ApiResponse<T>>;
  delete<T>(url: string, options?: RequestOptions): Promise<ApiResponse<T>>;
}
```

All methods used by the old `api` object are present in `globalApiClient`. ✅

---

## Questions / Concerns

**Q: What if other code is already using the wrapper?**  
A: The wrapper will still exist, but this migration removes direct feature usage.

**Q: Can we do this incrementally?**  
A: Yes! Fix one file at a time. The wrapper will still work for files not yet migrated.

**Q: What about tests?**  
A: Update mocks to use `globalApiClient` instead of `api`.

**Q: What if a feature needs special API handling?**  
A: Create a domain-specific service that wraps `globalApiClient`.

---

## Validation After All Migrations

```bash
# Should find NO feature files importing from the old path
grep -r "@client/services/apiService" client/src/features/

# Should find ONLY feature files importing the new path
grep -r "@client/infrastructure/api" client/src/features/

# Optional: ensure globalApiClient is used
grep -r "globalApiClient" client/src/features/
```

✅ If first command returns 0 results → **Migration complete!**

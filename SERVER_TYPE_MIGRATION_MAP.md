# Server Type Migration Map

## Overview
Comprehensive mapping of server local type definitions that need migration to @shared/types.
Total types identified: 50+ interfaces/types across 30+ files

## Migration Plan by Domain

### 1. Authentication Domain (shared/types/domains/authentication/)

**Source Files:**
- `server/features/users/domain/user-management.ts` → Lines 14-30
- `server/features/users/domain/user-profile.ts` → Lines 1-40
- `server/features/users/domain/user-preferences.ts` → Lines 1-40
- `server/features/users/domain/citizen-verification.ts` → Lines 1-40
- `server/features/users/domain/ExpertVerificationService.ts` → Lines 1-50

**Types to Migrate:**
- UserManagementFilters (user-management.ts:14-17)
- UserDetails (user-management.ts:18-28)
- UserActivityLog (user-management.ts:29-35)
- UserProfileData (user-profile.ts:9-20)
- UserInterestData (user-profile.ts:21-35)
- UserPreferences (user-profile.ts:36-40)
- BillTrackingPreferences (user-preferences.ts:9-20)
- UserNotificationPreferences (user-preferences.ts:21-35)
- CitizenVerification (citizen-verification.ts)
- Evidence (citizen-verification.ts)
- ExpertiseLevel (citizen-verification.ts)
- ExtendedExpert (ExpertVerificationService.ts)
- Analysis (ExpertVerificationService.ts)
- ExtendedVerificationTask (ExpertVerificationService.ts)

**Target Location:** shared/types/domains/authentication/user-types.ts

---

### 2. Legislative Domain (shared/types/domains/legislative/supplements)

**Source Files:**
- `server/features/bills/domain/LegislativeStorageTypes.ts` → Full file
- `server/features/bills/domain/types.ts` → Full file

**Types to Migrate:**
- TransactionClient
- StorageConfig
- LegislativeStorage
- (and any bill-related types from domain/types.ts)

**Target Location:** shared/types/domains/legislative/storage-types.ts

---

### 3. Feature Flags Domain (NEW: shared/types/domains/feature-flags/)

**Source Files:**
- `server/features/feature-flags/domain/types.ts` → Full file

**Types to Migrate:**
- FeatureFlagConfig
- UserTargeting
- ABTestConfig

**Target Location:** shared/types/domains/feature-flags/flag-types.ts

---

### 4. Moderation/Safeguards Domain (shared/types/domains/safeguards/)

**Source Files:**
- `server/features/admin/moderation/types.ts` → Full file

**Types to Migrate:**
- ContentModerationFilters
- ModerationItem

**Target Location:** shared/types/domains/safeguards/moderation-types.ts

---

### 5. Community Domain (NEW: shared/types/domains/community/)

**Source Files:**
- `server/features/advocacy/types/index.ts` → Full file
- `server/features/notifications/domain/types.ts` → Full file
- `server/features/search/domain/search.dto.ts` → Full file
- `server/features/search/domain/QueryIntentService.ts` → Lines with SearchStrategy
- `server/features/search/domain/SearchAnalytics.ts` → Full file
- `server/features/search/domain/TypoCorrectionService.ts` → Full file
- `server/features/community/domain/index.ts` → Check contents

**Types to Migrate:**
- CampaignFilters
- ActionFilters
- CampaignMetrics
- CombinedBillTrackingPreferences (extends GlobalBillTrackingPreferences)
- SearchFilters
- SearchPagination
- SearchOptions
- SearchAnalyticsEvent
- SearchMetrics
- ValidationResult
- CorrectionResult
- SynonymResult
- IntentClassification

**Target Locations:**
- shared/types/domains/community/advocacy-types.ts
- shared/types/domains/community/search-types.ts
- shared/types/domains/community/notification-types.ts

---

### 6. Analysis Domain (shared/types/features/analysis/)

**Source Files:**
- `server/features/analysis/types/index.ts` → Full file
- `server/features/pretext-detection/domain/types.ts` → Full file
- `server/features/recommendation/domain/recommendation.dto.ts` → Full file
- `server/features/recommendation/domain/RecommendationEngine.ts` → Full file
- `server/features/recommendation/domain/RecommendationValidator.ts` → Full file

**Types to Migrate:**
- AnalysisResult
- LegalAnalysisConfig
- ConstitutionalAnalysis
- PretextAnalysisInput
- PretextDetection
- PretextAnalysisResult
- PlainBill
- PersonalizedRecommendationsDto
- SimilarBillsDto
- RecommendationContext
- RecommendationCandidate
- RecommendationValidationResult

**Target Locations:**
- shared/types/features/analysis/pretext-types.ts
- shared/types/features/analysis/recommendation-types.ts

---

### 7. Advocacy Domain (shared/types/domains/advocacy/ or analysis/advocacy/)

**Source Files:**
- `server/features/electoral-accountability/domain/electoral-accountability.constants.ts` → Lines with types
- `server/features/electoral-accountability/domain/electoral-accountability.validation.ts` → VotingRecordImportData

**Types to Migrate:**
- AllowedVote
- AllowedGapSeverity
- AllowedCampaignStatus
- VotingRecordImportData

**Target Location:** shared/types/domains/electoral/accountability-types.ts

---

### 8. Analytics Domain (shared/types/domains/monitoring/)

**Source Files:**
- `server/features/analytics/types/common.ts` → Full file
- `server/features/analytics/types/engagement.ts` → Full file
- `server/features/product-analytics/domain/alerting.service.ts` → Full file
- `server/features/product-analytics/domain/integration-monitor.service.ts` → Full file

**Types to Migrate:**
- TimeSeriesDataPoint
- DateRange
- PaginationParams
- UserEngagementMetrics
- AlertNotificationChannel
- AlertNotification
- FeatureUsageMetrics
- FeaturePerformanceMetrics
- FeatureHealthStatus

**Target Locations:**
- shared/types/domains/monitoring/analytics-types.ts
- shared/types/domains/monitoring/alerts-types.ts

---

### 9. Universal Access Domain (NEW: shared/types/domains/accessibility/)

**Source Files:**
- `server/features/universal_access/domain/ussd.types.ts` → Full file

**Types to Migrate:**
- USSDLanguage
- USSDSession
- USSDResponse

**Target Location:** shared/types/domains/accessibility/ussd-types.ts

---

## Migration Strategy

### Phase 1: Create Domain Type Files
1. Create shared/types/domains/authentication/user-types.ts
2. Create shared/types/domains/feature-flags/flag-types.ts
3. Create shared/types/domains/community/advocacy-types.ts
4. Create shared/types/domains/community/search-types.ts
5. Create shared/types/domains/accessibility/ussd-types.ts
6. Create shared/types/features/analysis/pretext-types.ts
7. Create shared/types/features/analysis/recommendation-types.ts
8. Create supplementary domain type files as needed

### Phase 2: Copy Type Definitions
- Copy each interface/type from server files to appropriate shared/types location
- Preserve JSDoc comments and structure
- Ensure proper dependency ordering

### Phase 3: Update shared/types/index.ts
- Add exports for new domain modules
- Update index.ts files in each domain directory to re-export

### Phase 4: Update Server Imports
- Remove local interface definitions from server/features/*/domain/types.ts
- Add `import { TypeName } from '@shared/types'` statements
- Update all service files that reference the local types

### Phase 5: Validation
- Run TypeScript compiler: `tsc --noEmit`
- Verify no type errors in client or server
- Check that all imports resolve correctly
- Run ESLint to verify boundary rules

### Phase 6: Test & Commit
- Verify no runtime errors
- Test affected APIs
- Create commit: "refactor: migrate server types to @shared/types layer"

## Key Files to Create/Update

### New Files to Create:
```
shared/types/domains/feature-flags/
  ├── flag-types.ts
  └── index.ts

shared/types/domains/accessibility/
  ├── ussd-types.ts
  └── index.ts

shared/types/domains/community/
  ├── advocacy-types.ts
  ├── search-types.ts
  ├── notification-types.ts
  └── index.ts [UPDATE]

shared/types/features/analysis/
  ├── pretext-types.ts [UPDATE]
  ├── recommendation-types.ts [UPDATE]
  └── index.ts [UPDATE]

shared/types/domains/authentication/
  ├── user-types.ts [CREATE/UPDATE]
  └── index.ts [UPDATE]

shared/types/domains/safeguards/
  ├── moderation-types.ts [CREATE/UPDATE]
  └── index.ts [UPDATE]

shared/types/domains/monitoring/
  ├── analytics-types.ts [CREATE/UPDATE]
  ├── alerts-types.ts [CREATE/UPDATE]
  └── index.ts [UPDATE]
```

### Files to Update:
- shared/types/index.ts - Add new exports
- All server/features/*/domain/types.ts files - Remove local definitions, add imports
- server/features/*/application/*.ts - Update service file imports
- server/features/*/presentation/http/*.ts - Update route handler imports

## Verification Checklist

- [ ] All 50+ types migrated to @shared/types
- [ ] No local `interface` or `type` definitions in server/features
- [ ] All server imports from `@shared/types`
- [ ] TypeScript compilation succeeds
- [ ] ESLint boundary rules pass
- [ ] No circular dependencies introduced
- [ ] Client still imports correctly from @shared/types  
- [ ] Integration tests pass
- [ ] Git commit created with complete refactoring

## Estimated Impact
- Files to modify: 30+
- Types to migrate: 50+
- Lines of code affected: 2000+
- New shared/types files: 8
- Updated shared/types files: 7

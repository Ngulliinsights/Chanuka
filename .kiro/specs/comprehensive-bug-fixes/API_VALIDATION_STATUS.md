# API Validation Status

## Overview

This document tracks the status of API endpoint validation migration. All endpoints should use Zod schema validation via the validation middleware before processing requests.

**Requirement**: 5.6 - API endpoints must validate before processing

## Status Legend

- ✅ **Complete**: Endpoint uses validation middleware with Zod schemas
- ⚠️ **Partial**: Endpoint has some validation but not using middleware
- ❌ **Missing**: Endpoint has no validation or only manual validation
- 🔍 **Needs Review**: Endpoint needs to be checked

## Server API Endpoints

### Sponsors API (`server/features/sponsors/sponsors.routes.ts`)

| Method | Endpoint | Status | Schema | Notes |
|--------|----------|--------|--------|-------|
| GET | /api/sponsors | ❌ | Need ListSponsorsQuerySchema | Manual query param parsing |
| GET | /api/sponsors/:id | ❌ | Need GetSponsorParamsSchema | Manual ID parsing |
| POST | /api/sponsors | ❌ | Need CreateSponsorSchema | Manual field validation |
| PUT | /api/sponsors/:id | ❌ | Need UpdateSponsorSchema | Manual validation |
| POST | /api/sponsors/:id/affiliations | ❌ | Need CreateAffiliationSchema | Manual validation |
| PUT | /api/sponsors/:id/affiliations/:affiliationId | ❌ | Need UpdateAffiliationSchema | Manual validation |
| POST | /api/sponsors/:id/transparency | ❌ | Need CreateTransparencySchema | Manual validation |
| PUT | /api/sponsors/:id/transparency/:transparencyId | ❌ | Need UpdateTransparencySchema | Manual validation |
| POST | /api/sponsors/:id/transparency/:transparencyId/verify | ❌ | Need VerifyTransparencySchema | Manual validation |

### Users API (`server/features/users/application/`)

#### Profile Routes (`profile.ts`)

| Method | Endpoint | Status | Schema | Notes |
|--------|----------|--------|--------|-------|
| PATCH | /api/users/me | ❌ | Need UpdateProfileSchema | No validation middleware |
| PATCH | /api/users/me/basic | ❌ | Need UpdateBasicInfoSchema | No validation middleware |
| PATCH | /api/users/me/interests | ❌ | Need UpdateInterestsSchema | No validation middleware |
| PATCH | /api/users/me/preferences | ❌ | Need UpdatePreferencesSchema | No validation middleware |
| PATCH | /api/users/me/verification | ❌ | Need UpdateVerificationSchema | No validation middleware |
| POST | /api/users/me/engagement/:bill_id | ❌ | Need RecordEngagementSchema | No validation middleware |
| PUT | /api/users/preferences | ❌ | Need UpdatePreferencesSchema | No validation middleware |

#### Verification Routes (`verification.ts`)

| Method | Endpoint | Status | Schema | Notes |
|--------|----------|--------|--------|-------|
| POST | /api/users/verification | ❌ | Need CreateVerificationSchema | No validation middleware |
| PUT | /api/users/verification/:id | ❌ | Need UpdateVerificationSchema | No validation middleware |

### Privacy API (`server/features/privacy/privacy-routes.ts`)

| Method | Endpoint | Status | Schema | Notes |
|--------|----------|--------|--------|-------|
| PATCH | /api/privacy/preferences | ❌ | Need UpdatePrivacyPreferencesSchema | No validation middleware |
| POST | /api/privacy/data-export | ❌ | Need DataExportRequestSchema | No validation middleware |
| POST | /api/privacy/data-deletion | ❌ | Need DataDeletionRequestSchema | No validation middleware |
| POST | /api/privacy/cleanup | ❌ | Need CleanupRequestSchema | No validation middleware |
| PATCH | /api/privacy/retention-policies | ❌ | Need UpdateRetentionPoliciesSchema | No validation middleware |
| POST | /api/privacy/withdraw-consent | ❌ | Need WithdrawConsentSchema | No validation middleware |

### Search API (`server/features/search/SearchController.ts`)

| Method | Endpoint | Status | Schema | Notes |
|--------|----------|--------|--------|-------|
| POST | /api/search/admin/rebuild-index | ❌ | Need RebuildIndexSchema | No validation middleware |

### Recommendation API (`server/features/recommendation/RecommendationController.ts`)

| Method | Endpoint | Status | Schema | Notes |
|--------|----------|--------|--------|-------|
| POST | /api/recommendations/track-engagement | ❌ | Need TrackEngagementSchema | Manual validation |

## Client API Endpoints

### Client API Services (`client/src/core/api/`)

Client-side API calls should also validate request data before sending. This is tracked separately.

| Service | Status | Notes |
|---------|--------|-------|
| analyticsApiService | 🔍 | Needs review |
| billsApiService | 🔍 | Needs review |
| usersApiService | 🔍 | Needs review |
| commentsApiService | 🔍 | Needs review |

## Required Schemas to Create

### High Priority

1. **Sponsor Schemas** (`shared/validation/schemas/sponsor.schema.ts`)
   - CreateSponsorSchema
   - UpdateSponsorSchema
   - ListSponsorsQuerySchema
   - GetSponsorParamsSchema
   - CreateAffiliationSchema
   - UpdateAffiliationSchema
   - CreateTransparencySchema
   - UpdateTransparencySchema
   - VerifyTransparencySchema

2. **User Profile Schemas** (extend existing `user.schema.ts`)
   - UpdateProfileSchema
   - UpdateBasicInfoSchema
   - UpdateInterestsSchema
   - UpdatePreferencesSchema
   - UpdateVerificationSchema
   - RecordEngagementSchema

3. **Verification Schemas** (`shared/validation/schemas/verification.schema.ts`)
   - CreateVerificationSchema
   - UpdateVerificationSchema

### Medium Priority

4. **Privacy Schemas** (`shared/validation/schemas/privacy.schema.ts`)
   - UpdatePrivacyPreferencesSchema
   - DataExportRequestSchema
   - DataDeletionRequestSchema
   - CleanupRequestSchema
   - UpdateRetentionPoliciesSchema
   - WithdrawConsentSchema

5. **Search Schemas** (`shared/validation/schemas/search.schema.ts`)
   - RebuildIndexSchema
   - SearchQuerySchema

6. **Recommendation Schemas** (`shared/validation/schemas/recommendation.schema.ts`)
   - TrackEngagementSchema

## Progress Summary

- **Total Endpoints Identified**: 30+
- **Endpoints with Validation Middleware**: 0
- **Endpoints Needing Migration**: 30+
- **Schemas Created**: 4 (User, Bill, Comment, Common utilities)
- **Schemas Needed**: 20+

## Next Steps

1. Create high-priority schemas (Sponsor, User Profile, Verification)
2. Update high-priority endpoints to use validation middleware
3. Test updated endpoints with valid and invalid data
4. Create medium-priority schemas
5. Update remaining endpoints
6. Audit client-side API services

## Notes

- All new schemas should use `nonEmptyString()` helper for string fields
- All schemas should be exported from `shared/validation/schemas/index.ts`
- Validation middleware automatically handles error formatting
- After migration, remove manual validation code and helper functions
- Test each endpoint with empty strings and whitespace-only strings

## Completion Criteria

- ✅ All API endpoints use validation middleware
- ✅ All required schemas created and exported
- ✅ All manual validation code removed
- ✅ All endpoints tested with valid and invalid data
- ✅ Empty string validation working for all string fields
- ✅ Error responses follow consistent format

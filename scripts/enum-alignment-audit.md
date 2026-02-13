# Enum Alignment Audit Report

## Overview
This document audits all enum definitions across the codebase to identify misalignments between:
1. Shared TypeScript enums (`shared/types/core/enums.ts`)
2. Database Drizzle enums (`server/infrastructure/schema/enum.ts`)
3. Database CHECK constraints in migrations
4. Scattered enum definitions in other files

## Findings

### 1. UserRole Enum

**Shared (TypeScript):**
- Public, Citizen, VerifiedCitizen, Ambassador, Expert, ExpertVerifier, MpStaff, Clerk, Moderator, Admin, Auditor, Journalist

**Database (Drizzle):**
- citizen, verified_citizen, ambassador, expert_verifier, mp_staff, clerk, admin, auditor, journalist

**Misalignment:**
- ❌ Missing in DB: `public`, `expert`, `moderator`
- ✅ Aligned: citizen, verified_citizen, ambassador, expert_verifier, mp_staff, clerk, admin, auditor, journalist

### 2. BillStatus Enum

**Shared (TypeScript):**
- Draft, Introduced, FirstReading, SecondReading, InCommittee, CommitteeStage, ThirdReading, ScheduledForVote, Passed, PresidentialAssent, Enacted, Gazetted, Rejected, Lost, Vetoed, Withdrawn

**Database (Drizzle):**
- first_reading, second_reading, committee_stage, third_reading, presidential_assent, gazetted, withdrawn, lost, enacted

**Misalignment:**
- ❌ Missing in DB: `draft`, `introduced`, `in_committee`, `scheduled_for_vote`, `passed`, `rejected`, `vetoed`
- ✅ Aligned: first_reading, second_reading, committee_stage, third_reading, presidential_assent, gazetted, withdrawn, lost, enacted

### 3. Chamber Enum

**Shared (TypeScript):**
- NationalAssembly, Senate, CountyAssembly, Both

**Database (Drizzle):**
- national_assembly, senate, county_assembly

**Misalignment:**
- ❌ Missing in DB: `both`
- ✅ Aligned: national_assembly, senate, county_assembly

### 4. ArgumentPosition Enum

**Shared (TypeScript):**
- Support, Oppose, Neutral, Conditional

**Database (CHECK constraint in migration):**
- support, oppose, neutral, conditional

**Status:**
- ✅ Fully aligned (but should use pgEnum instead of CHECK constraint)

### 5. VerificationStatus Enum

**Shared (TypeScript):**
- Unverified, Pending, InProgress, NeedsReview, Verified, Approved, Failed, Rejected, Disputed

**Database (CHECK constraint in migration):**
- unverified, verified, disputed, false

**Misalignment:**
- ❌ Missing in DB: `pending`, `in_progress`, `needs_review`, `approved`, `failed`, `rejected`
- ❌ Extra in DB: `false` (should be `failed` or `rejected`)
- ⚠️ Should use pgEnum instead of CHECK constraint

### 6. Job Status (Argument Intelligence)

**Database (CHECK constraint in migration):**
- pending, processing, completed, failed
- pending, processing, complete, failed (inconsistent!)

**Status:**
- ❌ Not defined in shared enums
- ❌ Inconsistent values: `completed` vs `complete`
- ⚠️ Should be added to shared enums and use pgEnum

### 7. Relationship Type (Argument Intelligence)

**Database (CHECK constraint in migration):**
- supports, contradicts, clarifies, expands

**Status:**
- ❌ Not defined in shared enums
- ⚠️ Should be added to shared enums and use pgEnum

### 8. Severity Level

**Shared (TypeScript):**
- Info, Low, Medium, High, Critical

**Database (Drizzle):**
- info, low, medium, high, critical

**Database (CHECK constraint in migration):**
- low, medium, high, critical

**Misalignment:**
- ❌ CHECK constraint missing `info`
- ✅ Drizzle enum fully aligned

### 9. Comment Vote Type

**Database (CHECK constraint in old migration):**
- up, down

**Database (Drizzle):**
- upvote, downvote, report

**Misalignment:**
- ❌ Old migration uses `up`/`down` instead of `upvote`/`downvote`
- ⚠️ Old migration missing `report`

### 10. Payload Type (Audit Log)

**Database (CHECK constraint in migration):**
- action_details, resource_usage

**Status:**
- ❌ Not defined in shared enums
- ⚠️ Should be added to shared enums

## Recommendations

### High Priority
1. **Add missing values to database enums** to match shared TypeScript enums
2. **Replace CHECK constraints with pgEnum** for:
   - ArgumentPosition
   - VerificationStatus
   - JobStatus
   - RelationshipType
   - PayloadType
3. **Add missing enums to shared layer**:
   - JobStatus
   - RelationshipType
   - PayloadType

### Medium Priority
4. **Fix inconsistencies**:
   - Job status: `completed` vs `complete`
   - Comment vote: `up`/`down` vs `upvote`/`downvote`
5. **Update old migrations** to use consistent enum values

### Low Priority
6. **Document intentional differences** (if any exist)
7. **Create validation tests** to prevent future drift

## Action Plan

1. ✅ Create this audit document
2. ⏳ Update `shared/types/core/enums.ts` with missing enums
3. ⏳ Update `server/infrastructure/schema/enum.ts` with missing values
4. ⏳ Create migration to add missing enum values
5. ⏳ Update CHECK constraints to use pgEnum
6. ⏳ Update all references to use shared enums
7. ⏳ Run tests to verify alignment

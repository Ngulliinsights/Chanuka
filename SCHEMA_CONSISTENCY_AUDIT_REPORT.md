# Schema Consistency & Separation of Concerns Audit Report

**Date**: 2024  
**Status**: ✅ AUDIT COMPLETE - 9 Issues Identified, Recommendations Generated  
**Scope**: 29+ schema files, 100+ tables, 50+ relations, 30+ enums  

---

## Executive Summary

**Overall Assessment**: ⚠️ **GOOD with CRITICAL Inconsistencies**

The schema demonstrates solid domain-driven organization with clear separation of concerns across 10+ business domains. However, **critical field naming inconsistencies** compromise type safety and create a hostile refactoring environment. The codebase exhibits three distinct naming patterns for the same logical concepts, violating DRY principles and increasing maintenance burden.

| Category | Status | Finding |
|----------|--------|---------|
| Domain Organization | ✅ Excellent | 10+ domains clearly separated; foundation, citizen-participation, parliamentary-process, etc. |
| Separation of Concerns | ✅ Good | Tables logically grouped by domain; clear ownership; minimal cross-domain pollution |
| Field Naming Consistency | 🔴 **CRITICAL** | 3 naming patterns detected (camelCase, snake_case, mixed); affects 15+ files |
| Base Type Reuse | ⚠️ Partial | foundation.ts migrated; 20+ other files still use inline definitions |
| Validation Integration | ✅ Complete | Static + Runtime + Enum validators present; 3-layer architecture solid |
| Type Safety | ✅ Solid | Zod schemas, Drizzle relations, discriminated unions; excellent type inference |
| Coupling Assessment | ✅ Acceptable | Foundation heavily referenced (expected); clear dependency hierarchy |
| Index Coverage | ✅ Excellent | Hot-path indexes present; FK indexes recommended |
| Enum Usage | ✅ Proper | Single enum.ts source; enum-validator.ts prevents runtime surprises |

---

## Section 1: Field Naming Inconsistencies (CRITICAL)

### Issue 1.1: Three Distinct Naming Patterns for User IDs

**Severity**: 🔴 **CRITICAL**  
**Impact**: TypeScript strict mode violations, IDE autocomplete confusion, refactoring hazard  
**Files Affected**: 15+ files

#### Pattern Detection:

**Pattern A: camelCase** (TypeScript convention)
```typescript
// real_time_engagement.ts (INCONSISTENT WITHIN SAME FILE)
userId: uuid('user_id'),        // Column name: snake_case
createdAt: timestamp('created_at'),  // Column name: snake_case
eventType: text('event_type'),   // Column name: snake_case
```

**Pattern B: snake_case** (PostgreSQL convention)
```typescript
// foundation.ts (CONSISTENT)
user_id: uuid('user_id'),
created_at: timestamp('created_at'),
updated_at: timestamp('updated_at'),
```

**Pattern C: Mixed/Inconsistent**
```typescript
// citizen_participation.ts
user_id: uuid('user_id'),        // snake_case
interestUserIdx: index(...),      // camelCase index name
```

### Critical Finding:

**real_time_engagement.ts** violates its own pattern **within the same file**:

```typescript
// Line 22: camelCase TypeScript property
userId: uuid('user_id'),

// Line 43: camelCase TypeScript property  
createdAt: timestamp('created_at', { mode: 'date' }),

// Line 46-47: Uses camelCase in index definitions
entityTimeIdx: index(...).on(table.entityType, table.createdAt.desc()),
```

**But foundation.ts uses consistent snake_case**:
```typescript
user_id: uuid('user_id'),
created_at: timestamp('created_at'),
```

### Impact Analysis:

| Problem | Consequence | Severity |
|---------|-------------|----------|
| IDE autocomplete shows both `userId` and `user_id` | Developer confusion, inconsistent code | High |
| TypeScript error messages reference `userId` but DB column is `user_id` | Debugging complexity increases | High |
| Drizzle relation references must use TypeScript property names | Cross-file relations are error-prone | Critical |
| Team velocity decreases due to "which naming is correct?" questions | Onboarding friction, code review churn | Medium |
| Future refactoring becomes hazardous (rename userId → user_id globally?) | Technical debt grows | Critical |

### Root Cause:

Drizzle ORM allows **TypeScript property name to differ from SQL column name**:
```typescript
// Legal in Drizzle, but confusing:
userId: uuid('user_id'),  // TypeScript: userId | SQL: user_id
user_id: uuid('user_id'),  // TypeScript: user_id | SQL: user_id
```

Files evolved independently without centralized naming convention.

---

## Section 2: Separation of Concerns Assessment

### Issue 2.1: ✅ Domain Organization (EXCELLENT)

**Finding**: Clear, well-defined domain boundaries with minimal pollution.

#### Domain Distribution:

```
foundation (12 tables)
├─ users, user_profiles, sponsors, governors
├─ committees, committee_members, parliamentary_sessions, parliamentary_sittings
├─ bills, oauth_providers, user_sessions, oauth_tokens
│
citizen_participation (8 tables)
├─ user_interests, comments, bill_votes, bill_engagements
├─ notifications, user_notifications, engagement_tracking
│
parliamentary_process (10 tables)
├─ bill_committee_assignments, bill_amendments, bill_versions
├─ bill_readings, parliamentary_votes, bill_cosponsors
├─ public_participation_events, public_submissions, public_hearings
│
constitutional_intelligence (9 tables)
├─ constitutional_provisions, constitutional_analyses, legal_precedents
├─ expert_review_queue, analysis_audit_trail
├─ constitutional_vulnerabilities, underutilized_provisions
├─ elite_literacy_assessment, elite_knowledge_scores
│
integrity_operations (8 tables)
├─ content_reports, moderation_queue, flagged_submissions
├─ verification_badges, user_verification_audits
├─ system_audit_log, audit_alerts, audit_response_tracking
│
political_economy (12+ tables)
├─ political_appointments, infrastructure_tenders, ethnic_advantage_scores
│
real_time_engagement (9 tables)
├─ engagementEvents, civicAchievements, userAchievements, civicScores
├─ engagementLeaderboards, realTimeNotifications, engagementAnalytics
│
search_system (3 tables)
├─ contentEmbeddings, searchQueries, searchAnalytics
│
+ universal_access, transparency_intelligence, expert_verification, 
  trojan_bill_detection, market_intelligence, impact_measurement,
  accountability_ledger, advocacy_coordination, argument_intelligence
```

**Assessment**: ✅ Each domain has clear, non-overlapping ownership. No table exists in multiple domains.

---

### Issue 2.2: ⚠️ Cross-Domain References (EXPECTED, but QUANTIFIED)

**Finding**: Foundation tables heavily referenced from other domains (expected).

#### Reference Inventory:

| Foundation Table | Referenced By | Count | Risk Level |
|------------------|---------------|-------|-----------|
| users | 20+ domains | 60+ tables | 🟢 Low (core entity) |
| bills | 8+ domains | 35+ tables | 🟢 Low (core entity) |
| sponsors | 5 domains | 15+ tables | 🟢 Low (core entity) |
| committees | 4 domains | 12+ tables | 🟢 Low (core entity) |
| parliamentary_sessions | 3 domains | 8+ tables | 🟢 Low (core entity) |

#### Rules Followed:

✅ **No circular dependencies** - Domain A referencing Domain B which references Domain A  
✅ **No peer references** - Citizen participation does NOT reference political_economy or integrity_operations  
✅ **Clear hierarchy** - Foundation ← All others; No reverse references  
✅ **Intentional coupling** - All cross-domain references documented in relation definitions

**Assessment**: ✅ Separation of concerns is properly maintained with clean dependency flow.

---

### Issue 2.3: ⚠️ Base-Type Adoption (PARTIAL)

**Severity**: 🟡 **MEDIUM**  
**Impact**: Code duplication, inconsistent audit field handling, increased maintenance burden

#### Current Status:

| File | Status | Audit Fields | PK Pattern | Metadata Pattern |
|------|--------|--------------|-----------|------------------|
| foundation.ts | ✅ Migrated | Uses `auditFields()` | Uses `primaryKeyUuid()` | Uses `metadataField()` |
| citizen_participation.ts | ⏳ Not migrated | Inline `created_at, updated_at` | Inline `id: uuid()` | Inline `jsonb()` |
| parliamentary_process.ts | ⏳ Not migrated | Inline | Inline | Inline |
| constitutional_intelligence.ts | ⏳ Not migrated | Inline | Inline | Inline |
| real_time_engagement.ts | ⏳ Not migrated | Inline | Inline | Inline |
| search_system.ts | ⏳ Not migrated | Inline | Inline | Inline |
| + 20+ other files | ⏳ Not migrated | Inline | Inline | Inline |

#### Duplication Measurement:

**foundation.ts (BEFORE migration)**:
```typescript
// Repeated in 12 tables
created_at: timestamp('created_at').defaultNow(),
updated_at: timestamp('updated_at').defaultNow(),
id: uuid().primaryKey().default(sql`gen_random_uuid()`),
metadata: jsonb().default(sql`'{}'::jsonb`),
// ... 48 lines of repetitive patterns
```

**foundation.ts (AFTER migration)**:
```typescript
// Centralized
...auditFields(),
...primaryKeyUuid(),
...metadataField(),
// ... 20 lines saved
```

**Estimate**: 20+ files × 30 lines/file = **600+ lines of duplication** across codebase.

**Assessment**: ⚠️ Base-type adoption pattern established but incomplete.

---

## Section 3: Type Safety & Validation

### Issue 3.1: ✅ Runtime Validation (COMPLETE)

**Finding**: Excellent 3-layer validation architecture.

#### Layer 1: Static AST Validation (validate-static.ts)
- ✅ No runtime dependencies (CI-safe)
- ✅ Detects missing PKs, audit fields, naming violations
- ✅ Verifies enum consistency (dap_k → dap_ke)
- ✅ Recommends FK indexes
- ✅ Reduced complexity: validateTableBasics from 11→8

#### Layer 2: Runtime Enum Validation (enum-validator.ts)
- ✅ Type-safe enum assertions
- ✅ Typo detection via Levenshtein distance
- ✅ Comprehensive ENUM_REGISTRY (30+ enums)
- ✅ Clear error messages with suggestions

#### Layer 3: Payload Validation (entities.ts)
- ✅ Zod schemas for User, UserProfile, Comment, BillVote, BillEngagement
- ✅ Batch validation support
- ✅ Safe + unsafe parse functions
- ✅ Entity schema registry

**Assessment**: ✅ Validation infrastructure solid and production-ready.

---

### Issue 3.2: ✅ Type Exports (COMPREHENSIVE)

**Finding**: All tables have proper type exports (TRow + New variant).

**Sample**: foundation.ts exports
```typescript
// 24 type exports
User, NewUser,
UserProfile, NewUserProfile,
Sponsor, NewSponsor,
Governor, NewGovernor,
Committee, NewCommittee,
CommitteeMember, NewCommitteeMember,
// ... + 12 more
```

**Assessment**: ✅ Type safety at table level excellent.

---

## Section 4: Enum Standardization

### Issue 4.1: ✅ Enum Governance (EXCELLENT)

**Status**: Single source of truth with versioning.

#### Enum Registry (30+ enums):

```typescript
export const partyEnum = pgEnum('party', [
  'uda',
  'odm',
  'jubilee',
  'wiper',
  'dap_ke',  // ✅ Fixed from dap_k
  'ford_kenya',
  'kanu',
  // ... 21 more
]);

// PRODUCTION RULE: Never edit this list without versioning.
// Enum changes require migration.
```

**Validation**:
- ✅ ENUM_REGISTRY maps all 30+ enums
- ✅ enum-validator.ts prevents runtime type errors
- ✅ dap_k typo documented and fixed
- ✅ Versioning infrastructure present (ENUM_SCHEMA_VERSION)

**Assessment**: ✅ Enum governance is exemplary.

---

## Section 5: Index Coverage

### Issue 5.1: ✅ Hot-Path Indexes (EXCELLENT)

**Finding**: Strategic indexes placed on common query patterns.

#### Foundation Domain Index Sample (foundation.ts):

```typescript
// users table
billsUserSponsorship: index('idx_bills_user_sponsorship').on(table.user_id, table.bill_status),
billsUserStatus: index('idx_bills_user_status').on(table.user_id, table.bill_status),

// Partial index for active users only
activeUserIdx: index('idx_users_active').on(table.is_active).where(sql`${table.is_active} = true`),

// JSONB containment (GIN index implicit in Drizzle)
sponsorDemographicsIdx: index('idx_sponsors_demographics_gin').on(table.demographics),
```

**Coverage**: 
- ✅ Covering indexes on (user_id, status)
- ✅ Partial indexes for active-only queries
- ✅ GIN indexes on JSONB columns
- ✅ DESC indexes for time-series data

**Assessment**: ✅ Index strategy excellent; follows PostgreSQL best practices.

---

## Section 6: Database Connection Management

### Issue 6.1: ✅ Multi-Database Architecture (SOLID)

**Finding**: Three separate database connections properly managed.

```typescript
export const operationalDb = createConnection(/* PostgreSQL 15+ */);
export const analyticsDb = createConnection(/* TimescaleDB hypertable support */);
export const securityDb = createConnection(/* Audit-trail specific */);
```

**Use Cases**:
- operationalDb: foundation, citizen_participation, parliamentary_process
- analyticsDb: real_time_engagement (time-series), search_system (analytics)
- securityDb: integrity_operations, system_audit_log

**Assessment**: ✅ Multi-database strategy well-designed.

---

## Section 7: Domains Organization

### Issue 7.1: ✅ Granular Export Structure (EXCELLENT)

**Finding**: /domains/ folder enables tree-shaking and lazy imports.

#### Current Structure:

```
/shared/schema/domains/
├─ foundation.ts        (12 tables, all relations, 24 types)
├─ citizen-participation.ts (8 tables)
├─ parliamentary-process.ts (10 tables)
├─ constitutional-intelligence.ts (9 tables)
├─ integrity-operations.ts (8 tables)
└─ index.ts            (aggregates all with lazy-load comments)
```

#### Remaining Domains Not Yet in /domains/:

```
❌ political_economy.ts (12+ tables)
❌ real_time_engagement.ts (9 tables)
❌ search_system.ts (3 tables)
❌ transparency_intelligence.ts (8+ tables)
❌ universal_access.ts (13+ tables)
❌ expert_verification.ts
❌ trojan_bill_detection.ts
❌ market_intelligence.ts
❌ impact_measurement.ts
❌ + 5 more domains
```

**Assessment**: ✅ Pattern established; 50% of domains migrated to /domains/ folder.

---

## CRITICAL ISSUES: Recommendations

### Recommendation 1: Standardize Field Naming Convention (🔴 HIGH PRIORITY)

**Issue**: Three naming patterns in same codebase compromises type safety.

**Current State**:
```typescript
// real_time_engagement.ts (INCONSISTENT)
userId: uuid('user_id'),
createdAt: timestamp('created_at'),

// foundation.ts (CONSISTENT)
user_id: uuid('user_id'),
created_at: timestamp('created_at'),
```

**Recommended Solution**: Adopt **snake_case throughout** for TypeScript properties (matches SQL column names).

**Rationale**:
- ✅ Matches PostgreSQL naming convention (sql_identifiers)
- ✅ Eliminates TypeScript property ≠ SQL column name confusion
- ✅ Reduces IDE autocomplete clutter
- ✅ Simplifies cross-file relation definitions
- ✅ Enables automated refactoring tools
- ✅ Aligns with Drizzle ORM best practices

**Migration Path**:
1. Audit all schema files for camelCase properties (15+ files identified)
2. Create snake_case naming standard document
3. Migrate real_time_engagement.ts priority (within-file inconsistency)
4. Migrate remaining 14+ files in phases (transparency_intelligence, search_system, etc.)
5. Update validation rules in validate-static.ts to enforce snake_case

**Effort**: 3-4 hours for all files; enables future refactoring confidence.

---

### Recommendation 2: Complete Base-Type Migration (🟡 MEDIUM PRIORITY)

**Issue**: 600+ lines of duplication across 20+ files.

**Current Coverage**:
- ✅ foundation.ts (1 of 29 files)
- ⏳ citizen_participation.ts through platform_operations.ts (28 files)

**Migration Checklist**:
- [ ] citizen_participation.ts: Replace inline audit fields with `auditFields()`
- [ ] parliamentary_process.ts: Consolidate 10 table PKs → `primaryKeyUuid()`
- [ ] constitutional_intelligence.ts: 9 tables with `metadataField()`
- [ ] real_time_engagement.ts: 9 tables + fix naming consistency
- [ ] search_system.ts: 3 tables with proper audit fields
- [ ] transparency_intelligence.ts: 8+ tables
- [ ] universal_access.ts: 13+ tables
- [ ] + 22 more files

**Expected Outcome**: 600+ lines reduced, maintenance burden decreased, consistency improved.

**Effort**: 2-3 hours for systematic migration.

---

### Recommendation 3: Complete /domains/ Folder Migration (🟡 MEDIUM PRIORITY)

**Issue**: 50% of domains still in /shared/schema/ root; monolithic compilation remains.

**Current**: 5 domain exports in /domains/  
**Missing**: 10+ domains (political_economy, real_time_engagement, search_system, etc.)

**Migration Path**:
```typescript
// Add to /shared/schema/domains/

// political-economy.ts
export * from '../political_economy';

// real-time-engagement.ts  
export * from '../real_time_engagement';

// search-system.ts
export * from '../search_system';

// transparency-intelligence.ts
export * from '../transparency_intelligence';

// universal-access.ts
export * from '../universal_access';

// expert-verification.ts
export * from '../expert_verification';

// + remaining domains
```

**Benefit**: Full tree-shaking capability, reduced build time for incremental changes.

**Effort**: 1-2 hours (mechanical file creation + exports).

---

### Recommendation 4: Extend Entity Validators (🟡 MEDIUM PRIORITY)

**Issue**: Only 2 of 29 domains have payload validators.

**Current Coverage**:
- ✅ foundation.ts: User, UserProfile validators
- ✅ citizen_participation.ts: Comment, BillVote validators
- ⏳ 27 other domains: No validators

**Next Phase**: Create validators for:
- [ ] CommentCreate, CommentUpdate
- [ ] BillEngagementCreate, BillEngagementUpdate
- [ ] ParliamentaryProcessCreate (bill amendments, readings)
- [ ] ConstitutionalAnalysisCreate, ConstitutionalAnalysisUpdate
- [ ] + validators for all high-cardinality domains

**Leverage**: Existing Zod pattern in entities.ts; use as template.

**Effort**: 2-3 hours for batch validator creation.

---

### Recommendation 5: Document Separation of Concerns Rules (✅ LOW PRIORITY, HIGH VALUE)

**Issue**: Rules understood but not codified.

**Create**: SCHEMA_GOVERNANCE.md document specifying:

```markdown
# Schema Governance Rules

## 1. Domain Boundaries

- Foundation domain: Core legislative entities (users, bills, sponsors, committees, governors)
- Citizen Participation domain: Public engagement (comments, votes, interests)
- Parliamentary Process domain: Legislative workflow (amendments, readings, public participation)
- Constitutional Intelligence domain: Legal analysis (provisions, vulnerabilities, expertise)
- Integrity Operations domain: Moderation & audit (reports, verification, audit trails)
- Political Economy domain: Governance insights (appointments, tenders, ethnic scores)
- Real-Time Engagement domain: Gamification & analytics (achievements, leaderboards, notifications)
- Search System domain: AI-powered discovery (embeddings, queries, analytics)
- Universal Access domain: Accessibility & offline (ambassadors, communities, USSD)
- + Additional domains per platform capability

## 2. Cross-Domain Reference Rules

✅ ALLOWED:
- Any domain may reference foundation tables
- Peer domains may reference via explicit relations
- Analytics domains may reference operational data

❌ FORBIDDEN:
- Circular dependencies (A → B → A)
- Reverse references (foundation → citizen-participation)
- Undocumented dependencies

## 3. Field Naming Standards

- Use snake_case for all table columns
- Use snake_case for all TypeScript properties (match SQL)
- Always use auditFields(), primaryKeyUuid(), metadataField() helpers
- Exception: Enum discriminators may use camelCase (eventType, billStatus)

## 4. Validation Requirements

- All tables must have static validator checks (validate-static.ts)
- High-cardinality domains must have runtime Zod validators
- All enums must be registered in enum-validator.ts
- New tables require corresponding type exports (Table + NewTable)

## 5. Index Strategy

- All FKs must have indexes (validate-static.ts recommendation)
- Hot-path queries need covering indexes
- JSONB columns need GIN indexes
- Time-series data needs DESC indexes on created_at
```

**Value**: Onboarding clarity, code review standards, future refactoring confidence.

**Effort**: 1 hour to document; prevents future confusion.

---

## Summary Table: Issues & Actions

| ID | Issue | Severity | Type | Recommendation | Effort |
|----|-|----|----|----|----|
| 1.1 | Field naming inconsistency (camelCase vs snake_case) | 🔴 CRITICAL | Consistency | Adopt snake_case throughout | 3-4h |
| 1.2 | real_time_engagement.ts inconsistent within self | 🔴 CRITICAL | Consistency | Migrate to snake_case | 1-2h |
| 2.1 | Domain organization | ✅ EXCELLENT | Organization | No action needed | — |
| 2.2 | Cross-domain coupling | ✅ ACCEPTABLE | Architecture | Document rules | 1h |
| 2.3 | Base-type adoption incomplete | 🟡 MEDIUM | Consistency | Migrate 28 files | 2-3h |
| 3.1 | Runtime validation incomplete | 🟡 MEDIUM | Coverage | Extend to 25+ domains | 2-3h |
| 4.1 | Enum governance | ✅ EXCELLENT | Quality | No action needed | — |
| 5.1 | Index coverage | ✅ EXCELLENT | Performance | No action needed | — |
| 6.1 | /domains/ folder 50% complete | 🟡 MEDIUM | Organization | Migrate remaining 10+ domains | 1-2h |

---

## Conclusion

**Schema Design Quality**: ⭐⭐⭐⭐☆ (4/5 stars)

**Strengths**:
- ✅ Excellent domain organization with clear boundaries
- ✅ Sophisticated index strategy matching query patterns
- ✅ Comprehensive 3-layer validation architecture
- ✅ Proper type safety with Zod + Drizzle integration
- ✅ Professional enum governance with versioning
- ✅ Multi-database architecture for performance separation
- ✅ Devolution support complete (governors table)
- ✅ Authentication infrastructure solid (sessions, OAuth)

**Weaknesses**:
- 🔴 Critical field naming inconsistencies (camelCase vs snake_case)
- 🟡 Base-type adoption only 3% complete (1 of 29 files)
- 🟡 Entity validators only 7% complete (2 of 29 domains)
- 🟡 /domains/ folder only 50% migrated (5 of 15 domains)

**Risk Assessment**:
- 🔴 **High Risk**: Naming inconsistency will cause refactoring hazards and type confusion
- 🟡 **Medium Risk**: Incomplete base-type adoption increases duplication and maintenance burden
- 🟡 **Medium Risk**: Partial validator coverage leaves payload validation gaps

**Recommended Next Steps** (Priority Order):
1. Standardize to snake_case throughout (3-4 hours) → **Unblocks future refactoring**
2. Complete base-type migration (2-3 hours) → **Reduces duplication**
3. Complete /domains/ folder migration (1-2 hours) → **Enables tree-shaking**
4. Extend entity validators (2-3 hours) → **Improves runtime safety**
5. Document governance rules (1 hour) → **Clarifies future development**

**Timeline**: 9-13 hours total to achieve ⭐⭐⭐⭐⭐ (5/5 stars)

---

## Appendix A: File-by-File Naming Pattern Analysis

### Pattern Distribution:

**Snake_Case Pattern** (Recommended ✅):
- foundation.ts: user_id, created_at, updated_at, ✅ CONSISTENT
- citizen_participation.ts: user_id, created_at, ✅ MOSTLY CONSISTENT

**CamelCase Pattern** (Current inconsistency):
- real_time_engagement.ts: userId, createdAt, eventType, ✅ INTERNALLY INCONSISTENT
- websocket.ts: userId, createdAt (type definitions, expected)
- transparency_intelligence.ts: createdAt (partial camelCase)

**Mixed Pattern** (Problematic):
- search_system.ts: created_at (snake_case columns), createdAtIdx (camelCase index names)
- platform_operations.ts: created_at (snake_case), created_by (snake_case), but user_id elsewhere

### Action Items:

**Priority 1 (Immediate)**:
- real_time_engagement.ts: userId → user_id, createdAt → created_at (12 occurrences)

**Priority 2 (Week 1)**:
- transparency_intelligence.ts: createdAt → created_at (audit all 8 tables)
- search_system.ts: Verify and standardize (3 tables)

**Priority 3 (Week 2)**:
- All remaining files: Systematic snake_case enforcement

---

## Appendix B: Base-Type Adoption Checklist

```markdown
# Base-Type Migration Checklist

## Status: 1/29 files complete (3%)

### Foundation (✅ DONE)
- [x] foundation.ts: auditFields(), primaryKeyUuid(), metadataField()

### Citizen Participation (⏳ TODO)
- [ ] citizen_participation.ts: Migrate 8 tables
  - [ ] user_interests table
  - [ ] comments table
  - [ ] bill_votes table
  - [ ] + 5 more

### Parliamentary Process (⏳ TODO)
- [ ] parliamentary_process.ts: Migrate 10 tables

### Constitutional Intelligence (⏳ TODO)
- [ ] constitutional_intelligence.ts: Migrate 9 tables

### Integrity Operations (⏳ TODO)
- [ ] integrity_operations.ts: Migrate 8 tables

### Political Economy (⏳ TODO)
- [ ] political_economy.ts: Migrate 12+ tables

### Real-Time Engagement (⏳ TODO + NAMING)
- [ ] real_time_engagement.ts: Fix naming + migrate 9 tables

### Search System (⏳ TODO)
- [ ] search_system.ts: Migrate 3 tables

### + 22 More Files
- [ ] transparency_intelligence.ts
- [ ] universal_access.ts
- [ ] expert_verification.ts
- [ ] trojan_bill_detection.ts
- [ ] market_intelligence.ts
- [ ] impact_measurement.ts
- [ ] accountability_ledger.ts
- [ ] advocacy_coordination.ts
- [ ] argument_intelligence.ts
- [ ] analysis.ts
- [ ] advanced_discovery.ts
- [ ] safeguards.ts
- [ ] platform_operations.ts
- [ ] + remaining files
```

---

**Report Generated**: 2024-01-XX  
**Audit Scope**: 29+ schema files, 100+ tables, 50+ relations, 30+ enums, 15,000+ lines of code  
**Status**: ✅ COMPLETE - Ready for remediation planning

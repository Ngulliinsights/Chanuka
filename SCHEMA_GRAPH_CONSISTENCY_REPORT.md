# Schema ↔ Graph Consistency Report

**Generated**: January 8, 2026  
**Scope**: `/shared/schema` (PostgreSQL) vs `/shared/database/graph` (Neo4j)  
**Status**: ⚠️ **INCONSISTENT** - Multiple critical misalignments found

---

## Executive Summary

The PostgreSQL schema and Neo4j graph schema are **not synchronized**. The graph layer is incomplete, with missing entities, fields, and relationships. This creates data integrity risks and potential sync failures.

### Key Findings
- **Missing Graph Entities**: 8+ PostgreSQL tables have no Neo4j equivalents
- **Field Gaps**: 100+ fields in PostgreSQL tables are missing from Neo4j nodes
- **Relationship Gaps**: Numerous PostgreSQL foreign keys lack graph relationships
- **Type Inconsistencies**: PostgreSQL enums vs Neo4j string fields
- **No Sync Strategy**: No documented mapping between systems

---

## Section 1: Entity Mapping Analysis

### 1.1 PostgreSQL Entities vs Neo4j Nodes

| PostgreSQL Table | Neo4j Node | Status | Issues |
|---|---|---|---|
| `users` | ❌ MISSING | **CRITICAL** | No User/Citizen node; `PersonNode` is underspecified |
| `user_profiles` | ❌ MISSING | **CRITICAL** | Profile data unmapped |
| `sponsors` (MPs) | ✓ `PersonNode` | **PARTIAL** | Type='mp' only; missing fields |
| `governors` | ❌ MISSING | **CRITICAL** | Merged into PersonNode without distinction |
| `bills` | ✓ `BillNode` | **PARTIAL** | Missing fields (status, chamber, sponsor_id) |
| `committees` | ✓ `CommitteeNode` | **PARTIAL** | Missing chair_id, chamber, members |
| `parliamentary_sessions` | ❌ MISSING | **CRITICAL** | No Session node |
| `parliamentary_sittings` | ❌ MISSING | **CRITICAL** | No Sitting node |
| `user_sessions` | ❌ MISSING | **MAJOR** | Session management unmapped |
| `oauth_providers` | ❌ MISSING | **MAJOR** | Auth data unmapped |
| `oauth_tokens` | ❌ MISSING | **MAJOR** | Auth data unmapped |
| `argumentTable` (arguments) | ✓ `ArgumentNode` | **PARTIAL** | Missing fields (position, strength_score, confidence_score) |
| `claims` | ❌ MISSING | **MAJOR** | No Claim node |
| `user_interests` | ❌ MISSING | **MAJOR** | User preferences unmapped |
| (citizen_participation tables) | ❌ MISSING | **MAJOR** | Comments, votes, engagement unmapped |

**Total**: 14 PostgreSQL tables → 6 Neo4j nodes (57% coverage, **43% missing**)

---

## Section 2: Field-Level Inconsistencies

### 2.1 `PersonNode` vs `sponsors` + `governors` Tables

#### Neo4j PersonNode Fields
```typescript
id, name, type ('mp' | 'citizen' | 'expert' | 'official'),
email?, county?, party?, phone?, created_at, updated_at
```

#### PostgreSQL `sponsors` Fields
```typescript
id, name, name_normalized, ethnicity, gender, date_of_birth, age,
party, previous_parties, coalition, county, constituency, ward, chamber,
mp_number, position, role, bio, education, professional_background,
photo_url, website, email, phone, office_location, social_media,
financial_disclosures, last_disclosure_date, has_pending_cases, integrity_issues,
voting_record, attendance_rate, bills_sponsored_count, bills_passed_count,
questions_asked_count, motions_moved_count, public_rating, rating_count,
follower_count, term_start, term_end, election_date, is_active, retirement_reason,
created_at, updated_at
```

#### Missing PersonNode Fields
```
✗ name_normalized (search optimization)
✗ ethnicity (political economy analysis)
✗ gender (demographic analysis)
✗ date_of_birth, age (age-based queries)
✗ previous_parties, coalition (political history)
✗ constituency, ward (geographic precision)
✗ chamber (senate vs national assembly distinction)
✗ mp_number (official ID)
✗ position, role (job title)
✗ bio, education, professional_background (biography)
✗ photo_url, website (public profile)
✗ office_location, social_media (contact)
✗ financial_disclosures (transparency analysis)
✗ integrity_issues (governance quality)
✗ voting_record, attendance_rate (performance)
✗ bills_sponsored_count, bills_passed_count (legislative output)
✗ public_rating, rating_count, follower_count (popularity)
✗ term tracking (term_start, term_end, election_date, is_active)
✗ retirement_reason (career transitions)
```

**Impact**: Cannot perform demographic analysis, political economy analysis, or performance tracking via graph

---

### 2.2 `BillNode` vs `bills` Table

#### Neo4j BillNode Fields
```typescript
id, title, number, status, chamber, sponsor_id?, introduced_date,
created_at, updated_at
```

#### PostgreSQL `bills` Fields
```typescript
id, bill_number, title, title_normalized, summary, full_text, full_text_word_count,
bill_type, status, previous_status, status_changed_at,
introduced_date, last_action_date, days_since_introduction, expected_completion_date,
chamber, parliament_session, reading_stage,
sponsor_id, co_sponsors, co_sponsors_count,
committee, committee_id, committee_report_url, committee_report_date, committee_recommendation,
governor_id, affected_counties, affected_counties_count, impact_areas,
public_participation_required, public_participation_date, public_participation_venue, public_participation_status, public_submissions_count,
view_count, unique_viewers_count, comment_count, share_count, bookmark_count,
vote_count_for, vote_count_against, vote_count_neutral,
engagement_score, trending_score,
sentiment_score, sentiment_magnitude, positive_mentions, negative_mentions, neutral_mentions,
category, sub_category, tags, primary_sector,
external_urls, related_bills, amendments, metadata,
constitutional_analysis_status, argument_synthesis_status, trojan_detection_status, last_ai_analysis_at,
controversy_score, quality_score,
is_urgent, is_money_bill, is_constitutional_amendment, priority_level,
search_vector, created_at, updated_at
```

#### Missing BillNode Fields
```
✗ bill_number (official ID, unique)
✗ title_normalized (search)
✗ summary, full_text, full_text_word_count (content)
✗ bill_type, previous_status, status_changed_at (status workflow)
✗ last_action_date, days_since_introduction, expected_completion_date (timeline)
✗ parliament_session, reading_stage (legislative process)
✗ co_sponsors, co_sponsors_count (multiple sponsors)
✗ committee, committee_id, committee_report_url, committee_report_date, committee_recommendation (committee review)
✗ governor_id, affected_counties, impact_areas (devolution & impact)
✗ public_participation_* (citizen engagement)
✗ engagement metrics (view_count, comment_count, vote counts)
✗ engagement_score, trending_score (ranking)
✗ sentiment analysis (sentiment_score, positive_mentions, etc.)
✗ categorization (category, sub_category, tags, primary_sector)
✗ external_urls, related_bills, amendments (relationships)
✗ AI analysis status (analysis_status fields)
✗ controversy_score, quality_score (quality metrics)
✗ urgency flags (is_urgent, is_money_bill, is_constitutional_amendment, priority_level)
✗ search_vector (full-text search)
```

**Impact**: Graph cannot answer: trending bills, bill impact analysis, engagement patterns, sentiment analysis, or quality rankings

---

### 2.3 Enum Type Inconsistencies

| Concept | PostgreSQL | Neo4j | Issue |
|---|---|---|---|
| Bill Status | `billStatusEnum` (strict) | `string` in BillNode | No validation; missing statuses like 'enacted', 'gazetted' |
| Chamber | `chamberEnum` (strict) | `string` in BillNode | No enum in Neo4j |
| Party | `partyEnum` (strict) | `string` in PersonNode | No enum; inconsistent values possible |
| Gender | `check` constraint | Not in PersonNode | Missing field entirely |
| User Role | `userRoleEnum` (strict) | Not in PersonNode | Missing field |
| Anonymity | `anonymityLevelEnum` (strict) | Not mapped | Missing field |

**Impact**: Data validation gaps; sync conflicts possible

---

## Section 3: Relationship Mapping Analysis

### 3.1 PostgreSQL Foreign Keys vs Neo4j Relationships

#### Bills → Sponsors
- **PostgreSQL**: `bills.sponsor_id` → `sponsors.id` (foreign key)
- **Neo4j**: `createSponsorshipRelationship()` with type='primary|co-sponsor'
- **Issue**: `co_sponsors` array in PostgreSQL not handled; only sponsor_id mapped

#### Bills → Committees
- **PostgreSQL**: `bills.committee_id` → `committees.id` (foreign key)
- **Neo4j**: `createBillAssignmentRelationship()` → `ASSIGNED_TO`
- **Status**: ✓ Mapped

#### Bills → Governors
- **PostgreSQL**: `bills.governor_id` → `governors.id` (foreign key)
- **Neo4j**: Not mapped (governor has no distinct node)
- **Issue**: Governor assent workflow not represented

#### Sponsors → Committees
- **PostgreSQL**: `committee_members` junction table (many-to-many)
- **Neo4j**: `createCommitteeMembershipRelationship()` → `MEMBER_OF`
- **Status**: ✓ Mapped

#### Bills → Bills (related_bills)
- **PostgreSQL**: `bills.related_bills` array column
- **Neo4j**: No relationship type defined
- **Issue**: Related bill discovery missing

#### Users → Bills (engagement)
- **PostgreSQL**: `citizen_participation` tables (comments, votes, etc.)
- **Neo4j**: Not mapped; no engagement relationships
- **Issue**: User engagement graph not built

#### Users → Interests
- **PostgreSQL**: `user_interests` table
- **Neo4j**: Not mapped
- **Issue**: Recommendation engine cannot work

#### Bills → Arguments
- **PostgreSQL**: `argumentTable.bill_id` → `bills.id` (foreign key)
- **Neo4j**: `createArgumentRelationship()` → `ABOUT`
- **Status**: ✓ Mapped

#### Arguments → Claims
- **PostgreSQL**: `arguments.source_comments`, `claims.supporting_arguments` (arrays)
- **Neo4j**: Not mapped
- **Issue**: Argument-to-claim relationships missing

#### Bills → Topics/Categories
- **PostgreSQL**: `bills.tags`, `bills.category`, `bills.primary_sector`
- **Neo4j**: `createTopicMentionRelationship()` → `MENTIONS_TOPIC`
- **Issue**: TopicNode not populated; tag graph not built

#### Person → Organization (financial interests)
- **PostgreSQL**: `financial_disclosures` JSONB column (implicit)
- **Neo4j**: `createOrUpdateFinancialInterest()` → `HAS_FINANCIAL_INTEREST`
- **Status**: ✓ Defined but not populated

#### Person → Person (voting coalitions)
- **PostgreSQL**: Implicit (voting patterns derived from `voting_record`)
- **Neo4j**: `createVotingCoalitionRelationship()` → `VOTING_COALITION`
- **Issue**: Voting data not synchronized; relationship logic missing

---

### 3.2 Missing Neo4j Relationships

| Relationship | Source | Target | Current Status |
|---|---|---|---|
| User wrote | User | Comment | ❌ Not implemented |
| User commented | User | Bill | ❌ Not implemented |
| User voted | User | Bill | ❌ Not implemented (VotingRelationship defined but unused) |
| User supports | User | Bill | ❌ Not implemented |
| User follows | User | Bill | ❌ Not implemented |
| User interested in | User | Topic | ❌ Not implemented |
| Comment cites | Comment | Bill | ❌ Not implemented |
| Comment supports/opposes | Comment | Argument | ❌ Not implemented |
| Bill amends | Bill | Bill | ❌ Not implemented |
| Committee reviews | Committee | Bill | ✓ Mapped (ASSIGNED_TO) |
| Session contains | Session | Sitting | ❌ Not implemented (no Session node) |

**Impact**: Cannot build: engagement graph, recommendation engine, influence network, or argument traceability

---

## Section 4: Sync Logic Analysis

### 4.1 Current Sync Status

#### What's Implemented
- `syncEntity()` - Generic entity synchronization
- `syncRelationship()` - Generic relationship synchronization
- `syncPersonToGraph()`, `syncBillToGraph()`, etc. - Entity-specific wrappers
- Relationship creation functions for: `SPONSORED`, `MEMBER_OF`, `ASSIGNED_TO`, `MENTIONS_TOPIC`, `ABOUT`, `HAS_FINANCIAL_INTEREST`, `VOTED`, `VOTING_COALITION`, `AFFILIATED_WITH`, `REFERENCES`

#### What's Missing
1. **No trigger-based sync**: PostgreSQL triggers to automatically sync Neo4j
2. **No incremental sync**: No change capture (CDC) mechanism
3. **No conflict resolution**: No strategy for data divergence
4. **No delete sync**: No cascade delete or soft-delete mapping
5. **No array field handling**: `co_sponsors`, `related_bills`, `tags`, etc. not synced
6. **No JSONB mapping**: `financial_disclosures`, `voting_record`, `metadata` etc. not synced
7. **No multi-table sync**: No orchestration for related entity sync (e.g., sponsor → bills → committees)

---

## Section 5: Critical Gaps

### 5.1 TIER 1: Core Functionality Missing

- [ ] **User Node** - No user engagement tracking; recommendation engine cannot work
- [ ] **User Profile** - User interest tracking not mapped
- [ ] **Parliamentary Session/Sitting** - Timeline/process tracking missing
- [ ] **Governor Node** - Devolution workflow not tracked
- [ ] **Comments** - Citizen participation not in graph
- [ ] **User Engagement** - No voting, bookmarking, sharing in graph
- [ ] **Arguments ↔ Claims** - Argument synthesis incomplete

### 5.2 TIER 2: Analysis Capability Missing

- [ ] **Co-sponsors** - Multiple sponsor tracking incomplete
- [ ] **Related Bills** - Bill network analysis impossible
- [ ] **User Interests** - Personalization impossible
- [ ] **Sentiment Analysis** - Engagement sentiment not in graph
- [ ] **Controversy Tracking** - Controversy score not synced
- [ ] **Tag/Topic Graph** - Category network missing
- [ ] **Performance Metrics** - Sponsor metrics not available for graph queries

### 5.3 TIER 3: Data Quality Issues

- [ ] **Enum Validation** - String fields instead of constrained enums
- [ ] **Field Completeness** - 100+ fields missing from graph
- [ ] **Audit Trail** - No sync status tracking
- [ ] **Data Provenance** - No indication of sync staleness

---

## Section 6: Recommendations

### Phase 1: Immediate (Week 1)
1. **Create missing core nodes**: User, Governor, Session, Sitting, Claim
2. **Define entity mapping document**: Explicit PostgreSQL-to-Neo4j field mappings
3. **Implement sync tracking**: Table to track which entities have been synced

### Phase 2: Short-term (Weeks 2-3)
1. **Implement trigger-based sync**: PostgreSQL triggers on insert/update
2. **Handle array fields**: `co_sponsors`, `tags`, `related_bills` → relationships
3. **Map JSONB fields**: Extract key fields from `financial_disclosures`, `voting_record`, `metadata`
4. **Add enum validation**: Create enums in Neo4j OR add constraints in sync

### Phase 3: Medium-term (Weeks 4-6)
1. **Engagement graph**: Sync comments, votes, bookmarks
2. **User interest graph**: Build recommendation engine
3. **Conflict detection**: Identify diverged data
4. **Performance optimization**: Partial/incremental syncs

### Phase 4: Long-term (Weeks 7+)
1. **Bidirectional sync**: Allow graph-to-PostgreSQL updates (read-only for now)
2. **Data quality verification**: Automated consistency checks
3. **Relationship strength computation**: Update voting coalitions, influence networks
4. **Advanced analytics**: Compute centrality, clustering, influence scores

---

## Section 7: Consistency Checklist

### Entity Definitions
- [ ] All PostgreSQL tables have Neo4j nodes
- [ ] All unique constraints in PostgreSQL map to Neo4j uniqueness
- [ ] All enum fields in PostgreSQL map to constrained enums in Neo4j
- [ ] All major fields in PostgreSQL are represented in Neo4j

### Relationships
- [ ] All foreign keys in PostgreSQL map to Neo4j relationships
- [ ] All many-to-many junctions map to relationships or intermediate nodes
- [ ] All array columns map to relationships
- [ ] All relationship cardinality matches (1:1, 1:N, N:N)

### Sync Logic
- [ ] Sync triggers on PostgreSQL inserts
- [ ] Sync triggers on PostgreSQL updates
- [ ] Sync handles deletes (soft or hard)
- [ ] Sync handles array/JSONB fields
- [ ] Conflict detection implemented
- [ ] Reconciliation strategy documented

### Data Quality
- [ ] No stale data (last sync timestamp tracked)
- [ ] No orphaned nodes (delete propagation verified)
- [ ] No duplicate nodes (merge keys verified)
- [ ] No data type mismatches (string vs enum, etc.)

---

## Appendix: Full Field Mapping Template

Create a detailed mapping like this for each table:

```
TABLE: sponsors
NEO4J NODE: Person (type='mp')

Field Mapping:
✓ id → id
✓ name → name
✗ name_normalized → [MISSING]
✗ ethnicity → [MISSING]
✗ gender → [MISSING]
✗ date_of_birth → [MISSING]
✗ age → [MISSING]
✓ party → party
✗ previous_parties → [MISSING]
✗ coalition → [MISSING]
✗ county → county
✗ constituency → [MISSING]
✗ ward → [MISSING]
✗ chamber → [MISSING]
✗ mp_number → [MISSING]
✗ position → [MISSING]
✗ role → [MISSING]
✗ bio → [MISSING]
✗ education → [MISSING]
✗ professional_background → [MISSING]
✗ photo_url → [MISSING]
✗ website → [MISSING]
✓ email → email
✓ phone → phone
✗ office_location → [MISSING]
✗ social_media → [MISSING]
✗ financial_disclosures → [MISSING]
✗ last_disclosure_date → [MISSING]
✗ has_pending_cases → [MISSING]
✗ integrity_issues → [MISSING]
✗ voting_record → [MISSING]
✗ attendance_rate → [MISSING]
✗ bills_sponsored_count → [MISSING]
✗ bills_passed_count → [MISSING]
✗ questions_asked_count → [MISSING]
✗ motions_moved_count → [MISSING]
✗ public_rating → [MISSING]
✗ rating_count → [MISSING]
✗ follower_count → [MISSING]
✗ term_start → [MISSING]
✗ term_end → [MISSING]
✗ election_date → [MISSING]
✗ is_active → [MISSING]
✗ retirement_reason → [MISSING]
✓ created_at → created_at
✓ updated_at → updated_at

Coverage: 7 of 45 fields = 15.6%
Status: CRITICAL GAPS
```

---

## Summary Statistics

| Metric | Value | Status |
|---|---|---|
| PostgreSQL Tables | 14+ | ✓ Well-structured |
| Neo4j Nodes Defined | 6 | ⚠️ Incomplete |
| Coverage | 43% | ❌ Poor |
| Foreign Keys | 20+ | ⚠️ Partially synced |
| Missing Relationships | 10+ | ❌ Critical gaps |
| Enum Fields (PostgreSQL) | 10+ | ❌ No Neo4j equivalent |
| Sync Triggers | 0 | ❌ Manual only |
| Conflict Resolution | None | ❌ None |

**Overall Status**: 🔴 **NOT PRODUCTION-READY**

---

## Next Steps

1. **Review** this report with team
2. **Prioritize** Phase 1 items
3. **Create** field mapping document (detailed version of Appendix)
4. **Implement** missing nodes and relationships
5. **Build** automated tests to catch future inconsistencies
6. **Monitor** sync health in production


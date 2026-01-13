# PostgreSQL ↔ Neo4j Entity Mapping Document

**Version**: 1.0  
**Date**: January 8, 2026  
**Status**: Phase 1 Implementation - Core Nodes Mapped

---

## Purpose

This document provides the authoritative mapping between PostgreSQL schema tables/columns and Neo4j graph nodes/properties. It serves as:
1. **Source of truth** for synchronization logic
2. **Validation guide** for data consistency
3. **Reference** for query development
4. **Checklist** for sync implementation

---

## Key Principles

1. **PostgreSQL is the source of truth** - All data originates in PostgreSQL; Neo4j is synchronized from it
2. **Fields map 1:1 unless noted** - PostgreSQL column → Neo4j property
3. **Enums become string fields** - PostgreSQL enums → Neo4j string with validation
4. **Array fields become relationships** - PostgreSQL arrays → Neo4j relationships
5. **JSONB fields are selectively mapped** - Only critical fields extracted
6. **Sync metadata tracked** - `last_synced_at`, `is_verified` added to all nodes

---

## Table 1: Core Entities

### 1.1 users (PostgreSQL) → User (Neo4j)

| PostgreSQL Field | Neo4j Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| id | id | UUID | ✓ Required | Primary key, unique constraint in Neo4j |
| email | email | varchar | ✓ Required | Unique constraint in Neo4j |
| role | role | varchar | ✓ Required | Enum: citizen, verified_citizen, ambassador, expert_verifier, mp_staff, clerk, admin, auditor, journalist |
| display_name | display_name | varchar | ✓ Optional | User's public name |
| is_verified | is_verified | boolean | ✓ Optional | Account verification status |
| is_active | is_active | boolean | ✓ Optional | Account active status |
| county | county | varchar | ✓ Optional | User's home county |
| anonymity_level | anonymity_level | varchar | ✓ Optional | Enum: public, verified_pseudonym, anonymous |
| created_at | created_at | timestamp | ✓ Required | ISO 8601 format |
| updated_at | updated_at | timestamp | ✓ Required | ISO 8601 format |
| — | last_synced_at | timestamp | ✓ Computed | Timestamp of last sync from PostgreSQL |

**Additional computed properties**:
- `comments_count`: Sum of comments authored by user
- `votes_count`: Sum of votes cast by user
- `follower_count`: Count of followers
- `following_count`: Count of users followed

**Unique constraints**:
- `id` (PK in PostgreSQL, unique in Neo4j)
- `email`

**Indexes**:
- `is_active, created_at` (find active users by date)
- `role, is_verified` (find verified users by role)

---

### 1.2 user_profiles (PostgreSQL) → User (Neo4j) - MERGED

The `user_profiles` table is **merged into the User node**. Selected fields:

| PostgreSQL Table.Field | Neo4j Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| user_profiles.display_name | display_name | varchar | ✓ Optional | Replaces users.display_name if both present |
| user_profiles.bio | bio | varchar | ✓ Optional | User biography |
| user_profiles.avatar_url | avatar_url | varchar | ✓ Optional | Profile picture URL |
| user_profiles.county | county | varchar | ✓ Optional | Preferred location (may override users.county) |
| user_profiles.email_notifications_consent | email_notifications_consent | boolean | ✓ Optional | GDPR consent |
| user_profiles.data_processing_consent | data_processing_consent | boolean | ✓ Optional | Data protection consent |

---

### 1.3 sponsors (PostgreSQL) → Person (Neo4j, type='mp')

| PostgreSQL Field | Neo4j Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| id | id | UUID | ✓ Required | Primary key |
| name | name | varchar | ✓ Required | Full name |
| name_normalized | name_normalized | varchar | ✓ Optional | Lowercase for search |
| ethnicity | ethnicity | varchar | ✓ Optional | Political economy analysis |
| gender | gender | varchar | ✓ Optional | Enum: male, female, non_binary, prefer_not_to_say |
| date_of_birth | date_of_birth | date | ✓ Optional | ISO format |
| age | age | integer | ✓ Optional | Computed/denormalized |
| party | party | varchar | ✓ Optional | Enum: UDA, ODM, Jubilee, etc. |
| previous_parties | previous_parties | varchar[] | ✓ Optional | Array of past party memberships |
| coalition | coalition | varchar | ✓ Optional | Political coalition name |
| county | county | varchar | ✓ Optional | Kenyan county |
| constituency | constituency | varchar | ✓ Optional | Electoral constituency |
| ward | ward | varchar | ✓ Optional | Ward (if applicable) |
| chamber | chamber | varchar | ✓ Optional | Enum: national_assembly, senate, county_assembly |
| mp_number | mp_number | varchar | ✓ Optional | Official MP ID |
| position | position | varchar | ✓ Optional | Official position title |
| role | role | varchar | ✓ Optional | Role description |
| bio | bio | text | ✓ Optional | Biography |
| education | education | object[] | ✓ Optional | Array of {degree, institution} |
| professional_background | professional_background | text | ✓ Optional | Career history |
| photo_url | photo_url | varchar | ✓ Optional | Profile photo |
| website | website | varchar | ✓ Optional | Personal/official website |
| email | email | varchar | ✓ Optional | Contact email |
| phone | phone | varchar | ✓ Optional | Contact phone (E.164 format) |
| office_location | office_location | text | ✓ Optional | Office address |
| social_media | social_media | object | ✓ Optional | Extracted from JSONB: {platform: handle} |
| has_pending_cases | has_pending_cases | boolean | ✓ Optional | Integrity tracking |
| financial_disclosures_count | — | — | ✗ Not synced | Use relationship count instead |
| voting_record | voting_record | object | ✓ Optional | Extracted key metrics from JSONB |
| attendance_rate | attendance_rate | numeric | ✓ Optional | Percentage 0-100 |
| bills_sponsored_count | bills_sponsored_count | integer | ✓ Optional | Performance metric |
| bills_passed_count | bills_passed_count | integer | ✓ Optional | Performance metric |
| questions_asked_count | questions_asked_count | integer | ✓ Optional | Activity metric |
| motions_moved_count | motions_moved_count | integer | ✓ Optional | Activity metric |
| public_rating | public_rating | numeric | ✓ Optional | 0.00-5.00 |
| rating_count | rating_count | integer | ✓ Optional | Count of ratings |
| follower_count | follower_count | integer | ✓ Optional | Social engagement |
| term_start | term_start | date | ✓ Optional | Term begin date |
| term_end | term_end | date | ✓ Optional | Term end date |
| election_date | election_date | date | ✓ Optional | Election date |
| is_active | is_active | boolean | ✓ Optional | Currently serving |
| retirement_reason | retirement_reason | varchar | ✓ Optional | Why they left office |
| created_at | created_at | timestamp | ✓ Required | ISO 8601 |
| updated_at | updated_at | timestamp | ✓ Required | ISO 8601 |
| — | type | literal:'mp' | ✓ Required | Hardcoded in Neo4j |
| — | last_synced_at | timestamp | ✓ Computed | Last sync time |

**Unique constraints**:
- `id`
- `mp_number` (nulls not distinct)

---

### 1.4 governors (PostgreSQL) → Governor (Neo4j)

| PostgreSQL Field | Neo4j Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| id | id | UUID | ✓ Required | Primary key |
| name | name | varchar | ✓ Required | Full name |
| name_normalized | name_normalized | varchar | ✓ Optional | Lowercase for search |
| county | county | varchar | ✓ Required | Unique constraint - one governor per county |
| ethnicity | ethnicity | varchar | ✓ Optional | Demographics |
| gender | gender | varchar | ✓ Optional | Enum: male, female, non_binary, prefer_not_to_say |
| date_of_birth | date_of_birth | date | ✓ Optional | ISO format |
| age | age | integer | ✓ Optional | Computed |
| party | party | varchar | ✓ Optional | Political party |
| previous_parties | previous_parties | varchar[] | ✓ Optional | Array of past parties |
| coalition | coalition | varchar | ✓ Optional | Coalition name |
| bio | bio | text | ✓ Optional | Biography |
| education | education | object[] | ✓ Optional | Array of {degree, institution} |
| professional_background | professional_background | text | ✓ Optional | Career history |
| photo_url | photo_url | varchar | ✓ Optional | Profile photo |
| website | website | varchar | ✓ Optional | Website |
| email | email | varchar | ✓ Optional | Email |
| phone | phone | varchar | ✓ Optional | Phone |
| has_pending_cases | has_pending_cases | boolean | ✓ Optional | Integrity flag |
| development_projects_count | completed_projects_count | integer | ✓ Optional | Performance metric |
| budget_execution_rate | budget_execution_rate | numeric | ✓ Optional | Percentage 0-100 |
| public_rating | public_rating | numeric | ✓ Optional | 0.00-5.00 |
| rating_count | rating_count | integer | ✓ Optional | Count of ratings |
| term_start | term_start | date | ✓ Optional | Term start |
| term_end | term_end | date | ✓ Optional | Term end |
| election_date | election_date | date | ✓ Optional | Election date |
| term_number | term_number | integer | ✓ Optional | Current term (1st, 2nd, etc.) |
| is_active | is_active | boolean | ✓ Optional | Currently serving |
| created_at | created_at | timestamp | ✓ Required | ISO 8601 |
| updated_at | updated_at | timestamp | ✓ Required | ISO 8601 |
| — | last_synced_at | timestamp | ✓ Computed | Last sync time |

**Unique constraints**:
- `id`
- `county`

---

### 1.5 bills (PostgreSQL) → Bill (Neo4j)

| PostgreSQL Field | Neo4j Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| id | id | UUID | ✓ Required | Primary key |
| bill_number | bill_number | varchar | ✓ Required | Unique official ID (e.g., "Bill 15 of 2024") |
| title | title | varchar | ✓ Required | Bill title |
| title_normalized | title_normalized | varchar | ✓ Optional | Lowercase for search |
| summary | summary | text | ✓ Optional | Bill summary |
| bill_type | bill_type | varchar | ✓ Optional | Enum: public, private, money, constitutional_amendment, county |
| status | status | varchar | ✓ Required | Enum: first_reading, second_reading, committee_stage, third_reading, presidential_assent, gazetted, withdrawn, lost, enacted |
| previous_status | previous_status | varchar | ✓ Optional | Previous status value |
| chamber | chamber | varchar | ✓ Required | Enum: national_assembly, senate, county_assembly |
| sponsor_id | sponsor_id | UUID | ✓ Optional | PK of sponsor (primary sponsor only) |
| co_sponsors | co_sponsors | UUID[] | ✓ Relationship | **→ Sync as SPONSORED relationship with type='co-sponsor'** |
| co_sponsors_count | co_sponsors_count | integer | ✓ Optional | Count of co-sponsors |
| committee_id | committee_id | UUID | ✓ Optional | PK of assigned committee |
| committee_recommendation | committee_recommendation | varchar | ✓ Optional | Enum: approve, approve_with_amendments, reject, defer |
| introduced_date | introduced_date | date | ✓ Optional | Introduction date |
| last_action_date | last_action_date | date | ✓ Optional | Date of last action |
| expected_completion_date | expected_completion_date | date | ✓ Optional | Expected passage date |
| affected_counties | affected_counties | varchar[] | ✓ Optional | Array of county names |
| impact_areas | impact_areas | varchar[] | ✓ Optional | Array of impact categories |
| public_participation_required | public_participation_required | boolean | ✓ Optional | Citizen engagement flag |
| public_participation_status | public_participation_status | varchar | ✓ Optional | Status of engagement |
| public_submissions_count | public_submissions_count | integer | ✓ Optional | Count of citizen submissions |
| view_count | view_count | integer | ✓ Optional | Platform engagement metric |
| comment_count | comment_count | integer | ✓ Optional | Citizen engagement metric |
| vote_count_for | vote_count_for | integer | ✓ Optional | Support votes |
| vote_count_against | vote_count_against | integer | ✓ Optional | Opposition votes |
| vote_count_neutral | vote_count_neutral | integer | ✓ Optional | Neutral votes |
| engagement_score | engagement_score | numeric | ✓ Optional | Computed engagement (0+) |
| trending_score | trending_score | numeric | ✓ Optional | Time-decayed popularity (0+) |
| sentiment_score | sentiment_score | numeric | ✓ Optional | Sentiment -1.00 to 1.00 |
| positive_mentions | positive_mentions | integer | ✓ Optional | Count of positive mentions |
| negative_mentions | negative_mentions | integer | ✓ Optional | Count of negative mentions |
| neutral_mentions | neutral_mentions | integer | ✓ Optional | Count of neutral mentions |
| category | category | varchar | ✓ Optional | Primary category |
| sub_category | sub_category | varchar | ✓ Optional | Secondary category |
| tags | tags | varchar[] | ✓ Relationship | **→ Sync as MENTIONS_TOPIC relationships** |
| primary_sector | primary_sector | varchar | ✓ Optional | Industry/sector |
| related_bills | related_bills | UUID[] | ✓ Relationship | **→ Sync as RELATED_TO relationships** |
| amendments | amendments | object[] | ✗ Not synced | Complex JSONB structure; reference via relationship |
| metadata | metadata | object | ✗ Not synced | Generic metadata not needed in graph |
| constitutional_analysis_status | — | — | ✗ Not synced | AI processing status (PostgreSQL-only) |
| argument_synthesis_status | — | — | ✗ Not synced | AI processing status (PostgreSQL-only) |
| trojan_detection_status | — | — | ✗ Not synced | AI processing status (PostgreSQL-only) |
| controversy_score | controversy_score | numeric | ✓ Optional | Controversy metric 0-1 |
| quality_score | quality_score | numeric | ✓ Optional | Quality metric 0-1 |
| is_urgent | is_urgent | boolean | ✓ Optional | Urgency flag |
| is_money_bill | is_money_bill | boolean | ✓ Optional | Financial bill flag |
| is_constitutional_amendment | is_constitutional_amendment | boolean | ✓ Optional | Constitutional flag |
| priority_level | priority_level | varchar | ✓ Optional | Enum: low, normal, high, critical |
| created_at | created_at | timestamp | ✓ Required | ISO 8601 |
| updated_at | updated_at | timestamp | ✓ Required | ISO 8601 |
| — | last_synced_at | timestamp | ✓ Computed | Last sync time |

**Unique constraints**:
- `id`
- `bill_number`

**Array field sync strategy**:
- `co_sponsors`: Create SPONSORED relationship for each, mark type='co-sponsor'
- `tags`: Create MENTIONS_TOPIC relationship for each tag (create Topic nodes if needed)
- `related_bills`: Create RELATED_TO relationship to each referenced bill
- `affected_counties`: Store as array property (no separate nodes)
- `impact_areas`: Store as array property (no separate nodes)

---

### 1.6 committees (PostgreSQL) → Committee (Neo4j)

| PostgreSQL Field | Neo4j Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| id | id | UUID | ✓ Required | Primary key |
| name | name | varchar | ✓ Required | Committee name |
| name_normalized | name_normalized | varchar | ✓ Optional | Lowercase for search |
| short_name | short_name | varchar | ✓ Optional | Abbreviation (e.g., "BFIC") |
| chamber | chamber | varchar | ✓ Required | Enum: national_assembly, senate |
| committee_type | committee_type | varchar | ✓ Optional | Enum: standing, select, ad_hoc, joint, constitutional |
| chair_id | chair_id | UUID | ✓ Optional | PK of chair person |
| vice_chair_id | vice_chair_id | UUID | ✓ Optional | PK of vice chair |
| members_count | members_count | integer | ✓ Optional | Count of members |
| mandate | mandate | text | ✓ Optional | Committee mandate/purpose |
| jurisdiction | jurisdiction | varchar[] | ✓ Optional | Array of policy areas |
| meetings_held_count | meetings_held_count | integer | ✓ Optional | Activity metric |
| reports_issued_count | reports_issued_count | integer | ✓ Optional | Activity metric |
| bills_reviewed_count | bills_reviewed_count | integer | ✓ Optional | Activity metric |
| is_active | is_active | boolean | ✓ Optional | Active status |
| created_at | created_at | timestamp | ✓ Required | ISO 8601 |
| updated_at | updated_at | timestamp | ✓ Required | ISO 8601 |
| — | last_synced_at | timestamp | ✓ Computed | Last sync time |

**Unique constraints**:
- `id`

**Relationship syncing**:
- `chair_id`: Create MEMBER_OF relationship with role='chair'
- `vice_chair_id`: Create MEMBER_OF relationship with role='vice_chair'
- Committee members: Use `committee_members` table to create MEMBER_OF relationships

---

### 1.7 parliamentary_sessions (PostgreSQL) → ParliamentarySession (Neo4j)

| PostgreSQL Field | Neo4j Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| id | id | UUID | ✓ Required | Primary key |
| parliament_number | parliament_number | smallint | ✓ Required | Parliament number (13th, 14th, etc.) |
| session_number | session_number | smallint | ✓ Required | Session number within parliament |
| chamber | chamber | varchar | ✓ Required | Enum: national_assembly, senate |
| start_date | start_date | date | ✓ Required | Session start date |
| end_date | end_date | date | ✓ Optional | Session end date |
| is_active | is_active | boolean | ✓ Optional | Currently active |
| sittings_count | sittings_count | smallint | ✓ Optional | Count of sittings |
| bills_introduced_count | bills_introduced_count | smallint | ✓ Optional | Bills introduced |
| bills_passed_count | bills_passed_count | smallint | ✓ Optional | Bills passed |
| created_at | created_at | timestamp | ✓ Required | ISO 8601 |
| updated_at | updated_at | timestamp | ✓ Required | ISO 8601 |
| — | last_synced_at | timestamp | ✓ Computed | Last sync time |

**Unique constraints**:
- `id`
- `parliament_number, session_number, chamber` (composite)

---

### 1.8 parliamentary_sittings (PostgreSQL) → ParliamentarySitting (Neo4j)

| PostgreSQL Field | Neo4j Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| id | id | UUID | ✓ Required | Primary key |
| session_id | session_id | UUID | ✓ Required | FK to ParliamentarySession |
| sitting_date | sitting_date | date | ✓ Required | Date of sitting |
| sitting_type | sitting_type | varchar | ✓ Optional | Enum: regular, special, emergency, committee_of_whole |
| attendance_count | attendance_count | smallint | ✓ Optional | Member attendance |
| quorum_met | quorum_met | boolean | ✓ Optional | Quorum status |
| duration_minutes | duration_minutes | smallint | ✓ Optional | Meeting duration |
| bills_discussed | bills_discussed | UUID[] | ✓ Relationship | **→ Sync as DISCUSSES relationships** |
| motions_moved | motions_moved | varchar[] | ✓ Optional | Array of motion descriptions |
| questions_answered | questions_answered | varchar[] | ✓ Optional | Array of question IDs/descriptions |
| minutes_url | minutes_url | varchar | ✓ Optional | Link to official minutes |
| hansard_url | hansard_url | varchar | ✓ Optional | Link to Hansard record |
| video_url | video_url | varchar | ✓ Optional | Link to video recording |
| created_at | created_at | timestamp | ✓ Required | ISO 8601 |
| updated_at | updated_at | timestamp | ✓ Required | ISO 8601 |
| — | last_synced_at | timestamp | ✓ Computed | Last sync time |

**Unique constraints**:
- `id`
- `session_id, sitting_date` (composite)

---

### 1.9 argumentTable (PostgreSQL) → Argument (Neo4j)

| PostgreSQL Field | Neo4j Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| id | id | UUID | ✓ Required | Primary key |
| bill_id | bill_id | UUID | ✓ Required | FK to Bill |
| argument_text | argument_text | text | ✓ Required | Full argument text |
| argument_summary | argument_summary | varchar | ✓ Optional | Brief summary |
| position | position | varchar | ✓ Required | Enum: support, oppose, neutral, conditional |
| argument_type | argument_type | varchar | ✓ Optional | Enum: economic, constitutional, social, procedural |
| strength_score | strength_score | numeric | ✓ Optional | Quality metric 0-1 |
| confidence_score | confidence_score | numeric | ✓ Optional | Confidence in argument 0-1 |
| extraction_method | extraction_method | varchar | ✓ Optional | Enum: automated, manual, hybrid |
| source_comments | source_comments | UUID[] | ✓ Optional | Array of comment IDs |
| support_count | support_count | integer | ✓ Optional | Endorsements |
| opposition_count | opposition_count | integer | ✓ Optional | Rejections |
| citizen_endorsements | citizen_endorsements | integer | ✓ Optional | Community support |
| is_verified | is_verified | boolean | ✓ Optional | Expert verification |
| verified_by | verified_by | UUID | ✓ Optional | Verifier user ID |
| quality_score | quality_score | numeric | ✓ Optional | Overall quality 0-1 |
| created_at | created_at | timestamp | ✓ Required | ISO 8601 |
| updated_at | updated_at | timestamp | ✓ Required | ISO 8601 |
| — | last_synced_at | timestamp | ✓ Computed | Last sync time |

**Unique constraints**:
- `id`

---

### 1.10 claims (PostgreSQL) → Claim (Neo4j)

| PostgreSQL Field | Neo4j Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| id | id | UUID | ✓ Required | Primary key |
| claim_text | claim_text | text | ✓ Required | Claim content |
| claim_summary | claim_summary | varchar | ✓ Optional | Brief summary |
| claim_type | claim_type | varchar | ✓ Optional | Enum: factual, predictive, normative, causal |
| verification_status | verification_status | varchar | ✓ Required | Enum: verified, disputed, false, unverified |
| fact_check_url | fact_check_url | varchar | ✓ Optional | Fact-check source URL |
| mention_count | mention_count | integer | ✓ Optional | Times mentioned |
| bills_referenced | bills_referenced | UUID[] | ✓ Optional | Array of bill IDs |
| supporting_arguments | supporting_arguments | UUID[] | ✓ Relationship | **→ Sync as SUPPORTS relationship to Argument nodes** |
| contradicting_arguments | contradicting_arguments | UUID[] | ✓ Relationship | **→ Sync as CONTRADICTS relationship to Argument nodes** |
| created_at | created_at | timestamp | ✓ Required | ISO 8601 |
| updated_at | updated_at | timestamp | ✓ Required | ISO 8601 |
| — | last_synced_at | timestamp | ✓ Computed | Last sync time |

**Unique constraints**:
- `id`

---

### 1.11 user_interests (PostgreSQL) → [User]-[INTERESTED_IN]-[Topic]

| PostgreSQL Field | Neo4j Relationship Property | Type | Sync Status | Notes |
|---|---|---|---|---|
| user_id | — | — | ✓ Required | Creates INTERESTED_IN relationship |
| interest | — | — | ✓ Required | Topic name or category |
| interest_strength | strength | integer | ✓ Optional | 1-10 scale |
| interest_source | source | varchar | ✓ Optional | Enum: user_selected, inferred, imported |
| created_at | created_at | timestamp | ✓ Required | Relationship timestamp |

**Relationship Type**: `INTERESTED_IN`  
**Direction**: `User → Topic`  
**Properties**: `{strength: 1-10, source: string, created_at: timestamp}`

---

## Table 2: Relationships (Foreign Keys → Neo4j Relationships)

### 2.1 Sponsorship Relationships

**Source**: `bills.sponsor_id` (primary sponsor) and `bills.co_sponsors` (array)

| FK Source | Target | Neo4j Relationship | Properties |
|---|---|---|---|
| sponsor_id | bills → sponsors | `Person -[SPONSORED]-> Bill` | `{type: 'primary', created_at}` |
| co_sponsors[] | bills → sponsors | `Person -[SPONSORED]-> Bill` | `{type: 'co-sponsor', created_at}` |

---

### 2.2 Committee Relationships

**Source**: `committee_members` junction table

| FK Source | Target | Neo4j Relationship | Properties |
|---|---|---|---|
| committee_members | sponsor_id, committee_id | `Person -[MEMBER_OF]-> Committee` | `{role: 'member'/'chair'/'vice_chair', start_date, attendance_rate}` |
| bills.committee_id | committees | `Bill -[ASSIGNED_TO]-> Committee` | `{priority: 'normal'/'high'/'urgent', assigned_date}` |

---

### 2.3 Topic/Category Relationships

**Source**: `bills.tags` array

| FK Source | Target | Neo4j Relationship | Properties |
|---|---|---|---|
| tags[] | bills → topics | `Bill -[MENTIONS_TOPIC]-> Topic` | `{created_at}` |

**Note**: Topic nodes created on-demand when syncing bills

---

### 2.4 Related Bills Relationships

**Source**: `bills.related_bills` array

| FK Source | Target | Neo4j Relationship | Properties |
|---|---|---|---|
| related_bills[] | bills → bills | `Bill -[RELATED_TO]-> Bill` | `{created_at}` |

---

### 2.5 Argument Relationships

**Source**: `argumentTable` table

| FK Source | Target | Neo4j Relationship | Properties |
|---|---|---|---|
| bill_id | arguments → bills | `Argument -[ABOUT]-> Bill` | `{created_at}` |

---

### 2.6 Governor Assent Relationships

**Source**: `county_bill_assents` table

| FK Source | Target | Neo4j Relationship | Properties |
|---|---|---|---|
| governor_id, bill_id | governors, bills | `Governor -[ASSENT]-> Bill` | `{status: 'pending'/'approved'/'withheld'/'assented', days_pending, created_at}` |

---

### 2.7 Parliamentary Timeline Relationships

**Source**: `parliamentary_sittings.session_id` and `bills_discussed`

| FK Source | Target | Neo4j Relationship | Properties |
|---|---|---|---|
| session_id | parliamentary_sittings → parliamentary_sessions | `ParliamentarySession -[CONTAINS]-> ParliamentarySitting` | `{created_at}` |
| bills_discussed[] | parliamentary_sittings → bills | `ParliamentarySitting -[DISCUSSES]-> Bill` | `{created_at}` |

---

### 2.8 User Engagement Relationships

**Source**: `citizen_participation` tables (future implementation)

| FK Source | Target | Neo4j Relationship | Properties |
|---|---|---|---|
| user_id, bill_id | users, bills | `User -[ENGAGEMENT_VIEWED]-> Bill` | `{count, created_at}` |
| user_id, bill_id | users, bills | `User -[ENGAGEMENT_VOTED]-> Bill` | `{vote_type, count, created_at}` |
| user_id, bill_id | users, bills | `User -[ENGAGEMENT_COMMENTED]-> Bill` | `{count, created_at}` |
| user_id, bill_id | users, bills | `User -[ENGAGEMENT_SHARED]-> Bill` | `{count, created_at}` |
| user_id, bill_id | users, bills | `User -[ENGAGEMENT_BOOKMARKED]-> Bill` | `{count, created_at}` |

---

### 2.9 Argument-Claim Relationships

**Source**: `claims.supporting_arguments` and `claims.contradicting_arguments` arrays

| FK Source | Target | Neo4j Relationship | Properties |
|---|---|---|---|
| supporting_arguments[] | claims → arguments | `Argument -[SUPPORTS]-> Claim` | `{created_at}` |
| contradicting_arguments[] | claims → arguments | `Argument -[CONTRADICTS]-> Claim` | `{created_at}` |

---

## Table 3: Sync Metadata

All nodes include these properties for sync tracking:

| Property | Type | Purpose | Example |
|---|---|---|---|
| id | UUID | Primary key | `550e8400-e29b-41d4-a716-446655440000` |
| created_at | ISO8601 | Node creation time | `2024-01-08T10:30:00Z` |
| updated_at | ISO8601 | Last database update | `2024-01-08T15:45:00Z` |
| last_synced_at | ISO8601 | Last sync from PostgreSQL | `2024-01-08T16:00:00Z` |
| is_verified | boolean | Data verification status | `true` or `false` |

---

## Table 4: Implementation Checklist

### Phase 1: Core Nodes (Week 1)
- [x] User node interface
- [x] Governor node interface
- [x] ParliamentarySession node interface
- [x] ParliamentarySitting node interface
- [x] Claim node interface
- [x] Enhanced PersonNode (add all fields)
- [x] Enhanced BillNode (add all fields)
- [x] Enhanced ArgumentNode (add missing fields)
- [ ] Sync functions for all new nodes
- [ ] Schema constraints in Neo4j

### Phase 2: Array Field Relationships (Week 2-3)
- [ ] Co-sponsors → SPONSORED relationships
- [ ] Tags → MENTIONS_TOPIC relationships
- [ ] Related bills → RELATED_TO relationships
- [ ] Bills discussed → DISCUSSES relationships

### Phase 3: Advanced Relationships (Week 4-5)
- [ ] User interests → INTERESTED_IN relationships
- [ ] Argument claims → SUPPORTS/CONTRADICTS relationships
- [ ] Bill amendments → AMENDS relationships
- [ ] Governor assents → ASSENT relationships

### Phase 4: Engagement Graph (Week 6+)
- [ ] User votes → VOTED relationships
- [ ] User comments → AUTHORED relationships
- [ ] User bookmarks → BOOKMARKED relationships
- [ ] Voting coalitions → VOTING_COALITION relationships

---

## Appendix: Entity Count by Type

Expected entities in Neo4j after Phase 1:

| Entity | PostgreSQL Count | Neo4j Mapping | Estimated Neo4j Count |
|---|---|---|---|
| Users | 1000+ | 1:1 | 1000+ |
| Sponsors (MPs) | 350+ | PersonNode type='mp' | 350+ |
| Governors | 47 | GovernorNode | 47 |
| Bills | 2000+ | 1:1 | 2000+ |
| Committees | 50+ | 1:1 | 50+ |
| Arguments | 10000+ | 1:1 | 10000+ |
| Claims | 5000+ | 1:1 | 5000+ |
| Topics/Tags | 100+ | On-demand | 100+ |
| Sessions | 50+ | 1:1 | 50+ |
| Sittings | 500+ | 1:1 | 500+ |
| **Total Nodes** | — | — | **20,000+** |
| **Relationships** | — | — | **100,000+** |

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2024-01-08 | Initial mapping document; Phase 1 core nodes |
| TBD | TBD | Phase 2: Array field relationships |
| TBD | TBD | Phase 3: Advanced relationships |
| TBD | TBD | Phase 4: Engagement graph |


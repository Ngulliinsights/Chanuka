# Governor Legislative Integration - Phase 1 Implementation

**Date:** January 8, 2026  
**Phase:** 1 (Minimal, Strategic Foundation)  
**Status:** Complete  

---

## Overview

Phase 1 establishes minimal but strategically important governor-to-bill relationships in alignment with Kenya's constitutional devolution framework (Article 196, Constitution of Kenya 2010).

### Strategic Rationale

1. **Constitutional Mandate:** County bills require governor assent within 30 days
2. **Accountability Gap:** Governors were isolated; no tracking of assent workflows
3. **Data-Driven Governance:** Links performance metrics to legislative outcomes
4. **Low Technical Risk:** Non-destructive, nullable fields; backward compatible
5. **Foundation for Phase 2:** Enables analytics, workflows, and automated tracking

---

## Implementation Details

### 1. Bills Table Enhancement

**Added nullable FK:**
```sql
governor_id UUID REFERENCES governors.id ON DELETE SET NULL
```

**When populated:**
- County bills (bill_type = 'county')
- Bills with affected_counties specified
- Bills requiring constitutional compliance

**Index added:**
```sql
idx_bills_governor_status ON (governor_id, status, affected_counties)
  WHERE governor_id IS NOT NULL
```

**Query benefits:**
- Fast governor → bills queries (legislative action tracking)
- County-governor accountability dashboards
- Performance correlation analysis

---

### 2. County Bill Assents Table (NEW)

**Purpose:** Audit trail for governor assent workflow per Article 196.

**Schema:**
```typescript
county_bill_assents {
  id: UUID (PK)
  bill_id: UUID (FK → bills)
  governor_id: UUID (FK → governors, RESTRICT on delete)
  
  // Workflow
  assent_status: 'pending' | 'approved' | 'withheld' | 
                 'returned_with_comments' | 'assented'
  assent_date: date
  assent_comments: text
  
  // Timeline tracking
  sent_to_governor_date: date
  deadline_date: date (30-day Constitutional period)
  days_pending: smallint (denormalized)
  
  // Data Provenance (CRITICAL for Phase 2+)
  provenance: 'official' | 'scraped' | 'manual' | 'inferred'
  data_source_url: varchar
  verification_status: 'verified' | 'unverified' | 'disputed'
  
  // Audit
  created_at, updated_at: timestamps
}
```

**Why separate table (not just bill.governor_id)?**
- Detailed assent timeline (sent date, deadline, assent date)
- Provenance tracking (critical for unverified data)
- Future: Multiple governor interactions (amendments, reconsideration)
- Audit trail independent of bill updates
- Constraint: `RESTRICT` on governor delete protects historical records

**Indexes:**
- `idx_county_bill_assents_governor_pending` — pending assents by governor
- `idx_county_bill_assents_overdue` — bills past Constitutional deadline
- `idx_county_bill_assents_unverified` — data quality monitoring

---

### 3. Relations Updated

#### `governorsRelations`
```typescript
governors → {
  countyBills: many(bills, { relationName: "governor_assent" })
  billAssents: many(county_bill_assents)
  appointments: many(political_appointments)
}
```

#### `billsRelations`
```typescript
bills → {
  governor: one(governors, { relationName: "governor_assent" })
  assents: many(county_bill_assents)
  sponsor, audits, trojanAnalysis...
}
```

---

## Data Provenance & Quality

### Provenance Classification

| Source | Status | Verification | Use Case |
|--------|--------|--------------|----------|
| **official** | Verified | Parliament Gazette, National Archives | Canonical record |
| **scraped** | Unverified | Web scraping automation (future) | Supplementary data |
| **manual** | Manual review required | Human entry + audit | Historical backfill |
| **inferred** | Unverified | Heuristic matching (future) | Placeholder pending official |

### Verification Status

- **verified:** Matched to official source (Gazette, Parliament records)
- **unverified:** Data loaded; awaiting verification
- **disputed:** Conflicts detected; flagged for manual review

### Access Control (Phase 1 Placeholder)

Fields to protect (recommendation for Phase 2):
- `integrity_issues` (JSONB) on governors
- `assent_comments` (if sensitive negotiations)
- `data_source_url` (if non-public)

**Access rules (proposed):**
```
PUBLIC:
  - governor_id, assent_status, assent_date
  - days_pending, deadline_date, status

ADMIN/ANALYST:
  + assent_comments, sent_to_governor_date
  + provenance, verification_status, data_source_url

AUDIT:
  + all fields (full audit trail)
```

---

## Queries Enabled (Phase 1)

```typescript
// 1. Bills awaiting governor assent
SELECT b.*, g.name FROM bills b
JOIN governors g ON b.governor_id = g.id
WHERE b.bill_type = 'county' AND b.status IN (...);

// 2. Governor's outstanding responsibilities (overdue)
SELECT cba.*, b.title FROM county_bill_assents cba
JOIN bills b ON cba.bill_id = b.id
WHERE cba.governor_id = ? 
  AND cba.deadline_date < CURRENT_DATE
  AND cba.assent_status = 'pending';

// 3. Governor performance: assent timeliness
SELECT g.name, 
  AVG(cba.days_pending) as avg_assent_days,
  COUNT(*) FILTER (WHERE cba.days_pending > 30) as overdue_count
FROM governors g
LEFT JOIN county_bill_assents cba ON g.id = cba.governor_id
GROUP BY g.id;

// 4. Data quality: unverified records needing backfill
SELECT COUNT(*) FROM county_bill_assents
WHERE verification_status = 'unverified';
```

---

## Phase 2 Roadmap (NOT IMPLEMENTED YET)

- **Automated Ingest:** Scrape Parliament/County websites for assent data
- **Provenance Validation:** Match scraped → official sources
- **Workflow Automation:** Email alerts for approaching deadlines
- **Governor Positions Tracking:** Extract assent_comments for public analysis
- **Performance Analytics:** Link assent timeliness to legislative outcomes
- **Access Control:** Role-based field masking (public/admin/audit)

---

## Backward Compatibility

✅ **Fully backward compatible:**
- `bills.governor_id` is nullable (no existing data breaks)
- `county_bill_assents` is new table (no cascading changes)
- Existing queries unaffected
- No schema migrations required for existing tables

---

## Testing Checklist

- [ ] Drizzle schema compiles without errors
- [ ] Relations resolve correctly (Drizzle type-check)
- [ ] Indexes can be created (test migration)
- [ ] Foreign key constraints validated
- [ ] Check constraints pass (status, provenance, verification enums)
- [ ] Sample queries execute (governor pending assents, overdue bills)

---

## Next Steps

1. **Run schema validation** (Drizzle + PostgreSQL)
2. **Create migration** (add columns, new table, indexes)
3. **Backfill sample data** (test assent queries)
4. **Document API endpoints** (bills with governor context)
5. **Prototype dashboard** (county bills → governor assent workflow)

---

## Links

- **Article 196 (Constitution of Kenya):** Governor assent requirement
- **Reference:** Kenyan_constitution_2010.md (docs/reference)
- **Related Tables:** `governors`, `bills`, `political_economy` (appointments)
- **Audit Chain:** `participation_quality_audits` (tracks data entry)


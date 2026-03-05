# Electoral Accountability Implementation Roadmap

**Status**: Active  
**Priority**: Critical  
**Target**: Q2 2026 Launch  
**Last Updated**: 2026-03-05

## Executive Summary

The accountability infrastructure exists but is not organized as primary product logic. This roadmap promotes electoral accountability from distributed concern to architectural spine.

## Current State Assessment

### What Exists
- `ElectoralPressure.tsx` component in advocacy/ (should be promoted)
- Neo4j graph database configured but dormant
- Constituency/ward fields in user schema (unused)
- Conflict-of-interest analysis components (scattered)
- `CivicScoreCard.tsx` measuring engagement theater

### Critical Gaps
1. No dedicated `electoral-accountability/` feature module
2. Neo4j sync infrastructure exists but no active queries
3. Constituency data stored but not driving features
4. Metrics measure engagement, not outcomes
5. No ward-level electoral boundary mapping

## Implementation Phases

### Phase 1: Architectural Reorganization (Week 1-2)

#### 1.1 Create Electoral Accountability Feature Module
```
client/src/features/electoral-accountability/
├── components/
│   ├── RepresentationGapCard.tsx (from ElectoralPressure)
│   ├── ConstituencyVotingRecord.tsx
│   ├── ElectoralCycleTimeline.tsx
│   └── AccountabilityExportPanel.tsx
├── services/
│   ├── constituency-mapping.service.ts
│   ├── electoral-pressure.service.ts
│   └── accountability-export.service.ts
├── hooks/
│   ├── useConstituencyData.ts
│   ├── useRepresentationGap.ts
│   └── useElectoralCycle.ts
└── types/
    ├── constituency.types.ts
    └── accountability.types.ts
```

**Actions**:
- [ ] Create feature directory structure
- [ ] Move `ElectoralPressure.tsx` → `RepresentationGapCard.tsx`
- [ ] Extract constituency logic from scattered locations
- [ ] Create unified accountability service layer

#### 1.2 Activate Neo4j for Relationship Mapping
**Current**: Docker compose configured, sync infrastructure exists, no active queries  
**Target**: Graph database backing conflict-of-interest and MP-constituency relationships

**Actions**:
- [ ] Audit `server/infrastructure/database/graph/sync/conflict-resolver.ts` usage
- [ ] Create MP-to-constituency relationship schema in Neo4j
- [ ] Create donation-to-MP relationship schema
- [ ] Implement graph queries for conflict networks
- [ ] Add graph sync to bill sponsorship pipeline
- [ ] Create monitoring dashboard for sync health

**Neo4j Schema Design**:
```cypher
// MP Node
CREATE (mp:MP {
  id: string,
  name: string,
  party: string,
  constituency_id: string,
  term_start: date,
  term_end: date
})

// Constituency Node
CREATE (c:Constituency {
  id: string,
  name: string,
  county: string,
  ward_count: int,
  registered_voters: int,
  electoral_boundary_geojson: string
})

// Relationships
CREATE (mp)-[:REPRESENTS {since: date}]->(c)
CREATE (mp)-[:VOTED_ON {bill_id: string, vote: string, date: date}]->(bill)
CREATE (mp)-[:RECEIVED_DONATION {amount: float, date: date, source: string}]->(donor)
CREATE (donor)-[:HAS_INTEREST_IN]->(industry)
CREATE (bill)-[:AFFECTS_INDUSTRY]->(industry)
```

### Phase 2: Constituency Data Integration (Week 3-4)

#### 2.1 Ward-Level Electoral Boundary Mapping
**Current**: No constituency boundary data  
**Target**: GeoJSON boundaries for all constituencies, ward-level granularity

**Data Sources**:
- IEBC constituency boundary data
- Ward-level electoral registration statistics
- Historical election results by constituency

**Actions**:
- [ ] Source IEBC electoral boundary GeoJSON files
- [ ] Create `constituencies` table with boundary data
- [ ] Create `wards` table with sub-constituency mapping
- [ ] Implement constituency lookup by user location
- [ ] Add constituency selection to user onboarding
- [ ] Create constituency-aware bill filtering

**Schema Addition**:
```sql
CREATE TABLE constituencies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  county_id UUID REFERENCES counties(id),
  boundary_geojson JSONB NOT NULL,
  registered_voters INTEGER,
  last_election_turnout DECIMAL(5,2),
  current_mp_id UUID REFERENCES sponsors(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wards (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  constituency_id UUID REFERENCES constituencies(id),
  boundary_geojson JSONB NOT NULL,
  registered_voters INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.2 User-to-Constituency Mapping
**Current**: `constituency` field exists but unused  
**Target**: Every user mapped to constituency, driving personalized accountability

**Actions**:
- [ ] Add constituency selection to registration flow
- [ ] Implement IP-based constituency suggestion
- [ ] Create constituency verification workflow
- [ ] Add constituency to user profile display
- [ ] Filter bills by constituency relevance
- [ ] Show "Your MP" section on dashboard

### Phase 3: Outcome Metrics Redefinition (Week 5)

#### 3.1 Redefine CivicScoreCard
**Current**: Measures engagement (comments, views, saves)  
**Target**: Measures accountability outcomes

**New Metrics**:
```typescript
interface AccountabilityMetrics {
  // Outcome-based scoring
  constituency_pressure_events: number;      // Petitions signed, MP contacted
  constitutional_flags_escalated: number;    // Flags that became formal petitions
  representation_gaps_surfaced: number;      // MP-constituency misalignments identified
  electoral_cycle_engagement: number;        // Pre-election accountability actions
  
  // Impact scoring
  bills_influenced: number;                  // Bills where user action correlated with outcome
  community_mobilization: number;            // Users recruited to accountability actions
  expert_validation_received: number;        // Expert endorsements of user analysis
  
  // Transparency contribution
  conflict_networks_mapped: number;          // COI relationships identified
  voting_record_shares: number;              // MP accountability cards shared
}
```

**Actions**:
- [ ] Refactor `CivicScoreCard.tsx` to use outcome metrics
- [ ] Remove engagement-based scoring (comments, views)
- [ ] Add methodology disclosure for new metrics
- [ ] Create accountability impact dashboard
- [ ] Add "Before Next Election" countdown timer

### Phase 4: Civil Society Export Infrastructure (Week 6)

#### 4.1 Accountability Data Export API
**Target**: Enable civil society organizations to export structured accountability data

**Export Formats**:
- CSV: MP voting records by constituency
- JSON: Conflict-of-interest networks
- PDF: Constituency accountability reports
- GeoJSON: Electoral boundary + voting pattern overlays

**Actions**:
- [ ] Create `/api/accountability/export` endpoint
- [ ] Implement CSV export for MP voting records
- [ ] Implement JSON export for COI networks
- [ ] Add PDF generation for constituency reports
- [ ] Create API documentation for civil society partners
- [ ] Add rate limiting and authentication for exports

**API Design**:
```typescript
POST /api/accountability/export
{
  "format": "csv" | "json" | "pdf" | "geojson",
  "data_type": "voting_records" | "coi_networks" | "constituency_reports",
  "filters": {
    "constituency_ids": string[],
    "date_range": { start: date, end: date },
    "bill_categories": string[]
  }
}
```

## Technical Debt Cleanup

### Root Directory Hygiene
**Actions**:
- [ ] Remove `CUsersACCESSG~1AppDataLocalTemptest-output.txt`
- [ ] Remove `nul`
- [ ] Move `tsc-errors.txt` to `.github/` or integrate into CI
- [ ] Remove `local-test.png`
- [ ] Remove scattered `.txt` diagnostic files
- [ ] Add `.gitignore` entries to prevent future pollution

### TypeScript Error Tracking
**Current**: Manual `tsc-errors.txt` at root  
**Target**: CI pipeline with declining error count dashboard

**Actions**:
- [ ] Create GitHub Action to track TypeScript errors
- [ ] Add error count badge to README
- [ ] Set up weekly error reduction targets
- [ ] Remove manual `tsc-errors.txt`

## Success Metrics

### Phase 1 Success Criteria
- [ ] `electoral-accountability/` feature module exists
- [ ] Neo4j has active queries (>0 QPS)
- [ ] Graph sync health dashboard operational

### Phase 2 Success Criteria
- [ ] All 290 constituencies mapped with boundaries
- [ ] >80% of users have constituency assigned
- [ ] "Your MP" section visible on dashboard

### Phase 3 Success Criteria
- [ ] `CivicScoreCard` shows 0 engagement metrics
- [ ] Accountability metrics dashboard live
- [ ] Electoral cycle countdown visible

### Phase 4 Success Criteria
- [ ] Export API documented and tested
- [ ] At least 1 civil society partner using exports
- [ ] Root directory clean (0 temp files)

## Risk Mitigation

### Risk: Neo4j Performance at Scale
**Mitigation**: 
- Start with read-only queries
- Implement query result caching
- Monitor query performance from day 1
- Have PostgreSQL fallback for critical paths

### Risk: Constituency Data Quality
**Mitigation**:
- Source from official IEBC data
- Implement data validation pipeline
- Allow user-reported corrections
- Regular data refresh schedule

### Risk: Metric Gaming
**Mitigation**:
- Rate limit accountability actions
- Require verification for high-impact metrics
- Implement fraud detection for suspicious patterns
- Make methodology transparent but not exploitable

## Timeline

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1-2  | Phase 1 | Electoral accountability feature module, Neo4j activated |
| 3-4  | Phase 2 | Constituency mapping complete, user assignment live |
| 5    | Phase 3 | Outcome metrics deployed, engagement metrics removed |
| 6    | Phase 4 | Export API live, root cleanup complete |

## Next Actions

1. **Immediate** (This Week):
   - Create `client/src/features/electoral-accountability/` directory
   - Audit Neo4j sync infrastructure usage
   - Source IEBC constituency boundary data

2. **Short-term** (Next 2 Weeks):
   - Move `ElectoralPressure.tsx` to new module
   - Implement first Neo4j relationship queries
   - Add constituency selection to user registration

3. **Medium-term** (Next 4 Weeks):
   - Complete constituency data integration
   - Redeploy `CivicScoreCard` with outcome metrics
   - Launch export API for civil society partners

---

**Document Owner**: Technical Lead  
**Review Cadence**: Weekly  
**Stakeholders**: Product, Engineering, Civil Society Partners

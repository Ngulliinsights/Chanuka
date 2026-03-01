# ADR-018: Analytics vs Analysis Feature Separation

**Status:** Accepted  
**Date:** 2026-03-01  
**Context:** Feature Boundary Clarification

---

## Context

The `analytics` and `analysis` features have overlapping concerns with unclear boundaries:

**Current Issues:**
- Both features analyze bills
- Conflict detection exists in both
- Transparency concerns duplicated
- Legal/constitutional analysis split
- Unclear ownership of ML services

**Impact:**
- Developer confusion about where to add code
- Duplicate implementations
- Inconsistent patterns
- Difficult to maintain

## Decision

Restructure into four focused features with clear boundaries:

### 1. `engagement-metrics` (renamed from `analytics`)

**Purpose:** Quantitative user and content engagement tracking

**Scope:**
- User engagement metrics
- Bill engagement tracking
- Comment/vote analytics
- Activity patterns
- Performance metrics

**Services:**
- `EngagementMetricsService`
- `ActivityTrackingService`
- `PerformanceMetricsService`

### 2. `bill-assessment` (renamed from `analysis`)

**Purpose:** Qualitative bill evaluation and scoring

**Scope:**
- Constitutional compliance checking
- Stakeholder impact analysis
- Public interest scoring
- Transparency assessment
- Comprehensive bill evaluation

**Services:**
- `ConstitutionalAssessmentService`
- `StakeholderImpactService`
- `PublicInterestService`
- `TransparencyAssessmentService`
- `ComprehensiveBillAssessmentService`

### 3. `ml-intelligence` (new feature)

**Purpose:** Machine learning predictions and recommendations

**Scope:**
- ML-based predictions
- Recommendation engine
- Pattern detection
- Anomaly detection

**Services:**
- `MLPredictionService`
- `RecommendationService`
- `PatternDetectionService`

### 4. `financial-oversight` (new feature)

**Purpose:** Financial disclosure and conflict detection

**Scope:**
- Financial disclosure analytics
- Sponsor conflict detection
- Financial conflict analysis
- Funding transparency

**Services:**
- `FinancialDisclosureService`
- `ConflictDetectionService`
- `FundingTransparencyService`

## Cross-Feature Integration

```
engagement-metrics:
  Provides: User engagement data, activity metrics
  Consumes: Bills, users, comments data
  Used by: bill-assessment (for engagement-based scoring)

bill-assessment:
  Provides: Quality scores, compliance checks
  Consumes: Bills, constitutional provisions, engagement metrics
  Used by: Recommendation systems, dashboards

ml-intelligence:
  Provides: Predictions, recommendations, patterns
  Consumes: All feature data
  Used by: All features for intelligent insights

financial-oversight:
  Provides: Conflict detection, disclosure analysis
  Consumes: Sponsors, bills, financial data
  Used by: bill-assessment (transparency scoring)
```

## Consequences

### Positive
- Clear feature boundaries
- Single responsibility per feature
- Easier to understand and maintain
- Better testability
- Reduced code duplication
- Clear ownership

### Negative
- Requires significant refactoring
- Need to update all imports
- May temporarily break some functionality
- Documentation needs updates

### Neutral
- Phased migration possible
- Can maintain backward compatibility during transition

## Implementation

### Phase 1: Infrastructure Integration (Current Features)
1. Add validation schemas to `analysis` feature
2. Implement caching in `analysis` services
3. Add security integration to both features
4. Standardize error handling patterns

### Phase 2: Boundary Clarification
1. Move conflict detection to dedicated feature
2. Consolidate transparency concerns
3. Separate ML services
4. Document clear ownership

### Phase 3: Rename and Restructure
1. Rename `analytics` → `engagement-metrics`
2. Rename `analysis` → `bill-assessment`
3. Create `ml-intelligence` feature
4. Create `financial-oversight` feature
5. Update all imports and references

## Related

- ADR-004: Feature Structure Convention
- Analytics vs Analysis Audit
- Feature Modernization Audit

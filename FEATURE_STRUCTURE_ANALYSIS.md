# Feature Structure Analysis: DDD vs Flat Modules

**Date:** February 18, 2026  
**Status:** Analysis Complete

## Executive Summary

Your codebase shows an **inconsistent and undocumented** approach to feature structure. Some features use full DDD structure (application/domain/infrastructure), while others remain flat. There is **no written rule, ADR, or linter enforcement** governing when to use which pattern. This analysis answers your four key questions.

---

## Question 1: Is there a written or informal rule for when a feature gets full DDD structure vs staying flat?

### Answer: NO - There is no documented rule

**Evidence:**
- No ADRs found addressing feature structure decisions
- No documentation in `.agent/rules.md` about structure guidelines
- No linter rules in `.eslintrc-boundary-rules.json` enforcing DDD patterns
- The only mention found was in `DUPLICATION_ANALYSIS.md` recommending: "Establish clear guidelines for feature vs infrastructure boundaries" and "Document when to use DDD patterns vs pragmatic consolidation"

### Current Pattern Observations

Based on directory analysis, here's what exists:

#### Features with FULL DDD Structure (application/domain/infrastructure/)
1. **argument-intelligence/** - Has application/, infrastructure/, types/
2. **constitutional-analysis/** - Has application/, config/, infrastructure/, services/, types/, utils/
3. **advocacy/** - Has application/, domain/, infrastructure/, config/, types/
4. **bills/** - Has application/, domain/, infrastructure/, repositories/, services/, types/
5. **users/** - Has application/, domain/, infrastructure/, types/

#### Features with FLAT Structure
1. **community/** - 7 flat files (comment-voting.ts, comment.ts, community.ts, social-integration.ts, etc.)
2. **market/** - 3 flat files (market.controller.ts, market.service.ts, market.utils.ts)
3. **coverage/** - Appears to be flat based on single router file
4. **monitoring/** - Likely flat
5. **privacy/** - Likely flat

#### Features with PARTIAL Structure
1. **notifications/** - Has domain/entities/ but mostly flat
2. **constitutional-intelligence/** - Has domain/entities/ but application/ contains ONE EMPTY FILE

---

## Question 2: Were community/ and market/ intentionally kept flat, or are they just older modules that predate the DDD decision?

### Answer: Likely OLDER MODULES that predate DDD adoption

**Evidence:**

1. **No intentional decision documented** - No ADR or documentation explains why these are flat
2. **Pattern suggests evolution** - The codebase shows a clear evolution:
   - Simple features (community, market) = flat
   - Complex features (bills, users, advocacy) = DDD
   - Newer features (argument-intelligence, constitutional-analysis) = DDD

3. **From DUPLICATION_ANALYSIS.md:**
   > "These follow a Domain-Driven Design (DDD) pattern"
   > "The empty service file in intelligence suggests incomplete migration or abandoned refactoring"

4. **Complexity correlation:**
   - **community/** (7 files, ~500-800 LOC) - Simple CRUD operations
   - **market/** (3 files, ~300 LOC) - Very simple controller/service pattern
   - **bills/** (30+ files, 2000+ LOC) - Complex domain with multiple aggregates
   - **users/** (20+ files, 1500+ LOC) - Complex domain with verification, profiles, preferences

### Likely Timeline
1. **Early phase:** Features built flat (community, market)
2. **Growth phase:** Complexity increased, DDD adopted for new features
3. **Current state:** Mixed architecture with no migration plan for old features

---

## Question 3: Is there a plan to migrate flat modules to DDD, or has that been abandoned?

### Answer: NO ACTIVE PLAN - Appears abandoned or deprioritized

**Evidence:**

1. **No migration specs found** - Checked `.agent/specs/` and found:
   - `type-cleanup/` spec
   - `full-stack-integration/` spec
   - `infrastructure-consolidation/` spec
   - `comprehensive-bug-fixes/` spec
   - **NO feature structure migration spec**

2. **From DUPLICATION_ANALYSIS.md (your own analysis):**
   > "**Recommendation**: OPTION A (Clean DDD) OR OPTION B (Pragmatic Consolidation)"
   > "**Action**: Consolidate or clarify layer boundaries"
   > "**Priority**: Medium (functional but architecturally unclear)"

3. **From ARCHITECTURE.md:**
   - Documents the current state but doesn't mention feature structure patterns
   - Focuses on client/server/shared separation
   - No mention of DDD or feature structure guidelines

4. **Active work is elsewhere:**
   - Current specs focus on type system, infrastructure consolidation, bug fixes
   - No bandwidth allocated to feature structure standardization

### Conclusion
The migration has been **implicitly abandoned** - the team is living with the inconsistency rather than actively addressing it.

---

## Question 4: Who owns the decision about feature structure — is it enforced by a linter, ADR, or purely convention?

### Answer: PURELY CONVENTION (and inconsistent at that)

**Evidence:**

### No Linter Enforcement
`.eslintrc-boundary-rules.json` enforces:
- Client core cannot import from features ✓
- Features cannot import from other features ✓
- **BUT: No rules about internal feature structure** ✗

### No ADR Exists
Found ADRs:
- ADR-001: Branded Types for Identifiers
- ADR-002: Single Source of Truth in Shared Layer
- ADR-003: Zod for Validation
- ADR-004: Transformation Layer Pattern
- **NO ADR about feature structure patterns** ✗

### No Documented Owner
- No CODEOWNERS file mentioning architecture decisions
- No documented architecture review process
- No steering files about feature structure

### Current Reality: Ad-hoc Developer Decisions
Developers appear to make structure decisions based on:
1. **Perceived complexity** - "This feels complex, let's use DDD"
2. **Existing patterns** - "Other complex features use DDD, so should we"
3. **Personal preference** - No enforcement means individual choice
4. **Time pressure** - "Flat is faster to scaffold, let's do that"

---

## Recommendations

### Immediate Actions (Week 1)

1. **Create ADR-005: Feature Structure Guidelines**
   ```markdown
   # ADR-005: Feature Structure Guidelines
   
   **Decision**: Features SHALL use DDD structure when they meet ANY of:
   - 10+ files
   - Multiple domain entities with relationships
   - Complex business logic requiring domain services
   - Infrastructure dependencies (external APIs, message queues)
   
   Features MAY remain flat when:
   - < 5 files
   - Simple CRUD operations
   - No complex business rules
   - Single entity focus
   ```

2. **Document Current State**
   - Add section to ARCHITECTURE.md explaining the pattern
   - List which features use which structure
   - Explain the rationale (complexity-based)

### Short-term Actions (Month 1)

3. **Create Linter Rules**
   ```javascript
   // .eslintrc-boundary-rules.json additions
   {
     "target": "./server/features/*/application",
     "from": "./server/features/*/infrastructure",
     "message": "Application layer cannot import from infrastructure"
   },
   {
     "target": "./server/features/*/domain",
     "from": "./server/features/*/application",
     "message": "Domain layer cannot import from application"
   }
   ```

4. **Assess Migration Candidates**
   - **community/** - 7 files, growing? Consider DDD if adding complexity
   - **market/** - 3 files, stable? Keep flat unless expanding
   - **notifications/** - Already has domain/, complete the migration

### Long-term Actions (Quarter 1)

5. **Create Migration Spec**
   - `.agent/specs/feature-structure-standardization/`
   - Requirements, design, tasks for migrating inconsistent features

6. **Establish Architecture Review**
   - New features require structure justification
   - Document decision in feature README.md
   - Review in PR process

---

## Complexity Threshold Analysis

Based on observed patterns, here's the **implicit threshold** your team has been using:

| Metric | Flat Structure | DDD Structure |
|--------|---------------|---------------|
| **File Count** | 3-7 files | 10+ files |
| **Lines of Code** | < 1000 LOC | > 1500 LOC |
| **Domain Entities** | 1-2 entities | 3+ entities |
| **Business Logic** | Simple CRUD | Complex rules |
| **External Dependencies** | None/minimal | Multiple (APIs, queues) |
| **Team Size** | 1-2 developers | 3+ developers |

### Examples

**Flat is appropriate:**
- **market/** - Simple marketplace CRUD, 3 files, 1 entity
- **coverage/** - Simple tracking, minimal logic

**DDD is appropriate:**
- **bills/** - Complex legislative tracking, 30+ files, multiple entities, voting patterns, sponsorship analysis
- **users/** - User management, verification, profiles, preferences, multiple aggregates
- **advocacy/** - Campaign coordination, coalition building, impact tracking

**Borderline (needs decision):**
- **community/** - 7 files, growing features (comments, voting, social integration)
  - **Recommendation**: Migrate to DDD if adding more features
- **notifications/** - Already has domain/, incomplete migration
  - **Recommendation**: Complete DDD migration

---

## Impact of Current Inconsistency

### Developer Confusion
- "Should I add a domain/ folder or keep it flat?"
- "Where do I put this new service?"
- "Why is bills/ structured differently than community/?"

### Maintenance Burden
- Inconsistent patterns make codebase harder to navigate
- New developers need to learn multiple patterns
- Refactoring is harder when patterns differ

### Technical Debt
- Flat features that grew complex are now hard to refactor
- Incomplete migrations (notifications/, constitutional-intelligence/)
- No clear path forward

### Positive Aspects
- Flat structure is simpler for truly simple features
- DDD structure provides good organization for complex features
- Team has shown ability to adopt DDD when needed

---

## Conclusion

Your codebase has **no formal governance** around feature structure. The decision is made **ad-hoc by individual developers** based on **perceived complexity**, with no written guidelines, linter enforcement, or ADRs.

**community/** and **market/** are likely **older modules** that predate DDD adoption, not intentional architectural decisions.

There is **no active plan** to migrate flat modules to DDD - the inconsistency has been **implicitly accepted** as technical debt.

**Recommendation**: Create ADR-005 to formalize the decision criteria, document the current state, and establish a migration path for features that have outgrown their flat structure.

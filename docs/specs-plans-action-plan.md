# Specs and Plans Action Plan

**Created:** February 24, 2026  
**Priority:** HIGH  
**Timeline:** 3 weeks

---

## Quick Summary

**Problem:** Type-cleanup spec (70% complete) conflicts with plans on type centralization approach.

**Solution:** Complete spec → Archive → Adopt hybrid approach → Update plans → Establish governance

**Timeline:** 3 weeks (1 day immediate, 2 weeks short-term, ongoing long-term)

---

## Immediate Actions (Day 1)

### Action 1: Complete Type-Cleanup Spec
**Owner:** Development Team  
**Time:** 4-6 hours  
**Priority:** CRITICAL

**Tasks:**
```bash
# Task 5: Fix mock data type alignment
cd client/src/lib/data/mock
# Update bills.ts to match Bill interface
# Fix enum imports (import as values, not types)

# Task 6: Fix bill-base.ts duplicates
cd client/src/lib/types/bill
# Remove duplicate property declarations
# Verify urgency, complexity, lastActionDate present

# Task 7: Final verification
npx tsc --noEmit
# Count errors (target: <100)
# Update MIGRATION_LOG.md with results
```

**Success Criteria:**
- [ ] All 7 tasks in `.agent/specs/type-cleanup/tasks.md` marked complete
- [ ] TSC errors reduced from 1000+ to <100
- [ ] MIGRATION_LOG.md updated

---

### Action 2: Archive Completed Spec
**Owner:** Development Team  
**Time:** 30 minutes  
**Priority:** HIGH

**Commands:**
```bash
# Create archive directory
mkdir -p .agent/specs/archived

# Move completed spec
mv .agent/specs/type-cleanup .agent/specs/archived/type-cleanup-2026-02

# Create completion summary
cat > .agent/specs/archived/type-cleanup-2026-02/COMPLETION.md << 'EOF'
# Type Cleanup Spec - COMPLETED

**Completion Date:** February 24, 2026  
**Duration:** ~2 weeks  
**Final Status:** 7/7 tasks complete

## Achievements

### Error Reduction
- **Before:** 1000+ TypeScript compilation errors
- **After:** <100 errors
- **Improvement:** 90% reduction

### Architecture Established
- Two-tier type system (shared/ + client/lib/types/)
- Core module type proxies
- Single import gateway (lib/types/index.ts)

### Modules Refactored
- ✅ Core modules (storage, monitoring, security)
- ✅ Feature modules (users, bills, community)
- ✅ Search and analytics modules
- ✅ Mock data alignment

## Approach Validated

**Two-Tier System:**
```
shared/types/           ← Server-client common types
client/lib/types/       ← Client-enriched types
  └── index.ts          ← Re-exports shared + client-specific
```

**Benefits:**
- Client can enrich types without affecting server
- Shared types remain single source for common entities
- Clear separation of concerns

## Integration with Plans

This spec's two-tier approach has been integrated into `plans/design.md` as a hybrid model:
- Base types in shared/ (single source)
- Client enrichments in lib/types/ (UI-specific)

See `plans/INTEGRATION.md` for details.

## Lessons Learned

1. **Two-tier works:** Client needs UI-specific type enrichments
2. **Proxies help:** Core module type proxies maintain stable APIs
3. **Mock data matters:** Type alignment catches bugs early
4. **Incremental wins:** Reducing errors 90% is success even if not zero

## Next Steps

- [x] Archive this spec
- [ ] Update plans/ with hybrid approach
- [ ] Establish governance to prevent future conflicts
- [ ] Continue error reduction to zero

---

**Archived:** February 24, 2026  
**Status:** ✅ COMPLETE AND INTEGRATED
EOF

# Update tasks.md to mark all complete
sed -i 's/- \[ \]/- [x]/g' .agent/specs/archived/type-cleanup-2026-02/tasks.md
```

**Success Criteria:**
- [ ] Spec moved to archived/
- [ ] COMPLETION.md created
- [ ] All tasks marked complete

---

## Short-term Actions (Week 1-2)

### Action 3: Document Hybrid Type Approach
**Owner:** Tech Lead  
**Time:** 2 hours  
**Priority:** HIGH

**Create `plans/TYPE_SYSTEM.md`:**
```markdown
# Hybrid Type System Architecture

## Overview

The Chanuka project uses a hybrid type system combining:
1. **Shared Types** (`shared/types/`) - Server-client common entities
2. **Client Enrichments** (`client/lib/types/`) - UI-specific extensions

This approach emerged from the completed type-cleanup spec (Feb 2026) and provides the best of both centralization and flexibility.

## Architecture

### Shared Types (Base Layer)
**Location:** `shared/types/`  
**Purpose:** Single source of truth for domain entities

```typescript
// shared/types/domains/legislative.ts
export interface Bill {
  readonly id: number;
  readonly billNumber: string;
  readonly title: string;
  readonly status: BillStatus;
  readonly sponsors: readonly Sponsor[];
}

export enum BillStatus {
  INTRODUCED = 'introduced',
  COMMITTEE = 'committee',
  PASSED = 'passed',
}
```

### Client Enrichments (Extension Layer)
**Location:** `client/lib/types/`  
**Purpose:** UI-specific type extensions

```typescript
// client/lib/types/bill/bill-analytics.ts
import { Bill } from '@shared/types/domains/legislative';

export interface BillWithAnalytics extends Bill {
  readonly trackingCount: number;
  readonly viewCount: number;
  readonly commentCount: number;
  readonly engagementScore: number;
}

export interface BillEngagementMetrics {
  billId: number;
  views: number;
  comments: number;
  shares: number;
}
```

### Import Gateway
**Location:** `client/lib/types/index.ts`  
**Purpose:** Single entry point for all client imports

```typescript
// Re-export shared types
export type { Bill, BillStatus, Sponsor } from '@shared/types/domains/legislative';

// Export client enrichments
export * from './bill/bill-analytics';
export * from './community/community-types';
export * from './navigation/navigation-types';
```

## Usage Patterns

### Server Usage
```typescript
// Server imports from shared only
import { Bill, BillStatus } from '@shared/types/domains/legislative';

function createBill(data: Partial<Bill>): Bill {
  // Server logic
}
```

### Client Usage
```typescript
// Client imports from lib/types (which re-exports shared)
import { Bill, BillWithAnalytics } from '@client/lib/types';

function BillCard({ bill }: { bill: BillWithAnalytics }) {
  // Client component
}
```

## Benefits

1. **Single Source:** Base types defined once in shared/
2. **Flexibility:** Client can add UI-specific properties
3. **Type Safety:** Server and client share common types
4. **Maintainability:** Changes to base types propagate automatically

## Migration from Type-Cleanup Spec

The type-cleanup spec (archived Feb 2026) established this architecture through:
- Phase 1-4: Foundation and refactoring (complete)
- Phase 5-7: Mock data and verification (complete)

Result: 90% reduction in TypeScript errors (1000+ → <100)

## See Also

- `.agent/specs/archived/type-cleanup-2026-02/` - Original spec
- `plans/design.md` - Overall reorganization plan
- `plans/INTEGRATION.md` - Integration with other initiatives
```

**Success Criteria:**
- [ ] TYPE_SYSTEM.md created
- [ ] Hybrid approach documented
- [ ] Usage patterns clear

---

### Action 4: Update Plans with Hybrid Approach
**Owner:** Tech Lead  
**Time:** 3 hours  
**Priority:** HIGH

**Update `plans/design.md`:**
```bash
# Add section after "Component Specifications"
cat >> plans/design.md << 'EOF'

### Hybrid Type System (Integrated from Type-Cleanup Spec)

**Background:** The type-cleanup spec (completed Feb 2026) established a two-tier type system that has been integrated into this plan as a hybrid approach.

**Architecture:**
- **Shared Types** (`shared/types/`) - Base domain entities (Bill, User, Committee)
- **Client Enrichments** (`client/lib/types/`) - UI-specific extensions (BillWithAnalytics, NavigationState)
- **Import Gateway** (`client/lib/types/index.ts`) - Single entry point re-exporting shared + client types

**Rationale:**
- Server needs only base types
- Client needs UI-specific enrichments (tracking counts, engagement metrics)
- Hybrid provides single source for base + flexibility for extensions

**See:** `plans/TYPE_SYSTEM.md` for detailed architecture

EOF
```

**Update `plans/requirements.md`:**
```bash
# Update R1 to reflect hybrid approach
# Find R1 section and add clarification
sed -i '/## R1: Type System Centralization/a \
\n**Note:** This requirement uses a hybrid approach (shared base + client enrichments) based on completed type-cleanup spec (Feb 2026). See plans/TYPE_SYSTEM.md for details.\n' plans/requirements.md
```

**Success Criteria:**
- [ ] plans/design.md references hybrid approach
- [ ] plans/requirements.md updated
- [ ] Cross-references to TYPE_SYSTEM.md added

---

### Action 5: Create Integration Document
**Owner:** Tech Lead  
**Time:** 1 hour  
**Priority:** MEDIUM

**Create `plans/INTEGRATION.md`:**
```markdown
# Plans Integration with Completed Specs

**Last Updated:** February 24, 2026

## Purpose

This document tracks how completed specs integrate into strategic plans, ensuring learnings are preserved and conflicts are resolved.

---

## Completed Specs

### Type-Cleanup Spec (Feb 2026)
**Location:** `.agent/specs/archived/type-cleanup-2026-02/`  
**Status:** ✅ COMPLETE  
**Duration:** ~2 weeks  
**Result:** 90% TSC error reduction (1000+ → <100)

**Approach:**
- Two-tier type system (shared/ + client/lib/types/)
- Core module type proxies
- Single import gateway

**Integration into Plans:**
- Adopted as hybrid approach in `plans/design.md`
- Documented in `plans/TYPE_SYSTEM.md`
- Updated R1 in `plans/requirements.md`

**Key Learnings:**
1. Client needs UI-specific type enrichments
2. Two-tier system provides best flexibility
3. Import gateway simplifies consumption
4. Mock data alignment catches bugs early

**Conflicts Resolved:**
- ✅ Type centralization approach (single vs two-tier) → Hybrid adopted
- ✅ Scope precedence (plans vs specs) → Complete spec first, then integrate

---

## Active Specs

None currently active.

---

## Integration Process

When a spec completes:
1. Archive spec to `.agent/specs/archived/[name]-[date]/`
2. Create COMPLETION.md summary
3. Identify learnings and conflicts
4. Update relevant plans/ documents
5. Add entry to this INTEGRATION.md
6. Cross-reference in both locations

---

## Next Review

**Date:** May 24, 2026 (Quarterly)  
**Agenda:**
- Review archived specs
- Check for new conflicts
- Update integration status
- Archive stale plans if complete

---

**Maintained by:** Tech Lead  
**Review Frequency:** Quarterly
```

**Success Criteria:**
- [ ] INTEGRATION.md created
- [ ] Type-cleanup integration documented
- [ ] Process defined

---

### Action 6: Establish Governance Policy
**Owner:** Tech Lead  
**Time:** 2 hours  
**Priority:** HIGH

**Create `.agent/GOVERNANCE.md`:**
```markdown
# Specs and Plans Governance

**Effective Date:** February 24, 2026  
**Review Frequency:** Quarterly

---

## Purpose

Prevent conflicts between strategic plans (`plans/`) and tactical specs (`.agent/specs/`) by establishing clear roles, precedence, and lifecycle management.

---

## Definitions

### Plans (`plans/`)
**Purpose:** Strategic initiatives affecting multiple systems  
**Scope:** Multi-week, cross-cutting changes  
**Examples:** Shared directory reorganization, error-management adoption

**Characteristics:**
- Broad scope (types + validation + constants + error-mgmt)
- Long timeline (weeks to months)
- Multiple phases
- Affects server + client

### Specs (`.agent/specs/`)
**Purpose:** Tactical implementations of specific features  
**Scope:** Single feature, time-boxed  
**Examples:** Type cleanup, API refactoring

**Characteristics:**
- Narrow scope (one system or feature)
- Short timeline (days to weeks)
- Clear completion criteria
- May affect single workspace

---

## Relationship Rules

### Rule 1: Specs Reference Plans
**WHEN** creating a spec that relates to an existing plan  
**THEN** the spec MUST reference the parent plan  
**WHERE** in the spec's design.md or requirements.md

**Example:**
```markdown
## Related Plans

This spec implements Phase 2 (Type Migration) of the Shared Directory Reorganization plan.

See: `plans/design.md` - Phase 2
```

### Rule 2: Plans Acknowledge Specs
**WHEN** a plan overlaps with an in-progress spec  
**THEN** the plan MUST acknowledge the spec  
**WHERE** in the plan's design.md

**Example:**
```markdown
## In-Progress Work

The type-cleanup spec is 70% complete and addresses client-side type centralization. This plan will integrate its learnings upon completion.

See: `.agent/specs/type-cleanup/`
```

### Rule 3: Conflict Resolution
**WHEN** a plan and spec conflict  
**THEN** resolve using this priority:
1. Check completion status (prefer completing in-progress work)
2. Evaluate technical merit (better approach wins)
3. Consider scope (tactical spec may inform strategic plan)
4. Document decision in both locations

**Example Decision:**
```markdown
## Conflict Resolution: Type Centralization

**Conflict:** Plan assumes single shared source, spec uses two-tier system

**Resolution:** Complete spec (70% done), evaluate approach, adopt hybrid in plan

**Rationale:** Spec's two-tier approach validated through implementation, provides needed flexibility

**Date:** February 24, 2026
```

---

## Lifecycle Management

### Spec Lifecycle
```
Created → In Progress → Complete → Archived
```

**Created:**
- Spec created in `.agent/specs/[name]/`
- References parent plan (if exists)
- Includes design.md, requirements.md, tasks.md

**In Progress:**
- Tasks being implemented
- Progress tracked in tasks.md
- Updates communicated to plan owner

**Complete:**
- All tasks marked done
- Success criteria met
- COMPLETION.md created

**Archived:**
- Moved to `.agent/specs/archived/[name]-[date]/`
- Learnings integrated into plans
- Entry added to `plans/INTEGRATION.md`

### Plan Lifecycle
```
Created → Active → Complete → Archived
```

**Created:**
- Plan created in `plans/`
- Includes design.md, requirements.md
- Acknowledges related specs

**Active:**
- Phases being implemented
- May spawn tactical specs
- Tracks completion status

**Complete:**
- All phases done
- Success criteria met
- COMPLETION.md created

**Archived:**
- Moved to `plans/archived/[name]-[date]/`
- Learnings documented
- Referenced in future plans

---

## Quarterly Review Process

**Schedule:** Every 3 months (May, Aug, Nov, Feb)

**Checklist:**
- [ ] Identify completed specs → Archive
- [ ] Identify completed plans → Archive
- [ ] Check for stale work (>90 days no updates) → Close or revive
- [ ] Review for conflicts → Resolve
- [ ] Update INTEGRATION.md
- [ ] Update this GOVERNANCE.md if needed

**Owner:** Tech Lead  
**Duration:** 2 hours  
**Output:** Review summary in `docs/quarterly-review-[date].md`

---

## Conflict Prevention

### Before Creating a Spec
1. Check if related plan exists
2. Review plan's approach
3. Decide: Implement plan phase OR propose alternative
4. If alternative, document rationale

### Before Creating a Plan
1. Check for in-progress specs
2. Review spec's approach
3. Decide: Wait for completion OR integrate OR supersede
4. Document decision

---

## Examples

### Good: Spec References Plan
```markdown
# Type Cleanup Spec

## Context
This spec implements Phase 2 (Type Migration) of the Shared Directory Reorganization plan with a tactical focus on client-side cleanup.

## Relationship to Plan
- Plan: `plans/design.md` - Phase 2
- Scope: Client-only (narrower than plan)
- Approach: Two-tier system (may inform plan)
```

### Good: Plan Acknowledges Spec
```markdown
# Shared Directory Reorganization Plan

## Phase 2: Type Migration

**Note:** The type-cleanup spec is in progress (70% complete). Upon completion, we will evaluate its two-tier approach for integration into this plan.

See: `.agent/specs/type-cleanup/`
```

### Bad: Conflicting Without Acknowledgment
```markdown
# Type Cleanup Spec
We will centralize all types in client/lib/types/.

# Shared Reorganization Plan
We will centralize all types in shared/types/.

❌ No cross-reference, no conflict resolution
```

---

## Success Criteria

- [ ] No unresolved conflicts between plans and specs
- [ ] All specs reference parent plans (if applicable)
- [ ] All plans acknowledge related specs
- [ ] Quarterly reviews completed on schedule
- [ ] Archived work properly documented

---

**Maintained by:** Tech Lead  
**Last Review:** February 24, 2026  
**Next Review:** May 24, 2026
```

**Success Criteria:**
- [ ] GOVERNANCE.md created
- [ ] Rules clearly defined
- [ ] Lifecycle documented
- [ ] Quarterly review scheduled

---

## Long-term Actions (Ongoing)

### Action 7: First Quarterly Review
**Owner:** Tech Lead  
**Date:** May 24, 2026  
**Time:** 2 hours  
**Priority:** MEDIUM

**Agenda:**
1. Review archived specs (type-cleanup)
2. Check plans/ progress
3. Identify any new conflicts
4. Update INTEGRATION.md
5. Archive completed plans (if any)

**Output:** `docs/quarterly-review-2026-05.md`

---

## Summary

### Timeline

| Week | Actions | Owner | Time |
|------|---------|-------|------|
| **Day 1** | Complete type-cleanup spec | Dev Team | 4-6 hours |
| **Day 1** | Archive completed spec | Dev Team | 30 min |
| **Week 1** | Document hybrid approach | Tech Lead | 2 hours |
| **Week 1** | Update plans | Tech Lead | 3 hours |
| **Week 2** | Create INTEGRATION.md | Tech Lead | 1 hour |
| **Week 2** | Create GOVERNANCE.md | Tech Lead | 2 hours |
| **May 2026** | First quarterly review | Tech Lead | 2 hours |

**Total Immediate Time:** 5-7 hours  
**Total Short-term Time:** 8 hours  
**Ongoing:** 2 hours quarterly

### Success Metrics

- [ ] Type-cleanup spec 100% complete
- [ ] TSC errors <100 (90% reduction)
- [ ] Hybrid approach documented
- [ ] Plans updated with learnings
- [ ] Governance established
- [ ] No unresolved conflicts

---

**Action Plan Created:** February 24, 2026  
**Priority:** HIGH  
**Status:** READY TO EXECUTE

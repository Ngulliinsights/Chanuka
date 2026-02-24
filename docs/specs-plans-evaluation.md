# Specs and Plans Evaluation

**Evaluation Date:** February 24, 2026  
**Evaluator:** Strategic Analysis  
**Scope:** `plans/` and `.agent/specs/` directories

---

## Executive Summary

### Key Findings

| Issue | Severity | Impact |
|-------|----------|--------|
| **Overlapping Type Requirements** | HIGH | Conflicting approaches to type centralization |
| **Stale Type-Cleanup Spec** | MEDIUM | 70% complete, needs closure or archival |
| **Scope Confusion** | HIGH | Unclear precedence between plans and specs |
| **Missing Integration** | HIGH | No clear path to merge both initiatives |

### Recommendations

1. **CONSOLIDATE:** Merge type-related requirements into single source
2. **COMPLETE:** Finish type-cleanup spec (3 tasks remaining) then archive
3. **CLARIFY:** Establish plans/ as strategic, specs/ as tactical
4. **INTEGRATE:** Create unified implementation roadmap

---

## Detailed Analysis

### 1. Plans Directory (`plans/`)

#### plans/design.md
**Status:** ACTIVE - Strategic design document  
**Scope:** Comprehensive shared directory reorganization  
**Quality:** HIGH - Well-structured with diagrams and clear phases

**Content:**
- Phase 0: Delete low-quality modules (rate-limiting, repositories, services, modernization)
- Phase 0A: Error-management adoption (46/70 vs 36/70 quality)
- Phases 1-7: Shared types, validation, constants, infrastructure relocation
- Client selective integration strategy

**Strengths:**
- Quality-based decision making (scores documented)
- Clear migration phases with time estimates
- Comprehensive architecture diagrams
- Risk assessment for each phase

**Issues:**
- ⚠️ Overlaps with type-cleanup spec on type centralization
- ⚠️ No reference to existing type-cleanup work
- ⚠️ Assumes clean slate, doesn't account for in-progress work

#### plans/requirements.md
**Status:** ACTIVE - Requirements specification  
**Scope:** Formal requirements for shared reorganization  
**Quality:** HIGH - Structured with acceptance criteria

**Content:**
- R0: Quality-based module cleanup
- R1: Type system centralization
- R2: Validation rules unification
- R3: Constants consolidation
- R3A: Error-management adoption
- R4: Infrastructure relocation
- R5: Import path configuration
- R6: Client selective integration
- R6A: Server-only module enforcement
- R7: Documentation

**Strengths:**
- Formal requirement structure (WHEN/THEN/WHERE)
- Clear acceptance criteria
- Comprehensive coverage

**Issues:**
- ⚠️ R1 (Type System Centralization) conflicts with type-cleanup spec
- ⚠️ No acknowledgment of existing type work
- ⚠️ Treats types as greenfield project

---

### 2. Specs Directory (`.agent/specs/type-cleanup/`)

#### .agent/specs/type-cleanup/design.md
**Status:** IN PROGRESS - 70% complete  
**Scope:** Client-only type system cleanup  
**Quality:** HIGH - Detailed with diagrams

**Content:**
- Two-tier type system (shared/ + client/lib/types/)
- Type hierarchy and import patterns
- Core module proxies
- Migration phases 1-4 complete

**Strengths:**
- Focused scope (client-only)
- Clear architecture diagrams
- Practical implementation details
- Progress tracking

**Issues:**
- ⚠️ Overlaps with plans/design.md on type centralization
- ⚠️ Different approach than plans (two-tier vs single shared/)
- ⚠️ 70% complete but not referenced in plans

#### .agent/specs/type-cleanup/requirements.md
**Status:** IN PROGRESS  
**Scope:** Requirements for client type cleanup  
**Quality:** MEDIUM - Less formal than plans/requirements.md

**Content:**
- Requirement 1: Single source of truth (lib/types/)
- Requirement 2: Core module type proxies
- Requirement 3: Mock data alignment
- Requirement 4: Zero TSC errors

**Issues:**
- ⚠️ Conflicts with plans/requirements.md R1
- ⚠️ Different single source of truth (lib/types/ vs shared/types/)

#### .agent/specs/type-cleanup/tasks.md
**Status:** IN PROGRESS - 4/7 tasks complete  
**Scope:** Implementation checklist  
**Quality:** HIGH - Clear progress tracking

**Completed:**
- ✅ Tasks 1-4: Foundation, core modules, features, search/analytics

**Remaining:**
- ❌ Task 5: Fix mock data type alignment
- ❌ Task 6: Fix bill-base.ts duplicate properties
- ❌ Task 7: Final verification

**Issues:**
- ⚠️ No integration with plans/ roadmap
- ⚠️ Unclear if this work should continue or be superseded

---

## Conflict Analysis

### Conflict 1: Type Centralization Approach

**plans/design.md approach:**
```
shared/types/           ← Single source for server + client
  ├── bill.types.ts
  ├── user.types.ts
  └── api.types.ts

client imports from @shared/types
server imports from @shared/types
```

**specs/type-cleanup approach:**
```
shared/types/           ← Server-client common only
client/lib/types/       ← Client-enriched types
  ├── bill/
  ├── community/
  └── navigation/

client imports from @client/lib/types (re-exports shared where needed)
```

**Analysis:**
- Plans: Single shared source (simpler, more centralized)
- Specs: Two-tier system (more flexible, client-specific enrichment)
- **Conflict:** Fundamentally different architectures

**Recommendation:** Choose one approach based on:
- If client needs enriched types → Use specs approach (two-tier)
- If types are identical → Use plans approach (single shared)

### Conflict 2: Scope and Precedence

**plans/ scope:**
- Comprehensive reorganization (types, validation, constants, error-management)
- Strategic initiative affecting entire codebase
- 12-day timeline

**specs/type-cleanup scope:**
- Tactical client type cleanup
- Focused on resolving ~1000 TSC errors
- 70% complete, 3 tasks remaining

**Analysis:**
- Plans treat types as part of larger initiative
- Specs treat types as standalone cleanup
- **Conflict:** Unclear which takes precedence

**Recommendation:**
- Complete specs/type-cleanup (3 tasks, ~1 day)
- Archive completed spec
- Integrate learnings into plans/
- Use plans/ as strategic roadmap going forward

---

## Recommendations

### Immediate Actions (Week 1)

#### 1. Complete Type-Cleanup Spec ✅ FINISH
**Rationale:** 70% done, only 3 tasks remaining

**Actions:**
```bash
# Task 5: Fix mock data type alignment
- Update lib/data/mock/bills.ts
- Fix enum imports (values not types)

# Task 6: Fix bill-base.ts duplicates
- Remove duplicate properties
- Verify interface completeness

# Task 7: Final verification
- Run npx tsc --noEmit
- Count errors (target: <100)
- Update MIGRATION_LOG.md
```

**Timeline:** 1 day  
**Owner:** Development team  
**Success:** Type-cleanup spec marked complete and archived

#### 2. Archive Completed Spec 📦 ARCHIVE
**Rationale:** Preserve work but remove from active specs

**Actions:**
```bash
# Move to archive
mv .agent/specs/type-cleanup .agent/specs/archived/type-cleanup-2026-02

# Create completion summary
cat > .agent/specs/archived/type-cleanup-2026-02/COMPLETION.md << EOF
# Type Cleanup Spec - COMPLETED

**Completion Date:** February 24, 2026
**Final Status:** 7/7 tasks complete
**TSC Errors:** 1000+ → <100 (90% reduction)

## Achievements
- Established lib/types/ as client type gateway
- Created core module type proxies
- Refactored feature modules
- Fixed mock data alignment

## Integration with Plans
- Two-tier approach validated
- Learnings integrated into plans/design.md
- Client-specific type enrichment preserved
EOF
```

#### 3. Reconcile Type Approaches 🔄 INTEGRATE
**Rationale:** Resolve conflict between single-source vs two-tier

**Decision Matrix:**

| Criterion | Single Source (Plans) | Two-Tier (Specs) | Winner |
|-----------|----------------------|------------------|--------|
| Simplicity | ✅ Simpler | ❌ More complex | Plans |
| Client Flexibility | ❌ Limited | ✅ Enrichment possible | Specs |
| Maintenance | ✅ One location | ❌ Two locations | Plans |
| Current State | ❌ Requires migration | ✅ 70% implemented | Specs |

**Recommendation:** **HYBRID APPROACH**
```
shared/types/              ← Server-client common (base types)
  ├── domains/
  │   ├── legislative.ts   (Bill, Committee, Sponsor)
  │   └── authentication.ts (User, Session)
  └── api/
      └── responses.ts     (ApiResponse<T>)

client/lib/types/          ← Client enrichments only
  ├── index.ts             (re-exports shared + client-specific)
  ├── bill/
  │   └── bill-analytics.ts (BillEngagement, TrackingMetrics)
  └── navigation/
      └── navigation.ts    (NavigationState, RouteConfig)
```

**Rationale:**
- Base types in shared/ (single source for common entities)
- Client enrichments in lib/types/ (UI-specific extensions)
- Best of both approaches

---

### Short-term Actions (Week 2-3)

#### 4. Update Plans with Learnings 📝 REFINE
**Rationale:** Incorporate type-cleanup insights into strategic plans

**Actions:**
1. Update `plans/design.md`:
   - Add "Hybrid Type System" section
   - Document two-tier rationale
   - Reference completed type-cleanup work
   - Update Phase 2 (Types Migration) with hybrid approach

2. Update `plans/requirements.md`:
   - Revise R1 (Type System Centralization) to reflect hybrid
   - Add R1A: Client Type Enrichment
   - Reference type-cleanup completion

3. Create integration document:
```bash
# Create plans/INTEGRATION.md
cat > plans/INTEGRATION.md << EOF
# Plans Integration with Completed Specs

## Type-Cleanup Spec (Completed Feb 2026)
- Status: ✅ Complete
- Approach: Two-tier (shared + client enrichment)
- Result: 90% TSC error reduction
- Integration: Hybrid approach adopted in plans/

## Next Steps
1. Complete remaining plans phases (validation, constants, error-mgmt)
2. Use hybrid type system as foundation
3. Archive completed specs quarterly
EOF
```

#### 5. Establish Governance 📋 POLICY
**Rationale:** Prevent future conflicts between plans and specs

**Create `.agent/GOVERNANCE.md`:**
```markdown
# Specs and Plans Governance

## Purpose
- **plans/**: Strategic initiatives (multi-week, cross-cutting)
- **specs/**: Tactical implementations (single feature, time-boxed)

## Rules
1. Specs MUST reference parent plan (if exists)
2. Plans MUST acknowledge in-progress specs
3. Conflicts resolved by: Complete spec → Archive → Update plan
4. Quarterly review: Archive completed specs

## Lifecycle
- Spec created → Links to plan → Implemented → Archived
- Plan created → Spawns specs → Tracks completion → Archived

## Conflict Resolution
1. Check completion status (prefer completing in-progress work)
2. Evaluate approaches (technical merit)
3. Decide: Merge, supersede, or run parallel
4. Document decision in both locations
```

---

### Long-term Actions (Ongoing)

#### 6. Quarterly Spec Review 🔍 AUDIT
**Schedule:** Every 3 months (May, Aug, Nov, Feb)

**Checklist:**
- [ ] Identify completed specs → Archive
- [ ] Identify stale specs (>90 days no updates) → Close or revive
- [ ] Check for plan-spec conflicts → Resolve
- [ ] Update GOVERNANCE.md if needed

#### 7. Integration Testing 🧪 VERIFY
**Rationale:** Ensure plans and specs align in practice

**Actions:**
1. Create integration test suite
2. Verify type system works as designed
3. Test import paths resolve correctly
4. Validate no duplicate definitions

---

## Proposed Structure

### After Cleanup

```
.agent/
├── specs/
│   ├── archived/
│   │   └── type-cleanup-2026-02/    ✅ Completed spec
│   │       ├── design.md
│   │       ├── requirements.md
│   │       ├── tasks.md
│   │       └── COMPLETION.md        ← New summary
│   └── [future specs]
├── GOVERNANCE.md                     ← New policy
└── SPEC_SYSTEM.md                    ← Existing

plans/
├── design.md                         ← Updated with hybrid approach
├── requirements.md                   ← Updated R1 with hybrid
└── INTEGRATION.md                    ← New integration doc
```

---

## Success Criteria

### Immediate (Week 1)
- [ ] Type-cleanup spec completed (7/7 tasks)
- [ ] Spec archived with completion summary
- [ ] Hybrid type approach documented

### Short-term (Week 2-3)
- [ ] Plans updated with learnings
- [ ] INTEGRATION.md created
- [ ] GOVERNANCE.md established

### Long-term (Ongoing)
- [ ] No plan-spec conflicts
- [ ] Quarterly reviews scheduled
- [ ] Clear precedence rules followed

---

## Risk Assessment

### Low Risk ✅
- Completing type-cleanup spec (70% done, clear path)
- Archiving completed work (preserves history)
- Creating governance policy (documentation only)

### Medium Risk ⚠️
- Reconciling type approaches (requires technical decision)
- Updating plans (may affect ongoing work)

### High Risk ❌
- None identified

---

## Conclusion

**Primary Finding:**
The type-cleanup spec is 70% complete and conflicts with plans on type centralization approach. The spec uses a two-tier system (shared + client enrichment) while plans assume a single shared source.

**Strategic Opportunity:**
1. Complete the remaining 30% of type-cleanup (1 day)
2. Archive the completed spec
3. Adopt a hybrid approach in plans (best of both)
4. Establish governance to prevent future conflicts

**Recommended Timeline:**
- Week 1: Complete spec, archive, document hybrid approach
- Week 2-3: Update plans, create integration docs, establish governance
- Ongoing: Quarterly reviews, conflict prevention

**Next Steps:**
1. Assign developer to complete type-cleanup tasks 5-7
2. Create GOVERNANCE.md policy
3. Update plans/design.md with hybrid approach
4. Schedule first quarterly review (May 2026)

---

**Evaluation Complete:** February 24, 2026  
**Conflicts Identified:** 2 (type approach, scope precedence)  
**Recommendations:** 7 (complete, archive, integrate, refine, policy, audit, verify)  
**Risk Level:** LOW (clear path forward)

# Chanuka Platform - Documentation Index
**Last Updated**: February 23, 2026  
**Purpose**: Single source of truth for navigating platform documentation

---

## 🚀 START HERE

New to the project? Read these documents in order:

1. **[README.md](README.md)** - Project overview and quick start
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and module organization
3. **[COMPREHENSIVE_CODEBASE_AUDIT.md](COMPREHENSIVE_CODEBASE_AUDIT.md)** - Current state assessment
4. **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development guidelines

---

## 📊 TIER 1: CURRENT AUTHORITY (Must Read)

These documents represent the current, accurate state of the platform.

### Core Architecture
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture, module organization, shared/core explanation
- **[DDD_STRUCTURE_ANALYSIS.md](server/DDD_STRUCTURE_ANALYSIS.md)** - Repository pattern decision and file organization

### Current State Assessment
- **[COMPREHENSIVE_CODEBASE_AUDIT.md](COMPREHENSIVE_CODEBASE_AUDIT.md)** - Evidence-based reality check (Feb 2026)
- **[CODEBASE_AMBITION_VS_REALITY_AUDIT.md](CODEBASE_AMBITION_VS_REALITY_AUDIT.md)** - Vision vs implementation gap
- **[baseline_analysis.md](baseline_analysis.md)** - TypeScript error baseline
- **[STRATEGIC_DOCUMENTATION_ANALYSIS.md](STRATEGIC_DOCUMENTATION_ANALYSIS.md)** - Complete documentation inventory

### Recent Work
- **[CODEBASE_CONSOLIDATION_COMPLETE.md](CODEBASE_CONSOLIDATION_COMPLETE.md)** - Consolidation project summary (Feb 2026)
- **[CONSOLIDATION_SESSION_SUMMARY.md](CONSOLIDATION_SESSION_SUMMARY.md)** - Session summary (Feb 2026)

### Development Standards
- **[.agent/SPEC_SYSTEM.md](.agent/SPEC_SYSTEM.md)** - How specifications work
- **[.agent/rules.md](.agent/rules.md)** - Development standards and conventions

### Architectural Decisions
- **[ADR-001](.kiro/specs/full-stack-integration/ADR-001-branded-types-for-identifiers.md)** - Branded types for identifiers
- **[ADR-002](.kiro/specs/full-stack-integration/ADR-002-single-source-of-truth-shared-layer.md)** - Single source of truth in shared layer
- **[ADR-003](.kiro/specs/full-stack-integration/ADR-003-zod-for-validation.md)** - Zod for runtime validation
- **[ADR-004](.kiro/specs/full-stack-integration/ADR-004-transformation-layer-pattern.md)** - Transformation layer pattern

### Project Management
- **[README.md](README.md)** - Project overview
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development guidelines

---

## 📚 TIER 2: ACTIVE REFERENCE (Consult When Relevant)

### Active Specifications

#### Critical Path
- **[codebase-consolidation](.kiro/specs/codebase-consolidation/)** - ✅ Complete (Feb 2026)
- **[server-typescript-errors-remediation](.kiro/specs/server-typescript-errors-remediation/)** - 🟡 In Progress
- **[full-stack-integration](.kiro/specs/full-stack-integration/)** - 80% Complete

#### Quality & Architecture
- **[comprehensive-bug-fixes](.kiro/specs/comprehensive-bug-fixes/)** - 70% Complete
- **[client-architecture-refinement](.kiro/specs/client-architecture-refinement/)** - Planned
- **[type-system-standardization](.kiro/specs/type-system-standardization/)** - Planned

#### Infrastructure
- **[infrastructure-consolidation](.kiro/specs/infrastructure-consolidation/)** - Planned
- **[websocket-service-optimization](.kiro/specs/websocket-service-optimization/)** - Planned

### Civic Tech Documentation
- **[CIVIC_TECH_ROADMAP.md](.kiro/specs/CIVIC_TECH_ROADMAP.md)** - 10-week implementation plan
- **[CIVIC_TECH_FEATURE_AUDIT.md](.kiro/specs/CIVIC_TECH_FEATURE_AUDIT.md)** - Feature completeness assessment
- **[WEIGHTED_REPRESENTATION_DECISION.md](.kiro/specs/WEIGHTED_REPRESENTATION_DECISION.md)** - Geographic equity implementation
- **[FEATURE_PLACEMENT_MAP.md](.kiro/specs/FEATURE_PLACEMENT_MAP.md)** - Architecture guide

### Implementation Guides
- **[PHASE1_ARCHITECTURAL_DECISIONS.md](server/PHASE1_ARCHITECTURAL_DECISIONS.md)** - Phase 1 implementation plan
- **[PHASE1_COMPLETE.md](server/PHASE1_COMPLETE.md)** - Phase 1 summary
- **[API_VALIDATION_GUIDE.md](server/docs/API_VALIDATION_GUIDE.md)** - API validation patterns
- **[INITIALIZATION_ARCHITECTURE.md](server/docs/INITIALIZATION_ARCHITECTURE.md)** - Server initialization

---

## 📖 TIER 3: HISTORICAL CONTEXT (Understand Past Decisions)

These documents explain why things are the way they are.

- **[CONSOLIDATION_SESSION_SUMMARY.md](CONSOLIDATION_SESSION_SUMMARY.md)** - Consolidation session details
- **[DOCUMENTATION_AUDIT_REPORT.md](DOCUMENTATION_AUDIT_REPORT.md)** - Documentation audit findings
- **[.archive/](.archive/)** - 141 historical documents (see below)

---

## 🗄️ ARCHIVED DOCUMENTATION

The `.archive/` directory contains 141 historical documents. These are useful for understanding what was tried and why it didn't work, but should NOT be referenced for current work.

### Archive Categories

**"Complete" Documents (50+)**: Premature completion declarations
- Most claim completion of incomplete work
- Followed by gap discovery and re-attempts
- Useful only for understanding the pattern

**"Analysis" Documents (60+)**: Gap identification
- Documents identifying issues in "completed" work
- Show the cycle of incomplete migrations

**"Phase" Documents (20+)**: Phase completion claims
- Each phase has completion, verification, and summary docs
- Evidence shows most phases incomplete

**Graph Database Attempts**: Multiple incomplete implementations
- GRAPH_DATABASE_IMPLEMENTATION_PHASE1.md
- GRAPH_DATABASE_PHASE2_INDEX.md
- GRAPH_DATABASE_PHASE3_PLANNING.md
- GRAPH_VS_GRAPH2_ANALYSIS.md

---

## 🎯 FINDING WHAT YOU NEED

### I want to...

**Understand the overall architecture**
→ Read [ARCHITECTURE.md](ARCHITECTURE.md)

**Know the current state of the platform**
→ Read [COMPREHENSIVE_CODEBASE_AUDIT.md](COMPREHENSIVE_CODEBASE_AUDIT.md)

**Understand why things are the way they are**
→ Read [CODEBASE_AMBITION_VS_REALITY_AUDIT.md](CODEBASE_AMBITION_VS_REALITY_AUDIT.md)

**Work on a specific feature**
→ Check [.kiro/specs/](.kiro/specs/) for relevant specification

**Understand a past decision**
→ Check ADRs in [full-stack-integration](.kiro/specs/full-stack-integration/)

**Fix TypeScript errors**
→ Read [server-typescript-errors-remediation](.kiro/specs/server-typescript-errors-remediation/)

**Understand the civic tech roadmap**
→ Read [CIVIC_TECH_ROADMAP.md](.kiro/specs/CIVIC_TECH_ROADMAP.md)

**Set up development environment**
→ Read [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md)

---

## ⚠️ DEPRECATED DOCUMENTATION

These documents are no longer accurate and should NOT be referenced:

### Marked as Deprecated
- All documents in `.archive/` directory
- Any document with "DEPRECATED" header
- Documents superseded by newer versions

### How to Know if a Document is Deprecated
1. Check if it's in `.archive/` directory
2. Check for "DEPRECATED" header at top
3. Check "Last Updated" date (>6 months old may be outdated)
4. Cross-reference with this index

---

## 📝 DOCUMENTATION MAINTENANCE

### Update Frequency
- **Tier 1 documents**: Updated as changes occur
- **Tier 2 documents**: Reviewed monthly
- **This index**: Updated weekly

### Adding New Documentation
1. Create document in appropriate location
2. Add entry to this index in correct tier
3. Update related documents with cross-references
4. Follow [.agent/templates/](.agent/templates/) for format

### Archiving Documentation
1. Move to `.archive/` directory
2. Add "DEPRECATED" header with reason
3. Update this index
4. Update any documents that reference it

---

## 🔗 QUICK LINKS

### By Role

**New Developer**
1. README.md
2. ARCHITECTURE.md
3. CONTRIBUTING.md
4. .agent/rules.md

**Product Manager**
1. COMPREHENSIVE_CODEBASE_AUDIT.md
2. CIVIC_TECH_ROADMAP.md
3. CIVIC_TECH_FEATURE_AUDIT.md

**Technical Lead**
1. ARCHITECTURE.md
2. STRATEGIC_DOCUMENTATION_ANALYSIS.md
3. DDD_STRUCTURE_ANALYSIS.md
4. All ADRs

**QA/Testing**
1. COMPREHENSIVE_CODEBASE_AUDIT.md
2. baseline_analysis.md
3. comprehensive-bug-fixes spec

### By Task

**Fixing Bugs**
→ comprehensive-bug-fixes spec

**Adding Features**
→ CIVIC_TECH_ROADMAP.md + relevant spec

**Refactoring**
→ ARCHITECTURE.md + DDD_STRUCTURE_ANALYSIS.md

**Writing Tests**
→ COMPREHENSIVE_CODEBASE_AUDIT.md (test coverage section)

---

**Last Updated**: February 23, 2026  
**Maintained By**: Development Team  
**Review Cycle**: Weekly


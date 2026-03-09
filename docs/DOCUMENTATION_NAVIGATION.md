# Documentation Navigation Guide

**Last Updated:** March 9, 2026  
**Purpose:** Understand the relationship between different documentation systems

---

## Documentation Systems Overview

The Chanuka platform uses three complementary documentation systems:

### 1. ADR (Architectural Decision Records)
**Location:** `docs/adr/`  
**Purpose:** Formal architectural decisions with full context  
**Format:** Structured (Context → Decision → Consequences → Alternatives)  
**Audience:** Developers making architectural changes  
**Lifecycle:** Permanent record (can be superseded but not deleted)

**Use ADRs when:**
- Making architectural decisions
- Choosing technologies or patterns
- Changing system design
- Establishing conventions

**Example:** [ADR-012: Infrastructure Security Pattern](./adr/ADR-012-infrastructure-security-pattern.md)

### 2. DCS (Documentation Content Summary)
**Location:** `docs/DCS/`  
**Purpose:** Strategic reference guides and practical how-tos  
**Format:** Narrative guides, quick references, status summaries  
**Audience:** New developers, contributors, daily development  
**Lifecycle:** Living documents (updated as project evolves)

**Use DCS when:**
- Learning the system
- Looking for quick reference
- Understanding current status
- Following development workflows

**Example:** [DCS Architecture Guide](./DCS/ARCHITECTURE.md)

### 3. Root Documentation
**Location:** Project root (`/`)  
**Purpose:** Essential project information  
**Format:** Standard project files  
**Audience:** Everyone (developers, contributors, stakeholders)  
**Lifecycle:** Core project documentation

**Includes:**
- README.md - Project overview
- ARCHITECTURE.md - High-level architecture
- CONTRIBUTING.md - Contribution guidelines
- CHANGELOG.md - Change history

---

## How They Work Together

```
┌─────────────────────────────────────────────────────────┐
│                    Root Documentation                    │
│  README.md, ARCHITECTURE.md, CONTRIBUTING.md, etc.      │
│  (High-level overview for everyone)                     │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│     ADR      │  │     DCS      │
│   (Why?)     │  │    (How?)    │
├──────────────┤  ├──────────────┤
│ Formal       │  │ Practical    │
│ decisions    │  │ guides       │
│ with full    │  │ and quick    │
│ context      │  │ reference    │
└──────────────┘  └──────────────┘
        │                 │
        └────────┬────────┘
                 │
                 ▼
        Cross-referenced
        for complete picture
```

---

## Quick Decision Tree

### "I need to understand..."

**...why we made a specific architectural decision**
→ Check [ADR Index](./adr/README.md)

**...how the system is organized**
→ Read [DCS Architecture](./DCS/ARCHITECTURE.md)

**...how to get started**
→ Read [DCS Quick Reference](./DCS/QUICK_REFERENCE.md)

**...what features exist**
→ Read [DCS Core Features](./DCS/CORE_FEATURES.md)

**...current project status**
→ Read [DCS Security Status](./DCS/SECURITY_STATUS.md)

**...how to contribute**
→ Read [DCS Development Workflow](./DCS/DEVELOPMENT_WORKFLOW.md)

**...the big picture**
→ Read [Root ARCHITECTURE.md](../ARCHITECTURE.md)

---

## Topic-Based Navigation

### Architecture & Design

| Topic | ADR (Why?) | DCS (How?) | Root (Overview) |
|-------|------------|------------|-----------------|
| Overall Architecture | [ADR-004](./adr/ADR-004-feature-structure-convention.md) | [DCS Architecture](./DCS/ARCHITECTURE.md) | [ARCHITECTURE.md](../ARCHITECTURE.md) |
| API Client | [ADR-001](./adr/ADR-001-api-client-consolidation.md), [ADR-002](./adr/ADR-002-client-api-architecture.md) | [DCS Architecture](./DCS/ARCHITECTURE.md) | - |
| Validation | [ADR-006](./adr/ADR-006-validation-single-source.md) | [DCS Architecture](./DCS/ARCHITECTURE.md) | - |
| Error Handling | [ADR-014](./adr/ADR-014-error-handling-pattern.md) | [DCS Architecture](./DCS/ARCHITECTURE.md) | - |
| Caching | [ADR-013](./adr/ADR-013-caching-strategy.md) | [DCS Architecture](./DCS/ARCHITECTURE.md) | - |
| Security | [ADR-012](./adr/ADR-012-infrastructure-security-pattern.md) | [DCS Security Status](./DCS/SECURITY_STATUS.md) | - |

### Development Workflow

| Topic | ADR (Why?) | DCS (How?) | Root (Overview) |
|-------|------------|------------|-----------------|
| Feature Structure | [ADR-004](./adr/ADR-004-feature-structure-convention.md) | [DCS Development Workflow](./DCS/DEVELOPMENT_WORKFLOW.md) | - |
| Naming Conventions | [ADR-016](./adr/ADR-016-naming-conventions.md) | [DCS Development Workflow](./DCS/DEVELOPMENT_WORKFLOW.md) | - |
| Repository Pattern | [ADR-017](./adr/ADR-017-repository-pattern-standardization.md) | [DCS Quick Reference](./DCS/QUICK_REFERENCE.md) | - |
| Contributing | - | [DCS Development Workflow](./DCS/DEVELOPMENT_WORKFLOW.md) | [CONTRIBUTING.md](../CONTRIBUTING.md) |

### Code Organization

| Topic | ADR (Why?) | DCS (How?) | Root (Overview) |
|-------|------------|------------|-----------------|
| Utils Consolidation | [ADR-007](./adr/ADR-007-utils-consolidation.md) | [DCS Architecture](./DCS/ARCHITECTURE.md) | - |
| Type System | [ADR-011](./adr/ADR-011-type-system-single-source.md) | [DCS Architecture](./DCS/ARCHITECTURE.md) | - |
| Dead Code | [ADR-003](./adr/ADR-003-dead-vs-unintegrated-code.md) | - | - |
| Orphaned Components | [ADR-019](./adr/ADR-019-orphaned-infrastructure-cleanup.md) | - | - |

### Features & Capabilities

| Topic | ADR (Why?) | DCS (How?) | Root (Overview) |
|-------|------------|------------|-----------------|
| Core Features | - | [DCS Core Features](./DCS/CORE_FEATURES.md) | [CURRENT_CAPABILITIES.md](../CURRENT_CAPABILITIES.md) |
| Bill Pipeline | [ADR-015](./adr/ADR-015-intelligent-bill-pipeline.md) | [DCS Core Features](./DCS/CORE_FEATURES.md) | - |
| Analytics vs Analysis | [ADR-018](./adr/ADR-018-analytics-analysis-separation.md) | [DCS Core Features](./DCS/CORE_FEATURES.md) | - |

### Recent Changes

| Topic | ADR (Why?) | DCS (How?) | Root (Overview) |
|-------|------------|------------|-----------------|
| March 2026 Fixes | [ADR-020](./adr/ADR-020-root-documentation-consolidation.md) | - | - |
| Documentation Cleanup | [ADR-020](./adr/ADR-020-root-documentation-consolidation.md) | [Archive](./archive/root-cleanup-2026-03-09/) | - |

---

## For New Developers

### Day 1: Getting Started
1. Read [README.md](../README.md) - Project overview
2. Read [DCS Quick Reference](./DCS/QUICK_REFERENCE.md) - Setup and commands
3. Run `pnpm dev` and explore the app

### Day 2-3: Understanding Architecture
1. Read [ARCHITECTURE.md](../ARCHITECTURE.md) - High-level overview
2. Read [DCS Architecture](./DCS/ARCHITECTURE.md) - Detailed structure
3. Browse [ADR Index](./adr/README.md) - Key decisions

### Week 1: Contributing
1. Read [DCS Development Workflow](./DCS/DEVELOPMENT_WORKFLOW.md)
2. Read [CONTRIBUTING.md](../CONTRIBUTING.md)
3. Pick a small task and follow the workflow

### Ongoing: Reference
- Bookmark [DCS Quick Reference](./DCS/QUICK_REFERENCE.md)
- Check [DCS Core Features](./DCS/CORE_FEATURES.md) for feature status
- Consult [ADRs](./adr/README.md) when making architectural decisions

---

## For Experienced Developers

### Making Architectural Decisions
1. Check if an ADR already exists for this topic
2. Review related ADRs for context
3. Create new ADR following the template
4. Update DCS guides if practical guidance changes

### Adding New Features
1. Check [DCS Core Features](./DCS/CORE_FEATURES.md) for existing features
2. Follow [DCS Development Workflow](./DCS/DEVELOPMENT_WORKFLOW.md)
3. Reference relevant ADRs for patterns to follow
4. Update documentation when complete

### Refactoring
1. Check ADRs for architectural constraints
2. Create new ADR if changing architecture
3. Update DCS guides if workflow changes
4. Document in CHANGELOG.md

---

## Documentation Maintenance

### When to Update Each System

**Update ADRs when:**
- Making architectural decisions
- Superseding previous decisions
- Documenting alternatives considered

**Update DCS when:**
- Development workflow changes
- New features are added
- Current status changes
- Quick reference info changes

**Update Root Docs when:**
- Project overview changes
- High-level architecture changes
- Contribution guidelines change
- Major milestones reached

### Cross-Reference Checklist

When creating/updating documentation:
- [ ] Does this relate to an existing ADR? Link to it
- [ ] Does this affect DCS guides? Update them
- [ ] Does this change root docs? Update them
- [ ] Are all cross-references bidirectional?

---

## Archive System

**Location:** `docs/archive/`

Historical documentation is archived here when:
- Session summaries are complete
- Status reports are outdated
- Temporary documents are no longer needed

**Recent Archives:**
- [Root Cleanup March 2026](./archive/root-cleanup-2026-03-09/) - 26 files archived

See [ADR-020](./adr/ADR-020-root-documentation-consolidation.md) for details.

---

## Quick Links

### Essential Reading
- [README.md](../README.md) - Start here
- [DCS Quick Reference](./DCS/QUICK_REFERENCE.md) - Commands and setup
- [DCS Architecture](./DCS/ARCHITECTURE.md) - System structure
- [ADR Index](./adr/README.md) - Architectural decisions

### Reference
- [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md) - Complete documentation map
- [CURRENT_CAPABILITIES.md](../CURRENT_CAPABILITIES.md) - What works today
- [CHANGELOG.md](../CHANGELOG.md) - Change history

### Contributing
- [CONTRIBUTING.md](../CONTRIBUTING.md) - How to contribute
- [DCS Development Workflow](./DCS/DEVELOPMENT_WORKFLOW.md) - Development process

---

## Questions?

**"Where should I document X?"**
- Architectural decision → Create ADR
- Practical guide → Update DCS
- Project overview → Update root docs

**"I can't find information about X"**
1. Check [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md)
2. Search ADRs for decisions
3. Search DCS for guides
4. Ask in team chat

**"This documentation is outdated"**
1. Update the relevant file
2. Check cross-references
3. Update related documents
4. Submit PR with changes

---

**Last Updated:** March 9, 2026  
**Maintained By:** Platform team  
**Questions?** See [CONTRIBUTING.md](../CONTRIBUTING.md)

# Agent Spec System

> **Purpose:** Unified approach combining Kiro-style EARS specifications with IDE artifacts for structured agent development.

---

## The Three-Document Specification Pattern

| Document | Purpose | Key Elements |
|----------|---------|--------------|
| **requirements.md** | What we need | User stories, EARS acceptance criteria (WHEN/THEN/WHERE) |
| **design.md** | How we'll build it | Architecture diagrams, component interfaces, data models |
| **tasks.md** | What we'll do | Dependency-aware tasks with requirement traceability |

### Document Relationships

```
requirements.md ──► design.md ──► tasks.md
     (What)           (How)        (Do)
         │               │             │
         └───────────────┴─────────────┘
                         │
              Traceability (_Requirements: X.X_)
```

---

## System Overview

| Layer | Location | Purpose | Lifespan |
|-------|----------|---------|----------|
| **Project Specs** | `.agent/specs/` | EARS-format specifications | Permanent |
| **Session Artifacts** | `brain/*/` | Real-time task tracking | Per-session |
| **Workflows** | `.agent/workflows/` | Automation commands | Permanent |
| **Templates** | `.agent/templates/` | Spec document templates | Permanent |

---

## Comparison: Kiro vs IDE Artifacts

| Aspect | Kiro Specs | IDE Artifacts | Hybrid Approach |
|--------|------------|---------------|-----------------|
| **Requirements** | `requirements.md` (EARS format) | Not explicit | Use specs for EARS |
| **Design** | `design.md` (architecture) | `implementation_plan.md` | IDE artifact OR spec design |
| **Tasks** | `tasks.md` (checklist + traceability) | `task.md` (checklist) | IDE artifact with traceability |
| **Automation** | Hooks (file triggers) | Workflows (manual invoke) | Workflows with turbo mode |
| **Scope** | Project-level | Session-level | Both |

---

## When to Use What

### Use `.agent/specs/` (Kiro-style) when:
- Starting a **new major feature or migration**
- Need **acceptance criteria** for verification
- Work spans **multiple sessions**
- Require **requirement traceability**

### Use `brain/*/` artifacts when:
- Executing **within a session**
- Making **real-time progress updates**
- Need **quick iteration**

### Use `.agent/workflows/` when:
- **Repeatable commands** (type-check, deploy)
- **Standard procedures** (pre-commit, context-load)

---

## EARS Format Quick Reference

```markdown
### Requirement X.Y

**User Story:** As a [role], I want [feature], so that [benefit].

#### Acceptance Criteria

1. WHEN [trigger] THEN [outcome] SHALL [behavior]
2. WHILE [state] WHEN [action] THEN [response] SHALL [constraint]
3. IF [condition] THEN [outcome] SHALL [behavior]
```

---

## Workflow: Creating a New Spec

1. Create folder: `.agent/specs/{spec-name}/`
2. Create `requirements.md` with EARS acceptance criteria
3. Create `design.md` with architecture (optional if simple)
4. Create `tasks.md` with implementation checklist
5. Reference spec in `MIGRATION_LOG.md`

---

## Integration with IDE

The IDE automatically:
- Creates `brain/*/task.md` for session tracking
- Uses `implementation_plan.md` for design (can reference spec)
- Tracks mode (PLANNING→EXECUTION→VERIFICATION)

To marry both:
1. Reference spec requirements in `task.md` items
2. Copy tasks from spec `tasks.md` when starting work
3. Update spec `tasks.md` when session ends

---

## File Templates

See `.agent/templates/` for:
- `requirements-template.md`
- `design-template.md`
- `tasks-template.md`

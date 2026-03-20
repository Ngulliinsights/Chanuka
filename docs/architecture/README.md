# Architecture Documentation

This directory contains the complete architectural reference for the Chanuka Platform, organized into 5 levels from high-level overview to detailed patterns.

## 📚 Documentation Levels

### Level 0: System Overview
**File:** [0-system-overview.md](./0-system-overview.md)
- High-level system components (Client, Server, Database)
- Technology stack across all layers
- System-level interactions and data flow
- **For:** Understanding what we build with and why

### Level 1: Project Structure
**File:** [1-project-structure.md](./1-project-structure.md)
- Monorepo organization (client/, server/, shared/)
- Module responsibilities and boundaries
- Shared vs. layer-specific code patterns
- **For:** Knowing where code should live and why

### Level 2: Feature Implementation
**File:** [2-implementation-patterns.md](./2-implementation-patterns.md)
- How to build a complete feature across layers
- Service architecture, type safety, validation
- Testing patterns at each layer
- **For:** Building new features consistently

### Level 3: Data Flows
**File:** [3-data-flow-pipelines.md](./3-data-flow-pipelines.md)
- Complete request/response journeys
- Validation and transformation at each step
- Error handling within flows
- Concurrency and performance patterns
- **For:** Understanding data transformations and flows

### Level 4: Integration Patterns
**File:** [4-integration-patterns.md](./4-integration-patterns.md)
- External API integrations
- Third-party service connections
- Sync/async integration patterns
- Caching and resilience strategies
- **For:** Integrating external services safely

---

## 🔍 Decision Records

For architectural decisions with context, rationale, and consequences, see:
- [Architecture Decision Records (ADRs)](../adr/README.md) - Complete decision history
- Key decisions: ADR-025 (Client API), ADR-026 (Branching), ADR-022 (API Standardization)

---

## 🚀 Quick Start by Role

### Building a New Feature?
1. Start with [Level 1: Project Structure](./1-project-structure.md) (where does it go?)
2. Read [Level 2: Implementation Patterns](./2-implementation-patterns.md) (how do I build it?)
3. Check relevant ADRs for decisions (are there existing patterns?)
4. Reference complete example in [Level 3: Data Flows](./3-data-flow-pipelines.md)

### Integrating an External Service?
1. Read [Level 0: System Overview](./0-system-overview.md) (current stack)
2. Check [Level 4: Integration Patterns](./4-integration-patterns.md) (integration approach)
3. Review relevant ADRs for similar integrations

### Optimizing Performance?
1. Review [Level 3: Data Flows](./3-data-flow-pipelines.md) - Concurrency & Performance section
2. Check [ADR-013: Caching Strategy](../adr/ADR-013-caching-strategy.md)
3. Check monitoring and observability sections

### Learning the System?
Read in order: Level 0 → Level 1 → Level 3 (Bills example) → then explore specifics

---

## 📦 Related Documentation

- **[adr/README.md](../adr/README.md)** — Architectural Decision Records with full context
- **[guides/](../guides/)** — How-to guides for specific tasks
- **[technical/](../technical/)** — Implementation details and schema documentation
- **[infrastructure/](../infrastructure/)** — Deployment and environment setup

---

## Last Updated

- **Level 0**: March 2026 (System Overview)
- **Level 1**: March 2026 (Project Structure)
- **Level 2**: March 2026 (Implementation Patterns)
- **Level 3**: March 2026 (Data Flow Pipelines - v2.0 with patterns)
- **Level 4**: March 2026 (Integration Patterns)

---

## Contributing to Architecture Docs

When updating architecture:
1. Update the appropriate level file
2. Update this README if structure changes
3. Create ADRs for significant decisions
4. Track changes in [CHANGELOG.md](../CHANGELOG.md)

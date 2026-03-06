# Chanuka Platform Documentation

Welcome to the Chanuka Platform documentation. This directory contains comprehensive documentation for developers, contributors, and stakeholders.

## 🚀 Quick Navigation

**New to Chanuka?** Start here:
1. [Platform README](../README.md) — Overview and quick start
2. [Architecture](../ARCHITECTURE.md) — System design
3. [Setup Guide](./guides/setup.md) — Detailed setup instructions
4. [Developer Onboarding](./DEVELOPER_ONBOARDING.md) — Onboarding workflow

**Looking for something specific?** See the [Documentation Index](../DOCUMENTATION_INDEX.md) — complete map of all documentation.

## 📁 Documentation Structure

### Core Documentation
- **[guides/](./guides/)** — Setup, configuration, and how-to guides
- **[technical/](./technical/)** — Technical architecture and implementation details
- **[adr/](./adr/)** — Architectural Decision Records (19 ADRs)
- **[features/](./features/)** — Feature-specific documentation

### Development
- **[development/](./development/)** — Development workflows and patterns
- **[migrations/](./migrations/)** — Migration guides for major changes
- **[reference/](./reference/)** — API references, glossaries, and Kenyan legal context

### Planning & Strategy
- **[strategy/](./strategy/)** — Strategic planning documents
- **[plans/](./plans/)** — Project plans and roadmaps

### Quality & Audits
- **[CODE_AUDIT_2026-03-06.md](./CODE_AUDIT_2026-03-06.md)** — Code quality assessment
- **[DOCUMENTATION_AUDIT_COMPREHENSIVE_2026-03-06.md](./DOCUMENTATION_AUDIT_COMPREHENSIVE_2026-03-06.md)** — Documentation audit
- **[EXECUTIVE_SUMMARY_2026-03-06.md](./EXECUTIVE_SUMMARY_2026-03-06.md)** — Platform status summary

### Infrastructure
- **[infrastructure/](./infrastructure/)** — Infrastructure documentation
- **[security/](./security/)** — Security policies and guides
- **[DCS/](./DCS/)** — Distributed Civic System documentation

### Archive
- **[archive/](./archive/)** — Historical documentation (superseded or outdated)

## 📚 Key Documents

### Getting Started
- [Setup Guide](./guides/setup.md) — Installation and configuration
- [Developer Onboarding](./DEVELOPER_ONBOARDING.md) — New developer workflow
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md) — Day-to-day development

### Architecture
- [Architecture Overview](../ARCHITECTURE.md) — High-level system design
- [Technical Architecture](./technical/architecture.md) — Detailed technical design
- [Integration Architecture](./INTEGRATION_ARCHITECTURE.md) — Integration patterns
- [ADRs](./adr/) — Architectural decisions with rationale

### Feature Development
- [Feature Creation Guide](./DEVELOPER_GUIDE_Feature_Creation.md) — Creating new features
- [Feature Status](./02-chanuka-feature-status.md) — Current feature status
- [Routing Explanation](./ROUTING_EXPLANATION.md) — Routing patterns

### Code Organization
- [Path Alias Resolution](./PATH_ALIAS_RESOLUTION.md) — Import path patterns
- [FSD Import Guide](./FSD_IMPORT_GUIDE.md) — Feature-Sliced Design imports
- [Server-Client Integration](./SERVER_CLIENT_INTEGRATION_GUIDE.md) — Integration patterns

### Technical Guides
- [Error Handling Migration](./ERROR_HANDLING_MIGRATION_GUIDE.md) — Error handling patterns
- [Repository Pattern](./REPOSITORY_PATTERN.md) — Database access patterns
- [Secure Query Builder](./SECURE_QUERY_BUILDER_MIGRATION_GUIDE.md) — Secure database queries
- [Performance Optimizations](./PERFORMANCE_OPTIMIZATIONS.md) — Performance patterns

### Quality & Testing
- [Test Strategy](../tests/README.md) — Testing approach and tools
- [Code Quality Deep Dive](./CODE_QUALITY_DEEP_DIVE_SECURE_QUERY_BUILDER.md) — Quality analysis

### Brand & Design
- [Brand Color Usage](./BRAND_COLOR_USAGE_GUIDE.md) — Color system
- [Client Brand Docs](../client/docs/brand/) — Brand guidelines and assets

## 🎯 Documentation by Audience

### For New Developers
1. [Platform README](../README.md)
2. [Architecture](../ARCHITECTURE.md)
3. [Setup Guide](./guides/setup.md)
4. [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
5. [Development Workflow](./DEVELOPMENT_WORKFLOW.md)

### For Feature Developers
1. [Feature Creation Guide](./DEVELOPER_GUIDE_Feature_Creation.md)
2. [Feature Status](./02-chanuka-feature-status.md)
3. [Routing Explanation](./ROUTING_EXPLANATION.md)
4. [Server-Client Integration](./SERVER_CLIENT_INTEGRATION_GUIDE.md)

### For Infrastructure Developers
1. [Architecture Overview](../ARCHITECTURE.md)
2. [ADRs](./adr/)
3. [Technical Architecture](./technical/architecture.md)
4. [Infrastructure Docs](./infrastructure/)

### For Investors/Stakeholders
1. [Executive Summary](./EXECUTIVE_SUMMARY_2026-03-06.md)
2. [Formal Pitch](./CHANUKA_FORMAL_PITCH.md)
3. [Feature Status](./02-chanuka-feature-status.md)
4. [Project Plan](./03-chanuka-project-plan.md)

## 🔍 Finding Documentation

**Can't find what you're looking for?**

1. Check the [Documentation Index](../DOCUMENTATION_INDEX.md) — comprehensive map of all docs
2. Search this directory for keywords
3. Check feature-specific READMEs in `client/src/features/` or `server/features/`
4. Check the [archive](./archive/) for historical documentation

## 📝 Documentation Standards

**Good Examples to Follow:**
- [scripts/README.md](../scripts/README.md) — Gold standard comprehensive README
- [shared/types/README.md](../shared/types/README.md) — Excellent technical documentation
- [ADR-001](./adr/ADR-001-api-client-consolidation.md) — Template-quality ADR

**Documentation Patterns:**
- READMEs include: purpose, usage, examples, troubleshooting
- ADRs follow: context, decision, consequences, alternatives
- Migration guides include: why, what changed, how to migrate, verification

## 🚧 Known Issues

**Documentation Gaps:**
- 87% of features lack READMEs (remediation in progress)
- Client architecture folder is empty (planned)
- Some links in main README point to archived docs (being fixed)

See [Documentation Remediation Plan](./DOCUMENTATION_REMEDIATION_PLAN.md) for the full cleanup roadmap.

## 🤝 Contributing to Documentation

When adding or updating documentation:

1. **Choose the right location:**
   - Feature docs → `client/src/features/*/README.md` or `server/features/*/README.md`
   - Architecture decisions → `docs/adr/`
   - How-to guides → `docs/guides/`
   - Technical details → `docs/technical/`

2. **Follow existing patterns:**
   - Use [scripts/README.md](../scripts/README.md) as a template for comprehensive docs
   - Use [ADR-001](./adr/ADR-001-api-client-consolidation.md) as a template for ADRs

3. **Update the index:**
   - Add your document to [DOCUMENTATION_INDEX.md](../DOCUMENTATION_INDEX.md)

4. **Link from relevant places:**
   - Update parent READMEs to link to your new doc
   - Add cross-references from related documents

## 📊 Documentation Status

- **Total Documentation Files:** 250+
- **Well-Organized:** ADRs, scripts, shared types
- **Needs Consolidation:** Electoral accountability (8 docs), error infrastructure (18 docs)
- **Missing:** Feature READMEs (87% of features), client architecture, glossary

See [Documentation Audit](./DOCUMENTATION_AUDIT_COMPREHENSIVE_2026-03-06.md) for detailed analysis.

---

**Questions?** See [CONTRIBUTING.md](../CONTRIBUTING.md) or contact the platform team.

# Chanuka Platform — Documentation Index

**Last Updated:** March 6, 2026  
**Purpose:** Single source of truth for navigating all platform documentation

## 🚀 Start Here (New Developers)

If you're new to the Chanuka platform, read these in order:

1. **[README.md](./README.md)** — Platform overview, quick start, tech stack
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Module organization and design decisions
3. **[docs/guides/setup.md](./docs/guides/setup.md)** — Detailed setup instructions
4. **[CURRENT_CAPABILITIES.md](./CURRENT_CAPABILITIES.md)** — What actually works today
5. **[docs/DEVELOPER_ONBOARDING.md](./docs/DEVELOPER_ONBOARDING.md)** — Onboarding workflow

## 📊 Platform Status & Planning

**Current State:**
- **[EXECUTIVE_SUMMARY_2026-03-06.md](./docs/EXECUTIVE_SUMMARY_2026-03-06.md)** — Comprehensive platform status (65% production-ready)
- **[CURRENT_CAPABILITIES.md](./CURRENT_CAPABILITIES.md)** — Feature-by-feature status
- **[docs/02-chanuka-feature-status.md](./docs/02-chanuka-feature-status.md)** — Detailed feature tracking

**Code Quality:**
- **[docs/CODE_AUDIT_2026-03-06.md](./docs/CODE_AUDIT_2026-03-06.md)** — Code quality assessment (95% score)
- **[docs/DEEP_CODE_AUDIT_2026-03-06.md](./docs/DEEP_CODE_AUDIT_2026-03-06.md)** — Deep dive analysis

**Documentation Quality:**
- **[docs/DOCUMENTATION_AUDIT_COMPREHENSIVE_2026-03-06.md](./docs/DOCUMENTATION_AUDIT_COMPREHENSIVE_2026-03-06.md)** — Structural audit
- **[docs/DOCUMENTATION_CONTENT_AUDIT_2026-03-06.md](./docs/DOCUMENTATION_CONTENT_AUDIT_2026-03-06.md)** — Content audit
- **[docs/DOCUMENTATION_REMEDIATION_PLAN.md](./docs/DOCUMENTATION_REMEDIATION_PLAN.md)** — Cleanup roadmap

**Project Planning:**
- **[docs/03-chanuka-project-plan.md](./docs/03-chanuka-project-plan.md)** — Project roadmap
- **[docs/PROJECT_TASKS_2026-03-06.csv](./docs/PROJECT_TASKS_2026-03-06.csv)** — Task breakdown
- **[docs/GANTT_CHART_2026-03-06.csv](./docs/GANTT_CHART_2026-03-06.csv)** — Timeline visualization

## 🏗️ Architecture & Design

**Core Architecture:**
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Module organization, shared vs server patterns
- **[docs/technical/architecture.md](./docs/technical/architecture.md)** — Technical architecture details
- **[docs/INTEGRATION_ARCHITECTURE.md](./docs/INTEGRATION_ARCHITECTURE.md)** — Integration patterns
- **[docs/DESIGN_DECISIONS.md](./docs/DESIGN_DECISIONS.md)** — Key design decisions

**Architectural Decision Records (ADRs):**
- **[docs/adr/](./docs/adr/)** — 19 ADRs documenting major architectural decisions
- **[docs/ADR_EXTRACTION_SUMMARY.md](./docs/ADR_EXTRACTION_SUMMARY.md)** — ADR system overview

**Module-Specific Architecture:**
- **[client/docs/README.md](./client/docs/README.md)** — Client architecture
- **[shared/types/README.md](./shared/types/README.md)** — Type system architecture
- **[scripts/README.md](./scripts/README.md)** — Scripts architecture (gold standard README)

## 👨‍💻 Developer Guides

**Getting Started:**
- **[docs/DEVELOPER_ONBOARDING.md](./docs/DEVELOPER_ONBOARDING.md)** — Onboarding workflow
- **[docs/guides/setup.md](./docs/guides/setup.md)** — Setup instructions
- **[docs/DEVELOPMENT_WORKFLOW.md](./docs/DEVELOPMENT_WORKFLOW.md)** — Development workflow

**Code Organization:**
- **[docs/PATH_ALIAS_RESOLUTION.md](./docs/PATH_ALIAS_RESOLUTION.md)** — Import path patterns
- **[docs/FSD_IMPORT_GUIDE.md](./docs/FSD_IMPORT_GUIDE.md)** — Feature-Sliced Design imports
- **[docs/ROUTING_EXPLANATION.md](./docs/ROUTING_EXPLANATION.md)** — Routing patterns

**Feature Development:**
- **[docs/DEVELOPER_GUIDE_Feature_Creation.md](./docs/DEVELOPER_GUIDE_Feature_Creation.md)** — Creating new features
- **[docs/guides/](./docs/guides/)** — Additional development guides

## 🔧 Technical Guides

**Error Handling:**
- **[docs/ERROR_HANDLING_MIGRATION_GUIDE.md](./docs/ERROR_HANDLING_MIGRATION_GUIDE.md)** — Error handling patterns
- **[docs/ERROR_SYSTEM_COMPARISON_AND_REFACTOR.md](./docs/ERROR_SYSTEM_COMPARISON_AND_REFACTOR.md)** — Error system evolution

**Performance:**
- **[docs/PERFORMANCE_OPTIMIZATIONS.md](./docs/PERFORMANCE_OPTIMIZATIONS.md)** — Performance patterns
- **[docs/PERFORMANCE_QUICK_REFERENCE.md](./docs/PERFORMANCE_QUICK_REFERENCE.md)** — Quick reference

**Database:**
- **[docs/REPOSITORY_PATTERN.md](./docs/REPOSITORY_PATTERN.md)** — Repository pattern guide
- **[docs/REPOSITORY_PATTERN_IMPLEMENTATION_GUIDE.md](./docs/REPOSITORY_PATTERN_IMPLEMENTATION_GUIDE.md)** — Implementation details
- **[docs/SECURE_QUERY_BUILDER_MIGRATION_GUIDE.md](./docs/SECURE_QUERY_BUILDER_MIGRATION_GUIDE.md)** — Secure query patterns

**Integration:**
- **[docs/SERVER_CLIENT_INTEGRATION_GUIDE.md](./docs/SERVER_CLIENT_INTEGRATION_GUIDE.md)** — Client-server integration
- **[docs/MVP_INTEGRATION_GUIDE.md](./docs/MVP_INTEGRATION_GUIDE.md)** — MVP integration patterns

## 🎨 Design & Brand

**Brand Guidelines:**
- **[docs/BRAND_COLOR_USAGE_GUIDE.md](./docs/BRAND_COLOR_USAGE_GUIDE.md)** — Color system
- **[client/docs/brand/](./client/docs/brand/)** — Brand assets and guidelines

**Accessibility:**
- **[WCAG_ACCESSIBILITY_AUDIT.md](./WCAG_ACCESSIBILITY_AUDIT.md)** — WCAG AA compliance status
- **[reports/accessibility/](./reports/accessibility/)** — Accessibility reports

## 🧪 Testing

**Test Strategy:**
- **[tests/README.md](./tests/README.md)** — Test suite overview
- Unit tests: `vitest.config.ts`
- Integration tests: `vitest.integration.config.ts`
- E2E tests: `playwright.config.ts`
- Property tests: `vitest.property.config.ts`

## 📦 Scripts & Tools

**Scripts Documentation:**
- **[scripts/README.md](./scripts/README.md)** — Comprehensive scripts guide (1,000+ lines, gold standard)
- **[scripts/seeds/README.md](./scripts/seeds/README.md)** — Database seeding guide

**Tools Analysis:**
- **[docs/scripts-tools-strategic-analysis.md](./docs/scripts-tools-strategic-analysis.md)** — Scripts strategy
- **[docs/scripts-tools-strategic-audit.md](./docs/scripts-tools-strategic-audit.md)** — Scripts audit

## 🌍 Features

**Electoral Accountability:**
- **[docs/features/ELECTORAL_ACCOUNTABILITY.md](./docs/features/ELECTORAL_ACCOUNTABILITY.md)** — Feature overview, architecture, API reference
- **[server/features/electoral-accountability/README.md](./server/features/electoral-accountability/README.md)** — Implementation guide for developers
- **[Archived fragments](./docs/archive/electoral-accountability-fragments-2026-03/)** — Historical implementation docs (March 5, 2026)

**Other Features:**
- Feature-specific documentation in `client/src/features/*/README.md`
- Server feature documentation in `server/features/*/README.md`

## 📚 Reference

**Kenyan Context:**
- **[docs/reference/](./docs/reference/)** — Kenyan law PDFs, constitutional frameworks, research papers

**API Documentation:**
- **[docs/api-client-guide.md](./docs/api-client-guide.md)** — API client usage
- Feature-specific API docs in server feature directories

**Glossary:**
- Coming soon: `docs/reference/glossary.md`

## 🔐 Security

**Security Documentation:**
- **[docs/security/](./docs/security/)** — Security guides and policies

## 📋 Migration Guides

**Active Migrations:**
- **[docs/migrations/api-service-unification.md](./docs/migrations/api-service-unification.md)** — API service consolidation
- **[docs/migrations/logger-consolidation.md](./docs/migrations/logger-consolidation.md)** — Logger consolidation
- **[docs/migrations/offline-detection-resolution.md](./docs/migrations/offline-detection-resolution.md)** — Offline detection

**Migration Examples:**
- **[docs/migration-examples.md](./docs/migration-examples.md)** — Migration patterns

## 🗂️ Archive

**Historical Documentation:**
- **[docs/archive/](./docs/archive/)** — Archived documentation (superseded or historical)
- **[scripts/deprecated/](./scripts/deprecated/)** — Deprecated scripts
- **[scripts/archived-migration-tools/](./scripts/archived-migration-tools/)** — Old migration tools

## 🎯 Strategic Documents

**Pitches & Vision:**
- **[docs/CHANUKA_FORMAL_PITCH.md](./docs/CHANUKA_FORMAL_PITCH.md)** — Formal pitch deck
- **[docs/CHANUKA_CASUAL_PITCH.md](./docs/CHANUKA_CASUAL_PITCH.md)** — Casual pitch
- **[docs/01-chanuka-audit-narrative.md](./docs/01-chanuka-audit-narrative.md)** — Platform narrative

**Strategy:**
- **[docs/strategy/](./docs/strategy/)** — Strategic planning documents
- **[docs/STRATEGIC_INSIGHTS.md](./docs/STRATEGIC_INSIGHTS.md)** — Strategic insights

## 🤖 AI Agent Context

**Agent Specifications:**
- **[.agent/SPEC_SYSTEM.md](./.agent/SPEC_SYSTEM.md)** — Specification system for AI agents
- **[.agent/specs/](./.agent/specs/)** — Active specifications
- **[.agent/rules.md](./.agent/rules.md)** — Agent rules and guidelines

## 📊 Audit System

**Audit Documentation:**
- **[docs/README_AUDIT_SYSTEM.md](./docs/README_AUDIT_SYSTEM.md)** — Audit system overview
- **[docs/AUDIT_INDEX_2026-03-06.md](./docs/AUDIT_INDEX_2026-03-06.md)** — Audit index
- **[docs/AUDIT_QUICK_START_GUIDE.md](./docs/AUDIT_QUICK_START_GUIDE.md)** — Quick start guide

## 🔍 Finding Documentation

**By Audience:**
- **New Developer:** Start with README → ARCHITECTURE → setup guide → DEVELOPER_ONBOARDING
- **Feature Developer:** DEVELOPER_GUIDE_Feature_Creation → Feature-specific READMEs
- **Infrastructure Developer:** ARCHITECTURE → ADRs → Technical guides
- **Investor/Stakeholder:** EXECUTIVE_SUMMARY → Pitch decks → Feature status
- **Contributor:** CONTRIBUTING.md → DEVELOPMENT_WORKFLOW → Code organization guides

**By Topic:**
- **Architecture:** ARCHITECTURE.md, ADRs, technical/architecture.md
- **Setup:** guides/setup.md, DEVELOPER_ONBOARDING.md
- **Features:** Feature-specific READMEs, feature status docs
- **Testing:** tests/README.md, test configs
- **Scripts:** scripts/README.md
- **Security:** docs/security/
- **Performance:** PERFORMANCE_OPTIMIZATIONS.md

## 📝 Documentation Standards

**Good Examples to Follow:**
- **[scripts/README.md](./scripts/README.md)** — Gold standard for comprehensive README
- **[shared/types/README.md](./shared/types/README.md)** — Excellent technical documentation
- **[docs/adr/ADR-001-api-client-consolidation.md](./docs/adr/ADR-001-api-client-consolidation.md)** — Template-quality ADR

**Documentation Patterns:**
- ADRs follow consistent structure (context, decision, consequences)
- READMEs include: purpose, usage, examples, troubleshooting
- Migration guides include: why, what changed, how to migrate, verification

## 🚧 Known Issues

**Broken Links (Being Fixed):**
- Some README links point to archived documents
- Some feature READMEs are missing (87% of features undocumented)
- Client architecture folder is empty

**Planned Improvements:**
- Consolidate 8 electoral accountability docs into one
- Create feature READMEs for all 45 features
- Populate client/docs/architecture/
- Create comprehensive glossary

See **[docs/DOCUMENTATION_REMEDIATION_PLAN.md](./docs/DOCUMENTATION_REMEDIATION_PLAN.md)** for the full cleanup roadmap.

---

**Maintenance:** This index should be updated whenever new documentation is added or moved.  
**Owner:** Platform team  
**Questions?** See [CONTRIBUTING.md](./CONTRIBUTING.md) or ask in team chat.

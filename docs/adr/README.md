# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records documenting significant architectural decisions made during the Chanuka platform development.

## Index

### ADR-001: API Client Consolidation
**File:** [ADR-001-api-client-consolidation.md](./ADR-001-api-client-consolidation.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Analysis of why BaseApiClient, AuthenticatedApiClient, and SafeApiClient remain unintegrated. Decision to consolidate on globalApiClient (UnifiedApiClientImpl) as the canonical implementation.

### ADR-002: Client API Architecture
**File:** [ADR-002-client-api-architecture.md](./ADR-002-client-api-architecture.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Comprehensive analysis of client-side API architecture, including the relationship between different API client implementations and their usage patterns.

### ADR-003: Dead vs Unintegrated Code
**File:** [ADR-003-dead-vs-unintegrated-code.md](./ADR-003-dead-vs-unintegrated-code.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Framework for distinguishing between dead code (should be deleted) and unintegrated code (needs integration decision). Establishes criteria for code cleanup decisions.

### ADR-004: Feature Structure Convention
**File:** [ADR-004-feature-structure-convention.md](./ADR-004-feature-structure-convention.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Guidelines for when to use full DDD structure (application/domain/infrastructure) vs flat structure for features. Provides decision criteria and examples.

### ADR-005: CSP Manager Consolidation
**File:** [ADR-005-csp-manager-consolidation.md](./ADR-005-csp-manager-consolidation.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Analysis of Content Security Policy (CSP) manager duplication. Decision to consolidate on UnifiedCSPManager and remove legacy implementation.

### ADR-006: Validation Single Source of Truth
**File:** [ADR-006-validation-single-source.md](./ADR-006-validation-single-source.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Establishes shared/validation/ as the single source of truth for validation schemas. Defines three-layer validation architecture (shared primitives, server runtime, client UI-specific).

### ADR-007: Utils Consolidation
**File:** [ADR-007-utils-consolidation.md](./ADR-007-utils-consolidation.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Analysis of utils folder duplication across client, server, and shared. Decision on consolidation strategy and placement of utility functions.

### ADR-008: Incomplete Migrations
**File:** [ADR-008-incomplete-migrations.md](./ADR-008-incomplete-migrations.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Systemic analysis of incomplete migrations in the codebase. Identifies root causes and establishes process for completing or rolling back migrations.

### ADR-009: Graph Module Refactoring
**File:** [ADR-009-graph-module-refactoring.md](./ADR-009-graph-module-refactoring.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Analysis and refactoring of graph database module structure.

### ADR-010: Government Data Consolidation
**File:** [ADR-010-government-data-consolidation.md](./ADR-010-government-data-consolidation.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Consolidation of government data integration modules.

### ADR-011: Type System Single Source
**File:** [ADR-011-type-system-single-source.md](./ADR-011-type-system-single-source.md)  
**Status:** Accepted  
**Date:** February 18, 2026  
**Summary:** Establishes single source of truth for type definitions.

### ADR-012: Infrastructure Security Integration Pattern
**File:** [ADR-012-infrastructure-security-pattern.md](./ADR-012-infrastructure-security-pattern.md)  
**Status:** ✅ Accepted & Implemented  
**Date:** February 27, 2026  
**Summary:** Establishes standardized four-step security pattern (Validate → Sanitize → Execute → Sanitize Output) for all features. Achieves 100% security coverage, zero SQL injection/XSS vulnerabilities, and comprehensive audit logging across 14 features.

### ADR-013: Centralized Caching Strategy
**File:** [ADR-013-caching-strategy.md](./ADR-013-caching-strategy.md)  
**Status:** ✅ Accepted & Implemented  
**Date:** February 27, 2026  
**Summary:** Implements centralized caching with standardized key generation, TTL management, and seven invalidation strategies. Achieves 72% cache hit rate, 38% response time improvement, and 40% database load reduction across 9 high-traffic features.

### ADR-014: Result Type Error Handling Pattern
**File:** [ADR-014-error-handling-pattern.md](./ADR-014-error-handling-pattern.md)  
**Status:** ✅ Accepted & Implemented  
**Date:** February 27, 2026  
**Summary:** Adopts Result type pattern using neverthrow for type-safe, explicit error handling. Achieves 0.03% error rate, 99.97% transaction success, and 95% Result type coverage with rich error context across all features.

### ADR-015: Intelligent Bill Pipeline Architecture
**File:** [ADR-015-intelligent-bill-pipeline.md](./ADR-015-intelligent-bill-pipeline.md)  
**Status:** 📋 Proposed  
**Date:** February 27, 2026  
**Summary:** Proposes event-driven pipeline that automatically processes every bill through all intelligence features (Pretext Detection, Constitutional Intelligence, Market Intelligence, ML Prediction). Provides comprehensive analysis, automated transparency, and timely user notifications.

## ADR Format

Each ADR should follow this structure:

1. **Title**: Short, descriptive name
2. **Status**: Proposed | Accepted | Deprecated | Superseded
3. **Date**: When the decision was made
4. **Context**: What is the issue we're seeing that is motivating this decision?
5. **Decision**: What is the change we're proposing and/or doing?
6. **Consequences**: What becomes easier or more difficult to do because of this change?
7. **Alternatives Considered**: What other options were evaluated?

## References

- [Architecture Documentation](../ARCHITECTURE.md)
- [Codebase Consolidation Spec](.kiro/specs/codebase-consolidation/)

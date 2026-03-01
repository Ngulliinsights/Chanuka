# Architectural Design Decisions

**Last Updated:** 2026-02-27  
**Status:** Living Document  
**Purpose:** Single source of truth for architectural decisions and design patterns

---

## Overview

This document captures key architectural and design decisions made during the evolution of the Chanuka platform. It serves as the authoritative reference for understanding why certain approaches were chosen and how they should be applied.

---

## 1. Feature-Sliced Design (FSD) Architecture

**Decision:** Adopt Feature-Sliced Design with dedicated infrastructure layer

**Context:**
- Needed clear separation between business logic and infrastructure
- Required consistent module structure across codebase
- Wanted to prevent circular dependencies

**Implementation:**
```
client/src/
├── infrastructure/     # Cross-cutting concerns (27 modules)
├── features/          # Business features
├── shared/            # Shared utilities
└── lib/              # Legacy (being phased out)
```

**Rationale:**
- Infrastructure modules provide reusable, framework-agnostic services
- Features consume infrastructure through well-defined public APIs
- Clear dependency direction: Features → Infrastructure → Shared

**References:**
- [FSD Import Guide](./FSD_IMPORT_GUIDE.md)
- [Developer Guide](./DEVELOPER_GUIDE_Feature_Creation.md)

---

## 2. Unified Error Handling

**Decision:** Factory-based error system with HTTP boundary serialization

**Context:**
- Multiple error handling approaches existed (throw, Result monad, callbacks)
- Needed consistency across client and server
- Required observability integration

**Implementation:**
- Factory functions for error creation (pure, no side effects)
- HTTP boundary serialization (toApiError/fromApiError)
- ErrorHandler service with observability
- Optional Result monad for functional programming

**Key Files:**
- `client/src/infrastructure/error/factory.ts`
- `client/src/infrastructure/error/unified-handler.ts`
- `client/src/infrastructure/error/http-boundary.ts`
- `client/src/infrastructure/error/result.ts`

**Rationale:**
- Factory pattern keeps error creation pure and testable
- Boundary serialization prevents error object loss across network
- Centralized handler enables consistent logging and recovery
- Result monad provides type-safe error handling without exceptions

---

## 3. Dependency Injection

**Decision:** Lightweight DI container with three-phase initialization

**Context:**
- Circular dependencies between services (auth ↔ API)
- Needed testability without complex mocking
- Wanted to avoid heavy DI frameworks

**Implementation:**
- Service registration with lifecycle (singleton/transient)
- Circular dependency detection
- Three-phase initialization (register → resolve → initialize)

**Key Files:**
- `client/src/infrastructure/di/container.ts`
- `client/src/infrastructure/di/types.ts`

**Rationale:**
- Lightweight solution tailored to our needs
- Three-phase init breaks circular dependencies
- Explicit service registration improves discoverability
- No runtime reflection or decorators needed

---

## 4. Module Boundaries & Public APIs

**Decision:** Enforce boundaries through public API pattern with automated validation

**Context:**
- 435 violations of module boundaries detected
- Internal imports bypassing public APIs
- Needed automated enforcement

**Implementation:**
1. Each module exports through `index.ts` only
2. Dependency-cruiser rules prevent internal imports
3. Exception for same-module and test file imports

**Configuration:**
- `.dependency-cruiser.cjs` - Validation rules

**Rationale:**
- Public API pattern creates clear contracts
- Automated validation prevents regressions
- Exceptions allow pragmatic internal organization

---

## 5. Layer Architecture

**Decision:** Five-layer hierarchy with strict dependencies

**Layers:**
```
TYPES → PRIMITIVES → SERVICES → INTEGRATION → PRESENTATION
```

**Rules:**
- Each layer can only import from layers to its left
- No upward dependencies allowed
- Types layer is dependency-free

**Examples:**
- **Types:** `error/types.ts`, `api/types/`
- **Primitives:** `storage/`, `crypto/`
- **Services:** `auth/service.ts`, `api/client.ts`
- **Integration:** `browser/`, `mobile/`
- **Presentation:** `error/components/`, `navigation/components/`

**Rationale:**
- Clear dependency direction prevents cycles
- Each layer has single responsibility
- Testability improves (mock lower layers)
- Easier to reason about data flow

---

## 6. Store Architecture

**Decision:** Redux with encapsulated slices

**Context:**
- Direct slice imports bypassing store API
- Needed consistent state access patterns
- Wanted to enable future store migrations

**Implementation:**
- All state access through selectors
- All mutations through actions/thunks
- No direct slice imports outside store module

**Key Files:**
- `client/src/infrastructure/store/index.ts` - Public API
- `client/src/infrastructure/store/slices/` - Internal implementation

**Rationale:**
- Encapsulation enables store replacement
- Selectors provide memoization
- Consistent patterns across codebase
- Easier testing with mock store

---

## 7. Validation Strategy

**Decision:** Unified validation with Zod integration

**Context:**
- Multiple validation approaches (Zod, custom, none)
- Needed consistent error format
- Required React Hook Form integration

**Implementation:**
- Zod as validation engine
- Standard error format aligned with unified errors
- React Hook Form integration
- Field validators and form helpers

**Key Files:**
- `client/src/infrastructure/validation/index.ts`
- `client/src/infrastructure/validation/field-validators.ts`
- `client/src/infrastructure/validation/form-helpers.ts`

**Rationale:**
- Zod provides type-safe validation
- Consistent error format improves UX
- React Hook Form integration reduces boilerplate
- Reusable validators prevent duplication

---

## 8. Logging & Observability

**Decision:** Centralized logger with structured logging

**Context:**
- Logger in `lib/utils/logger.ts` created circular dependency
- Needed structured logging for observability
- Required integration with error handling

**Implementation:**
- Logger moved to `infrastructure/logging`
- Structured logging with context
- Integration with error handler
- Performance monitoring support
- Environment-aware (dev vs prod)

**Migration:**
- Update imports from `lib/utils/logger` to `infrastructure/logging`
- Remove or deprecate `lib/utils/logger.ts`

**Rationale:**
- Breaks circular dependency with error module
- Structured logs enable better debugging
- Centralized configuration
- Production-ready observability

---

## 9. Notification System Consolidation

**Decision:** Consolidate two notification systems into one

**Status:** ⏳ Planned (Awaiting Approval)

**Context:**
- Two overlapping systems: `notifications/` and `alert-preferences/`
- 70-80% duplicate functionality
- Maintenance burden and confusion

**Implementation:**
- Keep `notifications/` as primary (clean DDD architecture)
- Deprecate `alert-preferences/` (monolithic service)
- Migrate functionality incrementally
- Maintain backward compatibility during transition

**Timeline:**
- Analysis: Complete ✅
- Planning: Complete ✅
- Approval: Pending ⏳
- Implementation: 12 weeks (estimated)
- Rollout: 6 weeks gradual

**References:**
- [Notification System Consolidation](./NOTIFICATION_SYSTEM_CONSOLIDATION.md)

**Rationale:**
- Eliminates code duplication (~1600+ lines)
- Single source of truth for notifications
- Better user experience (consistent API)
- Reduced maintenance burden

---

## 10. Domain-Driven Design (DDD)

**Decision:** DDD structure for server features

**Structure:**
```
server/features/{feature}/
├── domain/           # Business logic
│   ├── entities/
│   ├── services/
│   └── repositories/
├── application/      # Use cases
│   └── services/
├── infrastructure/   # External concerns
│   └── persistence/
└── presentation/     # HTTP/API layer
    └── http/
```

**References:**
- [ADR-001: DDD Feature Structure](./ADR-001-DDD-Feature-Structure.md)

**Rationale:**
- Clear separation of concerns
- Business logic isolated from infrastructure
- Testable domain layer
- Scalable architecture

---

## 11. API Response Standardization

**Decision:** Unified API response format across all endpoints

**Format:**
```typescript
{
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    statusCode: number;
    details?: unknown;
  };
  metadata?: {
    duration: number;
    source: string;
  };
  timestamp: string;
}
```

**Implementation:**
- `server/utils/api-response-helpers.ts` - Response utilities
- Factory functions: `sendSuccess`, `sendError`, `sendValidationError`

**Rationale:**
- Consistent client-side error handling
- Predictable response structure
- Better debugging with metadata
- Type-safe responses

---

## 12. Testing Strategy

**Decision:** Three-tier testing pyramid

**Tiers:**
1. **Unit Tests** - Individual modules (80%+ coverage target)
2. **Integration Tests** - Module interactions
3. **E2E Tests** - Critical user flows

**Tools:**
- Vitest for unit/integration tests
- Playwright for E2E tests
- React Testing Library for components

**Rationale:**
- Unit tests provide fast feedback
- Integration tests catch boundary issues
- E2E tests ensure user experience
- Pyramid approach balances speed and confidence

---

## 13. Migration Strategy

**Decision:** Incremental migration with backward compatibility

**Approach:**
- Maintain backward compatibility during transition
- Deprecation warnings for old patterns
- Gradual feature migration
- Automated tooling where possible

**Phases:**
1. Analysis and planning ✅
2. Infrastructure setup ✅
3. Module-by-module migration 🔄
4. Deprecation and cleanup ⏳
5. Final validation ⏳

**Rationale:**
- Reduces risk of breaking changes
- Allows parallel development
- Provides time for team learning
- Enables rollback if needed

---

## 14. Documentation Standards

**Decision:** JSDoc for public APIs + TypeDoc generation

**Requirements:**
- JSDoc comments for all public exports
- TypeDoc for automated API docs
- README.md for each module
- Examples in documentation

**Rationale:**
- JSDoc integrates with TypeScript
- TypeDoc generates browsable docs
- READMEs provide high-level overview
- Examples improve developer experience

---

## 15. Infrastructure Integration Patterns

**Decision:** Standardized security, caching, and error handling patterns

**Status:** ✅ Complete (See Infrastructure Integration ADRs)

**Context:**
- Infrastructure integration analysis revealed gaps in security (15%), caching (35%), error handling (50%)
- Needed consistent patterns across all 14 features
- Required comprehensive security coverage

**Key Patterns:**

1. **Security Pattern** (ADR-012)
   - 4-step pattern: Validate → Sanitize → Execute → Sanitize Output
   - 100% security coverage achieved
   - Zero SQL injection/XSS vulnerabilities

2. **Caching Strategy** (ADR-013)
   - Centralized cache key generation
   - 7 invalidation strategies
   - 72% cache hit rate achieved
   - 38% response time improvement

3. **Error Handling** (ADR-014)
   - Result type pattern with neverthrow
   - Standardized error context
   - 0.03% error rate achieved
   - 99.97% transaction success

4. **Naming Conventions** (ADR-016)
   - No "Enhanced" prefixes
   - PascalCase for files and classes
   - Consistent export naming

5. **Repository Pattern** (ADR-017)
   - Clear data access pattern hierarchy
   - Repository for complex queries
   - Direct Drizzle for simple operations

6. **Feature Boundaries** (ADR-018)
   - Analytics → engagement-metrics
   - Analysis → bill-assessment
   - New: ml-intelligence, financial-oversight

7. **Infrastructure Cleanup** (ADR-019)
   - Remove orphaned components
   - Deprecate facades
   - Promote under-utilized infrastructure

**References:**
- [ADR-012: Infrastructure Security Pattern](./adr/ADR-012-infrastructure-security-pattern.md)
- [ADR-013: Centralized Caching Strategy](./adr/ADR-013-caching-strategy.md)
- [ADR-014: Result Type Error Handling](./adr/ADR-014-error-handling-pattern.md)
- [ADR-016: Naming Convention Standardization](./adr/ADR-016-naming-conventions.md)
- [ADR-017: Repository Pattern Standardization](./adr/ADR-017-repository-pattern-standardization.md)
- [ADR-018: Analytics vs Analysis Separation](./adr/ADR-018-analytics-analysis-separation.md)
- [ADR-019: Orphaned Infrastructure Cleanup](./adr/ADR-019-orphaned-infrastructure-cleanup.md)

**Rationale:**
- Consistent patterns reduce errors
- Centralized infrastructure enables optimization
- Type-safe error handling prevents bugs
- Comprehensive security protects users
- Clear boundaries improve maintainability

---

## 16. Strategic Feature Integration

**Decision:** Event-driven architecture for feature integration

**Status:** 📋 Proposed (See Strategic Integration ADRs)

**Context:**
- 30+ features that can be strategically integrated
- Need automated, coordinated processing
- Want to create interconnected civic engagement ecosystem

**Key Integrations:**

1. **Intelligent Bill Pipeline** (ADR-015)
   - Automatic analysis through all intelligence features
   - Event-driven coordination
   - Async queue processing
   - Comprehensive bill reports

2. **Personalized Civic Engagement** (Planned)
   - Recommendation-driven user journey
   - Network-powered insights
   - Multi-channel engagement

3. **Real-Time Civic Intelligence** (Planned)
   - Government data integration
   - ML-powered predictions
   - Graph database analytics

**References:**
- [ADR-015: Intelligent Bill Pipeline](./adr/ADR-015-intelligent-bill-pipeline.md)
- [Cross-Feature Integration Map](../.agent/specs/strategic-integration/CROSS_FEATURE_INTEGRATION_MAP.md)
- [Strategic Integration Design](../.agent/specs/strategic-integration/design.md)

**Rationale:**
- Event-driven architecture enables decoupling
- Automated processing ensures consistency
- Strategic integration creates platform value
- Network effects increase engagement

---

## Decision Log

| Date | Decision | Status | Impact |
|------|----------|--------|--------|
| 2026-02-24 | FSD architecture | ✅ Complete | High |
| 2026-02-27 | Unified error handling | ✅ Complete | High |
| 2026-02-27 | DI container | ✅ Complete | Medium |
| 2026-02-27 | Public API enforcement | 🔄 In Progress | High |
| 2026-02-27 | Layer architecture | 🔄 In Progress | High |
| 2026-02-27 | Store encapsulation | 🔄 In Progress | Medium |
| 2026-02-27 | Unified validation | ✅ Complete | Medium |
| 2026-02-27 | Centralized logging | 🔄 In Progress | Medium |
| 2026-02-27 | Notification consolidation | ⏳ Planned | High |
| 2024 | DDD structure | ✅ Complete | High |
| 2024 | API standardization | ✅ Complete | Medium |
| 2026-02-27 | Testing strategy | 🔄 In Progress | High |
| 2026-02-27 | Incremental migration | 🔄 In Progress | High |
| 2026-02-27 | Documentation standards | 🔄 In Progress | Low |
| 2026-02-27 | Infrastructure integration | ✅ Complete | High |
| 2026-02-27 | Strategic feature integration | 📋 Proposed | High |

---

## Related Documentation

### Architecture
- [Architecture Overview](./ARCHITECTURE.md)
- [Project Structure](./project-structure.md)
- [FSD Import Guide](./FSD_IMPORT_GUIDE.md)
- [Path Alias Resolution](./PATH_ALIAS_RESOLUTION.md)

### Development
- [Developer Guide](./DEVELOPER_GUIDE_Feature_Creation.md)
- [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
- [Development Workflow](./DEVELOPMENT_WORKFLOW.md)

### ADRs
- [ADR-001: DDD Feature Structure](./ADR-001-DDD-Feature-Structure.md)
- [ADR-002: Facade Pattern](./ADR-002-Facade-Pattern-For-Middleware.md)
- [All ADRs](./adr/README.md)

### Features
- [Notification System Consolidation](./NOTIFICATION_SYSTEM_CONSOLIDATION.md)

---

## Maintenance

**Update Triggers:**
- New architectural decisions are made
- Existing decisions are revised
- Implementation status changes significantly
- New patterns emerge

**Review Frequency:** Quarterly or after major milestones

**Owners:** Architecture Team

---

**Document Version:** 1.0  
**Last Reviewed:** 2026-02-27  
**Next Review:** 2026-05-27

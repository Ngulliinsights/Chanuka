# ADR-001: Domain-Driven Design Feature Structure

**Status**: Accepted  
**Date**: 2026-02-24  
**Decision Makers**: Architecture Team  
**Related**: ADR-002 (Facade Pattern), ADR-003 (Layer Import Rules)

---

## Context

The server codebase had inconsistent feature organization with:
- 16+ circular dependencies between infrastructure and features
- Mixed flat and structured features (only 11% well-structured)
- Unclear boundaries between application, domain, and infrastructure concerns
- Difficult navigation and maintenance

We needed a consistent, scalable architecture pattern that:
- Eliminates circular dependencies
- Provides clear separation of concerns
- Scales with team growth
- Improves testability and maintainability

---

## Decision

We will adopt **Domain-Driven Design (DDD) layered architecture** for all feature modules with the following structure:

```
features/<feature-name>/
├── application/           # Application Layer
│   ├── *.routes.ts       # HTTP routes (Express routers)
│   ├── *.controller.ts   # Controllers (request/response handling)
│   ├── *.service.ts      # Application services (orchestration)
│   └── use-cases/        # Use case implementations
├── domain/               # Domain Layer
│   ├── entities/         # Domain entities (business objects)
│   ├── events/           # Domain events
│   ├── services/         # Domain services (business logic)
│   └── value-objects/    # Value objects (immutable values)
├── infrastructure/       # Infrastructure Layer
│   ├── repositories/     # Repository implementations (data access)
│   ├── storage/          # Storage adapters
│   └── adapters/         # External service adapters
├── types/               # Shared type definitions
├── index.ts             # Public API (centralized exports)
└── README.md            # Feature documentation
```

---

## Rationale

### Why DDD?

1. **Clear Separation of Concerns**
   - Application layer handles HTTP/API concerns
   - Domain layer contains pure business logic
   - Infrastructure layer manages technical details

2. **Testability**
   - Domain logic can be tested without infrastructure
   - Infrastructure can be mocked easily
   - Clear boundaries enable focused unit tests

3. **Maintainability**
   - Easy to locate specific functionality
   - Changes in one layer don't ripple to others
   - New developers can navigate consistently

4. **Scalability**
   - Pattern scales from small to large features
   - Team can work on different layers independently
   - Microservices extraction is easier if needed

### Why This Specific Structure?

1. **application/** - Entry point for external requests
   - Routes define HTTP endpoints
   - Controllers handle request/response
   - Services orchestrate domain logic

2. **domain/** - Core business logic
   - Entities represent business concepts
   - Services implement business rules
   - Events communicate state changes
   - Value objects ensure immutability

3. **infrastructure/** - Technical implementation
   - Repositories abstract data access
   - Adapters integrate external services
   - Storage handles persistence details

4. **types/** - Shared contracts
   - DTOs for data transfer
   - Interfaces for contracts
   - Type definitions for TypeScript

5. **index.ts** - Public API
   - Single entry point for imports
   - Hides internal structure
   - Enables refactoring without breaking consumers

---

## Consequences

### Positive

1. **Zero Circular Dependencies**
   - Clear layer hierarchy prevents cycles
   - Infrastructure → Domain → Application flow

2. **Improved Developer Experience**
   - Consistent structure across features
   - Easy to find specific functionality
   - Reduced cognitive load

3. **Better Testability**
   - Domain logic isolated from infrastructure
   - Clear boundaries for mocking
   - Focused unit tests

4. **Easier Onboarding**
   - New developers learn one pattern
   - Documentation applies to all features
   - Consistent code review process

5. **Future-Proof**
   - Microservices extraction possible
   - Easy to add new layers if needed
   - Scales with team growth

### Negative

1. **Migration Effort**
   - 28 features need reorganization
   - Estimated 20-30 hours total effort
   - Requires careful testing

2. **More Folders**
   - Deeper folder structure
   - More navigation required
   - IDE folder management needed

3. **Learning Curve**
   - Team needs to learn DDD concepts
   - Requires discipline to maintain
   - Code reviews must enforce structure

### Neutral

1. **File Moves**
   - Many files need relocation
   - Import paths change internally
   - Public API remains stable

2. **Documentation Overhead**
   - Each feature needs README
   - Structure must be documented
   - Examples must be maintained

---

## Implementation

### Phase 1: Critical Fixes (Complete ✅)
- Broke circular dependencies
- Established facades for middleware
- Moved security and notification services

### Phase 2: Structural Improvements (Complete ✅)
- Reorganized Analytics, Privacy, Admin features
- Established feature template
- Created centralized index exports

### Phase 3: Documentation & Guardrails (In Progress)
- Create ADRs (this document)
- Set up automated checks
- Create developer guide

---

## Examples

### Good: Bills Feature
```
features/bills/
├── application/
│   ├── bill-service.ts
│   └── bills.ts (routes)
├── domain/
│   ├── entities/
│   ├── events/
│   └── services/
├── infrastructure/
│   └── bill-storage.ts
└── index.ts
```

### Good: Users Feature
```
features/users/
├── application/
│   ├── profile.ts (routes)
│   └── verification.ts (routes)
├── domain/
│   ├── user-profile.ts
│   └── services/
└── infrastructure/
    └── user-storage.ts
```

### Bad: Flat Structure (Before Migration)
```
features/privacy/
├── privacy-service.ts
├── privacy-routes.ts
└── privacy-scheduler.ts
```

---

## Alternatives Considered

### 1. Feature-Sliced Design (FSD)
**Pros**: Popular in frontend, clear boundaries  
**Cons**: More complex, overkill for backend  
**Decision**: DDD is simpler and more appropriate for backend

### 2. Flat Structure
**Pros**: Simple, fewer folders  
**Cons**: Doesn't scale, unclear boundaries, circular dependencies  
**Decision**: Rejected due to maintenance issues

### 3. Hexagonal Architecture
**Pros**: Very clean separation, ports and adapters  
**Cons**: More complex, steeper learning curve  
**Decision**: DDD provides enough structure without complexity

### 4. Clean Architecture
**Pros**: Very comprehensive, well-documented  
**Cons**: Too many layers for our needs  
**Decision**: DDD is simpler while providing key benefits

---

## Compliance

### Automated Checks
- dependency-cruiser validates layer boundaries
- ESLint rules enforce import patterns
- Pre-commit hooks prevent violations

### Code Review Checklist
- [ ] Feature follows DDD structure
- [ ] Files in correct layer (application/domain/infrastructure)
- [ ] index.ts exports public API
- [ ] No circular dependencies
- [ ] README documents feature

### Migration Tracking
- 9 features migrated (32%)
- 19 features remaining (68%)
- Target: 100% by end of Q1 2026

---

## References

- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Feature-Sliced Design](https://feature-sliced.design/)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-24 | 1.0 | Initial ADR | Architecture Team |

---

**Status**: ✅ Accepted and Implemented  
**Next Review**: Q2 2026

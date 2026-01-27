# Chanuka Client Application - Architectural Governance Guide

## Overview

This document establishes the architectural governance framework for the Chanuka client application, defining clear boundaries, consolidation strategies, and governance practices to prevent architectural debt and redundancies.

## Directory Structure and Boundaries

### 1. Shared Directory (`client/src/lib/`)

**Purpose**: UI components, design system, and technical infrastructure

**Contents**:
- **Design System**: Core design tokens, components, and styling utilities
- **UI Components**: Reusable UI elements and templates
- **Infrastructure**: Technical infrastructure (error handling, browser compatibility, performance monitoring)
- **Services**: Cross-cutting services (notification, validation, utilities)
- **Hooks**: Shared React hooks for UI concerns
- **Libraries**: Utility libraries and helpers
- **Testing**: Testing infrastructure and utilities

**Governance Rules**:
- ✅ **Allowed**: UI components, design system, technical infrastructure
- ❌ **Forbidden**: Business logic, feature-specific implementations
- 🔄 **Migration**: Move business logic to core, feature logic to features

### 2. Core Directory (`client/src/core/`)

**Purpose**: Business logic, domain services, and enterprise-grade utilities

**Contents**:
- **Business Logic**: Domain services, business rules, and workflows
- **API Services**: Business-focused API interactions and data management
- **Authentication**: Authentication and authorization systems
- **Error Management**: Core error handling and recovery strategies
- **Performance**: Performance monitoring and optimization
- **Storage**: Session management, token handling, and caching
- **Validation**: Business rule validation and data integrity

**Governance Rules**:
- ✅ **Allowed**: Business logic, domain services, enterprise utilities
- ❌ **Forbidden**: UI components, feature-specific implementations
- 🔄 **Migration**: Move UI concerns to shared, feature logic to features

### 3. Features Directory (`client/src/features/`)

**Purpose**: Feature-specific implementations and domain features

**Contents**:
- **Feature Modules**: Self-contained feature implementations
- **Feature Services**: Feature-specific business logic
- **Feature Components**: Feature-specific UI components
- **Feature Hooks**: Feature-specific React hooks
- **Feature Types**: Feature-specific type definitions

**Governance Rules**:
- ✅ **Allowed**: Feature-specific implementations, feature services
- ❌ **Forbidden**: Cross-feature dependencies, shared utilities
- 🔄 **Migration**: Extract shared code to shared/core as appropriate

## Consolidation Strategy

### 1. Data Retention Services

**Current State**:
- `client/src/lib/services/data-retention.ts` (553 lines) - Basic implementation
- `client/src/core/analytics/data-retention-service.ts` (960 lines) - Enterprise implementation

**Consolidation Plan**:
1. **Remove**: `client/src/lib/services/data-retention.ts`
2. **Keep**: `client/src/core/analytics/data-retention-service.ts` as primary
3. **Update**: All imports to use core version
4. **Document**: Migration path for existing usage

**Rationale**: The core version provides enterprise-grade features, compliance frameworks, and comprehensive audit logging that the shared version lacks.

### 2. Navigation Services

**Current State**:
- `client/src/lib/services/navigation.ts` (506 lines) - Comprehensive navigation
- `client/src/core/navigation/navigation-service.ts` (82 lines) - Testing abstraction
- `client/src/config/navigation.ts` (117 lines) - Static configuration

**Consolidation Plan**:
1. **Keep**: `client/src/lib/services/navigation.ts` as primary navigation service
2. **Keep**: `client/src/core/navigation/navigation-service.ts` for testing abstraction
3. **Move**: `client/src/config/navigation.ts` to `client/src/lib/config/navigation.ts`
4. **Update**: Import paths and dependencies

**Rationale**: Clear separation of concerns - shared handles navigation logic, core handles testing abstraction.

### 3. Storage Management

**Current State**:
- `client/src/core/storage/` - Comprehensive storage management
- `client/src/lib/` - Some storage utilities

**Consolidation Plan**:
1. **Audit**: All storage-related code in shared directory
2. **Move**: Technical storage utilities to core
3. **Keep**: UI-related storage in shared
4. **Document**: Clear boundaries for storage responsibilities

## Architectural Governance Practices

### 1. Service Selection Guidelines

**When to use Shared**:
- UI components and design system elements
- Technical infrastructure (error handling, browser compatibility)
- Cross-cutting utilities and helpers
- Testing infrastructure

**When to use Core**:
- Business logic and domain services
- Enterprise-grade utilities
- Authentication and authorization
- Performance monitoring and optimization

**When to use Features**:
- Feature-specific implementations
- Feature services and components
- Feature-specific business logic
- Feature-specific type definitions

### 2. Import Path Governance

**Allowed Import Patterns**:
```
shared → core (for business logic dependencies)
features → shared (for UI components and utilities)
features → core (for business services)
```

**Forbidden Import Patterns**:
```
core → shared (creates circular dependencies)
core → features (breaks layer boundaries)
shared → features (breaks layer boundaries)
```

**Recommended Import Structure**:
```typescript
// ✅ Good
import { Button } from '@client/lib/ui';
import { AuthService } from '@client/core/auth';
import { UserProfile } from '@client/features/users';

// ❌ Bad
import { Button } from '@client/core/ui'; // Wrong layer
import { UserProfile } from '@client/lib/features'; // Wrong layer
```

### 3. Naming Conventions

**Service Naming**:
- Shared services: `use[Feature]` (e.g., `useNavigation`)
- Core services: `[Feature]Service` (e.g., `AuthService`)
- Feature services: `[Feature]Service` (e.g., `UserProfileService`)

**File Organization**:
- Shared: `client/src/lib/[category]/[service].ts`
- Core: `client/src/core/[domain]/[service].ts`
- Features: `client/src/features/[feature]/[service].ts`

### 4. Dependency Management

**Dependency Injection**:
- Use dependency injection for testability
- Abstract external dependencies
- Create interfaces for cross-layer communication

**Circular Dependency Prevention**:
- Use dependency inversion principle
- Create shared interfaces in appropriate layers
- Avoid direct imports between layers

### 5. Code Review Guidelines

**Review Checklist**:
- [ ] Service placed in correct directory (shared/core/features)
- [ ] No circular dependencies introduced
- [ ] Import paths follow governance rules
- [ ] Naming conventions followed
- [ ] Documentation updated for public APIs
- [ ] Tests added for new functionality

**Red Flags**:
- Services in wrong directory
- Circular import dependencies
- Violation of layer boundaries
- Missing documentation
- Inconsistent naming

## Migration Strategy

### Phase 1: Immediate Actions (Week 1)

1. **Remove Redundant Services**:
   - Remove `client/src/lib/services/data-retention.ts`
   - Update all imports to use core version
   - Test all functionality

2. **Consolidate Navigation**:
   - Move navigation config to shared
   - Update import paths
   - Document navigation service usage

3. **Audit Storage Code**:
   - Identify storage utilities in shared
   - Plan migration to core
   - Update dependencies

### Phase 2: Medium-term Actions (Weeks 2-4)

1. **Establish Governance**:
   - Implement code review guidelines
   - Create architectural documentation
   - Train development team

2. **Clean Up Dependencies**:
   - Remove unused imports
   - Update package.json dependencies
   - Optimize bundle size

3. **Improve Testing**:
   - Add tests for consolidated services
   - Update test mocks
   - Ensure test coverage

### Phase 3: Long-term Actions (Months 2-3)

1. **Monitor and Optimize**:
   - Monitor for new redundancies
   - Optimize performance
   - Gather feedback

2. **Documentation**:
   - Complete architectural documentation
   - Create developer guides
   - Maintain governance practices

## Success Metrics

### 1. Code Quality Metrics
- **Redundancy Reduction**: Eliminate duplicate functionality
- **Import Complexity**: Reduce circular dependencies
- **Bundle Size**: Optimize final bundle size
- **Test Coverage**: Maintain or improve test coverage

### 2. Developer Experience Metrics
- **Build Time**: Monitor build performance
- **Development Speed**: Measure feature development velocity
- **Bug Reports**: Track reduction in architecture-related bugs
- **Code Review Time**: Measure review efficiency

### 3. Maintenance Metrics
- **Technical Debt**: Track and reduce technical debt
- **Refactoring Frequency**: Monitor need for refactoring
- **Onboarding Time**: Measure new developer onboarding efficiency

## Governance Team

### Architecture Review Board
- **Members**: Senior developers, tech leads, architects
- **Responsibilities**: Review architectural decisions, enforce governance
- **Frequency**: Bi-weekly reviews

### Code Review Team
- **Members**: All developers
- **Responsibilities**: Enforce governance during code reviews
- **Tools**: GitHub/GitLab reviews, automated checks

### Documentation Team
- **Members**: Technical writers, senior developers
- **Responsibilities**: Maintain architectural documentation
- **Frequency**: Continuous updates

## Conclusion

This architectural governance guide establishes clear boundaries and practices to prevent architectural debt and redundancies. By following these guidelines, the development team can maintain a clean, scalable, and maintainable codebase that supports the long-term goals of the Chanuka application.


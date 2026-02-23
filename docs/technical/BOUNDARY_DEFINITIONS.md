# Architectural Boundary Definitions

## Overview

This document defines the clear architectural boundaries between the `shared`, `core`, and `features` directories in the Chanuka client application. These boundaries prevent circular dependencies, maintain separation of concerns, and ensure proper architectural flow.

## Directory Structure and Responsibilities

### 1. Shared Directory (`client/src/lib/`)

**Purpose**: Cross-cutting concerns and reusable infrastructure that can be consumed by both client and server modules.

**Allowed Contents**:
- UI components and design system
- Technical infrastructure (logging, monitoring, error handling)
- Cross-cutting services (navigation, data retention)
- Type definitions and utilities
- Testing infrastructure
- Design system and styling

**Boundary Rules**:
- ✅ **CAN** contain generic, reusable code
- ✅ **CAN** import from `@types/` and external dependencies
- ❌ **CANNOT** import from `client/src/infrastructure/`
- ❌ **CANNOT** import from `client/src/features/`
- ❌ **CANNOT** contain feature-specific business logic

**Examples**:
```typescript
// ✅ ALLOWED: Generic navigation service
export class NavigationService { ... }

// ✅ ALLOWED: Design system components
export const Button = styled.button`...`;

// ❌ FORBIDDEN: Feature-specific logic
export class BillNavigationService { ... }
```

### 2. Core Directory (`client/src/infrastructure/`)

**Purpose**: Business logic, domain services, and enterprise utilities that implement the core functionality of the application.

**Allowed Contents**:
- Business logic and domain services
- Authentication and authorization
- Analytics and data retention services
- Error management and monitoring
- Performance optimization
- Storage management and validation

**Boundary Rules**:
- ✅ **CAN** import from `client/src/lib/`
- ✅ **CAN** import from `@types/` and external dependencies
- ❌ **CANNOT** import from `client/src/features/`
- ❌ **CANNOT** contain UI components
- ❌ **CANNOT** contain feature-specific presentation logic

**Examples**:
```typescript
// ✅ ALLOWED: Business logic service
export class DataRetentionService { ... }

// ✅ ALLOWED: Authentication service
export class AuthService { ... }

// ❌ FORBIDDEN: UI components
export const Dashboard = () => { ... };
```

### 3. Features Directory (`client/src/features/`)

**Purpose**: Self-contained feature modules that implement specific business capabilities.

**Allowed Contents**:
- Feature-specific components and pages
- Feature-specific business logic
- Feature-specific services and utilities
- Feature-specific state management
- Feature-specific routing and navigation

**Boundary Rules**:
- ✅ **CAN** import from `client/src/lib/`
- ✅ **CAN** import from `client/src/infrastructure/`
- ✅ **CAN** import from `@types/` and external dependencies
- ❌ **CANNOT** import from other features
- ❌ **CANNOT** contain cross-cutting concerns
- ❌ **CANNOT** contain generic utilities

**Examples**:
```typescript
// ✅ ALLOWED: Feature-specific component
export const BillDetailPage = () => { ... };

// ✅ ALLOWED: Feature using core service
import { DataRetentionService } from '@/infrastructure/analytics/data-retention-service';

// ❌ FORBIDDEN: Importing from another feature
import { UserProfile } from '@/features/users';
```

## Import Path Governance

### Allowed Import Patterns

```typescript
// ✅ Shared → Core (business logic dependencies)
import { NavigationService } from '@/shared/services/navigation';

// ✅ Features → Shared (UI components)
import { Button } from '@/shared/ui/button';

// ✅ Features → Core (business services)
import { DataRetentionService } from '@/infrastructure/analytics/data-retention-service';

// ✅ Core → Shared (infrastructure)
import { logger } from '@/shared/utils/logger';
```

### Forbidden Import Patterns

```typescript
// ❌ Core → Shared (circular dependencies)
import { Button } from '@/shared/ui/button';

// ❌ Core → Features (layer violations)
import { BillService } from '@/features/bills';

// ❌ Shared → Features (layer violations)
import { UserProfile } from '@/features/users';

// ❌ Features → Features (tight coupling)
import { UserDashboard } from '@/features/users';
```

## Service Placement Guidelines

### When to Use Shared Services

Use `client/src/lib/services/` for:
- **Navigation**: Cross-cutting navigation logic
- **Data Retention**: Platform-wide data lifecycle management
- **Error Handling**: Global error management and boundaries
- **Logging**: Centralized logging infrastructure
- **Utilities**: Generic utilities used across multiple features

### When to Use Core Services

Use `client/src/infrastructure/` for:
- **Business Logic**: Domain-specific business rules and processes
- **Authentication**: User authentication and authorization
- **Analytics**: Platform analytics and telemetry
- **Performance**: Performance monitoring and optimization
- **Storage**: Data storage and caching strategies

### When to Use Feature Services

Use `client/src/features/[feature]/` for:
- **Feature Logic**: Feature-specific business rules
- **Feature Components**: UI components specific to a feature
- **Feature State**: State management for a specific feature
- **Feature Routing**: Feature-specific routing and navigation

## Naming Conventions

### Directory Structure
```
client/src/
├── shared/
│   ├── ui/                    # Design system and components
│   ├── services/              # Cross-cutting services
│   ├── infrastructure/        # Technical infrastructure
│   ├── types/                 # Shared type definitions
│   └── utils/                 # Generic utilities
├── core/
│   ├── analytics/             # Analytics and data services
│   ├── auth/                  # Authentication and authorization
│   ├── error/                 # Error management
│   ├── loading/               # Loading states
│   ├── monitoring/            # Performance monitoring
│   ├── navigation/            # Navigation abstraction
│   ├── performance/           # Performance optimization
│   ├── security/              # Security services
│   ├── storage/               # Storage management
│   └── validation/            # Validation services
└── features/
    ├── [feature-name]/
    │   ├── components/        # Feature-specific components
    │   ├── services/          # Feature-specific services
    │   ├── hooks/             # Feature-specific hooks
    │   ├── types/             # Feature-specific types
    │   └── utils/             # Feature-specific utilities
```

### File Naming
- Use kebab-case for directories: `user-profile`, `bill-tracking`
- Use PascalCase for components: `UserProfile.tsx`, `BillCard.tsx`
- Use camelCase for services: `userService.ts`, `dataRetentionService.ts`
- Use index.ts for module exports

## Migration Guidelines

### Moving Code Between Layers

1. **Shared → Core**: When generic code becomes business-specific
2. **Core → Shared**: When business logic becomes cross-cutting
3. **Features → Shared**: When feature code becomes reusable
4. **Features → Core**: When feature logic becomes business-critical

### Breaking Changes

When moving code between layers:
1. Update all imports to use new paths
2. Update type exports and re-exports
3. Update tests to use new import paths
4. Update documentation and README files
5. Consider backward compatibility for public APIs

## Enforcement

### Linting Rules

Add to `.eslintrc.js`:
```javascript
{
  "rules": {
    "import/no-restricted-paths": ["error", {
      "zones": [
        {
          "target": "./client/src/infrastructure",
          "from": "./client/src/features",
          "message": "Core cannot import from features"
        },
        {
          "target": "./client/src/lib",
          "from": "./client/src/infrastructure",
          "message": "Shared cannot import from core"
        },
        {
          "target": "./client/src/lib",
          "from": "./client/src/features",
          "message": "Shared cannot import from features"
        }
      ]
    }]
  }
}
```

### Testing

1. **Unit Tests**: Test each layer independently
2. **Integration Tests**: Test layer interactions
3. **Architectural Tests**: Validate boundary compliance
4. **Import Tests**: Verify no forbidden imports exist

### Continuous Integration

Add to CI pipeline:
1. Run architectural boundary tests
2. Check for circular dependencies
3. Validate import patterns
4. Report boundary violations

## Examples

### Before (Violations)
```typescript
// ❌ client/src/infrastructure/analytics/data-retention-service.ts
import { Button } from '@/shared/ui/button'; // Core importing UI

// ❌ client/src/lib/services/navigation.ts
import { BillService } from '@/features/bills'; // Shared importing feature

// ❌ client/src/features/bills/components/BillList.tsx
import { UserProfile } from '@/features/users'; // Feature importing feature
```

### After (Compliant)
```typescript
// ✅ client/src/infrastructure/analytics/data-retention-service.ts
import { logger } from '@/shared/utils/logger'; // Core using shared infrastructure

// ✅ client/src/lib/services/navigation.ts
export class NavigationService { /* generic navigation logic */ } // Shared providing generic service

// ✅ client/src/features/bills/components/BillList.tsx
import { Button } from '@/shared/ui/button'; // Feature using shared UI
import { DataRetentionService } from '@/infrastructure/analytics/data-retention-service'; // Feature using core service
```

## Benefits

Following these boundary definitions provides:

1. **Maintainability**: Clear separation of concerns
2. **Testability**: Independent layer testing
3. **Scalability**: Feature isolation and growth
4. **Reusability**: Proper abstraction levels
5. **Performance**: Optimized bundle splitting
6. **Developer Experience**: Clear code organization

## Review and Updates

This document should be reviewed and updated when:
- New architectural patterns are introduced
- Layer responsibilities change
- New import patterns emerge
- Team feedback indicates confusion or violations

Regular architectural reviews should validate compliance with these boundaries and identify opportunities for improvement.

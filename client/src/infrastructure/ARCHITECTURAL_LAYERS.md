# Architectural Layers

This document defines the architectural layering for the client infrastructure modules. Dependencies must flow downward only (higher layers can depend on lower layers, but not vice versa).

## Layer Hierarchy

```
PRESENTATION (Layer 5)
    ↓
INTEGRATION (Layer 4)
    ↓
SERVICES (Layer 3)
    ↓
PRIMITIVES (Layer 2)
    ↓
TYPES (Layer 1)
```

## Layer Definitions

### Layer 1: TYPES
**Purpose**: Pure type definitions with no runtime dependencies

**Responsibilities**:
- Type definitions and interfaces
- Enums and constants
- Type utilities
- No runtime code or side effects

**Modules**:
- `error/types/` - Error type definitions (BaseError, ClientError, ErrorContext)
- `logging/types/` - Logger interfaces (ILogger, LogContext, LogLevel)
- `observability/types/` - Observability interfaces (IObservability, metrics types)
- `validation/types/` - Validation interfaces (IValidator, ValidationRules)

**Allowed Dependencies**:
- `@shared/core` types
- TypeScript built-in types
- No other infrastructure modules

---

### Layer 2: PRIMITIVES
**Purpose**: Core infrastructure primitives with minimal dependencies

**Responsibilities**:
- Event bus for pub/sub messaging
- Storage abstraction (localStorage, sessionStorage)
- Cache implementation
- No business logic

**Modules**:
- `events/` - Event bus for decoupled communication
- `storage/` - Storage abstraction layer
- `cache/` - Caching infrastructure

**Allowed Dependencies**:
- Layer 1 (TYPES)
- `@shared/core` utilities
- No other infrastructure modules

---

### Layer 3: SERVICES
**Purpose**: Core services that provide infrastructure capabilities

**Responsibilities**:
- API communication (HTTP, WebSocket, realtime)
- Observability (error monitoring, performance, telemetry, analytics)
- Error handling and recovery
- Logging infrastructure
- Validation logic

**Modules**:
- `api/` - HTTP client, WebSocket, realtime communication
- `observability/` - Error monitoring, performance tracking, telemetry, analytics
- `error/` - Error handling, factory functions, serialization, recovery
- `logging/` - Structured logging with observability integration
- `validation/` - Field and form validation

**Allowed Dependencies**:
- Layer 1 (TYPES)
- Layer 2 (PRIMITIVES)
- Other SERVICES layer modules (with care to avoid circular dependencies)
- `@shared/core` utilities

**Forbidden Dependencies**:
- Layer 4 (INTEGRATION)
- Layer 5 (PRESENTATION)

---

### Layer 4: INTEGRATION
**Purpose**: Integration with external systems and state management

**Responsibilities**:
- State management (Redux store)
- Authentication and authorization
- Data synchronization
- Search functionality
- Security features
- Personalization
- Recovery mechanisms

**Modules**:
- `store/` - Redux store with slices (dashboard, navigation, loading)
- `auth/` - Authentication and authorization
- `sync/` - Data synchronization
- `search/` - Search functionality
- `security/` - Security features
- `personalization/` - User personalization
- `recovery/` - Error recovery mechanisms

**Allowed Dependencies**:
- Layer 1 (TYPES)
- Layer 2 (PRIMITIVES)
- Layer 3 (SERVICES)
- Other INTEGRATION layer modules (with care to avoid circular dependencies)
- `@shared/core` utilities

**Forbidden Dependencies**:
- Layer 5 (PRESENTATION)

---

### Layer 5: PRESENTATION
**Purpose**: UI-related infrastructure and browser-specific features

**Responsibilities**:
- Command palette UI
- Community features UI
- Mobile-specific features
- System integration (notifications, clipboard)
- Web workers
- Asset loading
- Browser utilities
- Navigation
- React hooks

**Modules**:
- `command-palette/` - Command palette UI infrastructure
- `community/` - Community features
- `mobile/` - Mobile-specific features
- `system/` - System integration (notifications, clipboard)
- `workers/` - Web workers infrastructure
- `asset-loading/` - Asset loading utilities
- `browser/` - Browser utilities and detection
- `navigation/` - Navigation utilities
- `hooks/` - React hooks for infrastructure

**Allowed Dependencies**:
- Layer 1 (TYPES)
- Layer 2 (PRIMITIVES)
- Layer 3 (SERVICES)
- Layer 4 (INTEGRATION)
- Other PRESENTATION layer modules
- `@shared/core` utilities
- React and browser APIs

---

## Dependency Rules

### Rule 1: Downward Dependencies Only
Dependencies MUST flow from higher layers to lower layers. A module in layer N can only depend on modules in layers 1 through N-1.

**Valid**:
- PRESENTATION → INTEGRATION ✓
- INTEGRATION → SERVICES ✓
- SERVICES → PRIMITIVES ✓
- PRIMITIVES → TYPES ✓

**Invalid**:
- TYPES → PRIMITIVES ✗
- PRIMITIVES → SERVICES ✗
- SERVICES → INTEGRATION ✗
- INTEGRATION → PRESENTATION ✗

### Rule 2: Same-Layer Dependencies
Modules within the same layer CAN depend on each other, but must avoid circular dependencies.

**Example**:
- `api/` → `error/` ✓ (both in SERVICES layer)
- `error/` → `logging/` ✓ (both in SERVICES layer)
- `logging/` → `api/` ✗ (would create circular dependency)

### Rule 3: Type-Only Dependencies
Type-only imports (using `import type`) are allowed from any layer, as they have no runtime impact.

**Example**:
```typescript
// Allowed: type-only import from higher layer
import type { StoreState } from '@/infrastructure/store';

// Not allowed: runtime import from higher layer
import { store } from '@/infrastructure/store';
```

### Rule 4: Shared Core Exception
All layers can depend on `@shared/core` as it contains shared types and utilities used across client and server.

---

## Module Layer Assignments

| Module | Layer | Rationale |
|--------|-------|-----------|
| `error/types/` | TYPES | Pure type definitions |
| `logging/types/` | TYPES | Pure type definitions |
| `observability/types/` | TYPES | Pure type definitions |
| `validation/types/` | TYPES | Pure type definitions |
| `events/` | PRIMITIVES | Core event bus primitive |
| `storage/` | PRIMITIVES | Core storage primitive |
| `cache/` | PRIMITIVES | Core caching primitive |
| `api/` | SERVICES | HTTP/WebSocket/realtime services |
| `observability/` | SERVICES | Monitoring and telemetry services |
| `error/` | SERVICES | Error handling services |
| `logging/` | SERVICES | Logging services |
| `validation/` | SERVICES | Validation services |
| `store/` | INTEGRATION | State management integration |
| `auth/` | INTEGRATION | Authentication integration |
| `sync/` | INTEGRATION | Data sync integration |
| `search/` | INTEGRATION | Search integration |
| `security/` | INTEGRATION | Security integration |
| `personalization/` | INTEGRATION | Personalization integration |
| `recovery/` | INTEGRATION | Recovery integration |
| `command-palette/` | PRESENTATION | UI component infrastructure |
| `community/` | PRESENTATION | UI features |
| `mobile/` | PRESENTATION | Mobile UI features |
| `system/` | PRESENTATION | System UI integration |
| `workers/` | PRESENTATION | Web workers for UI |
| `asset-loading/` | PRESENTATION | Asset loading for UI |
| `browser/` | PRESENTATION | Browser utilities for UI |
| `navigation/` | PRESENTATION | Navigation for UI |
| `hooks/` | PRESENTATION | React hooks for UI |

---

## Validation

The architectural layering is enforced through dependency-cruiser rules in `.dependency-cruiser.cjs`. The rules ensure:

1. No upward dependencies (lower layers cannot depend on higher layers)
2. No circular dependencies within layers
3. Public API enforcement (modules must be imported through index.ts)
4. Sub-module encapsulation (internal modules are not directly accessible)

To validate the architecture:

```bash
# Check for architectural violations
npm run check:deps

# Visualize dependency graph
npm run deps:graph
```

---

## Migration Guide

When adding a new module:

1. Determine the appropriate layer based on the module's responsibilities
2. Add the module to the layer assignment table above
3. Update `.dependency-cruiser.cjs` with appropriate layer rules
4. Ensure the module only depends on lower layers
5. Run `npm run check:deps` to validate

When refactoring existing modules:

1. Identify the current layer and target layer
2. Review all dependencies to ensure they comply with target layer rules
3. Refactor dependencies if needed (extract interfaces, use DI, etc.)
4. Update layer assignment documentation
5. Run `npm run check:deps` to validate

---

## Benefits

1. **Clear Dependency Flow**: Dependencies flow in one direction, making the codebase easier to understand
2. **Reduced Coupling**: Layers are loosely coupled, making changes easier
3. **Testability**: Lower layers can be tested independently of higher layers
4. **Maintainability**: Clear boundaries make it easier to locate and modify code
5. **Scalability**: New modules can be added without breaking existing architecture
6. **Circular Dependency Prevention**: Layering naturally prevents circular dependencies

---

## References

- Requirements: 17.1, 17.3
- Design Document: Section on Dependency Graph Validation
- Dependency Cruiser Config: `.dependency-cruiser.cjs`

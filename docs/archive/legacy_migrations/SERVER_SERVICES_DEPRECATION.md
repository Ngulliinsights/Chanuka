# Service Directory Deprecation Notice

**Date:** January 14, 2026  
**Status:** Deprecated - Migrate to Feature-Based Architecture

## Overview

The `server/services/` directory is being deprecated in favor of a feature-based architecture located in `server/features/`.

## Migration Map

| Old Location | New Location |
|---|---|
| `server/services/argument-extraction.service.ts` | `server/features/argument-intelligence/application/argument-intelligence-service.ts` |
| `server/services/constitutional-analysis.service.ts` | `server/features/constitutional-analysis/application/constitutional-analysis-service-complete.ts` |
| All future services | `server/features/[feature-name]/application/` |

## Feature-Based Structure

Each feature now follows this structure:

```
server/features/[feature-name]/
├── application/           # Business logic & services
│   ├── *-service.ts
│   ├── *-processor.ts
│   └── *-validator.ts
├── infrastructure/        # External integrations & utilities
│   ├── nlp/
│   ├── external/
│   └── knowledge-base/
├── types/                 # TypeScript interfaces & types
│   └── index.ts
├── config/               # Configuration (optional)
├── demo/                 # Demo/test code (optional)
├── [feature]-router.ts   # HTTP route handlers
└── index.ts              # Public API exports
```

## Import Changes

**Before (Deprecated):**
```typescript
import { ArgumentExtractionService } from '@/server/services';
```

**After (New):**
```typescript
import { argumentIntelligenceService } from '@/server/features/argument-intelligence';
// or specific imports
import { ArgumentProcessor } from '@/server/features/argument-intelligence/application';
```

## Timeline

- ✅ **Phase 1 (Complete):** Argument Intelligence moved to features
- ✅ **Phase 2 (Complete):** Constitutional Analysis moved to features
- ⏳ **Phase 3 (In Progress):** Migrate remaining services
- ⏳ **Phase 4 (Planned):** Remove `server/services/` directory (v2.0)

## Advantages of Feature-Based Architecture

1. **Cohesion:** All feature code in one place (types, logic, routes, tests)
2. **Modularity:** Easy to enable/disable features
3. **Scalability:** Clear separation of concerns
4. **Testability:** Feature-scoped tests easier to organize
5. **Documentation:** README in feature folder explains implementation

## Action Items

- [ ] Update all imports from `server/services/` to `server/features/[feature]/`
- [ ] Search codebase for deprecated service imports
- [ ] Update API documentation with new import paths
- [ ] Create compatibility shims if needed for gradual migration
- [ ] Plan final removal of `server/services/` directory

## Questions?

See the specific feature's README or IMPLEMENTATION_STATUS.md for details.

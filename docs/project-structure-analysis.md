# Project Structure Analysis

Generated on: 2025-11-05T15:32:36.661Z

## Overview

This document provides an analysis of the current project structure and organization.

## File Statistics

- **Total Files**: 1861
- **Health Score**: 100/100 (Excellent)

### By File Type
- .ts: 1366 files
- .tsx: 256 files
- .md: 135 files
- .js: 53 files
- .json: 21 files
- .css: 19 files
- .html: 11 files

### By Directory
- scripts: 70 files
- scripts\testing: 42 files
- client\src\components\ui: 42 files
- .: 30 files
- client\src\utils: 30 files
- client\src\hooks: 27 files
- shared\schema: 24 files
- server\infrastructure\migration: 24 files
- shared\core\src\utils: 24 files
- client\src\shared\design-system\components: 19 files
- client\src\pages: 18 files
- server\features\search\__tests__: 18 files
- docs: 17 files
- scripts\database: 17 files
- shared\core\src\caching: 17 files

## Import Patterns

- external: 202 imports
- relative: 156 imports
- @shared/: 94 imports
- other: 24 imports
- @/ (client): 10 imports
- @server/: 2 imports

## Structural Issues

No structural issues found! 🎉

## Recommendations

- Consider using more @ shortcuts instead of relative imports for better maintainability

## TypeScript Path Mappings

The following @ shortcuts are configured:

- `@/*` → Client source files
- `@server/*` → Server files
- `@shared/*` → Shared utilities and types
- `@shared/core` → Core shared functionality
- `@shared/schema` → Database schema
- `@db` → Database connection and utilities

## Best Practices

1. Use @ shortcuts instead of relative imports when possible
2. Keep directory nesting under 6 levels
3. Use consistent naming conventions (prefer kebab-case)
4. Include index.ts files in major directories
5. Group related functionality in feature directories

---

*This document is automatically generated. Do not edit manually.*

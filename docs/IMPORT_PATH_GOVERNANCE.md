# Import Path Governance Rules

## ESLint Configuration for Architectural Boundaries

This document provides the ESLint configuration to enforce architectural boundaries and proper import patterns.

## ESLint Rules Configuration

Add the following configuration to your `.eslintrc.js` or `.eslintrc.json`:

```javascript
{
  "rules": {
    "import/no-restricted-paths": ["error", {
      "zones": [
        {
          "target": "./client/src/core",
          "from": "./client/src/features",
          "message": "Core cannot import from features - violates architectural boundaries"
        },
        {
          "target": "./client/src/shared",
          "from": "./client/src/core",
          "message": "Shared cannot import from core - creates circular dependencies"
        },
        {
          "target": "./client/src/shared",
          "from": "./client/src/features",
          "message": "Shared cannot import from features - violates architectural boundaries"
        },
        {
          "target": "./client/src/features",
          "from": "./client/src/features",
          "message": "Features cannot import from other features - creates tight coupling"
        }
      ]
    }],
    "import/order": ["error", {
      "groups": [
        "builtin",
        "external",
        "internal",
        "parent",
        "sibling",
        "index"
      ],
      "pathGroups": [
        {
          "pattern": "@/shared/**",
          "group": "internal",
          "position": "before"
        },
        {
          "pattern": "@/core/**",
          "group": "internal",
          "position": "before"
        },
        {
          "pattern": "@/features/**",
          "group": "internal",
          "position": "before"
        }
      ],
      "pathGroupsExcludedImportTypes": ["builtin"],
      "newlines-between": "always",
      "alphabetize": {
        "order": "asc",
        "caseInsensitive": true
      }
    }],
    "import/no-unresolved": ["error", { "ignore": ["^@/"] }],
    "import/no-absolute-path": ["error", { "ignore": ["^@/"] }]
  }
}
```

## Import Path Aliases

Configure path aliases in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["client/src/*"],
      "@/shared/*": ["client/src/shared/*"],
      "@/core/*": ["client/src/core/*"],
      "@/features/*": ["client/src/features/*"]
    }
  }
}
```

## Import Order Guidelines

### 1. External Dependencies First
```typescript
// ✅ CORRECT
import React from 'react';
import { useState } from 'react';
import axios from 'axios';
```

### 2. Shared Infrastructure
```typescript
// ✅ CORRECT
import { NavigationService } from '@/shared/services/navigation';
import { logger } from '@/shared/utils/logger';
```

### 3. Core Services
```typescript
// ✅ CORRECT
import { DataRetentionService } from '@/core/analytics/data-retention-service';
import { AuthService } from '@/core/auth';
```

### 4. Feature Dependencies
```typescript
// ✅ CORRECT
import { BillService } from '@/features/bills/services/bill-service';
```

### 5. Relative Imports
```typescript
// ✅ CORRECT
import { Button } from './components/Button';
import { useBillData } from '../hooks/useBillData';
```

## Forbidden Import Patterns

### 1. Core → Features (Layer Violation)
```typescript
// ❌ FORBIDDEN
// client/src/core/analytics/data-retention-service.ts
import { BillService } from '@/features/bills/services/bill-service';
```

### 2. Shared → Core (Circular Dependencies)
```typescript
// ❌ FORBIDDEN
// client/src/shared/services/navigation.ts
import { DataRetentionService } from '@/core/analytics/data-retention-service';
```

### 3. Shared → Features (Layer Violation)
```typescript
// ❌ FORBIDDEN
// client/src/shared/ui/components/Button.tsx
import { UserProfile } from '@/features/users/components/UserProfile';
```

### 4. Features → Features (Tight Coupling)
```typescript
// ❌ FORBIDDEN
// client/src/features/bills/components/BillList.tsx
import { UserProfile } from '@/features/users/components/UserProfile';
```

## Allowed Import Patterns

### 1. Features → Shared (Infrastructure)
```typescript
// ✅ ALLOWED
// client/src/features/bills/components/BillList.tsx
import { Button } from '@/shared/ui/components/Button';
import { NavigationService } from '@/shared/services/navigation';
```

### 2. Features → Core (Business Services)
```typescript
// ✅ ALLOWED
// client/src/features/bills/components/BillList.tsx
import { DataRetentionService } from '@/core/analytics/data-retention-service';
import { AuthService } from '@/core/auth';
```

### 3. Core → Shared (Infrastructure)
```typescript
// ✅ ALLOWED
// client/src/core/analytics/data-retention-service.ts
import { logger } from '@/shared/utils/logger';
import { NavigationService } from '@/shared/services/navigation';
```

### 4. Shared → External (Dependencies)
```typescript
// ✅ ALLOWED
// client/src/shared/services/navigation.ts
import { logger } from '@/shared/utils/logger';
import axios from 'axios';
```

## Import Organization Examples

### Before (Disorganized)
```typescript
// ❌ DISORGANIZED
import { useState } from 'react';
import { BillService } from '@/features/bills/services/bill-service';
import React from 'react';
import { NavigationService } from '@/shared/services/navigation';
import { DataRetentionService } from '@/core/analytics/data-retention-service';
import { Button } from './components/Button';
import axios from 'axios';
```

### After (Organized)
```typescript
// ✅ ORGANIZED
import React from 'react';
import { useState } from 'react';
import axios from 'axios';

import { NavigationService } from '@/shared/services/navigation';

import { DataRetentionService } from '@/core/analytics/data-retention-service';

import { BillService } from '@/features/bills/services/bill-service';

import { Button } from './components/Button';
```

## CI/CD Integration

Add these commands to your CI pipeline:

```yaml
# .github/workflows/lint.yml
- name: Run ESLint with boundary rules
  run: npm run lint:boundaries

# package.json scripts
{
  "scripts": {
    "lint:boundaries": "eslint --config .eslintrc-boundary-rules.json client/src",
    "lint:fix": "eslint --fix client/src"
  }
}
```

## Automated Import Updates

Use these commands to automatically fix import issues:

```bash
# Fix import order
npm run lint:fix

# Update path aliases
npx tsc --noEmit --baseUrl . --paths

# Check for boundary violations
npm run lint:boundaries
```

## Common Import Issues and Solutions

### Issue 1: Circular Dependencies
**Problem**: Two modules importing each other
**Solution**: Move shared code to `shared/` or use dependency injection

### Issue 2: Feature Coupling
**Problem**: Features importing other features
**Solution**: Extract shared logic to `shared/` or use events/commands

### Issue 3: Layer Violations
**Problem**: Lower layers importing higher layers
**Solution**: Use interfaces/abstractions or move code to appropriate layer

### Issue 4: Path Resolution
**Problem**: Import paths not resolving
**Solution**: Check `tsconfig.json` paths and ESLint ignore patterns

## Development Workflow

1. **Write Code**: Follow import order guidelines
2. **Run Lint**: Check for boundary violations
3. **Fix Issues**: Use automated fixes when possible
4. **Test**: Verify functionality after changes
5. **Commit**: Ensure CI passes before merging

## Troubleshooting

### ESLint Not Recognizing Aliases
```javascript
// Add to .eslintrc.js
{
  "settings": {
    "import/resolver": {
      "typescript": {
        "alwaysTryTypes": true,
        "project": "./tsconfig.json"
      }
    }
  }
}
```

### TypeScript Path Resolution Issues
```json
// Ensure tsconfig.json has correct paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["client/src/*"]
    }
  }
}
```

### Import Order Conflicts
```javascript
// Configure import/order rule
{
  "rules": {
    "import/order": ["error", {
      "newlines-between": "always",
      "alphabetize": { "order": "asc" }
    }]
  }
}
```

This configuration ensures architectural boundaries are maintained and import patterns remain consistent across the codebase.

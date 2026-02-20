# TypeScript Configuration Circular Dependencies - Visual Analysis

## 🔴 Critical Circular Dependencies Detected

### Circular Dependency #1: Shared ↔ Server

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   shared/tsconfig.json                                      │
│   ┌─────────────────────────────────────────────────┐      │
│   │ "@server": ["../server"]                        │      │
│   │ "@server/*": ["../server/*"]                    │      │
│   └──────────────────────┬──────────────────────────┘      │
│                          │                                  │
│                          │ imports from                     │
│                          ↓                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                          ↓                                  │
│   server/tsconfig.json                                      │
│   ┌─────────────────────────────────────────────────┐      │
│   │ "@shared/*": ["../shared/*"]                    │      │
│   │ references: [{ "path": "../shared" }]           │      │
│   └──────────────────────┬──────────────────────────┘      │
│                          │                                  │
│                          │ imports from                     │
│                          ↓                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ CIRCULAR!
                           └──────────────┐
                                          │
                                          ↓
                                    ♻️ LOOP DETECTED
```

**Impact:** Shared module can import server code, server imports shared code → circular dependency

---

### Circular Dependency #2: Root Config Misleading Paths

```
┌─────────────────────────────────────────────────────────────┐
│   tsconfig.json (ROOT)                                      │
│   ┌─────────────────────────────────────────────────┐      │
│   │ "@shared/core": ["server/infrastructure/core"]  │      │
│   │ "@shared/core/*": ["server/infrastructure/core/*"]│    │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   This maps @shared/core → server code!                    │
│   Violates the "shared" concept                            │
└─────────────────────────────────────────────────────────────┘

When code imports:
  import { something } from '@shared/core'
  
It actually gets:
  server/infrastructure/core/something
  
This is MISLEADING and creates confusion!
```

---

### Circular Dependency #3: Server → Client (Unnecessary)

```
┌─────────────────────────────────────────────────────────────┐
│   server/tsconfig.json                                      │
│   ┌─────────────────────────────────────────────────┐      │
│   │ "@client": ["../client/src"]                    │      │
│   │ "@client/*": ["../client/src/*"]                │      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   Server should NEVER import from client!                  │
│   This violates clean architecture                         │
└─────────────────────────────────────────────────────────────┘
```

---

### Circular Dependency #4: tsconfig.server.json Chaos

```
┌─────────────────────────────────────────────────────────────┐
│   tsconfig.server.json (ALTERNATIVE CONFIG)                 │
│   ┌─────────────────────────────────────────────────┐      │
│   │ "@/*": ["./client/src/*"]                       │      │
│   │ "@/shared/*": ["./shared/*"]                    │      │
│   │ "@/features/*": ["./server/features/*"]         │      │
│   │ "@/infrastructure/*": ["./server/infrastructure/*"]│   │
│   │ "@shared/core": ["./server/infrastructure/core"]│      │
│   └─────────────────────────────────────────────────┘      │
│                                                             │
│   Problems:                                                 │
│   1. @ prefix points to CLIENT code from SERVER config     │
│   2. Mixes client, server, and shared in same namespace    │
│   3. Conflicts with other tsconfig files                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Complete Configuration Relationship Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ROOT LEVEL                                  │
│                                                                     │
│  tsconfig.json                    tsconfig.server.json              │
│  (orchestrator)                   (alternative - PROBLEMATIC)       │
│       │                                   │                         │
│       │ extends                           │ extends                 │
│       ↓                                   ↓                         │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                                                           │       │
│  │  References:                                              │       │
│  │  ├── client/                                              │       │
│  │  ├── server/                                              │       │
│  │  └── shared/                                              │       │
│  │                                                           │       │
│  └─────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ↓                  ↓                  ↓
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│   CLIENT      │  │   SERVER      │  │   SHARED      │
│               │  │               │  │               │
│ tsconfig.json │  │ tsconfig.json │  │ tsconfig.json │
│               │  │               │  │               │
│ extends root  │  │ extends root  │  │ extends root  │
│               │  │               │  │               │
│ references:   │  │ references:   │  │ references:   │
│   NONE        │  │   - shared    │  │   NONE        │
│               │  │               │  │               │
│ imports:      │  │ imports:      │  │ imports:      │
│ ✅ @shared    │  │ ✅ @shared    │  │ ❌ @server    │
│ ❌ @workspace │  │ ❌ @client    │  │ ❌ @client    │
│   (duplicate) │  │   (wrong!)    │  │   (wrong!)    │
└───────────────┘  └───────────────┘  └───────────────┘
```

---

## 🎯 Correct Dependency Flow (Target State)

```
┌─────────────────────────────────────────────────────────────┐
│                    CORRECT ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐
│     CLIENT      │  UI Layer
│  (React, UI)    │  - Can import from SHARED only
└────────┬────────┘  - Cannot import from SERVER
         │
         │ imports
         ↓
┌─────────────────┐
│     SHARED      │  Common Layer
│ (Types, Utils)  │  - Cannot import from CLIENT or SERVER
└─────────────────┘  - Pure, reusable code
         ↑
         │ imports
         │
┌────────┴────────┐
│     SERVER      │  Backend Layer
│ (API, Database) │  - Can import from SHARED only
└─────────────────┘  - Cannot import from CLIENT

Rules:
✅ Client → Shared (allowed)
✅ Server → Shared (allowed)
❌ Shared → Client (forbidden)
❌ Shared → Server (forbidden)
❌ Client → Server (forbidden - use API)
❌ Server → Client (forbidden)
```

---

## 🔧 Fix Implementation Plan

### Step 1: Fix shared/tsconfig.json

```jsonc
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "paths": {
      // ✅ ONLY shared paths
      "@/*": ["./*"],
      "@shared": ["."],
      "@shared/*": ["./*"],
      "@shared/core": ["./core"],
      "@shared/core/*": ["./core/*"],
      "@shared/utils": ["./utils"],
      "@shared/utils/*": ["./utils/*"],
      
      // ❌ REMOVE ALL OF THESE:
      // "@server/infrastructure/database": ["./database"],
      // "@server/infrastructure/schema": ["./schema"],
      // "@server": ["../server"],
      // "@server/*": ["../server/*"],
      // "@client": ["../client/src"],
      // "@client/*": ["../client/src/*"],
    }
  },
  "include": ["**/*.ts", "**/*.d.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Step 2: Fix server/tsconfig.json

```jsonc
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": ".",
    "composite": true,
    "paths": {
      // ✅ Server paths
      "@/*": ["./*"],
      "@server": ["."],
      "@server/*": ["./*"],
      "@server/infrastructure/*": ["./infrastructure/*"],
      "@server/infrastructure/error-handling": ["./infrastructure/error-handling/index.ts"],
      "@server/infrastructure/error-handling/*": ["./infrastructure/error-handling/*"],
      "@server/infrastructure/observability": ["./infrastructure/observability/index.ts"],
      "@server/infrastructure/observability/*": ["./infrastructure/observability/*"],
      "@server/infrastructure/schema/*": ["./infrastructure/schema/*"],
      "@server/infrastructure/database/*": ["./infrastructure/database/*"],
      "@server/infrastructure/core/*": ["./infrastructure/core/*"],
      "@server/features/*": ["./features/*"],
      
      // ✅ Shared imports (allowed)
      "@shared/*": ["../shared/*"],
      "@shared/constants": ["../shared/constants"],
      "@shared/constants/*": ["../shared/constants/*"],
      
      // ❌ REMOVE ALL OF THESE:
      // "@client": ["../client/src"],
      // "@client/*": ["../client/src/*"],
      // "@tests": ["../tests"],
      // "@tests/*": ["../tests/*"],
    }
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": ["**/*.ts", "**/*.d.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Step 3: Fix root tsconfig.json

```jsonc
{
  "compilerOptions": {
    "paths": {
      // ✅ Keep shared paths
      "@shared": ["shared"],
      "@shared/*": ["shared/*"],
      "@shared/types": ["shared/types"],
      "@shared/types/*": ["shared/types/*"],
      "@shared/validation": ["shared/validation"],
      "@shared/validation/*": ["shared/validation/*"],
      "@shared/constants": ["shared/constants"],
      "@shared/constants/*": ["shared/constants/*"],
      
      // ❌ REMOVE THIS - it's misleading:
      // "@shared/core": ["server/infrastructure/core"],
      // "@shared/core/*": ["server/infrastructure/core/*"],
      
      // ✅ REPLACE WITH:
      "@server/core": ["server/infrastructure/core"],
      "@server/core/*": ["server/infrastructure/core/*"],
      
      // ... rest of paths
    }
  }
}
```

### Step 4: Fix client/tsconfig.json

```jsonc
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "paths": {
      // ✅ Use ONLY @client prefix (remove @ duplicate)
      "@client": ["./src"],
      "@client/*": ["./src/*"],
      
      // ✅ Shared imports (allowed)
      "@shared": ["../shared"],
      "@shared/*": ["../shared/*"],
      
      // ❌ REMOVE duplicate @workspace:
      // "@workspace": ["../shared"],
      // "@workspace/*": ["../shared/*"],
      
      // ❌ REMOVE root @ alias:
      // "@": ["./src"],
      // "@/*": ["./src/*"],
      
      // ... rest of client-specific paths using @client prefix
    }
  }
}
```

### Step 5: Delete or Fix tsconfig.server.json

**Option A: Delete it** (recommended if not actively used)
```bash
rm tsconfig.server.json
```

**Option B: Fix it** (if needed for specific tooling)
```jsonc
{
  "extends": "./server/tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "skipLibCheck": true,
    // Remove all path overrides - inherit from server/tsconfig.json
  },
  "include": ["server/**/*.ts", "server/**/*.d.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

---

## ✅ Validation Checklist

After applying fixes:

- [ ] Remove `@server` and `@client` paths from `shared/tsconfig.json`
- [ ] Remove `@client` paths from `server/tsconfig.json`
- [ ] Fix `@shared/core` → `@server/core` in root `tsconfig.json`
- [ ] Remove duplicate `@workspace` from `client/tsconfig.json`
- [ ] Remove duplicate `@` from `client/tsconfig.json`
- [ ] Delete or fix `tsconfig.server.json`
- [ ] Run `npx tsc --noEmit` - should pass
- [ ] Run `npx tsc --build --dry` - should show correct dependency order
- [ ] Run `npm run analyze:circular:check` - should pass
- [ ] Update import statements to use correct aliases
- [ ] Update documentation with correct import patterns

---

## 📝 Import Pattern Style Guide

After fixes, use these patterns:

```typescript
// ✅ CORRECT PATTERNS

// Client code importing shared
import { User } from '@shared/types/user';
import { API_BASE_URL } from '@shared/constants';

// Client code importing from client
import { Button } from '@client/lib/ui/Button';
import { useAuth } from '@client/core/auth';

// Server code importing shared
import { User } from '@shared/types/user';
import { validateEmail } from '@shared/validation';

// Server code importing from server
import { db } from '@server/infrastructure/database';
import { UserService } from '@server/features/users';

// ❌ INCORRECT PATTERNS

// Don't use duplicate aliases
import { User } from '@workspace/types/user'; // Use @shared
import { Button } from '@/lib/ui/Button'; // Use @client

// Don't cross boundaries
import { db } from '@server/infrastructure/database'; // In client code - WRONG!
import { Button } from '@client/lib/ui/Button'; // In server code - WRONG!
import { UserService } from '@server/features/users'; // In shared code - WRONG!
```

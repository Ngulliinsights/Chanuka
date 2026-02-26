# Shared, Client, and Server Boundaries

## Overview

This document defines clear boundaries for what code belongs in the `shared/`, `client/`, and `server/` directories. Following these guidelines prevents architectural violations and maintains clean separation of concerns.

**Last Updated**: 2026-02-26  
**Spec**: Client Infrastructure Consolidation (Task 11.3)

---

## Quick Reference

| Layer | Purpose | Can Import From | Cannot Import From |
|-------|---------|------------------|-------------------|
| **Shared** | Code used by both client and server | Nothing (self-contained) | client/, server/ |
| **Client** | Browser-only code | shared/ | server/ |
| **Server** | Node.js-only code | shared/ | client/ |

---

## Shared Layer (`shared/`)

### What Belongs Here

✅ **Types and Interfaces**
- Domain types (User, Bill, Comment, etc.)
- API contracts and DTOs
- Database types
- Branded types and primitives
- Enums and constants

✅ **Pure Utilities**
- String manipulation (no I/O)
- Number formatting (no I/O)
- Date/time formatting (no I/O)
- Type guards and validators
- Regex patterns

✅ **Validation Schemas**
- Zod schemas
- Domain validators (email, password, etc.)
- Validation error types

✅ **Constants**
- Error codes
- Feature flags
- Limits and thresholds
- Platform-specific constants (Kenya)

✅ **Internationalization**
- Translation keys
- Locale data
- i18n utilities

### What Does NOT Belong Here

❌ **Server-Only Code**
- Express middleware
- Database queries
- Server configuration
- Node.js-specific APIs (fs, path, crypto)
- Logging infrastructure (pino)
- Caching infrastructure (Redis)

❌ **Client-Only Code**
- React components
- Browser APIs (window, document, localStorage)
- Redux store configuration
- Client-side routing
- UI state management

❌ **Infrastructure**
- Observability (monitoring, telemetry)
- Error handling services
- API clients
- WebSocket clients
- Authentication services

### Shared Layer Structure

```
shared/
├── types/                    # Domain types, API contracts
│   ├── core/                 # Branded types, enums, base types
│   ├── domains/              # User, Bill, Comment, etc.
│   ├── api/                  # API request/response types
│   └── database/             # Database types
├── constants/                # Shared constants
│   ├── error-codes.ts
│   ├── limits.ts
│   └── feature-flags.ts
├── validation/               # Validation schemas and validators
│   ├── schemas/              # Zod schemas
│   ├── validators/           # Domain validators
│   └── errors.ts
├── core/
│   ├── primitives/           # Result, Maybe, branded types
│   └── utils/                # Pure utility functions
│       ├── string-utils.ts
│       ├── number-utils.ts
│       ├── regex-patterns.ts
│       ├── formatting/
│       ├── type-guards.ts
│       ├── security-utils.ts  # Sanitization only
│       ├── common-utils.ts
│       ├── data-utils.ts
│       └── async-utils.ts
├── i18n/                     # Translations
└── platform/                 # Kenya-specific constants
```

---

## Client Layer (`client/`)

### What Belongs Here

✅ **UI Components**
- React components
- Component libraries
- UI utilities

✅ **Client Infrastructure**
- Redux store and slices
- API client (HTTP, WebSocket)
- Client-side observability
- Client-side error handling
- Client-side logging
- Browser storage utilities
- Client-side routing

✅ **Browser-Specific Code**
- DOM manipulation
- Browser APIs (window, document, localStorage, sessionStorage)
- Service workers
- Web workers
- IndexedDB

✅ **Client State Management**
- Redux slices
- React context
- Local component state

### What Does NOT Belong Here

❌ **Server-Only Code**
- Express middleware
- Database queries
- Server configuration
- Node.js-specific APIs

❌ **Shared Code**
- Types that should be in shared/
- Utilities that could be used by server
- Validation schemas (should be in shared/)

### Client Layer Structure

```
client/
├── src/
│   ├── components/           # React components
│   ├── pages/                # Page components
│   ├── infrastructure/       # Client infrastructure
│   │   ├── store/            # Redux store and slices
│   │   ├── api/              # API client (HTTP, WebSocket, realtime)
│   │   ├── observability/    # Client observability
│   │   ├── logging/          # Client logging
│   │   ├── error/            # Client error handling
│   │   ├── auth/             # Client auth
│   │   ├── storage/          # Browser storage
│   │   └── ...
│   ├── hooks/                # React hooks
│   ├── utils/                # Client-specific utilities
│   └── lib/                  # Client libraries
└── public/                   # Static assets
```

---

## Server Layer (`server/`)

### What Belongs Here

✅ **API Endpoints**
- Express routes
- Route handlers
- Middleware

✅ **Server Infrastructure**
- Database queries and ORM
- Server-side observability (pino)
- Server-side error handling
- Server-side logging
- Caching (Redis)
- Authentication services
- Authorization middleware

✅ **Node.js-Specific Code**
- File system operations
- Process management
- Server configuration
- Environment variables
- Crypto operations

✅ **Business Logic**
- Service layer
- Domain logic
- Data transformations
- Background jobs

### What Does NOT Belong Here

❌ **Client-Only Code**
- React components
- Browser APIs
- Client-side routing
- Redux store

❌ **Shared Code**
- Types that should be in shared/
- Utilities that could be used by client
- Validation schemas (should be in shared/)

### Server Layer Structure

```
server/
├── src/
│   ├── api/                  # API routes and handlers
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── controllers/
│   ├── infrastructure/       # Server infrastructure
│   │   ├── database/         # Database queries, ORM
│   │   ├── observability/    # Server observability (pino)
│   │   ├── logging/          # Server logging
│   │   ├── error/            # Server error handling
│   │   ├── caching/          # Redis caching
│   │   ├── auth/             # Server auth
│   │   ├── validation/       # Validation middleware
│   │   └── ...
│   ├── services/             # Business logic
│   ├── utils/                # Server-specific utilities
│   └── config/               # Server configuration
└── scripts/                  # Server scripts (seeds, migrations)
```

---

## Import Rules

### Shared Layer

```typescript
// ✅ ALLOWED - Internal shared imports
import { User } from '@shared/types/domains/user';
import { formatDate } from '@shared/core/utils/formatting/date-time';

// ❌ FORBIDDEN - Cannot import from client or server
import { useAuth } from '@client/hooks/useAuth';  // ❌
import { logger } from '@server/infrastructure/logging';  // ❌
```

### Client Layer

```typescript
// ✅ ALLOWED - Import from shared
import { User } from '@shared/types/domains/user';
import { formatDate } from '@shared/core/utils/formatting/date-time';

// ✅ ALLOWED - Internal client imports
import { useAuth } from '@client/hooks/useAuth';
import { store } from '@client/infrastructure/store';

// ❌ FORBIDDEN - Cannot import from server
import { logger } from '@server/infrastructure/logging';  // ❌
import { db } from '@server/infrastructure/database';  // ❌
```

### Server Layer

```typescript
// ✅ ALLOWED - Import from shared
import { User } from '@shared/types/domains/user';
import { formatDate } from '@shared/core/utils/formatting/date-time';

// ✅ ALLOWED - Internal server imports
import { logger } from '@server/infrastructure/logging';
import { db } from '@server/infrastructure/database';

// ❌ FORBIDDEN - Cannot import from client
import { useAuth } from '@client/hooks/useAuth';  // ❌
import { store } from '@client/infrastructure/store';  // ❌
```

---

## Decision Tree

### "Where should this code go?"

```
START: I have some code to write

├─ Does it use React, browser APIs, or client state?
│  └─ YES → Put it in client/
│
├─ Does it use Express, database, or Node.js APIs?
│  └─ YES → Put it in server/
│
├─ Is it a type, interface, or constant?
│  └─ YES → Put it in shared/types/ or shared/constants/
│
├─ Is it a pure utility function (no I/O, no side effects)?
│  └─ YES → Put it in shared/core/utils/
│
├─ Is it a validation schema or validator?
│  └─ YES → Put it in shared/validation/
│
└─ Is it infrastructure (logging, error handling, API client)?
   ├─ Used by client only? → Put it in client/infrastructure/
   ├─ Used by server only? → Put it in server/infrastructure/
   └─ Used by both? → Create interfaces in shared/, implementations in client/ and server/
```

---

## Common Mistakes

### ❌ Mistake 1: Putting Infrastructure in Shared

```typescript
// ❌ BAD - shared/core/observability/logger.ts
import pino from 'pino';  // Server-only dependency!

export const logger = pino();
```

**Fix**: Move to `server/infrastructure/observability/logger.ts`

---

### ❌ Mistake 2: Putting Types in Client or Server

```typescript
// ❌ BAD - client/src/types/user.ts
export interface User {
  id: string;
  name: string;
}
```

**Fix**: Move to `shared/types/domains/user.ts` (both client and server need this)

---

### ❌ Mistake 3: Putting Validation Middleware in Shared

```typescript
// ❌ BAD - shared/validation/middleware.ts
import { Request, Response, NextFunction } from 'express';  // Server-only!

export const validateSchema = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // ...
  };
};
```

**Fix**: Move to `server/infrastructure/validation/middleware/`

---

### ❌ Mistake 4: Duplicating Utilities

```typescript
// ❌ BAD - Same utility in multiple places
// client/src/utils/format-date.ts
// server/src/utils/format-date.ts
```

**Fix**: Move to `shared/core/utils/formatting/date-time.ts`

---

## Enforcement

### ESLint Rules

```javascript
// client/.eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '@server/*',  // Client cannot import from server
          'express',    // Client cannot use Express
          'pino',       // Client cannot use pino
          'redis',      // Client cannot use Redis
        ]
      }
    ]
  }
};

// server/.eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '@client/*',  // Server cannot import from client
          'react',      // Server cannot use React
          'react-dom',  // Server cannot use React DOM
        ]
      }
    ]
  }
};

// shared/.eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          '@client/*',  // Shared cannot import from client
          '@server/*',  // Shared cannot import from server
          'express',    // Shared cannot use Express
          'react',      // Shared cannot use React
          'pino',       // Shared cannot use pino
          'redis',      // Shared cannot use Redis
        ]
      }
    ]
  }
};
```

### Dependency Cruiser Rules

```javascript
// .dependency-cruiser.js
module.exports = {
  forbidden: [
    {
      name: 'no-client-to-server',
      from: { path: '^client/' },
      to: { path: '^server/' },
      comment: 'Client code cannot import from server'
    },
    {
      name: 'no-server-to-client',
      from: { path: '^server/' },
      to: { path: '^client/' },
      comment: 'Server code cannot import from client'
    },
    {
      name: 'no-shared-to-client',
      from: { path: '^shared/' },
      to: { path: '^client/' },
      comment: 'Shared code cannot import from client'
    },
    {
      name: 'no-shared-to-server',
      from: { path: '^shared/' },
      to: { path: '^server/' },
      comment: 'Shared code cannot import from server'
    }
  ]
};
```

---

## Migration Checklist

When moving code between layers:

### Moving to Shared

- [ ] Remove all client-specific dependencies (React, browser APIs)
- [ ] Remove all server-specific dependencies (Express, database, Node.js APIs)
- [ ] Ensure code is pure (no side effects, no I/O)
- [ ] Update imports to use `@shared/` path
- [ ] Verify code works in both client and server contexts
- [ ] Update documentation

### Moving to Client

- [ ] Ensure code only uses browser APIs
- [ ] Update imports to use `@client/` path
- [ ] Remove from shared/ if no longer needed by server
- [ ] Verify server doesn't import this code
- [ ] Update documentation

### Moving to Server

- [ ] Ensure code only uses Node.js APIs
- [ ] Update imports to use `@server/` path
- [ ] Remove from shared/ if no longer needed by client
- [ ] Verify client doesn't import this code
- [ ] Update documentation

---

## Related Documentation

- `CLIENT_SAFE_UTILITIES.md` - List of client-safe utilities in shared/
- `BOUNDARY_FIX_PLAN.md` - Plan for fixing boundary violations
- `SHARED_LAYER_AUDIT.md` - Audit of server-only code in shared layer

---

## Summary

**Golden Rules:**

1. **Shared** = Types, constants, pure utilities, validation schemas
2. **Client** = React, browser APIs, client infrastructure
3. **Server** = Express, database, Node.js APIs, server infrastructure
4. **Never** import across client ↔ server boundaries
5. **Always** use shared/ for code needed by both

Following these rules ensures clean architecture, prevents circular dependencies, and maintains clear separation of concerns.

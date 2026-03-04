# Quick Reference & Setup Guide

**Extracted From:** README.md, QUICK_START.md, various setup guides  
**Purpose:** One-stop guide for setup, commands, and quick answers  
**For Questions About:** How to get started, common commands, where things are

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites

- **Node.js:** v18+ (check with `node --version`)
- **PNPM:** v8+ (install with `npm install -g pnpm`)

### One-Time Setup

```bash
# 1. Install all dependencies
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Set up database
pnpm db:push

# 4. Seed with test data
pnpm db:seed
```

### Start Development

```bash
pnpm dev
```

Visit:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:4200

---

## 📚 Key Commands

### Development

```bash
pnpm dev                    # Start both client & server
pnpm dev:client             # Client only (Vite)
pnpm dev:server             # Server only (Node)
pnpm dev:ws                 # Run WebSocket service
```

### Database

```bash
pnpm db:push                # Apply pending migrations
pnpm db:pull                # Pull schema from database
pnpm db:generate            # Generate migration
pnpm db:studio              # Open database UI (Drizzle)
pnpm db:seed                # Populate test data
```

### Testing

```bash
pnpm test                   # Run all tests
pnpm test:watch             # Watch mode
pnpm test:coverage          # Coverage report
pnpm test:ui                # UI test viewer
```

### Code Quality

```bash
pnpm lint                   # Check linting errors
pnpm format                 # Auto-format code
pnpm type-check             # TypeScript check
pnpm validate               # Full validation (lint + type + test)
```

### Build & Deployment

```bash
pnpm build                  # Build both client & server
pnpm build:client           # Client only
pnpm build:server           # Server only
pnpm start                  # Run production build
pnpm docker:build           # Build Docker images
pnpm docker:up              # Start Docker containers
```

---

## 🗂️ Where Things Are

### Core Folders

| Location | Purpose | When you need it |
|----------|---------|------------------|
| `client/src/` | React frontend | Building UI components |
| `server/features/` | Backend features | Implementing API endpoints |
| `shared/types/features/` | Shared types | Defining API contracts |
| `server/infrastructure/` | Database, auth, logging | Infrastructure setup |
| `docs/DCS/` | Architecture & standards | Understanding decisions |
| `tests/` | Integration tests | Testing features |
| `drizzle/` | Migrations | Database changes |

### Finding Things

```bash
# Find a file
find . -name "*.ts" -path "*bills*"

# Find a component
grep -r "export const BillList" client/

# Find where something is imported
grep -r "from 'shared/core/observability'" server/

# Find unused code
npx knip
```

---

## 🏗️ Project Architecture

```
Four-Layer Architecture:

HTTP Request
    ↓
[Routes] - HTTP endpoints, request validation
    ↓
[Service] - Business logic, caching, error handling
    ↓
[Repository] - Database queries using Drizzle ORM
    ↓
[Database] - PostgreSQL (Neon)
```

### Client Architecture

```
HTTP Response
    ↑
[React Components] - UI, forms, display
    ↑
[API Client] - HTTP requests to backend
    ↑
[State Management] - Redux + React Query
    ↑
[Backend]
```

---

## 🎯 Current Capabilities

### ✅ What's Working

- ✅ Bill tracking and full-text search
- ✅ User authentication with JWT
- ✅ Community comments and voting
- ✅ Constitutional analysis engine
- ✅ Real-time notifications via WebSocket
- ✅ Multi-language support (English & Swahili)
- ✅ Database migrations with Drizzle
- ✅ Error tracking and observability
- ✅ Caching layer (Redis + memory)
- ✅ Rate limiting and security middleware

### 🟡 In Progress

- 🟡 Client UI components for all features
- 🟡 WCAG AA accessibility (6-week effort)
- 🟡 Advanced argument intelligence
- 🟡 TypeScript error remediation (~5,000 errors)

### ❌ Critical Blockers

Deployment is blocked by:
- 747 missing input validations
- 51 SQL injection vulnerabilities
- 115 unbounded database queries
- 918 memory leak issues

See `docs/DCS/SECURITY_STATUS.md` for details.

---

## 🔧 Common Development Tasks

### Adding a New Feature

1. Create folder: `mkdir -p server/features/my-feature`
2. Create files:
   - `validation.ts` - Request schemas (Zod)
   - `types.ts` - Feature types
   - `repository.ts` - Database queries
   - `service.ts` - Business logic
   - `routes.ts` - HTTP endpoints
3. Add to `server/index.ts`:
   ```typescript
   import { setupMyFeatureRoutes } from './features/my-feature/routes';
   setupMyFeatureRoutes(app);
   ```
4. Create tests in `tests/features/my-feature/`
5. Create shared types in `shared/types/features/my-feature.ts`
6. Update `docs/MIGRATION_LOG.md`

### Adding Input Validation

```typescript
// server/features/my-feature/validation.ts
import { z } from 'zod';

export const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
});

export type CreateInput = z.infer<typeof createSchema>;
```

### Adding a Database Query

```typescript
// server/features/my-feature/repository.ts
import { db } from 'server/infrastructure/database';
import { myTable } from 'server/infrastructure/schema/my-feature';
import { eq } from 'drizzle-orm';

export async function getById(id: string) {
  const result = await db
    .select()
    .from(myTable)
    .where(eq(myTable.id, id))
    .limit(1);
  return result[0] || null;
}
```

### Adding Error Handling

```typescript
import { logger } from 'shared/core/observability';

try {
  const result = await operation();
  return res.json({ success: true, data: result });
} catch (error) {
  logger.error('Operation failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  return res.status(500).json({ success: false });
}
```

### Adding Tests

```typescript
// tests/features/my-feature/service.test.ts
import { describe, test, expect } from 'vitest';
import { MyService } from 'server/features/my-feature/service';

describe('MyService', () => {
  test('should create item', async () => {
    const service = new MyService();
    const result = await service.create({ title: 'Test' });
    expect(result.id).toBeDefined();
  });

  test('should reject invalid input', async () => {
    const service = new MyService();
    expect(() => service.create({ title: '' }))
      .toThrow('Title required');
  });
});
```

---

## 📍 Documentation Map

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Design decisions | Starting new features |
| [CORE_FEATURES.md](./CORE_FEATURES.md) | Feature definitions | Understanding scope |
| [SECURITY_STATUS.md](./SECURITY_STATUS.md) | Known issues | Troubleshooting |
| [DEVELOPMENT_WORKFLOW.md](./DEVELOPMENT_WORKFLOW.md) | How to contribute | Before making changes |
| `docs/CHANGELOG.md` | Change history | Understanding what changed |
| `docs/MIGRATION_LOG.md` | Active work tracking | Seeing who's doing what |
| `README.md` | Project overview | First time setup |

---

## 🐛 Troubleshooting

### "pnpm install" Fails

```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Database Connection Error

```bash
# Check .env has correct DATABASE_URL
cat .env | grep DATABASE_URL

# Verify database is running
pnpm db:studio  # Opens database browser
```

### TypeScript Errors

```bash
# Check all errors
npx tsc --noEmit

# See detailed errors
npx tsc --noEmit --pretty false
```

### WebSocket Connection Failed

```bash
# Verify WebSocket service is running
pnpm dev:ws

# Check backend is running on port 4200
curl http://localhost:4200/health
```

### Tests Failing

```bash
# Run single test with debugging
pnpm test my-feature -- --reporter=verbose

# Update snapshots if needed
pnpm test -- --update
```

---

## 📞 Getting Help

### I need to...

| Task | Location |
|------|----------|
| Understand the architecture | `docs/DCS/ARCHITECTURE.md` |
| Know what features exist | `docs/DCS/CORE_FEATURES.md` |
| Fix a security issue | `docs/DCS/SECURITY_STATUS.md` |
| Start a new feature | `docs/DCS/DEVELOPMENT_WORKFLOW.md` |
| Find something in the code | Use `grep` or IDE search |
| Track my work | Update `docs/MIGRATION_LOG.md` |
| Understand recent changes | See `docs/CHANGELOG.md` |
| Debug an issue | Enable logging in `server/infrastructure/logging/` |

---

## 🎓 Learning Path

### New to This Project?

1. Read `docs/DCS/QUICK_REFERENCE.md` (this file)
2. Read `docs/DCS/ARCHITECTURE.md` for structure
3. Run `pnpm dev` and explore the running app
4. Look at `server/features/bills/` as example
5. Pick a small task from the backlog

### Adding Your First Feature?

1. Read `docs/DCS/CORE_FEATURES.md` to pick a feature
2. Read `docs/DCS/DEVELOPMENT_WORKFLOW.md` before starting
3. Follow the "Adding a New Feature" section above
4. Update `docs/MIGRATION_LOG.md` with your work
5. Test everything before pushing

### Debugging Issues?

1. Check `docs/DCS/SECURITY_STATUS.md` for known issues
2. Look for error logs in `server/logs/`
3. Enable debug mode: `DEBUG=* pnpm dev`
4. Use database browser: `pnpm db:studio`
5. See `.env.example` for configuration options


# Chanuka Platform

A modern full-stack application built with React, Express, and PostgreSQL in a professional monorepo structure.

## 🚀 Quick Start

```bash
# Install PNPM globally
npm install -g pnpm

# Install dependencies
pnpm install

# Start development
pnpm dev
```

Visit:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:4200

## 📚 Documentation

- [📖 Full Documentation](./docs/README.md)
- [🏗️ Architecture Overview](./ARCHITECTURE.md) ← **Start here for module organization**
- [🏗️ Setup Guide](./docs/setup.md)
- [🔧 Monorepo Guide](./docs/monorepo.md)
- [🏛️ Architecture](./docs/architecture.md)
- [🔄 Migration Guides](./docs/migrations/)
  - [API Service Unification](./docs/migrations/api-service-unification.md)
  - [Logger Consolidation](./docs/migrations/logger-consolidation.md)
  - [Offline Detection Resolution](./docs/migrations/offline-detection-resolution.md)

## 🏗️ Structure

```
chanuka-platform/
├── client/          # React frontend (@chanuka/client)
├── server/          # Express backend (@chanuka/server)  
├── shared/          # Shared utilities (@shared)
│   ├── core/       # ⚠️ Mostly server infrastructure (see ARCHITECTURE.md)
│   ├── types/      # Shared type definitions
│   └── db/         # Database utilities
├── docs/           # Documentation
└── package.json    # Monorepo configuration
```

### ⚠️ Module Organization Note

The `shared/core/` module contains mostly **server-only infrastructure** (observability, caching, validation, middleware, performance, config). This is a legacy pattern—ideally these should be in `server/core/`, but refactoring would require updating 30+ imports.

**See [ARCHITECTURE.md](./ARCHITECTURE.md) for:**
- Detailed module breakdown
- What's "shared" vs "server-only"
- Guidelines for adding new code
- Future refactoring plans

## ⚡ Commands

```bash
pnpm dev           # Start all services
pnpm build         # Build all projects
pnpm test          # Test all projects
pnpm lint          # Lint all projects
```

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Query
- **Backend**: Express, TypeScript, Drizzle ORM
- **Database**: PostgreSQL
- **Monorepo**: PNPM + Nx
- **Testing**: Vitest, Playwright

## 📦 API Reference

### Core Services

```typescript
// Unified API Service
import { api, fetchWithFallback } from '@/services/apiService';

// Consolidated Logger
import { logger } from '@/utils/logger';

// Offline Detection Hook
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
```

### Import Patterns

- **API Services**: `import { api } from '@/services/apiService'`
- **Logger**: `import { logger } from '@/utils/logger'`
- **Offline Detection**: `import { useOfflineDetection } from '@/hooks/useOfflineDetection'`
- **Error Handling**: `import { createNetworkError } from '@/components/error'`

##  License

MIT

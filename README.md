# Chanuka Platform

A modern civic engagement platform built with React, Express, and PostgreSQL in a professional monorepo structure.

**Status**: 🚧 Pre-launch development phase

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

## 🎯 Platform Status

**Current Phase**: Pre-launch development  
**Target Launch**: Q2 2026

> **Understanding Status:** This platform uses three separate status dimensions: Code Health (engineering quality), Feature Completeness (user-facing functionality), and Launch Readiness (platform-wide). See [docs/STATUS_VOCABULARY.md](./docs/STATUS_VOCABULARY.md) for definitions.

### What's Working Today
- ✅ Bill tracking and search
- ✅ User authentication and profiles
- ✅ Community comments and voting
- 🟡 Constitutional analysis (provision matching works, needs ML training)
- ✅ Multi-language support (English & Swahili)
- ✅ Real-time notifications

### In Active Development
- 🟡 WCAG AA accessibility compliance (6-week plan)
- 🟡 Advanced argument intelligence
- 🟡 Electoral accountability features
- 🟡 TypeScript error remediation (~5,000 errors)

### Planned Features
- 📋 Weighted representation system
- 📋 Media integration
- 📋 Coalition builder UI
- 📋 Mobile optimization

See [CURRENT_CAPABILITIES.md](./CURRENT_CAPABILITIES.md) for detailed feature status.

## 🌍 Language Support

- ✅ **English** - Full support
- ✅ **Kiswahili** - Full support (200+ strings translated)
- 🟡 Native speaker validation in progress

## ♿ Accessibility

- 🟡 **WCAG AA Compliance** - In progress (6-week implementation plan)
- Target: April 2026
- See [WCAG_ACCESSIBILITY_AUDIT.md](./WCAG_ACCESSIBILITY_AUDIT.md) for details

## 📚 Documentation

**Start Here**:
- [📋 Documentation Index](./DOCUMENTATION_INDEX.md) ← **Complete guide to all docs**
- [🏗️ Architecture Overview](./ARCHITECTURE.md) ← **Module organization**
- [✅ Current Capabilities](./CURRENT_CAPABILITIES.md) ← **What actually works today**

**Detailed Guides**:
- [📖 Full Documentation](./docs/README.md)
- [🏗️ Setup Guide](./docs/guides/setup.md)
- [🔧 Monorepo Guide](./docs/monorepo.md)
- [🏛️ Technical Architecture](./docs/technical/architecture.md)
- [🔄 Migration Guides](./docs/migrations/)
  - [API Service Unification](./docs/migrations/api-service-unification.md)
  - [Logger Consolidation](./docs/migrations/logger-consolidation.md)
  - [Offline Detection Resolution](./docs/migrations/offline-detection-resolution.md)

**Strategic Analysis**:
- [📊 Strategic Documentation Analysis](./STRATEGIC_DOCUMENTATION_ANALYSIS.md)
- [🔍 Comprehensive Codebase Audit](./COMPREHENSIVE_CODEBASE_AUDIT.md)
- [⚖️ Ambition vs Reality Audit](./CODEBASE_AMBITION_VS_REALITY_AUDIT.md)

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

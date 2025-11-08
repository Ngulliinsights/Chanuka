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
- [🏗️ Setup Guide](./docs/setup.md)
- [🔧 Monorepo Guide](./docs/monorepo.md)
- [🏛️ Architecture](./docs/architecture.md)

## 🏗️ Structure

```
chanuka-platform/
├── client/          # React frontend (@chanuka/client)
├── server/          # Express backend (@chanuka/server)  
├── shared/          # Shared utilities (@chanuka/shared)
├── docs/           # Documentation
└── package.json    # Monorepo configuration
```

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

## 📄 License

MIT
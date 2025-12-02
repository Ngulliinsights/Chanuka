# Chanuka Platform Documentation

## 📚 Documentation Index

### Getting Started
- [Setup Guide](./setup.md) - Installation and development setup
- [Architecture](./architecture.md) - System architecture overview
- [Contributing](./contributing.md) - Development guidelines

### Development
- [Monorepo Guide](./monorepo.md) - Working with the monorepo structure
- [Configuration Assessment](./configuration-assessment.md) - Configuration cleanup & consistency

### Platform Consolidation
- [Platform Consolidation Design](./chanuka/design.md) - Technical design specification for platform consolidation
- [Consolidation Implementation Tasks](./chanuka/%23%20Chanuka%20Platform%20Consolidation%20Impleme.md) - Detailed implementation tasks for platform consolidation
- [User Component Consolidation Architecture](./user-component-consolidation-architecture.md) - Component consolidation strategy

### Project Information
- [Project Structure](./project-structure.md) - Codebase organization
- [Cleanup Summary](../DOCUMENTATION_CLEANUP_SUMMARY.md) - Recent improvements

## 🚀 Quick Start

```bash
# Install PNPM globally
npm install -g pnpm

# Install dependencies
pnpm install

# Start development
pnpm dev
```

## 🏗️ Project Structure

```
chanuka-platform/
├── client/          # React frontend
├── server/          # Express backend  
├── shared/          # Shared utilities
└── docs/           # Documentation
```
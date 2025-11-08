# Setup Guide

## Prerequisites

- **Node.js** 18+ 
- **PNPM** (package manager)
- **Git**

## Installation

### 1. Install PNPM
```bash
npm install -g pnpm
```

### 2. Clone & Install
```bash
git clone <repository-url>
cd chanuka-platform
pnpm install
```

### 3. Environment Setup
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 4. Database Setup
```bash
pnpm db:migrate
pnpm db:seed
```

## Development

### Start All Services
```bash
pnpm dev
```

This starts:
- **Client**: http://localhost:5173
- **Server**: http://localhost:4200

### Start Individual Services
```bash
pnpm dev:client    # Frontend only
pnpm dev:server    # Backend only
```

## Building

```bash
pnpm build         # Build all projects
pnpm build:client  # Build frontend only
pnpm build:server  # Build backend only
```

## Testing

```bash
pnpm test          # Test all projects
pnpm test:client   # Test frontend only
pnpm test:server   # Test backend only
pnpm test:e2e      # End-to-end tests
```

## Linting

```bash
pnpm lint          # Lint all projects
pnpm lint:client   # Lint frontend only
pnpm lint:server   # Lint backend only
```

## Troubleshooting

### Common Issues

**PNPM not found**
```bash
npm install -g pnpm
```

**Port conflicts**
```bash
# Kill processes on ports
lsof -ti:5173 | xargs kill -9
lsof -ti:4200 | xargs kill -9
```

**Database connection issues**
```bash
pnpm db:health     # Check database connection
```

**Cache issues**
```bash
pnpm store prune   # Clean PNPM cache
nx reset           # Reset Nx cache
```
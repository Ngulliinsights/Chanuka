# Project Structure

This document outlines the reorganized project structure for better maintainability and development experience.

## Root Directory Structure

```
├── client/                 # Frontend React application
├── server/                 # Backend Express.js application
├── shared/                 # Shared types and utilities
├── db/                     # Database configuration and seeds
├── drizzle/               # Database migrations
├── config/                # Configuration files
├── scripts/               # Development and maintenance scripts
├── docs/                  # Documentation
├── tools/                 # Development tools
└── attached_assets/       # Project assets and documentation
```

## Detailed Structure

### `/config/`
Configuration files for development tools:
- `jest.config.js` - Jest testing configuration
- `jest.client.config.js` - Client-side Jest configuration
- `postcss.config.js` - PostCSS configuration for Tailwind

### `/scripts/`
Development and maintenance scripts organized by purpose:

#### `/scripts/database/`
Database-related scripts:
- `migrate.ts` - Database migration runner
- `generate-migration.ts` - Migration generator
- `setup-schema.ts` - Schema setup utility
- `check-schema.ts` - Schema validation
- `debug-migration-table.ts` - Migration debugging
- `run-migrations.ts` - Migration execution

#### `/scripts/testing/`
Testing utilities and test files:
- Various test files moved from root and server directories
- Verification scripts for different system components

### `/docs/`
Project documentation organized by type:

#### `/docs/summaries/`
Implementation and completion summaries:
- All `*_SUMMARY.md` files
- Phase completion summaries
- Route test summaries

#### `/docs/analysis/`
Code and system analysis documents:
- API analysis reports
- Dependency audit results
- Schema congruence progress
- Performance analysis

#### `/docs/guides/`
User and developer guides:
- Database setup guide
- Deployment guides
- Navigation user guide
- Troubleshooting guide
- Demo mode configuration

## Key Changes Made

1. **Moved configuration files** from root to `/config/` directory
2. **Organized scripts** into `/scripts/database/` and `/scripts/testing/`
3. **Consolidated documentation** into `/docs/` with proper categorization
4. **Updated package.json scripts** to reference new file locations
5. **Updated Jest configuration** to work with new directory structure

### `/server/` - Backend Architecture (Reorganized)
The server has been restructured following Domain-Driven Design principles:

#### `/server/core/`
Core business logic and shared utilities:
- `/auth/` - Authentication and authorization services
- `/validation/` - Data validation and input sanitization  
- `/errors/` - Error handling and tracking
- `types.ts` - Shared TypeScript types
- `index.ts` - Main routes index

#### `/server/features/`
Feature-specific domains with co-located routes, services, and storage:
- `/bills/` - Legislative bill management and tracking
- `/users/` - User management and profiles
- `/analytics/` - Analytics, reporting, and transparency
- `/admin/` - Administrative functionality
- `/community/` - Community and social features
- `/security/` - Security-specific features

#### `/server/infrastructure/`
Infrastructure services and external concerns:
- `/database/` - Database services and storage
- `/cache/` - Caching services
- `/monitoring/` - Monitoring and observability
- `/notifications/` - Notification and communication services

#### `/server/middleware/`
Cross-cutting concerns (unchanged):
- Authentication, error handling, rate limiting, security

## Benefits

- **Cleaner root directory** with only essential files
- **Better organization** of related files by domain
- **Domain-Driven Design** for server architecture
- **Easier navigation** for developers
- **Improved maintainability** with logical grouping
- **Scalable architecture** ready for microservices
- **Clear separation of concerns** between layers
- **No breaking changes** to core functionality

## Usage

All existing npm scripts continue to work as before:
- `npm run test` - Run tests with updated Jest config
- `npm run db:migrate` - Run database migrations from new location
- `npm run db:generate` - Generate new migrations

The reorganization maintains all existing functionality while providing a much cleaner, more maintainable, and scalable project structure. See `docs/SERVER_ARCHITECTURE.md` for detailed server architecture documentation.
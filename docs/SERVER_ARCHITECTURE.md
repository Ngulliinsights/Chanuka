# Server Architecture Documentation

This document outlines the reorganized server architecture following Domain-Driven Design (DDD) principles for better maintainability, scalability, and developer experience.

## Architecture Overview

The server is now organized into four main layers:

```
server/
├── core/                   # Core business logic and shared utilities
├── features/              # Feature-specific domains
├── infrastructure/        # Infrastructure services and external concerns
└── middleware/           # Cross-cutting concerns
```

## Core Layer (`/server/core/`)

Contains fundamental business logic and shared utilities that are used across multiple features.

### `/core/auth/`
Authentication and authorization services:
- `auth.ts` - Main authentication router
- `auth-central.ts` - Centralized auth service
- `auth-service.ts` - Core auth business logic
- `passwordReset.ts` - Password reset functionality
- `secure-session-service.ts` - Session management
- `session-cleanup.ts` - Session cleanup utilities

### `/core/validation/`
Data validation and input sanitization:
- `data-validation-service.ts` - Core validation logic
- `input-validation-service.ts` - Input sanitization
- `data-completeness.ts` - Data integrity checks

### `/core/errors/`
Error handling and tracking:
- `error-tracker.ts` - Error logging and tracking

### Core Files
- `types.ts` - Shared TypeScript types
- `StorageTypes.ts` - Storage-related type definitions
- `index.ts` - Main routes index
- `schema.js` - Database schema definitions

## Features Layer (`/server/features/`)

Organized by business domains, each containing routes, services, and storage specific to that feature.

### `/features/bills/`
Legislative bill management and tracking:

**Routes:**
- `bills.ts` - Main bills API
- `sponsorship.ts` - Bill sponsorship management
- `sponsors.ts` - Sponsor information
- `bill-tracking.ts` - Bill status tracking
- `real-time-tracking.ts` - Real-time updates
- `voting-pattern-analysis.ts` - Voting analysis
- `sponsor-conflict-analysis.ts` - Conflict detection

**Services:**
- `bill-service.ts` - Core bill business logic
- `bill-tracking.ts` - Tracking functionality
- `bill-status-monitor.ts` - Status monitoring
- `sponsor-service.ts` - Sponsor management
- `sponsorship-analysis.ts` - Analysis services
- `voting-pattern-analysis.ts` - Voting patterns
- `real-time-analysis.ts` - Real-time processing

**Storage:**
- `bill-storage.ts` - Bill data persistence
- `legislative-storage.ts` - Legislative data
- `LegislativeStorageTypes.ts` - Type definitions

### `/features/users/`
User management and profiles:

**Routes:**
- `users.ts` - User management API
- `profile.ts` - User profiles
- `verification.ts` - User verification
- `alert-preferences.ts` - User preferences

**Services:**
- `user-management.ts` - User CRUD operations
- `user-profile.ts` - Profile management
- `user-preferences.ts` - Preference handling
- `citizen-verification.ts` - Citizen verification
- `ExpertVerificationService.ts` - Expert verification
- `alert-preference.ts` - Alert preferences
- `advanced-alert-preferences.ts` - Advanced preferences

**Storage:**
- `user-storage.ts` - User data persistence

### `/features/analytics/`
Analytics, reporting, and transparency:

**Routes:**
- `analytics.ts` - Analytics API
- `engagement-analytics.ts` - User engagement
- `transparency-dashboard.ts` - Transparency reporting
- `analysis.ts` - General analysis
- `financial-disclosure.ts` - Financial reporting
- `financial-disclosure-integration.ts` - Integration services

**Services:**
- `engagement-analytics.ts` - Engagement tracking
- `transparency-dashboard.ts` - Dashboard logic
- `dashboard.ts` - General dashboard
- `legal-analysis.ts` - Legal analysis
- `ml-analysis.ts` - Machine learning analysis
- `conflict-detection.ts` - Conflict detection
- `financial-disclosure-*.ts` - Financial services

### `/features/admin/`
Administrative functionality:

**Routes:**
- `admin.ts` - Admin panel API
- `moderation.ts` - Content moderation
- `system.ts` - System management

**Services:**
- `admin.ts` - Admin business logic
- `content-moderation.ts` - Moderation services

### `/features/community/`
Community and social features:

**Routes:**
- `community.ts` - Community API

**Services:**
- `comment.ts` - Comment system
- `comment-voting.ts` - Comment voting
- `social-integration.ts` - Social features

**Storage:**
- `comment-storage.ts` - Comment persistence
- `stakeholder-storage.ts` - Stakeholder data
- `social-share-storage.ts` - Social sharing

### `/features/security/`
Security-specific features:

**Routes:**
- `security-monitoring.ts` - Security monitoring API

**Services:**
- `security-audit-service.ts` - Security auditing
- `security-monitoring-service.ts` - Monitoring
- `intrusion-detection-service.ts` - Threat detection
- `privacy-service.ts` - Privacy controls
- `encryption-service.ts` - Encryption utilities
- `tls-config-service.ts` - TLS configuration

### Shared Feature Files
- `search.ts` - Search functionality
- `search-service.ts` - Search business logic
- `search-index-manager.ts` - Search indexing
- `search-suggestions.ts` - Search suggestions
- `recommendation.ts` - Recommendation engine
- `sidebar.tsx` - Sidebar component

## Infrastructure Layer (`/server/infrastructure/`)

External services, databases, caching, monitoring, and other infrastructure concerns.

### `/infrastructure/database/`
Database services and storage:
- `database-service.ts` - Core database service
- `database-optimization.ts` - Performance optimization
- `connection-pool.ts` - Connection management
- `migration-service.ts` - Database migrations
- `storage.ts` - Storage abstraction
- `unified-storage.ts` - Unified storage interface
- `base/` - Base storage classes
- `config.ts` - Database configuration
- `schema.sql` - SQL schema definitions

### `/infrastructure/cache/`
Caching services:
- `cache.ts` - Cache router and service
- `cache-warming.ts` - Cache warming strategies
- `advanced-caching.ts` - Advanced caching logic

### `/infrastructure/monitoring/`
Monitoring and observability:
- `monitoring.ts` - Monitoring service and router
- `health.ts` - Health check endpoints
- `performance-monitor.ts` - Performance tracking
- `system-health.ts` - System health monitoring
- `audit-log.ts` - Audit logging
- `apm-service.ts` - Application performance monitoring
- `db-tracer.ts` - Database query tracing

### `/infrastructure/notifications/`
Notification and communication services:
- `notifications.ts` - Notification router
- `notification-service.ts` - Core notification logic
- `notification-scheduler.ts` - Scheduled notifications
- `email-service.ts` - Email services
- `enhanced-notification.ts` - Advanced notifications
- `smart-notification-filter.ts` - Intelligent filtering
- `alerting-service.ts` - Alert management

### Infrastructure Utilities
- `websocket.ts` - WebSocket service
- `demo-data.ts` - Demo data generation

## Middleware Layer (`/server/middleware/`)

Cross-cutting concerns that apply across multiple features:
- `auth.ts` - Authentication middleware
- `error-handler.ts` - Global error handling
- `rate-limiter.ts` - Rate limiting
- `request-logger.ts` - Request logging
- `security-middleware.ts` - Security headers
- `security-monitoring-middleware.ts` - Security monitoring

## Benefits of This Architecture

### 1. **Domain Separation**
- Clear boundaries between business domains
- Reduced coupling between features
- Easier to understand and maintain

### 2. **Scalability**
- Features can be developed independently
- Easy to extract features into microservices later
- Clear dependency management

### 3. **Maintainability**
- Related code is co-located
- Easier to find and modify functionality
- Reduced cognitive load for developers

### 4. **Testing**
- Features can be tested in isolation
- Clear boundaries for unit and integration tests
- Easier to mock dependencies

### 5. **Team Collaboration**
- Teams can own specific feature domains
- Reduced merge conflicts
- Clear ownership boundaries

## Import Patterns

Each feature domain has an `index.ts` file that exports all public APIs:

```typescript
// Import from bills feature
import { BillService, billsRouter } from '../features/bills';

// Import from infrastructure
import { DatabaseService } from '../infrastructure/database';

// Import from core
import { AuthService } from '../core/auth';
```

## Migration Guide

When working with the new structure:

1. **Finding Files**: Use the domain-based organization to locate functionality
2. **Adding Features**: Place new features in the appropriate domain folder
3. **Cross-Domain Dependencies**: Import through the index files
4. **Infrastructure Changes**: Place in the infrastructure layer
5. **Core Utilities**: Add to the core layer if used across multiple domains

This architecture provides a solid foundation for scaling the application while maintaining clean separation of concerns and excellent developer experience.
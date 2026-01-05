# Optimal Project Structure for Legislative Engagement Platform

## Overview

Based on the comprehensive schema analysis, this document outlines the optimal project structure for building a legislative engagement application using the provided database schemas.

## Architecture Philosophy

### Domain-Driven Structure
The project structure mirrors the schema domains, ensuring clear separation of concerns and maintainable code organization.

### Microservices-Ready
Modular architecture allows for independent scaling and deployment of different system components.

### Type Safety First
Full TypeScript implementation with shared type definitions across all applications.

## Project Structure

```
legislative-platform/
├── apps/
│   ├── web/                          # Next.js/React frontend
│   │   ├── src/
│   │   │   ├── app/                  # App router (Next.js 13+)
│   │   │   │   ├── (auth)/           # Authentication routes
│   │   │   │   ├── bills/            # Bill browsing and details
│   │   │   │   ├── dashboard/        # User dashboard
│   │   │   │   ├── profile/          # User profile management
│   │   │   │   └── admin/            # Admin panel
│   │   │   ├── components/           # React components
│   │   │   │   ├── bills/            # Bill-related components
│   │   │   │   ├── comments/         # Comment system
│   │   │   │   ├── layout/           # Layout components
│   │   │   │   └── ui/               # Reusable UI components
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   │   ├── useBills.ts       # Bill data hooks
│   │   │   │   ├── useComments.ts    # Comment system hooks
│   │   │   │   ├── useWebSocket.ts   # Real-time hooks
│   │   │   │   └── useAuth.ts        # Authentication hooks
│   │   │   ├── lib/                  # Client utilities
│   │   │   │   ├── api/              # API client
│   │   │   │   ├── utils/            # Utility functions
│   │   │   │   └── constants/        # Client constants
│   │   │   └── types/                # Client type definitions
│   │   ├── public/
│   │   ├── styles/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                          # API server (Node.js/Express)
│   │   ├── src/
│   │   │   ├── routes/               # API route handlers
│   │   │   │   ├── auth.routes.ts    # Authentication routes
│   │   │   │   ├── bills.routes.ts   # Bill management routes
│   │   │   │   ├── comments.routes.ts # Comment system routes
│   │   │   │   └── analytics.routes.ts # Analytics routes
│   │   │   ├── middleware/           # Express middleware
│   │   │   │   ├── auth.middleware.ts # Authentication
│   │   │   │   ├── rateLimit.middleware.ts # Rate limiting
│   │   │   │   └── validation.middleware.ts # Request validation
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── bill.service.ts   # Bill operations
│   │   │   │   ├── comment.service.ts # Comment operations
│   │   │   │   ├── user.service.ts   # User management
│   │   │   │   └── notification.service.ts # Notifications
│   │   │   ├── controllers/          # Request/response handling
│   │   │   │   ├── auth.controller.ts # Authentication logic
│   │   │   │   ├── bill.controller.ts # Bill controllers
│   │   │   │   └── comment.controller.ts # Comment controllers
│   │   │   └── utils/                # Server utilities
│   │   │       ├── validation.ts     # Validation utilities
│   │   │       ├── security.ts       # Security utilities
│   │   │       └── logger.ts         # Logging utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── websocket/                    # Real-time server
│   │   ├── src/
│   │   │   ├── handlers/             # Message handlers
│   │   │   │   ├── bill.handlers.ts  # Bill update handlers
│   │   │   │   ├── comment.handlers.ts # Comment handlers
│   │   │   │   ├── notification.handlers.ts # Notification handlers
│   │   │   │   └── system.handlers.ts # System handlers
│   │   │   ├── services/             # WebSocket services
│   │   │   │   ├── connection.service.ts # Connection management
│   │   │   │   ├── subscription.service.ts # Topic subscriptions
│   │   │   │   └── broadcast.service.ts # Message broadcasting
│   │   │   └── utils/                # WebSocket utilities
│   │   │       ├── auth.ts           # WebSocket authentication
│   │   │       ├── validation.ts     # Message validation
│   │   │       └── rateLimit.ts      # Rate limiting
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── worker/                       # Background job processor
│       ├── src/
│       │   ├── jobs/                 # Job definitions
│       │   │   ├── billSync.job.ts   # Bill synchronization
│       │   │   ├── analytics.job.ts  # Analytics processing
│       │   │   ├── notification.job.ts # Notification delivery
│       │   │   └── constitutionalAnalysis.job.ts # Constitutional analysis
│       │   ├── processors/           # Job processors
│       │   │   ├── sync.processor.ts # Data synchronization
│       │   │   ├── analysis.processor.ts # Analysis processing
│       │   │   └── notification.processor.ts # Notification processing
│       │   └── utils/                # Worker utilities
│       │       ├── queue.ts          # Queue configuration
│       │       └── scheduler.ts      # Job scheduling
│       ├── package.json
│       └── tsconfig.json
│
├── packages/                         # Shared packages
│   ├── database/                     # Database schema & migrations
│   │   ├── src/
│   │   │   ├── schemas/              # All schema files
│   │   │   │   ├── foundation.ts     # Core entities
│   │   │   │   ├── citizen_participation.ts # User engagement
│   │   │   │   ├── parliamentary_process.ts # Legislative process
│   │   │   │   ├── constitutional_intelligence.ts # Constitutional analysis
│   │   │   │   ├── platform_operations.ts # Analytics & metrics
│   │   │   │   ├── integrity_operations.ts # Security & moderation
│   │   │   │   ├── websocket.ts      # WebSocket types
│   │   │   │   └── enum.ts           # Shared enums
│   │   │   ├── migrations/           # Database migrations
│   │   │   │   ├── 001_initial.sql   # Initial schema
│   │   │   │   ├── 002_indexes.sql   # Performance indexes
│   │   │   │   └── 003_functions.sql # Database functions
│   │   │   ├── seeds/                # Seed data
│   │   │   │   ├── counties.ts       # Kenyan counties
│   │   │   │   ├── parties.ts        # Political parties
│   │   │   │   └── constitutional_provisions.ts # Constitution data
│   │   │   └── connection.ts         # Database connections
│   │   │       ├── operationalDb     # Main database
│   │   │       ├── analyticsDb       # Analytics database (future)
│   │   │       └── securityDb        # Security database (future)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── types/                        # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── api.types.ts          # API response types
│   │   │   ├── websocket.types.ts    # WebSocket message types
│   │   │   ├── database.types.ts     # Database entity types
│   │   │   └── index.ts              # Type exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── utils/                        # Shared utilities
│   │   ├── src/
│   │   │   ├── validation/           # Validation utilities
│   │   │   │   ├── schemas.ts        # Zod validation schemas
│   │   │   │   └── validators.ts     # Custom validators
│   │   │   ├── security/             # Security utilities
│   │   │   │   ├── encryption.ts     # Encryption helpers
│   │   │   │   └── hashing.ts        # Hashing utilities
│   │   │   ├── constants/            # Shared constants
│   │   │   │   ├── app.constants.ts  # App constants
│   │   │   │   └── error.constants.ts # Error codes
│   │   │   └── helpers/              # Helper functions
│   │   │       ├── date.ts           # Date utilities
│   │   │       └── format.ts         # Formatting utilities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                       # Configuration management
│       ├── src/
│       │   ├── database.config.ts    # Database configuration
│       │   ├── app.config.ts         # App configuration
│       │   ├── websocket.config.ts   # WebSocket configuration
│       │   └── environment.ts        # Environment variables
│       ├── package.json
│       └── tsconfig.json
│
├── infrastructure/                   # Infrastructure as Code
│   ├── docker/                       # Docker configurations
│   │   ├── Dockerfile.web           # Web app container
│   │   ├── Dockerfile.api           # API server container
│   │   ├── Dockerfile.websocket     # WebSocket server container
│   │   └── docker-compose.yml       # Local development
│   ├── kubernetes/                   # K8s manifests
│   │   ├── deployments/             # Deployment configs
│   │   ├── services/                # Service configs
│   │   └── configmaps/              # Configuration
│   ├── terraform/                    # Infrastructure provisioning
│   │   ├── main.tf                  # Main configuration
│   │   ├── variables.tf             # Variables
│   │   └── outputs.tf               # Outputs
│   └── scripts/                      # Deployment scripts
│       ├── deploy.sh                # Deployment script
│       ├── migrate.sh               # Migration script
│       └── seed.sh                  # Database seeding
│
├── tests/                           # Test suites
│   ├── unit/                        # Unit tests
│   │   ├── api/                     # API unit tests
│   │   ├── web/                     # Web app unit tests
│   │   └── websocket/               # WebSocket unit tests
│   ├── integration/                 # Integration tests
│   │   ├── api.integration.test.ts  # API integration tests
│   │   ├── database.integration.test.ts # Database tests
│   │   └── websocket.integration.test.ts # WebSocket tests
│   └── e2e/                         # End-to-end tests
│       ├── auth.e2e.test.ts         # Authentication tests
│       ├── bills.e2e.test.ts        # Bill management tests
│       └── comments.e2e.test.ts     # Comment system tests
│
├── docs/                            # Documentation
│   ├── api/                         # API documentation
│   │   ├── openapi.yml              # OpenAPI specification
│   │   └── endpoints.md             # Endpoint documentation
│   ├── architecture/                # Architecture diagrams
│   │   ├── system-architecture.png  # System architecture
│   │   ├── database-schema.png      # Database schema
│   │   └── websocket-protocol.md    # WebSocket protocol
│   └── user-guide/                  # User guides
│       ├── getting-started.md       # Getting started
│       └── features.md              # Feature documentation
│
├── .github/                         # GitHub workflows
│   ├── workflows/
│   │   ├── ci.yml                   # CI pipeline
│   │   ├── cd.yml                   # CD pipeline
│   │   └── security.yml             # Security scanning
│   ├── CODEOWNERS                   # Code owners
│   └── PULL_REQUEST_TEMPLATE.md     # PR template
│
├── .vscode/                         # VSCode settings
│   ├── settings.json                # VSCode settings
│   └── extensions.json              # Recommended extensions
│
├── package.json                     # Root package.json
├── turbo.json                       # Turborepo configuration
├── .gitignore                       # Git ignore
├── .env.example                     # Environment template
├── README.md                        # Project documentation
└── LICENSE                          # License
```

## Domain-Specific Implementation Guide

### 1. Foundation Domain (`foundation.ts`)
**Implementation Priority: HIGH (Start Here)**

```typescript
// apps/api/src/services/bill.service.ts
import { bills, sponsors, committees } from '@legislative-platform/database';
import { db } from '@legislative-platform/database/connection';

export class BillService {
  async getBills(filters: BillFilters) {
    return await db
      .select()
      .from(bills)
      .leftJoin(sponsors, eq(bills.sponsor_id, sponsors.id))
      .leftJoin(committees, eq(bills.committee_id, committees.id))
      .where(this.buildBillFilters(filters));
  }
  
  async trackBillView(billId: string, userId?: string) {
    // Implement view tracking with engagement metrics
  }
}
```

### 2. Citizen Participation Domain (`citizen_participation.ts`)
**Implementation Priority: HIGH**

```typescript
// apps/api/src/services/comment.service.ts
import { comments, comment_votes, bill_engagement } from '@legislative-platform/database';

export class CommentService {
  async createComment(data: NewComment) {
    // Implement comment creation with moderation
    // Trigger engagement score updates
    // Send real-time notifications
  }
  
  async voteOnComment(commentId: string, userId: string, voteType: CommentVoteType) {
    // Implement weighted voting system
    // Update engagement scores
  }
}
```

### 3. Constitutional Intelligence Domain (`constitutional_intelligence.ts`)
**Implementation Priority: MEDIUM (Core Differentiator)**

```typescript
// apps/worker/src/jobs/constitutionalAnalysis.job.ts
import { constitutional_analyses, expert_review_queue } from '@legislative-platform/database';
import { ConstitutionalAnalyzer } from '../services/constitutionalAnalyzer';

export class ConstitutionalAnalysisJob {
  async analyzeBill(billId: string) {
    const analysis = await ConstitutionalAnalyzer.analyze(billId);
    
    // Store analysis results
    await db.insert(constitutional_analyses).values({
      bill_id: billId,
      analysis_type: 'automated',
      constitutional_alignment: analysis.alignment,
      potential_violations: analysis.violations,
      confidence_score: analysis.confidence,
      requires_expert_review: analysis.confidence < 0.8
    });
    
    // Queue for expert review if needed
    if (analysis.confidence < 0.8) {
      await this.queueExpertReview(billId, analysis);
    }
  }
}
```

### 4. Real-time Engagement (`websocket.ts`)
**Implementation Priority: MEDIUM**

```typescript
// apps/websocket/src/handlers/bill.handlers.ts
import { WebSocketMessage, BillUpdateMessage } from '@legislative-platform/types';

export class BillUpdateHandler {
  async handleBillUpdate(billId: string, updateType: string, data: any) {
    const message: BillUpdateMessage = {
      type: 'bill_update',
      data: {
        billId,
        updateType,
        newValue: data,
        timestamp: new Date().toISOString()
      },
      messageId: generateId(),
      timestamp: Date.now()
    };
    
    // Broadcast to subscribed clients
    await this.broadcastToSubscribers(`bill:${billId}`, message);
  }
}
```

## Technology Stack Recommendations

### Core Technologies
```json
{
  "frontend": {
    "framework": "Next.js 14+",
    "language": "TypeScript",
    "state": "Zustand + React Query",
    "styling": "Tailwind CSS + shadcn/ui",
    "forms": "React Hook Form + Zod",
    "realtime": "Socket.io-client"
  },
  "backend": {
    "runtime": "Node.js 20+",
    "framework": "Express.js",
    "orm": "Drizzle ORM",
    "database": "PostgreSQL 15+",
    "cache": "Redis",
    "queue": "BullMQ",
    "auth": "Passport.js + JWT"
  },
  "infrastructure": {
    "containers": "Docker",
    "orchestration": "Kubernetes",
    "ci_cd": "GitHub Actions",
    "monitoring": "Prometheus + Grafana",
    "logging": "ELK Stack"
  }
}
```

### Development Tools
- **Package Manager**: pnpm (with workspace support)
- **Build Tool**: Turborepo
- **Type Checking**: TypeScript strict mode
- **Linting**: ESLint + Prettier
- **Testing**: Vitest + Playwright
- **Database**: Drizzle Kit for migrations

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Set up project structure
- [ ] Implement foundation domain (users, bills, committees)
- [ ] Basic authentication and authorization
- [ ] Database migrations and seeding

### Phase 2: Core Engagement (Weeks 5-8)
- [ ] Citizen participation features (comments, voting)
- [ ] Basic WebSocket real-time updates
- [ ] User profiles and preferences
- [ ] Notification system

### Phase 3: Constitutional Intelligence (Weeks 9-12)
- [ ] Constitutional analysis engine
- [ ] Expert review workflow
- [ ] Legal precedent integration
- [ ] Constitutional vulnerability tracking

### Phase 4: Advanced Features (Weeks 13-16)
- [ ] Advanced analytics and reporting
- [ ] Market intelligence features
- [ ] Accountability tracking
- [ ] Performance optimization

### Phase 5: Production Readiness (Weeks 17-20)
- [ ] Comprehensive testing
- [ ] Security hardening
- [ ] Performance optimization
- [ ] Deployment and monitoring

## Best Practices

### Code Organization
1. **Domain-Driven**: Keep domain logic together
2. **Type Safety**: Use TypeScript strict mode
3. **Testing**: Test each domain independently
4. **Documentation**: Document all public APIs

### Database Practices
1. **Migrations**: Use Drizzle Kit for all schema changes
2. **Seeding**: Maintain comprehensive seed data
3. **Indexes**: Monitor query performance and optimize
4. **Security**: Implement row-level security where needed

### Security Considerations
1. **Authentication**: JWT with refresh tokens
2. **Authorization**: Role-based access control
3. **Input Validation**: Zod schemas for all inputs
4. **Audit Logging**: Log all sensitive operations

### Performance Optimization
1. **Caching**: Redis for frequently accessed data
2. **Database**: Optimize queries with proper indexes
3. **Real-time**: Efficient WebSocket message broadcasting
4. **Frontend**: Code splitting and lazy loading

## Conclusion

This project structure provides a solid foundation for building a sophisticated legislative engagement platform. The domain-driven approach ensures maintainability, while the modular architecture allows for independent scaling and deployment.

The structure supports the platform's unique constitutional intelligence features while maintaining high performance and security standards. Following this guide will result in a production-ready application that can serve as a model for constitutional democracy technology worldwide.

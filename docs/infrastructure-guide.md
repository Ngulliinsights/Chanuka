# Chanuka Platform Infrastructure Guide

## Document Control
**Version:** 3.0
**Date:** December 3, 2025
**Phase:** Quality Assurance & Version Control

## Overview

This guide provides comprehensive documentation for the Chanuka platform's database infrastructure, schema architecture, migration strategies, and operational procedures. It consolidates schema domain relationships, missing tables analysis, and migration strategies into a unified infrastructure reference.

## Database Architecture

### Schema Organization

The Chanuka platform uses a domain-driven design approach with nine comprehensive domains:

```
Database Schema Architecture
├── Core Domains (Existing)
│   ├── users - User management and authentication
│   ├── bills - Legislative bill tracking
│   ├── sponsors - Bill sponsors and representatives
│   ├── comments - User comments and discussions
│   └── notifications - Notification system
│
├── New Strategic Domains (Added)
│   ├── transparency_intelligence - Financial transparency & conflict detection
│   ├── expert_verification - Expert credibility & verification system
│   ├── advanced_discovery - Intelligent search & discovery
│   └── real_time_engagement - Live engagement & gamification
│
└── Supporting Infrastructure
    ├── migrations - Database migration tracking
    └── audit_logs - System audit trails
```

### Component Relationships

The database infrastructure consists of three key validation layers:

#### 1. Schema Compilation Validator (`shared/schema/validate-schemas.ts`)
- **Purpose**: Ensures all domain schemas compile correctly without TypeScript errors
- **Role**: Development-time validation and CI/CD integration
- **Dependencies**: All domain schema files

#### 2. Runtime Data Validation (`shared/core/src/validation/schemas`)
- **Purpose**: Validates data at runtime using Zod schemas
- **Role**: API request/response validation, form validation, data integrity
- **Dependencies**: Core types from `shared/core/src/types`

#### 3. TypeScript Type Definitions (`shared/core/src/types/index.ts`)
- **Purpose**: Provides TypeScript types that correspond to database schemas
- **Role**: Compile-time type safety across frontend and backend
- **Dependencies**: Database schema definitions

### Data Flow Architecture

```
Database Schema (Drizzle) → TypeScript Types → Runtime Validation (Zod) → Frontend Components
                ↓                    ↓                     ↓
             Migration Scripts    API Contracts      Form Validation
```

## Domain Schemas

### 1. Transparency Intelligence Domain

**Purpose**: Financial transparency & conflict detection

**Key Tables**:
- `financialDisclosures` - Sponsor financial disclosure tracking
- `financialInterests` - Detailed financial interest breakdown
- `conflictDetections` - AI-powered conflict of interest detection
- `influenceNetworks` - Relationship mapping between entities
- `implementationWorkarounds` - Track alternative implementation pathways

**Strategic Value**: Enables "follow the money" functionality and network visualization

### 2. Expert Verification Domain

**Purpose**: Expert credibility & verification system

**Key Tables**:
- `expertCredentials` - Academic/professional credential tracking
- `expertDomains` - Domain expertise mapping
- `credibilityScores` - Dynamic credibility scoring system
- `expertReviews` - Expert review and validation workflow
- `peerValidations` - Peer-to-peer expert validation
- `expertActivity` - Expert contribution tracking

**Strategic Value**: Critical for combating misinformation and building public trust

### 3. Advanced Discovery Domain

**Purpose**: Intelligent search & discovery

**Key Tables**:
- `searchQueries` - Search intent and context tracking
- `discoveryPatterns` - AI-detected patterns in legislation
- `billRelationships` - Semantic relationships between bills
- `searchAnalytics` - Search behavior analytics
- `trendingTopics` - Dynamic trending topic detection
- `userRecommendations` - Personalized recommendation engine

**Strategic Value**: Helps users navigate large volumes of legislative content intelligently

### 4. Real-Time Engagement Domain

**Purpose**: Live engagement & gamification

**Key Tables**:
- `engagementEvents` - Real-time user interaction tracking (partitioned)
- `liveMetricsCache` - Cached real-time metrics for performance
- `civicAchievements` - Gamification achievement system
- `userAchievements` - User achievement tracking
- `civicScores` - Comprehensive civic engagement scoring
- `engagementLeaderboards` - Community leaderboards
- `realTimeNotifications` - Live notification system
- `engagementAnalytics` - Engagement pattern analysis

**Strategic Value**: Encourages continued participation through visible impact metrics

## Migration Strategy

### Current State Analysis

**Technology Stack**:
- **Database**: PostgreSQL with Drizzle ORM
- **Migration Status**: Partially migrated to direct Drizzle services (53% complete)
- **Features**: 8/15 features migrated to modern patterns
- **Schema**: Comprehensive domain-driven design (9 domains, 61+ tables)

### Migration Phases

#### Phase 1: Foundation Establishment (Weeks 1-4)

**Goal**: Establish unified cross-cutting concerns infrastructure

**Key Activities**:
- Complete remaining Drizzle migrations (7 features)
- Implement real-time communication layer
- Create unified state management system

**Deliverables**:
- Cross-cutting concerns service layer
- Real-time WebSocket infrastructure
- Unified state management with optimistic updates
- Progressive enhancement framework

#### Phase 2: Core Concerns Implementation (Weeks 5-12)

**Goal**: Implement navigation and engagement concerns

**Key Activities**:
- Progressive disclosure navigation system
- Real-time engagement analytics dashboard
- Expert verification and credibility system
- Mobile-optimized complex content navigation

#### Phase 3: Advanced Concerns Development (Weeks 13-20)

**Goal**: Implement transparency and analysis concerns

**Key Activities**:
- Advanced conflict of interest visualization
- Constitutional analysis enhancement
- Pretext detection system
- Financial disclosure processing engine

#### Phase 4: Integration and Optimization (Weeks 21-26)

**Goal**: Integrate education and notification concerns, optimize performance

**Key Activities**:
- Contextual educational framework
- Smart notification and alert system
- Performance optimization across all concerns
- Comprehensive testing and validation

#### Phase 5: Production Deployment and Monitoring (Weeks 27-30)

**Goal**: Deploy to production with comprehensive monitoring

**Key Activities**:
- Production deployment
- Comprehensive monitoring setup
- User training and documentation
- Post-deployment optimization

## Performance Optimization

### Database Performance

**Indexing Strategy**:
- Proper indexing on high-query columns
- Partitioning strategy for high-volume tables (`engagementEvents` partitioned by time)
- Optimized queries for expected access patterns

**Caching Layer**:
- `liveMetricsCache` uses TTL-based cleanup for performance
- Redis integration for session and API caching
- CDN for static assets with gzip/brotli compression

### Scalability Considerations

**Horizontal Scaling**:
- Microservices architecture preparation
- Read replicas for high-read scenarios
- Event-driven architecture for decoupling

**Data Partitioning**:
- Time-based partitioning for time-series data
- Geographic partitioning preparation for multi-region deployment
- Functional partitioning by domain

## Infrastructure Setup

### Database Configuration

**PostgreSQL Setup**:
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Configure for performance
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET track_activity_query_size = 4096;
```

**Connection Pooling**:
- Use PgBouncer for connection pooling
- Configure appropriate pool sizes based on workload
- Implement connection health checks

### Migration Execution

**Drizzle Migration Process**:
```bash
# Generate migrations from schema changes
pnpm drizzle-kit generate

# Apply migrations to database
pnpm drizzle-kit push

# Verify migration success
pnpm drizzle-kit check
```

**Migration Best Practices**:
- Always backup before migration
- Test migrations on staging environment first
- Implement rollback scripts for critical migrations
- Use transaction boundaries appropriately

## Operational Procedures

### Backup and Recovery

**Backup Strategy**:
- Daily full backups during low-traffic windows
- Continuous WAL archiving for point-in-time recovery
- Cross-region backup replication for disaster recovery
- Encrypted backup storage with access controls

**Recovery Procedures**:
- Point-in-time recovery for data corruption scenarios
- Schema rollback scripts for failed migrations
- Data validation procedures post-recovery
- Business continuity testing quarterly

### Monitoring and Alerting

**Key Metrics to Monitor**:
- Database connection pool utilization
- Query performance and slow query alerts
- Disk space and growth trends
- Replication lag (if using replicas)
- Cache hit rates and performance

**Alert Thresholds**:
- Connection pool > 80% utilization
- Query response time > 500ms (p95)
- Disk space > 85% utilization
- Replication lag > 30 seconds

### Security Considerations

**Data Protection**:
- Encryption at rest using PostgreSQL's encryption features
- SSL/TLS for all database connections
- Row-level security for multi-tenant data
- Audit logging for sensitive operations

**Access Control**:
- Principle of least privilege for database users
- Regular rotation of database credentials
- Network security groups and firewall rules
- Database activity monitoring

## Troubleshooting Guide

### Common Issues

**Migration Failures**:
- Check database connectivity and permissions
- Verify schema syntax and dependencies
- Review migration logs for specific errors
- Ensure proper transaction handling

**Performance Degradation**:
- Analyze slow query logs
- Check index usage and statistics
- Review connection pool configuration
- Monitor system resource utilization

**Data Consistency Issues**:
- Verify foreign key constraints
- Check for orphaned records
- Validate data integrity constraints
- Review application-level validation

### Diagnostic Commands

```sql
-- Check database size and growth
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Check for long-running queries
SELECT pid, now() - pg_stat_activity.query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '30 seconds';
```

## Development Workflow

### Schema Development

1. **Modify Schema Files**: Update domain schema files in `shared/schema/`
2. **Validate Compilation**: Run TypeScript compilation checks
3. **Generate Migrations**: Use Drizzle Kit to generate migration files
4. **Test Migrations**: Apply to development database and test thoroughly
5. **Code Review**: Submit schema changes for peer review
6. **Deploy**: Apply migrations through CI/CD pipeline

### Testing Strategy

**Unit Tests**: Schema validation and type checking
**Integration Tests**: Migration testing and data consistency
**Performance Tests**: Query optimization and load testing
**End-to-End Tests**: Full workflow validation

## Success Metrics

### Technical Metrics
- **Performance**: Query response time < 100ms (p95)
- **Reliability**: Database uptime > 99.9%
- **Scalability**: Support for 10,000+ concurrent users
- **Data Integrity**: Zero data corruption incidents

### Operational Metrics
- **Migration Success**: 100% successful migrations in production
- **Backup Coverage**: < 1 hour RPO, < 4 hour RTO
- **Monitoring Coverage**: 100% critical metrics monitored
- **Security Compliance**: Zero security incidents

## Conclusion

This infrastructure guide provides the foundation for operating and maintaining the Chanuka platform's database systems. The domain-driven schema architecture, comprehensive migration strategy, and operational procedures ensure a robust, scalable, and maintainable infrastructure that supports the platform's mission of democratic transparency and civic engagement.

For specific implementation details, refer to the individual domain documentation and migration scripts in the codebase.
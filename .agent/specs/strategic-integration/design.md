# Strategic Feature Integration - Design

**Spec ID:** strategic-integration  
**Created:** February 24, 2026  
**Status:** Refined  
**Version:** 2.0

---

## 1. Architecture Overview

### 1.1 System Context

The strategic feature integration follows a phased approach to minimize risk and maximize value delivery. Each phase builds on the previous one, with clear integration points and rollback capabilities.

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Pretext  │  │  Recom-  │  │ Argument │  │  USSD    │   │
│  │Detection │  │ mendation│  │  Intel   │  │  Access  │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
┌───────┼─────────────┼─────────────┼─────────────┼──────────┐
│       │      API Gateway / Feature Flags        │          │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
┌───────┴─────────────┴─────────────┴─────────────┴──────────┐
│                    Server Application                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Features │  │  Graph   │  │   ML/AI  │  │  Govt    │   │
│  │ Services │  │    DB    │  │  Models  │  │   Data   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
┌───────┴─────────────┴─────────────┴─────────────┴──────────┐
│              Data Layer (PostgreSQL + Neo4j)                 │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Integration Strategy

**Phased Rollout:**
1. Feature flags control visibility
2. Percentage-based rollouts
3. A/B testing for validation
4. Monitoring at each step
5. Rollback capability

**Integration Pattern:**
```typescript
// Feature integration pattern
interface FeatureIntegration {
  feature: string;
  enabled: boolean;
  rolloutPercentage: number;
  dependencies: string[];
  healthCheck: () => Promise<boolean>;
  rollback: () => Promise<void>;
}
```

---

## 2. Phase 1: Quick Wins Design

### 2.1 Pretext Detection Integration

**Architecture:**
```
Client                    Server                   Database
  │                         │                         │
  ├─ Detection UI          ├─ Detection API         ├─ Bills
  ├─ Alert Display         ├─ Analysis Engine       ├─ Patterns
  ├─ Review Interface      ├─ Notification Service  ├─ Alerts
  └─ Analytics             └─ Admin API             └─ Audit Log
```

**Components:**

1. **Client Components** (`client/src/features/pretext-detection/`)
   - Already complete, needs integration
   - Add to navigation
   - Connect to backend API
   - Add notification handlers

2. **Server Endpoints** (new)
   ```typescript
   // server/features/pretext-detection/application/routes.ts
   POST   /api/pretext-detection/analyze
   GET    /api/pretext-detection/alerts
   POST   /api/pretext-detection/review
   GET    /api/pretext-detection/analytics
   ```

3. **Database Schema** (existing)
   - Uses existing bill tables
   - Add alerts table for detections

**Data Flow:**
```
1. Bill created/updated → Trigger analysis
2. Analysis engine → Pattern matching
3. Detection found → Create alert
4. Alert → Notification service
5. User notified → Review interface
6. Admin reviews → Approve/reject
7. Analytics → Track accuracy
```


### 2.2 Recommendation Engine Integration

**Architecture:**
```
User Activity → Event Stream → Recommendation Engine → Personalized Feed
     │              │                    │                      │
     └─ Clicks      └─ Process          └─ Generate           └─ Display
     └─ Views                            └─ Cache              └─ Track
     └─ Votes                            └─ Update             └─ Refine
```

**Components:**

1. **Recommendation Service** (`server/features/recommendation/`)
   - Already complete
   - Add API endpoints
   - Enable caching
   - Add monitoring

2. **Client Widgets** (new)
   ```typescript
   // client/src/features/dashboard/ui/RecommendationWidget.tsx
   - Recommended Bills
   - Recommended Topics
   - Recommended Users
   - Recommended Actions
   ```

3. **Algorithms:**
   - Collaborative filtering (user-based)
   - Content-based filtering (bill attributes)
   - Hybrid approach
   - Real-time updates

**Data Flow:**
```
1. User activity → Event tracking
2. Events → Recommendation engine
3. Engine → Generate recommendations
4. Recommendations → Cache (Redis)
5. Client requests → Serve from cache
6. User interaction → Update model
```

### 2.3 Argument Intelligence Integration

**Architecture:**
```
Comments → NLP Pipeline → Clustering → Visualization
   │           │              │            │
   └─ Text     └─ Analyze     └─ Group     └─ Display
   └─ Meta     └─ Sentiment   └─ Rank      └─ Filter
   └─ Context  └─ Quality     └─ Track     └─ Search
```

**Components:**

1. **NLP Pipeline** (`server/features/argument-intelligence/`)
   - Already complete
   - Add to comment processing
   - Enable real-time analysis
   - Add caching

2. **Visualization UI** (new)
   ```typescript
   // client/src/features/community/ui/ArgumentVisualization.tsx
   - Argument clusters
   - Sentiment heatmap
   - Position tracking
   - Quality metrics
   ```

3. **Integration Points:**
   - Comment submission → Analyze
   - Comment display → Show analysis
   - Discussion page → Show clusters
   - User profile → Show positions

**Data Flow:**
```
1. Comment submitted → NLP analysis
2. Analysis → Extract arguments
3. Arguments → Cluster by topic
4. Clusters → Calculate sentiment
5. Results → Store in database
6. UI requests → Serve analysis
7. User interaction → Track positions
```

### 2.4 Feature Flag System Enhancement

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                  Feature Flag Service                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Config  │  │ Rollout  │  │   A/B    │             │
│  │  Store   │  │  Engine  │  │  Testing │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
┌───────┴─────────────┴─────────────┴────────────────────┐
│              Application Features                        │
└──────────────────────────────────────────────────────────┘
```

**Components:**

1. **Flag Management** (new)
   ```typescript
   // server/infrastructure/feature-flags/
   - Flag configuration
   - User targeting
   - Percentage rollouts
   - A/B test configuration
   - Analytics integration
   ```

2. **Admin UI** (new)
   ```typescript
   // client/src/features/admin/ui/FeatureFlagManager.tsx
   - Flag list
   - Flag editor
   - Rollout controls
   - A/B test setup
   - Analytics dashboard
   ```

3. **Client SDK** (enhance existing)
   ```typescript
   // client/src/infrastructure/feature-flags/
   - Flag evaluation
   - User context
   - Real-time updates
   - Fallback values
   ```

**Data Model:**
```typescript
interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  userTargeting: {
    include?: string[];
    exclude?: string[];
    attributes?: Record<string, any>;
  };
  abTest?: {
    variants: string[];
    distribution: number[];
  };
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.5 Integration Monitoring Framework

**Architecture:**
```
┌─────────────────────────────────────────────────────────┐
│                  Monitoring Dashboard                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Health  │  │  Metrics │  │  Alerts  │             │
│  │  Status  │  │  Charts  │  │   Log    │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼────────────────────┘
        │             │             │
┌───────┴─────────────┴─────────────┴────────────────────┐
│              Monitoring Collectors                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Usage   │  │  Perf    │  │  Errors  │             │
│  │ Tracking │  │ Metrics  │  │ Tracking │             │
│  └──────────┘  └──────────┘  └──────────┘             │
└──────────────────────────────────────────────────────────┘
```

**Components:**

1. **Monitoring Service** (new)
   ```typescript
   // server/infrastructure/monitoring/integration-monitor.ts
   - Feature usage tracking
   - Performance metrics
   - Error tracking
   - Health checks
   - Alert generation
   ```

2. **Dashboard** (new)
   ```typescript
   // client/src/features/admin/ui/IntegrationDashboard.tsx
   - Feature status cards
   - Usage charts
   - Performance graphs
   - Error logs
   - Alert notifications
   ```

3. **Metrics:**
   - Feature adoption rate
   - API response times
   - Error rates
   - User engagement
   - System health

---

## 3. Phase 2: Strategic Features Design

### 3.1 Constitutional Intelligence Integration

**Architecture:**
```
Bill → Constitutional Analysis → Rights Assessment → Report
 │            │                        │               │
 └─ Text      └─ Parse                └─ Evaluate     └─ Display
 └─ Meta      └─ Match Precedents     └─ Detect*Design Status:** ✅ Complete  
**Next Step:** Create tasks document  
**Review Required:** Engineering Lead, Security Team
 name: "General Availability"
    percentage: 100
    duration: "∞"
```

### 10.2 Rollback Plan

```typescript
// Automated rollback triggers
interface RollbackTrigger {
  errorRate: number;      // > 5%
  responseTime: number;   // > 2s
  healthCheck: boolean;   // failed
  manual: boolean;        // admin triggered
}
```

### 10.3 Infrastructure

- Docker containers for services
- Kubernetes for orchestration
- Terraform for infrastructure as code
- CI/CD pipeline (GitHub Actions)
- Blue-green deployment

---

*9.2 Alerting

- Performance degradation alerts
- Error rate threshold alerts
- Feature health alerts
- Security incident alerts
- Business metric alerts

### 9.3 Logging

- Structured logging (JSON)
- Log aggregation (ELK stack)
- Distributed tracing
- Audit logging
- Error tracking (Sentry)

---

## 10. Deployment Design

### 10.1 Deployment Strategy

```yaml
# Phased rollout
phases:
  - name: "Canary"
    percentage: 5
    duration: "24h"
    
  - name: "Beta"
    percentage: 25
    duration: "48h"
    
  -
- Load balancing across instances
- Database read replicas
- Graph database clustering
- CDN for static assets

---

## 9. Monitoring & Observability

### 9.1 Metrics Collection

```typescript
// Key metrics
interface Metrics {
  feature: {
    adoption: number;
    activeUsers: number;
    requests: number;
  };
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  business: {
    engagement: number;
    retention: number;
    satisfaction: number;
  };
}
```

### Strategy {
  l1: 'memory';      // In-memory (Redis)
  l2: 'database';    // Database cache
  ttl: {
    recommendations: 300,    // 5 minutes
    analytics: 3600,         // 1 hour
    graph: 1800,             // 30 minutes
  };
}
```

### Cache Invalidation Strategy

```typescript
interface CacheInvalidation {
  triggers: {
    dataUpdate: boolean;      // Invalidate on source data change
    timeExpiry: boolean;       // Invalidate on TTL expiry
    manualPurge: boolean;      // Admin can purge
    dependencyChange: boolean; // Invalidate dependent caches
  };
  strategy: {
    type: 'lazy' | 'eager';   // When to invalidate
    scope: 'key' | 'pattern' | 'tag'; // What to invalidate
  };
  notification: {
    enabled: boolean;          // Notify clients of invalidation
    method: 'websocket' | 'polling';
  };
}
```

**Invalidation Rules:**

| Cache Type | Trigger | Strategy | Scope |
|------------|---------|----------|-------|
| Recommendations | User action | Eager | Key |
| Bill analysis | Bill update | Eager | Pattern |
| Graph analytics | Data sync | Lazy | Tag |
| User profile | Profile update | Eager | Key |
| Search results | Data update | Lazy | Pattern |

**Implementation:**
```typescript
// Cache invalidation service
class CacheInvalidationService {
  async invalidate(options: {
    type: 'key' | 'pattern' | 'tag';
    value: string;
    notify?: boolean;
  }): Promise<void> {
    // Invalidate cache
    await this.redis.del(options.value);
    
    // Notify clients if enabled
    if (options.notify) {
      await this.websocket.broadcast({
        type: 'cache_invalidated',
        cache: options.value
      });
    }
    
    // Log invalidation
    await this.monitoring.track('cache_invalidation', options);
  }
}
```

**Monitoring:**
- Track invalidation frequency per cache type
- Track cache hit rate before/after invalidation
- Alert on excessive invalidations (>100/minute)

### 8.2 Query Optimization

- Database indexes on frequently queried fields
- Graph database query optimization
- API response pagination
- Lazy loading for large datasets
- Background processing for heavy operations

### 8.3 Scalability

- Horizontal scaling for API serverstext-detection:read')
async getDetections() {
  // Implementation
}
```

### 7.2 Data Protection

- All API endpoints require authentication
- Sensitive data encrypted at rest
- PII data anonymized in analytics
- Audit logs for all admin actions
- Rate limiting on all endpoints

### 7.3 USSD Security

- Session encryption
- PIN-based authentication
- Transaction limits
- Fraud detection
- Audit logging

---

## 8. Performance Design

### 8.1 Caching Strategy

```typescript
// Multi-level caching
interface CachePI

```typescript
// POST /api/graph/query
interface GraphQueryRequest {
  query: string;
  parameters?: Record<string, any>;
  limit?: number;
}

interface GraphQueryResponse {
  results: any[];
  executionTime: number;
  cached: boolean;
}
```

### 6.4 Error Recovery Patterns

All API endpoints MUST implement the following error recovery pattern:

```typescript
interface ErrorRecoveryConfig {
  retry: {
    maxAttempts: 3;
    backoff: 'exponential';  // 1s, 2s, 4s
    initialDelay: 1000;      // milliseconds
  };
  fallback: {
    strategy: 'cache' | 'default' | 'error';
    cacheMaxAge?: 300000;    // 5 minutes
  };
  circuit: {
    enabled: true;
    threshold: 5;            // failures before opening
    timeout: 30000;          // 30 seconds
  };
}

// Example implementation
async function apiCallWithRecovery<T>(
  endpoint: string,
  config: ErrorRecoveryConfig
): Promise<T> {
  // Implementation with retry, fallback, circuit breaker
}
```

**Error Recovery Matrix:**

| Error Type | Retry | Fallback | Circuit Breaker |
|------------|-------|----------|-----------------|
| Network timeout | Yes (3x) | Cache | Yes |
| 5xx Server error | Yes (3x) | Cache | Yes |
| 4xx Client error | No | Error | No |
| Rate limit | Yes (with backoff) | Cache | No |
| Auth failure | No | Error | No |

**Monitoring:**
- Track retry attempts per endpoint
- Track fallback usage
- Track circuit breaker state
- Alert on high retry rates (>10%)

---

## 7. Security Design

### 7.1 Authentication & Authorization

```typescript
// Feature-level permissions
interface FeaturePermission {
  feature: string;
  roles: string[];
  conditions?: Condition[];
}

// API endpoint protection
@RequireAuth()
@RequirePermission('preence: string[];
  confidence: number;
}
```

### 6.2 Recommendation API

```typescript
// GET /api/recommendations/:userId
interface RecommendationRequest {
  userId: string;
  type?: 'bills' | 'topics' | 'users' | 'actions';
  limit?: number;
}

interface RecommendationResponse {
  userId: string;
  recommendations: Recommendation[];
  generatedAt: Date;
}

interface Recommendation {
  id: string;
  type: string;
  score: number;
  reason: string;
  metadata: Record<string, any>;
}
```

### 6.3 Graph Analytics Astring;
  from: string;
  to: string;
  properties: Record<string, any>;
  createdAt: Date;
}

### Complete Neo4j Schema

**Constraints:**
```cypher
// Unique constraints
CREATE CONSTRAINT person_id IF NOT EXISTS 
FOR (p:Person) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT bill_id IF NOT EXISTS 
FOR (b:Bill) REQUIRE b.id IS UNIQUE;

CREATE CONSTRAINT committee_id IF NOT EXISTS 
FOR (c:Committee) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT organization_id IF NOT EXISTS 
FOR (o:Organization) REQUIRE o.id IS UNIQUE;

// Existence constraints
CREATE CONSTRAINT person_name IF NOT EXISTS 
FOR (p:Person) REQUIRE p.name IS NOT NULL;

CREATE CONSTRAINT bill_number IF NOT EXISTS 
FOR (b:Bill) REQUIRE b.number IS NOT NULL;
```

**Indexes:**
```cypher
// Performance indexes
CREATE INDEX person_name IF NOT EXISTS 
FOR (p:Person) ON (p.name);

CREATE INDEX person_type IF NOT EXISTS 
FOR (p:Person) ON (p.type);

CREATE INDEX bill_number IF NOT EXISTS 
FOR (b:Bill) ON (b.number);

CREATE INDEX bill_status IF NOT EXISTS 
FOR (b:Bill) ON (b.status);

CREATE INDEX relationship_date IF NOT EXISTS 
FOR ()-[r:SPONSORED]-() ON (r.date);

CREATE INDEX relationship_date IF NOT EXISTS 
FOR ()-[r:VOTED]-() ON (r.date);
```

**Relationship Types with Properties:**
```cypher
// Sponsorship
(:Person)-[:SPONSORED {
  date: Date,
  role: String,  // 'primary' | 'co-sponsor'
  order: Integer
}]->(:Bill)

// Voting
(:Person)-[:VOTED {
  date: Date,
  vote: String,  // 'yes' | 'no' | 'abstain'
  stage: String  // '1st reading' | '2nd reading' | '3rd reading'
}]->(:Bill)

// Committee Membership
(:Person)-[:MEMBER_OF {
  from: Date,
  to: Date,
  role: String  // 'chair' | 'vice-chair' | 'member'
}]->(:Committee)

// Bill Assignment
(:Bill)-[:ASSIGNED_TO {
  date: Date,
  status: String  // 'pending' | 'reviewed' | 'reported'
}]->(:Committee)

// Influence
(:Person)-[:INFLUENCES {
  strength: Float,  // 0.0 to 1.0
  type: String,     // 'political' | 'economic' | 'social'
  lastUpdated: Date
}]->(:Person)

// Affiliation
(:Person)-[:AFFILIATED_WITH {
  from: Date,
  to: Date,
  role: String
}]->(:Organization)
```

**Query Performance Targets:**
- Single node lookup: < 10ms
- 1-hop relationship query: < 50ms
- 2-hop relationship query: < 200ms
- 3-hop relationship query: < 1000ms
- Pattern matching (up to 10K nodes): < 2000ms
```

---

## 6. API Specifications

### 6.1 Pretext Detection API

```typescript
// POST /api/pretext-detection/analyze
interface AnalyzeRequest {
  billId: string;
  force?: boolean;
}

interface AnalyzeResponse {
  billId: string;
  detections: Detection[];
  score: number;
  confidence: number;
}

interface Detection {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidber;
    p99ResponseTime: number;
  };
  health: {
    status: 'healthy' | 'degraded' | 'down';
    uptime: number;
    lastCheck: Date;
  };
}
```

### 5.3 Graph Database Models

```typescript
// Node types
interface PersonNode {
  id: string;
  name: string;
  type: 'mp' | 'citizen' | 'expert';
  attributes: Record<string, any>;
}

interface BillNode {
  id: string;
  title: string;
  number: string;
  status: string;
  attributes: Record<string, any>;
}

// Relationship types
interface Relationship {
  type: ng;
    updatedAt: Date;
  };
}

interface UserTargeting {
  include?: string[];
  exclude?: string[];
  attributes?: Record<string, any>;
}

interface ABTest {
  variants: Variant[];
  distribution: number[];
  metrics: string[];
}
```

### 5.2 Integration Monitoring Model

```typescript
interface IntegrationMetrics {
  featureId: string;
  timestamp: Date;
  usage: {
    activeUsers: number;
    requests: number;
    errors: number;
  };
  performance: {
    avgResponseTime: number;
    p95ResponseTime: numtoring
   - A/B testing
   ```

3. **Models:**
   - Bill impact prediction
   - Sentiment analysis
   - Topic classification
   - User profiling
   - Recommendation generation

---

## 5. Data Models

### 5.1 Feature Flag Model

```typescript
interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  userTargeting: UserTargeting;
  abTest?: ABTest;
  dependencies: string[];
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedBy: stri     │             │
  └─ Train   └─ Load        └─ Route      └─ Request
  └─ Version └─ Serve       └─ Cache      └─ Display
  └─ Monitor └─ Scale       └─ Monitor    └─ Feedback
```

**Components:**

1. **Model Server** (new)
   ```python
   # server/infrastructure/ml/model-server/
   - TensorFlow Serving
   - Model registry
   - Version management
   - Health checks
   ```

2. **API Layer** (new)
   ```typescript
   // server/features/ml/application/
   - Prediction endpoints
   - Batch processing
   - Model monible caching
   - Add monitoring

2. **Visualization UI** (new)
   ```typescript
   // client/src/features/analytics/ui/NetworkVisualization.tsx
   - Network graph
   - Influence map
   - Pattern display
   - Query builder
   ```

3. **Query Templates:**
   - Find influencers
   - Detect communities
   - Track bill journey
   - Analyze sponsorship networks
   - Discover hidden connections

### 4.4 ML/AI Model Serving

**Architecture:**
```
Models → Model Server → API Gateway → Application
  │          │         ipt
// Influence Network API
GET  /api/graph/influence/:userId
POST /api/graph/influence/calculate

// Pattern Discovery API
GET  /api/graph/patterns/:type
POST /api/graph/patterns/discover

// Network Query API
POST /api/graph/query
GET  /api/graph/query/:queryId

// Recommendation API
GET  /api/graph/recommendations/:userId
POST /api/graph/recommendations/generate
```

**Components:**

1. **Analytics Service** (`server/infrastructure/database/graph/analytics/`)
   - Already complete
   - Add API routes
   - Enanc_trigger
   AFTER INSERT OR UPDATE ON bills
   FOR EACH ROW EXECUTE FUNCTION sync_to_graph();
   ```

2. **Sync Service** (`server/infrastructure/database/graph/sync/`)
   - Already complete
   - Enable triggers
   - Configure queues
   - Add monitoring

3. **Conflict Resolution:**
   ```typescript
   // server/infrastructure/database/graph/sync/conflict-resolver.ts
   - Timestamp-based resolution
   - Manual review queue
   - Audit logging
   ```

### 4.3 Graph Analytics Endpoints

**API Design:**
```typescr
   - Error handling
   ```

### 4.2 Graph Database Sync

**Sync Strategy:**
```
1. Real-time sync (critical data)
   - Bill creation/updates
   - User actions
   - Comments/votes

2. Batch sync (historical data)
   - Initial load
   - Bulk updates
   - Relationship building

3. Scheduled sync (analytics)
   - Network metrics
   - Pattern discovery
   - Influence scores
```

**Sync Components:**

1. **PostgreSQL Triggers** (new)
   ```sql
   -- server/infrastructure/database/triggers/
   CREATE TRIGGER bill_sy["apoc", "graph-data-science"]'
       volumes:
         - neo4j_data:/data
         - neo4j_logs:/logs
       ports:
         - "7474:7474"  # HTTP
         - "7687:7687"  # Bolt
   ```

2. **Sync Infrastructure** (`server/infrastructure/database/graph/`)
   - Already complete
   - Enable triggers
   - Configure schedules
   - Add monitoring

3. **Connection Management:**
   ```typescript
   // server/infrastructure/database/graph/core/neo4j-client.ts
   - Connection pooling
   - Health checks
   - Retry logicure

**Architecture:**
```
PostgreSQL → Event Stream → Sync Service → Neo4j
     │            │              │            │
     └─ Source    └─ Capture     └─ Transform └─ Store
     └─ Trigger   └─ Queue       └─ Validate  └─ Index
     └─ Monitor   └─ Process     └─ Resolve   └─ Query
```

**Components:**

1. **Neo4j Setup** (new)
   ```yaml
   # deployment/neo4j/docker-compose.yml
   services:
     neo4j:
       image: neo4j:5.15
       environment:
         NEO4J_AUTH: neo4j/password
         NEO4J_PLUGINS: 'lete
   - Configure APIs
   - Enable schedules
   - Add monitoring

2. **Admin Dashboard** (new)
   ```typescript
   // client/src/features/admin/ui/DataSyncDashboard.tsx
   - Sync status
   - Data quality metrics
   - Error logs
   - Manual sync triggers
   - Configuration
   ```

3. **Data Sources:**
   - Parliament API (bills, votes)
   - Gazette API (appointments)
   - Budget API (allocations)
   - Tender API (procurements)

---

## 4. Phase 3: Advanced Systems Design

### 4.1 Graph Database Infrastructgns
   - Notifications → Campaign updates
   - Analytics → Campaign metrics

### 3.4 Government Data Integration

**Architecture:**
```
Government APIs → Sync Service → Validation → Database
       │              │              │           │
       └─ Fetch       └─ Transform   └─ Check    └─ Store
       └─ Schedule    └─ Normalize   └─ Verify   └─ Update
       └─ Monitor     └─ Enrich      └─ Log      └─ Notify
```

**Components:**

1. **Sync Service** (`server/features/government-data/`)
   - Already compage   └─ Report
   └─ Track   └─ Monitor  └─ Reward   └─ Analyze
```

**Components:**

1. **Campaign Service** (`server/features/advocacy/`)
   - Already complete
   - Add API endpoints
   - Enable notifications
   - Add analytics

2. **Campaign UI** (new)
   ```typescript
   // client/src/features/advocacy/
   - Campaign creator
   - Action manager
   - Participant dashboard
   - Impact tracker
   - Coalition builder
   ```

3. **Integration:**
   - Bill pages → Create campaign
   - User dashboard → My campai  ```

**USSD Menu Structure:**
```
*123# → Main Menu
  1. View Bills
     1.1 Latest Bills
     1.2 Popular Bills
     1.3 Search Bills
  2. My Activity
     2.1 My Comments
     2.2 My Votes
     2.3 My Alerts
  3. Notifications
     3.1 View Alerts
     3.2 Settings
  4. Help
```

### USSD Navigation Constraints

**Menu Depth Rules:**
- Maximum menu depth: 4 levels
- Maximum options per menu: 9 (1-9)
- Reserved options: 0 (Back), 00 (Home), # (Cancel)

**Session Management:**
- Session timeout: 180 seconds (3 minutes)
- Inactivity timeout: 60 seconds
- State persistence: 300 seconds (5 minutes) after session end
- Maximum session retries: 3

**Navigation Pattern:**
```
Level 1: Main Menu (1-4)
  ├─ Level 2: Category (1-9, 0=Back, 00=Home)
  │   ├─ Level 3: Item (1-9, 0=Back, 00=Home)
  │   │   └─ Level 4: Action (1-9, 0=Back, 00=Home)
  │   │       └─ MAX DEPTH REACHED
```

**Breadcrumb Display:**
```
[Menu Title]
1. Option 1
2. Option 2
...
0. Back
00. Home
```

**Error Handling:**
- Invalid input: Show error, redisplay menu (max 3 times)
- Timeout: Save state, send SMS with resume code
- Session lost: Allow resume with code (5 minute window)

**Accessibility:**
- All menus in English and Swahili
- Simple language (reading level: Grade 6)
- Clear option numbering
- Confirmation for destructive actions

### 3.3 Advocacy Coordination Integration

**Architecture:**
```
Campaign → Actions → Participants → Impact
   │          │           │           │
   └─ Create  └─ Define   └─ Invite   └─ Track
   └─ Manage  └─ Assign   └─ Engnents:**

1. **USSD Service** (`server/features/universal_access/`)
   - Already complete
   - Configure gateway
   - Enable routes
   - Add monitoring

2. **SMS Integration** (new)
   ```typescript
   // server/infrastructure/sms/
   - SMS gateway client
   - Message templates
   - Delivery tracking
   - Error handling
   ```

3. **Admin Dashboard** (new)
   ```typescript
   // client/src/features/admin/ui/USSDDashboard.tsx
   - Session monitoring
   - Usage analytics
   - Menu configuration
   - SMS logs
 
   - Bill detail page → Show analysis
   - Bill list → Show indicators
   - Notifications → Alert on issues
   - Admin → Review workflow

### 3.2 Universal Access (USSD) Integration

**Architecture:**
```
Feature Phone → USSD Gateway → USSD Service → Platform API
      │              │              │              │
      └─ Dial        └─ Route       └─ Process     └─ Execute
      └─ Input       └─ Session     └─ Menu        └─ Respond
      └─ Receive     └─ Track       └─ Action      └─ Notify
```

**Compo       └─ Review
 └─ Context   └─ Check Conflicts      └─ Score        └─ Approve
```

**Components:**

1. **Analysis Engine** (`server/features/constitutional-intelligence/`)
   - Already complete
   - Add API endpoints
   - Enable caching
   - Add expert review workflow

2. **UI Components** (new)
   ```typescript
   // client/src/features/bills/ui/ConstitutionalAnalysis.tsx
   - Analysis summary
   - Rights impact
   - Precedents list
   - Conflicts display
   - Expert reviews
   ```

3. **Integration:**

## 10. Deployment Design

### 10.1 Deployment Strategy

```yaml
# Phased rollout
phases:
  - name: "Canary"
    percentage: 5
    duration: "24h"
    
  - name: "Beta"
    percentage: 25
    duration: "48h"
    
  - name: "General Availability"
    percentage: 100
    duration: "∞"
```

### 10.2 Rollback Plan

```typescript
// Automated rollback triggers
interface RollbackTrigger {
  errorRate: number;      // > 5%
  responseTime: number;   // > 2s
  healthCheck: boolean;   // failed
  manual: boolean;        // admin triggered
}
```

### 10.3 Infrastructure

- Docker containers for services
- Kubernetes for orchestration
- Terraform for infrastructure as code
- CI/CD pipeline (GitHub Actions)
- Blue-green deployment

---

**Design Status:** ✅ Refined  
**Refinements Applied:** 12/12 (All critical, high, and medium priority)  
**Next Step:** Begin implementation (Phase 0: Foundation)  
**Review Required:** Engineering Lead, Security Team

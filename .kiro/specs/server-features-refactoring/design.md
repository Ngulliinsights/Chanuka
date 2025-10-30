# Design Document

## Overview

This design document outlines a comprehensive refactoring strategy for the server/features directory that addresses critical security vulnerabilities, performance issues, and architectural inconsistencies identified across 150+ files. The design follows a phased approach that prioritizes security fixes, then tackles large file decomposition, and finally standardizes architectural patterns across all features.

## Architecture

### Current State Analysis

**Critical Issues Requiring Immediate Attention:**
- **Security Vulnerabilities**: Dynamic SQL queries in admin-router.ts, data privacy concerns in analytics
- **Unmaintainable File Sizes**: 8 files exceeding 1000 lines with mixed responsibilities
- **Mock Dependencies**: Extensive placeholder implementations across analysis, bills, and recommendation features
- **Architectural Inconsistency**: Mixed DDD and procedural patterns, inconsistent error handling
- **Performance Problems**: N+1 queries, memory leaks from custom caching, inefficient async patterns

**Strengths to Preserve:**
- Well-structured community, coverage, government-data, and privacy subdirectories
- Comprehensive test coverage in analysis subdirectory
- Good monitoring capabilities in bills subdirectory
- Advanced security features in security subdirectory

### Target Architecture

The refactored system will follow a consistent layered architecture across all features:

1. **Domain Layer**: Pure business logic with value objects and domain services
2. **Application Layer**: Use cases and application services with dependency injection
3. **Infrastructure Layer**: Database repositories, external service adapters, caching
4. **Presentation Layer**: API routes with standardized error handling and validation

**Architectural Principles:**
- **Single Responsibility**: Each service handles one specific concern
- **Dependency Inversion**: All external dependencies injected through interfaces
- **Consistent Error Handling**: Standardized error types and handling patterns
- **Centralized Cross-Cutting Concerns**: Unified logging, caching, and monitoring

## Components and Interfaces

### 1. Security Hardening Module

**Purpose**: Eliminate all identified security vulnerabilities and implement secure coding practices

**Components:**
```typescript
// Secure Query Builder
interface SecureQueryBuilder {
  buildParameterizedQuery(template: string, params: Record<string, any>): Query;
  validateInputs(inputs: unknown[]): ValidationResult;
  sanitizeOutput(data: any): any;
}

// Data Privacy Controller
interface DataPrivacyController {
  sanitizeUserData(data: UserData): SanitizedUserData;
  checkDataAccess(userId: string, dataType: string): AccessResult;
  auditDataAccess(userId: string, action: string, resource: string): void;
}

// Input Validation Service
interface InputValidationService {
  validateApiInput(schema: Schema, input: unknown): ValidationResult;
  sanitizeHtmlInput(input: string): string;
  validateFileUpload(file: FileUpload): ValidationResult;
}
```

**Implementation Strategy:**
- Replace all dynamic SQL in admin-router.ts with parameterized queries
- Implement data sanitization for engagement analytics
- Add comprehensive input validation to all API endpoints
- Complete TODO security implementations with proper authorization

### 2. File Decomposition Framework

**Purpose**: Break down oversized files into maintainable, focused modules

**Decomposition Strategy:**

#### Content Moderation Service (1487 lines → 6 services)
```typescript
// Moderation Workflow Orchestrator
interface ModerationOrchestrator {
  processContentSubmission(content: Content): Promise<ModerationResult>;
  handleModerationDecision(decision: ModerationDecision): Promise<void>;
}

// Content Analysis Service
interface ContentAnalysisService {
  analyzeContent(content: Content): Promise<AnalysisResult>;
  detectViolations(content: Content): Promise<Violation[]>;
}

// Moderation Queue Manager
interface ModerationQueueManager {
  addToQueue(item: ModerationItem): Promise<void>;
  getNextItem(moderatorId: string): Promise<ModerationItem>;
  updateItemStatus(itemId: string, status: ModerationStatus): Promise<void>;
}
```

#### Conflict Detection Service (1275 lines → 4 services)
```typescript
// Conflict Detection Engine
interface ConflictDetectionEngine {
  detectConflicts(entity: Entity): Promise<Conflict[]>;
  analyzeConflictSeverity(conflict: Conflict): ConflictSeverity;
}

// Stakeholder Analysis Service
interface StakeholderAnalysisService {
  identifyStakeholders(bill: Bill): Promise<Stakeholder[]>;
  analyzeStakeholderInterests(stakeholders: Stakeholder[]): Promise<InterestAnalysis>;
}
```

#### Financial Disclosure Service (1110 lines → 3 services)
```typescript
// Disclosure Processing Service
interface DisclosureProcessingService {
  processDisclosure(disclosure: RawDisclosure): Promise<ProcessedDisclosure>;
  validateDisclosureCompleteness(disclosure: Disclosure): ValidationResult;
}

// Financial Analysis Service
interface FinancialAnalysisService {
  analyzeFinancialImpacts(disclosure: Disclosure): Promise<FinancialImpact>;
  detectAnomalies(disclosure: Disclosure): Promise<Anomaly[]>;
}
```

### 3. Mock Implementation Replacement System

**Purpose**: Replace all mock implementations with real, production-ready services

**Implementation Approach:**

#### ML Service Integration
```typescript
// Real ML Service Adapter
class MLServiceAdapter implements MLAnalysisService {
  constructor(
    private httpClient: HttpClient,
    private fallbackAnalyzer: FallbackAnalyzer,
    private circuitBreaker: CircuitBreaker
  ) {}

  async analyzeBillContent(content: string): Promise<AnalysisResult> {
    try {
      return await this.circuitBreaker.execute(() => 
        this.httpClient.post('/ml/analyze', { content })
      );
    } catch (error) {
      return this.fallbackAnalyzer.analyze(content);
    }
  }
}

// Fallback Analysis Service
class FallbackAnalyzer {
  analyze(content: string): AnalysisResult {
    // Rule-based analysis when ML service unavailable
    return {
      sentiment: this.analyzeSentiment(content),
      topics: this.extractTopics(content),
      complexity: this.calculateComplexity(content)
    };
  }
}
```

#### Real Database Operations
```typescript
// Bill Repository Implementation
class BillRepositoryImpl implements BillRepository {
  constructor(
    private db: Database,
    private cache: CacheService,
    private logger: Logger
  ) {}

  async findById(id: string): Promise<Bill | null> {
    const cacheKey = `bill:${id}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const bill = await this.db.query(
      'SELECT * FROM bills WHERE id = $1',
      [id]
    );
    
    if (bill) {
      await this.cache.set(cacheKey, bill, 300); // 5 min TTL
    }
    
    return bill;
  }
}
```

### 4. Performance Optimization Engine

**Purpose**: Eliminate performance bottlenecks and implement efficient patterns

**Optimization Components:**

#### Unified Caching Strategy
```typescript
// Centralized Cache Manager
interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  getStats(): CacheStats;
}

// Cache Implementation with Memory Leak Prevention
class RedisCacheManager implements CacheManager {
  constructor(
    private redis: Redis,
    private memoryMonitor: MemoryMonitor
  ) {}

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    await this.memoryMonitor.checkMemoryUsage();
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

#### Query Optimization Framework
```typescript
// Query Optimizer
interface QueryOptimizer {
  optimizeQuery(query: Query): OptimizedQuery;
  addPagination(query: Query, page: number, limit: number): Query;
  preventNPlusOne(query: Query): Query;
}

// Batch Query Executor
class BatchQueryExecutor {
  async executeBatch<T>(queries: Query[]): Promise<T[]> {
    // Execute queries in parallel with connection pooling
    const results = await Promise.allSettled(
      queries.map(query => this.executeWithRetry(query))
    );
    
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    ).filter(Boolean);
  }
}
```

### 5. Architectural Standardization Framework

**Purpose**: Implement consistent DDD patterns across all features

**Standard Architecture Template:**
```typescript
// Domain Layer Structure
interface DomainEntity {
  id: EntityId;
  validate(): ValidationResult;
  applyBusinessRules(): void;
}

// Application Service Template
abstract class ApplicationService<TCommand, TResult> {
  constructor(
    protected repository: Repository,
    protected logger: Logger,
    protected eventBus: EventBus
  ) {}

  abstract execute(command: TCommand): Promise<TResult>;
  
  protected async handleError(error: Error): Promise<never> {
    this.logger.error('Service execution failed', { error });
    throw new ApplicationError(error.message);
  }
}

// Infrastructure Repository Template
abstract class BaseRepository<T extends DomainEntity> {
  constructor(
    protected db: Database,
    protected cache: CacheService,
    protected mapper: EntityMapper<T>
  ) {}

  abstract findById(id: string): Promise<T | null>;
  abstract save(entity: T): Promise<void>;
  abstract delete(id: string): Promise<void>;
}
```

## Data Models

### Refactoring Progress Tracking
```typescript
interface RefactoringProgress {
  featureId: string;
  phase: RefactoringPhase;
  completedTasks: string[];
  securityIssuesResolved: SecurityIssue[];
  performanceMetrics: PerformanceMetrics;
  testCoverage: number;
}

interface SecurityIssue {
  type: 'SQL_INJECTION' | 'DATA_PRIVACY' | 'INPUT_VALIDATION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  location: string;
  status: 'IDENTIFIED' | 'IN_PROGRESS' | 'RESOLVED';
}

interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  queryCount: number;
  cacheHitRate: number;
}
```

### Service Decomposition Mapping
```typescript
interface ServiceDecomposition {
  originalFile: string;
  originalLineCount: number;
  decomposedServices: DecomposedService[];
  migrationStrategy: MigrationStrategy;
}

interface DecomposedService {
  name: string;
  responsibility: string;
  lineCount: number;
  dependencies: string[];
  testCoverage: number;
}
```

## Error Handling

### Standardized Error Types
```typescript
// Domain Errors
class DomainError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DomainError';
  }
}

// Application Errors
class ApplicationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ApplicationError';
  }
}

// Infrastructure Errors
class InfrastructureError extends Error {
  constructor(message: string, public service: string) {
    super(message);
    this.name = 'InfrastructureError';
  }
}
```

### Error Handling Strategy
```typescript
// Global Error Handler
class GlobalErrorHandler {
  handle(error: Error, context: RequestContext): ErrorResponse {
    const correlationId = context.correlationId;
    
    this.logger.error('Request failed', {
      correlationId,
      error: error.message,
      stack: error.stack,
      context
    });

    if (error instanceof DomainError) {
      return new ErrorResponse(400, error.message, correlationId);
    }
    
    if (error instanceof ApplicationError) {
      return new ErrorResponse(500, 'Internal server error', correlationId);
    }
    
    return new ErrorResponse(500, 'Unexpected error', correlationId);
  }
}
```

## Testing Strategy

### Test Architecture
```typescript
// Unit Test Template
abstract class ServiceTest<T> {
  protected service: T;
  protected mockRepository: jest.Mocked<Repository>;
  protected mockLogger: jest.Mocked<Logger>;

  beforeEach() {
    this.setupMocks();
    this.service = this.createService();
  }

  abstract setupMocks(): void;
  abstract createService(): T;
}

// Integration Test Framework
class IntegrationTestFramework {
  async setupTestDatabase(): Promise<Database> {
    // Setup isolated test database
  }
  
  async seedTestData(): Promise<void> {
    // Seed with consistent test data
  }
  
  async cleanupAfterTest(): Promise<void> {
    // Clean up test artifacts
  }
}
```

### Performance Testing
```typescript
// Performance Test Suite
class PerformanceTestSuite {
  async testResponseTime(endpoint: string, expectedMs: number): Promise<void> {
    const start = Date.now();
    await this.makeRequest(endpoint);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(expectedMs);
  }
  
  async testMemoryUsage(operation: () => Promise<void>): Promise<void> {
    const initialMemory = process.memoryUsage();
    await operation();
    const finalMemory = process.memoryUsage();
    
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB limit
  }
}
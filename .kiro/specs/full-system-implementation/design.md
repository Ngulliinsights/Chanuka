# Design Document

## Overview

This design document outlines the comprehensive implementation strategy for transforming the Chanuka Legislative Transparency Platform from its current partially-functional state into a fully operational, production-ready system. The design focuses on systematic implementation of all core systems while maintaining the existing architectural foundation and leveraging the optimization work already completed.

## Architecture

### Current State Assessment

**Existing Infrastructure:**
- Well-designed database schema with comprehensive tables
- Express.js server with extensive route structure
- React frontend with lazy loading and error boundaries
- Caching layer and API response standardization
- WebSocket infrastructure for real-time features
- Authentication middleware and security foundations

**Critical Gaps:**
- Many routes return mock/sample data instead of database queries
- Authentication system exists but user registration/login flows are incomplete
- Real-time features are scaffolded but not fully functional
- Admin dashboard exists but lacks actual management functionality
- Search system needs full-text search implementation
- Comment system needs threading and moderation features

### Target Architecture

The fully implemented system will follow a layered architecture:

1. **Presentation Layer**: React frontend with complete UI components
2. **API Layer**: Express.js with fully functional endpoints
3. **Business Logic Layer**: Service classes with complete implementations
4. **Data Access Layer**: Database operations with proper ORM usage
5. **Infrastructure Layer**: Caching, monitoring, and external integrations

## Components and Interfaces

### 1. Database Integration and Data Management

**Purpose**: Replace sample data with complete database operations

**Current State**: Many endpoints return hardcoded sample data
**Target State**: All data operations use PostgreSQL with proper fallback

**Implementation Strategy:**

```typescript
// Database Service Layer
class DatabaseService {
  async withFallback<T>(
    operation: () => Promise<T>,
    fallbackData: T,
    context: string
  ): Promise<{ data: T; source: 'database' | 'fallback' }> {
    try {
      const data = await operation();
      return { data, source: 'database' };
    } catch (error) {
      console.error(`Database operation failed for ${context}:`, error);
      return { data: fallbackData, source: 'fallback' };
    }
  }
}

// Bill Service Implementation
class BillService {
  async getAllBills(filters: BillFilters): Promise<PaginatedBillResponse> {
    return this.db.withFallback(
      () => this.queryBillsFromDatabase(filters),
      this.getSampleBills(filters),
      'getAllBills'
    );
  }
}
```

**Database Seeding Strategy:**
- Create comprehensive seed data for development and testing
- Implement data migration scripts for production deployment
- Add data validation and integrity checks

### 2. Authentication and User Management System

**Purpose**: Complete user registration, authentication, and profile management

**Current State**: Authentication middleware exists but flows are incomplete
**Target State**: Full user lifecycle management with secure authentication

**Authentication Flow Design:**

```typescript
// Registration Flow
interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'citizen' | 'expert' | 'journalist' | 'advocate';
  expertise?: string[];
  organization?: string;
}

// Authentication Service
class AuthService {
  async register(data: RegistrationData): Promise<AuthResult> {
    // 1. Validate input data
    // 2. Check for existing user
    // 3. Hash password with bcrypt
    // 4. Create user and profile records
    // 5. Send verification email
    // 6. Return JWT token
  }

  async login(email: string, password: string): Promise<AuthResult> {
    // 1. Find user by email
    // 2. Verify password
    // 3. Update last login timestamp
    // 4. Generate JWT token
    // 5. Create session record
  }
}
```

**Session Management:**
- JWT tokens with refresh token rotation
- Session storage in database for revocation capability
- Automatic session cleanup for expired tokens
#
## 3. Bill Management and Legislative Data

**Purpose**: Complete implementation of bill CRUD operations and metadata management

**Current State**: Basic bill routes exist but lack full functionality
**Target State**: Comprehensive bill management with status tracking and engagement

**Bill Management Architecture:**

```typescript
// Bill Service with Complete Operations
class BillService {
  async createBill(billData: CreateBillData): Promise<Bill> {
    return this.db.transaction(async (tx) => {
      // 1. Create bill record
      const bill = await tx.insert(bills).values(billData).returning();
      
      // 2. Create initial sponsorship records
      if (billData.sponsors) {
        await this.createSponsorships(tx, bill.id, billData.sponsors);
      }
      
      // 3. Process and store bill content analysis
      await this.analyzeAndStoreBillContent(tx, bill.id, billData.content);
      
      // 4. Create initial engagement tracking
      await this.initializeBillEngagement(tx, bill.id);
      
      return bill;
    });
  }

  async updateBillStatus(billId: number, newStatus: string, userId: string): Promise<void> {
    const oldBill = await this.getBillById(billId);
    
    await this.db.transaction(async (tx) => {
      // 1. Update bill status
      await tx.update(bills)
        .set({ status: newStatus, lastActionDate: new Date() })
        .where(eq(bills.id, billId));
      
      // 2. Create status change audit log
      await this.auditService.logStatusChange(tx, billId, oldBill.status, newStatus, userId);
      
      // 3. Trigger notifications to tracking users
      await this.notificationService.notifyBillStatusChange(billId, oldBill.status, newStatus);
      
      // 4. Update search index
      await this.searchService.updateBillIndex(billId);
    });
  }
}
```

### 4. Real-Time Tracking and Notifications

**Purpose**: Implement comprehensive real-time updates and multi-channel notifications

**Current State**: WebSocket infrastructure exists but notification system is incomplete
**Target State**: Full real-time updates with email, in-app, and push notifications

**Real-Time Architecture:**

```typescript
// WebSocket Service Enhancement
class WebSocketService {
  private connections = new Map<string, WebSocket>();
  private userSubscriptions = new Map<string, Set<string>>();

  async notifyBillUpdate(billId: number, updateType: string, data: any): Promise<void> {
    // 1. Get all users tracking this bill
    const trackingUsers = await this.billTrackingService.getTrackingUsers(billId);
    
    // 2. Send real-time updates via WebSocket
    for (const userId of trackingUsers) {
      await this.sendToUser(userId, {
        type: 'bill_update',
        billId,
        updateType,
        data,
        timestamp: new Date()
      });
    }
    
    // 3. Queue email notifications for users with email preferences
    await this.emailService.queueBillUpdateEmails(billId, updateType, data);
  }
}

// Notification Service
class NotificationService {
  async createNotification(data: CreateNotificationData): Promise<void> {
    // 1. Store notification in database
    const notification = await this.db.insert(notifications).values(data).returning();
    
    // 2. Send real-time notification
    await this.webSocketService.sendToUser(data.userId, {
      type: 'notification',
      notification
    });
    
    // 3. Check user preferences for additional channels
    const user = await this.userService.getUserById(data.userId);
    if (user.preferences?.emailNotifications) {
      await this.emailService.sendNotificationEmail(user, notification);
    }
  }
}
```

### 5. Sponsor Analysis and Transparency Features

**Purpose**: Implement comprehensive sponsor conflict detection and transparency analysis

**Current State**: Basic sponsor data structure exists
**Target State**: Advanced conflict detection with visual analysis tools

**Transparency Analysis Engine:**

```typescript
// Conflict Detection Service
class ConflictDetectionService {
  async analyzeSponsorConflicts(sponsorId: number): Promise<ConflictAnalysis> {
    const sponsor = await this.getSponsorWithAffiliations(sponsorId);
    const bills = await this.getSponsorBills(sponsorId);
    
    const conflicts: ConflictItem[] = [];
    
    // 1. Financial conflict analysis
    const financialConflicts = await this.analyzeFinancialConflicts(sponsor, bills);
    conflicts.push(...financialConflicts);
    
    // 2. Professional relationship conflicts
    const professionalConflicts = await this.analyzeProfessionalConflicts(sponsor, bills);
    conflicts.push(...professionalConflicts);
    
    // 3. Voting pattern inconsistencies
    const votingConflicts = await this.analyzeVotingPatterns(sponsor, bills);
    conflicts.push(...votingConflicts);
    
    return {
      sponsorId,
      overallRiskLevel: this.calculateRiskLevel(conflicts),
      conflicts,
      recommendations: this.generateRecommendations(conflicts),
      lastAnalyzed: new Date()
    };
  }
}
```

### 6. Search and Discovery System

**Purpose**: Implement comprehensive full-text search with advanced filtering

**Current State**: Basic search exists but lacks full-text capabilities
**Target State**: Advanced search with ranking, filtering, and suggestion features

**Search Architecture:**

```typescript
// Search Service with Full-Text Search
class SearchService {
  async searchBills(query: SearchQuery): Promise<SearchResults> {
    const searchVector = this.buildSearchVector(query);
    
    // 1. Execute full-text search with ranking
    const results = await this.db
      .select({
        bill: bills,
        rank: sql<number>`ts_rank(search_vector, ${searchVector})`,
        snippet: sql<string>`ts_headline('english', content, ${searchVector})`
      })
      .from(bills)
      .where(and(
        sql`search_vector @@ ${searchVector}`,
        ...this.buildFilters(query.filters)
      ))
      .orderBy(sql`ts_rank(search_vector, ${searchVector}) DESC`)
      .limit(query.limit)
      .offset(query.offset);

    return {
      results: enhancedResults,
      totalCount: await this.getSearchCount(searchVector, query.filters),
      suggestions: results.length === 0 ? await this.generateSearchSuggestions(query.text) : [],
      facets: await this.generateSearchFacets(query)
    };
  }
}
```

## Data Models

### Enhanced Database Schema

```typescript
// Add search vector column to bills table
const bills = pgTable("bills", {
  // ... existing columns
  searchVector: sql`tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'C')
  ) STORED`
});

// Moderation queue table
const moderationQueue = pgTable("moderation_queue", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(),
  contentId: integer("content_id").notNull(),
  flags: jsonb("flags").notNull(),
  priority: integer("priority").notNull(),
  status: text("status").notNull().default("pending"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow()
});
```

## Error Handling

### Comprehensive Error Management

```typescript
// Enhanced Error Handler
class ErrorHandler {
  static async handleDatabaseError(error: Error, context: string): Promise<ApiResponse<null>> {
    // Log error with full context
    await this.logError(error, context);
    
    // Determine if this is a recoverable error
    if (this.isRecoverableError(error)) {
      return this.handleRecoverableError(error, context);
    }
    
    return {
      success: false,
      error: {
        code: this.getErrorCode(error),
        message: this.getUserFriendlyMessage(error),
        context
      },
      metadata: {
        source: 'database',
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      }
    };
  }
}
```

## Testing Strategy

### Comprehensive Testing Approach

- **Unit Tests**: All service classes and utility functions
- **Integration Tests**: Database operations and API endpoints
- **Performance Tests**: Response time and load testing
- **End-to-End Tests**: Complete user workflows

## Deployment Strategy

### Phased Implementation Plan

**Phase 1: Core Data Operations (Week 1-2)**
- Complete database integration
- Implement user authentication
- Basic bill CRUD operations

**Phase 2: Real-Time Features (Week 3-4)**
- WebSocket implementation
- Notification system
- Bill tracking functionality

**Phase 3: Advanced Features (Week 5-6)**
- Search system implementation
- Comment system with threading
- Sponsor analysis tools

**Phase 4: Admin and Monitoring (Week 7-8)**
- Admin dashboard completion
- Monitoring and alerting
- Performance optimization

## Monitoring and Observability

### System Health Monitoring

```typescript
// Health Check Service
class HealthCheckService {
  async getSystemHealth(): Promise<SystemHealth> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalAPIs(),
      this.checkSearchIndex(),
      this.checkWebSocketService()
    ]);

    return {
      overall: this.calculateOverallHealth(checks),
      components: {
        database: this.getCheckResult(checks[0]),
        cache: this.getCheckResult(checks[1]),
        externalAPIs: this.getCheckResult(checks[2]),
        search: this.getCheckResult(checks[3]),
        realTime: this.getCheckResult(checks[4])
      },
      timestamp: new Date()
    };
  }
}
```

This comprehensive design provides the foundation for implementing all missing functionality in the Chanuka Legislative Transparency Platform, transforming it from a partially-functional prototype into a complete, production-ready system.
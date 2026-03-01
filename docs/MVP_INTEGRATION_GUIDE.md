# MVP Integration Guide

## Overview

This guide explains how to integrate the core features of the Chanuka platform to create a functional MVP.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Bills    │  │ Community  │  │   Search   │            │
│  │    UI      │  │     UI     │  │     UI     │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │               │               │                     │
│  ┌─────▼───────────────▼───────────────▼──────┐            │
│  │        API Client (Axios + Interceptors)    │            │
│  └─────────────────────┬────────────────────────┘            │
└────────────────────────┼─────────────────────────────────────┘
                         │ HTTP/REST
                         │ (localhost:4200/api)
┌────────────────────────▼─────────────────────────────────────┐
│                     SERVER (Express)                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Bills    │  │ Community  │  │   Search   │            │
│  │  Routes    │  │   Routes   │  │   Routes   │            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │               │               │                     │
│  ┌─────▼───────────────▼───────────────▼──────┐            │
│  │         Application Services                 │            │
│  └─────────────────────┬────────────────────────┘            │
│                        │                                      │
│  ┌─────────────────────▼────────────────────────┐            │
│  │         Infrastructure Services               │            │
│  │  (Database, Cache, Security, Validation)     │            │
│  └─────────────────────┬────────────────────────┘            │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  PostgreSQL  │
                  │   Database   │
                  └──────────────┘
```

## Core Features Integration

### 1. Bills Feature

**Backend**: ✅ Complete
- Routes: `/api/bills/*`
- Services: `BillService`, `BillRepository`
- Database: `bills` table with full schema

**Frontend**: ✅ Complete
- Pages: `BillsPortalPage`, `BillDetail`, `BillsDashboard`
- Services: `billsApiService`
- State: Redux + React Query

**Integration Points**:
```typescript
// Client calls
GET  /api/bills                    // List bills with pagination
GET  /api/bills/:id                // Get bill details
POST /api/bills/:id/track          // Track a bill
GET  /api/bills/:id/comments       // Get bill comments
POST /api/bills/:id/comments       // Add comment
GET  /api/bills/:id/analysis       // Get bill analysis
```

**Status**: ✅ Fully integrated

### 2. Community Feature

**Backend**: ✅ Complete
- Routes: `/api/community/*`
- Services: `CommunityService`, `CommentRepository`
- Database: `comments` table

**Frontend**: ✅ Complete
- Pages: `CommunityHub`
- Components: Comment threads, voting
- Services: Community API client

**Integration Points**:
```typescript
// Client calls
GET  /api/community/comments       // Get all comments
POST /api/community/comments       // Create comment
POST /api/comments/:id/vote        // Vote on comment
POST /api/comments/:id/endorse     // Endorse comment (experts)
```

**Status**: ✅ Fully integrated

### 3. Search Feature

**Backend**: ✅ Complete
- Routes: `/api/search/*`
- Services: `SearchService`
- Database: Full-text search on bills

**Frontend**: ✅ Complete
- Pages: `UniversalSearchPage`
- Components: Search bar, filters, results
- Services: Search API client

**Integration Points**:
```typescript
// Client calls
GET /api/search?q=query&filters=... // Search bills
GET /api/search/suggestions         // Get search suggestions
```

**Status**: ✅ Fully integrated

### 4. Notifications Feature

**Backend**: ✅ Complete
- Routes: `/api/notifications/*`
- Services: `NotificationsService`
- Database: `notifications` table
- Scheduler: Background notification processing

**Frontend**: ⚠️ Partial
- Components: Notification bell, list
- Services: Notifications API client
- Missing: Real-time push notifications

**Integration Points**:
```typescript
// Client calls
GET  /api/notifications            // Get user notifications
POST /api/notifications/:id/read   // Mark as read
GET  /api/notifications/preferences // Get preferences
PUT  /api/notifications/preferences // Update preferences
```

**Status**: ⚠️ Needs real-time WebSocket integration

### 5. Intelligence Features

#### 5.1 Pretext Detection

**Backend**: ✅ Complete
- Routes: `/api/pretext-detection/*`
- Services: `PretextDetectionService`
- Database: `pretext_detection_results` table

**Frontend**: ⚠️ Partial
- Pages: `PretextDetectionPage` (skeleton)
- Missing: Results display, integration with bill detail

**Integration Points**:
```typescript
// Client calls
POST /api/pretext-detection/analyze  // Analyze bill for trojans
GET  /api/pretext-detection/:billId  // Get detection results
```

**Status**: ⚠️ Needs UI completion

#### 5.2 Constitutional Analysis

**Backend**: ✅ Complete
- Routes: `/api/constitutional-analysis/*`
- Services: `ConstitutionalAnalysisService`

**Frontend**: ⚠️ Partial
- Missing: Constitutional impact display

**Integration Points**:
```typescript
// Client calls
POST /api/constitutional-analysis/analyze  // Analyze bill
GET  /api/constitutional-analysis/:billId  // Get analysis
```

**Status**: ⚠️ Needs UI completion

#### 5.3 Argument Intelligence

**Backend**: ✅ Complete
- Routes: `/api/argument-intelligence/*`
- Services: `ArgumentIntelligenceService`
- Database: `argument_analysis` table

**Frontend**: ⚠️ Partial
- Pages: `ArgumentIntelligencePage`
- Missing: Argument clustering display

**Integration Points**:
```typescript
// Client calls
POST /api/argument-intelligence/analyze  // Analyze arguments
GET  /api/argument-intelligence/:billId  // Get analysis
```

**Status**: ⚠️ Needs UI completion

### 6. Recommendation Feature

**Backend**: ✅ Complete
- Routes: `/api/recommendation/*`
- Services: `RecommendationService`

**Frontend**: ⚠️ Basic
- Missing: Personalized feed, preference learning

**Integration Points**:
```typescript
// Client calls
GET /api/recommendation/bills      // Get recommended bills
GET /api/recommendation/topics     // Get recommended topics
```

**Status**: ⚠️ Needs personalization enhancement

## Setup Instructions

### 1. Environment Configuration

Ensure `.env` file has correct values:

```bash
# Server
PORT=4200
NODE_ENV=development
DATABASE_URL=postgresql://...

# Client (VITE_ prefix for client access)
VITE_API_BASE_URL=http://localhost:4200/api
VITE_NODE_ENV=development
```

### 2. Database Setup

```bash
# Initialize database
npm run db:init

# Run migrations
npm run db:migrate

# Seed data (optional)
npm run db:seed:comprehensive
```

### 3. Start Development Servers

```bash
# Start both client and server
npm run dev

# Or start separately
npm run dev:server  # Port 4200
npm run dev:client  # Port 5173 (proxies to 4200)
```

### 4. Test Integration

```bash
# Run integration test
tsx scripts/test-mvp-integration.ts

# Or manually test endpoints
curl http://localhost:4200/api/frontend-health
curl http://localhost:4200/api/bills
```

## Integration Checklist

### Core Features (MVP Ready)
- [x] Bills - List, detail, tracking
- [x] Community - Comments, voting
- [x] Search - Full-text search
- [x] Users - Authentication, profiles
- [x] Notifications - Basic alerts
- [x] Security - Input validation, sanitization
- [x] Database - Schema, migrations
- [x] Caching - Redis/memory cache
- [x] Logging - Structured logging

### Intelligence Features (Needs UI)
- [x] Pretext Detection - Backend complete
- [ ] Pretext Detection - UI integration
- [x] Constitutional Analysis - Backend complete
- [ ] Constitutional Analysis - UI integration
- [x] Argument Intelligence - Backend complete
- [ ] Argument Intelligence - UI integration
- [ ] Recommendations - Personalization

### Advanced Features (Future)
- [ ] Real-time Updates - WebSocket integration
- [ ] Analytics Dashboard - Admin UI
- [ ] Advocacy Campaigns - Coordination
- [ ] Graph Database - Network analysis
- [ ] ML Models - Predictions
- [ ] USSD Access - Feature phone support

## Common Issues & Solutions

### Issue: API calls fail with CORS errors
**Solution**: Ensure server CORS is configured for client origin:
```typescript
// server/index.ts
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

### Issue: 404 on API endpoints
**Solution**: Check API base URL in client config:
```typescript
// client/src/infrastructure/api/config.ts
baseUrl: 'http://localhost:4200/api'
```

### Issue: Database connection fails
**Solution**: Verify DATABASE_URL in .env and run health check:
```bash
npm run db:health
```

### Issue: Authentication not working
**Solution**: Ensure JWT_SECRET is set and session middleware is configured

## Next Steps

1. **Complete Intelligence UIs**: Build UI components for pretext detection, constitutional analysis, and argument intelligence
2. **Enhance Recommendations**: Implement collaborative filtering and user preference learning
3. **Add Real-time Updates**: Complete WebSocket integration for live notifications
4. **Build Analytics Dashboard**: Create admin dashboard for platform metrics
5. **Security Hardening**: Complete SQL injection prevention and XSS protection
6. **Performance Optimization**: Add caching to high-traffic endpoints
7. **Testing**: Write integration tests for all features
8. **Documentation**: Complete API documentation

## Resources

- **API Documentation**: `/docs/api`
- **Architecture Decisions**: `/docs/adr`
- **Database Schema**: `/server/infrastructure/database/schema`
- **Integration Tests**: `/tests/integration`
- **Spec System**: `/.agent/specs`

## Support

For issues or questions:
1. Check server logs: `npm run dev:server`
2. Check client console: Browser DevTools
3. Run health checks: `npm run db:health`
4. Review integration test: `tsx scripts/test-mvp-integration.ts`

# Schema Domain Relationships & New Functionality

## Component Relationships

The three key components work together to provide end-to-end type safety and validation:

### 1. **`shared/schema/validate-schemas.ts`** - Schema Compilation Validator
- **Purpose**: Ensures all domain schemas compile correctly without TypeScript errors
- **Role**: Development-time validation and CI/CD integration
- **Dependencies**: All domain schema files

### 2. **`shared/core/src/validation/schemas`** - Runtime Data Validation
- **Purpose**: Validates data at runtime using Zod schemas
- **Role**: API request/response validation, form validation, data integrity
- **Dependencies**: Core types from `shared/core/src/types`

### 3. **`shared/core/src/types/index.ts`** - TypeScript Type Definitions
- **Purpose**: Provides TypeScript types that correspond to database schemas
- **Role**: Compile-time type safety across frontend and backend
- **Dependencies**: Database schema definitions

## Data Flow Architecture

```
Database Schema (Drizzle) → TypeScript Types → Runtime Validation (Zod) → Frontend Components
                ↓                    ↓                     ↓
            Migration Scripts    API Contracts      Form Validation
```

## New Domain Files Created

Based on the provided SQL files, I've created four new domain schema files that add critical missing functionality:

### 1. **`transparency_intelligence.ts`** - Financial Transparency & Conflict Detection

**Tables Added:**
- `financialDisclosures` - Sponsor financial disclosure tracking
- `financialInterests` - Detailed financial interest breakdown  
- `conflictDetections` - AI-powered conflict of interest detection
- `influenceNetworks` - Relationship mapping between entities
- `implementationWorkarounds` - Track how rejected bills get implemented via other means

**Key Features:**
- **Financial Exposure Tracking**: "KSh 28.7M Financial Exposure" style analysis
- **Network Visualization**: Interactive mapping of organizational connections
- **Transparency Scoring**: Algorithmic assessment of disclosure completeness
- **Workaround Detection**: Monitor alternative implementation pathways

**Strategic Value**: Core to Chanuka's transparency mission - enables "follow the money" functionality

### 2. **`expert_verification.ts`** - Expert Credibility & Verification System

**Tables Added:**
- `expertCredentials` - Academic/professional credential tracking
- `expertDomains` - Domain expertise mapping
- `credibilityScores` - Dynamic credibility scoring system
- `expertReviews` - Expert review and validation workflow
- `peerValidations` - Peer-to-peer expert validation
- `expertActivity` - Expert contribution tracking

**Key Features:**
- **Expert Badges**: "Official Expert", "Healthcare Expert", "Verified" badges
- **Credibility Scoring**: Numerical ratings with community validation
- **Professional Context**: Detailed expert backgrounds and affiliations
- **Verification Workflow**: Complete system for reviewing expert contributions

**Strategic Value**: Critical for combating misinformation and building public trust

### 3. **`advanced_discovery.ts`** - Intelligent Search & Discovery

**Tables Added:**
- `searchQueries` - Search intent and context tracking
- `discoveryPatterns` - AI-detected patterns in legislation
- `billRelationships` - Semantic relationships between bills
- `searchAnalytics` - Search behavior analytics
- `trendingTopics` - Dynamic trending topic detection
- `userRecommendations` - Personalized recommendation engine

**Key Features:**
- **Smart Categorization**: AI-powered categorization beyond traditional topics
- **Controversy Level Filtering**: "High Controversy", "Medium Controversy" filters
- **Multi-Dimensional Search**: Combine multiple filter types for precise discovery
- **Semantic Relationships**: Understanding how bills relate to each other

**Strategic Value**: Helps users navigate large volumes of legislative content intelligently

### 4. **`real_time_engagement.ts`** - Live Engagement & Gamification

**Tables Added:**
- `engagementEvents` - Real-time user interaction tracking (partitioned)
- `liveMetricsCache` - Cached real-time metrics for performance
- `civicAchievements` - Gamification achievement system
- `userAchievements` - User achievement tracking
- `civicScores` - Comprehensive civic engagement scoring
- `engagementLeaderboards` - Community leaderboards
- `realTimeNotifications` - Live notification system
- `engagementAnalytics` - Engagement pattern analysis

**Key Features:**
- **Live Engagement Metrics**: "89% Community Approval", "4,238 Participants"
- **Gamification System**: Bronze/Silver/Gold/Platinum achievements
- **Real-Time Analytics**: Live community participation tracking
- **Civic Scoring**: Personal civic engagement scores and rankings

**Strategic Value**: Encourages continued participation through visible impact metrics

## Integration Points

### Database Level
- All new domains properly reference existing `users`, `bills`, and `sponsors` tables
- Foreign key relationships maintain referential integrity
- Proper indexing for performance optimization

### API Level
- New TypeScript types exported from main schema index
- Runtime validation schemas can be generated from these types
- Consistent naming conventions across all domains

### Frontend Level
- Components can import types directly from schema
- Real-time features integrate with WebSocket infrastructure
- Analytics dashboards can consume live metrics

## Technical Implementation Notes

### Performance Considerations
- `engagementEvents` table is partitioned by time for scalability
- `liveMetricsCache` uses TTL-based cleanup for performance
- Proper indexing on high-query columns

### Data Integrity
- Unique constraints prevent duplicate relationships
- Check constraints ensure data validity
- Audit trails throughout for transparency

### Scalability Preparation
- Schema designed for eventual multi-database architecture
- Partitioning strategy for high-volume tables
- Caching layer for real-time metrics

## Validation Results

✅ **All schema files compile successfully**
- `transparency_intelligence.ts` - ✓ Compiled
- `expert_verification.ts` - ✓ Compiled  
- `advanced_discovery.ts` - ✓ Compiled
- `real_time_engagement.ts` - ✓ Compiled
- `index.ts` - ✓ Compiled with all exports

✅ **No TypeScript errors or warnings**
✅ **Proper foreign key relationships**
✅ **Consistent naming conventions**
✅ **Complete type safety**

## Next Steps

1. **Database Migration**: Create Drizzle migration scripts for the new tables
2. **API Integration**: Implement service layer methods for new domains
3. **Frontend Components**: Build UI components that consume the new data
4. **Testing**: Add comprehensive tests for new domain functionality
5. **Documentation**: Update API documentation with new endpoints

This comprehensive schema expansion enables all the strategic UI features identified in the mock files while maintaining the platform's architectural integrity and performance requirements.
# New Domains Integration Guide

## Overview

This guide covers the integration of four new domain schemas that add critical missing functionality to the Chanuka platform. These domains enable advanced transparency analysis, expert verification, intelligent discovery, and real-time engagement features.

## New Domains Added

### 1. Transparency Intelligence Domain
**File**: `shared/schema/transparency_intelligence.ts`

**Purpose**: Financial transparency, conflict detection, and influence network tracking

**Key Tables**:
- `financialDisclosures` - Sponsor financial disclosure tracking
- `financialInterests` - Detailed financial interest breakdown
- `conflictDetections` - AI-powered conflict of interest detection
- `influenceNetworks` - Relationship mapping between entities
- `implementationWorkarounds` - Track alternative implementation pathways

**Integration Points**:
```typescript
// Import types
import { 
  FinancialDisclosure, 
  ConflictDetection, 
  InfluenceNetwork 
} from 'shared/schema';

// Use in components
const ConflictAnalysis: React.FC<{ billId: string }> = ({ billId }) => {
  const conflicts = useQuery(['conflicts', billId], () => 
    api.getConflictDetections(billId)
  );
  // Component implementation
};
```

### 2. Expert Verification Domain
**File**: `shared/schema/expert_verification.ts`

**Purpose**: Expert credibility scoring and verification system

**Key Tables**:
- `expertCredentials` - Academic/professional credential tracking
- `expertDomains` - Domain expertise mapping
- `credibilityScores` - Dynamic credibility scoring
- `expertReviews` - Expert review workflow
- `peerValidations` - Peer-to-peer validation
- `expertActivity` - Expert contribution tracking

**Integration Points**:
```typescript
// Import types
import { 
  ExpertCredential, 
  CredibilityScore, 
  ExpertReview 
} from 'shared/schema';

// Use in components
const ExpertBadge: React.FC<{ userId: string }> = ({ userId }) => {
  const credibility = useQuery(['credibility', userId], () => 
    api.getCredibilityScore(userId)
  );
  // Badge rendering logic
};
```

### 3. Advanced Discovery Domain
**File**: `shared/schema/advanced_discovery.ts`

**Purpose**: Intelligent search, discovery patterns, and bill relationships

**Key Tables**:
- `searchQueries` - Search intent and context tracking
- `discoveryPatterns` - AI-detected patterns
- `billRelationships` - Semantic bill relationships
- `searchAnalytics` - Search behavior analytics
- `trendingTopics` - Dynamic trending detection
- `userRecommendations` - Personalized recommendations

**Integration Points**:
```typescript
// Import types
import { 
  SearchQuery, 
  BillRelationship, 
  UserRecommendation 
} from 'shared/schema';

// Use in search components
const IntelligentSearch: React.FC = () => {
  const recommendations = useQuery(['recommendations'], () => 
    api.getUserRecommendations()
  );
  // Search interface implementation
};
```

### 4. Real-Time Engagement Domain
**File**: `shared/schema/real_time_engagement.ts`

**Purpose**: Live engagement tracking, gamification, and real-time analytics

**Key Tables**:
- `engagementEvents` - Real-time interaction tracking
- `liveMetricsCache` - Cached real-time metrics
- `civicAchievements` - Achievement system
- `userAchievements` - User achievement tracking
- `civicScores` - Civic engagement scoring
- `engagementLeaderboards` - Community leaderboards
- `realTimeNotifications` - Live notifications
- `engagementAnalytics` - Engagement analysis

**Integration Points**:
```typescript
// Import types
import { 
  EngagementEvent, 
  CivicScore, 
  UserAchievement 
} from 'shared/schema';

// Use in analytics components
const CivicScoreCard: React.FC<{ userId: string }> = ({ userId }) => {
  const score = useQuery(['civicScore', userId], () => 
    api.getCivicScore(userId)
  );
  // Score display implementation
};
```

## Database Migration Strategy

### Step 1: Create Migration Files
```bash
# Generate migration for new domains
npx drizzle-kit generate:pg --schema=shared/schema/transparency_intelligence.ts
npx drizzle-kit generate:pg --schema=shared/schema/expert_verification.ts
npx drizzle-kit generate:pg --schema=shared/schema/advanced_discovery.ts
npx drizzle-kit generate:pg --schema=shared/schema/real_time_engagement.ts
```

### Step 2: Run Migrations
```bash
# Apply migrations to database
npx drizzle-kit push:pg
```

### Step 3: Verify Schema
```bash
# Validate schema compilation
npm run validate-schemas
```

## API Integration

### Service Layer Updates

Create new service files for each domain:

**`server/src/services/transparency-intelligence.service.ts`**:
```typescript
import { 
  financialDisclosures, 
  conflictDetections, 
  influenceNetworks 
} from 'shared/schema';

export class TransparencyIntelligenceService {
  async getConflictDetections(billId: string) {
    return await db.select()
      .from(conflictDetections)
      .where(eq(conflictDetections.billId, billId));
  }

  async analyzeFinancialConflicts(sponsorId: string, billId: string) {
    // AI-powered conflict detection logic
  }
}
```

**`server/src/services/expert-verification.service.ts`**:
```typescript
import { 
  expertCredentials, 
  credibilityScores, 
  expertReviews 
} from 'shared/schema';

export class ExpertVerificationService {
  async getCredibilityScore(userId: string, domain?: string) {
    return await db.select()
      .from(credibilityScores)
      .where(eq(credibilityScores.userId, userId));
  }

  async submitExpertReview(reviewData: NewExpertReview) {
    // Expert review submission logic
  }
}
```

### API Routes

**`server/src/routes/transparency.routes.ts`**:
```typescript
import { Router } from 'express';
import { TransparencyIntelligenceService } from '../services/transparency-intelligence.service';

const router = Router();
const transparencyService = new TransparencyIntelligenceService();

router.get('/conflicts/:billId', async (req, res) => {
  const conflicts = await transparencyService.getConflictDetections(req.params.billId);
  res.json(conflicts);
});

router.get('/influence-networks/:entityId', async (req, res) => {
  const networks = await transparencyService.getInfluenceNetworks(req.params.entityId);
  res.json(networks);
});

export default router;
```

## Frontend Integration

### Repository Layer Updates

**`client/src/repositories/transparency.ts`**:
```typescript
import { apiClient } from '../core/api/client';
import type { ConflictDetection, InfluenceNetwork } from 'shared/schema';

export const transparencyRepository = {
  getConflictDetections: (billId: string): Promise<ConflictDetection[]> =>
    apiClient.get(`/api/transparency/conflicts/${billId}`),

  getInfluenceNetworks: (entityId: string): Promise<InfluenceNetwork[]> =>
    apiClient.get(`/api/transparency/influence-networks/${entityId}`),

  getFinancialDisclosures: (sponsorId: string) =>
    apiClient.get(`/api/transparency/disclosures/${sponsorId}`)
};
```

### Redux Store Integration

**`client/src/store/slices/transparencySlice.ts`**:
```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { transparencyRepository } from '../../repositories/transparency';
import type { ConflictDetection } from 'shared/schema';

interface TransparencyState {
  conflicts: ConflictDetection[];
  loading: boolean;
  error: string | null;
}

export const fetchConflicts = createAsyncThunk(
  'transparency/fetchConflicts',
  async (billId: string) => {
    return await transparencyRepository.getConflictDetections(billId);
  }
);

const transparencySlice = createSlice({
  name: 'transparency',
  initialState: {
    conflicts: [],
    loading: false,
    error: null
  } as TransparencyState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchConflicts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchConflicts.fulfilled, (state, action) => {
        state.loading = false;
        state.conflicts = action.payload;
      })
      .addCase(fetchConflicts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch conflicts';
      });
  }
});

export default transparencySlice.reducer;
```

### Component Integration

**`client/src/components/transparency/ConflictAnalysisPanel.tsx`**:
```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { transparencyRepository } from '../../repositories/transparency';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ConflictAnalysisPanelProps {
  billId: string;
  sponsorId: string;
}

export const ConflictAnalysisPanel: React.FC<ConflictAnalysisPanelProps> = ({
  billId,
  sponsorId
}) => {
  const { data: conflicts, isLoading } = useQuery({
    queryKey: ['conflicts', billId],
    queryFn: () => transparencyRepository.getConflictDetections(billId)
  });

  if (isLoading) return <div>Loading conflict analysis...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conflict of Interest Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        {conflicts?.map((conflict) => (
          <div key={conflict.id} className="mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={conflict.severityLevel === 'high' ? 'destructive' : 'secondary'}>
                {conflict.severityLevel}
              </Badge>
              <span className="font-medium">{conflict.conflictType}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Confidence: {conflict.confidenceScore}%
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
```

## Real-Time Features Integration

### WebSocket Integration

**`client/src/services/real-time-engagement.service.ts`**:
```typescript
import { WebSocketManager } from '../core/api/websocket';
import type { EngagementEvent, RealTimeNotification } from 'shared/schema';

export class RealTimeEngagementService {
  private wsManager: WebSocketManager;

  constructor() {
    this.wsManager = new WebSocketManager();
  }

  subscribeToEngagementEvents(callback: (event: EngagementEvent) => void) {
    return this.wsManager.subscribe('engagement:events', callback);
  }

  subscribeToNotifications(userId: string, callback: (notification: RealTimeNotification) => void) {
    return this.wsManager.subscribe(`notifications:${userId}`, callback);
  }

  trackEngagement(event: Partial<EngagementEvent>) {
    this.wsManager.send('engagement:track', event);
  }
}
```

### Gamification Integration

**`client/src/hooks/useCivicScore.ts`**:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engagementRepository } from '../repositories/engagement';
import type { CivicScore, UserAchievement } from 'shared/schema';

export const useCivicScore = (userId: string) => {
  const queryClient = useQueryClient();

  const { data: score, isLoading } = useQuery({
    queryKey: ['civicScore', userId],
    queryFn: () => engagementRepository.getCivicScore(userId)
  });

  const { data: achievements } = useQuery({
    queryKey: ['achievements', userId],
    queryFn: () => engagementRepository.getUserAchievements(userId)
  });

  const trackEngagement = useMutation({
    mutationFn: engagementRepository.trackEngagement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['civicScore', userId] });
    }
  });

  return {
    score,
    achievements,
    isLoading,
    trackEngagement: trackEngagement.mutate
  };
};
```

## Testing Strategy

### Unit Tests

**`shared/schema/__tests__/transparency-intelligence.test.ts`**:
```typescript
import { describe, it, expect } from 'vitest';
import { 
  financialDisclosures, 
  conflictDetections 
} from '../transparency_intelligence';

describe('Transparency Intelligence Schema', () => {
  it('should have proper table structure', () => {
    expect(financialDisclosures).toBeDefined();
    expect(conflictDetections).toBeDefined();
  });

  it('should have proper foreign key relationships', () => {
    // Test foreign key constraints
  });
});
```

### Integration Tests

**`client/src/__tests__/transparency-integration.test.tsx`**:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConflictAnalysisPanel } from '../components/transparency/ConflictAnalysisPanel';

describe('Transparency Integration', () => {
  it('should display conflict analysis', async () => {
    const queryClient = new QueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <ConflictAnalysisPanel billId="test-bill" sponsorId="test-sponsor" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Conflict of Interest Analysis')).toBeInTheDocument();
    });
  });
});
```

## Performance Considerations

### Database Optimization

1. **Indexing Strategy**:
   - All high-query columns are properly indexed
   - Composite indexes for complex queries
   - Partial indexes for filtered queries

2. **Partitioning**:
   - `engagementEvents` table partitioned by time
   - Automatic partition management

3. **Caching**:
   - `liveMetricsCache` for real-time performance
   - TTL-based cleanup for stale data

### Frontend Optimization

1. **Query Optimization**:
   - React Query for caching and background updates
   - Optimistic updates for engagement tracking
   - Debounced search queries

2. **Component Optimization**:
   - Lazy loading for heavy components
   - Memoization for expensive calculations
   - Virtual scrolling for large lists

## Deployment Checklist

- [ ] Database migrations applied
- [ ] New API endpoints deployed
- [ ] Frontend components integrated
- [ ] WebSocket handlers updated
- [ ] Monitoring and logging configured
- [ ] Performance metrics baseline established
- [ ] User acceptance testing completed
- [ ] Documentation updated

## Monitoring and Analytics

### Key Metrics to Track

1. **Transparency Features**:
   - Conflict detection accuracy
   - User engagement with transparency data
   - Financial disclosure completeness

2. **Expert Verification**:
   - Expert participation rates
   - Credibility score distribution
   - Review completion times

3. **Discovery Features**:
   - Search success rates
   - Recommendation click-through rates
   - Pattern detection accuracy

4. **Real-Time Engagement**:
   - Live user counts
   - Engagement event volume
   - Achievement unlock rates

This integration guide provides a comprehensive roadmap for implementing the new domain functionality across the entire Chanuka platform stack.
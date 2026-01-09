# Phase 3: Engagement & Safeguards Intelligence - Complete Plan

**Status**: Phase 3 Planning Complete ✅  
**Date**: January 9, 2026  
**Timeline**: January 15-28, 2026 (Two weeks implementation)

---

## Overview

Phase 3 builds on Phase 2's automated synchronization by adding intelligent graph analysis for **user engagement** and **safeguards tracking**. This phase transforms the PostgreSQL ↔ Neo4j sync into a strategic intelligence platform.

### What Gets Built

```
Input (PostgreSQL)          Processing (Neo4j)          Output (Insights)
─────────────────────       ──────────────────          ──────────────────
- Comments                  - Engagement Graphs         - Similar Bills
- Votes                      - Sentiment Analysis        - Influencer Ranking
- Bookmarks                  - Moderation Patterns       - Recommendation Engine
- Flags                      - Reputation Evolution      - Trust Network Maps
- Moderation Actions         - Verification Chains      - Anomaly Alerts
- Behavioral Anomalies       - Coordination Detection   - Content Safety Scores
```

---

## Component 1: User Engagement Graph

### What's Synced

```typescript
// From PostgreSQL schema: real_time_engagement.ts
- engagementEvents        // View, comment, vote, bookmark, follow
- engagementLeaderboards  // Daily/weekly/monthly rankings
- civicScores             // User contribution metrics
- achievements            // Badges and milestones
```

### Graph Structure

```
User Node (synced from Phase 2)
├─ [COMMENTED_ON]       → Comment nodes
├─ [VOTED_ON]            → Bill nodes (with vote_type: 'support'/'oppose')
├─ [BOOKMARKED]          → Bill nodes
├─ [FOLLOWS]             → Person/User nodes
├─ [EARNED_ACHIEVEMENT]  → Achievement nodes
├─ [IN_LEADERBOARD]      → LeaderboardPosition nodes
└─ [HAS_CIVIC_SCORE]     → CivicScore node

Bill Node (synced from Phase 2)
├─ [COMMENTED_ON_BY]     ← Comment relationships (reversed)
├─ [VOTED_BY]            ← User nodes with vote analysis
├─ [BOOKMARKED_BY]       ← User nodes
├─ [ENGAGING_COHORT]     → SentimentCluster nodes
└─ [SENTIMENT_TREND]     → TimeSeries nodes
```

### Files to Create

**1. engagement-sync.ts** (250 lines)
```typescript
// Sync engagement events from PostgreSQL
- syncEngagementEvent(userId, eventType, entityId, metadata)
- syncVoteRelationship(userId, billId, voteType)
- syncBookmarkRelationship(userId, billId)
- syncFollowRelationship(userId, targetId)
- batchSyncEngagementEvents(events[])
```

**2. engagement-queries.ts** (300 lines)
```typescript
// Query engagement patterns
- findSimilarBills(billId, limit)            // Based on engagement
- getInfluentialUsers(billId, limit)         // Top engagers
- getEngagementCommunities(billId)           // Voting clusters
- rankUsersByInfluence(limitByDomain)        // Across all content
- getRecommendedBills(userId, limit)         // Personalized
- getFollowingChain(userId, depth)           // Community mapping
```

### Key Metrics

| Metric | Computation | Graph Benefit |
|--------|------------|---------------|
| Engagement Score | votes × 10 + comments × 5 + shares × 3 | Centrality analysis |
| Influence Rank | Followers + engagement + verifications | PageRank variant |
| Bill Similarity | Shared voters + shared commenters | Cosine similarity |
| Community Cohesion | Vote correlation + temporal overlap | Modularity score |
| User Affinity | Co-engagement patterns | Similarity matrix |

---

## Component 2: Safeguards Intelligence Networks

### What's Synced

```typescript
// From PostgreSQL schema: safeguards.ts
- moderation_queue          // Pending review items
- moderation_decisions      // Review outcomes
- moderation_appeals        // Appeal status
- content_flags             // Flagged content
- reputation_scores         // User trust metrics
- reputation_history        // Reputation events
- identity_verification     // Verification status
- behavioral_anomalies      // Suspicious activity
- rate_limits               // Access control violations
```

### Graph Structure

```
User Node (synced)
├─ [MADE_MODERATION_DECISION] → ModerationDecision nodes
├─ [FILED_APPEAL]            → ModerationAppeal nodes
├─ [FLAGGED_CONTENT]         → ContentFlag nodes
├─ [HAS_REPUTATION]          → ReputationProfile node
├─ [EARNED_REPUTATION]       → ReputationEvent nodes
├─ [IN_TIER]                 → ReputationTier nodes
├─ [VERIFIED_VIA]            → Verification nodes
├─ [USES_DEVICE]             → Device nodes
├─ [EXHIBITS_ANOMALY]        → BehavioralAnomaly nodes
├─ [COORDINATION_SIGNAL]     → User nodes (potential abuse)
└─ [RATE_LIMITED_ON]         → RateLimitAction nodes

Content Nodes (synced)
├─ [IN_MODERATION_QUEUE]     ← ModerationQueueItem links
├─ [FLAGGED_FOR]             ← ContentFlag relationships
├─ [MODERATION_RESOLVED_BY]  ← ModerationDecision links
└─ [SAFETY_SCORE]            → SafetyMetric node
```

### Files Already Created

**✅ safeguards-networks.ts** (450 lines) - Already created with:
```typescript
// Moderation Networks
- syncModerationEntity()
- syncModerationDecision()
- syncModerationAppeal()
- linkModeratorExpertise()

// Reputation Networks
- syncReputationScore()
- syncReputationHistory()
- syncReputationTier()

// Verification Networks
- syncVerificationRecord()
- syncDeviceFingerprint()
- detectMultiAccountDeviceSharing()

// Content Flags
- syncContentFlag()
- syncFlagPattern()

// Behavioral Anomalies
- syncBehavioralAnomaly()
- syncCoordinationIndicator()

// Rate Limits
- syncRateLimitStatus()

// Batch Operations
- batchSyncSafeguards()
```

### Key Metrics

| Metric | Computation | Graph Benefit |
|--------|------------|---------------|
| Moderator Efficiency | Decisions/hour × accuracy | Performance ranking |
| Content Safety Score | Flags × urgency - overturned | Risk assessment |
| Reputation Trend | Reputation events over time | Trust evolution |
| Moderation Consensus | Appeals overturned % | Decision quality |
| Device Abuse Signals | Users sharing device fingerprints | Multi-account detection |
| Coordination Strength | Users with multiple suspicious patterns | CIB detection |

---

## Component 3: Recommendation Engine

### What It Does

```
Input User          Graph Analysis          Output Recommendations
─────────────        ──────────────          ──────────────────────
- Browse history     - Similar voter cohorts - "Bills similar users voted on"
- Votes cast         - Topic networks        - "Trending in your interests"
- Bookmarks          - Influencer paths      - "Experts discussing this"
- Expertise          - Reputation tiers      - "Trusted commenters"
- Reputation         - Verification chains   - "Verified voices in this topic"
```

### Files to Create

**1. recommendation-engine.ts** (350 lines)
```typescript
// Personalized recommendations
- recommendBillsForUser(userId, limit=10)
  → Users with similar voting patterns → Bills they voted on
  
- recommendExpertCommenters(billId, limit=5)
  → High-reputation users → Recent comments on related topics
  
- recommendRelatedBills(billId, limit=10)
  → Bills with shared voter cohorts → Similar amendment focus
  
- recommendFollowingTargets(userId, limit=10)
  → Users with aligned votes → High expertise in user's interests
  
- recommendContentToFlag(moderatorId, limit=20)
  → Previous flagging patterns → Similar content in queue
  
- recommendAppealReviewers(appealId)
  → Past appeal decisions → Consistency in similar cases
```

### Algorithm Details

```
SIMILAR BILLS QUERY (Cypher):
────────────────────────────
MATCH (bill1:Bill {id: $billId})<-[:VOTED_ON]-(user:User)-[:VOTED_ON]->(bill2:Bill)
WHERE bill1 <> bill2
  AND NOT (bill1)<-[:VOTED_ON]-(user)  // Filter user's own votes
RETURN bill2, count(*) as shared_voters, 
       avg((user.engagement_score)) as avg_engagement
ORDER BY shared_voters DESC, avg_engagement DESC
LIMIT $limit

INFLUENCER RANKING (Neo4j):
──────────────────────────
- Centrality: Incoming relationships from high-reputation users
- Betweenness: Bridges between voting communities
- Pagerank: Influence flow through engagement network
- Weight: Reputation tier × verification status

PERSONALIZED RECOMMENDATIONS (Hybrid):
─────────────────────────────────────
score = (shared_engagement_ratio × 0.4) +
        (influencer_endorsement × 0.3) +
        (temporal_proximity × 0.2) +
        (reputation_bias × 0.1)
```

---

## Component 4: Advanced Analytics

### Queries to Implement

**1. Voting Coalition Detection**
```cypher
MATCH (person1:Person)-[v1:VOTED_ON]->(bill:Bill)
MATCH (person2:Person)-[v2:VOTED_ON]->(bill:Bill)
WHERE v1.vote_type = v2.vote_type AND person1.id < person2.id
RETURN person1, person2, count(bill) as bills_together, 
       collect(bill.id) as bills
ORDER BY bills_together DESC
```

**2. Amendment Chain Analysis**
```cypher
MATCH path = (original:Bill)-[:AMENDED_BY*1..5]->(current:Bill)
WITH original, current, length(path) as depth, [node in nodes(path) | node.id] as chain
RETURN original, current, depth, chain
ORDER BY depth DESC
```

**3. Cross-Party Influence Flows**
```cypher
MATCH (p1:Person {party: $party1})-[r:INFLUENCED_BY]->(p2:Person {party: $party2})
WHERE p1.party <> p2.party
RETURN p1, p2, r.weight as influence_strength
```

**4. Reputation Evolution Timeline**
```cypher
MATCH (user:User)-[:EARNED_REPUTATION]->(event:ReputationEvent)
WHERE event.created_at > $startDate AND event.created_at < $endDate
RETURN user, collect({event: event, source: event.source}) as events
ORDER BY event.created_at
```

**5. Moderation Pattern Analysis**
```cypher
MATCH (mod:User)-[:MADE_DECISION]->(decision:ModerationDecision)-[:RESOLVES]->(queue:ModerationQueueItem)
RETURN mod, decision.action_taken as action, count(*) as frequency,
       avg(duration(queue.created_at, decision.created_at)) as avg_resolution_time
GROUP BY mod, action
```

### Files to Create

**1. advanced-analytics.ts** (300 lines)
```typescript
- detectVotingCoalitions()
- analyzeAmendmentChains()
- analyzeCrossPartyInfluence()
- trackReputationEvolution()
- analyzeModerationPatterns()
- detectContentRiskPatterns()
- findInfluenceBottlenecks()
- computeNetworkRobustness()
```

---

## Component 5: Conflict Resolution

### Multi-Version Strategy

```
PostgreSQL (Source of Truth)
└─ Changes → Neo4j (via Phase 2 triggers)
   ├─ Success → Sync tracking table updated
   ├─ Fail → graph_sync_failures recorded
   └─ Conflict → graph_sync_conflicts analyzed

Conflict Types:
1. MISSING_IN_GRAPH    → Re-sync from PostgreSQL
2. STALE_IN_GRAPH      → Update with newer PostgreSQL data
3. DIVERGED            → PostgreSQL wins (overwrite Neo4j)
4. ORPHANED_IN_GRAPH   → Delete from Neo4j (PostgreSQL deleted it)
```

### Files to Create

**1. conflict-resolver.ts** (200 lines)
```typescript
// Detect conflicts between PostgreSQL and Neo4j
- detectDataDivergence(entityType, entityId)
- getConflictDetails(conflictId)
- resolveConflict(entityType, entityId, strategy='postgres_wins')
- getUnresolvedConflicts()
- replayMissedSyncs()
```

---

## Implementation Timeline

### Week 1 (Jan 15-17): Setup & Engagement

```
MON 1/15:
├─ [ ] Review Phase 2 production data
├─ [ ] Finalize engagement graph schema
├─ [ ] Create engagement-sync.ts
└─ [ ] Create engagement-queries.ts

TUE 1/16:
├─ [ ] Implement batch engagement sync
├─ [ ] Add engagement triggers
├─ [ ] Test with sample data
└─ [ ] Monitor sync latency

WED 1/17:
├─ [ ] Build engagement analytics
├─ [ ] Create dashboard queries
└─ [ ] Document engagement patterns
```

### Week 2 (Jan 18-24): Safeguards & Recommendations

```
THU 1/18:
├─ [ ] Integrate safeguards-networks.ts (already created)
├─ [ ] Create safeguards sync triggers
├─ [ ] Build moderation decision tracking
└─ [ ] Sync reputation scores

FRI 1/19:
├─ [ ] Implement verification network tracking
├─ [ ] Add anomaly detection relationships
├─ [ ] Build rate limit tracking
└─ [ ] Test safeguard sync chains

MON 1/22:
├─ [ ] Create recommendation-engine.ts
├─ [ ] Implement similar bills algorithm
├─ [ ] Build influencer ranking
└─ [ ] Test recommendations accuracy

TUE 1/23:
├─ [ ] Create advanced-analytics.ts
├─ [ ] Build coalition detection
├─ [ ] Implement amendment analysis
└─ [ ] Setup conflict detection

WED 1/24:
├─ [ ] Create conflict-resolver.ts
├─ [ ] Build conflict detection triggers
├─ [ ] Implement auto-resolution
└─ [ ] Document conflict handling
```

### Week 3 (Jan 25-28): Testing & Optimization

```
THU 1/25:
├─ [ ] End-to-end testing
├─ [ ] Load testing (1M+ nodes)
├─ [ ] Query performance profiling
└─ [ ] Index optimization

FRI 1/26:
├─ [ ] Production staging validation
├─ [ ] Data consistency checks
├─ [ ] Rollback procedures
└─ [ ] Documentation completion

MON 1/27:
├─ [ ] Production deployment (Phase 3)
├─ [ ] Monitor sync metrics
├─ [ ] Alert configuration
└─ [ ] Team training

TUE 1/28:
├─ [ ] Post-launch monitoring
├─ [ ] Performance tuning
├─ [ ] Documentation finalization
└─ [ ] Phase 3 retrospective
```

---

## Files to Create/Modify

### New Files (Phase 3)

| File | Lines | Purpose |
|------|-------|---------|
| `engagement-sync.ts` | 250 | Engagement event synchronization |
| `engagement-queries.ts` | 300 | Engagement pattern analysis |
| `recommendation-engine.ts` | 350 | Personalized recommendations |
| `advanced-analytics.ts` | 300 | Coalition & pattern analysis |
| `conflict-resolver.ts` | 200 | Data consistency & resolution |
| `safety-intelligence.ts` | 250 | Safety metric computation |
| `phase-3-schema.ts` | 150 | Neo4j schema updates |
| `phase-3-triggers.sql` | 200 | PostgreSQL trigger updates |

### Existing Files to Update

| File | Changes |
|------|---------|
| `shared/database/graph/index.ts` | Add Phase 3 exports (20 lines) |
| `shared/database/graph/sync-triggers.ts` | Add engagement + safeguard triggers (100 lines) |
| `shared/database/graph/app-init.ts` | Initialize Phase 3 engines (30 lines) |
| `shared/database/graph/sync-executor.ts` | Add Phase 3 sync logic (50 lines) |

---

## Database Schema Updates

### Neo4j Schema Additions

```cypher
// Engagement Nodes
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Comment) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:SentimentCluster) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:CivicScore) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Achievement) REQUIRE n.id IS UNIQUE;

// Safeguard Nodes (already in safeguards-networks.ts)
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ModerationQueueItem) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ModerationDecision) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ReputationProfile) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ContentFlag) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:BehavioralAnomaly) REQUIRE n.id IS UNIQUE;

// Recommendation Nodes
CREATE CONSTRAINT IF NOT EXISTS FOR (n:RecommendationProfile) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:InfluenceScore) REQUIRE n.id IS UNIQUE;

// Performance Indexes
CREATE INDEX IF NOT EXISTS FOR (n:Comment) ON (n.created_at);
CREATE INDEX IF NOT EXISTS FOR (n:User) ON (n.total_engagement_score);
CREATE INDEX IF NOT EXISTS FOR (r:VOTED_ON) ON (r.created_at);
CREATE INDEX IF NOT EXISTS FOR (n:BehavioralAnomaly) ON (n.severity);
```

### PostgreSQL Trigger Additions

```sql
-- Engagement Events Trigger
CREATE OR REPLACE FUNCTION queue_engagement_event_sync()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO graph_sync_status (
    entity_type, entity_id, sync_status, sync_reason, created_at
  ) VALUES (
    'EngagementEvent', NEW.id, 'pending', 'engagement_event_created', NOW()
  ) ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    sync_status = 'pending',
    sync_attempts = 0;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Safeguards Events Trigger
CREATE OR REPLACE FUNCTION queue_safeguard_sync()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO graph_sync_status (
    entity_type, entity_id, sync_status, sync_reason, created_at
  ) VALUES (
    'Safeguard', NEW.id, 'pending', TG_TABLE_NAME || '_changed', NOW()
  ) ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    sync_status = 'pending';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Success Criteria

### Engagement Module
- [ ] 100% of engagement events synced within 5 minutes
- [ ] Similar bills recommendations: >70% user relevance
- [ ] Influencer ranking: Matches manual expert ranking
- [ ] Engagement communities: >85% vote agreement within cluster

### Safeguards Module
- [ ] Moderation decisions tracked with <1 second latency
- [ ] Reputation changes reflected in Neo4j within 1 minute
- [ ] Multi-account fraud detection: >80% precision
- [ ] Anomaly detection: Flags 95%+ of coordinated campaigns

### Recommendations
- [ ] Response time: <500ms for bill recommendations
- [ ] CTR improvement: >20% vs baseline (if A/B tested)
- [ ] Diversity: Top 10 recommendations cover ≥3 distinct topics

### Analytics
- [ ] Query latency: <2 seconds for complex graphs
- [ ] Coalition detection: Finds 95%+ of real coalitions
- [ ] Amendment chains: Complete and accurate up to depth 5

### Conflict Resolution
- [ ] Detect conflicts: <1 minute after divergence
- [ ] Resolve conflicts: <99.9% success rate
- [ ] Data consistency: Verified by random sampling

---

## Production Readiness Checklist

### Before Deployment
- [ ] All Phase 3 files created and tested
- [ ] Neo4j schema validated
- [ ] PostgreSQL triggers deployed and tested
- [ ] Conflict resolution tested with failure scenarios
- [ ] Performance benchmarks met (see Success Criteria)
- [ ] Monitoring and alerts configured
- [ ] Rollback procedure documented
- [ ] Team trained on Phase 3 operations

### Monitoring Dashboards
- [ ] Engagement sync latency
- [ ] Safeguard entity sync rates
- [ ] Recommendation accuracy metrics
- [ ] Query performance (p95, p99)
- [ ] Conflict detection & resolution rates
- [ ] Neo4j cluster health
- [ ] PostgreSQL trigger performance

### Documentation
- [ ] Phase 3 implementation guide
- [ ] Operations manual
- [ ] Troubleshooting guide
- [ ] Performance tuning guide
- [ ] Disaster recovery procedures

---

## Phase 4 Forward

After Phase 3 stabilizes, consider:

1. **Bidirectional Sync** (Jan 29+)
   - Neo4j insights → PostgreSQL denormalization
   - Store recommendation scores in PostgreSQL
   - Persist analytics results

2. **Advanced Recommendation**
   - Collaborative filtering
   - Content-based filtering
   - Hybrid approaches
   - A/B testing framework

3. **Predictive Maintenance**
   - Predict controversial bills
   - Forecast moderation load
   - Identify at-risk users
   - Recommend proactive interventions

4. **Export & Integration**
   - GraphQL API for recommendations
   - REST endpoints for analytics
   - Webhook notifications
   - Real-time dashboards

---

## References

- [Phase 2 Integration Guide](./PHASE_2_INTEGRATION_GUIDE.md)
- [Safeguards Networks](./safeguards-networks.ts)
- [Engagement Networks](./engagement-networks.ts)
- [Entity Mapping](./ENTITY_MAPPING_DOCUMENT.md)

---

**Status**: Phase 3 Planning Complete ✅  
**Next Step**: Implement Week 1 files (engagement-sync.ts, engagement-queries.ts)  
**Timeline**: 15-17 January 2026

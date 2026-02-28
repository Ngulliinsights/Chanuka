# ADR-015: Intelligent Bill Pipeline Architecture

**Date:** February 27, 2026  
**Status:** 📋 PROPOSED  
**Implementation Status:** Planning Phase

---

## Context

The Chanuka platform has multiple intelligence features (Pretext Detection, Constitutional Intelligence, Argument Intelligence, Market Intelligence, AI Evaluation) that analyze bills independently. Currently:

- Each feature must be manually triggered
- No coordination between intelligence features
- Users miss important analysis
- Duplicate processing and API calls
- No comprehensive bill reports

We need an automated, coordinated pipeline that processes every bill through all intelligence features to provide comprehensive analysis.

---

## Decision

We will implement an **Intelligent Bill Pipeline** that automatically processes every bill through all intelligence features in a coordinated, event-driven architecture.

### Pipeline Architecture

```
Bill Created/Updated Event
    ↓
┌─────────────────────────────────────────────────────────────┐
│              INTELLIGENT BILL PIPELINE                       │
│                                                              │
│  Stage 1: Pretext Detection (automatic)                     │
│    ↓                                                         │
│  Stage 2: Constitutional Intelligence (automatic)           │
│    ↓                                                         │
│  Stage 3: Market Intelligence (automatic)                   │
│    ↓                                                         │
│  Stage 4: ML Impact Prediction (automatic)                  │
│    ↓                                                         │
│  Stage 5: Comprehensive Bill Report Generation              │
│    ↓                                                         │
│  Stage 6: User Notification & Recommendation                │
└─────────────────────────────────────────────────────────────┘
    ↓
Users Receive Comprehensive Analysis
```

### Event-Driven Implementation

```typescript
// Event bus for pipeline coordination
interface BillPipelineEvent {
  type: 'bill.created' | 'bill.updated' | 'analysis.completed';
  billId: string;
  stage: PipelineStage;
  data: unknown;
  timestamp: Date;
}

// Pipeline orchestrator
class IntelligentBillPipeline {
  async processBill(billId: string): Promise<BillAnalysisReport> {
    const pipeline = [
      this.pretextDetection,
      this.constitutionalAnalysis,
      this.marketIntelligence,
      this.mlPrediction,
      this.reportGeneration
    ];

    const results = [];
    
    for (const stage of pipeline) {
      try {
        const result = await stage(billId);
        results.push(result);
        
        // Emit progress event
        await this.eventBus.emit({
          type: 'analysis.completed',
          billId,
          stage: stage.name,
          data: result
        });
      } catch (error) {
        // Log error but continue pipeline
        logger.error(`Pipeline stage ${stage.name} failed`, { error, billId });
        results.push({ error: error.message, stage: stage.name });
      }
    }

    return this.generateReport(billId, results);
  }

  private async pretextDetection(billId: string) {
    return await pretextDetectionService.analyze(billId);
  }

  private async constitutionalAnalysis(billId: string) {
    return await constitutionalIntelligenceService.analyze(billId);
  }

  private async marketIntelligence(billId: string) {
    return await marketIntelligenceService.analyze(billId);
  }

  private async mlPrediction(billId: string) {
    return await mlModelService.predictImpact(billId);
  }

  private async reportGeneration(billId: string, results: AnalysisResult[]) {
    return await reportService.generate(billId, results);
  }
}
```

### Async Processing Queue

```typescript
// Queue-based processing for scalability
interface PipelineJob {
  billId: string;
  priority: 'high' | 'normal' | 'low';
  retryCount: number;
  maxRetries: number;
}

class PipelineQueue {
  async enqueue(job: PipelineJob): Promise<void> {
    await this.queue.add('bill-analysis', job, {
      priority: this.getPriority(job.priority),
      attempts: job.maxRetries,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }

  async process(): Promise<void> {
    this.queue.process('bill-analysis', async (job) => {
      const { billId } = job.data;
      return await intelligentBillPipeline.processBill(billId);
    });
  }
}
```

### Caching Strategy

```typescript
// Cache analysis results to avoid reprocessing
class PipelineCache {
  async getCachedAnalysis(billId: string, stage: string): Promise<AnalysisResult | null> {
    const cacheKey = cacheKeys.analysis(billId, stage);
    return await cacheService.get(cacheKey);
  }

  async cacheAnalysis(billId: string, stage: string, result: AnalysisResult): Promise<void> {
    const cacheKey = cacheKeys.analysis(billId, stage);
    await cacheService.set(cacheKey, result, CACHE_TTL.ONE_HOUR);
  }

  async invalidateAnalysis(billId: string): Promise<void> {
    // Invalidate all analysis caches for this bill
    await cacheInvalidation.invalidatePattern(`analysis:${billId}:*`);
  }
}
```

### Feature Flags for Rollout

```typescript
// Gradual rollout with feature flags
interface PipelineConfig {
  enabled: boolean;
  stages: {
    pretextDetection: boolean;
    constitutionalAnalysis: boolean;
    marketIntelligence: boolean;
    mlPrediction: boolean;
  };
  rolloutPercentage: number;
}

async function shouldProcessBill(billId: string): Promise<boolean> {
  const config = await featureFlagService.get('intelligent-bill-pipeline');
  
  if (!config.enabled) return false;
  
  // Percentage-based rollout
  const hash = hashBillId(billId);
  return (hash % 100) < config.rolloutPercentage;
}
```

---

## Rationale

### Why Event-Driven Architecture?

1. **Decoupling**: Intelligence features don't need to know about each other
2. **Scalability**: Can process bills asynchronously
3. **Resilience**: Failure in one stage doesn't break the pipeline
4. **Extensibility**: Easy to add new analysis stages
5. **Monitoring**: Clear visibility into pipeline progress

### Why Async Queue?

1. **Performance**: Don't block bill creation
2. **Reliability**: Retry failed analyses
3. **Priority**: Process important bills first
4. **Scalability**: Distribute load across workers
5. **Backpressure**: Handle traffic spikes

### Why Caching?

1. **Performance**: Avoid reprocessing unchanged bills
2. **Cost**: Reduce API calls to external services
3. **Reliability**: Serve cached results if service is down
4. **User Experience**: Faster response times

### Why Feature Flags?

1. **Risk Mitigation**: Gradual rollout
2. **A/B Testing**: Compare with/without pipeline
3. **Quick Rollback**: Disable if issues arise
4. **Staged Deployment**: Enable stages incrementally

---

## Consequences

### Positive

1. **Comprehensive Analysis**: Every bill gets full analysis
2. **Automated Transparency**: No manual triggering needed
3. **Timely Insights**: Users notified of important findings
4. **Better Recommendations**: More data for recommendation engine
5. **Consistent Quality**: Same analysis for all bills
6. **Scalable**: Can handle high bill volume
7. **Resilient**: Failures don't break the system

### Negative

1. **Complexity**: More moving parts to manage
2. **Cost**: More API calls and processing
3. **Latency**: Analysis takes time (mitigated by async)
4. **Resource Usage**: Increased CPU, memory, API quotas

### Risks

1. **Pipeline Bottleneck**: One slow stage blocks others
   - **Mitigation**: Parallel processing where possible, timeouts
2. **Cascade Failures**: One service down affects all bills
   - **Mitigation**: Graceful degradation, cached results
3. **Cost Overrun**: Too many API calls
   - **Mitigation**: Rate limiting, caching, quotas
4. **Data Quality**: Bad analysis affects all users
   - **Mitigation**: Quality monitoring, human review for critical findings

---

## Implementation Plan

### Phase 1: Foundation (Weeks 1-2)

1. **Event Bus Setup**
   - Implement event bus (Redis Pub/Sub or RabbitMQ)
   - Define event schemas
   - Add event logging

2. **Queue Infrastructure**
   - Set up Bull queue (Redis-backed)
   - Configure workers
   - Add monitoring

3. **Pipeline Orchestrator**
   - Implement basic pipeline
   - Add error handling
   - Add progress tracking

**Deliverables:**
- Event bus operational
- Queue processing bills
- Basic pipeline working

### Phase 2: Intelligence Integration (Weeks 3-4)

1. **Integrate Existing Features**
   - Connect Pretext Detection
   - Connect Constitutional Intelligence
   - Connect Market Intelligence
   - Connect ML Prediction

2. **Caching Layer**
   - Implement analysis caching
   - Add cache invalidation
   - Monitor cache hit rates

3. **Report Generation**
   - Aggregate analysis results
   - Generate comprehensive reports
   - Store reports in database

**Deliverables:**
- All intelligence features integrated
- Caching operational
- Reports generated

### Phase 3: User Experience (Weeks 5-6)

1. **Notification Integration**
   - Notify users of critical findings
   - Send analysis summaries
   - Alert on bill updates

2. **Recommendation Integration**
   - Feed analysis to recommendation engine
   - Improve recommendation quality
   - Track effectiveness

3. **UI Integration**
   - Display analysis results on bill pages
   - Show pipeline progress
   - Add analysis history

**Deliverables:**
- Users notified of findings
- Recommendations improved
- UI showing analysis

### Phase 4: Optimization (Weeks 7-8)

1. **Performance Tuning**
   - Optimize slow stages
   - Parallel processing
   - Resource optimization

2. **Monitoring & Alerting**
   - Pipeline metrics dashboard
   - Error rate monitoring
   - Performance alerts

3. **Feature Flags & Rollout**
   - Implement feature flags
   - Gradual rollout (10% → 50% → 100%)
   - A/B testing

**Deliverables:**
- Optimized performance
- Comprehensive monitoring
- Gradual rollout complete

---

## Success Metrics

### Pipeline Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Bills Analyzed | 100% | All new/updated bills |
| Pipeline Completion Rate | >95% | Successful completions |
| Average Processing Time | <5 minutes | Time to complete all stages |
| Error Rate | <5% | Failed analyses |
| Cache Hit Rate | >60% | Cached vs fresh analyses |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Analysis Accuracy | >85% | Human review validation |
| False Positive Rate | <10% | Incorrect detections |
| User Satisfaction | >4.0/5 | User feedback |
| Notification Relevance | >80% | User engagement with alerts |

### Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| User Engagement | +40% | Time on platform |
| Bill Views | +30% | Bills viewed per user |
| Comment Quality | +25% | Argument intelligence scores |
| Campaign Participation | +50% | Users joining campaigns |

---

## Alternatives Considered

### Alternative 1: Manual Triggering

**Approach**: Users manually request analysis for each bill

**Pros**:
- Simpler implementation
- Lower resource usage
- User control

**Cons**:
- Most bills never analyzed
- Inconsistent coverage
- Poor user experience
- Missed important findings

**Decision**: Rejected - Doesn't achieve transparency goals

### Alternative 2: Synchronous Processing

**Approach**: Process all analyses during bill creation

**Pros**:
- Simpler architecture
- Immediate results
- No queue management

**Cons**:
- Slow bill creation (30+ seconds)
- Poor user experience
- Not scalable
- Blocks on failures

**Decision**: Rejected - Performance unacceptable

### Alternative 3: Batch Processing

**Approach**: Process bills in nightly batches

**Pros**:
- Efficient resource usage
- Predictable load
- Simple scheduling

**Cons**:
- Delayed analysis (up to 24 hours)
- Not real-time
- Poor user experience
- Missed timely opportunities

**Decision**: Rejected - Too slow for civic engagement

---

## Related Decisions

- **ADR-012**: Security Pattern - Secure all pipeline stages
- **ADR-013**: Caching Strategy - Cache analysis results
- **ADR-014**: Error Handling - Handle pipeline failures
- **ADR-016**: Feature Integration Strategy (to be created)

---

## References

### Documentation

- [CROSS_FEATURE_INTEGRATION_MAP.md](../../.agent/specs/strategic-integration/CROSS_FEATURE_INTEGRATION_MAP.md) - Strategic integration planning
- [strategic-integration/design.md](../../.agent/specs/strategic-integration/design.md) - Strategic integration design

### Related Features

- Pretext Detection: `server/features/pretext-detection/`
- Constitutional Intelligence: `server/features/constitutional-intelligence/`
- Market Intelligence: `server/features/market-intelligence/`
- ML Models: `server/features/ml-models/`

### External Resources

- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [Redis Pub/Sub](https://redis.io/topics/pubsub)

---

## Approval

**Status**: 📋 PROPOSED  
**Requires Approval From**: Product Lead, Engineering Lead, Architecture Team  
**Target Decision Date**: March 3, 2026  
**Target Implementation Start**: March 10, 2026

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-27 | 1.0 | Initial ADR | Kiro AI |

---

**This ADR proposes an intelligent bill pipeline that automatically processes every bill through all intelligence features to provide comprehensive, timely analysis for users.**

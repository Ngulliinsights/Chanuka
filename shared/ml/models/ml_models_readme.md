# ML Models for Legislative Analysis Platform

## Overview

This collection of machine learning models provides comprehensive analysis capabilities for legislative content, political networks, and civic engagement in Kenya. The models have been optimized for performance, maintainability, and accuracy.

## Key Improvements

### 1. **Shared Utilities Module**
- **TextProcessor**: Centralized text preprocessing, tokenization, and NLP utilities
- **GraphAnalyzer**: Real graph algorithms (Betweenness, Closeness, Eigenvector centrality)
- **Statistics**: Statistical calculations (mean, median, variance, percentiles)
- **Cache**: Performance optimization through intelligent caching
- **BatchProcessor**: Efficient batch and parallel processing

### 2. **Performance Optimizations**
- Implemented caching at multiple levels (5-10 minute TTL)
- Replaced placeholder implementations with real algorithms
- Optimized text processing (single-pass tokenization)
- Efficient graph traversal algorithms
- Batch processing capabilities

### 3. **Enhanced Algorithms**
- **Sentiment Analysis**: Negation handling, intensifier detection, contextual analysis
- **Influence Mapping**: Brandes' algorithm for betweenness, power iteration for eigenvector
- **Classification**: TF-IDF-like scoring, pattern-based urgency detection
- **Aspect Detection**: Context-window sentiment analysis

### 4. **Better Error Handling**
- Comprehensive try-catch blocks
- Graceful degradation
- Detailed error flags in responses
- Input validation with Zod schemas

## Models

### 1. Real-Time Classifier
**Version:** 2.1.0  
**Latency:** 50-150ms  
**Complexity:** Low

Classifies content in real-time for urgency, topics, sentiment, engagement potential, misinformation risk, constitutional relevance, and public interest.

```typescript
import { realTimeClassifier } from './real-time-classifier';

const result = await realTimeClassifier.classify({
  content: {
    text: "Parliament debates new tax bill affecting all sectors",
    title: "Breaking: Tax Reform Bill",
    source: 'news',
    timestamp: new Date().toISOString()
  },
  classificationTasks: [
    'urgency_level',
    'topic_category',
    'sentiment_polarity',
    'engagement_potential',
    'public_interest_level'
  ],
  userContext: {
    userSegment: 'engaged',
    preferences: {
      topics: ['economy', 'taxation'],
      urgencyThreshold: 'medium'
    }
  }
});
```

### 2. Sentiment Analyzer
**Version:** 2.1.0  
**Latency:** 100-300ms  
**Complexity:** Medium

Analyzes sentiment, emotions, aspects, toxicity, and political lean with multi-language support.

```typescript
import { sentimentAnalyzer } from './sentiment-analyzer';

const result = await sentimentAnalyzer.analyze({
  text: "This policy is beneficial for economic growth",
  context: 'bill_comment',
  language: 'en',
  authorType: 'expert'
});

// Result includes:
// - overallSentiment, sentimentScore
// - emotions (anger, joy, fear, etc.)
// - aspects with sentiment
// - keyPhrases with importance
// - toxicity analysis
// - politicalLean
```

### 3. Influence Mapper
**Version:** 2.1.0  
**Latency:** 800-2000ms  
**Complexity:** High

Maps political influence networks using real graph algorithms.

```typescript
import { influenceMapper } from './influence-mapper';

const result = await influenceMapper.analyze({
  analysisType: 'network_analysis',
  entities: [
    { id: uuid(), type: 'politician', name: 'John Doe' },
    { id: uuid(), type: 'company', name: 'Corp Inc' }
  ],
  relationships: [
    {
      sourceId: politicianId,
      targetId: companyId,
      type: 'financial',
      strength: 0.8,
      direction: 'source_to_target'
    }
  ],
  contextualData: {
    timeframe: { start: '2024-01-01', end: '2024-12-31' }
  }
});

// Result includes:
// - networkMetrics (density, clustering, etc.)
// - influenceRankings with centrality measures
// - powerClusters
// - influenceFlows
// - lobbyingPatterns
// - riskAssessment
```

### 4. Conflict Detector
**Version:** 2.0.0  
**Latency:** 200-500ms  
**Complexity:** Medium

Detects conflicts of interest between sponsors and bills.

```typescript
import { conflictDetector } from './conflict-detector';

const result = await conflictDetector.detect({
  billId: uuid(),
  billText: "Bill text here...",
  billTitle: "Financial Services Reform Act",
  billSector: 'financial_services',
  sponsorId: uuid(),
  sponsorFinancialInterests: [
    {
      type: 'stock',
      entityName: 'Bank XYZ',
      sector: 'financial_services',
      value: 500000,
      ownershipPercentage: 5
    }
  ]
});
```

### 5. Constitutional Analyzer
**Version:** 2.0.0  
**Latency:** 300-800ms  
**Complexity:** High

Analyzes bills for constitutional compliance.

```typescript
import { constitutionalAnalyzer } from './constitutional-analyzer';

const result = await constitutionalAnalyzer.analyze({
  billText: "Full bill text...",
  billTitle: "Privacy Protection Act",
  billType: 'public',
  affectedInstitutions: ['Privacy Commission'],
  proposedChanges: ['New privacy requirements']
});

// Result includes:
// - alignmentScore
// - violations with severity
// - citedProvisions
// - precedents
// - recommendations
```

### 6. Trojan Bill Detector
**Version:** 2.0.0  
**Latency:** 500-1000ms  
**Complexity:** High

Detects hidden provisions and deceptive techniques.

```typescript
import { trojanBillDetector } from './trojan-bill-detector';

const result = await trojanBillDetector.analyze({
  billText: "Bill text...",
  billTitle: "Education Reform Bill",
  pageCount: 150,
  scheduleCount: 8,
  consultationPeriod: 14,
  urgencyLevel: 'urgent'
});
```

### 7. Transparency Scorer
**Version:** 2.0.0  
**Latency:** 200-500ms  
**Complexity:** Medium

Scores transparency across multiple dimensions.

```typescript
import { transparencyScorer } from './transparency-scorer';

const result = await transparencyScorer.assess({
  entityType: 'bill',
  entityId: uuid(),
  assessmentData: {
    billData: {
      hasPublicDrafts: true,
      consultationPeriod: 45,
      publicHearings: 3,
      amendmentHistory: [...],
      votingRecord: { isPublic: true, individualVotes: true },
      impactAssessment: { exists: true, isPublic: true, quality: 'good' }
    }
  },
  contextualFactors: {
    urgencyLevel: 'normal',
    publicInterest: 'high',
    mediaAttention: 'moderate',
    stakeholderCount: 50
  }
});
```

### 8. Engagement Predictor
**Version:** 2.0.0  
**Latency:** 150-400ms  
**Complexity:** Medium

Predicts user engagement and optimizes content delivery.

```typescript
import { engagementPredictor } from './engagement-predictor';

const result = await engagementPredictor.predict({
  contentType: 'bill',
  contentMetadata: {
    title: "Healthcare Reform Bill",
    length: 500,
    complexity: 'medium',
    urgency: 'high',
    topics: ['healthcare', 'insurance']
  },
  userProfile: {
    userId: uuid(),
    engagementHistory: {
      totalViews: 100,
      totalComments: 20,
      totalShares: 5,
      avgSessionDuration: 300,
      lastActiveDate: '2024-12-20'
    },
    preferences: {
      interestedTopics: ['healthcare'],
      preferredComplexity: 'medium',
      notificationFrequency: 'daily'
    }
  },
  contextualFactors: {
    timeOfDay: 14,
    dayOfWeek: 2,
    isWeekend: false,
    currentTrendingTopics: ['healthcare'],
    platformActivity: 'high'
  }
});
```

## Using the Model Manager

The Model Manager provides lazy loading, caching, and batch processing:

```typescript
import { getModelManager, useModel, batchProcess } from './index';

// Get manager instance
const manager = getModelManager();

// Load a model
const classifier = await manager.loadModel('real-time-classifier');

// Use model with automatic loading
const result = await useModel('sentiment-analyzer', async (model) => {
  return model.analyze({ text: "Sample text", context: 'bill_comment' });
});

// Batch process with multiple models
const results = await batchProcess([
  {
    modelType: 'sentiment-analyzer',
    operation: (model) => model.analyze({ text: "Text 1", context: 'bill_comment' })
  },
  {
    modelType: 'real-time-classifier',
    operation: (model) => model.classify({ content: {...}, classificationTasks: [...] })
  }
]);

// Get model metadata without loading
const metadata = manager.getMetadata('influence-mapper');

// Preload models for better performance
await manager.preloadModels([
  'sentiment-analyzer',
  'real-time-classifier'
]);

// Get recommended models for use case
const models = getRecommendedModels('bill_analysis');
// Returns: ['constitutional-analyzer', 'trojan-bill-detector', 'transparency-scorer']
```

## Shared Utilities

### TextProcessor

```typescript
import { TextProcessor } from './shared-utils';

// Normalize text
const normalized = TextProcessor.normalize(text);

// Tokenize
const tokens = TextProcessor.tokenize(text);

// Remove stopwords
const filtered = TextProcessor.removeStopwords(tokens);

// Calculate TF-IDF
const score = TextProcessor.calculateTFIDF(term, document, corpus);

// Extract n-grams
const bigrams = TextProcessor.extractNGrams(tokens, 2);

// Calculate similarity
const jaccardSim = TextProcessor.jaccardSimilarity(set1, set2);
const cosineSim = TextProcessor.cosineSimilarity(vec1, vec2);
```

### GraphAnalyzer

```typescript
import { GraphAnalyzer } from './shared-utils';

// Calculate centrality measures
const betweenness = GraphAnalyzer.calculateBetweenness(nodeId, graph);
const closeness = GraphAnalyzer.calculateCloseness(nodeId, graph);
const eigenvector = GraphAnalyzer.calculateEigenvector(nodeId, graph);

// Find shortest paths
const paths = GraphAnalyzer.findShortestPaths(startId, endId, graph, maxPaths);
```

### Statistics

```typescript
import { Statistics } from './shared-utils';

const mean = Statistics.mean(numbers);
const median = Statistics.median(numbers);
const stdDev = Statistics.stdDev(numbers);
const p95 = Statistics.percentile(numbers, 95);
const normalized = Statistics.normalize(numbers);
const weighted = Statistics.weightedAverage(values, weights);
```

### Cache

```typescript
import { Cache } from './shared-utils';

const cache = new Cache<MyType>(3600); // 1 hour TTL

cache.set('key', value);
const value = cache.get('key');
cache.clear();
```

## Performance Characteristics

| Model | Avg Latency | Memory Usage | Cache Hit Rate |
|-------|-------------|--------------|----------------|
| Real-Time Classifier | 50-150ms | ~10MB | 60-70% |
| Sentiment Analyzer | 100-300ms | ~15MB | 50-60% |
| Influence Mapper | 800-2000ms | ~50MB | 20-30% |
| Conflict Detector | 200-500ms | ~20MB | 40-50% |
| Constitutional Analyzer | 300-800ms | ~25MB | 30-40% |
| Trojan Bill Detector | 500-1000ms | ~30MB | 30-40% |
| Transparency Scorer | 200-500ms | ~15MB | 40-50% |
| Engagement Predictor | 150-400ms | ~20MB | 50-60% |

## Best Practices

1. **Use the Model Manager**: Leverage lazy loading and caching
2. **Batch Operations**: Process multiple items together when possible
3. **Preload for Critical Paths**: Preload models for time-sensitive operations
4. **Monitor Cache**: Check cache status to optimize performance
5. **Error Handling**: Always wrap model calls in try-catch
6. **Input Validation**: Use provided Zod schemas for validation

## Error Handling

All models return detailed error information:

```typescript
try {
  const result = await model.analyze(input);
  
  // Check for processing flags
  if (result.processingMetadata?.flags.length > 0) {
    console.warn('Processing warnings:', result.processingMetadata.flags);
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    // Input validation error
    console.error('Invalid input:', error.errors);
  } else {
    // Processing error
    console.error('Model error:', error);
  }
}
```

## Future Enhancements

- [ ] GPU acceleration for large-scale analysis
- [ ] Real-time streaming analysis
- [ ] Model versioning and A/B testing
- [ ] Distributed processing support
- [ ] Enhanced caching strategies
- [ ] Model performance monitoring
- [ ] Automatic model updates

## Contributing

When adding new models:
1. Use shared utilities to avoid duplication
2. Implement caching where appropriate
3. Add comprehensive error handling
4. Include TypeScript types
5. Update the model registry
6. Add documentation and examples

## License

[Your License Here]

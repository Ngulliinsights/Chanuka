# Machine Learning Models for Political Transparency Platform

This directory contains a comprehensive suite of ML models designed to enable full functionality of the political transparency and engagement platform. The models work together to provide real-time analysis, detection, and insights for political content, bills, and user engagement.

## 🎯 Overview

The ML system consists of 8 specialized models that work together to provide:

- **Trojan Bill Detection**: Identifies hidden agendas and deceptive techniques in legislation
- **Constitutional Analysis**: Analyzes bills for constitutional compliance and violations
- **Conflict Detection**: Detects conflicts of interest between sponsors and legislation
- **Sentiment Analysis**: Analyzes public sentiment and emotions in political content
- **Engagement Prediction**: Predicts and optimizes user engagement with content
- **Transparency Scoring**: Scores transparency levels across multiple dimensions
- **Influence Mapping**: Maps political influence networks and power relationships
- **Real-time Classification**: Classifies content in real-time for multiple tasks

## 🏗️ Architecture

```
shared/ml/
├── models/                    # Individual ML models
│   ├── trojan-bill-detector.ts
│   ├── constitutional-analyzer.ts
│   ├── conflict-detector.ts
│   ├── sentiment-analyzer.ts
│   ├── engagement-predictor.ts
│   ├── transparency-scorer.ts
│   ├── influence-mapper.ts
│   ├── real-time-classifier.ts
│   └── index.ts
├── services/                  # ML orchestration services
│   ├── ml-orchestrator.ts     # Central model management
│   ├── analysis-pipeline.ts   # Complex workflow orchestration
│   └── ml-integration.ts      # Database integration
├── index.ts                   # Main exports
└── README.md                  # This file
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { mlOrchestrator, analysisPipeline } from '@/shared/ml';

// Analyze a single bill for trojan provisions
const trojanAnalysis = await mlOrchestrator.processRequest({
  modelType: 'trojan-bill-detector',
  input: {
    billText: 'The full text of the bill...',
    billTitle: 'The Kenya Finance Bill 2024',
    pageCount: 147,
    scheduleCount: 8,
    amendmentCount: 23,
    consultationPeriod: 14, // days
    urgencyLevel: 'urgent'
  }
});

// Run comprehensive bill analysis pipeline
const comprehensiveAnalysis = await analysisPipeline.executePipeline({
  pipelineId: 'comprehensive-bill-analysis',
  input: {
    billId: 'uuid-here',
    billText: 'Full bill text...',
    billTitle: 'Bill title',
    sponsorId: 'sponsor-uuid',
    sponsorFinancialInterests: [...],
    transparencyData: {...},
    contextualFactors: {...}
  }
});
```

### Real-time Content Processing

```typescript
// Process user-generated content in real-time
const contentAnalysis = await analysisPipeline.executePipeline({
  pipelineId: 'real-time-content-processing',
  input: {
    content: {
      text: 'User comment or post content...',
      title: 'Optional title',
      source: 'social_media',
      timestamp: new Date().toISOString()
    },
    userContext: {
      userId: 'user-uuid',
      userSegment: 'engaged'
    }
  }
});
```

## 📊 Model Details

### 1. Trojan Bill Detector

Detects hidden agendas and deceptive techniques in legislation.

**Input:**
```typescript
{
  billText: string;
  billTitle: string;
  pageCount: number;
  scheduleCount: number;
  amendmentCount: number;
  consultationPeriod: number; // days
  urgencyLevel: 'routine' | 'normal' | 'urgent' | 'emergency';
}
```

**Output:**
```typescript
{
  trojanRiskScore: number; // 0-100
  confidence: number; // 0-1
  hiddenProvisions: Array<{
    section: string;
    statedPurpose: string;
    hiddenAgenda: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedRights: string[];
  }>;
  redFlags: string[];
  deceptionTechniques: Array<{
    technique: string;
    effectiveness: number; // 1-10
    example: string;
  }>;
}
```

### 2. Constitutional Analyzer

Analyzes bills for constitutional compliance and violations.

**Key Features:**
- Detects Bill of Rights violations
- Identifies separation of powers issues
- Checks procedural fairness requirements
- Finds relevant legal precedents
- Provides compliance recommendations

### 3. Conflict Detector

Detects conflicts of interest between bill sponsors and legislation.

**Key Features:**
- Financial conflict detection
- Employment history analysis
- Family connection assessment
- Disclosure quality evaluation
- Risk scoring and recommendations

### 4. Sentiment Analyzer

Analyzes public sentiment and emotions in political content.

**Key Features:**
- Multi-language support (English/Swahili)
- Emotion detection (8 basic emotions)
- Aspect-based sentiment analysis
- Toxicity detection
- Political lean identification

### 5. Engagement Predictor

Predicts and optimizes user engagement with content.

**Key Features:**
- User segmentation (casual, engaged, expert, activist, professional)
- Engagement score prediction
- Optimal timing recommendations
- Content format optimization
- Personalization suggestions

### 6. Transparency Scorer

Scores transparency levels across multiple dimensions.

**Key Features:**
- Multi-dimensional scoring (accessibility, completeness, timeliness, participation, accountability)
- Entity-specific assessment (bills, sponsors, processes)
- Benchmarking and comparison
- Actionable recommendations
- Grade assignment (A-F)

### 7. Influence Mapper

Maps political influence networks and power relationships.

**Key Features:**
- Network analysis and metrics
- Influence ranking and centrality measures
- Power cluster identification
- Lobbying pattern detection
- Risk assessment (corruption, capture, concentration)

### 8. Real-time Classifier

Classifies content in real-time for multiple tasks.

**Key Features:**
- Multi-task classification
- Urgency level detection
- Topic categorization
- Misinformation risk assessment
- Action requirement determination

## 🔄 Analysis Pipelines

Pre-configured workflows that combine multiple models:

### Comprehensive Bill Analysis
Combines trojan detection, constitutional analysis, transparency scoring, conflict detection, and engagement prediction.

### Real-time Content Processing
Processes user content with classification, sentiment analysis, and engagement prediction.

### Sponsor Integrity Assessment
Evaluates sponsor integrity through transparency scoring, conflict detection, and influence analysis.

### Public Engagement Analysis
Analyzes public engagement patterns and sentiment around political content.

## 🛠️ Services

### ML Orchestrator
Central service for managing all ML models with features like:
- Request queuing and deduplication
- Caching with configurable TTL
- Timeout handling
- Batch processing
- Health monitoring

### Analysis Pipeline
Orchestrates complex workflows with features like:
- Dependency management
- Parallel execution
- Conditional steps
- Error handling
- Result mapping

### ML Integration Service
Integrates ML outputs with database schemas:
- Database format transformation
- Batch processing
- Status tracking
- Result persistence

## 📈 Performance & Caching

The system includes intelligent caching with different TTL values:
- **Trojan Bill Detector**: 1 hour
- **Constitutional Analyzer**: 1 hour
- **Conflict Detector**: 30 minutes
- **Sentiment Analyzer**: 15 minutes
- **Engagement Predictor**: 10 minutes
- **Transparency Scorer**: 1 hour
- **Influence Mapper**: 2 hours
- **Real-time Classifier**: 5 minutes

## 🔧 Configuration

### Environment Variables
```bash
# ML Model Configuration
ML_CACHE_ENABLED=true
ML_DEFAULT_TIMEOUT=30000
ML_MAX_BATCH_SIZE=50
ML_LOG_LEVEL=info

# Model-specific settings
TROJAN_DETECTOR_THRESHOLD=70
CONSTITUTIONAL_ANALYZER_CONFIDENCE_MIN=0.6
SENTIMENT_ANALYZER_LANGUAGES=en,sw
```

### Model Initialization
```typescript
import { mlOrchestrator } from '@/shared/ml';

// Warm up all models on startup
await mlOrchestrator.warmUp();

// Check model health
const health = await mlOrchestrator.healthCheck();
console.log('Model Health:', health);
```

## 🧪 Testing

### Unit Tests
```typescript
import { trojanBillDetector } from '@/shared/ml';

describe('Trojan Bill Detector', () => {
  it('should detect high-risk bills', async () => {
    const result = await trojanBillDetector.analyze({
      billText: 'Bill with suspicious provisions...',
      billTitle: 'Test Bill',
      pageCount: 150,
      scheduleCount: 10,
      amendmentCount: 0,
      consultationPeriod: 7,
      urgencyLevel: 'urgent'
    });
    
    expect(result.trojanRiskScore).toBeGreaterThan(70);
    expect(result.redFlags).toContain('rushed_process');
  });
});
```

### Integration Tests
```typescript
import { analysisPipeline } from '@/shared/ml';

describe('Analysis Pipeline', () => {
  it('should execute comprehensive bill analysis', async () => {
    const result = await analysisPipeline.executePipeline({
      pipelineId: 'comprehensive-bill-analysis',
      input: mockBillData
    });
    
    expect(result.success).toBe(true);
    expect(result.results.trojanAnalysis).toBeDefined();
    expect(result.results.constitutionalAnalysis).toBeDefined();
  });
});
```

## 🚨 Error Handling

The system includes comprehensive error handling:

```typescript
try {
  const result = await mlOrchestrator.processRequest({
    modelType: 'trojan-bill-detector',
    input: billData,
    options: {
      timeout: 60000,
      priority: 'high'
    }
  });
  
  if (!result.success) {
    console.error('Analysis failed:', result.error);
    // Handle error appropriately
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## 📊 Monitoring & Analytics

### Performance Monitoring
```typescript
// Get cache statistics
const cacheStats = mlOrchestrator.getCacheStats();

// Monitor processing times
const { result, duration } = await ML_UTILS.measurePerformance(
  () => mlOrchestrator.processRequest(request)
);
```

### Model Information
```typescript
// Get model information
const modelInfo = mlOrchestrator.getModelInfo('trojan-bill-detector');

// Get all available models
const availableModels = mlOrchestrator.getAvailableModels();

// Get available pipelines
const pipelines = analysisPipeline.getAvailablePipelines();
```

## 🔒 Security Considerations

1. **Input Validation**: All inputs are validated using Zod schemas
2. **Timeout Protection**: All model executions have configurable timeouts
3. **Resource Limits**: Maximum text length and batch size limits
4. **Error Sanitization**: Errors are sanitized before returning to clients
5. **Access Control**: Implement proper authentication for ML endpoints

## 🚀 Deployment

### Production Deployment
```typescript
import { mlOrchestrator, analysisPipeline } from '@/shared/ml';

// Initialize services
await mlOrchestrator.warmUp();

// Set up health checks
app.get('/health/ml', async (req, res) => {
  const health = await mlOrchestrator.healthCheck();
  const allHealthy = Object.values(health).every(Boolean);
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    models: health
  });
});
```

### Scaling Considerations
- Use Redis for distributed caching
- Implement model load balancing
- Consider GPU acceleration for large-scale deployments
- Monitor memory usage and implement cleanup routines

## 📚 API Reference

### Core Functions

#### `mlOrchestrator.processRequest(request)`
Process a single ML request.

#### `mlOrchestrator.processBatch(requests)`
Process multiple ML requests in batch.

#### `analysisPipeline.executePipeline(input)`
Execute a pre-configured analysis pipeline.

#### `mlIntegrationService.analyzeBill(billData)`
Analyze a bill with full integration support.

### Utility Functions

#### `ML_UTILS.preprocessText(text)`
Preprocess text for ML analysis.

#### `ML_UTILS.calculateConfidence(scores)`
Calculate confidence from multiple scores.

#### `ML_UTILS.measurePerformance(fn)`
Measure execution performance.

## 🤝 Contributing

1. Add new models in the `models/` directory
2. Follow the existing model interface pattern
3. Add comprehensive tests
4. Update this README with new model documentation
5. Consider adding the model to relevant pipelines

## 📄 License

This ML system is part of the political transparency platform and follows the same licensing terms as the main project.

---

For more detailed information about specific models or services, refer to the individual TypeScript files which contain comprehensive JSDoc documentation.
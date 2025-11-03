# Constitutional Analysis Feature

A comprehensive system for analyzing bills against constitutional provisions, finding relevant legal precedents, and flagging analyses that require expert review.

## Overview

The Constitutional Analysis feature provides automated analysis of legislative bills to identify potential constitutional issues, conflicts, and compliance requirements. It's specifically designed for the Kenyan legal system but can be adapted for other jurisdictions.

## Architecture

The feature follows a clean architecture pattern with three main layers:

### Application Layer
- **ConstitutionalAnalyzer**: Main orchestration service
- **ProvisionMatcherService**: Finds relevant constitutional provisions
- **PrecedentFinderService**: Discovers relevant legal precedents
- **ExpertFlaggingService**: Determines when expert review is needed

### Infrastructure Layer
- **Repositories**: Database access for provisions, precedents, analyses, and expert reviews
- **External Services**: Integration with legal databases

### Presentation Layer
- **REST API**: Complete API for constitutional analysis operations

## Key Features

### 🏛️ Constitutional Analysis Engine
- Analyzes bills against Kenya's 2010 Constitution
- Risk assessment (low/medium/high/critical)
- Confidence scoring (0-100%)
- Expert review flagging

### 🔍 Intelligent Provision Matching
- Keyword-based matching
- Semantic similarity analysis
- Rights category analysis
- Context extraction

### ⚖️ Legal Precedent Discovery
- Court hierarchy weighting
- Binding vs persuasive precedents
- Relevance scoring
- Citation analysis

### 👨‍⚖️ Expert Review Intelligence
- Automated flagging
- Priority scoring
- Complexity assessment
- Queue management

## Usage

### Basic Analysis

```typescript
import { createConstitutionalAnalyzer } from './features/constitutional-analysis';

const analyzer = createConstitutionalAnalyzer();

const result = await analyzer.analyzeBill({
  billId: 'bill-001',
  billTitle: 'Computer Misuse and Cybercrimes (Amendment) Bill 2024',
  billContent: 'This bill seeks to amend...',
  urgentAnalysis: false
});

console.log(`Overall Risk: ${result.overallRisk}`);
console.log(`Confidence: ${result.overallConfidence}%`);
console.log(`Analyses: ${result.analyses.length}`);
```

### Using Individual Services

```typescript
import { createAnalysisServices } from './features/constitutional-analysis';

const services = createAnalysisServices();

// Find relevant provisions
const provisions = await services.provisionMatcher.findRelevantProvisions(
  billContent,
  billTitle
);

// Find precedents
const precedents = await services.precedentFinder.findRelevantPrecedents(
  provisionId,
  searchQuery
);
```

### Configuration

```typescript
import { getKenyaAnalysisConfig } from './features/constitutional-analysis';

const config = getKenyaAnalysisConfig();
const analyzer = createConstitutionalAnalyzer(config);
```

## API Endpoints

### Analysis Operations
- `POST /api/constitutional-analysis/analyze` - Analyze a bill
- `GET /api/constitutional-analysis/analyses/:billId` - Get analyses for a bill
- `GET /api/constitutional-analysis/statistics` - Get system statistics

### Provision Search
- `GET /api/constitutional-analysis/provisions/search` - Search provisions
- `GET /api/constitutional-analysis/provisions/:id` - Get specific provision

### Precedent Search
- `GET /api/constitutional-analysis/precedents/search` - Search precedents
- `GET /api/constitutional-analysis/precedents/:id` - Get specific precedent

### Expert Review
- `GET /api/constitutional-analysis/expert-review/queue` - Get review queue
- `POST /api/constitutional-analysis/expert-review/:id/assign` - Assign reviewer
- `PUT /api/constitutional-analysis/expert-review/:id/complete` - Complete review

## Database Schema

The feature uses the following database tables:

### constitutional_provisions
- Constitutional articles, sections, and provisions
- Keywords and rights categories
- Full-text search capabilities

### legal_precedents
- Court cases and legal precedents
- Court hierarchy and citation data
- Relevance scoring

### constitutional_analyses
- Analysis results and reasoning
- Risk assessments and confidence scores
- Expert review status

### expert_review_queue
- Expert review assignments
- Priority and complexity scoring
- Review tracking

## Configuration Options

### Provision Matching
```typescript
provisionMatching: {
  keywordWeighting: 0.4,      // Weight for keyword matches
  semanticWeighting: 0.4,     // Weight for semantic similarity
  structuralWeighting: 0.2,   // Weight for structural analysis
  minRelevanceThreshold: 35   // Minimum relevance score
}
```

### Precedent Analysis
```typescript
precedentAnalysis: {
  courtHierarchyWeights: {
    supreme_court: 1.0,       // Supreme Court weight
    court_of_appeal: 0.8,     // Court of Appeal weight
    high_court: 0.6,          // High Court weight
    subordinate_court: 0.4    // Subordinate courts weight
  },
  recencyWeighting: 0.3,      // Weight for recent cases
  citationWeighting: 0.2,     // Weight for citation frequency
  minRelevanceThreshold: 45   // Minimum relevance score
}
```

### Expert Review
```typescript
expertReview: {
  autoFlagThresholds: {
    confidence: 75,           // Confidence threshold for flagging
    risk: ['high', 'critical'], // Risk levels requiring review
    complexity: 80            // Complexity threshold
  }
}
```

## Testing

Run the test suite:

```bash
npm test server/features/constitutional-analysis/tests/
```

The test suite includes:
- Unit tests for all services
- Integration tests for the full analysis pipeline
- Error handling and edge cases
- Performance benchmarks

## Performance Considerations

### Optimization Strategies
- Database indexing on keywords and provision text
- Caching of frequently accessed provisions and precedents
- Batch processing for multiple bill analyses
- Asynchronous processing for non-urgent analyses

### Monitoring
- Processing time tracking
- Confidence score distributions
- Expert review queue metrics
- Error rate monitoring

## Kenya-Specific Features

### Constitutional Framework
- Based on Kenya's 2010 Constitution
- Bill of Rights analysis
- Devolution considerations
- Public participation requirements

### Court System
- Supreme Court of Kenya (highest authority)
- Court of Appeal
- High Court
- Subordinate courts

### Legal Concepts
- Fundamental rights and freedoms
- Constitutional principles
- Separation of powers
- Judicial review

## Future Enhancements

### Planned Features
- Machine learning-based semantic analysis
- Natural language processing improvements
- Integration with parliamentary systems
- Real-time analysis during legislative sessions

### Scalability
- Microservices architecture
- Event-driven processing
- Distributed caching
- Load balancing

## Contributing

When contributing to this feature:

1. Follow the existing architecture patterns
2. Add comprehensive tests for new functionality
3. Update documentation for API changes
4. Consider performance implications
5. Ensure Kenya-specific requirements are met

## License

This feature is part of the Chanuka legislative analysis platform and follows the same licensing terms.
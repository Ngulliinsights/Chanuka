# Constitutional Intelligence

## Overview

Constitutional Intelligence is an AI-powered feature that analyzes bills for constitutional compliance, identifies potential violations, and provides expert recommendations.

## Features

- **Automated Analysis**: AI-powered analysis of bill text against constitutional provisions
- **Violation Detection**: Identifies potential constitutional concerns with severity ratings
- **Precedent Matching**: Finds relevant legal precedents and case law
- **Expert Review**: Workflow for constitutional experts to review and validate analyses
- **Impact Visualization**: Clear visual representation of constitutional alignment

## How It Works

### 1. Analysis Process

When a bill is analyzed:

1. **Text Processing**: Bill text is parsed and structured
2. **Constitutional Mapping**: Text is mapped to relevant constitutional articles
3. **Violation Detection**: AI identifies potential conflicts or concerns
4. **Precedent Search**: System searches for relevant case law
5. **Scoring**: Overall alignment score is calculated (0-100%)
6. **Report Generation**: Comprehensive analysis report is created

### 2. Alignment Score

The alignment score (0-100%) indicates constitutional compliance:

- **90-100%**: Excellent - No significant concerns
- **70-89%**: Good - Minor concerns that should be reviewed
- **50-69%**: Fair - Moderate concerns requiring attention
- **0-49%**: Concerns - Significant issues identified

### 3. Violation Severity

Violations are categorized by severity:

- **Critical**: Fundamental constitutional conflicts
- **High**: Significant concerns requiring immediate attention
- **Medium**: Moderate issues that should be addressed
- **Low**: Minor concerns for consideration

## User Guide

### Viewing Constitutional Analysis

1. Navigate to any bill detail page
2. Click the "⚖️ Constitutional" tab
3. View the analysis results

If no analysis exists, click "Analyze Bill" to generate one.

### Understanding the Analysis

The analysis display includes:

- **Overall Assessment**: Alignment score and status
- **Constitutional Concerns**: List of identified violations with:
  - Severity level
  - Description of the concern
  - Affected constitutional articles
  - Recommendations for addressing the issue
- **Recommendations**: Suggested improvements
- **Relevant Precedents**: Related case law with relevance scores

### Expert Review

Constitutional experts can:

1. Request review of an analysis
2. Submit their assessment (approved/rejected/needs revision)
3. Add comments and recommendations
4. Track review status

## API Reference

### Analyze Bill

```http
POST /api/constitutional-intelligence/analyze
Content-Type: application/json

{
  "billId": "string",
  "billText": "string",
  "billTitle": "string",
  "billType": "public|private|money|constitutional_amendment",
  "affectedInstitutions": ["string"],
  "proposedChanges": ["string"]
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "billId": "string",
    "alignmentScore": 0.85,
    "violations": [
      {
        "violationType": "string",
        "severity": "low|medium|high|critical",
        "description": "string",
        "affectedArticles": ["string"],
        "recommendation": "string"
      }
    ],
    "recommendations": ["string"],
    "precedents": [
      {
        "caseId": "string",
        "caseName": "string",
        "relevance": 0.95,
        "summary": "string"
      }
    ],
    "analyzedAt": "ISO 8601 timestamp",
    "processingTime": 1234
  }
}
```

### Get Analysis

```http
GET /api/constitutional-intelligence/bill/:billId
```

### Submit Expert Review

```http
POST /api/constitutional-intelligence/review/submit
Content-Type: application/json

{
  "analysisId": "string",
  "billId": "string",
  "expertId": "string",
  "status": "approved|rejected|needs_revision",
  "comments": "string",
  "recommendations": ["string"]
}
```

See [API Documentation](./api/constitutional-intelligence-api.md) for complete API reference.

## Technical Details

### Architecture

```
Bill Text → Constitutional Analyzer → Analysis Engine → Report
     │              │                      │              │
     └─ Parse       └─ ML Model           └─ Score       └─ Display
     └─ Validate    └─ Rule Engine        └─ Detect      └─ Review
```

### Components

- **Constitutional Analyzer**: ML model for constitutional analysis
- **Analysis Service**: Business logic and orchestration
- **Expert Review Workflow**: Review process management
- **Monitoring Integration**: Performance and health tracking

### Performance

- **Analysis Time**: < 2 seconds (p95)
- **API Response**: < 500ms (p95)
- **Cache Hit Rate**: > 70%
- **Accuracy**: > 90% for precedent matching

### Caching

Analysis results are cached for 1 hour. Cache can be cleared via:

```http
DELETE /api/constitutional-intelligence/cache/:billId
```

## Configuration

### Feature Flag

Enable/disable constitutional intelligence:

```json
{
  "constitutional_intelligence": {
    "enabled": true,
    "rolloutPercentage": 100
  }
}
```

### Model Configuration

Configure the constitutional analyzer model:

```typescript
{
  modelVersion: "1.0.0",
  confidenceThreshold: 0.7,
  maxPrecedents: 10,
  cacheEnabled: true,
  cacheTTL: 3600
}
```

## Monitoring

### Metrics

Track these metrics in the monitoring dashboard:

- Total analyses performed
- Average processing time
- Average alignment score
- Violations by type and severity
- Cache hit rate
- Error rate

### Health Check

```http
GET /api/constitutional-intelligence/monitoring/health
```

Returns system health status and performance metrics.

## Troubleshooting

### Analysis Takes Too Long

- Check model server status
- Verify cache is enabled
- Review bill text length (very long bills take longer)

### Low Alignment Scores

- Review violation details for specific concerns
- Check if bill type is correctly specified
- Verify bill text quality and formatting

### Expert Review Not Working

- Verify expert has proper permissions
- Check analysis ID is correct
- Ensure review status is valid

## Best Practices

1. **Run Analysis Early**: Analyze bills during drafting phase
2. **Review Violations**: Carefully review all identified violations
3. **Seek Expert Input**: Request expert review for critical bills
4. **Track Changes**: Re-analyze after significant amendments
5. **Document Decisions**: Record how violations were addressed

## Future Enhancements

- Multi-language support
- Comparative constitutional analysis
- Historical trend analysis
- Integration with legislative drafting tools
- Real-time analysis during bill editing

## Support

For issues or questions:
- Email: constitutional@chanuka.org
- Documentation: https://docs.chanuka.org/constitutional-intelligence
- GitHub Issues: https://github.com/chanuka/platform/issues

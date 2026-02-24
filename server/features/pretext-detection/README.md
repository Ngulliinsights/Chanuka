# Pretext Detection Feature

## Overview

The Pretext Detection feature analyzes legislative text for misleading language, hidden provisions, and deceptive framing. It uses machine learning models to detect potential "trojan bills" and provides alerts for review.

## Architecture

This feature follows Domain-Driven Design (DDD) architecture:

```
pretext-detection/
├── domain/                    # Business logic
│   ├── types.ts              # Domain types
│   └── pretext-analysis.service.ts
├── application/               # Use cases & orchestration
│   ├── pretext-detection.service.ts
│   ├── pretext-detection.controller.ts
│   └── pretext-detection.routes.ts
├── infrastructure/            # External concerns
│   ├── pretext-repository.ts # Data access
│   └── pretext-cache.ts      # Caching layer
└── __tests__/                # Tests
    ├── pretext-detection.service.test.ts
    └── pretext-detection.integration.test.ts
```

## API Endpoints

### POST /api/pretext-detection/analyze

Analyze a bill for pretext indicators.

**Request Body:**
```json
{
  "billId": "string",
  "force": false  // optional, force re-analysis
}
```

**Response:**
```json
{
  "billId": "string",
  "detections": [
    {
      "type": "string",
      "severity": "low|medium|high|critical",
      "description": "string",
      "evidence": ["string"],
      "confidence": 0.85
    }
  ],
  "score": 75,
  "confidence": 0.85,
  "analyzedAt": "2024-02-24T10:00:00Z"
}
```

### GET /api/pretext-detection/alerts

Get pretext alerts (requires authentication).

**Query Parameters:**
- `status` (optional): Filter by status (pending, approved, rejected)
- `limit` (optional): Limit number of results

**Response:**
```json
[
  {
    "id": "string",
    "billId": "string",
    "detections": [...],
    "score": 75,
    "status": "pending",
    "reviewedBy": "string",
    "reviewedAt": "2024-02-24T10:00:00Z",
    "createdAt": "2024-02-24T09:00:00Z"
  }
]
```

### POST /api/pretext-detection/review

Review a pretext alert (requires authentication).

**Request Body:**
```json
{
  "alertId": "string",
  "status": "approved|rejected",
  "notes": "string"  // optional
}
```

**Response:**
```json
{
  "success": true
}
```

### GET /api/pretext-detection/analytics

Get pretext detection analytics (requires authentication).

**Query Parameters:**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "metrics": {
    "usage": {
      "requests": 100,
      "analyses": 80,
      "cacheHits": 20,
      "errors": 0
    },
    "performance": {
      "avgResponseTime": 250,
      "p95ResponseTime": 450
    }
  },
  "cacheStats": {
    "size": 50,
    "ttl": 300000
  }
}
```

## Feature Flag

This feature is controlled by the `pretext-detection` feature flag. All routes are protected by the feature flag middleware.

## Caching

Analysis results are cached for 5 minutes to improve performance. Cache can be bypassed by setting `force: true` in the analyze request.

## Monitoring

The feature integrates with the monitoring system to track:
- Request count
- Analysis count
- Cache hit rate
- Response times
- Error rate

## Database Schema

### pretext_analyses

Stores analysis results for bills.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| bill_id | VARCHAR(255) | Bill identifier (unique) |
| detections | JSONB | Array of detected issues |
| score | DECIMAL(5,2) | Risk score (0-100) |
| confidence | DECIMAL(5,2) | Confidence level (0-100) |
| analyzed_at | TIMESTAMP | When analysis was performed |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Record update time |

### pretext_alerts

Stores alerts for high-risk detections.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| bill_id | VARCHAR(255) | Bill identifier |
| detections | JSONB | Array of detected issues |
| score | DECIMAL(5,2) | Risk score (0-100) |
| status | VARCHAR(50) | Alert status (pending/approved/rejected) |
| reviewed_by | VARCHAR(255) | User who reviewed |
| reviewed_at | TIMESTAMP | When review occurred |
| notes | TEXT | Review notes |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Record update time |

## Testing

Run tests:
```bash
npm test server/features/pretext-detection
```

Run integration tests:
```bash
npm test server/features/pretext-detection/__tests__/pretext-detection.integration.test.ts
```

## Performance

- Target response time: < 500ms (p95)
- Cache TTL: 5 minutes
- Alert threshold: Score >= 60

## Dependencies

- `@server/features/ml/models/trojan-bill-detector` - ML detection model
- `@server/features/monitoring` - Monitoring integration
- `@server/features/feature-flags` - Feature flag control
- `@server/features/notifications` - Alert notifications (TODO)

## Future Enhancements

1. Integration with notification system for real-time alerts
2. Integration with bill service for automatic analysis on bill creation/update
3. Admin dashboard for alert management
4. Historical trend analysis
5. Customizable alert thresholds
6. Webhook support for external integrations

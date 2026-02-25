# Constitutional Intelligence API Documentation

## Overview

The Constitutional Intelligence API provides endpoints for analyzing bills for constitutional compliance, managing expert reviews, and monitoring system health.

**Base URL:** `/api/constitutional-intelligence`

## Authentication

All endpoints require authentication. Include the authentication token in the request headers.

## Endpoints

### Analysis Endpoints

#### POST /analyze

Analyze a bill for constitutional compliance.

**Request Body:**
```json
{
  "billId": "string (required)",
  "billText": "string (required)",
  "billTitle": "string (required)",
  "billType": "public | private | money | constitutional_amendment (required)",
  "affectedInstitutions": ["string"] (optional),
  "proposedChanges": ["string"] (optional)
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
        "severity": "low | medium | high | critical",
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

**Performance:** < 2 seconds (p95)

---

#### GET /bill/:billId

Get constitutional analysis for a specific bill.

**Parameters:**
- `billId` (path): Bill identifier

**Response:**
```json
{
  "success": true,
  "analysis": {
    // Same structure as POST /analyze response
  }
}
```

**Performance:** < 500ms (p95)

---

#### GET /statistics

Get constitutional analysis statistics.

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalAnalyses": 1234,
    "averageAlignmentScore": 0.82,
    "violationsByType": {
      "rights_violation": 45,
      "procedural_issue": 23
    },
    "violationsBySeverity": {
      "critical": 5,
      "high": 15,
      "medium": 30,
      "low": 18
    }
  }
}
```

---

#### DELETE /cache/:billId

Clear cached analysis for a bill.

**Parameters:**
- `billId` (path): Bill identifier

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared"
}
```

---

### Expert Review Endpoints

#### POST /review/request

Create expert review requests for an analysis.

**Request Body:**
```json
{
  "analysisId": "string (required)",
  "billId": "string (required)",
  "expertIds": ["string"] (required, array)
}
```

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "string",
      "analysisId": "string",
      "billId": "string",
      "expertId": "string",
      "status": "pending",
      "comments": "",
      "recommendations": [],
      "createdAt": "ISO 8601 timestamp"
    }
  ]
}
```

**Performance:** < 1 second

---

#### POST /review/submit

Submit an expert review.

**Request Body:**
```json
{
  "analysisId": "string (required)",
  "billId": "string (required)",
  "expertId": "string (required)",
  "status": "approved | rejected | needs_revision (required)",
  "comments": "string (required)",
  "recommendations": ["string"] (optional)
}
```

**Response:**
```json
{
  "success": true,
  "review": {
    "id": "string",
    "analysisId": "string",
    "billId": "string",
    "expertId": "string",
    "status": "approved",
    "comments": "string",
    "recommendations": ["string"],
    "reviewedAt": "ISO 8601 timestamp",
    "createdAt": "ISO 8601 timestamp"
  }
}
```

**Performance:** < 1 second

---

#### GET /review/analysis/:analysisId

Get all reviews for an analysis.

**Parameters:**
- `analysisId` (path): Analysis identifier

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "string",
      "analysisId": "string",
      "billId": "string",
      "expertId": "string",
      "status": "approved | rejected | needs_revision | pending | in_review",
      "comments": "string",
      "recommendations": ["string"],
      "reviewedAt": "ISO 8601 timestamp",
      "createdAt": "ISO 8601 timestamp"
    }
  ]
}
```

---

#### GET /review/pending/:expertId

Get pending reviews for an expert.

**Parameters:**
- `expertId` (path): Expert identifier

**Response:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "string",
      "analysisId": "string",
      "billId": "string",
      "expertId": "string",
      "status": "pending",
      "comments": "",
      "recommendations": [],
      "createdAt": "ISO 8601 timestamp"
    }
  ]
}
```

---

#### GET /review/statistics

Get expert review statistics.

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalReviews": 456,
    "pendingReviews": 23,
    "approvedReviews": 345,
    "rejectedReviews": 67,
    "averageReviewTime": 86400000
  }
}
```

---

### Monitoring Endpoints

#### GET /monitoring/metrics

Get monitoring metrics for constitutional intelligence.

**Response:**
```json
{
  "success": true,
  "metrics": {
    "totalAnalyses": 1234,
    "averageProcessingTime": 1567,
    "averageAlignmentScore": 0.82,
    "violationsByType": {
      "rights_violation": 45,
      "procedural_issue": 23
    },
    "violationsBySeverity": {
      "critical": 5,
      "high": 15,
      "medium": 30,
      "low": 18
    },
    "cacheHitRate": 0.73,
    "errorRate": 0.002
  }
}
```

---

#### GET /monitoring/health

Check health status of constitutional intelligence service.

**Response:**
```json
{
  "success": true,
  "health": {
    "status": "healthy | degraded | unhealthy",
    "details": {
      "errorRate": 0.002,
      "averageProcessingTime": 1567,
      "cacheHitRate": 0.73
    }
  }
}
```

**Health Status Criteria:**
- `healthy`: Error rate < 5%, Processing time < 3000ms
- `degraded`: Error rate 5-10% OR Processing time > 3000ms
- `unhealthy`: Error rate > 10%

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes:**
- `400`: Bad Request - Invalid input parameters
- `404`: Not Found - Resource not found
- `500`: Internal Server Error - Server-side error

---

## Rate Limiting

- Analysis endpoints: 100 requests per minute per user
- Review endpoints: 50 requests per minute per user
- Monitoring endpoints: 200 requests per minute per user

---

## Caching

Analysis results are cached for 1 hour. Use the DELETE /cache/:billId endpoint to clear cache when needed.

---

## Quality Gates

- API response time < 500ms (p95) for GET endpoints
- API response time < 2s (p95) for POST /analyze
- Error rate < 0.1%
- Test coverage > 80%

---

## Examples

### Analyze a Bill

```bash
curl -X POST https://api.example.com/api/constitutional-intelligence/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "billId": "bill-123",
    "billText": "Full text of the bill...",
    "billTitle": "The Example Bill 2026",
    "billType": "public",
    "affectedInstitutions": ["Parliament", "Judiciary"],
    "proposedChanges": ["Amend Article 45"]
  }'
```

### Submit Expert Review

```bash
curl -X POST https://api.example.com/api/constitutional-intelligence/review/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "analysisId": "analysis-456",
    "billId": "bill-123",
    "expertId": "expert-789",
    "status": "approved",
    "comments": "Analysis is thorough and accurate.",
    "recommendations": ["Consider additional precedent review"]
  }'
```

### Check Health

```bash
curl https://api.example.com/api/constitutional-intelligence/monitoring/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

# Pretext Detection API Documentation

## Overview

The Pretext Detection API provides endpoints for analyzing bills for potential "trojan" provisions - hidden clauses that may have unintended consequences or serve purposes different from the bill's stated intent.

**Base URL:** `/api/pretext-detection`

**Feature Flag:** `pretext-detection` (must be enabled)

---

## Authentication

Most endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. Analyze Bill

Analyze a bill for pretext indicators.

**Endpoint:** `POST /api/pretext-detection/analyze`

**Authentication:** Not required (public endpoint)

**Request Body:**

```json
{
  "billId": "string (required)",
  "force": "boolean (optional, default: false)"
}
```

**Parameters:**
- `billId`: The unique identifier of the bill to analyze
- `force`: If true, forces re-analysis even if cached results exist

**Response:** `200 OK`

```json
{
  "billId": "bill-123",
  "detections": [
    {
      "type": "hidden_provision",
      "severity": "high",
      "description": "Detected potentially hidden provision in section 5",
      "evidence": [
        "Section 5 contains broad language that could be interpreted...",
        "Cross-reference to unrelated statute..."
      ],
      "confidence": 85
    }
  ],
  "score": 75,
  "confidence": 82,
  "analyzedAt": "2024-02-24T10:30:00Z"
}
```

**Response Fields:**
- `billId`: The analyzed bill ID
- `detections`: Array of detected pretext indicators
  - `type`: Type of detection (e.g., "hidden_provision", "scope_creep", "vague_language")
  - `severity`: Risk level ("low", "medium", "high", "critical")
  - `description`: Human-readable description of the detection
  - `evidence`: Array of evidence strings supporting the detection
  - `confidence`: Confidence level (0-100)
- `score`: Overall risk score (0-100)
- `confidence`: Overall confidence in the analysis (0-100)
- `analyzedAt`: Timestamp of analysis

**Error Responses:**

`400 Bad Request`
```json
{
  "error": "Bad Request",
  "message": "billId is required"
}
```

`500 Internal Server Error`
```json
{
  "error": "Internal Server Error",
  "message": "Error message"
}
```

**Performance:** < 500ms (p95)

---

### 2. Get Alerts

Retrieve pretext detection alerts.

**Endpoint:** `GET /api/pretext-detection/alerts`

**Authentication:** Required

**Query Parameters:**
- `status` (optional): Filter by status ("pending", "approved", "rejected")
- `limit` (optional): Maximum number of alerts to return

**Example Request:**

```
GET /api/pretext-detection/alerts?status=pending&limit=10
```

**Response:** `200 OK`

```json
[
  {
    "id": "alert-123",
    "billId": "bill-456",
    "detections": [...],
    "score": 85,
    "status": "pending",
    "reviewedBy": null,
    "reviewedAt": null,
    "createdAt": "2024-02-24T10:00:00Z"
  }
]
```

**Response Fields:**
- `id`: Unique alert identifier
- `billId`: Associated bill ID
- `detections`: Array of detections (same format as analyze endpoint)
- `score`: Risk score that triggered the alert
- `status`: Current status ("pending", "approved", "rejected")
- `reviewedBy`: User ID of reviewer (if reviewed)
- `reviewedAt`: Timestamp of review (if reviewed)
- `createdAt`: Alert creation timestamp

**Error Responses:**

`401 Unauthorized`
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

`500 Internal Server Error`
```json
{
  "error": "Internal Server Error",
  "message": "Error message"
}
```

---

### 3. Review Alert

Review and approve/reject a pretext detection alert (admin only).

**Endpoint:** `POST /api/pretext-detection/review`

**Authentication:** Required (admin role)

**Request Body:**

```json
{
  "alertId": "string (required)",
  "status": "approved | rejected (required)",
  "notes": "string (optional)"
}
```

**Parameters:**
- `alertId`: The unique identifier of the alert to review
- `status`: Review decision ("approved" or "rejected")
- `notes`: Optional notes about the review decision

**Response:** `200 OK`

```json
{
  "success": true
}
```

**Error Responses:**

`400 Bad Request`
```json
{
  "error": "Bad Request",
  "message": "alertId and status are required"
}
```

```json
{
  "error": "Bad Request",
  "message": "status must be either \"approved\" or \"rejected\""
}
```

`401 Unauthorized`
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

`500 Internal Server Error`
```json
{
  "error": "Internal Server Error",
  "message": "Error message"
}
```

---

### 4. Get Analytics

Retrieve analytics about pretext detection usage and performance.

**Endpoint:** `GET /api/pretext-detection/analytics`

**Authentication:** Required (admin role)

**Query Parameters:**
- `startDate` (optional): Start date for analytics period (ISO 8601 format)
- `endDate` (optional): End date for analytics period (ISO 8601 format)

**Example Request:**

```
GET /api/pretext-detection/analytics?startDate=2024-02-01&endDate=2024-02-28
```

**Response:** `200 OK`

```json
{
  "metrics": {
    "usage": {
      "activeUsers": 150,
      "totalRequests": 1250,
      "successfulRequests": 1230,
      "failedRequests": 20
    },
    "performance": {
      "avgResponseTime": 245,
      "p95ResponseTime": 420,
      "p99ResponseTime": 480
    },
    "detections": {
      "totalAnalyses": 1230,
      "alertsCreated": 45,
      "averageScore": 35,
      "highRiskCount": 12
    }
  },
  "cacheStats": {
    "size": 150,
    "ttl": 300000
  }
}
```

**Response Fields:**
- `metrics`: Performance and usage metrics
  - `usage`: Request and user statistics
  - `performance`: Response time metrics (in milliseconds)
  - `detections`: Analysis and alert statistics
- `cacheStats`: Cache performance statistics
  - `size`: Number of cached entries
  - `ttl`: Time-to-live in milliseconds

**Error Responses:**

`401 Unauthorized`
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

`500 Internal Server Error`
```json
{
  "error": "Internal Server Error",
  "message": "Error message"
}
```

---

## Detection Types

The system can detect various types of pretext indicators:

| Type | Description | Typical Severity |
|------|-------------|------------------|
| `hidden_provision` | Provisions that may not be immediately apparent | High |
| `scope_creep` | Clauses that extend beyond stated bill purpose | Medium-High |
| `vague_language` | Ambiguous wording that could be broadly interpreted | Medium |
| `cross_reference` | References to unrelated statutes | Medium |
| `sunset_clause` | Missing or problematic expiration clauses | Low-Medium |
| `emergency_powers` | Grants of emergency or extraordinary powers | High-Critical |

---

## Severity Levels

| Level | Score Range | Description |
|-------|-------------|-------------|
| Low | 0-59 | Minor concerns, routine review |
| Medium | 60-74 | Moderate concerns, detailed review recommended |
| High | 75-89 | Significant concerns, expert review required |
| Critical | 90-100 | Severe concerns, immediate attention required |

---

## Rate Limiting

All endpoints are subject to standard API rate limits:
- 100 requests per minute per IP
- 1000 requests per hour per authenticated user

---

## Caching

Analysis results are cached for 5 minutes to improve performance. Use the `force` parameter to bypass cache.

---

## Monitoring

All API calls are monitored for:
- Response times
- Error rates
- Cache hit rates
- Detection accuracy

Metrics are available via the analytics endpoint.

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `500`: Internal Server Error

---

## Examples

### Example 1: Analyze a Bill

```bash
curl -X POST http://localhost:3000/api/pretext-detection/analyze \
  -H "Content-Type: application/json" \
  -d '{"billId": "bill-123"}'
```

### Example 2: Get Pending Alerts

```bash
curl -X GET "http://localhost:3000/api/pretext-detection/alerts?status=pending" \
  -H "Authorization: Bearer <token>"
```

### Example 3: Approve an Alert

```bash
curl -X POST http://localhost:3000/api/pretext-detection/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "alertId": "alert-123",
    "status": "approved",
    "notes": "Confirmed as legitimate concern"
  }'
```

### Example 4: Get Analytics

```bash
curl -X GET "http://localhost:3000/api/pretext-detection/analytics?startDate=2024-02-01" \
  -H "Authorization: Bearer <token>"
```

---

## Integration Notes

### Feature Flag

The pretext detection feature is controlled by the `pretext-detection` feature flag. All routes are protected by feature flag middleware and will return 404 if the feature is disabled.

### Notifications

When alerts are created or reviewed, notifications are sent to relevant users (admins for new alerts, submitters for reviews).

### Database

Analysis results and alerts are persisted in PostgreSQL:
- `pretext_analyses`: Stores analysis results
- `pretext_alerts`: Stores alerts for high-risk detections

### Monitoring

Integration with the monitoring system tracks:
- Feature usage metrics
- Performance metrics
- Error rates
- Health status

---

## Support

For issues or questions about the Pretext Detection API, contact the development team or file an issue in the project repository.

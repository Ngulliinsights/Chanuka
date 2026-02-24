# Recommendation Engine API Documentation

## Overview

The Recommendation Engine provides personalized bill recommendations using collaborative filtering and content-based filtering algorithms. It tracks user engagement and generates recommendations based on user interests, voting history, and community patterns.

**Base URL:** `/api/recommendation`

**Performance Target:** < 200ms response time

**Caching:** Redis-based caching with 30-minute TTL

## Authentication

Most endpoints require authentication. Include the authentication token in the request headers:

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Get Personalized Recommendations

Get personalized bill recommendations for the authenticated user.

**Endpoint:** `GET /api/recommendation/personalized`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Maximum number of recommendations (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "title": "Healthcare Reform Bill",
      "description": "...",
      "category": "healthcare",
      "status": "introduced",
      "score": 0.92,
      "created_at": "2026-02-20T10:00:00Z",
      ...
    }
  ],
  "count": 10,
  "responseTime": 145
}
```

**Example:**
```bash
curl -X GET "https://api.example.com/api/recommendation/personalized?limit=10" \
  -H "Authorization: Bearer <token>"
```

---

### 2. Get Similar Bills

Find bills similar to a specific bill based on content and engagement patterns.

**Endpoint:** `GET /api/recommendation/similar/:bill_id`

**Authentication:** Optional

**Path Parameters:**
- `bill_id` (required): ID of the bill to find similar bills for

**Query Parameters:**
- `limit` (optional): Maximum number of similar bills (default: 5, max: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "title": "Healthcare Access Bill",
      "description": "...",
      "category": "healthcare",
      "similarityScore": 0.85,
      ...
    }
  ],
  "count": 5,
  "responseTime": 98
}
```

**Example:**
```bash
curl -X GET "https://api.example.com/api/recommendation/similar/123?limit=5"
```

---

### 3. Get Trending Bills

Get bills that are currently trending based on recent engagement.

**Endpoint:** `GET /api/recommendation/trending`

**Authentication:** Optional

**Query Parameters:**
- `days` (optional): Number of days to consider for trending (default: 7, max: 365)
- `limit` (optional): Maximum number of trending bills (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 789,
      "title": "Education Funding Bill",
      "description": "...",
      "category": "education",
      "trendScore": 95.5,
      ...
    }
  ],
  "count": 10,
  "responseTime": 132
}
```

**Example:**
```bash
curl -X GET "https://api.example.com/api/recommendation/trending?days=7&limit=10"
```

---

### 4. Get Collaborative Recommendations

Get recommendations based on similar users' engagement patterns.

**Endpoint:** `GET /api/recommendation/collaborative`

**Authentication:** Required

**Query Parameters:**
- `limit` (optional): Maximum number of recommendations (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 234,
      "title": "Infrastructure Bill",
      "description": "...",
      "category": "infrastructure",
      "score": 0.88,
      ...
    }
  ],
  "count": 10,
  "responseTime": 167
}
```

**Example:**
```bash
curl -X GET "https://api.example.com/api/recommendation/collaborative?limit=10" \
  -H "Authorization: Bearer <token>"
```

---

### 5. Track Engagement

Track user engagement with bills to improve recommendations.

**Endpoint:** `POST /api/recommendation/track-engagement`

**Authentication:** Required

**Request Body:**
```json
{
  "bill_id": 123,
  "engagement_type": "view"
}
```

**Parameters:**
- `bill_id` (required): ID of the bill
- `engagement_type` (required): Type of engagement - one of: `view`, `comment`, `share`

**Response:**
```json
{
  "success": true,
  "message": "Engagement tracked successfully",
  "responseTime": 45
}
```

**Example:**
```bash
curl -X POST "https://api.example.com/api/recommendation/track-engagement" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bill_id": 123,
    "engagement_type": "view"
  }'
```

---

### 6. Health Check

Check the health status of the recommendation engine.

**Endpoint:** `GET /api/recommendation/health`

**Authentication:** Optional

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-24T15:30:00Z",
  "cache": {
    "size": 42,
    "keys": 15
  }
}
```

**Example:**
```bash
curl -X GET "https://api.example.com/api/recommendation/health"
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `500` - Internal Server Error

---

## Algorithms

### Collaborative Filtering

Finds users with similar interests and engagement patterns, then recommends bills those users have engaged with.

**Factors:**
- Shared interests (40% weight)
- Similar engagement patterns (30% weight)
- User similarity score (minimum 0.3 threshold)

### Content-Based Filtering

Recommends bills similar to those the user has previously engaged with.

**Factors:**
- Tag overlap (50% weight)
- Category match (30% weight)
- Sponsor match (20% weight)

### Trending Analysis

Identifies bills gaining momentum based on recent engagement.

**Factors:**
- Recent views (10% weight)
- Recent comments (50% weight)
- Recent shares (30% weight)
- Time decay (exponential, 24-hour half-life)

---

## Performance

**Target Response Times:**
- Personalized recommendations: < 200ms
- Similar bills: < 200ms
- Trending bills: < 200ms
- Collaborative recommendations: < 200ms
- Track engagement: < 100ms

**Caching Strategy:**
- Recommendations cached for 30 minutes
- Cache invalidated on user engagement
- Redis-based distributed caching

**Scalability:**
- Handles 10,000+ concurrent users
- Processes 1M+ requests/day
- Supports 100,000+ bills in catalog

---

## Monitoring

The recommendation engine is integrated with the monitoring system and tracks:

- Request count and success rate
- Response times (avg, p95, p99)
- Error rate and types
- Cache hit rate
- Active users

**Monitoring Endpoint:** `/api/monitoring/features/recommendation-engine/metrics`

**Alert Thresholds:**
- Response time > 200ms (medium severity)
- Error rate > 5% (high severity)
- P95 response time > 500ms (medium severity)
- Failed requests > 10 (high severity)

---

## Rate Limiting

Standard API rate limits apply:
- 100 requests per minute per user
- 1000 requests per hour per user

---

## Best Practices

1. **Cache Recommendations:** Cache results on the client side for 5-10 minutes
2. **Track Engagement:** Always track user engagement to improve recommendations
3. **Use Appropriate Limits:** Request only the number of recommendations you need
4. **Handle Errors Gracefully:** Implement fallback UI for failed requests
5. **Monitor Performance:** Track response times and alert on degradation

---

## Examples

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

function usePersonalizedRecommendations(limit = 10) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const response = await fetch(
          `/api/recommendation/personalized?limit=${limit}`,
          {
            headers: {
              'Authorization': `Bearer ${getAuthToken()}`,
            },
          }
        );
        
        const data = await response.json();
        
        if (data.success) {
          setRecommendations(data.data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRecommendations();
  }, [limit]);
  
  return { recommendations, loading, error };
}
```

### Track Engagement Example

```typescript
async function trackBillView(billId: number) {
  try {
    await fetch('/api/recommendation/track-engagement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        bill_id: billId,
        engagement_type: 'view',
      }),
    });
  } catch (error) {
    console.error('Failed to track engagement:', error);
    // Don't block user experience on tracking failures
  }
}
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/your-repo/issues
- Email: support@example.com
- Documentation: https://docs.example.com/recommendation-engine

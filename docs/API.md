# Chanuka Legislative Transparency Platform API Documentation

## Overview

The Chanuka Platform provides a comprehensive REST API for legislative transparency, citizen engagement, and government data integration. This document outlines all available endpoints, their parameters, and response formats.

## Base URL

```
https://api.chanuka.go.ke/v1
```

## Authentication

Most endpoints require authentication. The platform supports:

- **Bearer Token**: `Authorization: Bearer <token>`
- **API Key**: `X-API-Key: <key>`
- **Session Cookie**: Automatic for web clients

## Response Format

All responses follow a consistent JSON structure:

```json
{
  "success": true|false,
  "data": { ... },
  "error": { ... },
  "meta": { ... }
}
```

## Health and System Endpoints

### Schema Validation Health

**GET** `/api/system/health/schema`

Returns the current status of schema validation services.

**Response:**
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2025-11-15T01:36:26.236Z",
  "services": {
    "InputValidationService": {
      "status": "healthy",
      "lastCheck": "2025-11-15T01:36:26.236Z",
      "responseTime": 45
    },
    "GovernmentDataValidationService": {
      "status": "healthy",
      "lastCheck": "2025-11-15T01:36:26.236Z",
      "responseTime": 32
    },
    "DataIntegrityValidationService": {
      "status": "healthy",
      "lastCheck": "2025-11-15T01:36:26.236Z",
      "responseTime": 28
    }
  },
  "schema": {
    "version": "1.0.0",
    "lastValidated": "2025-11-15T01:36:26.236Z",
    "totalSchemas": 45,
    "validSchemas": 45
  }
}
```

**Status Codes:**
- `200`: Services are healthy
- `503`: One or more services are degraded or unhealthy

### Validation Metrics

**GET** `/api/system/metrics/validation`

Provides detailed validation metrics and performance statistics.

**Query Parameters:**
- `period` (optional): Time period for metrics (`1h`, `24h`, `7d`) - default: `24h`
- `service` (optional): Filter by specific service name

**Response:**
```json
{
  "totalValidations": 12547,
  "successfulValidations": 12489,
  "failedValidations": 58,
  "cacheHits": 8923,
  "cacheMisses": 3624,
  "avgValidationTime": 23.45,
  "services": {
    "InputValidationService": {
      "validations": 4521,
      "successRate": 0.987,
      "avgResponseTime": 18.32
    },
    "GovernmentDataValidationService": {
      "validations": 3214,
      "successRate": 0.992,
      "avgResponseTime": 45.67
    },
    "DataIntegrityValidationService": {
      "validations": 4812,
      "successRate": 0.978,
      "avgResponseTime": 12.89
    }
  },
  "errors": {
    "byField": {
      "email": 12,
      "phoneNumber": 8,
      "dateOfBirth": 15
    },
    "byCode": {
      "required": 23,
      "format": 18,
      "range": 17
    }
  }
}
```

### Overall Validation Health

**GET** `/api/system/health/validation`

Returns the overall validation service health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-15T01:36:26.236Z",
  "uptime": "2d 4h 32m",
  "version": "1.0.0",
  "services": [
    {
      "name": "InputValidationService",
      "status": "healthy",
      "description": "Unified input validation service"
    },
    {
      "name": "GovernmentDataValidationService",
      "status": "healthy",
      "description": "Government data validation and integrity"
    },
    {
      "name": "DataIntegrityValidationService",
      "status": "healthy",
      "description": "Database integrity and constraint validation"
    }
  ],
  "lastMaintenance": "2025-11-13T08:00:00.000Z"
}
```

## Bills API

### Get Bills

**GET** `/api/bills`

Retrieve a list of bills with optional filtering.

**Query Parameters:**
- `status`: Bill status (`introduced`, `committee`, `floor`, `passed`, `failed`)
- `sponsor`: Filter by sponsor ID
- `committee`: Filter by committee ID
- `limit`: Number of results (max 100)
- `offset`: Pagination offset
- `sort`: Sort field (`introduced_date`, `title`, `status`)
- `order`: Sort order (`asc`, `desc`)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bill-123",
      "title": "Digital Economy Bill 2025",
      "status": "committee",
      "introduced_date": "2025-01-15",
      "sponsor": {
        "id": "mp-456",
        "name": "Hon. Jane Doe",
        "constituency": "Nairobi Central"
      },
      "committee": {
        "id": "comm-789",
        "name": "ICT Committee"
      },
      "summary": "A bill to regulate digital commerce...",
      "url": "https://parliament.go.ke/bills/bill-123"
    }
  ],
  "meta": {
    "total": 1250,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Get Bill Details

**GET** `/api/bills/{id}`

Retrieve detailed information about a specific bill.

**Path Parameters:**
- `id`: Bill ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "bill-123",
    "title": "Digital Economy Bill 2025",
    "long_title": "An Act to provide for the regulation of digital commerce and related matters",
    "status": "committee",
    "stage": "Second Reading",
    "introduced_date": "2025-01-15",
    "sponsor": {
      "id": "mp-456",
      "name": "Hon. Jane Doe",
      "party": "Jubilee Party",
      "constituency": "Nairobi Central"
    },
    "cosponsors": [
      {
        "id": "mp-789",
        "name": "Hon. John Smith"
      }
    ],
    "committee": {
      "id": "comm-101",
      "name": "ICT and Innovation Committee"
    },
    "summary": "This bill seeks to establish a comprehensive framework for digital commerce...",
    "content": "...full bill text...",
    "amendments": [],
    "votes": [],
    "documents": [
      {
        "type": "bill_text",
        "url": "https://parliament.go.ke/docs/bill-123.pdf",
        "date": "2025-01-15"
      }
    ],
    "timeline": [
      {
        "date": "2025-01-15",
        "event": "Introduced to Parliament",
        "stage": "First Reading"
      }
    ]
  }
}
```

## Users and Authentication API

### User Registration

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "phone": "+254700000000",
  "constituency": "Nairobi Central"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "verified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
}
```

### User Login

**POST** `/api/auth/login`

Authenticate a user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "citizen"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400
  }
}
```

## Comments and Engagement API

### Get Bill Comments

**GET** `/api/bills/{billId}/comments`

Retrieve comments for a specific bill.

**Path Parameters:**
- `billId`: Bill ID

**Query Parameters:**
- `limit`: Number of comments (max 50)
- `offset`: Pagination offset
- `sort`: Sort by (`newest`, `oldest`, `popular`)

### Post Comment

**POST** `/api/bills/{billId}/comments`

Post a new comment on a bill.

**Path Parameters:**
- `billId`: Bill ID

**Request Body:**
```json
{
  "content": "This bill needs more consideration of small businesses.",
  "parent_id": null,
  "anonymous": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "comment-456",
    "content": "This bill needs more consideration of small businesses.",
    "author": {
      "id": "user-123",
      "name": "John Doe",
      "constituency": "Nairobi Central"
    },
    "created_at": "2025-11-15T01:36:26.236Z",
    "votes": 0,
    "replies_count": 0
  }
}
```

## Government Data Integration API

### Sync Government Data

**POST** `/api/admin/government-data/sync`

Trigger synchronization with government data sources. (Admin only)

**Request Body:**
```json
{
  "sources": ["parliament", "senate", "county_assemblies"],
  "force": false,
  "validate_only": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "sync-789",
    "status": "running",
    "sources": ["parliament", "senate"],
    "started_at": "2025-11-15T01:36:26.236Z",
    "estimated_completion": "2025-11-15T02:00:00.000Z"
  }
}
```

### Get Sync Status

**GET** `/api/admin/government-data/sync/{jobId}`

Check the status of a data synchronization job.

**Path Parameters:**
- `jobId`: Synchronization job ID

## Search API

### Search Bills

**GET** `/api/search/bills`

Search for bills using full-text search and filters.

**Query Parameters:**
- `q`: Search query
- `status`: Bill status filter
- `sponsor`: Sponsor filter
- `date_from`: Date range start (YYYY-MM-DD)
- `date_to`: Date range end (YYYY-MM-DD)
- `limit`: Results limit (max 100)
- `offset`: Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "bill-123",
      "title": "Digital Economy Bill 2025",
      "relevance_score": 0.95,
      "highlights": {
        "title": "Digital <mark>Economy</mark> Bill 2025",
        "summary": "...regulate <mark>digital</mark> commerce..."
      }
    }
  ],
  "meta": {
    "total": 47,
    "query": "digital economy",
    "took": 45
  }
}
```

## Notifications API

### Get User Notifications

**GET** `/api/notifications`

Retrieve user's notifications.

**Query Parameters:**
- `read`: Filter by read status (`true`, `false`, `all`)
- `type`: Filter by notification type
- `limit`: Number of notifications (max 50)

### Mark Notification Read

**PUT** `/api/notifications/{id}/read`

Mark a notification as read.

**Path Parameters:**
- `id`: Notification ID

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    }
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Authentication required or failed
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMITED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour
- **Health endpoints**: 60 requests per minute

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1636980000
```

## Versioning

The API uses URL-based versioning. The current version is `v1`. Breaking changes will be introduced in new versions (e.g., `v2`).

## SDKs and Libraries

Official SDKs are available for:

- **JavaScript/TypeScript**: `npm install @chanuka/api-client`
- **Python**: `pip install chanuka-api`
- **Java**: Available on Maven Central

## Support

For API support:

- **Documentation**: https://docs.chanuka.go.ke
- **Status Page**: https://status.chanuka.go.ke
- **Developer Forum**: https://community.chanuka.go.ke
- **Email**: api-support@chanuka.go.ke

## Changelog

### v1.0.0 (Current)
- Initial API release
- Schema validation health endpoints added
- Government data integration endpoints
- User authentication and engagement features
- Search and notification systems
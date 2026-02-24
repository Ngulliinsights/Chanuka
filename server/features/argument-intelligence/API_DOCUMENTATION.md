# Argument Intelligence API Documentation

**Version:** 1.0.0  
**Base URL:** `/api/argument-intelligence`  
**Last Updated:** February 24, 2026

---

## Overview

The Argument Intelligence API provides comprehensive tools for processing, analyzing, and synthesizing citizen comments into structured arguments. It includes features for:

- **Comment Processing**: Automatic extraction of arguments, claims, and evidence from citizen comments
- **Argument Clustering**: Grouping similar arguments by semantic similarity
- **Coalition Finding**: Identifying potential alliances between stakeholder groups
- **Evidence Validation**: Assessing the credibility and verification status of evidence claims
- **Brief Generation**: Creating legislative briefs for different audiences
- **Power Balancing**: Ensuring minority voices remain visible and detecting coordinated campaigns

---

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## Endpoints

### Comment Processing

#### POST /process-comment

Process a single comment for argument extraction.

**Request Body:**
```json
{
  "comment_id": "string",
  "bill_id": "string",
  "commentText": "string",
  "user_id": "string",
  "userDemographics": {
    "expertise": ["string"],
    "organization": "string",
    "reputation_score": 85
  },
  "submissionContext": {
    "commentType": "general",
    "parentId": "string",
    "timestamp": "2026-02-24T10:00:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "extractedArguments": [
      {
        "id": "arg_123",
        "argumentType": "evidence-based",
        "position": "support",
        "strength": 0.85,
        "confidence": 0.92,
        "claims": [
          {
            "id": "claim_456",
            "text": "This bill will improve transparency",
            "type": "normative",
            "confidence": 0.88
          }
        ],
        "evidence": [
          {
            "id": "ev_789",
            "text": "Statistical claim: 75%",
            "type": "statistical",
            "credibility": 0.7
          }
        ]
      }
    ],
    "coalitionMatches": [],
    "processingMetrics": {
      "processingTime": 1250,
      "claimsExtracted": 3,
      "evidenceFound": 2
    }
  },
  "message": "Extracted 1 arguments from comment"
}
```

**Status Codes:**
- `200 OK`: Comment processed successfully
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Invalid or missing authentication token
- `500 Internal Server Error`: Processing failed

---

#### POST /extract-structure

Extract argument structure from text without storing it.

**Request Body:**
```json
{
  "text": "string",
  "bill_id": "string",
  "userContext": {
    "userId": "string",
    "role": "citizen"
  },
  "submissionContext": {
    "source": "comment",
    "timestamp": "2026-02-24T10:00:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "arguments": [
      {
        "argumentType": "causal",
        "claims": ["string"],
        "evidence": ["string"],
        "reasoning": ["string"],
        "predictions": ["string"],
        "valueJudgments": ["string"],
        "confidence": 0.85
      }
    ],
    "argumentChains": [
      {
        "premises": ["string"],
        "conclusion": "string",
        "strength": 0.78
      }
    ],
    "extractionMetrics": {
      "argumentsExtracted": 2,
      "chainsIdentified": 1,
      "averageConfidence": 0.82
    }
  }
}
```

---

### Bill Analysis

#### POST /synthesize-bill/:bill_id

Synthesize all arguments for a bill into a comprehensive analysis.

**URL Parameters:**
- `bill_id` (string, required): The ID of the bill

**Response:**
```json
{
  "success": true,
  "data": {
    "bill_id": "123",
    "majorClaims": [
      {
        "claimText": "This bill improves transparency",
        "supportingComments": 45,
        "opposingComments": 12,
        "evidenceStrength": 0.82,
        "stakeholderGroups": ["civil_society", "experts"],
        "representativeQuotes": ["string"]
      }
    ],
    "evidenceBase": [
      {
        "evidenceType": "statistical",
        "source": "Government Report 2025",
        "verificationStatus": "verified",
        "credibilityScore": 0.9,
        "citationCount": 15
      }
    ],
    "stakeholderPositions": [
      {
        "stakeholderGroup": "civil_society",
        "position": "support",
        "keyArguments": ["string"],
        "evidenceProvided": ["string"],
        "participantCount": 45
      }
    ],
    "consensusAreas": ["string"],
    "controversialPoints": ["string"],
    "legislativeBrief": "string",
    "lastUpdated": "2026-02-24T10:00:00Z"
  },
  "message": "Synthesized 5 major claims for bill"
}
```

---

#### GET /argument-map/:bill_id

Get argument map for bill visualization.

**URL Parameters:**
- `bill_id` (string, required): The ID of the bill

**Response:**
```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "arg_123",
        "type": "argument",
        "label": "Main claim text",
        "position": "support",
        "strength": 0.85
      }
    ],
    "edges": [
      {
        "source": "arg_123",
        "target": "arg_456",
        "type": "supports",
        "weight": 0.75
      }
    ],
    "clusters": [
      {
        "id": "cluster_1",
        "label": "Transparency concerns",
        "members": ["arg_123", "arg_456"],
        "cohesion": 0.82
      }
    ]
  },
  "message": "Argument map retrieved successfully"
}
```

---

### Clustering

#### POST /cluster-arguments

Cluster arguments by semantic similarity.

**Request Body:**
```json
{
  "arguments": [
    {
      "id": "arg_123",
      "text": "string",
      "position": "support"
    }
  ],
  "config": {
    "method": "hierarchical",
    "minSimilarity": 0.6,
    "maxClusters": 10
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clusters": [
      {
        "id": "cluster_1",
        "name": "Transparency concerns",
        "size": 15,
        "position": "support",
        "cohesion": 0.82,
        "representativeClaims": ["string"],
        "members": ["arg_123", "arg_456"]
      }
    ],
    "outliers": ["arg_789"],
    "metrics": {
      "totalClusters": 5,
      "averageCohesion": 0.78,
      "outlierCount": 2
    }
  },
  "message": "Formed 5 clusters from 50 arguments"
}
```

---

#### POST /find-similar

Find arguments similar to a query.

**Request Body:**
```json
{
  "query": "This bill improves transparency",
  "arguments": [
    {
      "id": "arg_123",
      "text": "string"
    }
  ],
  "threshold": 0.6
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "This bill improves transparency",
    "similarArguments": [
      {
        "id": "arg_123",
        "text": "string",
        "similarity": 0.85
      }
    ],
    "count": 10
  }
}
```

---

### Coalition Finding

#### POST /find-coalitions

Find potential coalitions between stakeholder groups.

**Request Body:**
```json
{
  "arguments": [
    {
      "id": "arg_123",
      "text": "string",
      "userId": "user_123",
      "demographics": {
        "group": "civil_society"
      }
    }
  ],
  "userDemographics": {
    "includeGroups": ["civil_society", "experts"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coalitions": [
      {
        "id": "coalition_1",
        "groups": ["civil_society", "experts"],
        "sharedConcerns": ["transparency", "accountability"],
        "compatibility": 0.82,
        "potentialImpact": "high",
        "strategy": {
          "type": "tactical",
          "recommendations": ["string"]
        }
      }
    ],
    "count": 3
  },
  "message": "Found 3 potential coalition opportunities"
}
```

---

#### GET /coalition-opportunities/:bill_id

Discover coalition opportunities for a specific bill.

**URL Parameters:**
- `bill_id` (string, required): The ID of the bill

**Response:**
```json
{
  "success": true,
  "data": {
    "opportunities": [
      {
        "id": "opp_1",
        "groups": ["civil_society", "business"],
        "sharedInterests": ["economic_impact"],
        "divergentViews": ["implementation_timeline"],
        "bridgingStrategy": "string",
        "likelihood": 0.75
      }
    ],
    "count": 5
  },
  "message": "Discovered 5 coalition opportunities"
}
```

---

### Evidence Validation

#### POST /validate-evidence

Validate an evidence claim.

**Request Body:**
```json
{
  "claim": {
    "text": "75% of citizens support this bill",
    "source": "Survey 2025",
    "type": "statistical"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "validationStatus": "verified",
    "credibilityScore": 0.85,
    "sources": [
      {
        "url": "https://example.com/survey",
        "title": "National Survey 2025",
        "credibility": 0.9,
        "lastVerified": "2026-02-20T10:00:00Z"
      }
    ],
    "factChecks": [
      {
        "claim": "string",
        "verdict": "true",
        "confidence": 0.88,
        "explanation": "string"
      }
    ],
    "warnings": []
  },
  "message": "Evidence validation completed with verified status"
}
```

---

#### GET /evidence-assessment/:bill_id

Assess the overall evidence base for a bill.

**URL Parameters:**
- `bill_id` (string, required): The ID of the bill

**Response:**
```json
{
  "success": true,
  "data": {
    "bill_id": "123",
    "evidenceBase": [
      {
        "type": "statistical",
        "count": 15,
        "averageCredibility": 0.82,
        "verifiedCount": 12
      }
    ],
    "overallQuality": 0.78,
    "gaps": ["comparative_analysis", "long_term_impact"],
    "strengths": ["statistical_evidence", "expert_opinions"],
    "recommendations": ["string"]
  },
  "message": "Evidence assessment completed for 45 claims"
}
```

---

### Brief Generation

#### POST /generate-brief

Generate a legislative brief.

**Request Body:**
```json
{
  "bill_id": "123",
  "briefType": "legislative",
  "targetAudience": "committee",
  "includeAppendices": true,
  "focusAreas": ["constitutional_concerns", "economic_impact"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "brief_123",
    "bill_id": "123",
    "briefType": "legislative",
    "targetAudience": "committee",
    "executiveSummary": "string",
    "keyFindings": [
      {
        "category": "constitutional_concerns",
        "finding": "string",
        "severity": "high",
        "evidence": ["string"]
      }
    ],
    "stakeholderAnalysis": {
      "majorGroups": ["string"],
      "positions": ["string"],
      "conflicts": ["string"]
    },
    "evidenceAssessment": {
      "quality": 0.82,
      "gaps": ["string"],
      "strengths": ["string"]
    },
    "recommendationsSection": {
      "recommendations": ["string"],
      "alternatives": ["string"],
      "risks": ["string"]
    },
    "appendices": ["string"],
    "metadata": {
      "generatedBy": "ArgumentIntelligenceService",
      "version": "1.0",
      "sources": 45
    },
    "generatedAt": "2026-02-24T10:00:00Z"
  },
  "message": "Legislative brief generated successfully"
}
```

---

#### POST /generate-public-summary

Generate a citizen-friendly public summary.

**Request Body:**
```json
{
  "bill_id": "123",
  "maxLength": 500,
  "includeVisuals": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "string",
    "bill_id": "123",
    "keyPoints": ["string"],
    "majorConcerns": ["string"],
    "supportingGroups": ["string"],
    "opposingGroups": ["string"],
    "readingLevel": 8,
    "wordCount": 450
  },
  "message": "Public summary generated successfully"
}
```

---

### Power Balancing

#### POST /balance-voices

Balance stakeholder voices to ensure minority representation.

**Request Body:**
```json
{
  "stakeholderPositions": [
    {
      "group": "civil_society",
      "position": "support",
      "participantCount": 100,
      "arguments": ["string"]
    }
  ],
  "argumentData": {
    "totalArguments": 500,
    "demographics": {
      "groups": ["civil_society", "business", "experts"]
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balancedPositions": [
      {
        "group": "civil_society",
        "originalWeight": 0.6,
        "adjustedWeight": 0.5,
        "amplificationFactor": 0.83,
        "visibility": "high"
      }
    ],
    "minorityVoices": [
      {
        "group": "rural_communities",
        "originalWeight": 0.05,
        "adjustedWeight": 0.15,
        "amplificationFactor": 3.0,
        "concerns": ["string"]
      }
    ],
    "equityMetrics": {
      "demographicBalance": 0.78,
      "geographicBalance": 0.82,
      "representationScore": 0.80
    }
  },
  "message": "Balanced 5 stakeholder positions"
}
```

---

#### POST /detect-astroturfing

Detect coordinated inauthentic campaigns.

**Request Body:**
```json
{
  "argumentData": [
    {
      "id": "arg_123",
      "text": "string",
      "userId": "user_123",
      "timestamp": "2026-02-24T10:00:00Z",
      "metadata": {
        "ipAddress": "192.168.1.1",
        "userAgent": "string"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "campaign_1",
        "type": "coordinated",
        "confidence": 0.85,
        "participants": 50,
        "indicators": [
          {
            "type": "identical_text",
            "severity": "high",
            "count": 45
          }
        ],
        "timePattern": {
          "clustered": true,
          "timeWindow": "2 hours"
        },
        "networkPattern": {
          "ipClustering": true,
          "suspiciousAccounts": 30
        }
      }
    ],
    "count": 2
  },
  "message": "Detected 2 potential coordinated campaigns"
}
```

---

### Data Retrieval

#### GET /arguments/:bill_id

Get all arguments for a bill with filtering options.

**URL Parameters:**
- `bill_id` (string, required): The ID of the bill

**Query Parameters:**
- `argumentType` (string, optional): Filter by argument type
- `position` (string, optional): Filter by position (support/oppose/neutral)
- `minConfidence` (number, optional): Minimum confidence score (0-1)
- `limit` (number, optional, default: 50): Maximum number of results
- `offset` (number, optional, default: 0): Pagination offset
- `sortBy` (string, optional, default: created_at): Sort field
- `sortOrder` (string, optional, default: desc): Sort order (asc/desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "arguments": [
      {
        "id": "arg_123",
        "bill_id": "123",
        "user_id": "user_123",
        "argument_text": "string",
        "argument_type": "evidence-based",
        "position": "support",
        "strength": 0.85,
        "confidence": 0.92,
        "created_at": "2026-02-24T10:00:00Z"
      }
    ],
    "count": 50,
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 150
    }
  }
}
```

---

#### GET /search

Search arguments by text query.

**Query Parameters:**
- `q` (string, required): Search query
- `limit` (number, optional, default: 20): Maximum number of results

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "transparency",
    "arguments": [
      {
        "id": "arg_123",
        "text": "string",
        "relevance": 0.92,
        "bill_id": "123"
      }
    ],
    "count": 15
  }
}
```

---

#### GET /statistics/:bill_id

Get argument statistics for a bill.

**URL Parameters:**
- `bill_id` (string, required): The ID of the bill

**Response:**
```json
{
  "success": true,
  "data": {
    "bill_id": "123",
    "totalArguments": 150,
    "positionBreakdown": {
      "support": 85,
      "oppose": 45,
      "neutral": 20
    },
    "typeBreakdown": {
      "evidence-based": 60,
      "normative": 40,
      "causal": 30,
      "comparative": 20
    },
    "averageStrength": 0.75,
    "averageConfidence": 0.82,
    "claimsExtracted": 450,
    "evidenceFound": 280,
    "topStakeholders": [
      {
        "group": "civil_society",
        "argumentCount": 50,
        "averageStrength": 0.80
      }
    ]
  }
}
```

---

#### GET /briefs/:bill_id

Get all briefs for a bill.

**URL Parameters:**
- `bill_id` (string, required): The ID of the bill

**Response:**
```json
{
  "success": true,
  "data": {
    "briefs": [
      {
        "id": "brief_123",
        "bill_id": "123",
        "briefType": "legislative",
        "targetAudience": "committee",
        "executiveSummary": "string",
        "generatedAt": "2026-02-24T10:00:00Z"
      }
    ],
    "count": 3
  }
}
```

---

#### GET /brief/:briefId

Get a specific brief by ID.

**URL Parameters:**
- `briefId` (string, required): The ID of the brief

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "brief_123",
    "bill_id": "123",
    "briefType": "legislative",
    "targetAudience": "committee",
    "executiveSummary": "string",
    "keyFindings": [],
    "stakeholderAnalysis": {},
    "evidenceAssessment": {},
    "recommendationsSection": {},
    "appendices": [],
    "metadata": {},
    "generatedAt": "2026-02-24T10:00:00Z"
  }
}
```

---

### System

#### GET /health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-24T10:00:00Z",
  "services": {
    "database": "connected",
    "argumentProcessor": "ready",
    "nlpServices": "ready"
  }
}
```

**Status Codes:**
- `200 OK`: Service is healthy
- `503 Service Unavailable`: Service is unhealthy

---

## Integration with Comment System

The Argument Intelligence API is automatically integrated with the comment system. When a user creates a comment:

1. The comment is stored in the database
2. The comment is asynchronously processed through the argument intelligence pipeline
3. Arguments, claims, and evidence are extracted and stored
4. The processing happens in the background without blocking the comment creation

**Automatic Processing Flow:**

```
User creates comment
    ↓
Comment stored in database
    ↓
Comment returned to user (immediate)
    ↓
[Background Processing]
    ↓
Argument extraction
    ↓
Claim identification
    ↓
Evidence extraction
    ↓
Results stored in argument tables
```

**Monitoring:**

All argument processing operations are monitored using the performance monitoring service. Metrics tracked include:

- Processing time per comment
- Claims extracted per comment
- Evidence found per comment
- Success/failure rates
- Error types and frequencies

---

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2026-02-24T10:00:00Z"
}
```

**Common Error Codes:**

- `MISSING_REQUIRED_FIELDS`: Required fields are missing from the request
- `INVALID_INPUT`: Input validation failed
- `UNAUTHORIZED`: Authentication failed or token is invalid
- `NOT_FOUND`: Requested resource not found
- `PROCESSING_FAILED`: Argument processing failed
- `DATABASE_ERROR`: Database operation failed
- `INTERNAL_ERROR`: Unexpected server error

---

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

- **Standard endpoints**: 100 requests per minute per user
- **Processing endpoints**: 20 requests per minute per user
- **Brief generation**: 5 requests per minute per user

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708776000
```

---

## Performance Considerations

- **Comment processing**: < 2 seconds per comment
- **Argument clustering**: < 5 seconds for 100 arguments
- **Brief generation**: < 10 seconds for comprehensive brief
- **Coalition finding**: < 3 seconds for stakeholder analysis
- **Evidence validation**: < 1 second per claim

All processing operations are monitored and logged for performance optimization.

---

## Support

For API support, please contact:

- **Email**: api-support@chanuka.go.ke
- **Documentation**: https://docs.chanuka.go.ke/argument-intelligence
- **Status Page**: https://status.chanuka.go.ke

---

**Last Updated:** February 24, 2026  
**API Version:** 1.0.0  
**Maintained by:** Chanuka Platform Team

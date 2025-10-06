# Financial Disclosure Monitoring System

## Overview

The Financial Disclosure Monitoring System is an automated solution for tracking, analyzing, and alerting on financial disclosures from legislative sponsors. It provides comprehensive monitoring capabilities, relationship mapping, completeness scoring, and real-time alerting.

## Features

### 1. Automated Data Collection
- **Continuous Monitoring**: Automatically collects financial disclosure data from sponsors
- **Smart Caching**: Implements intelligent caching to optimize performance
- **Data Enhancement**: Enriches raw disclosure data with completeness scores and risk assessments

### 2. Alert System
- **Real-time Alerts**: Generates alerts for new, updated, or missing disclosures
- **Severity Classification**: Categorizes alerts by severity (info, warning, critical)
- **Conflict Detection**: Identifies potential conflicts of interest
- **Threshold Monitoring**: Alerts when disclosures exceed predefined thresholds

### 3. Financial Relationship Mapping
- **Entity Relationships**: Maps financial relationships between sponsors and organizations
- **Strength Analysis**: Calculates relationship strength on a 0-100 scale
- **Active Monitoring**: Tracks active vs. inactive relationships
- **Multi-source Integration**: Combines data from affiliations and disclosures

### 4. Disclosure Completeness Scoring
- **Comprehensive Scoring**: Evaluates disclosure completeness on a 0-100 scale
- **Risk Assessment**: Categorizes sponsors by risk level (low, medium, high, critical)
- **Missing Disclosure Tracking**: Identifies and tracks missing required disclosures
- **Temporal Analysis**: Considers recency of disclosures in scoring

## API Endpoints

### Disclosure Management

#### Get Financial Disclosures
```http
GET /api/financial-disclosure/disclosures
```

**Query Parameters:**
- `sponsorId` (optional): Filter by specific sponsor
- `limit` (optional): Number of results (default: 50, max: 1000)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "disclosures": [
      {
        "id": 1,
        "sponsorId": 123,
        "disclosureType": "financial",
        "description": "Investment in ABC Corp",
        "amount": 50000,
        "source": "ABC Corporation",
        "dateReported": "2024-01-15T00:00:00Z",
        "isVerified": true,
        "completenessScore": 85,
        "riskLevel": "medium",
        "lastUpdated": "2024-01-15T10:30:00Z"
      }
    ],
    "totalCount": 150,
    "count": 50,
    "pagination": {
      "limit": 50,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### Get Financial Relationships
```http
GET /api/financial-disclosure/relationships/:sponsorId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sponsorId": 123,
    "relationships": [
      {
        "sponsorId": 123,
        "relatedEntity": "ABC Corporation",
        "relationshipType": "investment",
        "strength": 75,
        "financialValue": 50000,
        "isActive": true
      }
    ],
    "count": 5,
    "lastUpdated": "2024-01-15T12:00:00Z"
  }
}
```

#### Get Disclosure Completeness
```http
GET /api/financial-disclosure/completeness/:sponsorId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sponsorId": 123,
    "sponsorName": "John Doe",
    "overallScore": 75,
    "requiredDisclosures": 4,
    "completedDisclosures": 3,
    "missingDisclosures": ["business"],
    "lastUpdateDate": "2024-01-10T00:00:00Z",
    "riskAssessment": "medium",
    "calculatedAt": "2024-01-15T12:00:00Z"
  }
}
```

### Alert Management

#### Create Alert
```http
POST /api/financial-disclosure/alerts
```

**Request Body:**
```json
{
  "type": "new_disclosure",
  "sponsorId": 123,
  "description": "New financial disclosure detected",
  "severity": "info"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "alert_1642248000000_123",
    "type": "new_disclosure",
    "sponsorId": 123,
    "sponsorName": "John Doe",
    "description": "New financial disclosure detected",
    "severity": "info",
    "createdAt": "2024-01-15T12:00:00Z",
    "isResolved": false
  }
}
```

#### Get Sponsor Alerts
```http
GET /api/financial-disclosure/alerts/:sponsorId
```

**Query Parameters:**
- `type` (optional): Filter by alert type
- `severity` (optional): Filter by severity level
- `limit` (optional): Maximum number of results (default: 50, max: 200)

### Monitoring Control

#### Start Automated Monitoring
```http
POST /api/financial-disclosure/monitoring/start
```

#### Stop Automated Monitoring
```http
POST /api/financial-disclosure/monitoring/stop
```

#### Manual Monitoring Check
```http
POST /api/financial-disclosure/monitoring/check
```

### Dashboard and Reporting

#### Get Financial Transparency Dashboard
```http
GET /api/financial-disclosure/dashboard
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSponsors": 150,
    "averageCompletenessScore": 72,
    "recentAlerts": [],
    "topRiskSponsors": [
      {
        "sponsorId": 456,
        "sponsorName": "Jane Smith",
        "overallScore": 25,
        "riskAssessment": "critical"
      }
    ],
    "disclosureStats": {
      "total": 500,
      "verified": 350,
      "pending": 150,
      "byType": {
        "financial": 200,
        "business": 150,
        "investment": 100,
        "income": 50
      }
    },
    "generatedAt": "2024-01-15T12:00:00Z"
  }
}
```

#### Health Check
```http
GET /api/financial-disclosure/health
```

## Configuration

### Disclosure Thresholds
The system uses predefined thresholds for different disclosure types:

```javascript
const DISCLOSURE_THRESHOLDS = {
  financial: 10000,    // KSh 10,000
  investment: 50000,   // KSh 50,000
  income: 100000,      // KSh 100,000
  business: 25000      // KSh 25,000
};
```

### Required Disclosure Types
```javascript
const REQUIRED_DISCLOSURE_TYPES = [
  'financial',
  'business', 
  'investment',
  'income'
];
```

### Monitoring Intervals
```javascript
const MONITORING_INTERVALS = {
  DAILY_CHECK: 24 * 60 * 60 * 1000,      // 24 hours
  WEEKLY_REPORT: 7 * 24 * 60 * 60 * 1000, // 7 days
  MONTHLY_AUDIT: 30 * 24 * 60 * 60 * 1000 // 30 days
};
```

## Usage Examples

### Starting the Monitoring System
```javascript
import { financialDisclosureMonitoringService } from './services/financial-disclosure-monitoring.js';

// Start automated monitoring
financialDisclosureMonitoringService.startAutomatedMonitoring();

// Stop monitoring when shutting down
process.on('SIGTERM', () => {
  financialDisclosureMonitoringService.stopAutomatedMonitoring();
});
```

### Collecting Disclosure Data
```javascript
// Get all disclosures
const allDisclosures = await financialDisclosureMonitoringService.collectFinancialDisclosures();

// Get disclosures for specific sponsor
const sponsorDisclosures = await financialDisclosureMonitoringService.collectFinancialDisclosures(123);
```

### Creating Custom Alerts
```javascript
const alert = await financialDisclosureMonitoringService.createDisclosureAlert(
  'conflict_detected',
  123,
  'Potential conflict between disclosure and affiliation',
  'warning'
);
```

### Building Relationship Maps
```javascript
const relationships = await financialDisclosureMonitoringService.buildFinancialRelationshipMap(123);
```

### Calculating Completeness Scores
```javascript
const completenessReport = await financialDisclosureMonitoringService.calculateDisclosureCompletenessScore(123);
```

## Caching Strategy

The system implements intelligent caching to optimize performance:

- **Transparency Data**: 30 minutes TTL
- **Relationship Data**: 1 hour TTL  
- **Completeness Data**: 15 minutes TTL
- **Alert Data**: 5 minutes TTL
- **Dashboard Data**: 10 minutes TTL

Cache keys are automatically generated and managed by the system.

## Error Handling

The system provides comprehensive error handling:

- **Database Errors**: Graceful fallback with appropriate error messages
- **Validation Errors**: Detailed validation feedback
- **Service Errors**: Categorized error responses (400, 404, 500)
- **Monitoring Errors**: Logged but non-blocking for system stability

## Security Considerations

- **Input Validation**: All inputs are validated using Zod schemas
- **SQL Injection Protection**: Uses parameterized queries via Drizzle ORM
- **Rate Limiting**: API endpoints are protected by rate limiting
- **Audit Logging**: All operations are logged for audit purposes

## Performance Optimization

- **Intelligent Caching**: Multi-level caching strategy
- **Batch Processing**: Bulk operations for efficiency
- **Database Indexing**: Optimized database queries
- **Pagination**: Large result sets are paginated
- **Background Processing**: Heavy operations run in background

## Monitoring and Observability

- **Health Checks**: Comprehensive health monitoring
- **Performance Metrics**: Query timing and cache hit rates
- **Error Tracking**: Detailed error logging and tracking
- **Alert Notifications**: Real-time alert notifications
- **Dashboard Analytics**: Visual monitoring dashboard

## Integration

The Financial Disclosure Monitoring System integrates with:

- **Database Layer**: Drizzle ORM with PostgreSQL
- **Cache Layer**: In-memory cache service
- **Notification System**: Alert notification service
- **Audit System**: Comprehensive audit logging
- **WebSocket Service**: Real-time updates
- **API Layer**: RESTful API endpoints

## Troubleshooting

### Common Issues

1. **Monitoring Not Starting**
   - Check database connectivity
   - Verify service initialization
   - Review error logs

2. **Cache Performance Issues**
   - Monitor cache hit rates
   - Adjust TTL values if needed
   - Clear cache if corrupted

3. **Alert Generation Problems**
   - Verify sponsor data exists
   - Check threshold configurations
   - Review alert creation logs

4. **Dashboard Loading Slowly**
   - Check database performance
   - Verify cache status
   - Review query optimization

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=financial-disclosure:*
```

## Future Enhancements

- **Machine Learning Integration**: Predictive conflict detection
- **External Data Sources**: Integration with external financial databases
- **Advanced Analytics**: Trend analysis and forecasting
- **Mobile Notifications**: Push notifications for critical alerts
- **Automated Reporting**: Scheduled report generation
- **API Rate Limiting**: Enhanced rate limiting per user/role
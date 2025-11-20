# Unified Alert Preference System Documentation

## Overview

The Unified Alert Preference System consolidates all alert management functionality into a single, cohesive service. It provides comprehensive control over how users receive notifications about legislative activities.

## Key Features

### 1. **Multi-Channel Delivery**
- In-app notifications
- Email alerts
- Push notifications (mobile/web)
- SMS messages
- Webhook integrations

### 2. **Smart Filtering**
- User interest matching
- Engagement history analysis
- Trending topic detection
- Duplicate alert prevention
- Spam filtering

### 3. **Flexible Scheduling**
- Immediate delivery
- Batched notifications (hourly/daily/weekly)
- Quiet hours support
- Priority-based routing

### 4. **Granular Control**
- Alert type customization
- Condition-based filtering
- Priority levels (low, normal, high, urgent)
- Channel-specific settings

## Architecture

### Data Storage
All preferences are stored in the `users.preferences` JSON column with the following structure:

```typescript
{
  alertPreferences: AlertPreference[],
  deliveryLogs: AlertDeliveryLog[]
}
```

### Caching Strategy
- User preferences: 1 hour TTL
- Statistics: 5 minutes TTL
- Batched alerts: Until processed

## API Endpoints

### Preference Management

#### Create Alert Preference
```http
POST /api/alert-preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Important Bills",
  "description": "Alerts for high-priority legislation",
  "isActive": true,
  "alertTypes": [
    {
      "type": "bill_status_change",
      "enabled": true,
      "priority": "high",
      "conditions": {
        "billCategories": ["healthcare", "education"]
      }
    }
  ],
  "channels": [
    {
      "type": "email",
      "enabled": true,
      "config": {
        "email": "user@example.com",
        "verified": true
      },
      "priority": "normal"
    }
  ],
  "frequency": {
    "type": "immediate"
  },
  "smartFiltering": {
    "enabled": true,
    "userInterestWeight": 0.6,
    "engagementHistoryWeight": 0.3,
    "trendingWeight": 0.1,
    "duplicateFiltering": true,
    "spamFiltering": true,
    "minimumConfidence": 0.3
  }
}
```

#### Get All Preferences
```http
GET /api/alert-preferences
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "preferences": [...],
    "count": 3
  }
}
```

#### Get Specific Preference
```http
GET /api/alert-preferences/:preferenceId
Authorization: Bearer <token>
```

#### Update Preference
```http
PATCH /api/alert-preferences/:preferenceId
Authorization: Bearer <token>
Content-Type: application/json

{
  "isActive": false,
  "smartFiltering": {
    "minimumConfidence": 0.5
  }
}
```

#### Delete Preference
```http
DELETE /api/alert-preferences/:preferenceId
Authorization: Bearer <token>
```

### Channel Management

#### Verify Channel
```http
POST /api/alert-preferences/:preferenceId/verify-channel
Authorization: Bearer <token>
Content-Type: application/json

{
  "channelType": "email",
  "verificationCode": "123456"
}
```

#### Test Channel
```http
POST /api/alert-preferences/:preferenceId/test-channel
Authorization: Bearer <token>
Content-Type: application/json

{
  "channelType": "email"
}
```

### Alert Processing

#### Process Alert
```http
POST /api/alert-preferences/process-alert
Authorization: Bearer <token>
Content-Type: application/json

{
  "alertType": "bill_status_change",
  "alertData": {
    "billId": 123,
    "title": "Healthcare Reform Act",
    "billCategory": "healthcare",
    "oldStatus": "committee",
    "newStatus": "floor_vote"
  },
  "priority": "high"
}
```

#### Process Batched Alerts
```http
POST /api/alert-preferences/:preferenceId/process-batch
Authorization: Bearer <token>
```

### Analytics

#### Get Delivery Logs
```http
GET /api/alert-preferences/logs/delivery?page=1&limit=20&status=sent
Authorization: Bearer <token>
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 20, max: 100)
- `alertType`: Filter by alert type
- `status`: Filter by delivery status
- `startDate`: Filter by start date (ISO 8601)
- `endDate`: Filter by end date (ISO 8601)

#### Get Statistics
```http
GET /api/alert-preferences/analytics/stats
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "totalPreferences": 5,
    "activePreferences": 3,
    "deliveryStats": {
      "totalAlerts": 150,
      "successfulDeliveries": 142,
      "failedDeliveries": 3,
      "filteredAlerts": 5
    },
    "channelStats": {
      "in_app": {
        "enabled": true,
        "deliveries": 150,
        "successRate": 98.5
      },
      "email": {
        "enabled": true,
        "deliveries": 45,
        "successRate": 95.2
      }
    }
  }
}
```

### Bulk Operations

#### Bulk Update
```http
POST /api/alert-preferences/bulk/update
Authorization: Bearer <token>
Content-Type: application/json

{
  "updates": [
    {
      "preferenceId": "pref_123",
      "data": { "isActive": false }
    },
    {
      "preferenceId": "pref_456",
      "data": { "isActive": true }
    }
  ]
}
```

#### Bulk Enable/Disable
```http
POST /api/alert-preferences/bulk/enable
Authorization: Bearer <token>
Content-Type: application/json

{
  "preferenceIds": ["pref_123", "pref_456"],
  "isActive": false
}
```

### Backup and Restore

#### Export Preferences
```http
GET /api/alert-preferences/backup/export
Authorization: Bearer <token>
```

#### Import Preferences
```http
POST /api/alert-preferences/backup/import
Authorization: Bearer <token>
Content-Type: application/json

{
  "preferences": [...],
  "overwrite": false
}
```

## Smart Filtering Algorithm

The smart filtering system uses a weighted scoring algorithm:

1. **User Interest Score** (weight: 0.6)
   - Matches alert content against user's explicit interests
   - Analyzes bill categories and keywords

2. **Engagement History Score** (weight: 0.3)
   - Evaluates past engagement with similar content
   - Considers category-specific engagement patterns

3. **Trending Score** (weight: 0.1)
   - Factors in current engagement levels
   - Boosts popular/viral content

4. **Filtering Checks**
   - Duplicate detection (24-hour window)
   - Spam detection (>10 alerts/hour threshold)

### Confidence Threshold
Alerts are only sent if the combined confidence score exceeds the `minimumConfidence` setting (default: 0.3).

### Priority Adjustment
Based on confidence scores:
- 0.8+: Adjusted to `high` priority
- 0.6-0.8: Adjusted to `normal` priority
- 0.3-0.6: Adjusted to `low` priority
- <0.3: Filtered out

## Alert Types

| Type | Description | Default Priority |
|------|-------------|------------------|
| `bill_status_change` | Bill moved to new legislative stage | normal |
| `new_comment` | New comment on tracked bill | low |
| `amendment` | Amendment proposed or approved | normal |
| `voting_scheduled` | Vote scheduled for tracked bill | high |
| `sponsor_update` | Sponsor added/removed | normal |
| `engagement_milestone` | Bill reached engagement threshold | low |

## Channel Configuration

### In-App Notifications
```json
{
  "type": "in_app",
  "enabled": true,
  "config": { "verified": true },
  "priority": "normal"
}
```

### Email
```json
{
  "type": "email",
  "enabled": true,
  "config": {
    "email": "user@example.com",
    "verified": true
  },
  "priority": "normal",
  "quietHours": {
    "enabled": true,
    "startTime": "22:00",
    "endTime": "08:00",
    "timezone": "America/New_York"
  }
}
```

### Push Notifications
```json
{
  "type": "push",
  "enabled": true,
  "config": {
    "pushToken": "device_token_here",
    "verified": true
  },
  "priority": "high"
}
```

### SMS
```json
{
  "type": "sms",
  "enabled": true,
  "config": {
    "phoneNumber": "+1234567890",
    "verified": true
  },
  "priority": "urgent"
}
```

### Webhooks
```json
{
  "type": "webhook",
  "enabled": true,
  "config": {
    "webhookUrl": "https://api.example.com/alerts",
    "webhookSecret": "secret_key",
    "verified": true
  },
  "priority": "normal"
}
```

## Batching Configuration

### Hourly Batching
```json
{
  "frequency": {
    "type": "batched",
    "batchInterval": "hourly"
  }
}
```

### Daily Batching
```json
{
  "frequency": {
    "type": "batched",
    "batchInterval": "daily",
    "batchTime": "09:00"
  }
}
```

### Weekly Batching
```json
{
  "frequency": {
    "type": "batched",
    "batchInterval": "weekly",
    "batchTime": "09:00",
    "batchDay": 1
  }
}
```

Note: Urgent priority alerts bypass batching and are delivered immediately.

## Condition-Based Filtering

Conditions allow fine-grained control over which alerts are triggered:

```json
{
  "conditions": {
    "billCategories": ["healthcare", "education"],
    "billStatuses": ["floor_vote", "passed"],
    "sponsorIds": [123, 456],
    "keywords": ["reform", "amendment"],
    "minimumEngagement": 100
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here",
  "code": 400,
  "metadata": {
    "timestamp": "2025-10-12T10:30:00Z",
    "duration": 45,
    "source": "database"
  }
}
```

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Bulk operations: 10 requests/minute
- Alert processing: 1000 alerts/minute per user

## Best Practices

### 1. Start Simple
Begin with a single preference using immediate delivery and in-app notifications.

### 2. Enable Smart Filtering
Smart filtering reduces noise and improves relevance:
```json
{
  "smartFiltering": {
    "enabled": true,
    "minimumConfidence": 0.4
  }
}
```

### 3. Use Conditions Wisely
Apply conditions to focus on specific content:
```json
{
  "conditions": {
    "billCategories": ["your_interest"],
    "minimumEngagement": 50
  }
}
```

### 4. Configure Quiet Hours
Respect user time with quiet hours:
```json
{
  "quietHours": {
    "enabled": true,
    "startTime": "20:00",
    "endTime": "08:00",
    "timezone": "America/New_York"
  }
}
```

### 5. Monitor Delivery Logs
Regularly check delivery logs to optimize settings:
```http
GET /api/alert-preferences/analytics/stats
```

### 6. Batch Low-Priority Alerts
Reduce notification fatigue by batching:
```json
{
  "alertTypes": [
    {
      "type": "new_comment",
      "priority": "low"
    }
  ],
  "frequency": {
    "type": "batched",
    "batchInterval": "daily",
    "batchTime": "09:00"
  }
}
```

## Migration Guide

### From Old Alert System

1. **Export existing preferences** (if applicable)
2. **Create new preferences** using the unified API
3. **Test channels** before going live
4. **Monitor delivery logs** for the first week
5. **Adjust settings** based on user feedback

### Database Migration

The system automatically handles data migration when:
- Users have no preferences → Creates default preference
- Preferences exist → Uses existing data

## Performance Considerations

### Caching
- Preferences cached for 1 hour
- Stats cached for 5 minutes
- Clear cache on updates

### Database Queries
- Preferences stored in JSONB column for fast access
- Delivery logs limited to 1000 most recent per user
- Bulk operations process sequentially

### Scalability
- Async alert processing recommended
- Use job queue for batch processing
- Implement rate limiting at service level

## Troubleshooting

### Alerts Not Received
1. Check preference is active: `isActive: true`
2. Verify channel is enabled and verified
3. Check delivery logs for filtering/errors
4. Verify conditions aren't too restrictive

### Too Many Alerts
1. Increase `minimumConfidence` threshold
2. Enable `duplicateFiltering` and `spamFiltering`
3. Switch to batched delivery
4. Add more specific conditions

### Channel Verification Fails
1. Check email/phone format
2. Verify verification code hasn't expired
3. Check channel configuration

## Security

### Authentication
All endpoints require valid JWT token in Authorization header.

### Data Privacy
- User preferences stored encrypted at rest
- Webhook secrets never returned in API responses
- Delivery logs contain minimal PII

### Rate Limiting
Prevents abuse through per-user rate limiting.

## Support

For issues or questions:
- Check delivery logs: `/api/alert-preferences/logs/delivery`
- Review stats: `/api/alert-preferences/analytics/stats`
- Test endpoints available in non-production environments

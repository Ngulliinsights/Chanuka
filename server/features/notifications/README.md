# Notification System

Comprehensive notification system with multi-channel delivery, smart filtering, and real-time updates.

> **📢 Integration Notice**: The `alert-preferences` feature is being consolidated into this notification system. See [Alert Preferences Integration Plan](./docs/alert-preferences-integration.md) for details.

## Architecture

The notification system follows Domain-Driven Design (DDD) principles with clear separation of concerns:

```
server/features/notifications/          # Business Logic
├── domain/                              # Domain Layer
│   ├── entities/                        # Domain entities
│   ├── services/                        # Domain services
│   │   └── smart-notification-filter.ts # Smart filtering logic
│   └── types.ts                         # Domain types
├── application/                         # Application Layer
│   ├── services/                        # Application services
│   │   ├── notification.service.ts      # Core notification service
│   │   └── alerting-service.ts          # Alerting service
│   ├── notification-orchestrator.ts     # Orchestration logic
│   └── notification-scheduler.ts        # Scheduling logic
└── presentation/                        # Presentation Layer
    └── http/                            # HTTP endpoints
        └── notification-routes.ts       # REST API routes

server/infrastructure/messaging/         # Technical Infrastructure
├── email/                               # Email delivery
│   └── email-service.ts
└── delivery/                            # Channel delivery
    └── channel.service.ts               # Multi-channel delivery

client/src/features/notifications/       # Client-Side
└── model/                               # Client models
    └── notification-service.ts          # Client notification service
```

## Features

### Core Features
- ✅ Multi-channel delivery (In-App, Email, SMS, Push)
- ✅ Smart filtering based on user preferences and engagement
- ✅ Priority-based routing
- ✅ Quiet hours support
- ✅ Bulk notifications
- ✅ Real-time updates (WebSocket ready)
- ✅ Notification batching and scheduling
- ✅ Comprehensive analytics and statistics

### Smart Filtering
- Priority threshold filtering
- Category-based filtering
- Keyword matching
- Sponsor relevance
- User engagement analysis
- Interest-based filtering
- Quiet hours enforcement

### Channel Delivery
- **In-App**: Database + WebSocket
- **Email**: SMTP with HTML templates
- **SMS**: AWS SNS (production) / Mock (development)
- **Push**: Firebase Cloud Messaging (production) / Mock (development)

## Usage

### Server-Side

#### Send a Notification
```typescript
import { notificationService } from '@server/features/notifications';

const result = await notificationService.send({
  user_id: 'user-123',
  type: 'bill_update',
  subType: 'status_change',
  title: 'Bill Status Changed',
  message: 'The Education Reform Bill has been passed',
  priority: 'high',
  relatedBillId: 123,
  category: 'education',
  actionUrl: '/bills/123'
});

console.log(`Sent: ${result.sent}`);
console.log(`Channels: ${result.channels.join(', ')}`);
```

#### Send Bulk Notifications
```typescript
const userIds = ['user-1', 'user-2', 'user-3'];
const template = {
  type: 'system_alert',
  title: 'System Maintenance',
  message: 'Scheduled maintenance tonight',
  priority: 'medium'
};

const result = await notificationService.sendBulk(userIds, template);
console.log(`Sent to ${result.succeeded}/${result.total} users`);
```

#### CRUD Operations
```typescript
// Create
const notification = await notificationService.createNotification({
  user_id: 'user-123',
  type: 'bill_update',
  title: 'New Update',
  message: 'Check out this update'
});

// Read
const notifications = await notificationService.getUserNotifications('user-123', {
  limit: 20,
  offset: 0,
  unreadOnly: true
});

// Update (Mark as Read)
await notificationService.markAsRead('user-123', notification.id);

// Delete
await notificationService.deleteNotification('user-123', notification.id);

// Statistics
const stats = await notificationService.getNotificationStats('user-123');
```

### Client-Side

#### Initialize and Subscribe
```typescript
import { notificationService } from '@client/features/notifications';

// Subscribe to events
const unsubscribe = notificationService.subscribe((event) => {
  if (event.type === 'notification_received') {
    console.log('New notification:', event.data);
    // Update UI
  }
});

// Cleanup
unsubscribe();
```

#### Manage Notifications
```typescript
// Get all notifications
const notifications = notificationService.getNotifications();

// Get unread count
const unreadCount = notificationService.getUnreadCount();

// Mark as read
notificationService.markAsRead(notificationId);

// Mark all as read
notificationService.markAllAsRead();

// Dismiss notification
notificationService.dismissNotification(notificationId);
```

#### Update Preferences
```typescript
notificationService.updatePreferences({
  email: true,
  push: true,
  billStatusChanges: true,
  frequency: 'immediate'
});
```

### REST API

#### Get Notifications
```http
GET /api/notifications?page=1&limit=20&unreadOnly=true
Authorization: Bearer <token>
```

#### Create Notification
```http
POST /api/notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "bill_update",
  "title": "New Update",
  "message": "Check this out",
  "relatedBillId": 123
}
```

#### Mark as Read
```http
PATCH /api/notifications/:id/read
Authorization: Bearer <token>
```

#### Get Statistics
```http
GET /api/notifications/stats
Authorization: Bearer <token>
```

#### Get Enhanced Preferences
```http
GET /api/notifications/preferences/enhanced
Authorization: Bearer <token>
```

#### Test Smart Filter
```http
POST /api/notifications/test-filter
Authorization: Bearer <token>
Content-Type: application/json

{
  "priority": "high",
  "notificationType": "bill_update",
  "category": "education"
}
```

## Configuration

### Environment Variables

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
FROM_EMAIL=noreply@chanuka.gov
FROM_NAME=Chanuka

# SMS Configuration (AWS SNS)
SMS_PROVIDER=aws-sns
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Push Configuration (Firebase)
PUSH_PROVIDER=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_DATABASE_URL=your-database-url

# Development Mode
NODE_ENV=development
NOTIFICATION_MOCK=true  # Use mock providers in development
```

## Testing

### Run All Tests
```bash
npm run test:notifications
```

### Run Specific Test Suites
```bash
# Integration tests
npm run test server/features/notifications/__tests__/notification-integration.test.ts

# Channel delivery tests
npm run test server/infrastructure/messaging/__tests__/channel-delivery.test.ts

# Smart filter tests
npm run test server/features/notifications/__tests__/smart-filter.test.ts

# Client tests
npm run test client/src/features/notifications/__tests__/notification-service.test.ts

# E2E tests
npm run test tests/integration/notification-e2e.test.ts
```

### Test Coverage
- ✅ Unit tests for all services
- ✅ Integration tests for notification flow
- ✅ Channel delivery tests
- ✅ Smart filtering tests
- ✅ Client-side tests
- ✅ End-to-end API tests
- ✅ Error handling tests
- ✅ Performance tests

## Smart Filtering

The smart notification filter evaluates multiple criteria to determine:
1. **Should the notification be sent?**
2. **Which channels should be used?**
3. **Should it be batched or sent immediately?**

### Filtering Criteria
- **Priority Threshold**: Only send notifications meeting user's priority threshold
- **Quiet Hours**: Block non-urgent notifications during quiet hours
- **Category Relevance**: Match against user's category preferences
- **Keyword Matching**: Filter based on keyword preferences
- **Sponsor Relevance**: Consider user's engagement with sponsors
- **Tag Relevance**: Match notification tags with user interests
- **Interest-Based**: Filter based on declared user interests
- **Engagement Profile**: Use historical engagement to predict relevance

### Confidence Scoring
The filter calculates a confidence score (0-1) based on:
- How well the notification matches user preferences
- User's historical engagement with similar content
- Notification priority and urgency
- Time of day and user activity patterns

### Channel Recommendation
Based on confidence and priority:
- **Low Priority**: In-App only
- **Medium Priority**: In-App + Email (if confidence > 0.75)
- **High Priority**: In-App + Email + Push
- **Urgent**: All channels including SMS

## Performance

### Optimizations
- **Caching**: User preferences and engagement profiles cached
- **Batch Processing**: Multiple notifications processed in parallel
- **Connection Pooling**: Database and external service connections pooled
- **Retry Logic**: Exponential backoff for failed deliveries
- **Rate Limiting**: Prevents notification spam

### Benchmarks
- Single notification: < 100ms
- Bulk notifications (100 users): < 2s
- Smart filter evaluation: < 50ms
- Channel delivery (in-app): < 20ms
- Channel delivery (email): < 500ms

## Monitoring

### Health Checks
```typescript
// Service status
const status = notificationService.getStatus();
console.log(status.healthy); // true/false
console.log(status.channels); // Channel status

// Channel connectivity
const connectivity = await notificationChannelService.testConnectivity();
console.log(connectivity.aws.connected);
console.log(connectivity.firebase.connected);
```

### Metrics
- Total notifications sent
- Notifications by channel
- Notifications by priority
- Delivery success rate
- Average delivery time
- Filter block rate
- User engagement rate

## Troubleshooting

### Common Issues

#### Notifications Not Sending
1. Check user preferences are enabled
2. Verify smart filter isn't blocking
3. Check channel configuration
4. Review logs for errors

#### Email Not Delivering
1. Verify SMTP credentials
2. Check email service status
3. Verify user has valid email
4. Check spam folder

#### SMS Not Sending
1. Verify AWS SNS credentials
2. Check phone number format
3. Verify SMS provider configuration
4. Check development mode settings

#### Push Notifications Not Working
1. Verify Firebase credentials
2. Check user has registered device token
3. Verify push permissions granted
4. Check service worker registration

### Debug Mode
```typescript
// Enable debug logging
process.env.LOG_LEVEL = 'debug';

// Test notification
const result = await notificationService.send({
  user_id: 'test-user',
  type: 'bill_update',
  title: 'Debug Test',
  message: 'Testing notification system',
  priority: 'low'
});

console.log('Result:', JSON.stringify(result, null, 2));
```

## Migration Guide

If migrating from old notification system:

1. Update imports:
```typescript
// Old
import { notificationService } from '@server/infrastructure/notifications';

// New
import { notificationService } from '@server/features/notifications';
```

2. Update channel imports:
```typescript
// Old
import { notificationChannelService } from '@server/infrastructure/notifications/notification-channel';

// New
import { notificationChannelService } from '@server/infrastructure/messaging/delivery/channel.service';
```

3. Update email imports:
```typescript
// Old
import { getEmailService } from '@server/infrastructure/notifications/email-service';

// New
import { getEmailService } from '@server/infrastructure/messaging/email/email-service';
```

## Contributing

When adding new features:
1. Follow DDD principles
2. Add comprehensive tests
3. Update documentation
4. Ensure backward compatibility
5. Run full test suite

## License

MIT

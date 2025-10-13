# Notification System Integration Guide

## Architecture Overview

The refactored notification system follows a clean separation of concerns with three core services:

```
┌─────────────────────────────────────────────────────────┐
│           Application Layer (Features)                   │
│  (Bills, Comments, Verification, etc.)                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│      Notification Orchestrator Service                   │
│  • Receives notification requests                        │
│  • Coordinates workflow                                  │
│  • Manages batching & rate limiting                      │
│  • Tracks delivery status                                │
└───────┬─────────────────────────┬───────────────────────┘
        │                         │
        ▼                         ▼
┌──────────────────┐    ┌──────────────────────────────┐
│  Smart Filter    │    │  Channel Service              │
│  Service         │    │  • Email delivery             │
│  • User prefs    │    │  • SMS delivery               │
│  • Engagement    │    │  • Push delivery              │
│  • Categories    │    │  • In-app delivery            │
│  • Keywords      │    │  • Retry logic                │
│  • Timing        │    └──────────────────────────────┘
└──────────────────┘
```

## Core Principles

### 1. **Smart Filter Service** (`smart-notification-filter.ts`)
- **Responsibility**: Decision-making ONLY
- **Does**: Analyzes user preferences, engagement, and context to determine if a notification should be sent
- **Does NOT**: Send notifications, manage channels, or handle delivery
- **Output**: FilterResult with confidence scores and recommendations

### 2. **Notification Channel Service** (`notification-channels.ts`)
- **Responsibility**: Technical delivery ONLY
- **Does**: Sends notifications through various channels (email, SMS, push, in-app)
- **Does NOT**: Make filtering decisions, manage batching, or orchestrate workflow
- **Output**: DeliveryResult with success/failure status per channel

### 3. **Notification Orchestrator Service** (`notification-orchestrator.ts`)
- **Responsibility**: Workflow coordination
- **Does**: Receives requests, uses filter service for decisions, manages batching, handles rate limiting, coordinates channel delivery
- **Does NOT**: Implement filtering logic or channel-specific delivery
- **Output**: Complete notification result with tracking information

## Migration from Old Services

### Replacing Enhanced Notification Service

**Before:**
```typescript
import { enhancedNotificationService } from './enhanced-notification.ts';

await enhancedNotificationService.createEnhancedNotification({
  userId: 'user123',
  type: 'bill_update',
  subType: 'status_change',
  title: 'Bill Status Changed',
  message: 'HB 1234 moved to committee',
  relatedBillId: 1234,
  priority: 'high',
  channels: [...]
});
```

**After:**
```typescript
import { notificationOrchestratorService } from './notification-orchestrator.ts';

await notificationOrchestratorService.sendNotification({
  userId: 'user123',
  billId: 1234,
  notificationType: 'bill_update',
  subType: 'status_change',
  priority: 'high',
  content: {
    title: 'Bill Updated',
    message: 'Status changed'
  }
});
```

## Common Use Cases

### 1. Simple Bill Update Notification

```typescript
import { notificationOrchestratorService } from './notification-orchestrator.ts';

async function notifyBillStatusChange(billId: number, oldStatus: string, newStatus: string) {
  // Get all users tracking this bill
  const trackingUsers = await getUsersTrackingBill(billId);
  
  // Send notifications (orchestrator handles filtering, batching, and delivery)
  const result = await notificationOrchestratorService.sendBulkNotification(
    trackingUsers.map(u => u.id),
    {
      billId,
      notificationType: 'bill_update',
      subType: 'status_change',
      priority: 'medium',
      content: {
        title: 'Bill Status Update',
        message: `Status changed from "${oldStatus}" to "${newStatus}"`,
        htmlMessage: `<p>Status changed from <strong>${oldStatus}</strong> to <strong>${newStatus}</strong></p>`
      },
      metadata: {
        oldStatus,
        newStatus,
        actionUrl: `/bills/${billId}`
      }
    }
  );
  
  console.log(`Sent: ${result.sent}, Filtered: ${result.filtered}, Batched: ${result.batched}`);
}
```

### 2. Urgent System Alert (Skip Filtering)

```typescript
async function sendCriticalAlert(userId: string, message: string) {
  await notificationOrchestratorService.sendNotification({
    userId,
    notificationType: 'system_alert',
    priority: 'urgent',
    content: {
      title: 'Critical System Alert',
      message
    },
    config: {
      skipFiltering: true,  // Bypass smart filtering
      forceImmediate: true, // Skip batching
      channels: ['inApp', 'email', 'sms', 'push'] // All channels
    }
  });
}
```

### 3. Comment Reply Notification

```typescript
async function notifyCommentReply(
  originalCommentUserId: string,
  billId: number,
  replyAuthor: string,
  replyText: string
) {
  await notificationOrchestratorService.sendNotification({
    userId: originalCommentUserId,
    billId,
    notificationType: 'comment_reply',
    priority: 'medium',
    content: {
      title: 'New Reply to Your Comment',
      message: `${replyAuthor} replied: "${replyText.substring(0, 100)}..."`
    },
    metadata: {
      actionUrl: `/bills/${billId}#comments`
    }
  });
}
```

### 4. Batch Processing for Daily Digests

The orchestrator automatically handles batching based on user preferences:

```typescript
// These notifications will be automatically batched for users with daily digest preference
for (const update of dailyBillUpdates) {
  await notificationOrchestratorService.sendNotification({
    userId: update.userId,
    billId: update.billId,
    notificationType: 'bill_update',
    subType: update.type,
    priority: 'low', // Low priority encourages batching
    content: {
      title: update.title,
      message: update.message
    }
  });
}

// Batches are automatically sent at scheduled times (e.g., 9 AM daily)
```

### 5. Testing Specific Channels

```typescript
// Test email delivery directly
import { notificationChannelService } from './notification-channels.ts';

const result = await notificationChannelService.sendToChannel({
  userId: 'user123',
  channel: 'email',
  content: {
    title: 'Test Email',
    message: 'This is a test'
  },
  metadata: {
    priority: 'low'
  }
});

console.log(`Email sent: ${result.success}`);
```

### 6. Check Smart Filter Decision

```typescript
// Test filtering logic without sending
import { smartNotificationFilterService } from './smart-notification-filter.ts';

const filterResult = await smartNotificationFilterService.shouldSendNotification({
  userId: 'user123',
  billId: 1234,
  category: 'Healthcare',
  priority: 'medium',
  notificationType: 'bill_update',
  content: {
    title: 'Test',
    message: 'Test message'
  }
});

console.log(`Should send: ${filterResult.shouldNotify}`);
console.log(`Confidence: ${filterResult.confidence}`);
console.log(`Reasons: ${filterResult.reasons.join(', ')}`);
console.log(`Recommended channels: ${filterResult.recommendedChannels.join(', ')}`);
```

## Configuration

### Environment Variables

```bash
# Email Configuration (for Channel Service)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=notifications@example.com
SMTP_PASS=your-password
SMTP_FROM=SimpleTool <noreply@simpletool.gov>
FRONTEND_URL=https://simpletool.gov

# SMS Configuration (for Channel Service)
SMS_PROVIDER=twilio  # or 'aws-sns' or 'mock'
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_FROM_NUMBER=+1234567890

# Push Notification Configuration (for Channel Service)
PUSH_PROVIDER=firebase  # or 'onesignal' or 'mock'
FIREBASE_SERVER_KEY=your-server-key
FIREBASE_APP_ID=your-app-id
```

## User Preferences Structure

Users control their notification experience through preferences:

```typescript
interface BillTrackingPreferences {
  // Notification type toggles
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
  
  // Delivery frequency
  updateFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  
  // Channel preferences
  notificationChannels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  
  // Smart filtering configuration
  smartFiltering: {
    enabled: boolean;
    priorityThreshold: 'low' | 'medium' | 'high';
    categoryFilters?: string[];
    keywordFilters?: string[];
    sponsorFilters?: string[];
    interestBasedFiltering: boolean;
  };
  
  // Quiet hours
  quietHours?: {
    enabled: boolean;
    startTime: string;  // e.g., "22:00"
    endTime: string;    // e.g., "08:00"
  };
  
  // Batching settings
  advancedSettings?: {
    batchingRules: {
      similarUpdatesGrouping: boolean;
      maxBatchSize: number;
      batchTimeWindow: number;
    };
  };
}
```

## Monitoring and Debugging

### Get Service Status

```typescript
// Orchestrator status
const orchestratorStatus = notificationOrchestratorService.getStatus();
console.log('Batches queued:', orchestratorStatus.batchesQueued);
console.log('Metrics:', orchestratorStatus.metrics);

// Channel service status
const channelStatus = notificationChannelService.getStatus();
console.log('SMS provider:', channelStatus.smsProvider);
console.log('Email configured:', channelStatus.emailConfigured);
console.log('Pending retries:', channelStatus.pendingRetries);
```

### View User Engagement Profile

```typescript
import { smartNotificationFilterService } from './smart-notification-filter.ts';

const profile = await smartNotificationFilterService.getEngagementProfile('user123');

console.log('Top categories:', profile.topCategories);
console.log('Top sponsors:', profile.topSponsors);
console.log('Engagement level:', profile.engagementLevel);
console.log('Preferred times:', profile.preferredNotificationTimes);
```

### Clear Caches

```typescript
// Clear specific user's engagement cache
smartNotificationFilterService.clearUserCache('user123');

// Clear all caches
smartNotificationFilterService.clearAllCaches();
```

## Testing Strategy

### Unit Tests

```typescript
// Test filter logic
describe('SmartNotificationFilter', () => {
  it('should filter notifications outside quiet hours', async () => {
    const result = await smartNotificationFilterService.shouldSendNotification({
      userId: 'user-with-quiet-hours',
      priority: 'medium',
      notificationType: 'bill_update',
      content: { title: 'Test', message: 'Test' }
    });
    
    expect(result.shouldNotify).toBe(false);
    expect(result.reasons).toContain('Currently in quiet hours');
  });
});

// Test channel delivery
describe('NotificationChannelService', () => {
  it('should send email successfully', async () => {
    const result = await notificationChannelService.sendToChannel({
      userId: 'user123',
      channel: 'email',
      content: { title: 'Test', message: 'Test' }
    });
    
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('NotificationOrchestrator Integration', () => {
  it('should handle complete notification workflow', async () => {
    const result = await notificationOrchestratorService.sendNotification({
      userId: 'test-user',
      notificationType: 'bill_update',
      priority: 'medium',
      content: {
        title: 'Integration Test',
        message: 'Testing complete workflow'
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.filtered).toBeDefined();
    expect(result.batched).toBeDefined();
  });
  
  it('should batch low priority notifications', async () => {
    const result = await notificationOrchestratorService.sendNotification({
      userId: 'batching-user',
      notificationType: 'bill_update',
      priority: 'low',
      content: { title: 'Test', message: 'Test' }
    });
    
    expect(result.batched).toBe(true);
    expect(result.batchId).toBeDefined();
  });
});
```

## Performance Considerations

### 1. Caching
- User preferences are cached for 5 minutes
- Bill information is cached for 30 minutes
- Engagement profiles are cached for 24 hours

### 2. Bulk Operations
- Use `sendBulkNotification()` for multiple users
- Processes in chunks of 50 to avoid overwhelming the system
- Automatic delays between chunks

### 3. Rate Limiting
- 50 notifications per user per hour (general)
- 10 urgent notifications per user per hour
- Automatic enforcement by orchestrator

### 4. Batching
- Reduces notification fatigue
- Configurable batch sizes (default: 10)
- Smart scheduling based on user preferences

## Error Handling

All services implement graceful error handling:

```typescript
try {
  const result = await notificationOrchestratorService.sendNotification({...});
  
  if (!result.success) {
    if (result.filtered) {
      console.log('Notification filtered:', result.filterReason);
    } else {
      console.error('Notification failed:', result.error);
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
  // Notification system errors don't crash the application
}
```

## Cleanup and Shutdown

```typescript
// Graceful shutdown
async function shutdown() {
  // Stop batch processing
  notificationOrchestratorService.cleanup();
  
  // Close channel connections
  notificationChannelService.cleanup();
  
  // Clear caches
  smartNotificationFilterService.clearAllCaches();
  
  console.log('Notification system shutdown complete');
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

## Migration Checklist

- [ ] Install/configure SMTP settings for email
- [ ] Configure SMS provider (Twilio/AWS SNS)
- [ ] Configure push notification provider (Firebase/OneSignal)
- [ ] Update all notification calls to use orchestrator service
- [ ] Remove old service imports (enhanced-notification, advanced-notification-service)
- [ ] Update user preference schemas if needed
- [ ] Test filtering logic with various user configurations
- [ ] Test channel delivery for all providers
- [ ] Verify batching behavior
- [ ] Monitor rate limiting in production
- [ ] Set up logging/monitoring for notification metrics
- [ ] Document any custom notification types for your team

## Support and Troubleshooting

### Common Issues

**Issue**: Notifications not being sent
- Check filter results with `smartNotificationFilterService.shouldSendNotification()`
- Verify user has enabled channels in preferences
- Check rate limits with `orchestratorService.getStatus()`

**Issue**: Emails not sending
- Verify SMTP credentials in environment variables
- Check channel service status: `notificationChannelService.getStatus()`
- Review email transporter logs

**Issue**: Too many batched notifications
- Adjust user's `updateFrequency` preference
- Modify `maxBatchSize` in preferences
- Consider setting higher priority for time-sensitive updates

**Issue**: Users receiving too many notifications
- Review and adjust smart filtering settings
- Check rate limiting configuration
- Encourage users to enable smart filtering

## Best Practices

1. **Always use the orchestrator** for application-level notifications
2. **Let the filter service decide** - don't bypass filtering unless truly critical
3. **Use appropriate priorities** - reserve 'urgent' for true emergencies
4. **Provide meaningful content** - clear titles and actionable messages
5. **Include action URLs** - help users navigate to relevant content
6. **Test with various user preferences** - ensure filtering works as expected
7. **Monitor metrics** - track sent/filtered/batched ratios
8. **Respect user choices** - honor channel preferences and quiet hours

## API Reference

### NotificationOrchestratorService

#### `sendNotification(request: NotificationRequest): Promise<NotificationResult>`
Send a single notification through the complete workflow.

#### `sendBulkNotification(userIds: string[], template: Omit<NotificationRequest, 'userId'>): Promise<BulkNotificationResult>`
Send the same notification to multiple users efficiently.

#### `getStatus(): object`
Get current status and metrics.

#### `cleanup(): void`
Stop all processing and cleanup resources.

### SmartNotificationFilterService

#### `shouldSendNotification(criteria: FilterCriteria): Promise<FilterResult>`
Determine if a notification should be sent based on all filtering rules.

#### `getEngagementProfile(userId: string): Promise<UserEngagementProfile>`
Get user's engagement profile (for debugging/admin).

#### `clearUserCache(userId: string): void`
Clear cached engagement data for a specific user.

### NotificationChannelService

#### `sendToChannel(request: ChannelDeliveryRequest): Promise<DeliveryResult>`
Send a notification through a single channel.

#### `sendToMultipleChannels(userId: string, channels: string[], content: object, metadata?: object): Promise<DeliveryResult[]>`
Send to multiple channels in parallel.

#### `getStatus(): object`
Get channel service configuration and status.

---

## Conclusion

The refactored notification system provides a clean, maintainable architecture with clear separation of concerns. Each service has a single responsibility, making the system easier to test, debug, and extend.

For questions or issues, refer to the inline documentation in each service file or contact the platform team. } from './notification-orchestrator.ts';

await notificationOrchestratorService.sendNotification({
  userId: 'user123',
  billId: 1234,
  notificationType: 'bill_update',
  subType: 'status_change',
  priority: 'high',
  content: {
    title: 'Bill Status Changed',
    message: 'HB 1234 moved to committee'
  }
});
```

### Replacing Advanced Notification Service

**Before:**
```typescript
import { advancedNotificationService } from './advanced-notification-service.ts';

await advancedNotificationService.sendNotification({
  userId: 'user123',
  type: 'bill_status_change',
  title: 'Bill Updated',
  message: 'Status changed',
  priority: 'high',
  templateId: 'bill_status_change',
  templateVariables: {...}
});
```

**After:**
```typescript
import { notificationOrchestratorService
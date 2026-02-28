# Messaging Infrastructure Architecture

## Overview

The messaging infrastructure provides a consistent, layered approach to multi-channel message delivery across the Chanuka platform.

## Architecture

```
server/infrastructure/messaging/
├── email/
│   └── email-service.ts          # Email delivery (SMTP, SendGrid, Gmail, Outlook)
├── sms/
│   └── sms-service.ts            # SMS delivery (AWS SNS, Twilio, Mock)
├── push/
│   └── push-service.ts           # Push notifications (Firebase, OneSignal, Mock)
└── delivery/
    └── channel.service.ts        # Orchestrates all channels
```

## Design Principles

### 1. Separation of Concerns

Each channel has its own dedicated service:
- **Email Service**: Handles SMTP, templates, inbox management
- **SMS Service**: Handles AWS SNS, Twilio, phone number normalization
- **Push Service**: Handles Firebase, OneSignal, device token management
- **Channel Service**: Orchestrates all channels, handles in-app notifications

### 2. Consistent Interface

All services follow the same pattern:
```typescript
// Send message
async send(message: Message): Promise<Result>

// Test connectivity
async testConnectivity(): Promise<{ connected: boolean; error?: string }>

// Get status
getStatus(): StatusInfo

// Cleanup
cleanup(): void
```

### 3. Provider Abstraction

Each service supports multiple providers with automatic fallback:
- **Production**: AWS SNS, Firebase, SMTP
- **Development**: Mock providers for testing
- **Fallback**: Automatic fallback to mock when credentials missing

### 4. Retry Logic

All services implement exponential backoff retry:
- Max 3 retry attempts
- Exponential delay: 2^attempt seconds
- Retryable errors: network timeouts, service unavailable

## Services

### Email Service

**Location**: `server/infrastructure/messaging/email/email-service.ts`

**Providers**:
- SMTP (production)
- Mock (development)

**Features**:
- HTML email templates
- Inbox management (read, archive)
- Legislative inquiry extraction
- Fallback queue for failed sends
- Multiple provider support

**Usage**:
```typescript
import { getEmailService } from '@server/infrastructure/messaging/email/email-service';

const emailService = await getEmailService();
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<h1>Welcome!</h1>',
  text: 'Welcome!',
});
```

### SMS Service

**Location**: `server/infrastructure/messaging/sms/sms-service.ts`

**Providers**:
- AWS SNS (production)
- Twilio (stub - requires package installation)
- Mock (development)

**Features**:
- Phone number normalization (Kenya format)
- Phone number masking for logs
- AWS SNS integration
- Automatic fallback to mock

**Usage**:
```typescript
import { smsService } from '@server/infrastructure/messaging/sms/sms-service';

const result = await smsService.sendSMS({
  phoneNumber: '+254700000000',
  message: 'Your verification code is 123456',
  priority: 'high',
});
```

### Push Service

**Location**: `server/infrastructure/messaging/push/push-service.ts`

**Providers**:
- Firebase Cloud Messaging (production)
- OneSignal (stub - requires package installation)
- Mock (development)

**Features**:
- Firebase Admin SDK integration
- Multi-device token support
- Platform-specific payloads (Android, iOS, Web)
- Automatic fallback to mock

**Usage**:
```typescript
import { pushService } from '@server/infrastructure/messaging/push/push-service';

const result = await pushService.sendPush({
  tokens: ['device-token-1', 'device-token-2'],
  title: 'New Bill Update',
  body: 'The Education Reform Bill has been passed',
  data: { billId: '123', type: 'bill_update' },
  priority: 'high',
});
```

### Channel Service

**Location**: `server/infrastructure/messaging/delivery/channel.service.ts`

**Channels**:
- In-App (database + WebSocket)
- Email (via EmailService)
- SMS (via SMSService)
- Push (via PushService)

**Features**:
- Multi-channel orchestration
- Parallel delivery to multiple channels
- Automatic retry with exponential backoff
- Content formatting per channel
- WebSocket integration for real-time updates

**Usage**:
```typescript
import { notificationChannelService } from '@server/infrastructure/messaging/delivery/channel.service';

// Single channel
const result = await notificationChannelService.sendToChannel({
  user_id: 'user-123',
  channel: 'email',
  content: {
    title: 'Bill Update',
    message: 'The Education Reform Bill has been passed',
  },
  metadata: {
    priority: 'high',
    relatedBillId: 123,
  },
});

// Multiple channels
const results = await notificationChannelService.sendToMultipleChannels(
  'user-123',
  ['inApp', 'email', 'push'],
  {
    title: 'Bill Update',
    message: 'The Education Reform Bill has been passed',
  },
  { priority: 'high', relatedBillId: 123 }
);
```

## Configuration

### Environment Variables

```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
FROM_EMAIL=noreply@chanuka.gov
FROM_NAME=Chanuka

# SMS (AWS SNS)
SMS_PROVIDER=aws-sns
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Push (Firebase)
PUSH_PROVIDER=firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_DATABASE_URL=your-database-url

# Development
NODE_ENV=development
NOTIFICATION_MOCK=true  # Use mock providers
```

## Testing

### Unit Tests

Each service has its own test suite:
```bash
npm test server/infrastructure/messaging/email/__tests__/
npm test server/infrastructure/messaging/sms/__tests__/
npm test server/infrastructure/messaging/push/__tests__/
npm test server/infrastructure/messaging/delivery/__tests__/
```

### Integration Tests

Test multi-channel delivery:
```bash
npm test server/features/notifications/__tests__/notification-integration.test.ts
```

## Error Handling

All services use consistent error handling:

1. **Retryable Errors**: Network timeouts, service unavailable
   - Automatic retry with exponential backoff
   - Max 3 attempts

2. **Non-Retryable Errors**: Invalid input, authentication failure
   - Immediate failure
   - Error logged and returned

3. **Fallback**: Missing credentials, provider unavailable
   - Automatic fallback to mock provider (if enabled)
   - Warning logged

## Monitoring

### Health Checks

```typescript
// Test connectivity
const connectivity = await notificationChannelService.testConnectivity();
console.log(connectivity.aws.connected);      // SMS connectivity
console.log(connectivity.firebase.connected); // Push connectivity

// Get status
const status = notificationChannelService.getStatus();
console.log(status.smsProvider);         // 'aws-sns' | 'twilio' | 'mock'
console.log(status.pushProvider);        // 'firebase' | 'onesignal' | 'mock'
console.log(status.awsInitialised);      // true/false
console.log(status.firebaseInitialised); // true/false
```

### Metrics

Track these metrics for each service:
- Total messages sent
- Success rate
- Failure rate
- Average delivery time
- Retry attempts
- Fallback usage

## Future Enhancements

### Planned Features

1. **SMS Service**:
   - Complete Twilio integration (requires `twilio` package)
   - Support for MMS
   - Delivery receipts

2. **Push Service**:
   - Complete OneSignal integration (requires `onesignal-node` package)
   - Rich notifications with images
   - Action buttons

3. **Database Schema**:
   - Add phone number to user schema
   - Create `user_devices` table for push tokens
   - Track delivery status per channel

4. **Advanced Features**:
   - Message templates
   - Scheduled delivery
   - Batch processing
   - Rate limiting per user
   - Delivery analytics

## Migration Guide

### From Old Architecture

If you have code importing from the old structure:

```typescript
// Old (all logic in channel.service.ts)
import { notificationChannelService } from '@server/infrastructure/messaging/delivery/channel.service';

// New (still works - no changes needed)
import { notificationChannelService } from '@server/infrastructure/messaging/delivery/channel.service';
```

The refactoring is backward compatible. The channel service now delegates to dedicated services internally, but the public API remains the same.

### Direct Service Usage

You can now also use services directly:

```typescript
// Direct SMS usage
import { smsService } from '@server/infrastructure/messaging/sms/sms-service';
await smsService.sendSMS({ phoneNumber: '+254700000000', message: 'Hello' });

// Direct Push usage
import { pushService } from '@server/infrastructure/messaging/push/push-service';
await pushService.sendPush({ tokens: ['token'], title: 'Hi', body: 'Hello' });
```

## Contributing

When adding new features:

1. Follow the established service pattern
2. Add comprehensive tests
3. Update this documentation
4. Ensure backward compatibility
5. Add environment variable documentation

## License

MIT

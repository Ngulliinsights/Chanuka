# 📦 Notification Services - Clean Architecture

## 🎯 Overview

This module provides a comprehensive notification system following clean architecture principles with clear separation between core, advanced, and specialized services.

## 🏗️ Architecture

### **Core Services** (Basic Operations)
Essential notification functionality for everyday use:

- **`notification-service.ts`** - Basic CRUD operations, real-time delivery
- **`email-service.ts`** - All email functionality with SMTP configuration
- **`notification-routes.ts`** - REST API endpoints

### **Advanced Services** (Multi-channel & Smart Features)
Enhanced capabilities for complex notification scenarios:

- **`advanced-notification-service.ts`** - Multi-channel delivery, smart filtering, batching, templates

### **Specialized Services** (Domain-specific Features)
Focused services for specific use cases:

- **`enhanced-notification.ts`** - Advanced processing and filtering
- **`notification-scheduler.ts`** - Cron jobs, digest management, scheduling
- **`smart-notification-filter.ts`** - AI/ML-based filtering and engagement profiling
- **`notification-channels.ts`** - Channel management (email, SMS, push, in-app)
- **`alerting-service.ts`** - System alerting and monitoring

## 🚀 Quick Start

### Basic Usage
```typescript
import { notificationService, emailService } from './infrastructure/notifications/index.js';

// Create a basic notification
await notificationService.createNotification({
  userId: 'user123',
  type: 'bill_update',
  title: 'Bill Status Changed',
  message: 'Your tracked bill has been updated',
  relatedBillId: 456
});

// Send an email
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<h1>Welcome to our platform!</h1>'
});
```

### Advanced Usage
```typescript
import { advancedNotificationService } from './infrastructure/notifications/index.js';

// Send multi-channel notification with smart filtering
await advancedNotificationService.sendNotification({
  userId: 'user123',
  type: 'bill_status_change',
  title: 'Important Bill Update',
  message: 'A bill you care about has changed status',
  priority: 'high',
  channels: ['in_app', 'email', 'push'],
  templateId: 'bill_status_change',
  templateVariables: {
    billTitle: 'Healthcare Reform Act',
    oldStatus: 'In Committee',
    newStatus: 'Passed House'
  }
});
```

### Specialized Usage
```typescript
import { 
  notificationSchedulerService,
  smartNotificationFilterService 
} from './infrastructure/notifications/index.js';

// Schedule digest notifications
await notificationSchedulerService.scheduleDigest({
  userId: 'user123',
  frequency: 'daily',
  timeOfDay: '09:00'
});

// Apply smart filtering
const filterResult = await smartNotificationFilterService.applySmartFilter({
  userId: 'user123',
  billId: 456,
  priority: 'medium',
  notificationType: 'bill_update'
});
```

## 📋 API Endpoints

All notification endpoints are available through the consolidated routes:

```typescript
import { notificationRoutes } from './infrastructure/notifications/index.js';

// In your Express app:
app.use('/api/notifications', notificationRoutes);
```

### Available Endpoints:
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Create notification
- `PATCH /api/notifications/:id/read` - Mark as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/stats` - Get statistics
- `GET /api/notifications/preferences/enhanced` - Get enhanced preferences
- `PATCH /api/notifications/preferences/channels` - Update channel preferences
- `GET /api/notifications/status` - Service status

## 🔧 Configuration

### Environment Variables
```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@Chanuka.gov

# Application
BASE_URL=https://yourapp.com
```

### Service Initialization
All services are automatically initialized as singletons. No manual setup required.

## 📊 Service Status

Check the health of all notification services:

```typescript
import { 
  notificationService, 
  emailService, 
  advancedNotificationService 
} from './infrastructure/notifications/index.js';

console.log('Core:', notificationService.getStatus());
console.log('Email:', emailService.getStatus());
console.log('Advanced:', advancedNotificationService.getStatus());
```

## 🧹 Cleanup

All services implement proper cleanup for graceful shutdown:

```typescript
import { 
  advancedNotificationService,
  emailService 
} from './infrastructure/notifications/index.js';

// Cleanup on application shutdown
process.on('SIGTERM', async () => {
  await advancedNotificationService.cleanup();
  emailService.close();
});
```

## 🎯 Best Practices

1. **Use Core Services** for basic notification needs
2. **Use Advanced Services** for multi-channel delivery and smart filtering
3. **Use Specialized Services** for domain-specific requirements
4. **Always handle errors** gracefully in notification operations
5. **Implement proper cleanup** in your application shutdown process
6. **Monitor service status** for production deployments

## 📈 Performance

- **Connection Pooling**: Email service uses connection pooling for better performance
- **Batching**: Advanced service supports notification batching for efficiency
- **Caching**: User preferences and engagement profiles are cached
- **Rate Limiting**: Built-in rate limiting prevents service overload
- **Resource Management**: Proper cleanup prevents memory leaks

## 🔒 Security

- **Input Validation**: All inputs are validated using Zod schemas
- **Authentication**: API endpoints require proper authentication
- **Sanitization**: Email content is sanitized to prevent XSS
- **Rate Limiting**: Protection against notification spam
- **Error Handling**: Secure error messages without sensitive data exposure

## 📚 Migration Guide

See `MIGRATION_COMPLETED.md` for details on the completed migration from the old fragmented services to this clean architecture.

## 🐛 Troubleshooting

### Common Issues

1. **Email not sending**: Check SMTP configuration and credentials
2. **Notifications not appearing**: Verify WebSocket connection and user authentication
3. **Performance issues**: Check service status and resource usage
4. **Template errors**: Validate template variables and syntax

### Debug Mode
Enable debug logging by setting environment variables:
```bash
DEBUG_NOTIFICATIONS=true
DEBUG_EMAIL=true
```

## 🤝 Contributing

When adding new notification features:

1. **Core functionality** → Add to `notification-service.ts`
2. **Advanced features** → Add to `advanced-notification-service.ts`  
3. **Specialized features** → Create new specialized service
4. **API endpoints** → Add to `notification-routes.ts`
5. **Update exports** → Add to `index.ts`

## 📄 License

This notification system is part of the Chanuka Legislative Tracking Platform.
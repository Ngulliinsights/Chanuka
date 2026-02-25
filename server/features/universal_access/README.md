# Universal Access Module

## Overview

The Universal Access module provides USSD (Unstructured Supplementary Service Data) based access to legislative information, ensuring that all Kenyan citizens can access Chanuka's services regardless of their device or internet connectivity.

## Features

### Core Functionality
- ✅ USSD session management
- ✅ Multi-language support (English, Swahili, Kikuyu)
- ✅ Menu-based navigation
- ✅ Bill tracking and search
- ✅ MP information lookup
- ✅ SMS alert subscriptions
- ✅ Analytics and usage tracking

### Technical Features
- Session timeout management
- Request validation
- Phone number normalization
- Rate limiting (ready for Redis integration)
- Comprehensive logging
- Privacy-focused analytics

## Architecture

```
universal_access/
├── ussd.types.ts          # TypeScript type definitions
├── ussd.config.ts         # Configuration and menu structures
├── ussd.service.ts        # Core USSD business logic
├── ussd.controller.ts     # HTTP request handlers
├── ussd.routes.ts         # Express routes
├── ussd.validator.ts      # Input validation
├── ussd.analytics.ts      # Usage analytics
├── ussd.middleware.ts     # Express middleware
└── index.ts               # Module exports
```

## Usage

### Dialing the Service

Users dial: `*384*96#`

### Menu Structure

```
Main Menu
├── 1. Active Bills
│   ├── 1. Latest Bills
│   ├── 2. By Category
│   ├── 3. Search Bill
│   └── 0. Back
├── 2. My MP Info
│   ├── 1. Find by Constituency
│   ├── 2. Find by Name
│   └── 0. Back
├── 3. Track Bill
│   ├── 1. Enter Bill Number
│   ├── 2. My Tracked Bills
│   └── 0. Back
├── 4. Alerts
│   ├── 1. Subscribe
│   ├── 2. Unsubscribe
│   ├── 3. My Alerts
│   └── 0. Back
├── 5. Language
│   ├── 1. English
│   ├── 2. Kiswahili
│   ├── 3. Kikuyu
│   └── 0. Back
└── 0. Help
    ├── 1. How to Use
    ├── 2. About Chanuka
    ├── 3. Contact
    └── 0. Back
```

## API Integration

### USSD Gateway Endpoint

```typescript
POST /api/ussd
Content-Type: application/json

{
  "sessionId": "ATUid_abc123",
  "serviceCode": "*384*96#",
  "phoneNumber": "+254712345678",
  "text": "1*2"
}
```

### Response Format

```
CON Welcome to Chanuka
1. Active Bills
2. My MP Info
3. Track Bill
4. Alerts
5. Language
0. Help
```

- `CON` = Continue session
- `END` = End session

## Configuration

### Environment Variables

```env
USSD_SERVICE_CODE=*384*96#
USSD_SESSION_TIMEOUT=180
USSD_MAX_TEXT_LENGTH=160
USSD_DEFAULT_LANGUAGE=en
```

### Supported Languages

- `en` - English
- `sw` - Kiswahili (Swahili)
- `ki` - Kikuyu

## Integration Points

### Bills Service
- Fetch active bills
- Search bills by keyword
- Get bill details
- Track bill status

### Sponsors Service
- Find MP by constituency
- Find MP by name
- Get MP contact information

### Notifications Service
- Subscribe to SMS alerts
- Manage alert preferences
- Send bill update notifications

## Analytics

The module tracks:
- Total sessions
- Completion rates
- Average session duration
- Popular menu paths
- Language preferences
- User engagement patterns

### Get Analytics

```typescript
import { ussdAnalytics } from './ussd.analytics';

const stats = ussdAnalytics.getStatistics();
console.log(stats);
```

## Security

### Phone Number Privacy
- Phone numbers are anonymized in analytics
- Only last 2 digits and first 4 digits stored
- No PII in logs

### Rate Limiting
- 10 requests per minute per phone number
- 100 requests per hour per phone number
- Ready for Redis-based distributed rate limiting

### Input Validation
- Phone number format validation
- Menu option validation
- Text length limits
- SQL injection prevention

## Testing

### Unit Tests

```bash
npm test server/features/universal_access
```

### Integration Tests

Test with USSD simulator or gateway sandbox:

```bash
curl -X POST http://localhost:3000/api/ussd \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test123",
    "serviceCode": "*384*96#",
    "phoneNumber": "+254712345678",
    "text": ""
  }'
```

## Future Enhancements

### Phase 2
- [ ] Voice response integration (IVR)
- [ ] SMS fallback for long responses
- [ ] Offline bill caching
- [ ] USSD push notifications

### Phase 3
- [ ] WhatsApp integration
- [ ] Telegram bot
- [ ] Facebook Messenger bot
- [ ] Twitter DM bot

### Phase 4
- [ ] AI-powered natural language queries
- [ ] Voice-to-text for accessibility
- [ ] Multi-channel unified experience

## Deployment

### Gateway Integration

Supported USSD gateways:
- Africa's Talking
- Safaricom USSD Gateway
- Airtel USSD API
- Telkom USSD Service

### Configuration Example (Africa's Talking)

```typescript
// In your gateway configuration
const gatewayConfig = {
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
  shortCode: '*384*96#',
  callbackUrl: 'https://api.chanuka.ke/api/ussd'
};
```

## Monitoring

### Health Check

```bash
GET /api/ussd/health
```

Response:
```json
{
  "status": "healthy",
  "service": "ussd",
  "timestamp": "2024-02-25T10:30:00Z"
}
```

### Metrics

- Session creation rate
- Session completion rate
- Average response time
- Error rate
- Active sessions count

## Support

For issues or questions:
- Email: support@chanuka.ke
- SMS: 0700123456
- Web: https://chanuka.ke/support

## License

Proprietary - Chanuka Platform

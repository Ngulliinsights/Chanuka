# Privacy and GDPR Compliance Implementation

This directory contains comprehensive privacy and GDPR compliance components for the Chanuka platform.

## Overview

The privacy implementation provides:

1. **Cookie Consent Management** - GDPR-compliant cookie consent with granular controls
2. **Data Retention Policies** - Automatic data cleanup and retention management
3. **Privacy-focused Analytics** - Analytics with user consent and privacy protection
4. **Transparent Data Usage Reporting** - Clear reporting of how user data is used
5. **GDPR Rights Management** - Complete implementation of GDPR data subject rights

## Components

### CookieConsentBanner

A comprehensive cookie consent banner that:

- Provides granular cookie category controls
- Remembers user preferences
- Automatically reconfirms consent annually
- Applies cookie settings immediately
- Supports customization and detailed privacy information

**Usage:**

```tsx
import { CookieConsentBanner } from '@/components/privacy';

function App() {
  return (
    <div>
      {/* Your app content */}
      <CookieConsentBanner onConsentChange={consent => console.log('Consent updated:', consent)} />
    </div>
  );
}
```

### DataUsageReportDashboard

A transparent dashboard showing:

- Data collection statistics
- Data categories and purposes
- Retention policies
- Third-party sharing information
- User data management actions

**Features:**

- Real-time data usage metrics
- Category-specific data breakdown
- Export and deletion capabilities
- Retention compliance tracking

### GDPRComplianceManager

Complete GDPR rights management including:

- Right of Access (data export)
- Right to Rectification
- Right to Erasure (deletion)
- Right to Data Portability
- Right to Restrict Processing
- Right to Object
- Consent management
- Data Protection Officer contact

**GDPR Rights Implemented:**

- ✅ Right of Access (Article 15)
- ✅ Right to Rectification (Article 16)
- ✅ Right to Erasure (Article 17)
- ✅ Right to Restrict Processing (Article 18)
- ✅ Right to Data Portability (Article 20)
- ✅ Right to Object (Article 21)
- ✅ Rights related to automated decision making (Article 22)

## Services

### dataRetentionService

Manages data retention policies and automatic cleanup:

```typescript
import { dataRetentionService } from '@client/lib/services';

// Get retention policies
const policies = dataRetentionService.getRetentionPolicies();

// Schedule data cleanup
const jobs = await dataRetentionService.scheduleDataCleanup();

// Get user data summary
const summary = await dataRetentionService.getUserDataSummary(userId);
```

**Features:**

- Configurable retention periods per data category
- Automatic cleanup scheduling
- Legal basis tracking
- Exception handling for legal requirements
- Backup creation before deletion

### privacyAnalyticsService

Privacy-focused analytics with user consent:

```typescript
import { privacyAnalyticsService } from '@/services/privacyAnalyticsService';

// Initialize with user consent
privacyAnalyticsService.initialize({
  analytics: true,
  performance: true,
  functional: false,
  timestamp: new Date().toISOString(),
  version: '1.0.0',
});

// Track events with privacy protection
privacyAnalyticsService.track('engagement', 'button_click', 'save_bill');

// Update consent
privacyAnalyticsService.updateConsent({ analytics: false });
```

**Features:**

- Consent-based tracking
- Data anonymization
- Do Not Track support
- Automatic data retention
- User data export/deletion

## Privacy Utilities

### privacyCompliance

Core privacy compliance utilities:

```typescript
import { privacyCompliance } from '@/utils/privacy-compliance';

// Record consent
const consent = privacyCompliance.recordConsent(userId, 'analytics', true);

// Validate privacy settings
const validation = privacyCompliance.validatePrivacySettings(settings);

// Generate data export
const exportRequest = await privacyCompliance.generateDataExport(userId, 'json', [
  'profile',
  'activity',
]);
```

## Integration

### App Integration

The privacy components are integrated into the main app:

```tsx
// In App.tsx
import { CookieConsentBanner } from './components/privacy';

export default function App() {
  return (
    <BrowserRouter>
      {/* App content */}
      <CookieConsentBanner />
    </BrowserRouter>
  );
}
```

### Routing

Privacy settings page is available at `/privacy-settings`:

```tsx
// In routing configuration
{
  path: "/privacy-settings",
  element: <SafeLazyPages.PrivacySettings />,
  id: "privacy-settings",
}
```

## Data Categories

The system tracks the following data categories:

1. **Profile Data** (Contract basis)
   - Basic account information
   - 2-year retention
   - Can be exported and deleted

2. **Activity Data** (Public interest basis)
   - Civic engagement activities
   - 5-year retention for transparency
   - Can be exported, limited deletion

3. **Analytics Data** (Consent basis)
   - Usage patterns and metrics
   - 2-year retention
   - Can be exported and deleted

4. **Security Data** (Legal obligation basis)
   - Security logs and audit trails
   - 7-year retention
   - Can be exported, cannot be deleted

5. **Communications Data** (Consent basis)
   - Email notifications and preferences
   - 1-year retention
   - Can be exported and deleted

6. **Temporary Data** (Legitimate interest basis)
   - Session data and cache
   - 30-day retention
   - Automatically cleaned up

## Legal Compliance

### GDPR Compliance

- ✅ Lawful basis for processing (Article 6)
- ✅ Consent management (Article 7)
- ✅ Data subject rights (Articles 15-22)
- ✅ Data protection by design (Article 25)
- ✅ Records of processing (Article 30)
- ✅ Data retention limits
- ✅ Data breach notification procedures

### Additional Compliance

- ✅ CCPA (California Consumer Privacy Act)
- ✅ PIPEDA (Personal Information Protection and Electronic Documents Act)
- ✅ Kenya Data Protection Act

## Security Measures

1. **Data Encryption**
   - All personal data encrypted at rest
   - TLS encryption for data in transit

2. **Access Controls**
   - Role-based access to personal data
   - Audit logging for all data access

3. **Data Minimization**
   - Only collect necessary data
   - Regular data cleanup processes

4. **Anonymization**
   - Analytics data anonymized
   - IP address anonymization

## Testing

Run privacy component tests:

```bash
npm test src/components/privacy/__tests__/
```

## Configuration

Privacy settings can be configured through environment variables:

```env
# Privacy Analytics
VITE_PRIVACY_ANALYTICS_ENABLED=true
VITE_PRIVACY_ANALYTICS_RETENTION_DAYS=730

# Data Retention
VITE_DATA_RETENTION_ENABLED=true
VITE_DATA_RETENTION_CHECK_INTERVAL=86400000

# Cookie Consent
VITE_COOKIE_CONSENT_REQUIRED=true
VITE_COOKIE_CONSENT_RECONFIRM_DAYS=365
```

## Monitoring

The privacy system includes monitoring for:

- Consent rates and trends
- Data retention compliance
- Privacy rights exercise frequency
- Data breach detection
- Compliance audit trails

## Support

For privacy-related questions or issues:

- **Data Protection Officer**: dpo@chanuka.ke
- **Privacy Policy**: `/privacy-policy`
- **GDPR Compliance**: `/gdpr-compliance`
- **Contact Form**: `/contact`

## Future Enhancements

Planned improvements:

1. **Advanced Consent Management**
   - Granular purpose-based consent
   - Consent receipt generation
   - Consent proof of concept

2. **Enhanced Analytics Privacy**
   - Differential privacy techniques
   - Advanced anonymization methods
   - Privacy-preserving analytics

3. **Automated Compliance**
   - Automated privacy impact assessments
   - Real-time compliance monitoring
   - Automated data subject request handling

4. **International Compliance**
   - Additional jurisdiction support
   - Localized privacy notices
   - Cross-border data transfer controls

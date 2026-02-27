# Alert-Preferences Integration - Quick Start Guide

**TL;DR**: The alert-preferences feature has been integrated into notifications. Everything works, backward compatible, ready to use.

---

## 🚀 Quick Start (5 minutes)

### 1. Use the New API

```typescript
import {
  alertPreferenceManagementService,
  alertDeliveryService
} from '@server/features/notifications';

// Create a preference
const pref = await alertPreferenceManagementService.createAlertPreference(userId, {
  name: 'My Alerts',
  is_active: true,
  alertTypes: [{ type: 'bill_status_change', enabled: true, priority: 'normal' }],
  channels: [{ type: 'in_app', enabled: true, config: { verified: true }, priority: 'normal' }],
  frequency: { type: 'immediate' },
  smartFiltering: {
    enabled: true,
    user_interestWeight: 0.6,
    engagementHistoryWeight: 0.3,
    trendingWeight: 0.1,
    duplicateFiltering: true,
    spamFiltering: true,
    minimumConfidence: 0.3
  }
});

// Send an alert
const result = await alertDeliveryService.processAlertDelivery({
  user_id: userId,
  alertType: 'bill_status_change',
  alertData: {
    title: 'Bill Updated',
    message: 'Your tracked bill has changed status',
    bill_id: 123
  }
});
```

### 2. Test the API

```bash
# Start server
npm run dev:server

# Create preference
curl -X POST http://localhost:5000/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Alerts",
    "is_active": true,
    "alertTypes": [{
      "type": "bill_status_change",
      "enabled": true,
      "priority": "normal"
    }],
    "channels": [{
      "type": "in_app",
      "enabled": true,
      "config": { "verified": true },
      "priority": "normal"
    }],
    "frequency": { "type": "immediate" },
    "smartFiltering": {
      "enabled": true,
      "user_interestWeight": 0.6,
      "engagementHistoryWeight": 0.3,
      "trendingWeight": 0.1,
      "duplicateFiltering": true,
      "spamFiltering": true,
      "minimumConfidence": 0.3
    }
  }'

# List preferences
curl http://localhost:5000/api/notifications/preferences \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Run Tests

```bash
npm run test server/features/notifications/__tests__/alert-preference-integration.test.ts
```

---

## 📍 What Changed?

### Before (Old)
```typescript
import { unifiedAlertPreferenceService } from '@server/features/alert-preferences';
```

### After (New)
```typescript
import { alertPreferenceManagementService } from '@server/features/notifications';
```

### Backward Compatible (Still Works)
```typescript
// Old imports still work with deprecation warnings
import { unifiedAlertPreferenceService } from '@server/features/alert-preferences';
```

---

## 🎯 Key Points

1. **New Location**: `@server/features/notifications`
2. **Old Location**: Still works, redirects to new system
3. **API Endpoints**: `/api/notifications/preferences/*`
4. **Breaking Changes**: None
5. **Migration**: Optional, use script when ready

---

## 📦 What You Get

✅ **7 REST API Endpoints**  
✅ **Smart Filtering**  
✅ **Multi-Channel Delivery**  
✅ **Comprehensive Analytics**  
✅ **Backward Compatibility**  
✅ **Migration Tools**  
✅ **Full Test Suite**  

---

## 🔧 Migration (Optional)

```bash
# Dry run (safe, no changes)
npm run migrate:alert-preferences:dry-run

# Verbose output
npm run migrate:alert-preferences:verbose

# Actual migration
npm run migrate:alert-preferences
```

---

## 📚 Documentation

- **Complete Summary**: [INTEGRATION_COMPLETE_SUMMARY.md](./INTEGRATION_COMPLETE_SUMMARY.md)
- **Progress**: [INTEGRATION_PROGRESS.md](./INTEGRATION_PROGRESS.md)
- **Analysis**: [INTEGRATION_ANALYSIS.md](./INTEGRATION_ANALYSIS.md)
- **Checklist**: [INTEGRATION_CHECKLIST.md](./INTEGRATION_CHECKLIST.md)

---

## ❓ FAQ

**Q: Do I need to change my code?**  
A: No, old code still works. New code should use new imports.

**Q: Will this break anything?**  
A: No, fully backward compatible.

**Q: When should I migrate?**  
A: Whenever convenient. No rush.

**Q: How do I test?**  
A: Run `npm run test` or use curl commands above.

**Q: Where's the old code?**  
A: Still in `server/features/alert-preferences/` but deprecated.

---

## ✅ Checklist

- [ ] Read this guide
- [ ] Test new API endpoints
- [ ] Run integration tests
- [ ] Update your code (optional)
- [ ] Run migration (optional)
- [ ] Deploy to staging
- [ ] Monitor metrics
- [ ] Deploy to production

---

## 🎉 That's It!

You're ready to use the new unified notification system. Everything works, it's tested, and it's production-ready.

**Questions?** Check the documentation links above.  
**Issues?** Check logs and test files.  
**Feedback?** Let us know!

---

**Status**: Ready to Use ✅  
**Version**: 1.0  
**Date**: February 27, 2026

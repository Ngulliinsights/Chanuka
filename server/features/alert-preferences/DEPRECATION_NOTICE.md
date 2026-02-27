# DEPRECATION NOTICE

## Status: DEPRECATED - Scheduled for Removal

This `alert-preferences` feature is **deprecated** and scheduled for consolidation into the `notifications` feature.

## Why?

The `alert-preferences` and `notifications` features have significant overlap:

1. **Duplicate Smart Filtering Logic**: Both implement nearly identical smart filtering algorithms
2. **Duplicate Channel Delivery**: Both handle the same delivery channels (in-app, email, push, SMS, webhook)
3. **Duplicate Preference Management**: Both store and manage user notification preferences
4. **Duplicate Priority & Batching**: Both implement priority-based routing and batching logic
5. **Duplicate Analytics**: Both track delivery logs and provide statistics

## Current State

- ✅ Both features are currently functional
- ⚠️ They operate independently (not integrated)
- ⚠️ This creates maintenance burden and potential inconsistencies
- ⚠️ Users may be confused by two separate notification systems

## Integration Plan

### Phase 1: Analysis (COMPLETE)
- [x] Identify overlapping functionality
- [x] Document architectural differences
- [x] Create integration strategy

### Phase 2: Consolidation (PENDING)
1. Extend `notifications/domain/entities` with alert preference types
2. Merge smart filtering logic into `notifications/domain/services/smart-notification-filter`
3. Add alert preference management to `notifications/application/services`
4. Create unified routes in `notifications/presentation/http`
5. Migrate data storage to unified model
6. Update all imports across codebase

### Phase 3: Migration (PENDING)
1. Create data migration scripts
2. Update client-side code to use unified API
3. Add backward compatibility layer
4. Deprecate old endpoints

### Phase 4: Removal (PENDING)
1. Remove alert-preferences feature
2. Clean up unused code
3. Update documentation

## Recommended Approach

**For New Development:**
- Use the `notifications` feature for all notification-related functionality
- Do NOT add new features to `alert-preferences`

**For Existing Code:**
- Continue using existing alert-preferences endpoints
- Plan migration to notifications API
- Monitor for deprecation warnings

## Timeline

- **Deprecation Announced**: 2026-02-27
- **Migration Window**: TBD
- **Removal Target**: TBD

## Migration Guide

### Before (alert-preferences)
```typescript
import { unifiedAlertPreferenceService } from '@server/features/alert-preferences';

await unifiedAlertPreferenceService.createAlertPreference(userId, {
  name: 'My Alerts',
  // ...
});
```

### After (notifications)
```typescript
import { notificationService } from '@server/features/notifications';

await notificationService.send({
  user_id: userId,
  type: 'bill_update',
  // ...
});
```

## Questions?

Contact the development team or refer to:
- `server/features/notifications/README.md`
- `server/features/notifications/docs/integration_guide.md`

## Related Files

- Alert Preferences Service: `server/features/alert-preferences/domain/services/unified-alert-preference-service.ts`
- Alert Preferences Routes: `server/features/alert-preferences/unified-alert-routes.ts`
- Notifications Service: `server/features/notifications/application/services/notification.service.ts`
- Smart Filter: `server/features/notifications/domain/services/smart-notification-filter.ts`

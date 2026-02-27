# Alert Preferences Integration Plan

## Overview

This document outlines the plan to integrate the `alert-preferences` feature into the `notifications` feature, creating a unified notification system.

## Current State Analysis

### Overlapping Functionality

| Feature | alert-preferences | notifications | Status |
|---------|------------------|---------------|---------|
| Smart Filtering | ✅ processSmartFiltering() | ✅ SmartNotificationFilterService | Duplicate |
| Multi-Channel Delivery | ✅ deliverImmediateAlert() | ✅ NotificationChannelService | Duplicate |
| User Preferences | ✅ AlertPreference model | ✅ CombinedBillTrackingPreferences | Overlapping |
| Priority Routing | ✅ getEnabledChannelsForPriority() | ✅ determineChannels() | Duplicate |
| Batching | ✅ addToBatch() | ✅ NotificationSchedulerService | Duplicate |
| Analytics | ✅ getAlertPreferenceStats() | ✅ getNotificationStats() | Duplicate |
| Delivery Logs | ✅ AlertDeliveryLog | ✅ Notification history | Overlapping |

### Architectural Comparison

**alert-preferences:**
- Monolithic service (1600+ lines)
- Stores data in `users.preferences.alertPreferences` JSON column
- Direct database operations
- Less separation of concerns

**notifications:**
- Clean DDD architecture
- Domain/Application/Presentation layers
- Proper entity separation
- Better testability
- More comprehensive documentation

## Integration Strategy

### Recommended Approach: Absorb into Notifications

The `notifications` feature has superior architecture and should be the foundation.

### Step-by-Step Integration

#### 1. Extend Notifications Domain (Week 1)

**Add Alert Preference Entities:**
```
server/features/notifications/domain/entities/
├── alert-preference.ts          # NEW: AlertPreference entity
└── notification.ts               # EXISTING
```

**Extend Domain Services:**
```
server/features/notifications/domain/services/
├── alert-preference.service.ts   # NEW: Alert preference business logic
├── smart-notification-filter.ts  # EXTEND: Merge filtering logic
└── ...
```

#### 2. Application Layer Integration (Week 2)

**Add Alert Preference Use Cases:**
```
server/features/notifications/application/
├── services/
│   ├── alert-preference-management.service.ts  # NEW
│   └── notification.service.ts                  # EXTEND
└── use-cases/
    ├── create-alert-preference.ts               # NEW
    ├── update-alert-preference.ts               # NEW
    └── process-alert-delivery.ts                # NEW
```

#### 3. Unified API Routes (Week 3)

**Consolidate Routes:**
```
server/features/notifications/presentation/http/
├── notification-routes.ts        # EXISTING
└── alert-preference-routes.ts    # NEW: Unified alert preference endpoints
```

**Route Structure:**
```
/api/notifications/
├── GET    /                      # List notifications
├── POST   /                      # Create notification
├── PATCH  /:id/read              # Mark as read
├── GET    /stats                 # Get stats
│
├── GET    /preferences           # NEW: List alert preferences
├── POST   /preferences           # NEW: Create alert preference
├── GET    /preferences/:id       # NEW: Get alert preference
├── PATCH  /preferences/:id       # NEW: Update alert preference
├── DELETE /preferences/:id       # NEW: Delete alert preference
│
├── GET    /delivery-logs         # NEW: Get delivery logs
└── GET    /analytics             # NEW: Get analytics
```

#### 4. Data Migration (Week 4)

**Migration Script:**
```typescript
// scripts/migrate-alert-preferences.ts
async function migrateAlertPreferences() {
  // 1. Read from users.preferences.alertPreferences
  // 2. Transform to new unified model
  // 3. Write to new storage location
  // 4. Verify data integrity
  // 5. Create backup
}
```

#### 5. Update Imports (Week 5)

**Find and Replace:**
```bash
# Find all imports
grep -r "from '@server/features/alert-preferences'" server/
grep -r "from '@/features/alert-preferences'" server/

# Update to
# from '@server/features/notifications'
```

#### 6. Deprecation & Removal (Week 6)

1. Add deprecation warnings to alert-preferences endpoints
2. Update documentation
3. Notify API consumers
4. Monitor usage
5. Remove after migration window

## Unified Data Model

### Consolidated Preference Structure

```typescript
interface UnifiedNotificationPreference {
  id: string;
  user_id: string;
  
  // General settings
  name: string;
  description?: string;
  is_active: boolean;
  
  // Alert types (from alert-preferences)
  alertTypes: Array<{
    type: AlertType;
    enabled: boolean;
    priority: Priority;
    conditions?: AlertConditions;
  }>;
  
  // Channels (merged)
  channels: {
    inApp: ChannelConfig;
    email: ChannelConfig;
    push: ChannelConfig;
    sms: ChannelConfig;
    webhook?: ChannelConfig;
  };
  
  // Frequency & batching
  frequency: FrequencyConfig;
  
  // Smart filtering (merged)
  smartFiltering: {
    enabled: boolean;
    priorityThreshold: Priority;
    interestBasedFiltering: boolean;
    categoryFilters?: string[];
    keywordFilters?: string[];
    sponsorFilters?: string[];
    // From alert-preferences:
    user_interestWeight: number;
    engagementHistoryWeight: number;
    trendingWeight: number;
    duplicateFiltering: boolean;
    spamFiltering: boolean;
    minimumConfidence: number;
  };
  
  // Quiet hours
  quietHours: QuietHoursConfig;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}
```

## Merged Smart Filtering Logic

### Combined Algorithm

```typescript
async function unifiedSmartFilter(criteria: FilterCriteria): Promise<FilterResult> {
  // 1. Mandatory checks (from notifications)
  const typeCheck = checkNotificationTypeEnabled(criteria);
  const quietCheck = checkQuietHours(criteria);
  
  // 2. Smart filtering (merged from both)
  const relevanceChecks = await Promise.all([
    checkPriorityThreshold(criteria),
    checkCategoryRelevance(criteria),
    checkKeywordRelevance(criteria),
    checkSponsorRelevance(criteria),
    checkTagRelevance(criteria),
    checkInterestBasedRelevance(criteria),
    // From alert-preferences:
    calculateUserInterestScore(criteria),
    calculateEngagementHistoryScore(criteria),
    calculateTrendingScore(criteria),
    checkForDuplicateAlert(criteria),
    checkForSpam(criteria)
  ]);
  
  // 3. Combine results with weighted scoring
  return combineFilterResults(relevanceChecks, criteria);
}
```

## Benefits of Integration

### For Users
- ✅ Single, consistent notification experience
- ✅ Unified preference management
- ✅ Better smart filtering (combined algorithms)
- ✅ Comprehensive analytics dashboard

### For Developers
- ✅ Single codebase to maintain
- ✅ Cleaner architecture (DDD)
- ✅ Better testability
- ✅ Reduced code duplication
- ✅ Easier to add new features

### For System
- ✅ Reduced database queries
- ✅ Better caching strategy
- ✅ Improved performance
- ✅ Consistent logging and monitoring

## Risks & Mitigation

### Risk 1: Data Loss During Migration
**Mitigation:**
- Create comprehensive backups
- Implement rollback mechanism
- Gradual migration with validation
- Keep old system running during transition

### Risk 2: Breaking Changes for API Consumers
**Mitigation:**
- Maintain backward compatibility layer
- Provide migration guide
- Extended deprecation period
- Clear communication

### Risk 3: Performance Impact
**Mitigation:**
- Load testing before deployment
- Gradual rollout
- Monitor metrics closely
- Optimize queries and caching

### Risk 4: Feature Gaps
**Mitigation:**
- Comprehensive feature comparison
- Implement missing features first
- User acceptance testing
- Feedback loop

## Testing Strategy

### Unit Tests
- Test all merged business logic
- Test data transformations
- Test validation schemas

### Integration Tests
- Test end-to-end notification flow
- Test alert preference CRUD
- Test smart filtering
- Test multi-channel delivery

### Migration Tests
- Test data migration scripts
- Test backward compatibility
- Test rollback procedures

### Performance Tests
- Load test unified API
- Benchmark smart filtering
- Test caching effectiveness

## Rollout Plan

### Phase 1: Internal Testing (Week 1-2)
- Deploy to development environment
- Internal team testing
- Fix critical bugs

### Phase 2: Beta Testing (Week 3-4)
- Deploy to staging
- Select beta users
- Gather feedback
- Iterate

### Phase 3: Gradual Rollout (Week 5-6)
- 10% of users
- Monitor metrics
- 50% of users
- Monitor metrics
- 100% of users

### Phase 4: Deprecation (Week 7-12)
- Announce deprecation
- Provide migration tools
- Support migration
- Monitor old API usage

### Phase 5: Removal (Week 13+)
- Remove old endpoints
- Clean up code
- Update documentation
- Celebrate! 🎉

## Success Metrics

- ✅ Zero data loss during migration
- ✅ <5% increase in API response time
- ✅ >95% user satisfaction
- ✅ 100% feature parity
- ✅ 50% reduction in codebase size
- ✅ 100% test coverage for critical paths

## Resources Required

- **Backend Developers**: 2 developers, 6 weeks
- **QA Engineers**: 1 engineer, 4 weeks
- **DevOps**: 1 engineer, 2 weeks (part-time)
- **Technical Writer**: 1 writer, 1 week

## Timeline Summary

| Phase | Duration | Effort |
|-------|----------|--------|
| Domain Extension | 1 week | 40 hours |
| Application Integration | 1 week | 40 hours |
| API Consolidation | 1 week | 40 hours |
| Data Migration | 1 week | 40 hours |
| Import Updates | 1 week | 20 hours |
| Testing & Rollout | 6 weeks | 80 hours |
| **Total** | **11 weeks** | **260 hours** |

## Next Steps

1. ✅ Create deprecation notice
2. ✅ Document integration plan
3. ⏳ Get stakeholder approval
4. ⏳ Allocate resources
5. ⏳ Begin Phase 1: Domain Extension
6. ⏳ Set up project tracking
7. ⏳ Schedule regular check-ins

## Questions & Decisions Needed

- [ ] Approval from product team?
- [ ] Timeline acceptable?
- [ ] Resource allocation confirmed?
- [ ] Migration window for users?
- [ ] Backward compatibility duration?
- [ ] Monitoring and alerting strategy?

## References

- [Notifications README](../README.md)
- [Alert Preferences Deprecation Notice](../../alert-preferences/DEPRECATION_NOTICE.md)
- [Smart Filter Service](../domain/services/smart-notification-filter.ts)
- [Notification Service](../application/services/notification.service.ts)

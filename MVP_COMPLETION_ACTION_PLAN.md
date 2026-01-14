# ACTION PLAN: Complete MVP This Week

**Priority Level:** CRITICAL  
**Timeline:** 5-7 days  
**Owner Assignment:** TBD

---

## CRITICAL PATH ITEMS (Must Complete)

### 1. Bill Search UI Implementation (2 days)
**Current State:** API exists, UI incomplete  
**Location:** `client/src/features/bills/pages/search.tsx` (or similar)

**Required Changes:**
```typescript
// client/src/features/bills/pages/search.tsx

1. Wire up full-text search API call
   - Import searchService from '@client/core/api'
   - Implement debounced search query
   - Add filters: status, sponsor, date range

2. Add search result rendering
   - Display matching bills with preview
   - Show search metadata (5 of 342 results, took 234ms)
   - Add result sorting options

3. Connect analytics tracking
   - Track search queries to searchAnalytics table
   - Record click-through rate
   - Monitor abandonment

4. Add advanced filters
   - Status filter (draft, introduced, etc.)
   - Sponsor filter (autocomplete)
   - Date range picker
   - Impact area tags
```

**Estimated Effort:** 2 days  
**Blocking Launch:** YES

---

### 2. Notifications Center UI (2 days)
**Current State:** API exists (40%), UI missing  
**Location:** `client/src/features/notifications/pages/center.tsx`

**Required Changes:**
```typescript
// client/src/features/notifications/pages/center.tsx

1. Create notification list view
   - Display notifications with timestamps
   - Show read/unread status
   - Group by type (bill_update, comment_reply, milestone, etc.)
   - Add infinite scroll pagination

2. Add notification preferences UI
   - Notification types toggle
   - Frequency settings (real-time, daily digest, weekly)
   - Quiet hours scheduling
   - Per-bill alert settings

3. Add contact method management
   - SMS number input
   - Email configuration
   - USSD settings (if applicable)
   - Notification channel preferences

4. Implement notification actions
   - Mark as read/unread
   - Delete notifications
   - Mark as spam
   - Archive notifications

5. Add preferences persistence
   - Save preferences to API
   - Auto-update on server
   - Sync across tabs
```

**Estimated Effort:** 2 days  
**Blocking Launch:** YES

---

### 3. Bill Tracking Feature (2 days)
**Current State:** API exists, UI missing  
**Location:** `client/src/features/bills/pages/tracking.tsx`

**Required Changes:**
```typescript
// client/src/features/bills/pages/tracking.tsx

1. Create tracked bills list
   - Display user's tracked bills
   - Show last update timestamp
   - Indicate notification status
   - Add quick-actions menu

2. Build tracking preferences UI
   - Notification frequency dropdown
   - Alert type selection (status changes, comments, votes)
   - Priority levels (critical, high, medium, low)
   - Auto-remove old bills option

3. Show tracking insights
   - Total bills tracked
   - Notifications this week
   - Most active tracked bill
   - Recommended bills to track

4. Add bill tracking/untracking
   - One-click track button on bill detail
   - Bulk track from search results
   - Bulk untrack from tracking page

5. Connect with notifications
   - Trigger notifications on tracked bill updates
   - Include bill updates in notification center
   - Link notifications back to tracked bills
```

**Estimated Effort:** 2 days  
**Blocking Launch:** YES

---

### 4. Analytics Dashboard - Basic Version (1 day)
**Current State:** API partially exists, UI missing  
**Location:** `client/src/features/analytics/pages/dashboard.tsx`

**Required Changes (MVP Version - Minimal):**
```typescript
// client/src/features/analytics/pages/dashboard.tsx

1. Dashboard header
   - Title: "Legislative Analytics"
   - Last updated timestamp
   - Export button (can be stub)

2. Key metrics cards
   - Total bills: [NUMBER]
   - Your votes: [NUMBER]
   - Pending bills: [NUMBER]
   - Your tracked bills: [NUMBER]

3. Charts (use recharts)
   - Bill status distribution (pie)
   - Engagement trend (line graph - last 30 days)
   - Top engaged bills (bar chart)
   - Your activity heatmap (simple grid)

4. API integration
   - GET /api/analytics/bills/status-distribution
   - GET /api/analytics/bills/engagement-trend
   - GET /api/analytics/bills/top-engaged
   - GET /api/analytics/user/activity

5. Simple styling
   - Use existing design system
   - Responsive grid layout
   - No advanced customization
```

**Estimated Effort:** 1 day  
**Blocking Launch:** NO (can defer to v1.1 if needed)

---

## CRITICAL BUG FIXES

### Bug 1: Type Consistency
**Status:** ⚠️ Migration 20251223 started fixing this  
**Action Required:** Verify all tables use UUID for IDs

```sql
-- Verify in PostgreSQL
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE (column_name = 'id' OR column_name LIKE '%_id')
AND table_schema = 'public'
ORDER BY table_name;

-- Should all be: uuid or integer (consistent within table)
-- NO mixing of uuid and bigint in same table
```

**Effort:** 30 minutes verification + any migrations needed

---

### Bug 2: Missing Indexes
**Status:** ⚠️ Performance impact possible

```sql
-- Add missing high-priority indexes
CREATE INDEX IF NOT EXISTS idx_bills_status_created 
  ON bills(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_bill_user 
  ON comments(bill_id, user_id);

CREATE INDEX IF NOT EXISTS idx_bill_engagement_user_created 
  ON bill_engagement(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_profiles_created 
  ON user_profiles(created_at DESC);
```

**Effort:** 30 minutes

---

## API COMPLETENESS CHECK

### Required Endpoints Verification

```bash
# Search endpoints
✅ GET /api/bills/search?q=...
❓ GET /api/bills/search/suggestions?q=...     (CHECK IF EXISTS)

# Notifications endpoints  
✅ GET /api/notifications
✅ POST /api/notifications/alert-prefs
✅ GET /api/notifications/contact-methods
❓ PUT /api/notifications/contact-methods     (CREATE IF MISSING)
❓ POST /api/notifications/:id/read            (CREATE IF MISSING)

# Bill tracking endpoints
✅ GET /api/bills/tracking
❓ POST /api/bills/:id/track                   (CREATE IF MISSING)
❓ DELETE /api/bills/:id/untrack              (CREATE IF MISSING)
❓ PUT /api/bills/:id/tracking-prefs          (CREATE IF MISSING)

# Analytics endpoints
❓ GET /api/analytics/bills/status-distribution
❓ GET /api/analytics/bills/engagement-trend
❓ GET /api/analytics/bills/top-engaged
❓ GET /api/analytics/user/activity

# Admin/System endpoints
✅ GET /api/admin/schema (exists for debugging)
❓ GET /api/admin/health (check status)
```

**Action:** Fill in missing endpoints (max 4 hours)

---

## TESTING CHECKLIST

### Functional Testing (1 day)

- [ ] **Authentication**
  - [ ] Login works
  - [ ] Register works
  - [ ] Logout works
  - [ ] Token refresh works
  - [ ] Protected routes blocked without auth

- [ ] **Bills**
  - [ ] Can browse all bills
  - [ ] Can view bill details
  - [ ] Can vote on bills (for/against/abstain)
  - [ ] Vote persists on reload
  - [ ] Can search bills

- [ ] **Comments**
  - [ ] Can post comments
  - [ ] Can edit own comments
  - [ ] Can delete own comments
  - [ ] Can vote on comments
  - [ ] Comments display in order

- [ ] **User Profile**
  - [ ] Can view own profile
  - [ ] Can edit profile
  - [ ] Changes persist
  - [ ] Profile picture uploads (if applicable)

- [ ] **NEW: Search**
  - [ ] Search works and returns results
  - [ ] Filters work (status, sponsor, date)
  - [ ] Results update in real-time
  - [ ] Analytics track searches

- [ ] **NEW: Notifications**
  - [ ] Can receive notifications
  - [ ] Can set preferences
  - [ ] Notifications appear in center
  - [ ] Can mark as read

- [ ] **NEW: Bill Tracking**
  - [ ] Can track a bill
  - [ ] Can untrack a bill
  - [ ] Can set tracking preferences
  - [ ] Tracked bills appear in list

### Performance Testing (1 day)

```bash
# Load test these endpoints
- GET /api/bills                      (target: <200ms, 99th percentile)
- GET /api/bills/search?q=...         (target: <500ms, 99th percentile)
- GET /api/bills/:id                  (target: <100ms, 99th percentile)
- GET /api/comments?bill_id=...       (target: <300ms, 99th percentile)
- POST /api/comments                  (target: <1s, 99th percentile)

# Use: Apache JMeter, k6, or Artillery
# Test volume: 100 concurrent users for 5 minutes
```

---

## DEPLOYMENT CHECKLIST

### Pre-Production Verification (1 day before launch)

- [ ] Database is backed up
- [ ] Environment variables are set correctly
  - [ ] DATABASE_URL points to production
  - [ ] JWT_SECRET is secure and different from dev
  - [ ] SESSION_SECRET is secure
  - [ ] CORS_ORIGIN is set correctly
  - [ ] NODE_ENV=production

- [ ] Migrations are applied
  ```bash
  npm run db:migrate
  ```

- [ ] SSL/HTTPS is enabled
- [ ] Error logging is configured (Sentry/LogRocket)
- [ ] Analytics are configured
- [ ] Email service is set up (for notifications)
- [ ] Database connection pooling is optimized
- [ ] Rate limiting is enabled
- [ ] CORS is properly configured

### Launch Day (Day 1)

- [ ] Deploy to production
- [ ] Smoke tests pass (basic functionality works)
- [ ] Error logs show no critical errors
- [ ] Performance metrics look normal
- [ ] User feedback is positive
- [ ] No data integrity issues
- [ ] Rollback plan is ready (if needed)

### Post-Launch (First Week)

- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Fix critical bugs immediately
- [ ] Prepare Phase 2 feature backlog
- [ ] Plan Phase 2 sprint

---

## OPTIONAL: Can Defer to v1.1

### Lower Priority
```
❌ Analytics Dashboard - Can ship without detailed charts
❌ Advanced Filters - Basic search is sufficient
❌ Mobile App - Web MVP first
❌ Offline Support - Online-only for MVP
❌ Accessibility Audit - WCAG compliance sweep after launch
```

---

## RESOURCE REQUIREMENTS

### Development Team
- **Frontend Developer:** 1 person × 3 days (Search + Tracking + Notifications UI)
- **Backend Developer:** 1 person × 1 day (API completeness + bug fixes)
- **QA/Testing:** 1 person × 2 days (end-to-end testing + performance)
- **DevOps:** 0.5 person × 1 day (deployment prep)

### Tools Needed
- Recharts (already installed?)
- React Query (for data fetching)
- Testing tools (Jest, Playwright)
- Performance testing tool (k6 or Artillery)
- Database admin tool (pgAdmin or DBeaver)

### Timeline
```
Day 1: Frontend - Search UI        | Backend - API review + fixes
Day 2: Frontend - Notifications   | Backend - Missing endpoints
Day 3: Frontend - Bill Tracking   | Testing - Integration tests
Day 4: Frontend - Dashboard       | Testing - Performance tests
Day 5: All - Bug fixes            | All - Final review
Day 6-7: Buffer for unexpected issues / final polish
```

---

## COMMUNICATION PLAN

### Daily Standup (10 min)
- What did you finish yesterday?
- What are you working on today?
- Any blockers?

### Code Review (Async)
- All PRs reviewed within 2 hours
- Focus on: Security, Performance, User Experience

### Demo (End of Day 5)
- Show stakeholders the completed MVP
- Get feedback
- Plan for phase 2

---

## SUCCESS CRITERIA FOR MVP LAUNCH

✅ **All** of the following must be true:

1. Core 5 features are 100% functional
2. No critical bugs reported
3. Page load time < 3 seconds (average)
4. Zero data loss incidents
5. All team members confident to ship
6. Rollback plan is documented and tested
7. Monitoring and alerts are configured
8. Team trained on production support

---

## AFTER LAUNCH: PHASE 2 PLANNING

### Week 1 Post-Launch
- [ ] Gather user feedback
- [ ] Monitor metrics and errors
- [ ] Fix any critical production issues
- [ ] Plan Phase 2 sprint

### Phase 2 Features (Priority Order)
1. **Argument Intelligence** (2 weeks)
   - Table: `arguments`, `claims`, `evidence`
   - Feature: Track and link citizen arguments to bills

2. **Transparency Analysis** (3 weeks)
   - Table: `financial_interests`, `conflict_detections`
   - Feature: Show financial links between sponsors and bills

3. **Constitutional Intelligence** (2 weeks)
   - Table: `constitutional_analyses`, `legal_precedents`
   - Feature: Flag bills with constitutional concerns

4. **Advanced Analytics** (2 weeks)
   - Table: `engagement_analytics`, `trending_analysis`
   - Feature: Deep dive dashboards for power users

---

**Next Action:** Print this document, assign owners to each section, and schedule 30-min sync with team to confirm timeline.

**Launch Target:** End of this week 🚀

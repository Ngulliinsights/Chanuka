# Phase 1 Implementation Guide (Week 2-3)

## Overview

This guide provides detailed instructions for implementing Phase 1 priorities: Authentication, Performance Optimization, and Onboarding Integration.

**Timeline**: Week 2-3 (March 6-19, 2026)
**Status**: Ready to Start
**Dependencies**: Phase 0 Complete ✅

---

## Priority 1: Authentication & Security (5 days)

### 🎯 Objective
Replace mock authentication with real backend integration, implement secure token management, and add proper password hashing.

### 📋 Tasks

#### Task 1.1: Fix Mock Authentication
**File**: `client/src/features/users/services/auth-service.ts`
**Lines to Fix**: 516, 845

**Current Code (Line 516)**:
```typescript
// Mock authentication logic - FOR DEVELOPMENT/TESTING ONLY
// TODO: Replace with actual backend API call
if (credentials.email === 'test@example.com' && credentials.password === 'password123') {
```

**Replacement**:
```typescript
private async authenticateWithServer(credentials: AuthCredentials): Promise<AuthSession> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        twoFactorToken: credentials.twoFactorToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Authentication failed' }));
      throw new Error(error.message || 'Authentication failed');
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data.user || !data.accessToken) {
      throw new Error('Invalid authentication response');
    }

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name || data.user.display_name,
      role: data.user.role || 'citizen',
      verified: data.user.verified || false,
      twoFactorEnabled: data.user.two_factor_enabled || false,
      preferences: data.user.preferences || this.getDefaultPreferences(),
      permissions: data.user.permissions || ['read:bills', 'comment:bills', 'save:bills'],
      lastLogin: data.user.last_login || new Date().toISOString(),
      createdAt: data.user.created_at || new Date().toISOString()
    };

    const session: AuthSession = {
      user,
      tokens: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn || 3600,
        tokenType: data.tokenType || 'Bearer'
      },
      sessionId: data.sessionId || `session_${Date.now()}`,
      expiresAt: data.expiresAt || new Date(Date.now() + (data.expiresIn || 3600) * 1000).toISOString()
    };

    return session;
  } catch (error) {
    logger.error('Authentication failed', { component: 'AuthService' }, error);
    throw error;
  }
}

private getDefaultPreferences() {
  return {
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    email_frequency: 'immediate',
    notification_preferences: {
      email: true,
      push: true,
      sms: false,
      frequency: 'immediate',
      quiet_hours: { enabled: false, start_time: '22:00', end_time: '08:00' }
    },
    privacy_settings: {
      profile_visibility: 'public',
      activity_visibility: 'public',
      data_sharing: true,
      analytics_tracking: true,
      marketing_emails: false
    },
    dashboard_layout: 'compact',
    default_bill_view: 'grid',
    auto_save_drafts: true,
    show_onboarding_tips: true
  };
}
```

**Current Code (Line 845)**:
```typescript
private async verifyPassword(userId: string, password: string): Promise<boolean> {
  // Mock password verification - FOR DEVELOPMENT/TESTING ONLY
  // TODO: Replace with actual password hash verification
  return password === 'password123';
}
```

**Replacement**:
```typescript
private async verifyPassword(userId: string, password: string): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/verify-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAccessToken()}`,
      },
      body: JSON.stringify({
        userId,
        password,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    logger.error('Password verification failed', { component: 'AuthService' }, error);
    return false;
  }
}
```

#### Task 1.2: Implement Token Refresh
**File**: `client/src/features/users/services/auth-service.ts`

**Add Method**:
```typescript
private async refreshAccessToken(): Promise<void> {
  try {
    const session = await this.getCurrentSession();
    if (!session?.tokens.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: session.tokens.refreshToken,
      }),
    });

    if (!response.ok) {
      // Refresh token invalid, logout user
      await this.logout();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    
    // Update session with new tokens
    const updatedSession: AuthSession = {
      ...session,
      tokens: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || session.tokens.refreshToken,
        expiresIn: data.expiresIn || 3600,
        tokenType: data.tokenType || 'Bearer'
      },
      expiresAt: data.expiresAt || new Date(Date.now() + (data.expiresIn || 3600) * 1000).toISOString()
    };

    await this.saveSession(updatedSession);
    this.scheduleTokenRefresh(updatedSession.tokens.expiresIn);
    
    logger.info('Access token refreshed successfully', { component: 'AuthService' });
  } catch (error) {
    logger.error('Token refresh failed', { component: 'AuthService' }, error);
    throw error;
  }
}
```

#### Task 1.3: Add Security Headers
**File**: `client/src/infrastructure/api/client.ts`

**Add to Request Interceptor**:
```typescript
// Add security headers
config.headers['X-Content-Type-Options'] = 'nosniff';
config.headers['X-Frame-Options'] = 'DENY';
config.headers['X-XSS-Protection'] = '1; mode=block';
config.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';

// Add CSRF token if available
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
if (csrfToken) {
  config.headers['X-CSRF-Token'] = csrfToken;
}
```

#### Task 1.4: Backend API Endpoints (Server Team)
**Required Endpoints**:
1. `POST /api/auth/login` - User authentication
2. `POST /api/auth/refresh` - Token refresh
3. `POST /api/auth/logout` - User logout
4. `POST /api/auth/verify-password` - Password verification
5. `POST /api/auth/register` - User registration
6. `POST /api/auth/forgot-password` - Password reset request
7. `POST /api/auth/reset-password` - Password reset confirmation

**Expected Response Format**:
```typescript
// Login Response
{
  user: {
    id: string;
    email: string;
    name: string;
    display_name?: string;
    role: string;
    verified: boolean;
    two_factor_enabled: boolean;
    preferences?: object;
    permissions?: string[];
    last_login?: string;
    created_at?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  sessionId: string;
  expiresAt: string;
}
```

### ✅ Success Criteria
- [ ] Zero mock authentication code
- [ ] All auth tests passing
- [ ] Token refresh working automatically
- [ ] Security headers present in all requests
- [ ] CSRF protection enabled
- [ ] Password verification secure
- [ ] Session management robust

---

## Priority 2: Performance Optimization (3 days)

### 🎯 Objective
Integrate performance dashboard, set up automated budgets, and add performance monitoring to CI/CD.

### 📋 Tasks

#### Task 2.1: Integrate Performance Dashboard
**File**: `client/src/features/admin/pages/admin.tsx`

**Add Route**:
```typescript
import { PerformanceDashboard } from '@client/infrastructure/observability/performance/performance-dashboard';

// In admin routes
{
  path: '/admin/performance',
  element: <PerformanceDashboard />,
  roles: ['admin', 'super_admin'],
}
```

**Add Navigation Link**:
```typescript
<NavLink to="/admin/performance">
  <TrendingUp className="h-4 w-4" />
  Performance
</NavLink>
```

#### Task 2.2: Set Up Performance Budgets
**File**: `client/performance-budgets.json` (create new)

```json
{
  "budgets": [
    {
      "name": "Core Web Vitals",
      "metrics": {
        "lcp": {
          "good": 2500,
          "warning": 4000,
          "unit": "ms"
        },
        "fid": {
          "good": 100,
          "warning": 300,
          "unit": "ms"
        },
        "cls": {
          "good": 0.1,
          "warning": 0.25,
          "unit": ""
        },
        "fcp": {
          "good": 1800,
          "warning": 3000,
          "unit": "ms"
        },
        "ttfb": {
          "good": 800,
          "warning": 1800,
          "unit": "ms"
        },
        "inp": {
          "good": 200,
          "warning": 500,
          "unit": "ms"
        }
      }
    },
    {
      "name": "Bundle Size",
      "metrics": {
        "total": {
          "good": 204800,
          "warning": 307200,
          "unit": "bytes"
        },
        "javascript": {
          "good": 153600,
          "warning": 204800,
          "unit": "bytes"
        },
        "css": {
          "good": 51200,
          "warning": 102400,
          "unit": "bytes"
        }
      }
    }
  ]
}
```

#### Task 2.3: Add Performance Budget Check Script
**File**: `client/scripts/check-performance-budget.js`

```javascript
const fs = require('fs');
const path = require('path');

const budgets = require('../performance-budgets.json');
const statsFile = path.join(__dirname, '../dist/stats.json');

if (!fs.existsSync(statsFile)) {
  console.error('❌ Stats file not found. Run build with --mode analyze first.');
  process.exit(1);
}

const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));

let violations = [];
let warnings = [];

// Check bundle size
const totalSize = stats.assets.reduce((sum, asset) => sum + asset.size, 0);
const jsSize = stats.assets
  .filter(asset => asset.name.endsWith('.js'))
  .reduce((sum, asset) => sum + asset.size, 0);
const cssSize = stats.assets
  .filter(asset => asset.name.endsWith('.css'))
  .reduce((sum, asset) => sum + asset.size, 0);

const bundleBudget = budgets.budgets.find(b => b.name === 'Bundle Size');

if (totalSize > bundleBudget.metrics.total.warning) {
  violations.push(`Total bundle size (${totalSize} bytes) exceeds warning threshold`);
} else if (totalSize > bundleBudget.metrics.total.good) {
  warnings.push(`Total bundle size (${totalSize} bytes) exceeds good threshold`);
}

if (jsSize > bundleBudget.metrics.javascript.warning) {
  violations.push(`JavaScript size (${jsSize} bytes) exceeds warning threshold`);
} else if (jsSize > bundleBudget.metrics.javascript.good) {
  warnings.push(`JavaScript size (${jsSize} bytes) exceeds good threshold`);
}

if (cssSize > bundleBudget.metrics.css.warning) {
  violations.push(`CSS size (${cssSize} bytes) exceeds warning threshold`);
} else if (cssSize > bundleBudget.metrics.css.good) {
  warnings.push(`CSS size (${cssSize} bytes) exceeds good threshold`);
}

// Report results
console.log('\n📊 Performance Budget Check\n');
console.log(`Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
console.log(`JavaScript: ${(jsSize / 1024).toFixed(2)} KB`);
console.log(`CSS: ${(cssSize / 1024).toFixed(2)} KB\n`);

if (warnings.length > 0) {
  console.log('⚠️  Warnings:');
  warnings.forEach(w => console.log(`  - ${w}`));
  console.log('');
}

if (violations.length > 0) {
  console.log('❌ Violations:');
  violations.forEach(v => console.log(`  - ${v}`));
  console.log('');
  process.exit(1);
}

console.log('✅ All performance budgets met!\n');
```

#### Task 2.4: Add to CI/CD Pipeline
**File**: `.github/workflows/ci.yml` (or equivalent)

```yaml
- name: Check Performance Budgets
  run: |
    npm run build:analyze
    npm run check:performance-budget
```

### ✅ Success Criteria
- [ ] Performance dashboard accessible at `/admin/performance`
- [ ] Performance budgets defined and documented
- [ ] Budget check script working
- [ ] CI/CD fails on budget violations
- [ ] Alerts configured for regressions

---

## Priority 3: Onboarding Integration (4 days)

### 🎯 Objective
Integrate welcome tour into app flow, add trigger logic, and track completion metrics.

### 📋 Tasks

#### Task 3.1: Add Onboarding Trigger Logic
**File**: `client/src/App.tsx`

**Add After AppProviders**:
```typescript
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function OnboardingTrigger() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // Don't trigger on auth or onboarding pages
    if (location.pathname.startsWith('/auth') || location.pathname.startsWith('/welcome')) {
      return;
    }

    // Check if user has completed onboarding
    const onboardingCompleted = localStorage.getItem('chanuka_onboarding_completed');
    const userPersona = localStorage.getItem('chanuka_user_persona');

    // Trigger onboarding for new users
    if (!onboardingCompleted && user) {
      navigate('/welcome');
    }

    // Re-trigger for major updates (check version)
    const lastOnboardingVersion = localStorage.getItem('chanuka_onboarding_version');
    const currentVersion = '2.0.0'; // Update this with each major release

    if (onboardingCompleted && lastOnboardingVersion !== currentVersion) {
      // Show update tour (lighter version)
      const showUpdateTour = localStorage.getItem('chanuka_update_tour_shown');
      if (!showUpdateTour) {
        // Show update notification
        toast({
          title: 'New Features Available!',
          description: 'Take a quick tour to see what\'s new.',
          action: (
            <Button onClick={() => navigate('/welcome?mode=update')}>
              Take Tour
            </Button>
          ),
        });
        localStorage.setItem('chanuka_update_tour_shown', 'true');
      }
    }
  }, [user, location.pathname, navigate]);

  return null;
}

// Add to App component
<OnboardingTrigger />
```

#### Task 3.2: Track Onboarding Metrics
**File**: `client/src/features/onboarding/pages/welcome-tour.tsx`

**Add Analytics Tracking**:
```typescript
import { observability } from '@client/infrastructure/observability';

// Track tour start
useEffect(() => {
  observability.trackEvent({
    name: 'onboarding_started',
    properties: {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    },
  });
}, []);

// Track step changes
useEffect(() => {
  observability.trackEvent({
    name: 'onboarding_step_viewed',
    properties: {
      step: currentStep + 1,
      stepName: tourSteps[currentStep].id,
      timestamp: new Date().toISOString(),
    },
  });
}, [currentStep]);

// Track completion
const handleComplete = () => {
  const completionTime = Date.now() - startTime;
  
  observability.trackEvent({
    name: 'onboarding_completed',
    properties: {
      persona: selectedPersona,
      stepsCompleted: tourSteps.length,
      completionTime,
      timestamp: new Date().toISOString(),
    },
  });

  localStorage.setItem('chanuka_onboarding_completed', 'true');
  localStorage.setItem('chanuka_onboarding_version', '2.0.0');
  if (selectedPersona) {
    localStorage.setItem('chanuka_user_persona', selectedPersona);
  }

  navigate('/');
};

// Track skip
const handleSkip = () => {
  observability.trackEvent({
    name: 'onboarding_skipped',
    properties: {
      step: currentStep + 1,
      timestamp: new Date().toISOString(),
    },
  });
  
  navigate('/');
};
```

#### Task 3.3: Add Onboarding Analytics Dashboard
**File**: `client/src/features/admin/pages/onboarding-analytics.tsx` (create new)

```typescript
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { observability } from '@client/infrastructure/observability';

export function OnboardingAnalytics() {
  const [metrics, setMetrics] = useState({
    totalStarts: 0,
    totalCompletions: 0,
    completionRate: 0,
    averageCompletionTime: 0,
    skipRate: 0,
    personaDistribution: {},
    stepDropoff: [],
  });

  useEffect(() => {
    // Fetch onboarding metrics
    // In production, this would call an API endpoint
    const fetchMetrics = async () => {
      // Mock data for now
      setMetrics({
        totalStarts: 1250,
        totalCompletions: 1000,
        completionRate: 80,
        averageCompletionTime: 180, // seconds
        skipRate: 20,
        personaDistribution: {
          'Casual Citizen': 45,
          'Active Advocate': 25,
          'Policy Expert': 15,
          'Journalist': 10,
          'Other': 5,
        },
        stepDropoff: [
          { step: 1, retention: 100 },
          { step: 2, retention: 95 },
          { step: 3, retention: 90 },
          { step: 4, retention: 85 },
          { step: 5, retention: 82 },
          { step: 6, retention: 80 },
        ],
      });
    };

    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Onboarding Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Starts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalStarts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalCompletions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.completionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg. Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.averageCompletionTime}s</div>
          </CardContent>
        </Card>
      </div>

      {/* Add more detailed charts and visualizations */}
    </div>
  );
}
```

### ✅ Success Criteria
- [ ] Onboarding triggers for new users
- [ ] Update tour for existing users
- [ ] Completion metrics tracked
- [ ] Analytics dashboard showing metrics
- [ ] 80%+ completion rate achieved
- [ ] Average completion time < 3 minutes

---

## Testing Checklist

### Authentication Testing
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Token refresh on expiration
- [ ] Logout clears session
- [ ] 2FA flow (if implemented)
- [ ] Password reset flow
- [ ] Session timeout handling
- [ ] Multiple device sessions

### Performance Testing
- [ ] Bundle size within budget
- [ ] Core Web Vitals meet targets
- [ ] Performance dashboard loads correctly
- [ ] Budget violations fail CI
- [ ] Alerts trigger on regressions

### Onboarding Testing
- [ ] Tour triggers for new users
- [ ] Tour can be skipped
- [ ] Tour can be resumed
- [ ] Persona selection works
- [ ] Completion tracked correctly
- [ ] Update tour shows for existing users
- [ ] Analytics dashboard shows correct data

---

## Deployment Plan

### Pre-Deployment
1. Run all tests
2. Check performance budgets
3. Review security headers
4. Test authentication flow
5. Verify onboarding triggers

### Deployment Steps
1. Deploy backend API endpoints
2. Deploy frontend changes
3. Run smoke tests
4. Monitor error rates
5. Check performance metrics

### Post-Deployment
1. Monitor authentication success rate
2. Track onboarding completion rate
3. Check performance dashboard
4. Review error logs
5. Collect user feedback

---

## Rollback Plan

If issues arise:
1. Revert to previous version
2. Disable onboarding triggers
3. Fall back to mock auth (temporary)
4. Notify users of maintenance
5. Fix issues and redeploy

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Auth Success Rate | > 95% | Analytics |
| Token Refresh Success | > 99% | Logs |
| Performance Budget Pass | 100% | CI/CD |
| Onboarding Completion | > 80% | Analytics |
| Onboarding Time | < 3 min | Analytics |
| User Satisfaction | > 4.5/5 | Feedback Widget |

---

**Status**: Ready to Implement
**Timeline**: March 6-19, 2026
**Owner**: Frontend Team + Backend Team
**Review Date**: March 19, 2026

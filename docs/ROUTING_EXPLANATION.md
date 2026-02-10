# Client Routing System Explanation

## Overview

The Chanuka client uses **React Router v7** for navigation with lazy-loaded components and comprehensive error handling.

## Route Configuration

All routes are defined in `client/src/app/shell/AppRouter.tsx` with the following structure:

### Public Routes (No Authentication Required)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | HomePage | Landing page with hero section |
| `/bills` | BillsPortal | Main bills listing and search |
| `/bills/:id` | BillDetail | Individual bill details |
| `/community` | CommunityHub | Community discussions |
| `/search` | UniversalSearchPage | Main search interface |
| `/workarounds` | WorkaroundAnalysisPage | Workaround detection dashboard |
| `/civic-education` | CivicEducationPage | Civic education resources |
| `/analysis` | AnalysisToolsPage | Analysis tools |
| `/expert` | ExpertInsightsPage | Expert insights |
| `/api` | ApiAccessPage | API documentation |
| `/status` | SystemStatusPage | System status |

### Legal & Information Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/about` | AboutPage | About Chanuka |
| `/terms` | TermsPage | Terms of service |
| `/privacy` | PrivacyPage | Privacy policy |
| `/cookies` | CookiePolicyPage | Cookie policy |
| `/accessibility` | AccessibilityPage | Accessibility statement |
| `/security` | SecurityPage | Security information |
| `/support` | SupportPage | Support resources |
| `/contact` | ContactPage | Contact information |
| `/careers` | CareersPage | Career opportunities |
| `/press` | PressPage | Press resources |
| `/blog` | BlogPage | Blog posts |
| `/sitemap` | SitemapPage | Site map |

### Protected Routes (Authentication Required)

| Route | Component | Protection Level | Description |
|-------|-----------|------------------|-------------|
| `/dashboard` | UserDashboard | Authenticated | User dashboard |
| `/account` | UserProfile | Authenticated | User account |
| `/account/settings` | UserProfile | Verified User | Account settings |
| `/admin` | AdminDashboard | Admin Only | Admin dashboard |
| `/admin/analytics` | AnalyticsDashboard | Admin Only | Analytics dashboard |

### Legacy Redirects

| Old Route | Redirects To | Reason |
|-----------|--------------|--------|
| `/profile` | `/account` | Standardization |
| `/IntelligentSearchPage` | `/search` | Rebranding |
| `/intelligent-search` | `/search` | Rebranding |

### Catch-All Route

| Route | Component | Description |
|-------|-----------|-------------|
| `*` | NotFoundPage | 404 error page |

## Why Routes Lead to 404

Routes can lead to the 404 page for several reasons:

### 1. **Typos in URLs**
If a user types a URL incorrectly or follows a broken link, they'll see the 404 page.

**Example:**
- `/bill` instead of `/bills`
- `/comunity` instead of `/community`

### 2. **Removed or Renamed Routes**
If a route was previously available but has been removed or renamed, old bookmarks or external links will break.

**Example:**
- `/IntelligentSearchPage` now redirects to `/search`
- `/profile` now redirects to `/account`

### 3. **Missing Route Definitions**
If a link points to a route that was never defined in the router configuration.

**Example:**
- A link to `/monitoring` exists in the code but no route is defined for it

### 4. **Case Sensitivity**
React Router is case-sensitive. `/Bills` is different from `/bills`.

### 5. **Trailing Slashes**
Some configurations treat `/bills` and `/bills/` as different routes.

## Common Issues Found

### Issue 1: Missing `/monitoring` Route

**Location:** `client/src/features/home/pages/EnhancedHomePage.tsx` line 806

```tsx
{
  icon: Activity,
  title: 'Real-time Monitoring',
  description: '...',
  link: '/monitoring',  // ❌ This route doesn't exist!
  color: COLORS.secondary,
}
```

**Solution:** Either:
1. Create a monitoring page and add the route
2. Change the link to an existing route like `/status`

### Issue 2: Potential Missing Routes

Check these links in the homepage that might not have corresponding routes:
- `/monitoring` - Not defined in router
- Any feature links that point to non-existent pages

## How to Fix Broken Routes

### Step 1: Identify the Broken Link
Look at the browser console or network tab to see which route is failing.

### Step 2: Check if Route Exists
Search `AppRouter.tsx` for the route path.

### Step 3: Fix the Issue

**Option A: Add the Missing Route**
```tsx
{
  id: 'monitoring',
  path: '/monitoring',
  element: <MonitoringPage />,
}
```

**Option B: Update the Link**
Change the link to point to an existing route:
```tsx
// Before
link: '/monitoring'

// After
link: '/status'  // or another appropriate route
```

**Option C: Add a Redirect**
```tsx
{
  id: 'monitoring-redirect',
  path: '/monitoring',
  element: <Navigate to="/status" replace />,
}
```

## Route Protection Levels

### 1. Public Routes
Anyone can access these routes without authentication.

### 2. Protected Routes (`<ProtectedRoute>`)
Requires user to be logged in. Redirects to `/auth` if not authenticated.

### 3. Verified User Routes (`<VerifiedUserRoute>`)
Requires user to be logged in AND have verified their email/account.

### 4. Admin Routes (`<AdminRoute>`)
Requires user to have admin or super_admin role.

## Lazy Loading

All routes use lazy loading for better performance:

```tsx
const HomePage = createLazyComponent(
  () => import('@client/features/home/pages/home'),
  'Home Page'
);
```

**Benefits:**
- Smaller initial bundle size
- Faster initial page load
- Code splitting per route
- Better caching

## Error Handling

Each route is wrapped in:
1. **ErrorBoundary** - Catches React errors
2. **Suspense** - Shows loading state while component loads
3. **RouteWrapper** - Provides consistent error handling

If a route fails to load, users see a friendly error message with options to:
- Try again
- Go home
- See error details (development only)

## Debugging Routes

### Check Current Route
```tsx
import { useLocation } from 'react-router-dom';

const location = useLocation();
console.log('Current path:', location.pathname);
```

### Check All Defined Routes
Look at the `routes` array in `AppRouter.tsx` - all valid routes are listed there.

### Check for Redirects
Some routes automatically redirect:
- `/profile` → `/account`
- `/IntelligentSearchPage` → `/search`

## Best Practices

1. **Always define routes before linking to them**
2. **Use consistent naming** (lowercase, kebab-case)
3. **Add redirects for renamed routes** to maintain backward compatibility
4. **Test all links** after adding new routes
5. **Use TypeScript** to catch route typos at compile time
6. **Document route changes** in CHANGELOG.md

## Quick Fix Checklist

- [ ] Check if route exists in `AppRouter.tsx`
- [ ] Verify the link spelling matches the route path exactly
- [ ] Check for case sensitivity issues
- [ ] Look for trailing slash differences
- [ ] Verify the component file exists and exports correctly
- [ ] Check if route requires authentication
- [ ] Test the route in the browser
- [ ] Update any documentation

## Next Steps

To fix the current routing issues:

1. **Audit all links** in homepage components
2. **Create missing routes** or update links to existing routes
3. **Add redirects** for any legacy URLs
4. **Test all navigation** paths
5. **Update this documentation** with any changes

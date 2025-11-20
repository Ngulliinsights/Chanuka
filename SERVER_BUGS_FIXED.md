# Server Bugs - Analysis and Fixes

## Critical Bugs Fixed

### 1. ✅ **FIXED: Duplicate Router Registration**
**Location:** `server/index.ts`

**Problem:**
- Profile router was imported twice with different names (`usersRouter` and `profileRouter`)
- Both were registered to different endpoints (`/api/users` and `/api/profile`)
- This caused routing conflicts and confusion

**Original Code:**
```typescript
// Line 29
import { router as usersRouter } from './features/users/application/profile.js';
// Line 34
import { router as profileRouter } from './features/users/application/profile.js';

// Line 470
app.use('/api/users', usersRouter);
// Line 475
app.use('/api/profile', profileRouter);  // DUPLICATE!
```

**Fix Applied:**
```typescript
// Removed duplicate import
import { router as usersRouter } from './features/users/application/profile.js';

// Removed duplicate registration
app.use('/api/users', usersRouter);
// Removed: app.use('/api/profile', profileRouter);
```

**Impact:** Eliminates confusion, improves code clarity, and prevents potential routing conflicts.

---

### 2. ✅ **FIXED: Invalid Router Export in Users Feature**
**Location:** `server/features/users/index.ts`

**Problem:**
- Attempted to export `router` from `./application/users` which is a service file, not a router
- This would cause runtime errors when importing

**Original Code:**
```typescript
export { router as usersRouter } from './application/users';  // ERROR: users.ts has no router!
export { router as profileRouter } from './application/profile';
```

**Fix Applied:**
```typescript
// Removed invalid export
export { router as profileRouter } from './application/profile';
export { router as verificationRouter } from './application/verification';
```

**Impact:** Prevents runtime errors and aligns exports with actual file contents.

---

### 3. ✅ **FIXED: Client-Server API Path Mismatch**
**Location:** `server/features/users/application/profile.ts`

**Problem:**
- Client calls `/api/users/profile` and `/api/users/preferences`
- Server only had `/me` and `/me/preferences` routes
- Mismatch caused 404 errors

**Fix Applied:**
Added compatibility routes to profile router:
```typescript
// Alias routes for client compatibility
router.get('/profile', authenticateToken, async (req, res) => {
  // Same logic as /me
});

router.get('/preferences', authenticateToken, async (req, res) => {
  // Same logic as /me/preferences
});

router.put('/preferences', authenticateToken, async (req, res) => {
  // Same logic as PATCH /me/preferences
});

router.get('/:user_id/profile', async (req, res) => {
  // Get specific user's profile with explicit /profile suffix
});
```

**Impact:** Ensures client API calls work without breaking existing `/me` routes.

---

## Issues Identified But Not Fixed (Require Further Analysis)

### 4. **Deprecated Content Moderation Service**
**Location:** `server/features/admin/content-moderation.ts`

**Issue:**
- Entire service marked as deprecated
- Still actively used in `server/features/admin/moderation.ts`
- Should be replaced with `moderationOrchestratorService`

**Files Affected:**
- `server/features/admin/moderation.ts` (4 usages)
- `server/features/admin/content-moderation.ts` (deprecated wrapper)

**Recommendation:** 
- Update `moderation.ts` to use `moderationOrchestratorService` directly
- Remove `content-moderation.ts` after migration
- Update tests

**Risk:** Low - Wrapper still works, just adds unnecessary abstraction layer

---

### 5. **TypeScript Build Errors in Shared Module**
**Location:** `shared/core/src/caching/*`

**Issues Found:**
- `ai-cache.ts`: Missing import `getDefaultCache`
- `ai-cache.ts`: Type incompatibility with `exactOptionalPropertyTypes`
- `cache-factory.ts`: Unused imports and declarations
- Multiple type safety issues with optional properties

**Impact:** Build fails in shared module, preventing full compilation

**Recommendation:** Fix TypeScript errors in shared module separately as they're not server-specific

---

### 6. **Database Initialization Complexity**
**Location:** `server/db.ts` and `server/index.ts`

**Issue:**
- Multiple initialization paths
- Auto-initialization on module import in `db.ts`
- Separate initialization in `server/index.ts`
- Potential for race conditions

**Current State:**
- Works but is overly complex
- Hard to reason about initialization order

**Recommendation:**
- Consolidate to single initialization point
- Remove auto-init from `db.ts`
- Make initialization explicitly controlled
- Lower priority - not causing bugs, just technical debt

---

### 7. **TODO Items and Missing Implementations**
**Location:** Multiple files

**Notable TODOs:**
- `admin-router.ts`: Missing billService integration for cache stats
- `community.ts`: Placeholder implementations for polls and highlights
- `alert-preferences`: Missing integrations with user profile/engagement services
- `financial-disclosure`: Missing admin middleware

**Impact:** Features incomplete but not causing errors

**Recommendation:** Track these separately as feature work, not bugs

---

## Summary

### Bugs Fixed: 3 Critical Issues
1. ✅ Duplicate router registration removed
2. ✅ Invalid router export corrected
3. ✅ Client-Server API compatibility routes added

### Remaining Issues: 4 Non-Critical
1. Deprecated service still in use (Low priority)
2. TypeScript build errors in shared module (Separate fix needed)
3. Database initialization complexity (Technical debt)
4. Incomplete feature implementations (Feature work)

### Testing Recommendations
1. Test all `/api/users/*` endpoints from client
2. Verify both `/me` and `/profile` routes work
3. Test user profile retrieval by ID
4. Verify preferences updates work correctly
5. Check that verification routes still function

### Next Steps
1. Test the router fixes
2. Address TypeScript errors in shared module
3. Plan migration away from deprecated content moderation service
4. Consider database initialization refactor (lower priority)

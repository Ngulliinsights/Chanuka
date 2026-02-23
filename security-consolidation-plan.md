# Security UI Consolidation Plan

**Date**: 2026-02-21  
**Decision**: Keep `core/security/ui/` as canonical, consolidate from `features/security/`

## Analysis Summary

### What's in core/security/
- ✅ **Infrastructure**: CSP, CSRF, input sanitizer, rate limiter, security monitor, vulnerability scanner
- ✅ **UI Components**: SecureForm, SecurityDashboard, SecuritySettings, Privacy components
- ✅ **Tests**: Unified security tests
- ✅ **Config**: Security configuration
- ✅ **Headers**: Security headers management
- ✅ **Unified System**: Complete security system implementation

### What's in features/security/
- ✅ **hooks/useSecurity.ts**: COMPREHENSIVE hook implementation (400+ lines)
- ✅ **pages/SecurityDemoPage.tsx**: Demo page for security features
- ❌ **ui/**: DUPLICATE of core/security/ui/ (nearly identical)

### What's in lib/hooks/
- ⚠️ **useSecurity.ts**: Just a re-export from features/security/hooks/useSecurity.ts

## Items to Salvage

### 1. useSecurity Hook ✅ KEEP
**Location**: `client/src/features/security/hooks/useSecurity.ts`

**Why Keep**:
- 400+ lines of comprehensive implementation
- Optimized with proper memoization and cleanup
- Exports multiple hooks: `useSecurity`, `useSecureForm`, `useRateLimit`
- Currently re-exported by `lib/hooks/useSecurity.ts`
- Used by `core/security/ui/dashboard/SecureForm.tsx`

**Action**: 
- ✅ KEEP in `features/security/hooks/useSecurity.ts`
- ✅ KEEP re-export in `lib/hooks/useSecurity.ts`
- This is actually correct - hooks can live in features even if they support infrastructure

### 2. SecurityDemoPage ✅ KEEP
**Location**: `client/src/features/security/pages/SecurityDemoPage.tsx`

**Why Keep**:
- Demo/example page showing security features
- Already updated to import from `@client/infrastructure/security/ui/`
- Pages belong in features/ per FSD

**Action**:
- ✅ KEEP in `features/security/pages/SecurityDemoPage.tsx`
- ✅ Already updated imports to use core/security/ui

### 3. UI Components ❌ DELETE
**Location**: `client/src/features/security/ui/`

**Why Delete**:
- Complete duplicate of `core/security/ui/`
- Nearly identical implementations (only trivial String() wrapper differences)
- All imports updated to use `core/security/ui/`

**Action**:
- ❌ DELETE entire `client/src/features/security/ui/` directory

### 4. features/security/index.ts ⚠️ UPDATE
**Current**: Only exports UI components
**Action**: Update to export hooks and pages instead

## Consolidation Steps

### Step 1: Verify Import Updates ✅ DONE
- ✅ Updated `SecurityDemoPage.tsx` to import from `@client/infrastructure/security/ui/`
- ✅ Updated `privacy-center.tsx` to import from `@client/infrastructure/security/ui/`

### Step 2: Update features/security/index.ts
Change from:
```typescript
export * from './ui';
```

To:
```typescript
// Hooks
export * from './hooks/useSecurity';

// Pages
export { default as SecurityDemoPage } from './pages/SecurityDemoPage';
```

### Step 3: Delete Duplicate UI Directory
```bash
rm -rf client/src/features/security/ui
```

### Step 4: Verify No Broken Imports
Run TypeScript compilation to ensure no broken imports remain.

## Final Structure

### core/security/ (Infrastructure)
```
core/security/
├── ui/                          # Security UI components (canonical)
│   ├── dashboard/
│   │   ├── SecureForm.tsx
│   │   ├── SecurityDashboard.tsx
│   │   └── SecuritySettings.tsx
│   ├── icons/
│   │   └── ChanukaIcons.tsx
│   ├── privacy/
│   │   ├── CookieConsentBanner.tsx
│   │   ├── DataUsageReportDashboard.tsx
│   │   ├── GDPRComplianceManager.tsx
│   │   └── privacy-policy.tsx
│   └── index.ts
├── unified/                     # Unified security system
├── config/                      # Security configuration
├── headers/                     # Security headers
├── __tests__/                   # Tests
├── csp-nonce.ts
├── csrf-protection.ts
├── input-sanitizer.ts
├── rate-limiter.ts
├── security-monitor.ts
├── security-service.ts
├── vulnerability-scanner.ts
└── index.ts
```

### features/security/ (Feature Layer)
```
features/security/
├── hooks/
│   └── useSecurity.ts          # Comprehensive security hooks
├── pages/
│   └── SecurityDemoPage.tsx    # Demo page
└── index.ts                     # Exports hooks and pages
```

### lib/hooks/ (Re-exports)
```
lib/hooks/
└── useSecurity.ts              # Re-exports from features/security/hooks
```

## Rationale

### Why This Structure Works

1. **Infrastructure in core/**: Security monitoring, vulnerability scanning, and security UI components are infrastructure concerns that support the entire application

2. **Hooks in features/**: The `useSecurity` hook is a feature-level abstraction that provides a React-friendly interface to the core security infrastructure. This is correct per FSD.

3. **Pages in features/**: Demo pages and feature-specific pages belong in features/

4. **Re-exports in lib/**: The lib/hooks re-export provides a convenient import path while maintaining the actual implementation in features/

### Why Not Move Everything to core/

The `useSecurity` hook is correctly placed in `features/security/hooks/` because:
- It's a React-specific abstraction (uses useState, useEffect, etc.)
- It provides a feature-level API for components to use
- Core should contain framework-agnostic infrastructure
- Hooks are presentation-layer concerns, not infrastructure

## Verification Checklist

- [ ] Update `features/security/index.ts` to export hooks and pages
- [ ] Delete `client/src/features/security/ui/` directory
- [ ] Run `npx tsc --noEmit -p client/tsconfig.json` to verify no errors
- [ ] Search for any remaining imports to `features/security/ui/`
- [ ] Update structural-ambiguities.md with final decision
- [ ] Update import-resolution-audit-progress.md

## Conclusion

**Decision**: Keep both, but with clear separation:
- **core/security/ui/**: Infrastructure-level security UI components (canonical)
- **features/security/hooks/**: Feature-level React hooks for using security
- **features/security/pages/**: Demo and feature pages
- **Delete**: features/security/ui/ (duplicate)

This maintains proper FSD architecture while eliminating duplication.

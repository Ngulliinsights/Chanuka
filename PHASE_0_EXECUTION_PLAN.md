# ⚡ PHASE 0: CRITICAL FIXES EXECUTION PLAN

**Status:** Ready to Execute  
**Duration:** 30-45 minutes  
**Objective:** Fix broken imports so code compiles  
**Risk Level:** LOW (minimal changes, fixes only)

---

## STEP-BY-STEP EXECUTION

### STEP 1: Fix ConflictOfInterestAnalysis.tsx Imports
**File:** `client/src/features/bills/ui/analysis/conflict-of-interest/ConflictOfInterestAnalysis.tsx`  
**Lines to Fix:** 23-29  
**Current Issue:** Invalid relative imports `../ui/...` 

```typescript
// BEFORE (BROKEN):
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// AFTER (FIXED):
import { Alert, AlertDescription, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
```

**Or split for readability:**
```typescript
import { Alert, AlertDescription } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
```

---

### STEP 2: Fix ConflictNetworkVisualization.tsx (analysis version) Imports
**File:** `client/src/features/bills/ui/analysis/conflict-of-interest/ConflictNetworkVisualization.tsx`  
**Lines to Check:** 20-30  
**Action:** Same fix as Step 1

---

### STEP 3: Fix FinancialExposureTracker.tsx Imports
**File:** `client/src/features/bills/ui/analysis/conflict-of-interest/FinancialExposureTracker.tsx`  
**Lines to Check:** 15-20  
**Action:** Same fix as Step 1

---

### STEP 4: Fix HistoricalPatternAnalysis.tsx Imports
**File:** `client/src/features/bills/ui/analysis/conflict-of-interest/HistoricalPatternAnalysis.tsx`  
**Lines to Check:** 10-20  
**Action:** Same fix as Step 1

---

### STEP 5: Fix ImplementationWorkaroundsTracker.tsx Imports
**File:** `client/src/features/bills/ui/analysis/conflict-of-interest/ImplementationWorkaroundsTracker.tsx`  
**Lines to Check:** 15-20  
**Action:** Same fix as Step 1

---

### STEP 6: Fix TransparencyScoring.tsx Imports
**File:** `client/src/features/bills/ui/analysis/conflict-of-interest/TransparencyScoring.tsx`  
**Lines to Check:** 10-15  
**Action:** Same fix as Step 1

---

### STEP 7: Delete Duplicate ConflictNetworkVisualization
**File to Delete:** `client/src/features/bills/ui/transparency/ConflictNetworkVisualization.tsx`  
**Reason:** Duplicate of the one in analysis/conflict-of-interest/  
**Safe to Delete:** YES - no other files import from this location

---

### STEP 8: Delete Duplicate Privacy Dashboard
**File to Delete:** `client/src/features/security/ui/privacy/privacy-dashboard.tsx`  
**Reason:** Duplicate of PrivacyDashboard.tsx (different casing)  
**Safe to Delete:** YES - low-level feature file

---

### STEP 9: Verify Build
**Command:** `npm run build`  
**Expected:** 0 TypeScript errors  
**If Fails:** Check for additional broken imports

---

## RISKS & MITIGATIONS

### Risk 1: Broken Imports Elsewhere
**Risk:** Other files might import from '../ui/' paths  
**Mitigation:** Use grep to search before/after  
**Command:** `grep -r "from.*'\.\./ui/" client/src/`

### Risk 2: Version Control Conflicts
**Risk:** Other developers might have changes  
**Mitigation:** Pull latest before making changes  
**Command:** `git pull origin main`

### Risk 3: Import Side Effects
**Risk:** Changing imports might change module loading order  
**Mitigation:** Run full test suite after changes  
**Command:** `npm run test`

---

## DETAILED CHANGE LIST

### File 1: ConflictOfInterestAnalysis.tsx
**Location:** `client/src/features/bills/ui/analysis/conflict-of-interest/ConflictOfInterestAnalysis.tsx`  
**Lines:** 23-29  
**Change Type:** Replace broken relative imports with design-system imports

```diff
- import { Alert, AlertDescription } from '../ui/alert';
- import { Badge } from '../ui/badge';
- import { Button } from '../ui/button';
- import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
- import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
+ import {
+   Alert,
+   AlertDescription,
+   Badge,
+   Button,
+   Card,
+   CardContent,
+   CardDescription,
+   CardHeader,
+   CardTitle,
+   Tabs,
+   TabsContent,
+   TabsList,
+   TabsTrigger,
+ } from '@client/shared/design-system';
```

---

### File 2: ConflictNetworkVisualization.tsx (analysis version)
**Location:** `client/src/features/bills/ui/analysis/conflict-of-interest/ConflictNetworkVisualization.tsx`  
**Action:** Check lines 20-30, apply same fix as File 1

---

### File 3: FinancialExposureTracker.tsx
**Location:** `client/src/features/bills/ui/analysis/conflict-of-interest/FinancialExposureTracker.tsx`  
**Action:** Check lines 15-20, apply same fix as File 1

---

### File 4: HistoricalPatternAnalysis.tsx
**Location:** `client/src/features/bills/ui/analysis/conflict-of-interest/HistoricalPatternAnalysis.tsx`  
**Action:** Check lines 10-20, apply same fix as File 1

---

### File 5: ImplementationWorkaroundsTracker.tsx
**Location:** `client/src/features/bills/ui/analysis/conflict-of-interest/ImplementationWorkaroundsTracker.tsx`  
**Action:** Check lines 15-20, apply same fix as File 1

---

### File 6: TransparencyScoring.tsx
**Location:** `client/src/features/bills/ui/analysis/conflict-of-interest/TransparencyScoring.tsx`  
**Action:** Check lines 10-15, apply same fix as File 1

---

### Deletions:
1. `client/src/features/bills/ui/transparency/ConflictNetworkVisualization.tsx` (duplicate)
2. `client/src/features/security/ui/privacy/privacy-dashboard.tsx` (duplicate)

---

## SUCCESS CRITERIA

✅ All files compile with no TypeScript errors  
✅ No more references to `from '../ui/'` paths  
✅ All design-system imports use correct path  
✅ Duplicate files deleted  
✅ Build passes: `npm run build`  
✅ Tests pass: `npm run test`  
✅ No new warnings introduced  

---

## ROLLBACK PLAN

If anything breaks:
```bash
# Revert changes:
git checkout client/src/features/bills/ui/analysis/conflict-of-interest/
git checkout client/src/features/security/ui/privacy/
git checkout client/src/features/bills/ui/transparency/

# Or individual file:
git checkout client/src/features/bills/ui/analysis/conflict-of-interest/ConflictOfInterestAnalysis.tsx
```

---

## CONFIRMATION NEEDED

Before executing Phase 0, confirm:

✅ User has reviewed DEEPER_DIVE_ANALYSIS.md  
✅ User approves deleting duplicate components  
✅ User has current git branch clean  
✅ User wants to proceed immediately  

**Type:** READY TO EXECUTE or NEEDS REVIEW?

# Bill Comparison Integration - Quick Start Guide

**Last Updated:** March 9, 2026

## Overview

This guide helps you quickly understand and implement the bill comparison integration into the user journey.

## The Problem

Currently, bill comparison is a **standalone feature** at `/analysis/compare` that users must:
1. Navigate away from bills to find
2. Manually select bills to compare
3. Have no contextual entry points

## The Solution

Integrate comparison into the **natural bill browsing flow** with multiple entry points:

```
Bill Detail → [Compare Button] → Quick Comparison
Bills List → [Select Bills] → Compare Selected
Similar Bills → [Compare All] → Instant Comparison
Search Results → [Compare Mode] → Multi-Select Compare
```

## Quick Implementation Checklist

### Phase 1: Core Integration (Start Here)

```bash
# 1. Create comparison cart hook
touch client/src/features/bills/hooks/useComparisonCart.ts

# 2. Create comparison modal
touch client/src/features/bills/ui/comparison/ComparisonModal.tsx

# 3. Create floating action bar
touch client/src/features/bills/ui/comparison/ComparisonFloatingBar.tsx

# 4. Update existing components
# - Add compare button to BillHeader
# - Add selection to BillsPortalPage
# - Update BillComparisonPage URL handling
```

### Key Files to Modify

```
client/src/features/bills/
├── hooks/
│   ├── useBillComparison.ts        # ✅ Already exists
│   └── useComparisonCart.ts        # 🆕 Create this
├── ui/
│   ├── BillHeader.tsx              # ✏️ Add compare button
│   ├── BillCard.tsx                # ✏️ Add selection checkbox
│   └── comparison/
│       ├── ComparisonModal.tsx     # 🆕 Create this
│       └── ComparisonFloatingBar.tsx # 🆕 Create this
└── pages/
    ├── BillsPortalPage.tsx         # ✏️ Add bulk selection
    └── BillComparisonPage.tsx      # ✏️ Update URL handling
```

## Code Snippets

### 1. Comparison Cart Hook (Redux Implementation)

```typescript
// client/src/features/bills/hooks/useComparisonCart.ts
import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@client/lib/hooks/store';
import {
  addBill,
  removeBill,
  toggleBill,
  clearCart,
  setBills,
} from '../store/comparisonCartSlice';

export const useComparisonCart = () => {
  const dispatch = useAppDispatch();
  
  const billIds = useAppSelector((state) => (state as any).comparisonCart?.billIds || []);
  const maxBills = useAppSelector((state) => (state as any).comparisonCart?.maxBills || 4);
  const count = billIds.length;
  const canAddMore = billIds.length < maxBills;

  const handleAddBill = useCallback((id: string) => {
    dispatch(addBill(id));
  }, [dispatch]);

  const handleRemoveBill = useCallback((id: string) => {
    dispatch(removeBill(id));
  }, [dispatch]);

  const handleToggleBill = useCallback((id: string) => {
    dispatch(toggleBill(id));
  }, [dispatch]);

  const handleClearCart = useCallback(() => {
    dispatch(clearCart());
  }, [dispatch]);

  const hasBill = useCallback((id: string) => {
    return billIds.includes(id);
  }, [billIds]);

  return {
    billIds,
    maxBills,
    count,
    addBill: handleAddBill,
    removeBill: handleRemoveBill,
    clearCart: handleClearCart,
    toggleBill: handleToggleBill,
    hasBill,
    canAddMore,
    setBills: (ids: string[]) => dispatch(setBills(ids)),
  };
};
```

### 2. Add Compare Button to Bill Header

```typescript
// client/src/features/bills/ui/BillHeader.tsx
import { GitCompare } from 'lucide-react';
import { useComparisonCart } from '../hooks/useComparisonCart';

// Inside BillHeader component
const { billIds, toggleBill } = useComparisonCart();
const isInCart = billIds.includes(bill.id);

<Button 
  variant={isInCart ? "default" : "outline"}
  onClick={() => toggleBill(bill.id)}
>
  <GitCompare className="w-4 h-4 mr-2" />
  {isInCart ? 'In Comparison' : 'Compare'}
  {billIds.length > 0 && (
    <Badge className="ml-2">{billIds.length}</Badge>
  )}
</Button>
```

### 3. Add Selection to Bills Portal

```typescript
// client/src/features/bills/pages/BillsPortalPage.tsx
import { useComparisonCart } from '../hooks/useComparisonCart';

const { billIds, toggleBill, clearCart } = useComparisonCart();

// In bill card rendering
<Checkbox
  checked={billIds.includes(bill.id)}
  onCheckedChange={() => toggleBill(bill.id)}
  aria-label={`Select ${bill.title} for comparison`}
/>

// Floating action bar (show when billIds.length >= 2)
{billIds.length >= 2 && (
  <ComparisonFloatingBar
    selectedBillIds={billIds}
    onCompare={() => navigate(`/analysis/compare?bills=${billIds.join(',')}`)}
    onClear={clearCart}
  />
)}
```

### 4. Comparison Floating Bar Component

```typescript
// client/src/features/bills/ui/comparison/ComparisonFloatingBar.tsx
interface Props {
  selectedBillIds: string[];
  onCompare: () => void;
  onClear: () => void;
}

export function ComparisonFloatingBar({ selectedBillIds, onCompare, onClear }: Props) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 
                    bg-white dark:bg-gray-800 shadow-2xl rounded-full 
                    px-6 py-3 flex items-center gap-4 border border-gray-200">
      <span className="text-sm font-medium">
        {selectedBillIds.length} bills selected
      </span>
      
      <Button onClick={onCompare} size="sm">
        <GitCompare className="w-4 h-4 mr-2" />
        Compare
      </Button>
      
      <Button onClick={onClear} variant="ghost" size="sm">
        Clear
      </Button>
    </div>
  );
}
```

## Entry Points Summary

### 1. Bill Detail Page
**Location:** `/bills/:id`  
**Action:** "Compare" button in header  
**Flow:** Opens modal → Select bills → View comparison

### 2. Bills Portal
**Location:** `/bills`  
**Action:** Checkbox selection + floating bar  
**Flow:** Select 2+ bills → Click "Compare Selected" → View comparison

### 3. Similar Bills Widget
**Location:** Bill detail page, sidebar  
**Action:** "Compare All" button  
**Flow:** One-click compare current + similar bills

### 4. Search Results
**Location:** `/search`  
**Action:** Compare mode toggle  
**Flow:** Switch to compare mode → Select bills → Compare

## URL Patterns

```
# Pre-selected bills from URL
/analysis/compare?bills=bill-1,bill-2,bill-3

# Compare from bill detail
/bills/123?compareWith=bill-2,bill-3

# Compare from search
/search?q=education&compare=bill-1,bill-2
```

## State Management

### Local State (Component)
- Modal open/close
- Loading states
- Error states

### Global State (Zustand)
- Comparison cart (selected bill IDs)
- Persisted to localStorage

### URL State
- Selected bills for comparison
- Comparison view settings
- Shareable links

## Testing Checklist

```bash
# Manual Testing
□ Add bill to comparison from detail page
□ Select multiple bills from portal
□ Compare from similar bills widget
□ URL parameters work correctly
□ State persists across page navigation
□ Clear comparison cart works
□ Mobile responsive
□ Keyboard accessible

# Automated Testing
□ Unit tests for useComparisonCart
□ Integration tests for bill selection
□ E2E test for complete comparison flow
```

## Common Issues & Solutions

### Issue: State not persisting
**Solution:** Check localStorage permissions, verify persist middleware config

### Issue: Too many bills selected
**Solution:** Enforce maxBills limit in cart hook, show user feedback

### Issue: URL too long with many bills
**Solution:** Use short bill IDs, consider server-side state storage

### Issue: Performance with many selections
**Solution:** Use React.memo, optimize re-renders, debounce updates

## Next Steps

1. ✅ Review integration plan
2. ⏳ Implement Phase 1 (Core Integration)
3. ⏳ Test with users
4. ⏳ Iterate based on feedback
5. ⏳ Roll out additional phases

## Resources

- [Full Integration Plan](./INTEGRATION_PLAN.md)
- [Detailed Implementation Tasks](./IMPLEMENTATION_TASKS.md)
- [Design System Components](../../client/src/lib/design-system/)
- [Existing Comparison Hook](../../client/src/features/bills/hooks/useBillComparison.ts)

## Questions?

- Check existing implementation in `BillComparisonPage.tsx`
- Review similar patterns in `BillsPortalPage.tsx`
- Look at state management in other features
- Consult design system documentation

---

**Remember:** The goal is to make comparison a natural part of bill browsing, not a separate destination!

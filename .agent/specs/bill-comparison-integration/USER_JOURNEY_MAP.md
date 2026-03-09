# Bill Comparison - User Journey Map

**Created:** March 9, 2026

## Current State (Standalone)

```
User Journey: Isolated Comparison Experience
═══════════════════════════════════════════════

Home → Bills Portal → Bill Detail
                         ↓
                    [Browsing]
                         ↓
                    (Dead End)
                         
Separate Path:
Home → Analysis Tools → Bill Comparison
                            ↓
                    Manual Selection
                            ↓
                    View Comparison
```

**Problems:**
- Comparison disconnected from bill browsing
- No contextual entry points
- Users must remember to navigate to analysis tools
- Manual bill selection from scratch

---

## Future State (Integrated)

```
User Journey: Seamless Comparison Integration
═══════════════════════════════════════════════

┌─────────────────────────────────────────────┐
│         ENTRY POINT 1: Bill Detail          │
└─────────────────────────────────────────────┘

Home → Bills Portal → Bill Detail
                         ↓
                   [View Bill A]
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
      [Compare Button]      [Similar Bills]
              ↓                     ↓
      Opens Modal           "Compare All"
              ↓                     ↓
      Select Bills          Pre-selected
              ↓                     ↓
              └──────────┬──────────┘
                         ↓
                 View Comparison
                         ↓
                   [Analysis]

┌─────────────────────────────────────────────┐
│       ENTRY POINT 2: Bills Portal           │
└─────────────────────────────────────────────┘

Home → Bills Portal
         ↓
    [Browse Bills]
         ↓
    Select Multiple (Checkboxes)
         ↓
    Floating Bar Appears
         ↓
    "Compare Selected"
         ↓
    View Comparison

┌─────────────────────────────────────────────┐
│       ENTRY POINT 3: Search Results         │
└─────────────────────────────────────────────┘

Home → Search
         ↓
    Enter Query
         ↓
    View Results
         ↓
    Toggle "Compare Mode"
         ↓
    Select Bills
         ↓
    "Compare Selected"
         ↓
    View Comparison

┌─────────────────────────────────────────────┐
│       ENTRY POINT 4: Collections            │
└─────────────────────────────────────────────┘

Home → Collections → My Collection
                         ↓
                   [View Bills]
                         ↓
                 "Compare Collection"
                         ↓
                   View Comparison
```

---

## Interaction Patterns

### Pattern 1: Quick Compare from Detail
```
User on Bill Detail Page
    ↓
Clicks "Compare" button
    ↓
Modal opens with current bill pre-selected
    ↓
User searches/browses for other bills
    ↓
Selects 1-3 more bills
    ↓
Clicks "View Comparison"
    ↓
Navigates to /analysis/compare?bills=A,B,C
```

### Pattern 2: Bulk Compare from List
```
User on Bills Portal
    ↓
Checks boxes on Bill A, B, C
    ↓
Floating action bar appears at bottom
    ↓
Shows "3 bills selected"
    ↓
User clicks "Compare Selected"
    ↓
Navigates to comparison view
```

### Pattern 3: One-Click Compare Similar
```
User viewing Bill A
    ↓
Scrolls to "Similar Bills" widget
    ↓
Sees Bills B, C, D listed
    ↓
Clicks "Compare All Similar"
    ↓
Instantly navigates to comparison
    ↓
All bills (A, B, C, D) pre-loaded
```

---

## State Flow Diagram

```
┌─────────────────────────────────────────────┐
│         Comparison Cart State               │
│  (Persisted in localStorage via Zustand)    │
└─────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
   Add Bill                Remove Bill
        ↓                       ↓
   Update Badge           Update Badge
        ↓                       ↓
        └───────────┬───────────┘
                    ↓
            billIds: string[]
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
   Display Count          Enable Actions
        ↓                       ↓
   Show in UI            Compare Button
```

---

## Component Hierarchy

```
App
└── BillsPortalPage
    ├── BillCard (multiple)
    │   ├── Checkbox (selection)
    │   └── Quick Actions Menu
    │       └── "Add to Compare"
    │
    └── ComparisonFloatingBar (conditional)
        ├── Selection Count
        ├── "Compare" Button
        └── "Clear" Button

App
└── BillDetailPage
    ├── BillHeader
    │   └── "Compare" Button
    │       └── Opens ComparisonModal
    │
    ├── SimilarBillsWidget
    │   ├── Similar Bill Cards
    │   └── "Compare All" Button
    │
    └── ComparisonModal (conditional)
        ├── Current Bill (pre-selected)
        ├── BillSelector
        │   ├── Search Input
        │   └── Bill List
        └── Actions
            ├── "View Comparison"
            └── "Cancel"
```

---

## Data Flow

```
User Action
    ↓
Component Event Handler
    ↓
useComparisonCart Hook
    ↓
Zustand Store Update
    ↓
localStorage Sync
    ↓
UI Re-render
    ↓
Visual Feedback
```

### Example: Adding Bill to Comparison

```typescript
// 1. User clicks "Compare" button
<Button onClick={() => toggleBill(bill.id)}>

// 2. Hook updates state
const toggleBill = (id: string) => {
  if (billIds.includes(id)) {
    removeBill(id);
  } else {
    addBill(id);
  }
}

// 3. Zustand updates store + localStorage
set({ billIds: [...billIds, id] })

// 4. Components re-render with new state
const { billIds } = useComparisonCart();

// 5. UI shows updated state
{billIds.length > 0 && <Badge>{billIds.length}</Badge>}
```

---

## Navigation Flows

### Flow 1: Detail → Comparison
```
/bills/123
    ↓ (click Compare)
Modal opens
    ↓ (select bills)
/analysis/compare?bills=123,456,789
```

### Flow 2: Portal → Comparison
```
/bills
    ↓ (select bills)
Floating bar appears
    ↓ (click Compare)
/analysis/compare?bills=123,456,789
```

### Flow 3: Search → Comparison
```
/search?q=education
    ↓ (toggle compare mode)
/search?q=education&mode=compare
    ↓ (select bills)
/analysis/compare?bills=123,456,789
```

---

## Mobile Considerations

### Mobile Journey Adaptations

```
Mobile Bill Detail
    ↓
Sticky "Compare" FAB (bottom-right)
    ↓
Bottom Sheet Modal (not full modal)
    ↓
Simplified Bill Selector
    ↓
"View Comparison" (full screen)
```

### Mobile Portal
```
Mobile Bills List
    ↓
Long-press to select (or tap checkbox)
    ↓
Bottom Sheet Action Bar
    ↓
"Compare X Bills" button
    ↓
Full-screen comparison
```

---

## Accessibility Journey

### Keyboard Navigation
```
Tab to "Compare" button
    ↓
Enter to open modal
    ↓
Tab through bill selector
    ↓
Space to select bills
    ↓
Tab to "View Comparison"
    ↓
Enter to navigate
```

### Screen Reader Flow
```
"Compare button, opens comparison modal"
    ↓
"Comparison modal, select bills to compare"
    ↓
"Bill A, checkbox, checked"
    ↓
"Bill B, checkbox, not checked"
    ↓
"View comparison button, compares 2 bills"
```

---

## Success Metrics by Journey

### Entry Point Usage
- 40% from Bill Detail
- 35% from Bills Portal
- 15% from Similar Bills
- 10% from Search/Other

### Completion Rates
- Detail → Comparison: 70%
- Portal → Comparison: 80%
- Similar → Comparison: 90%

### Time to Compare
- From Detail: <30 seconds
- From Portal: <20 seconds
- From Similar: <10 seconds

---

## Edge Cases & Fallbacks

### No Bills Selected
```
User clicks "Compare" with 0 bills
    ↓
Show empty state
    ↓
"Select at least 2 bills to compare"
```

### Only 1 Bill Selected
```
User clicks "Compare" with 1 bill
    ↓
Show prompt
    ↓
"Select 1 more bill to compare"
```

### Max Bills Reached
```
User tries to add 5th bill (max: 4)
    ↓
Show toast notification
    ↓
"Maximum 4 bills can be compared"
```

### Bill Not Found
```
User navigates to comparison with invalid ID
    ↓
Show error state
    ↓
"Bill not found, removed from comparison"
```

---

## Future Enhancements

### Phase 2+
- Comparison history
- Saved comparisons
- Shared comparison links
- Comparison templates
- AI-powered comparison insights
- Real-time collaborative comparison

---

**Key Takeaway:** Every bill interaction should offer a path to comparison!

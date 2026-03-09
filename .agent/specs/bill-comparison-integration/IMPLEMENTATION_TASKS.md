# Bill Comparison Integration - Implementation Tasks

**Created:** March 9, 2026  
**Status:** Ready to Start  
**Estimated Duration:** 4 weeks

## Phase 1: Core Integration (Week 1)

### Task 1.1: Create Comparison Cart Hook
**File:** `client/src/features/bills/hooks/useComparisonCart.ts`  
**Priority:** High  
**Dependencies:** None

**Implementation:**
```typescript
// Persistent state for bill comparison selections
// Uses localStorage for persistence across sessions
// Provides add/remove/clear operations
// Enforces max bills limit (default: 4)
```

**Acceptance Criteria:**
- [ ] Hook manages bill selection state
- [ ] Persists to localStorage
- [ ] Enforces max bills limit
- [ ] Provides clear API (add, remove, clear, toggle)
- [ ] Includes TypeScript types

---

### Task 1.2: Create Comparison Modal Component
**File:** `client/src/features/bills/ui/comparison/ComparisonModal.tsx`  
**Priority:** High  
**Dependencies:** Task 1.1

**Implementation:**
```typescript
// Modal for quick bill comparison
// Shows current bill + bill selector
// Preview of selected bills
// Actions: View Full Comparison, Cancel
```

**Acceptance Criteria:**
- [ ] Opens from bill detail page
- [ ] Pre-selects current bill
- [ ] Shows bill selector with search
- [ ] Displays selected bills count
- [ ] Navigates to full comparison view
- [ ] Responsive design
- [ ] Keyboard accessible

---

### Task 1.3: Add Compare Button to Bill Header
**File:** `client/src/features/bills/ui/BillHeader.tsx`  
**Priority:** High  
**Dependencies:** Task 1.2

**Changes:**
```typescript
// Add "Compare" button next to existing actions
// Opens ComparisonModal with current bill pre-selected
// Shows badge if bill is already in comparison cart
```

**Acceptance Criteria:**
- [ ] Button appears in bill header
- [ ] Opens comparison modal
- [ ] Visual indicator if bill in cart
- [ ] Matches existing button styles
- [ ] Mobile responsive

---

### Task 1.4: Add Bill Selection to Bills Portal
**File:** `client/src/features/bills/pages/BillsPortalPage.tsx`  
**Priority:** High  
**Dependencies:** Task 1.1

**Changes:**
```typescript
// Add checkbox to each bill card
// Track selected bills in state
// Show selection count
// Enable bulk actions
```

**Acceptance Criteria:**
- [ ] Checkboxes on bill cards
- [ ] Select all / deselect all
- [ ] Selection persists during filtering
- [ ] Visual feedback for selected bills
- [ ] Accessible checkbox labels

---

### Task 1.5: Create Comparison Floating Action Bar
**File:** `client/src/features/bills/ui/comparison/ComparisonFloatingBar.tsx`  
**Priority:** High  
**Dependencies:** Task 1.4

**Implementation:**
```typescript
// Floating bar at bottom of screen
// Shows when 2+ bills selected
// Actions: Compare Selected, Clear Selection
// Shows count and bill previews
```

**Acceptance Criteria:**
- [ ] Appears when 2+ bills selected
- [ ] Fixed position at bottom
- [ ] Shows selection count
- [ ] "Compare" button navigates to comparison
- [ ] "Clear" button clears selection
- [ ] Smooth animations
- [ ] Mobile responsive

---

### Task 1.6: Update Comparison Page URL Handling
**File:** `client/src/features/bills/pages/BillComparisonPage.tsx`  
**Priority:** Medium  
**Dependencies:** None

**Changes:**
```typescript
// Support pre-selected bills from URL
// Handle navigation from different entry points
// Update breadcrumb based on referrer
// Improve back navigation
```

**Acceptance Criteria:**
- [ ] Reads bill IDs from URL params
- [ ] Pre-selects bills on load
- [ ] Dynamic breadcrumb (not hardcoded)
- [ ] Proper back navigation
- [ ] URL updates when bills change

---

## Phase 2: Enhanced Entry Points (Week 2)

### Task 2.1: Add Comparison to Similar Bills Widget
**File:** `client/src/features/recommendation/ui/SimilarBillsWidget.tsx`  
**Priority:** Medium  
**Dependencies:** Phase 1

**Changes:**
```typescript
// Add "Compare All" button
// Add individual "Add to Compare" buttons
// Show which bills are in comparison cart
```

**Acceptance Criteria:**
- [ ] "Compare All" button compares current + similar bills
- [ ] Individual compare buttons per bill
- [ ] Visual indicator for bills in cart
- [ ] Navigates to comparison view
- [ ] Handles edge cases (no similar bills)

---

### Task 2.2: Add Comparison Mode to Search Results
**File:** `client/src/features/search/ui/results/SearchResults.tsx`  
**Priority:** Medium  
**Dependencies:** Phase 1

**Changes:**
```typescript
// Add view mode toggle: List | Grid | Compare
// In compare mode, show checkboxes
// Add "Compare Selected" action
```

**Acceptance Criteria:**
- [ ] View mode toggle includes "Compare"
- [ ] Compare mode shows checkboxes
- [ ] Selection state managed
- [ ] "Compare Selected" button appears
- [ ] Smooth mode transitions

---

### Task 2.3: Add Quick Compare to Bill Cards
**File:** `client/src/features/bills/ui/BillCard.tsx`  
**Priority:** Low  
**Dependencies:** Phase 1

**Changes:**
```typescript
// Add hover action menu
// Include "Add to Compare" option
// Show badge if in comparison cart
```

**Acceptance Criteria:**
- [ ] Hover reveals action menu
- [ ] "Add to Compare" option visible
- [ ] Badge shows if in cart
- [ ] Smooth hover animations
- [ ] Touch-friendly on mobile

---

### Task 2.4: Create Comparison History Feature
**File:** `client/src/features/bills/ui/comparison/ComparisonHistory.tsx`  
**Priority:** Low  
**Dependencies:** Phase 1

**Implementation:**
```typescript
// Track recent comparisons
// Store in localStorage
// Show in dropdown/modal
// Quick access to past comparisons
```

**Acceptance Criteria:**
- [ ] Stores last 10 comparisons
- [ ] Shows comparison metadata (date, bills)
- [ ] One-click to reload comparison
- [ ] Clear history option
- [ ] Persists across sessions

---

## Phase 3: UX Refinements (Week 3)

### Task 3.1: Create Comparison Preview Component
**File:** `client/src/features/bills/ui/comparison/ComparisonPreview.tsx`  
**Priority:** Medium  
**Dependencies:** Phase 1

**Implementation:**
```typescript
// Mini comparison view in modal
// Shows key differences at a glance
// Quick stats and highlights
// Option to view full comparison
```

**Acceptance Criteria:**
- [ ] Shows top 3-5 key differences
- [ ] Displays similarity score
- [ ] Compact, scannable layout
- [ ] "View Full Comparison" link
- [ ] Loading states

---

### Task 3.2: Add Drag-and-Drop Bill Reordering
**File:** `client/src/features/bills/pages/BillComparisonPage.tsx`  
**Priority:** Low  
**Dependencies:** Phase 1

**Changes:**
```typescript
// Make bill cards draggable
// Reorder comparison columns
// Update URL on reorder
// Visual feedback during drag
```

**Acceptance Criteria:**
- [ ] Bills can be dragged to reorder
- [ ] Visual feedback during drag
- [ ] Comparison updates on drop
- [ ] URL reflects new order
- [ ] Accessible alternative (buttons)

---

### Task 3.3: Create Persistent Comparison Cart UI
**File:** `client/src/features/bills/ui/comparison/ComparisonCart.tsx`  
**Priority:** Medium  
**Dependencies:** Phase 1

**Implementation:**
```typescript
// Floating cart icon (like shopping cart)
// Shows count badge
// Opens drawer with selected bills
// Quick actions: compare, clear, remove individual
```

**Acceptance Criteria:**
- [ ] Floating cart icon in corner
- [ ] Badge shows bill count
- [ ] Drawer shows bill list
- [ ] Remove individual bills
- [ ] "Compare Now" button
- [ ] Persists across pages

---

### Task 3.4: Add Keyboard Shortcuts
**File:** `client/src/features/bills/ui/comparison/ComparisonShortcuts.tsx`  
**Priority:** Low  
**Dependencies:** Phase 1

**Implementation:**
```typescript
// Keyboard shortcuts for comparison actions
// C: Add to compare
// Shift+C: View comparison
// Esc: Close comparison modal
// ?: Show shortcuts help
```

**Acceptance Criteria:**
- [ ] Shortcuts work globally
- [ ] Help overlay (press ?)
- [ ] Visual indicators
- [ ] Doesn't conflict with existing shortcuts
- [ ] Documented in help

---

## Phase 4: Advanced Features (Week 4)

### Task 4.1: Save Comparison Views
**File:** `client/src/features/bills/hooks/useSavedComparisons.ts`  
**Priority:** Low  
**Dependencies:** Phase 1, User authentication

**Implementation:**
```typescript
// Save comparison to user profile
// Name and describe comparison
// Share with others
// Load saved comparisons
```

**Acceptance Criteria:**
- [ ] Save button in comparison view
- [ ] Name and description fields
- [ ] Stored in user profile
- [ ] List of saved comparisons
- [ ] Load saved comparison

---

### Task 4.2: Share Comparison Links
**File:** `client/src/features/bills/pages/BillComparisonPage.tsx`  
**Priority:** Medium  
**Dependencies:** Phase 1

**Changes:**
```typescript
// Generate shareable link
// Copy to clipboard
// Social media sharing
// Email sharing
// QR code generation
```

**Acceptance Criteria:**
- [ ] "Share" button generates link
- [ ] Copy to clipboard with toast
- [ ] Social media share buttons
- [ ] Email share option
- [ ] Link includes all comparison state

---

### Task 4.3: Export Comparison Reports
**File:** `client/src/features/bills/utils/comparisonExport.ts`  
**Priority:** Low  
**Dependencies:** Phase 1

**Implementation:**
```typescript
// Export to PDF
// Export to CSV
// Export to JSON
// Include charts and visualizations
```

**Acceptance Criteria:**
- [ ] PDF export with formatting
- [ ] CSV export with all data
- [ ] JSON export for developers
- [ ] Includes comparison metadata
- [ ] Download with proper filename

---

### Task 4.4: Comparison Templates
**File:** `client/src/features/bills/ui/comparison/ComparisonTemplates.tsx`  
**Priority:** Low  
**Dependencies:** Phase 1

**Implementation:**
```typescript
// Pre-defined comparison sets
// "All education bills"
// "Bills by same sponsor"
// "Bills in same category"
// Custom template creation
```

**Acceptance Criteria:**
- [ ] Template selector UI
- [ ] Pre-defined templates
- [ ] Custom template creation
- [ ] Save templates to profile
- [ ] Share templates

---

### Task 4.5: Collections Integration
**File:** `client/src/features/bills/pages/CollectionsPage.tsx`  
**Priority:** Low  
**Dependencies:** Phase 1, Collections feature

**Changes:**
```typescript
// "Compare Collection" button
// Compare all bills in collection
// Add comparison to collection
```

**Acceptance Criteria:**
- [ ] Compare all bills in collection
- [ ] Save comparison as collection
- [ ] Collection metadata includes comparisons
- [ ] Bulk comparison actions

---

## Testing Requirements

### Unit Tests
- [ ] `useComparisonCart` hook tests
- [ ] `useBillComparison` hook tests
- [ ] Comparison utility functions
- [ ] URL parameter parsing

### Integration Tests
- [ ] Bill selection flow
- [ ] Navigation to comparison
- [ ] URL state management
- [ ] localStorage persistence

### E2E Tests
- [ ] Complete comparison from bill detail
- [ ] Complete comparison from bills list
- [ ] Share comparison link
- [ ] Export comparison report

### Accessibility Tests
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Focus management
- [ ] ARIA labels

---

## Documentation Tasks

- [ ] Update user guide with comparison feature
- [ ] Create comparison tutorial video
- [ ] Document keyboard shortcuts
- [ ] Add comparison examples to docs
- [ ] Update API documentation

---

## Rollout Plan

### Week 1: Internal Testing
- Deploy to staging
- Internal team testing
- Gather feedback
- Fix critical bugs

### Week 2: Beta Release
- Enable for beta users
- Monitor usage metrics
- Collect user feedback
- Iterate on UX

### Week 3: Gradual Rollout
- 25% of users
- Monitor performance
- A/B test entry points
- Optimize based on data

### Week 4: Full Release
- 100% of users
- Announce feature
- Create marketing materials
- Monitor success metrics

---

## Success Criteria

### Adoption Metrics
- 30% of active users try comparison within first month
- Average 3+ comparisons per user per week
- 60% of comparisons initiated from integrated entry points (not standalone page)

### Performance Metrics
- Comparison page loads in <2s
- No performance degradation on bills portal
- <1% error rate on comparison operations

### User Satisfaction
- 4+ star rating on feature feedback
- <5% abandonment rate
- Positive sentiment in user interviews

---

## Risk Mitigation

### Technical Risks
- **Risk:** Performance impact on bills portal with selection state
  - **Mitigation:** Use React.memo, optimize re-renders, lazy load comparison components

- **Risk:** URL parameter limits with many bills
  - **Mitigation:** Use short bill IDs, implement server-side comparison state storage

### UX Risks
- **Risk:** Feature discovery - users don't find comparison
  - **Mitigation:** Multiple entry points, onboarding tooltips, feature announcement

- **Risk:** Overwhelming UI with too many options
  - **Mitigation:** Progressive disclosure, hide advanced features initially

### Business Risks
- **Risk:** Low adoption rate
  - **Mitigation:** User research, A/B testing, iterate based on feedback

- **Risk:** Increased server load
  - **Mitigation:** Caching, rate limiting, optimize queries

---

## Dependencies

### External
- Design system components (Button, Modal, Drawer, etc.)
- React Query for data fetching
- React Router for navigation
- localStorage API

### Internal
- Bills API endpoints
- User authentication system
- Analytics tracking
- Feature flags system

---

## Notes

- All tasks should follow existing code patterns and conventions
- Use TypeScript for type safety
- Follow accessibility guidelines (WCAG 2.1 AA)
- Implement proper error handling and loading states
- Add analytics tracking for all user interactions
- Write tests for all new functionality

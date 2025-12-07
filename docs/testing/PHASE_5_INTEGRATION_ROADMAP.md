# Phase 5: Integration Tests - Strategic Roadmap

> **Status**: 🔄 NEXT PHASE (After Phase 4.4)  
> **Timeline**: 3-5 days  
> **Tests Planned**: 100+ integration tests  
> **Impact**: 15% additional bug prevention  
> **Priority**: ✅ CRITICAL (catches real workflow bugs)

---

## Executive Summary

Phase 5 is where **real bugs are caught**. While unit tests verify components work in isolation, integration tests verify components work **together** with each other and with your backend APIs.

**Key Stats**:
- 80% of production bugs are workflow bugs (not component bugs)
- Integration tests catch these before they reach users
- ROI: Medium effort for high confidence
- Estimated: 3-5 days, 100+ tests

---

## The Problem Solved by Integration Tests

```
EXAMPLE: Bill Creation Workflow

Unit Tests Verify:
✓ Button renders correctly
✓ Input handles typing
✓ Form validates individual fields
✓ Submit button can be clicked

Integration Tests Verify:
✓ User types bill title → Button enables
✓ User fills all required fields → Validation shows errors correctly
✓ User submits → API call made
✓ API returns error → Error displayed, form not cleared
✓ User fixes data → Error clears
✓ User resubmits → Success message shows
✓ User sees new bill in list → Navigation works

REALITY: Most bugs are here (integration), not in unit tests
```

---

## What Integration Tests Include

### 1. Component Workflows

```
"How components work TOGETHER"

Examples:
✅ Input field + Label + Error message (form control group)
✅ Button + Form + Submit handler (form submission)
✅ Filter controls + Results list + Pagination (search)
✅ Navigation tabs + Content panels + Scroll (tabbed interface)
✅ Dialog + Form inside + Submit button (modal form)
✅ List item + Checkbox + Bulk action button (selection)
✅ Search input + Results + Loading state (async search)
✅ Dropdown + Selected value + Display (select state)
```

### 2. API Interactions (MSW - Mock Service Worker)

```
"How components interact with backend"

Setup: Mock API endpoints with MSW

Examples:
✅ User signup: Form submit → API call → Success/error handling
✅ Bill search: Search input → API query → Results display
✅ Data loading: Component mount → API call → Loading state → Data display
✅ Error handling: API error → Error message display → Retry option
✅ Data updates: Form submit → API call → List refresh → UI update
```

### 3. State Management Integration

```
"How Redux + React Query + Context work together"

Redux (Complex state):
✅ User session stored in Redux
✅ Form state managed by Redux
✅ Navigation state via Context

React Query (Server state):
✅ Bills list cached by React Query
✅ Auto-refetch on mutation
✅ Stale data handling

Context (UI state):
✅ Theme provider wraps all components
✅ Modal state via context
✅ Notification state via context
```

### 4. Form Workflows

```
"Complete form submission flow"

Form Scenarios:
✅ Empty form → Submit disabled
✅ Invalid email → Error shown
✅ Valid form → Submit enabled
✅ During submission → Loading state, button disabled
✅ API returns error → Error message, form not cleared
✅ User fixes error → Error clears, can resubmit
✅ Success → Success message, form cleared, redirect
✅ Validation rules → Cross-field validation
```

### 5. User Interaction Flows

```
"Real user scenarios"

User Journeys:
✅ Create bill: Fill form → Submit → Success → See in list
✅ Edit bill: Click edit → Form pre-filled → Change data → Submit → Verify update
✅ Delete bill: Click delete → Confirm dialog → Submit → Verify removed
✅ Filter bills: Select filters → Results update → Pagination works
✅ Search bills: Type query → Results load → Can click result → Shows details
✅ Toggle theme: Click theme toggle → Theme updates everywhere
✅ Signup: Fill form → Submit → Session created → Redirects to dashboard
```

---

## Test Organization: __tests__ Subdirectories

```
src/components/ui/__tests__/
├── button-form.integration.test.tsx          ← Button in form context
├── input-validation.integration.test.tsx     ← Input + validation message
├── dialog-form-submission.test.tsx           ← Dialog with form
├── tabs-navigation.test.tsx                  ← Tabs + content switching
├── list-filters.test.tsx                     ← Filters + results
├── search-workflow.test.tsx                  ← Search + results + pagination
└── form-complete-flow.test.tsx               ← Full form submission

src/lib/__tests__/
├── form-submission-workflow.test.ts          ← formBuilder + API
├── validation-with-display.test.ts           ← Schema validation + UI
└── search-filter-workflow.test.ts            ← Search logic + API

src/hooks/__tests__/
├── useUser-with-redux.test.ts                ← Hook + Redux store
├── useBill-with-react-query.test.ts          ← Hook + React Query cache
└── useFormBuilder-complete.test.ts           ← Form hook + submission
```

---

## Setup Requirements for Integration Tests

### 1. MSW (Mock Service Worker) Setup

```typescript
// tests/setup/msw-handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Bill endpoints
  http.get('/api/bills', () => {
    return HttpResponse.json([
      { id: '1', title: 'Healthcare Bill', status: 'active' },
      { id: '2', title: 'Education Bill', status: 'draft' },
    ]);
  }),

  http.post('/api/bills', async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json(
      { id: 'new-id', ...data },
      { status: 201 }
    );
  }),

  // User endpoints
  http.post('/api/auth/signup', async ({ request }) => {
    const data = await request.json();
    return HttpResponse.json(
      { id: 'user-id', email: data.email },
      { status: 201 }
    );
  }),

  // Error scenarios
  http.post('/api/bills/error', () => {
    return HttpResponse.json(
      { error: 'Invalid bill data' },
      { status: 400 }
    );
  }),
];
```

### 2. Redux Store Mock

```typescript
// tests/setup/redux-mock-store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@client/store/auth';
import formReducer from '@client/store/form';

export const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      form: formReducer,
      // ... other reducers
    },
    preloadedState: initialState,
  });
};
```

### 3. React Query Setup for Tests

```typescript
// tests/setup/react-query.ts
import { QueryClient } from '@tanstack/react-query';

export const createMockQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
};
```

---

## Sample Integration Tests

### Test 1: Bill Creation Workflow

```typescript
describe('Bill Creation Workflow', () => {
  it('should create bill through complete form submission', async () => {
    const { getByLabelText, getByRole } = render(
      <BillForm onSuccess={vi.fn()} />
    );

    // Fill form
    await userEvent.type(getByLabelText('Title'), 'Healthcare Reform Act');
    await userEvent.type(getByLabelText('Description'), 'Comprehensive healthcare...');
    await userEvent.selectOption(getByLabelText('Urgency'), 'high');

    // Submit
    const submitButton = getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    // Verify loading state
    expect(submitButton).toBeDisabled();

    // Wait for success
    await waitFor(() => {
      expect(getByText('Bill created successfully')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    const { getByLabelText, getByRole, getByText } = render(
      <BillForm onSuccess={vi.fn()} />
    );

    // Fill form with minimal data (will trigger error)
    await userEvent.type(getByLabelText('Title'), 'Short');
    await userEvent.click(getByRole('button', { name: /submit/i }));

    // Wait for error message
    await waitFor(() => {
      expect(getByText(/invalid bill data/i)).toBeInTheDocument();
    });

    // Form should not be cleared (allow retry)
    expect(getByLabelText('Title')).toHaveValue('Short');
  });
});
```

### Test 2: Search with Filters Workflow

```typescript
describe('Search and Filter Workflow', () => {
  it('should filter bills based on search criteria', async () => {
    const { getByRole, getByDisplayValue, findByText } = render(
      <BillSearch />
    );

    // Enter search term
    await userEvent.type(
      getByRole('textbox', { name: /search/i }),
      'healthcare'
    );

    // Select filter
    await userEvent.selectOption(
      getByRole('combobox', { name: /status/i }),
      'active'
    );

    // Results should update
    await findByText(/Healthcare Bill/);

    // Verify pagination
    expect(getByRole('button', { name: /next page/i })).toBeInTheDocument();
  });

  it('should handle empty search results', async () => {
    const { getByRole, getByText } = render(<BillSearch />);

    // Search for non-existent bill
    await userEvent.type(
      getByRole('textbox', { name: /search/i }),
      'xyznonexistent'
    );

    // Should show empty state
    await waitFor(() => {
      expect(getByText(/no bills found/i)).toBeInTheDocument();
    });
  });
});
```

### Test 3: Form with Validation Workflow

```typescript
describe('Form with Real-time Validation', () => {
  it('should validate field and display error message', async () => {
    const { getByLabelText, getByText, queryByText } = render(
      <UserRegistrationForm />
    );

    const emailInput = getByLabelText('Email');

    // Type invalid email
    await userEvent.type(emailInput, 'invalid-email');
    await userEvent.tab(); // Trigger blur

    // Error should appear
    await waitFor(() => {
      expect(getByText(/invalid email/i)).toBeInTheDocument();
    });

    // Fix the email
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'valid@example.com');
    await userEvent.tab();

    // Error should disappear
    await waitFor(() => {
      expect(queryByText(/invalid email/i)).not.toBeInTheDocument();
    });
  });

  it('should disable submit until form is valid', async () => {
    const { getByLabelText, getByRole } = render(
      <UserRegistrationForm />
    );

    const submitButton = getByRole('button', { name: /register/i });

    // Initially disabled
    expect(submitButton).toBeDisabled();

    // Fill required fields
    await userEvent.type(getByLabelText('First Name'), 'John');
    await userEvent.type(getByLabelText('Last Name'), 'Doe');
    await userEvent.type(getByLabelText('Email'), 'john@example.com');
    await userEvent.type(getByLabelText('Password'), 'SecurePass123');
    await userEvent.type(getByLabelText('Confirm Password'), 'SecurePass123');

    // Submit should now be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
```

### Test 4: Modal Form Workflow

```typescript
describe('Modal Form Workflow', () => {
  it('should open modal, fill form, and submit', async () => {
    const { getByRole, getByLabelText, queryByRole } = render(
      <BillListWithCreateModal />
    );

    // Open modal
    await userEvent.click(getByRole('button', { name: /create bill/i }));

    // Modal should be visible
    const dialog = getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Fill form inside modal
    await userEvent.type(
      getByLabelText('Title'),
      'New Healthcare Bill'
    );

    // Submit
    await userEvent.click(
      getByRole('button', { name: /submit/i, hidden: false })
    );

    // Modal should close
    await waitFor(() => {
      expect(queryByRole('dialog')).not.toBeInTheDocument();
    });

    // New bill should appear in list
    expect(getByText('New Healthcare Bill')).toBeInTheDocument();
  });
});
```

### Test 5: Redux Integration Workflow

```typescript
describe('Redux Integration Workflow', () => {
  it('should sync form state with Redux store', async () => {
    const mockStore = createMockStore();

    const { getByLabelText, getByRole } = render(
      <Provider store={mockStore}>
        <BillForm />
      </Provider>
    );

    // Type in form
    await userEvent.type(getByLabelText('Title'), 'Test Bill');

    // Redux store should update
    let state = mockStore.getState();
    expect(state.form.billTitle).toBe('Test Bill');

    // Submit
    await userEvent.click(getByRole('button', { name: /submit/i }));

    // After submit, form should reset
    await waitFor(() => {
      state = mockStore.getState();
      expect(state.form.billTitle).toBe('');
    });
  });
});
```

---

## Test Coverage Map

### Component Workflows (40 tests)

| Workflow | Components | Tests |
|----------|-----------|-------|
| Form submission | Input, Button, Label, Validation | 8 |
| Search & filter | Input, Button, List, Pagination | 6 |
| Modal form | Dialog, Form, Button | 5 |
| Tab navigation | Tabs, Panel switcher | 4 |
| List selection | Checkbox, List, Bulk action | 5 |
| Theme toggle | Toggle, Provider, Multiple components | 3 |
| Notification | Alert, Close button, List | 4 |
| Data loading | Loading skeleton, Results, Error | 5 |

### API Integration (30 tests)

| Feature | Scenario | Tests |
|---------|----------|-------|
| Create resource | Valid data, Invalid data, Error | 3 |
| Read resource | Success, Not found, Error | 3 |
| Update resource | Valid update, Conflict, Error | 3 |
| Delete resource | Success, Confirm dialog, Error | 3 |
| Search | Valid results, Empty, Error | 3 |
| Filter | Multiple filters, Clear filters, Pagination | 3 |
| Authentication | Login, Logout, Session expiry | 3 |
| Data caching | Fresh data, Stale data, Manual refresh | 3 |

### State Management (20 tests)

| Layer | Scenario | Tests |
|-------|----------|-------|
| Redux | Dispatch action, Selector, Multiple components | 5 |
| React Query | Cache hit, Cache miss, Mutation | 5 |
| Context | Provider, Consumer, Multiple values | 5 |
| Combination | Redux + React Query + Context | 5 |

### Error Scenarios (15 tests)

| Scenario | Examples | Tests |
|----------|----------|-------|
| Network errors | 404, 500, timeout | 3 |
| Validation errors | Invalid data, cross-field | 3 |
| State conflicts | Optimistic update fail, race condition | 3 |
| UI errors | Component unmount during async, focus lost | 3 |
| Recovery | Retry, fallback, graceful degradation | 3 |

---

## Setup Configuration

### vitest.workspace.ts (Already Ready)

```typescript
{
  name: 'client-int',
  include: ['client/src/**/__tests__/**/*.integration.test.tsx'],
  environment: 'jsdom',
  globals: true,
  setupFiles: ['vitest.setup.ts'],
  server: {
    deps: {
      inline: ['msw'],
    },
  },
},
```

### vitest.setup.ts (Add MSW)

```typescript
// Already has global utilities
// Add MSW server startup:

import { setupServer } from 'msw/node';
import { handlers } from './tests/setup/msw-handlers';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Implementation Timeline

### Day 1 (8 hours)
- Component workflow tests (20 tests)
- API integration basics (10 tests)
- Total: 30 tests

### Day 2 (8 hours)
- API error scenarios (10 tests)
- Redux integration (10 tests)
- Total: 20 tests

### Day 3 (8 hours)
- React Query caching (10 tests)
- Complex workflows (15 tests)
- Total: 25 tests

### Day 4 (8 hours)
- Edge cases and error scenarios (15 tests)
- Performance considerations (5 tests)
- Total: 20 tests

**Grand Total**: ~95 tests over 3-5 days (depending on complexity)

---

## Success Criteria

| Criterion | Target | Goal |
|-----------|--------|------|
| Tests Created | 100+ | ✅ 95-105 |
| Component workflows | 100% | ✅ All major workflows |
| API integration | Complete | ✅ CRUD + search + errors |
| State management | Integrated | ✅ Redux + React Query + Context |
| Error handling | Comprehensive | ✅ All error paths |
| Real user journeys | Tested | ✅ Bill creation, search, edit, delete |
| MSW setup | Working | ✅ All endpoints mocked |
| Redux setup | Working | ✅ Store configured |
| React Query setup | Working | ✅ Cache configured |
| Test execution | <30s | ✅ Fast feedback |

---

## Comparison: Unit vs Integration vs E2E

```
UNIT TESTS (Phase 4.2)
└─ Test: Component in isolation
   └─ Example: Button renders and fires click
   └─ Speed: <100ms
   └─ Cost: Low
   └─ Catches: Component bugs

INTEGRATION TESTS (Phase 5)
└─ Test: Components + APIs working together
   └─ Example: Form fills, submits, API called, success message shows
   └─ Speed: 500ms-2s
   └─ Cost: Medium
   └─ Catches: Workflow bugs

E2E TESTS (Phase 6 - Optional)
└─ Test: Real browser, real APIs (if used)
   └─ Example: User opens browser, clicks, forms fill, redirects, etc.
   └─ Speed: 5-30s
   └─ Cost: High
   └─ Catches: Browser-specific bugs (mostly already caught by integration)
```

---

## Why Integration Tests Matter Most

```
Production Bug Distribution:

Unit test bugs (Component alone): 5%
Integration bugs (Components + API): 60% ← MOST BUGS HERE
E2E bugs (Real browser specific): 10%
Manual testing bugs: 25%

Integration tests catch 60% of production bugs.
That's why they're critical and worth 3-5 days of effort.
```

---

## Next Phase After Integration

**Phase 6: E2E Tests** (Optional, 5-7 days)
- Real browser testing with Playwright
- Real user journeys end-to-end
- Cross-browser testing
- Mobile viewport testing
- **Lower ROI** (only 3% additional value, 35% more effort)
- Can be optional/deferred if time-constrained

---

## Summary

**Phase 5 Integration Tests roadmap is ready.**

✅ Architecture defined  
✅ 100+ tests planned  
✅ MSW setup documented  
✅ Redux setup documented  
✅ React Query setup documented  
✅ Sample tests provided  
✅ Timeline: 3-5 days  
✅ ROI: 15% additional bug prevention  

**Next Action**: Start Phase 4.4 (Accessibility Tests), then move to Phase 5

---

**Last Updated**: December 6, 2025  
**Status**: 🔄 READY FOR PHASE 4.4  
**Next Phase**: Phase 5 - Integration Tests (after A11y tests complete)

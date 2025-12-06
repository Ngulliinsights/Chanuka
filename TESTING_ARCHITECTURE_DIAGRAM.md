# Testing Architecture - Visual Guide

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Testing Monorepo Architecture                 │
│                    (Unified Configuration)                       │
└─────────────────────────────────────────────────────────────────┘

                          pnpm test
                              ↓
         ┌────────────────────────────────────────┐
         │  vitest.workspace.unified.ts           │
         │  (Single Source of Truth)              │
         └────────────────────────────────────────┘
                    ↓  ↓  ↓  ↓  ↓  ↓  ↓
        ┌───────────┴──┴──┴──┴──┴──┴──┴───────────┐
        ↓            ↓           ↓         ↓       ↓
    client-unit  client-int  client-a11y server-* shared  e2e
    
        ↓            ↓           ↓         ↓       ↓       ↓
   ┌─────────┐  ┌─────────┐  ┌────────┐  ┌──────┐ ┌──────┐ ┌──────┐
   │ setup/  │  │ setup/  │  │setup/  │  │setup/│ │setup/│ │setup/│
   │client.ts│  │client-  │  │client- │  │server│ │shared│ │e2e.ts│
   │         │  │integration│a11y.ts │  │.ts  │ │.ts   │ │      │
   └────┬────┘  └────┬────┘  └───┬────┘  └──┬───┘ └──┬───┘ └──┬───┘
        │            │           │          │       │        │
        ↓            ↓           ↓          ↓       ↓        ↓
   ┌─────────┐  ┌─────────┐  ┌────────┐  ┌──────┐ ┌──────┐ ┌──────┐
   │ Polyfill│  │   MSW   │  │jest-axe│  │ Mocks│ │ Test │ │ Helpers
   │ jsdom   │  │ Server  │  │        │  │Data  │ │Patterns
   │         │  │         │  │        │  │      │ │      │ │
   └────┬────┘  └────┬────┘  └───┬────┘  └──┬───┘ └──┬───┘ └──┬───┘
        │            │           │          │       │        │
        ↓            ↓           ↓          ↓       ↓        ↓
    test execution (consistent across all environments)
        │
        ├─→ src/**/*.test.tsx        (client-unit)
        ├─→ src/**/__tests__/**      (client-integration)
        ├─→ src/**/*.a11y.test.tsx   (client-a11y)
        ├─→ server/**/*.test.ts      (server-unit)
        ├─→ server/**/__tests__/**   (server-integration)
        ├─→ shared/**/*.test.ts      (shared)
        └─→ tests/e2e/**/*.spec.ts   (e2e)
```

---

## 📊 Test Project Relationships

```
┌──────────────────────────────────────────────────────────────┐
│                    TEST PROJECTS (7)                          │
└──────────────────────────────────────────────────────────────┘

FRONTEND TESTS
├─ client-unit (jsdom, 10s)
│  ├─ React components
│  ├─ Hooks testing
│  └─ Store logic
│
├─ client-integration (jsdom, 30s, with MSW)
│  ├─ User workflows
│  ├─ API interactions
│  ├─ Error handling
│  └─ Redux state flows
│
└─ client-a11y (jsdom, 15s, with axe)
   ├─ WCAG compliance
   ├─ Keyboard navigation
   ├─ Screen reader testing
   └─ Color contrast

BACKEND TESTS
├─ server-unit (node, 10s)
│  ├─ Business logic
│  ├─ Utilities
│  ├─ Validators
│  └─ Service methods
│
└─ server-integration (node, 30s, with DB)
   ├─ Database operations
   ├─ API endpoints
   ├─ Authentication
   └─ External services

SHARED TESTS
└─ shared (node, 10s)
   ├─ Validation rules
   ├─ Types
   ├─ Utilities
   └─ Config

E2E TESTS
└─ e2e (node/Playwright, 60s)
   ├─ User flows
   ├─ Full app workflows
   ├─ Cross-browser testing
   └─ Visual regression
```

---

## 🔄 Test Execution Flow

```
User runs: pnpm test
            ↓
vitest.workspace.unified.ts loaded
            ↓
Projects discovered: [client-unit, client-integration, client-a11y, ...]
            ↓
For each project in parallel:
    ├─ Load project config
    ├─ Load setupFiles
    │  └─ test-utils/setup/{project}.ts
    ├─ Make globals available
    │  ├─ global.testUtils
    │  ├─ global.integrationTestUtils (if integration)
    │  ├─ global.a11yTestUtils (if a11y)
    │  ├─ global.e2eTestUtils (if e2e)
    │  └─ Environment variables
    ├─ Start test framework
    ├─ Run matching test files
    └─ Collect coverage
            ↓
Results aggregated and displayed
            ↓
Exit with status code
```

---

## 📁 File Structure Overview

```
PROJECT ROOT
│
├── vitest.workspace.unified.ts ◄── MAIN CONFIG (7 projects)
│
├── test-utils/
│   ├── setup/
│   │   ├── client.ts ..................... Client unit test setup
│   │   ├── client-integration.ts ........ Client integration + MSW
│   │   ├── client-a11y.ts .............. Accessibility testing
│   │   ├── server.ts ................... Server unit test setup
│   │   ├── server-integration.ts ....... Server DB integration
│   │   ├── shared.ts ................... Shared lib validation
│   │   └── e2e.ts ...................... Playwright E2E setup
│   │
│   ├── mocks/                ◄── Future: MSW handlers
│   ├── factories/            ◄── Future: Test data factories
│   ├── helpers/              ◄── Future: Utility functions
│   ├── index.ts              ◄── Barrel exports
│   └── README.md             ◄── Comprehensive guide
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BillCard.tsx
│   │   │   └── BillCard.test.tsx ........ Unit test (colocated)
│   │   │
│   │   └── features/
│   │       └── bills/
│   │           ├── ui/
│   │           │   ├── BillsList.tsx
│   │           │   └── BillsList.test.tsx
│   │           │
│   │           └── __tests__/
│   │               ├── bills-workflow.test.tsx ... Integration
│   │               └── bills-a11y.test.tsx ....... A11y
│   │
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── features/
│   │   │   ├── bills/
│   │   │   │   ├── bills.service.ts
│   │   │   │   ├── bills.service.test.ts .... Unit
│   │   │   │   │
│   │   │   │   └── __tests__/
│   │   │   │       └── bills-api.test.ts ... Integration
│   │   │   └── users/
│   │   └── infrastructure/
│   │
│   └── vite.config.ts
│
├── shared/
│   ├── src/
│   │   ├── validation/
│   │   │   ├── validators.ts
│   │   │   └── validators.test.ts .... Shared test
│   │   └── utils/
│   │
│   └── vite.config.ts
│
├── tests/
│   └── e2e/
│       ├── login.spec.ts ............ E2E tests
│       └── bills-workflow.spec.ts ... (Playwright format)
│
├── TESTING_IMPLEMENTATION_SUMMARY.md
├── TESTING_CONSOLIDATION_PHASE1.md
└── TESTING_MIGRATION_CHECKLIST.md
```

---

## 🌀 Configuration Flow

```
vitest.workspace.unified.ts
    ├─ client-unit config
    │   └─ extends: ./client/vite.config.ts
    │   └─ setupFiles: ['./test-utils/setup/client.ts']
    │   └─ test.include: ['client/src/**/*.test.{ts,tsx}']
    │   └─ environment: 'jsdom'
    │
    ├─ client-integration config
    │   └─ extends: ./client/vite.config.ts
    │   └─ setupFiles: ['./test-utils/setup/client-integration.ts']
    │   └─ test.include: ['client/src/**/__tests__/**/*.test.{ts,tsx}']
    │   └─ environment: 'jsdom'
    │   └─ special: MSW server enabled
    │
    ├─ client-a11y config
    │   └─ extends: ./client/vite.config.ts
    │   └─ setupFiles: ['./test-utils/setup/client-a11y.ts']
    │   └─ test.include: ['client/src/**/*.a11y.test.{ts,tsx}']
    │   └─ environment: 'jsdom'
    │   └─ special: jest-axe matchers
    │
    ├─ server-unit config
    │   └─ extends: ./server/vite.config.ts
    │   └─ setupFiles: ['./test-utils/setup/server.ts']
    │   └─ test.include: ['server/**/*.test.{ts,tsx}']
    │   └─ environment: 'node'
    │
    ├─ server-integration config
    │   └─ extends: ./server/vite.config.ts
    │   └─ setupFiles: ['./test-utils/setup/server-integration.ts']
    │   └─ test.include: ['server/**/__tests__/**/*.test.{ts,tsx}']
    │   └─ environment: 'node'
    │   └─ special: DB connection available
    │
    ├─ shared config
    │   └─ extends: ./shared/vite.config.ts
    │   └─ setupFiles: ['./test-utils/setup/shared.ts']
    │   └─ test.include: ['shared/**/*.test.{ts,tsx}']
    │   └─ environment: 'node'
    │
    └─ e2e config
        └─ setupFiles: ['./test-utils/setup/e2e.ts']
        └─ test.include: ['tests/e2e/**/*.spec.{ts,tsx}']
        └─ environment: 'node' (Playwright runs browser)
        └─ special: Single-threaded execution
```

---

## 🔗 Global Utilities Available

```
┌──────────────────────────────────────────────────────────────┐
│              GLOBAL UTILITIES AUTOMATICALLY AVAILABLE         │
│                 (Injected by setupFiles)                      │
└──────────────────────────────────────────────────────────────┘

UNIVERSAL (all tests)
├─ global.testUtils
│  ├─ .delay(ms)
│  ├─ .mockUser
│  ├─ .mockAdmin
│  ├─ .mockBill
│  ├─ .mockSponsor
│  ├─ .generateUniqueData()
│  ├─ .validateApiResponse()
│  └─ .testPatterns { invalidIds, xssPayloads, ... }
│
INTEGRATION TESTS
├─ global.integrationTestUtils
│  ├─ .mockApiError()
│  ├─ .mockAuthenticatedUser()
│  ├─ .mockUnauthenticatedUser()
│  ├─ .waitForApiCalls()
│  ├─ .simulateSlowNetwork()
│  ├─ .simulateOfflineMode()
│  └─ .resetNetworkConditions()
│
ACCESSIBILITY TESTS
├─ global.a11yTestUtils
│  ├─ .checkAccessibility()
│  ├─ .checkLabeledElements()
│  ├─ .checkKeyboardNavigation()
│  └─ .checkColorContrast()
│
E2E TESTS
└─ global.e2eTestUtils
   ├─ .login()
   ├─ .logout()
   ├─ .fillField()
   ├─ .clickElement()
   ├─ .waitForElement()
   ├─ .takeScreenshot()
   └─ .checkAccessibility()
```

---

## 🧪 Test Writing Pattern

```
Before (scattered configs):
├─ Import from 5 different setup files
├─ Different test utilities per location
├─ Unclear which config is active
└─ High boilerplate

After (unified config):
├─ No imports needed
├─ Global utilities everywhere
├─ Single, clear configuration
└─ Minimal boilerplate

EXAMPLE:

// ✅ NEW (unified)
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BillCard } from './BillCard'

describe('BillCard', () => {
  it('renders', () => {
    const bill = global.testUtils.mockBill  // Global, no import!
    render(<BillCard bill={bill} />)
    expect(screen.getByText(bill.title)).toBeInTheDocument()
  })
})
```

---

## 📊 Before vs After Comparison

```
BEFORE (12+ configs, scattered):
├─ client/vitest.config.ts
├─ client/vitest.integration.config.ts
├─ client/vitest.performance.config.ts
├─ client/jest.a11y.config.js
├─ client/src/setupTests.ts
├─ client/src/test-utils/setup.ts
├─ client/src/test-utils/setup-integration.ts
├─ client/src/test-utils/setup-a11y.ts
├─ server/vitest.config.ts
├─ server/test-setup.ts
├─ vitest.setup.ts
└─ vitest.workspace.config.ts
└─ Result: Confusion, inconsistency, fragile ❌

AFTER (1 workspace + 7 coordinated setups):
├─ vitest.workspace.unified.ts (single source of truth)
└─ test-utils/setup/
   ├─ client.ts (coordinated)
   ├─ client-integration.ts (coordinated)
   ├─ client-a11y.ts (coordinated)
   ├─ server.ts (coordinated)
   ├─ server-integration.ts (coordinated)
   ├─ shared.ts (coordinated)
   └─ e2e.ts (coordinated)
└─ Result: Clarity, consistency, confidence ✅
```

---

## 🎯 Deployment Timeline

```
PHASE 1 ✅ COMPLETE (Configuration Unification)
├─ Duration: 2 days
├─ Status: Ready to deploy
└─ Deliverables:
   ├─ vitest.workspace.unified.ts
   ├─ test-utils/setup/* (7 files)
   └─ Documentation (3 files)

↓

PHASE 2 📋 PLANNED (Test Organization)
├─ Duration: 1-2 weeks
├─ Status: Can start after Phase 1 validation
└─ Goal: Colocate tests, standardize naming

↓

PHASE 3 📋 PLANNED (Jest Migration)
├─ Duration: 3-5 days
├─ Status: Ready after Phase 2
└─ Goal: 100% Vitest, remove Jest

↓

PHASE 4 📋 PLANNED (Performance Optimization)
├─ Duration: 1 week
├─ Status: Ready after Phase 3
└─ Goal: Sub-5-minute test runs
```

---

**Visual Architecture Version**: 1.0
**Last Updated**: December 6, 2024
**Status**: ✅ Phase 1 Complete - Ready for Deployment

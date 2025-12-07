# Testing Consolidation - Implementation Runbook

This runbook contains exact commands and step-by-step instructions for implementing the testing consolidation.

**Prerequisites:**
- [ ] Read `TESTING_ARCHITECTURE_ANALYSIS.md`
- [ ] Read `TESTING_CONSOLIDATION_ACTION_PLAN.md`
- [ ] Git branch created: `refactor/test-consolidation`
- [ ] Full test suite passes on current branch
- [ ] All changes committed to main branch

---

## PHASE 1: Setup File Consolidation

### Step 1.1: Create New Setup Structure

```bash
# Create the new setup module directory
mkdir -p tests/setup/modules

# Create client-specific setup module
cat > tests/setup/modules/client.ts << 'EOF'
/**
 * CLIENT-SPECIFIC TEST SETUP
 * 
 * Handles setup for client-side tests including:
 * - React component rendering
 * - Browser API mocks (matchMedia, ResizeObserver)
 * - Navigation test utilities
 * - Auth helpers
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Import existing client setup
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Cleanup after each test
afterEach(() => {
  cleanup();
});

export {};
EOF

# Create server-specific setup module
cat > tests/setup/modules/server.ts << 'EOF'
/**
 * SERVER-SPECIFIC TEST SETUP
 * 
 * Handles setup for server-side tests including:
 * - Database mocks
 * - Server environment configuration
 * - API mocking
 */

import { vi } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';

// Mock database if needed
vi.mock('../src/db', () => ({
  db: {
    query: vi.fn(),
    transaction: vi.fn(),
  },
}));

export {};
EOF

# Create shared module setup
cat > tests/setup/modules/shared.ts << 'EOF'
/**
 * SHARED MODULE TEST SETUP
 * 
 * Handles setup for shared module tests including:
 * - Form testing utilities
 * - Service mocks
 * - Data factories
 */

import { vi } from 'vitest';

// Add any shared module setup here
// This file is intentionally minimal as most setup happens
// in specific test files that use shared utilities

export {};
EOF
```

### Step 1.2: Create Central Setup Index

```bash
# Update tests/setup/index.ts to be the main entry point
cat > tests/setup/index.ts << 'EOF'
/**
 * MAIN TEST SETUP ENTRY POINT
 * 
 * This file coordinates all test setup for the entire workspace.
 * It's loaded by vitest.workspace.ts and ensures consistent
 * test environment across all modules.
 */

import { config } from 'vitest/config';

// Import module-specific setups
import './modules/client';
import './modules/server';
import './modules/shared';

// Export for vitest.workspace.ts
export const testSetup = {
  client: './modules/client.ts',
  server: './modules/server.ts',
  shared: './modules/shared.ts',
};

export {};
EOF
```

### Step 1.3: Update vitest.workspace.ts

```bash
# Backup original
cp vitest.workspace.ts vitest.workspace.ts.backup

# Update workspace configuration to use new setup structure
cat > vitest.workspace.ts << 'EOF'
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      globals: true,
      setupFiles: ['./tests/setup/modules/client.ts'],
      name: 'client',
      include: ['client/src/**/*.test.{ts,tsx}'],
    },
  },
  {
    test: {
      globals: true,
      setupFiles: ['./tests/setup/modules/server.ts'],
      name: 'server',
      include: ['server/**/*.test.{ts,tsx}'],
    },
  },
  {
    test: {
      globals: true,
      setupFiles: ['./tests/setup/modules/shared.ts'],
      name: 'shared',
      include: ['shared/**/*.test.{ts,tsx}', 'shared/**/*.test.ts'],
    },
  },
  {
    test: {
      globals: true,
      setupFiles: ['./tests/setup/index.ts'],
      name: 'integration',
      include: ['tests/integration/**/*.test.ts'],
    },
  },
]);
EOF
```

### Step 1.4: Verify Setup Works

```bash
# Run tests with new setup structure
npm test -- --run

# If tests pass, proceed to next step
# If tests fail, check error messages and debug
```

### Step 1.5: Remove Old Setup Files

```bash
# List old setup files
echo "Files to be deleted:"
ls -la client/setupTests.ts
ls -la client/src/setupTests.ts
ls -la server/test-setup.ts
ls -la shared/test-setup.ts

# Delete old setup files (only after tests pass!)
rm -f client/setupTests.ts
rm -f client/src/setupTests.ts
rm -f server/test-setup.ts
rm -f shared/test-setup.ts

# Verify they're gone
find . -type f \( -name "setupTests.ts" -o -name "test-setup.ts" \) ! -path "*/node_modules/*"
# Should return nothing
```

---

## PHASE 2: Test Utilities Consolidation

### Step 2.1: Create New Utilities Structure

```bash
# Create utilities directory structure
mkdir -p tests/utilities/client
mkdir -p tests/utilities/shared
mkdir -p tests/utilities/fixtures
mkdir -p tests/utilities/mocks

# Create main utilities index
cat > tests/utilities/index.ts << 'EOF'
/**
 * CENTRALIZED TEST UTILITIES INDEX
 * 
 * All test utilities are exported from this single point.
 * This ensures consistency and makes dependencies clear.
 */

// Client utilities
export * from './client';

// Shared utilities
export * from './shared';

// Fixtures
export * from './fixtures';

// Mocks
export * from './mocks';
EOF

# Create client utilities index (will re-export from migrated files)
cat > tests/utilities/client/index.ts << 'EOF'
/**
 * CLIENT TEST UTILITIES
 * 
 * Utilities for testing React components and client-side code.
 * Includes render helpers, navigation utilities, and auth helpers.
 */

export * from './render-with-providers';
export * from './navigation-helpers';
export * from './auth-helpers';

// Re-export from old comprehensive-test-setup if needed
export * from './comprehensive-test-setup';
EOF

# Create shared utilities index
cat > tests/utilities/shared/index.ts << 'EOF'
/**
 * SHARED TEST UTILITIES
 * 
 * Utilities for testing shared modules including:
 * - Form testing utilities
 * - Data factories
 * - Test helpers for services
 */

export * from './form-testing';
export * from './test-data-factory';
export * from './integration-tests';
EOF
```

### Step 2.2: Migrate Client Utilities

```bash
# Move client test utilities (preserve content)
cp -v client/src/test-utils/comprehensive-test-config.ts tests/utilities/client/
cp -v client/src/test-utils/comprehensive-test-setup.tsx tests/utilities/client/
cp -v client/src/test-utils/navigation-test-utils.tsx tests/utilities/client/navigation-helpers.tsx
cp -v client/src/test-utils/setup-a11y.ts tests/utilities/client/
cp -v client/src/test-utils/setup-integration.ts tests/utilities/client/
cp -v client/src/test-utils/setup-performance.ts tests/utilities/client/

# Create render-with-providers helper (commonly needed)
cat > tests/utilities/client/render-with-providers.tsx << 'EOF'
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
EOF

# Create auth helpers
cat > tests/utilities/client/auth-helpers.ts << 'EOF'
/**
 * AUTH TEST HELPERS
 * 
 * Utilities for testing authentication flows.
 * Migrated from client/src/components/auth/utils/test-utils.ts
 */

// Import from auth test utils and re-export
// (to be consolidated during migration)
export * from '../../../client/src/components/auth/utils/test-utils';
EOF
```

### Step 2.3: Migrate Shared Utilities

```bash
# Move shared/core/src/testing utilities to tests/utilities/shared
cp -v shared/core/src/testing/form/*.ts tests/utilities/shared/
cp -v shared/core/src/testing/test-data-factory.ts tests/utilities/shared/
cp -v shared/core/src/testing/integration-tests.ts tests/utilities/shared/
cp -v shared/core/src/testing/schema-agnostic-test-helper.ts tests/utilities/shared/

# Create form-testing consolidated index
cat > tests/utilities/shared/form-testing/index.ts << 'EOF'
/**
 * FORM TESTING UTILITIES
 * 
 * Consolidated form testing utilities including:
 * - Base form testing
 * - Testing Library form helpers
 * - Form data factories
 */

export * from './base-form-testing';
export * from './form-testing-utils';
export * from './testing-library-form-utils';
EOF

# Move form files
mkdir -p tests/utilities/shared/form-testing
cp -v shared/core/src/testing/form/* tests/utilities/shared/form-testing/
```

### Step 2.4: Update Imports Across Codebase

```bash
# Find and replace imports of test utilities
# PATTERN 1: client/src/test-utils
find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) ! -path "*/node_modules/*" -exec sed -i "s|from ['\"].*client/src/test-utils|from 'tests/utilities/client|g" {} \;

# PATTERN 2: client/src/shared/testing
find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) ! -path "*/node_modules/*" -exec sed -i "s|from ['\"].*client/src/shared/testing|from 'tests/utilities/client|g" {} \;

# PATTERN 3: shared/core/src/testing
find . -type f \( -name "*.test.ts" -o -name "*.test.tsx" \) ! -path "*/node_modules/*" -exec sed -i "s|from ['\"].*shared/core/src/testing|from 'tests/utilities/shared|g" {} \;

# Verify replacements
grep -r "from.*client/src/test-utils" . --include="*.test.ts" --include="*.test.tsx" | head -5
grep -r "from.*shared/core/src/testing" . --include="*.test.ts" --include="*.test.tsx" | head -5
```

### Step 2.5: Verify Tests Still Pass

```bash
# Run test suite with new utilities location
npm test -- --run

# Run specific module tests
npm test -- client --run
npm test -- server --run
npm test -- shared --run
```

### Step 2.6: Delete Old Utility Files

```bash
# Only delete after tests pass!

# Delete client utilities (old location)
rm -rf client/src/test-utils
rm -rf client/src/shared/testing

# Delete shared utilities (old location)
rm -rf shared/core/src/testing

# Verify deletion
find . -type d -name "test-utils" ! -path "*/node_modules/*"
find . -type d -name "testing" ! -path "*/node_modules/*" ! -path "*/docs/*"
```

---

## PHASE 3: Script Archival and Cleanup

### Step 3.1: Create Archive Directory

```bash
# Create archive structure
mkdir -p docs/archived-scripts
mkdir -p docs/archived-scripts/financial-disclosure
mkdir -p docs/archived-scripts/security
mkdir -p docs/archived-scripts/user-profile
mkdir -p docs/archived-scripts/transparency
mkdir -p docs/archived-scripts/bill-tracking
mkdir -p docs/archived-scripts/miscellaneous

# Create README for archive
cat > docs/archived-scripts/README.md << 'EOF'
# Archived Test Scripts

This directory contains test scripts that have been archived from `/scripts/testing/` as part of the testing consolidation effort.

## Archive Rationale

These scripts were archived because:
1. They were duplicate variants of the same functionality
2. They were manual test scripts not integrated into test infrastructure
3. They were HTML test pages no longer needed
4. They were superseded by proper unit/integration tests

## Structure

Each subdirectory contains scripts related to a specific feature:
- `financial-disclosure/` - Financial disclosure system tests
- `security/` - Security verification scripts
- `user-profile/` - User profile validation scripts
- `transparency/` - Transparency dashboard tests
- `bill-tracking/` - Bill tracking system tests
- `miscellaneous/` - Other archived scripts

## Restoration

To restore an archived script:
1. Locate the script in the appropriate subdirectory
2. Review the header comments to understand its purpose
3. Copy it back to `/scripts/testing/` if needed
4. Update references in package.json if it was a npm script

## Cleanup

If a script remains unused for more than 2 sprints after archival, it will be deleted permanently.
EOF
```

### Step 3.2: Identify Actively Used Scripts

```bash
# Find scripts referenced in package.json
echo "=== SCRIPTS REFERENCED IN package.json ===" 
grep -E "scripts.*test" package.json

# Expected output: "test:frontend-serving": "node scripts/testing/run-frontend-serving-tests.js"
```

### Step 3.3: Categorize and Archive

```bash
# HTML test files - clearly obsolete
mv scripts/testing/test-app.html docs/archived-scripts/miscellaneous/
mv scripts/testing/test-mobile-navigation.html docs/archived-scripts/miscellaneous/
mv scripts/testing/test-viewport.html docs/archived-scripts/miscellaneous/

# Financial disclosure duplicates
mv scripts/testing/test-financial-disclosure-simple.ts docs/archived-scripts/financial-disclosure/
mv scripts/testing/test-financial-disclosure-integration-unit.ts docs/archived-scripts/financial-disclosure/
# Keep: test-financial-disclosure-integration.ts (main one)

# Security duplicates
mv scripts/testing/test-security-simple.cjs docs/archived-scripts/security/
mv scripts/testing/test-security-simple.js docs/archived-scripts/security/
# Keep: test-security-standalone.ts or test-security-implementation.ts (pick one)

# User profile validation duplicates
mv scripts/testing/validate-user-profile.js docs/archived-scripts/user-profile/
mv scripts/testing/validate-user-profile-static.ts docs/archived-scripts/user-profile/
# Keep: validate-user-profile.ts (main one)

# Transparency scripts
mv scripts/testing/test-transparency-dashboard.ts docs/archived-scripts/transparency/
# Keep: test-transparency-implementation.ts

# Verify movement
ls scripts/testing/ | wc -l
# Should be reduced significantly
```

### Step 3.4: Add Headers to Archived Files

```bash
# Add archive header to each file
for file in docs/archived-scripts/**/*; do
  if [[ -f "$file" ]]; then
    # Check if file already has header (basic check)
    if ! head -1 "$file" | grep -q "ARCHIVED"; then
      # Create temp file with header
      temp=$(mktemp)
      echo "/**" > "$temp"
      echo " * ARCHIVED SCRIPT" >> "$temp"
      echo " * Reason: Consolidated during testing refactor" >> "$temp"
      echo " * Archive Date: $(date +%Y-%m-%d)" >> "$temp"
      echo " * Original Location: scripts/testing/$(basename $file)" >> "$temp"
      echo " */" >> "$temp"
      echo "" >> "$temp"
      cat "$file" >> "$temp"
      mv "$temp" "$file"
    fi
  fi
done
```

---

## PHASE 4: Cleanup Duplicate Files

### Step 4.1: Fix A/B Testing Duplicate

```bash
# Identify the duplicate
ls -la server/infrastructure/migration/ab-testing*

# Keep the one with .service.ts naming convention
# Delete the other
rm -f server/infrastructure/migration/ab-testing-service.ts

# Verify only one remains
ls -la server/infrastructure/migration/ab-testing*
```

### Step 4.2: Move Misplaced Test Files

```bash
# Move schema validation test to proper location (colocated)
mv server/services/schema-validation-test.ts server/services/schema-validation.test.ts

# Check for others
find . -type f -name "*-test.ts" ! -name "*.test.ts" ! -path "*/node_modules/*" ! -path "*/archived-scripts/*" ! -path "*/docs/*"
```

### Step 4.3: Delete Obsolete Test Pages

```bash
# Delete test pages that aren't unit tests
rm -f client/src/pages/design-system-test.tsx
rm -f root/test-imports.ts
rm -f root/test-connection.html

# Verify deletion
find . -type f \( -name "*-test.tsx" -o -name "test-*.html" \) ! -path "*/node_modules/*" ! -path "*/archived-scripts/*"
```

---

## PHASE 5: Verification & Testing

### Step 5.1: Run Full Test Suite

```bash
# Install dependencies if needed
npm install

# Run all tests
npm test -- --run

# Check for failures
# Expected: All tests pass
```

### Step 5.2: Check for Broken Imports

```bash
# Search for remaining references to old locations
echo "=== Checking for references to old test locations ==="
grep -r "from.*client/src/test-utils" . --include="*.ts" --include="*.tsx" ! -path "*/node_modules/*" 2>/dev/null | wc -l
# Expected: 0

grep -r "from.*client/src/shared/testing" . --include="*.ts" --include="*.tsx" ! -path "*/node_modules/*" 2>/dev/null | wc -l
# Expected: 0

grep -r "from.*shared/core/src/testing" . --include="*.ts" --include="*.tsx" ! -path "*/node_modules/*" 2>/dev/null | wc -l
# Expected: 0
```

### Step 5.3: Verify Structure

```bash
# Verify new structure exists
echo "=== NEW TEST STRUCTURE ==="
tree tests/setup/ 2>/dev/null || find tests/setup -type f
tree tests/utilities/ 2>/dev/null || find tests/utilities -type f
tree docs/archived-scripts 2>/dev/null || find docs/archived-scripts -type f | head -20

# Verify old directories are gone
echo "=== CHECKING OLD DIRECTORIES DELETED ==="
find . -type d \( -path "*/client/src/test-utils" -o -path "*/client/src/shared/testing" -o -path "*/shared/core/src/testing" \) ! -path "*/node_modules/*"
# Expected: Nothing found
```

### Step 5.4: Check for Circular Dependencies

```bash
# Use your build tool to check for circular dependencies
npm run build 2>&1 | grep -i "circular"
# Expected: No circular dependency warnings
```

---

## PHASE 6: Documentation

### Step 6.1: Create Testing Guidelines

```bash
# Create main testing guide
cat > docs/TESTING_GUIDELINES.md << 'EOF'
# Testing Guidelines

## Overview
This document outlines the testing architecture and conventions for this project.

## Test Organization

### Colocated Tests
Unit tests should be colocated with the code they test:
```
src/components/Button/Button.tsx
src/components/Button/Button.test.tsx

src/services/auth.service.ts
src/services/auth.service.test.ts
```

### Centralized Tests
- **Integration Tests**: `/tests/integration/`
- **E2E Tests**: `/tests/e2e/`
- **Performance Tests**: `/tests/performance/`

### Test Setup
- **Global Setup**: `/tests/setup/index.ts`
- **Module Setup**: `/tests/setup/modules/{client,server,shared}.ts`

### Test Utilities
All test utilities are exported from `/tests/utilities/`:
```typescript
// ✓ Correct
import { render } from 'tests/utilities/client';
import { createMockUser } from 'tests/utilities/shared';

// ✗ Wrong
import { render } from 'client/src/test-utils';
import { createMockUser } from 'shared/core/src/testing';
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific module
npm test -- client
npm test -- server
npm test -- shared

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

## Writing Tests

### Component Tests
```typescript
import { render, screen } from 'tests/utilities/client';
import Button from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### Service Tests
```typescript
import { describe, it, expect } from 'vitest';
import { UserService } from './user.service';

describe('UserService', () => {
  it('should create user', async () => {
    const service = new UserService();
    const user = await service.create({ name: 'John' });
    expect(user).toHaveProperty('id');
  });
});
```

## Test Utilities

### Client Utilities
- `render()` - Render React components with providers
- `navigation-helpers` - Navigation test helpers
- `auth-helpers` - Authentication mocking

### Shared Utilities
- `form-testing` - Form component testing
- `test-data-factory` - Generate test data
- `integration-tests` - Integration test helpers

## Naming Conventions

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `/tests/integration/*.test.ts`
- E2E tests: `/tests/e2e/*.test.ts`
- Test setup: `/tests/setup/modules/*.ts`

## Archived Scripts

Old manual test scripts are archived in `/docs/archived-scripts/`. 
See that directory for details on restoration if needed.
EOF

# Create testing architecture document
cat > docs/TESTING_ARCHITECTURE.md << 'EOF'
# Testing Architecture

(Copy content from TESTING_ARCHITECTURE_ANALYSIS.md)
EOF
```

### Step 6.2: Update Main README

```bash
# Add testing section to main README.md if not present
cat >> README.md << 'EOF'

## Testing

This project uses Vitest for unit testing and Testing Library for React component testing.

See [TESTING_GUIDELINES.md](docs/TESTING_GUIDELINES.md) for detailed information about:
- Test organization and structure
- Running tests
- Writing tests
- Test utilities

### Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific module tests
npm test -- client
```
EOF
```

---

## FINAL VERIFICATION CHECKLIST

Before committing, verify all items:

```bash
# 1. All tests pass
npm test -- --run
# Expected: All tests pass ✓

# 2. No broken imports
grep -r "from.*client/src/test-utils" . --include="*.ts" --include="*.tsx" ! -path "*/node_modules/*"
grep -r "from.*shared/core/src/testing" . --include="*.ts" --include="*.tsx" ! -path "*/node_modules/*"
# Expected: No results ✓

# 3. Old directories deleted
find . -type d \( -path "*/client/src/test-utils" -o -path "*/client/src/shared/testing" \) ! -path "*/node_modules/*"
# Expected: No results ✓

# 4. New structure exists
ls tests/setup/modules/client.ts
ls tests/setup/modules/server.ts
ls tests/utilities/index.ts
# Expected: All exist ✓

# 5. Documentation created
ls docs/TESTING_GUIDELINES.md
ls docs/archived-scripts/README.md
# Expected: Both exist ✓

# 6. No duplicate files
find server/infrastructure/migration -name "ab-testing*" | wc -l
# Expected: 1 ✓

# 7. scripts/testing reduced
ls scripts/testing | wc -l
# Expected: < 15 (down from 46) ✓

# 8. Git status clean
git status
# Expected: All changes intentional, no accidental files
```

---

## ROLLBACK PROCEDURE

If something goes wrong, rollback is simple:

```bash
# If at Phase 1 (Setup Consolidation)
cp vitest.workspace.ts.backup vitest.workspace.ts
git checkout -- tests/setup/

# If at Phase 2 (Utilities Consolidation)
git checkout -- tests/utilities/
git checkout -- client/src/test-utils client/src/shared/testing shared/core/src/testing

# If at Phase 3+ (Script Archival)
git checkout -- scripts/testing/
rm -rf docs/archived-scripts/

# Then reset
git reset --hard HEAD
```

---

## Success Indicators

After completing this runbook, you should see:

✅ Single test setup entry point at `/tests/setup/index.ts`
✅ All test utilities in `/tests/utilities/` with clear subdirectories
✅ No duplicate test setup files
✅ `/scripts/testing/` reduced from 46 to <15 files
✅ All tests passing
✅ No broken imports
✅ Clear testing documentation
✅ Archive of old scripts with rationale

**Estimated Total Time**: 4-6 hours
**Risk Level**: Medium (requires careful testing)
**Rollback**: Easy (git-based rollback available)

# Comprehensive Testing Suite

This directory contains the comprehensive testing suite for the Chanuka Client UI upgrade, implementing all requirements from task 33: "Comprehensive Testing Suite Enhancement".

## Overview

The testing suite provides 80%+ code coverage across multiple test types, ensuring the reliability, performance, accessibility, and visual consistency of the Chanuka civic engagement platform.

## Test Types

### 1. Unit Tests (`**/*.test.{ts,tsx}`)
- **Coverage Target:** 80%+ for all components and services
- **Location:** `src/__tests__/unit/`
- **Command:** `npm run test:unit`
- **Features:**
  - Component behavior testing
  - Service and utility function testing
  - State management testing
  - Error handling validation
  - Performance assertions

### 2. Integration Tests (`**/*.integration.test.{ts,tsx}`)
- **Coverage Target:** 70%+ for complete workflows
- **Location:** `src/__tests__/integration/`
- **Command:** `npm run test:integration`
- **Features:**
  - Complete user workflow testing
  - API interaction testing
  - Real-time feature validation
  - Cross-component integration
  - Error recovery workflows

### 3. End-to-End Tests (`**/*.e2e.test.ts`)
- **Location:** `src/__tests__/e2e/`
- **Command:** `npm run test:e2e`
- **Features:**
  - Critical user journey testing
  - Cross-browser compatibility
  - Real user interaction simulation
  - Performance measurement
  - Accessibility validation

### 4. Performance Tests (`**/*.performance.test.ts`)
- **Location:** `src/__tests__/performance/`
- **Command:** `npm run test:performance`
- **Features:**
  - Core Web Vitals measurement (LCP, FID, CLS)
  - Bundle size validation
  - Memory leak detection
  - Load testing simulation
  - Render performance optimization

### 5. Visual Regression Tests (`**/*.visual.test.ts`)
- **Location:** `src/__tests__/visual/`
- **Command:** `npm run test:visual`
- **Features:**
  - Cross-browser visual consistency
  - Responsive design validation
  - Theme and color variation testing
  - Component-level visual testing
  - Accessibility visual indicators

### 6. Accessibility Tests (`**/*.a11y.test.ts`)
- **Location:** `src/__tests__/accessibility/`
- **Command:** `npm run test:a11y`
- **Features:**
  - WCAG 2.1 AA compliance validation
  - Keyboard navigation testing
  - Screen reader compatibility
  - Color contrast verification
  - Touch target size validation

## Test Infrastructure

### Configuration Files
- `vitest.config.ts` - Unit test configuration
- `vitest.integration.config.ts` - Integration test configuration
- `vitest.performance.config.ts` - Performance test configuration
- `playwright.config.ts` - E2E test configuration
- `playwright.visual.config.ts` - Visual regression configuration
- `jest.a11y.config.js` - Accessibility test configuration

### Setup Files
- `test-utils/setup.ts` - Base test setup with polyfills
- `test-utils/setup-integration.ts` - Integration test setup with MSW
- `test-utils/setup-performance.ts` - Performance test utilities
- `test-utils/setup-a11y.ts` - Accessibility test configuration
- `test-utils/comprehensive-test-setup.ts` - Enhanced testing utilities

### Coverage Configuration
- `coverage/coverage-config.ts` - Coverage thresholds and reporting
- Global threshold: 80%+ for lines, functions, branches, statements
- Per-file thresholds for critical components (85-90%)
- Quality gates and performance budgets

## Running Tests

### Individual Test Types
```bash
# Unit tests with coverage
npm run test:unit

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# Performance tests
npm run test:performance

# Visual regression tests
npm run test:visual

# Accessibility tests
npm run test:a11y
```

### Comprehensive Test Suite
```bash
# Run all tests with consolidated reporting
npm run test:comprehensive

# CI/CD pipeline tests
npm run test:ci
```

### Interactive Testing
```bash
# Playwright UI mode for E2E tests
npm run test:e2e:ui

# Vitest UI mode for unit tests
npm run test -- --ui
```

## Test Utilities

### Mock Data Factories
- `MockDataFactory.createMockBill()` - Generate realistic bill data
- `MockDataFactory.createMockUser()` - Generate user profiles
- `MockDataFactory.createMockExpert()` - Generate expert profiles
- `MockDataFactory.createMockComment()` - Generate discussion data

### Accessibility Testing
- `AccessibilityTestUtils.testKeyboardNavigation()` - Keyboard testing
- `AccessibilityTestUtils.testAriaAttributes()` - ARIA validation
- `AccessibilityTestUtils.testColorContrast()` - Contrast checking
- `AccessibilityTestUtils.testScreenReaderAnnouncements()` - SR testing

### Performance Testing
- `performanceTestUtils.measureComponentPerformance()` - Render timing
- `performanceTestUtils.testCoreWebVitals()` - Web vitals validation
- `performanceTestUtils.simulateUserLoad()` - Load testing
- `performanceTestUtils.measureMemoryUsage()` - Memory monitoring

### Integration Testing
- `IntegrationTestUtils.simulateUserWorkflow()` - Multi-step workflows
- `IntegrationTestUtils.createMockWebSocket()` - Real-time testing
- `IntegrationTestUtils.createMockApiResponse()` - API mocking

### Visual Testing
- `VisualTestUtils.captureSnapshot()` - Component screenshots
- `VisualTestUtils.testResponsiveDesign()` - Viewport testing

## Coverage Reports

### Generated Reports
- `coverage/index.html` - Interactive HTML coverage report
- `coverage/lcov.info` - LCOV format for CI/CD integration
- `coverage/coverage-summary.json` - JSON summary for automation
- `test-results/comprehensive-test-report.html` - Consolidated report

### Coverage Thresholds
- **Global:** 80% minimum for all metrics
- **Critical Components:** 85-90% for core functionality
- **Services/Hooks:** 85-90% for business logic
- **Integration:** 70% for workflow coverage

## Quality Gates

### Minimum Requirements
- Unit tests: 100+ tests
- Integration tests: 20+ tests
- E2E tests: 15+ tests
- Performance tests: 10+ tests
- Accessibility tests: 25+ tests

### Performance Budgets
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1
- Bundle size: < 100KB main, < 50KB per chunk

### Accessibility Standards
- WCAG 2.1 AA compliance
- Color contrast: 4.5:1 minimum
- Touch targets: 44px minimum
- Keyboard navigation: Full support

## CI/CD Integration

### GitHub Actions Workflow
- `.github/workflows/comprehensive-testing.yml`
- Parallel test execution
- Artifact collection and reporting
- Quality gate enforcement
- PR comment integration

### Test Execution Matrix
- **Unit/Integration:** Ubuntu latest, Node 18
- **E2E/Visual:** Multi-browser (Chrome, Firefox, Safari)
- **Performance:** Isolated environment for consistent metrics
- **Accessibility:** Automated axe-core validation

## Best Practices

### Writing Tests
1. **Arrange-Act-Assert** pattern for clarity
2. **Descriptive test names** explaining behavior
3. **Mock external dependencies** for isolation
4. **Test error conditions** and edge cases
5. **Use realistic test data** from factories

### Performance Testing
1. **Warm-up runs** before measurements
2. **Multiple iterations** for statistical significance
3. **Consistent environment** for reliable metrics
4. **Memory cleanup** between tests
5. **Threshold validation** against budgets

### Accessibility Testing
1. **Automated + manual** testing approach
2. **Real assistive technology** validation
3. **Keyboard-only navigation** testing
4. **Screen reader compatibility** verification
5. **Color blindness simulation** testing

### Visual Testing
1. **Disable animations** for consistency
2. **Multiple viewport sizes** for responsiveness
3. **Cross-browser validation** for compatibility
4. **Theme variations** testing
5. **Component isolation** for focused testing

## Troubleshooting

### Common Issues
1. **Flaky tests:** Use proper waits and stable selectors
2. **Memory leaks:** Clean up subscriptions and timers
3. **Timeout errors:** Increase timeouts for slow operations
4. **Visual differences:** Update baselines after intentional changes
5. **Coverage gaps:** Add tests for uncovered branches

### Debug Commands
```bash
# Run specific test file
npm run test -- bills-dashboard.test.tsx

# Run tests in watch mode
npm run test -- --watch

# Debug with browser devtools
npm run test:e2e -- --debug

# Generate coverage report only
npm run test:unit -- --coverage --run
```

## Maintenance

### Regular Tasks
1. **Update test baselines** after UI changes
2. **Review coverage reports** for gaps
3. **Update performance budgets** as needed
4. **Refresh mock data** to match API changes
5. **Validate accessibility** with real users

### Dependency Updates
- Keep testing libraries updated for security
- Update browser versions for E2E tests
- Refresh accessibility testing tools
- Monitor performance testing accuracy

## Contributing

### Adding New Tests
1. Follow existing patterns and conventions
2. Add appropriate test categories and tags
3. Update coverage thresholds if needed
4. Document complex test scenarios
5. Ensure CI/CD pipeline compatibility

### Test Review Checklist
- [ ] Tests cover happy path and error cases
- [ ] Accessibility considerations included
- [ ] Performance implications considered
- [ ] Visual regression potential addressed
- [ ] Integration points validated
- [ ] Documentation updated

This comprehensive testing suite ensures the Chanuka platform meets the highest standards for reliability, performance, accessibility, and user experience across all supported browsers and devices.
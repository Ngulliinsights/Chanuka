# E2E Test Suite

Comprehensive end-to-end tests for all integrated features in the Chanuka platform.

## Overview

This test suite covers:
- Pretext Detection
- Recommendation Engine
- Argument Intelligence
- Constitutional Intelligence
- Advocacy Coordination
- Feature Flag Admin UI
- Integration Monitoring Dashboard

## Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# Run specific test file
npx playwright test pretext-detection.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium

# Run tests in headed mode (see browser)
npx playwright test --headed

# Debug tests
npx playwright test --debug
```

## Test Structure

### Fixtures (`fixtures.ts`)
Reusable test utilities:
- `authenticatedPage`: Pre-authenticated page for admin/user tests
- `a11yPage`: Page with accessibility testing tools injected

### Global Setup/Teardown
- `global-setup.ts`: Runs once before all tests (server readiness check)
- `global-teardown.ts`: Runs once after all tests (cleanup)

## Test Coverage

### Pretext Detection (`pretext-detection.spec.ts`)
- Navigation to pretext detection
- Display of pretext analysis
- Loading states
- Error handling
- Notifications
- Accessibility compliance

### Recommendation Engine (`recommendation-engine.spec.ts`)
- Dashboard recommendations widget
- Bill page recommendations
- Click tracking
- Loading states
- Empty state handling
- Performance (< 500ms load time)

### Argument Intelligence (`argument-intelligence.spec.ts`)
- Argument cluster display
- Sentiment heatmap
- Quality metrics
- Cluster filtering
- Argument search
- Position tracking
- Large dataset handling (10k+ arguments)
- Accessibility compliance

### Constitutional Intelligence (`constitutional-intelligence.spec.ts`)
- Constitutional analysis tab
- Rights impact assessment
- Precedent matches
- Conflict warnings
- PDF export
- JSON export
- Sharing functionality
- Performance (< 1s load time)
- Expert review workflow

### Advocacy Coordination (`advocacy-coordination.spec.ts`)
- Advocacy dashboard navigation
- Campaign display
- Campaign details
- Action cards
- Campaign joining
- Impact tracking
- Coalition builder
- Campaign sharing
- Analytics tracking
- Campaign creation
- Performance (< 2s load time)

### Feature Flag Admin (`feature-flags.spec.ts`)
- Flag list display
- Flag creation
- Flag editing
- Rollout percentage configuration
- User targeting
- A/B test configuration
- Analytics dashboard
- Flag deletion
- Accessibility compliance

### Monitoring Dashboard (`monitoring-dashboard.spec.ts`)
- Dashboard display
- Metrics visualization
- Health status
- Alert management
- Feature usage charts
- Performance metrics
- Error tracking
- Real-time updates (< 100ms)
- Metric filtering (by feature, time range)
- Data export
- Performance (< 2s load time)

## Performance Benchmarks

All tests include performance assertions based on requirements:

| Feature | Performance Target | Test Coverage |
|---------|-------------------|---------------|
| Recommendation Engine | < 500ms widget load | ✅ |
| Argument Intelligence | < 1s render time | ✅ |
| Constitutional Intelligence | < 1s page load | ✅ |
| Advocacy Coordination | < 2s dashboard load | ✅ |
| Monitoring Dashboard | < 2s dashboard load | ✅ |
| Monitoring Real-time | < 100ms update latency | ✅ |

## Accessibility Testing

Tests use `axe-playwright` for automated accessibility checks:
- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

## CI/CD Integration

Tests are configured to run in CI/CD pipelines:
- Automatic retries on failure (2 retries in CI)
- HTML, JSON, and JUnit reports
- Screenshot and video capture on failure
- Parallel execution disabled in CI for stability

## Browser Coverage

Tests run across multiple browsers:
- Chromium (Desktop)
- Firefox (Desktop)
- WebKit (Desktop Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)
- Microsoft Edge
- Google Chrome

## Best Practices

1. **Use data-testid attributes**: Prefer `data-testid` over text selectors for stability
2. **Wait for elements**: Always use `waitForSelector` for dynamic content
3. **Handle loading states**: Test loading indicators and transitions
4. **Test error scenarios**: Mock API failures and verify error handling
5. **Performance testing**: Include timing assertions for critical paths
6. **Accessibility**: Run axe checks on all major pages
7. **Mobile testing**: Verify responsive behavior on mobile viewports

## Troubleshooting

### Tests timing out
- Increase timeout in `playwright.config.ts`
- Check if dev server is running
- Verify network connectivity

### Flaky tests
- Add explicit waits for dynamic content
- Use `waitForLoadState('networkidle')`
- Avoid hard-coded timeouts

### Authentication issues
- Check `fixtures.ts` authentication logic
- Verify test user credentials
- Ensure session persistence

## Future Enhancements

- [ ] Visual regression testing
- [ ] API mocking for isolated tests
- [ ] Performance profiling integration
- [ ] Cross-browser screenshot comparison
- [ ] Automated test generation from user flows

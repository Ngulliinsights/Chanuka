# Bills Feature Test Suite

Comprehensive test suite for the Bills feature covering all layers from database to client.

## Test Structure

```
__tests__/
├── infrastructure/
│   └── data-sources/
│       ├── mock-bill-data-source.test.ts      # Unit tests for mock data source
│       ├── database-bill-data-source.test.ts  # Unit tests for database data source
│       └── bill-data-source-factory.test.ts   # Unit tests for factory pattern
├── application/
│   ├── bill-service.test.ts                   # Unit tests for bill service
│   └── bill-health.service.test.ts            # Unit tests for health service
├── integration/
│   └── bills-data-source-integration.test.ts  # Integration tests
├── e2e/
│   └── bills-api.e2e.test.ts                  # End-to-end API tests
├── test-runner.ts                             # Comprehensive test runner
├── vitest.config.ts                           # Test configuration
├── test-setup.ts                              # Global test setup
├── test-setup-each.ts                         # Per-test setup
└── README.md                                  # This file
```

## Test Categories

### Unit Tests
- **Mock Data Source**: Tests the mock data implementation
- **Database Data Source**: Tests database operations with mocked DB
- **Data Source Factory**: Tests intelligent fallback logic
- **Bill Service**: Tests caching, validation, and business logic
- **Health Service**: Tests monitoring and status reporting

### Integration Tests
- **Data Source Integration**: Tests the complete data source abstraction
- **Service Integration**: Tests service layer with real data sources
- **Cache Integration**: Tests caching behavior across operations

### End-to-End Tests
- **API E2E**: Tests complete HTTP API workflows
- **Performance E2E**: Tests system performance under load
- **Error Handling E2E**: Tests error scenarios end-to-end

## Running Tests

### All Tests
```bash
npm run test:bills
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:bills:unit

# Integration tests only
npm run test:bills:integration

# E2E tests only
npm run test:bills:e2e
```

### With Coverage
```bash
npm run test:bills:coverage
```

### Watch Mode
```bash
npm run test:bills:watch
```

### Specific Test Files
```bash
# Single test file
npx vitest run infrastructure/data-sources/mock-bill-data-source.test.ts

# Pattern matching
npx vitest run --reporter=verbose "**/*data-source*.test.ts"
```

## Test Configuration

### Coverage Thresholds
- **Global**: 80% (branches, functions, lines, statements)
- **Data Sources**: 90% (critical infrastructure)
- **Bill Service**: 85% (core business logic)

### Performance Benchmarks
- **Unit Tests**: < 50ms per test
- **Integration Tests**: < 200ms per test
- **E2E Tests**: < 2000ms per test

### Retry Policy
- **Unit Tests**: 2 retries
- **Integration Tests**: 2 retries
- **E2E Tests**: 3 retries (network dependent)

## Test Data

### Mock Data
The test suite uses realistic mock data that simulates:
- 3 sample bills with different statuses and categories
- Engagement metrics (views, comments, shares)
- Constitutional concerns and complexity scores
- Proper timestamps and relationships

### Test Utilities
Available in `test-setup.ts`:
- `testUtils.createMockBill()`: Create test bill data
- `testUtils.createMockDataSource()`: Create mock data source
- `testUtils.delay()`: Add delays for timing tests
- `testUtils.measurePerformance()`: Measure execution time

## Test Patterns

### Data Source Tests
```typescript
describe('DataSource', () => {
  let dataSource: DataSource;

  beforeEach(() => {
    dataSource = new DataSource();
  });

  it('should handle operation', async () => {
    const result = await dataSource.operation();
    expect(result).toBeDefined();
  });
});
```

### Service Tests with Mocks
```typescript
describe('Service', () => {
  let service: Service;
  let mockDataSource: MockDataSource;

  beforeEach(() => {
    mockDataSource = createMockDataSource();
    service = new Service(mockDataSource);
  });

  it('should use data source', async () => {
    mockDataSource.findById.mockResolvedValue(mockBill);
    
    const result = await service.getBill('id');
    
    expect(result).toEqual(mockBill);
    expect(mockDataSource.findById).toHaveBeenCalledWith('id');
  });
});
```

### Integration Tests
```typescript
describe('Integration', () => {
  it('should work end-to-end', async () => {
    const factory = BillDataSourceFactory.getInstance();
    factory.setDataSourceType('mock');
    
    const dataSource = await factory.getDataSource();
    const bills = await dataSource.findAll();
    
    expect(bills).toHaveLength(3);
  });
});
```

### E2E Tests
```typescript
describe('API E2E', () => {
  it('should handle HTTP request', async () => {
    const response = await request(app)
      .get('/api/bills')
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeInstanceOf(Array);
  });
});
```

## Debugging Tests

### Verbose Output
```bash
npx vitest run --reporter=verbose
```

### Debug Specific Test
```bash
npx vitest run --reporter=verbose "mock-bill-data-source.test.ts"
```

### Coverage Report
```bash
npm run test:bills:coverage
open coverage/index.html
```

### Performance Analysis
```bash
npm run test:bills:perf
```

## Continuous Integration

### GitHub Actions
```yaml
- name: Run Bills Tests
  run: |
    npm run test:bills:coverage
    npm run test:bills:e2e
```

### Quality Gates
- All tests must pass
- Coverage must be ≥ 80%
- No performance regressions
- E2E tests must pass in CI environment

## Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests focused and independent

### Mocking Strategy
- Mock external dependencies
- Use real implementations for integration tests
- Prefer dependency injection for testability
- Mock at the boundary (data sources, external APIs)

### Performance Testing
- Measure critical path performance
- Test with realistic data volumes
- Include concurrent request testing
- Monitor memory usage in long-running tests

### Error Testing
- Test all error conditions
- Verify error messages and codes
- Test error recovery mechanisms
- Include edge cases and boundary conditions

## Troubleshooting

### Common Issues

**Tests timing out**
- Increase timeout in vitest.config.ts
- Check for unresolved promises
- Verify mock implementations

**Coverage not meeting thresholds**
- Check excluded files in config
- Add tests for uncovered branches
- Review coverage report for gaps

**Flaky tests**
- Add proper cleanup in afterEach
- Avoid shared state between tests
- Use deterministic test data

**Mock issues**
- Verify mock implementations match interfaces
- Clear mocks between tests
- Check mock call expectations

### Getting Help
- Check test output for specific error messages
- Review coverage reports for missing tests
- Use verbose reporter for detailed information
- Check CI logs for environment-specific issues

## Contributing

When adding new tests:
1. Follow existing patterns and structure
2. Add appropriate test categories (unit/integration/e2e)
3. Update coverage thresholds if needed
4. Document any new test utilities
5. Ensure tests are deterministic and fast
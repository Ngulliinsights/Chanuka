# API Integration Tests

This directory contains comprehensive integration tests for the legislative tracking API.

## Test Structure

### Integration Tests (`integration/`)
- **api-integration.test.ts**: Comprehensive API endpoint testing
  - Authentication flow testing
  - Bills API testing with pagination, filtering, and search
  - Sponsors API testing with relationships and transparency
  - Financial Disclosure API testing with monitoring features
  - Cross-API integration testing
  - Security testing (XSS, SQL injection prevention)
  - Error handling validation
  - Data validation testing

### Performance Tests (`performance/`)
- **api-performance.test.ts**: Performance and load testing
  - Response time benchmarks
  - Concurrent request handling
  - Memory usage monitoring
  - Database query performance
  - Cache effectiveness testing
  - Stress testing with mixed operations

### Test Utilities (`utils/`)
- **test-helpers.ts**: Reusable test utilities and helpers
  - Test user creation and authentication
  - API response validation
  - Performance measurement tools
  - Memory monitoring utilities
  - Test data generators
  - Cleanup utilities

## Running Tests

### All Tests
```bash
npm test
```

### Integration Tests Only
```bash
npm run test:integration
```

### Performance Tests Only
```bash
npm run test:performance
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

## Test Configuration

### Environment Variables
- `NODE_ENV=test` - Set automatically during tests
- `DATABASE_URL` - Database connection for tests
- `TEST_DATABASE_URL` - Dedicated test database (optional)
- `JWT_SECRET` - JWT secret for authentication tests
- `DEBUG_TESTS=true` - Enable console output during tests

### Jest Configuration
- **Timeout**: 30 seconds for integration tests
- **Environment**: Node.js
- **Module Type**: ESM with TypeScript
- **Coverage**: Excludes test files and type definitions
- **Setup**: Automatic test environment setup

## Test Features

### Comprehensive API Coverage
- ✅ Authentication (register, login, verify, logout)
- ✅ Bills API (CRUD, search, pagination, categories, statuses)
- ✅ Sponsors API (details, affiliations, transparency)
- ✅ Financial Disclosure API (monitoring, alerts, dashboard)
- ✅ Cross-API integration and consistency

### Security Testing
- ✅ XSS prevention validation
- ✅ SQL injection protection
- ✅ Input sanitization
- ✅ Authentication requirement testing
- ✅ Rate limiting behavior

### Performance Testing
- ✅ Response time benchmarks (< 2s for most endpoints)
- ✅ Concurrent request handling (10+ simultaneous)
- ✅ Memory leak detection
- ✅ Database query optimization
- ✅ Cache effectiveness measurement
- ✅ Stress testing with mixed operations

### Error Handling
- ✅ 404 handling for non-existent resources
- ✅ 400 validation error responses
- ✅ 401 authentication failures
- ✅ 500 server error graceful handling
- ✅ Malformed request handling

### Data Validation
- ✅ Email format validation
- ✅ Password strength requirements
- ✅ Numeric ID validation
- ✅ Required field validation
- ✅ Data type validation

## Test Patterns

### Response Validation
All API responses are validated for consistent structure:
```typescript
{
  success: boolean,
  data: any,
  metadata: {
    timestamp: string,
    responseTime: number,
    source: string
  }
}
```

### Error Response Validation
Error responses follow consistent format:
```typescript
{
  success: false,
  error: string,
  metadata: {
    timestamp: string,
    responseTime: number,
    source: string
  }
}
```

### Authentication Testing
- User registration and login flows
- Token generation and validation
- Protected endpoint access
- Token expiration handling

### Pagination Testing
- Page and limit parameter validation
- Total count accuracy
- Navigation metadata
- Edge case handling (empty results, invalid pages)

## Performance Benchmarks

### Response Time Targets
- **Authentication**: < 1.5 seconds
- **Bills API**: < 2 seconds
- **Sponsors API**: < 2 seconds
- **Financial Disclosure**: < 3 seconds
- **Error Responses**: < 0.5 seconds

### Concurrency Targets
- **10 concurrent requests**: All succeed
- **50 sequential requests**: Average < 500ms
- **Mixed operations**: Complete within 5 seconds

### Memory Usage
- **Memory leaks**: < 50MB increase over 100 requests
- **Large payloads**: < 100MB memory increase
- **Garbage collection**: Effective cleanup

## Test Data Management

### Mock Data
- Sample bills with realistic content
- Test users with different roles
- Mock sponsors with affiliations
- Financial disclosure test data

### Data Cleanup
- Automatic cleanup after test completion
- Isolated test environments
- No persistent test data pollution

### Test Isolation
- Each test runs independently
- No shared state between tests
- Clean database state for each test suite

## Debugging Tests

### Enable Debug Output
```bash
DEBUG_TESTS=true npm test
```

### Run Specific Test
```bash
npm test -- --testNamePattern="should handle authentication"
```

### Run Single Test File
```bash
npm test server/tests/integration/api-integration.test.ts
```

### Coverage Report
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Common Issues and Solutions

### Database Connection Issues
- Ensure `DATABASE_URL` is set correctly
- Check database server is running
- Verify test database permissions

### Authentication Failures
- Check `JWT_SECRET` environment variable
- Verify user creation in test setup
- Ensure proper token format in requests

### Performance Test Failures
- Increase timeout for slow environments
- Check system resources during tests
- Verify database query optimization

### Memory Test Issues
- Enable garbage collection with `--expose-gc`
- Monitor system memory during tests
- Check for proper cleanup in test teardown

## Contributing

### Adding New Tests
1. Follow existing test patterns
2. Use test helpers for common operations
3. Include both positive and negative test cases
4. Add performance considerations
5. Update documentation

### Test Naming Convention
- Describe what the test validates
- Use "should" statements
- Be specific about expected behavior
- Group related tests in describe blocks

### Best Practices
- Keep tests independent and isolated
- Use meaningful test data
- Test edge cases and error conditions
- Include performance and security testing
- Maintain test documentation
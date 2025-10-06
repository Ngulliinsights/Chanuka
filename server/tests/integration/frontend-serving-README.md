# Frontend Serving Integration Tests

This directory contains comprehensive integration tests for the frontend serving functionality of the Chanuka Legislative Transparency Platform. These tests verify that the frontend is properly served, React application initializes correctly, API communication works as expected, and complete user flows function properly.

## Test Structure

### Server Integration Tests (`frontend-serving.test.ts`)

Tests the server-side configuration and Vite integration:

- **Server Configuration and Vite Integration**
  - Vite development server setup
  - Asset request handling
  - CORS configuration
  - Error handling for Vite setup failures

- **Production Static File Serving**
  - Static file serving in production mode
  - SPA routing fallback
  - Cache headers for static assets

- **Error Handling and Recovery**
  - Missing template file handling
  - Transform errors in development
  - Request timeout handling
  - Different error type responses

- **Development Server Features**
  - Development debugging information
  - HMR WebSocket connections
  - Module invalidation information

- **Performance and Optimization**
  - Response time measurement
  - Concurrent request handling
  - Response compression

### Client Integration Tests

Located in `client/src/__tests__/integration/`:

#### React Initialization Tests (`react-initialization.test.tsx`)

Tests React application bootstrap and initialization:

- **DOM Readiness and Validation**
  - DOM readiness checks
  - Environment validation
  - Root element configuration

- **React Application Mounting**
  - Successful React mounting
  - Error handling during mounting
  - Loading states
  - Component lazy loading

- **Error Boundary Integration**
  - Component error catching
  - Error recovery mechanisms

- **Browser Compatibility and Polyfills**
  - Browser compatibility manager
  - Polyfill loading
  - Compatibility warnings

- **Asset Loading and Performance**
  - Critical asset preloading
  - Asset loading failure handling
  - Performance monitoring

- **Service Worker Registration**
  - Production service worker registration
  - Development mode skipping

- **Development Mode Features**
  - Development error recovery
  - Debug utilities

#### API Communication Tests (`api-communication.test.tsx`)

Tests frontend-backend API communication:

- **API Client Configuration**
  - Base URL configuration
  - Timeout configuration
  - Retry mechanism

- **Request/Response Handling**
  - Successful API responses
  - Error response handling
  - Network error handling
  - JSON parsing errors

- **CORS Configuration**
  - Preflight request handling
  - CORS error handling
  - Credential inclusion

- **Authentication Integration**
  - Authentication header inclusion
  - Authentication error handling
  - Token refresh

- **Error Handling and Recovery**
  - Error categorization
  - Retryable error determination
  - Fallback data provision
  - Component error handling

- **Real-time Communication**
  - WebSocket connection establishment
  - Connection error handling
  - Real-time data updates

- **Performance and Caching**
  - Response caching
  - Cache invalidation
  - Concurrent request handling
  - Request deduplication

#### End-to-End Flow Tests (`end-to-end-flows.test.tsx`)

Tests complete user workflows:

- **Application Loading and Navigation**
  - Initial application loading
  - Page navigation
  - 404 page handling

- **Dashboard Data Loading**
  - Loading state display
  - Data loading completion

- **Bills Search and Filter**
  - Search functionality
  - Filter operations
  - Bill detail viewing

- **Authentication Flow**
  - Unauthenticated access handling
  - Login process
  - Logout process

- **Error Handling and Recovery**
  - Network error handling
  - Component error boundaries
  - Browser navigation

- **Performance and Loading States**
  - Loading state management
  - Concurrent navigation

- **Accessibility and User Experience**
  - Focus management
  - ARIA labels and roles
  - Keyboard navigation

## Running the Tests

### Run All Frontend Serving Tests

```bash
npm run test:frontend-serving
```

This runs both server and client integration tests and generates a comprehensive report.

### Run Server Tests Only

```bash
npm run test:frontend-serving:server
```

### Run Client Tests Only

```bash
npm run test:frontend-serving:client
```

### Run Individual Test Files

```bash
# Server integration tests
npm run test:integration -- --testPathPattern=frontend-serving

# React initialization tests
npm run test:client -- client/src/__tests__/integration/react-initialization.test.tsx

# API communication tests
npm run test:client -- client/src/__tests__/integration/api-communication.test.tsx

# End-to-end flow tests
npm run test:client -- client/src/__tests__/integration/end-to-end-flows.test.tsx
```

## Test Configuration

### Server Tests (Jest)

- Configuration: `jest.config.js`
- Environment: Node.js
- Test timeout: 30 seconds
- Setup file: `server/tests/setup.ts`

### Client Tests (Vitest)

- Configuration: `vitest.config.ts`
- Environment: jsdom
- Setup file: `client/src/setupTests.ts`
- UI testing: @testing-library/react

## Requirements Coverage

These tests verify the following requirements from the specification:

### Requirement 1: Frontend Asset Serving
- **1.1**: React application serves successfully ✅
- **1.2**: CSS and JavaScript assets load without 404 errors ✅
- **1.3**: Vite development server integrates with Express ✅
- **1.4**: Static assets served with correct MIME types ✅

### Requirement 2: React Application Initialization
- **2.1**: React application mounts successfully ✅
- **2.2**: Core components render without errors ✅

### Requirement 3: API Integration Functionality
- **3.1**: Frontend makes successful API requests ✅
- **3.2**: API responses processed correctly ✅

## Test Reports

Test results are saved to `test-results/frontend-serving-integration-report.json` with:

- Test execution summary
- Individual test results
- Performance metrics
- Error details for failed tests

## Troubleshooting

### Common Issues

1. **Port conflicts**: Tests use port 4201 for testing. Ensure it's available.
2. **Timeout errors**: Increase timeout in test configuration if needed.
3. **Mock failures**: Ensure all required mocks are properly configured.
4. **Environment variables**: Check that test environment variables are set correctly.

### Debug Mode

Enable debug output:

```bash
DEBUG_TESTS=true npm run test:frontend-serving
```

### Verbose Output

For detailed test output:

```bash
npm run test:frontend-serving:server -- --verbose
npm run test:frontend-serving:client -- --reporter=verbose
```

## Contributing

When adding new frontend serving functionality:

1. Add corresponding integration tests
2. Update this README with new test descriptions
3. Ensure tests cover both success and failure scenarios
4. Include performance and accessibility considerations
5. Update requirements coverage section

## Dependencies

### Server Tests
- Jest
- Supertest
- Express
- HTTP server utilities

### Client Tests
- Vitest
- @testing-library/react
- @testing-library/user-event
- @testing-library/jest-dom
- jsdom

### Shared
- Node.js testing utilities
- Mock implementations
- Test data generators
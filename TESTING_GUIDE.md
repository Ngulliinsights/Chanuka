# Testing Guide - Separated Backend & Frontend

This project has been configured with separate testing environments for backend/database and frontend concerns.

## Backend & Database Testing (Your Focus)

### Quick Start
```bash
# Run all backend tests
npm run test:backend

# Watch mode for development
npm run test:backend:watch

# Coverage report
npm run test:backend:coverage

# Database-specific tests
npm run test:database

# Performance tests
npm run test:backend:performance

# Integration tests
npm run test:backend:integration
```

### Configuration
- **Config File**: `jest.backend.config.js`
- **Test Framework**: Jest with ts-jest
- **Coverage Directory**: `coverage/backend/`
- **Test Locations**: 
  - `server/**/*.test.ts`
  - `server/**/*.spec.ts`
  - `db/**/*.test.ts`
  - `db/**/*.spec.ts`

### What You Should Focus On
- API endpoint testing
- Database operations and migrations
- Authentication and authorization
- Business logic validation
- Performance testing
- Integration testing between services
- Error handling and edge cases

## Frontend Testing (Other Team's Focus)

### Quick Start
```bash
# Run all frontend tests
npm run test:frontend

# Watch mode for development
npm run test:frontend:watch

# Interactive UI
npm run test:frontend:ui

# Coverage report
npm run test:frontend:coverage
```

### Configuration
- **Config File**: `vitest.frontend.config.ts`
- **Test Framework**: Vitest with React Testing Library
- **Coverage Directory**: `coverage/frontend/`
- **Test Locations**: 
  - `client/**/*.test.ts`
  - `client/**/*.test.tsx`
  - `client/**/*.spec.ts`
  - `client/**/*.spec.tsx`

### What Frontend Team Should Focus On
- Component rendering and behavior
- User interactions and events
- State management
- Routing
- UI/UX functionality
- Accessibility testing
- Visual regression testing

## Running All Tests
```bash
# Run both backend and frontend tests
npm test
```

## Test Organization

### Backend Test Structure
```
server/
├── tests/
│   ├── unit/           # Unit tests for individual functions
│   ├── integration/    # Integration tests for API endpoints
│   ├── performance/    # Performance and load tests
│   ├── services/       # Service layer tests
│   └── features/       # Feature-specific tests
└── **/*.test.ts        # Co-located tests with source files

db/
└── **/*.test.ts        # Database migration and seed tests
```

### Frontend Test Structure
```
client/src/
├── __tests__/          # Global frontend tests
├── components/
│   └── **/*.test.tsx   # Component tests
├── hooks/
│   └── **/*.test.ts    # Custom hook tests
├── pages/
│   └── **/*.test.tsx   # Page component tests
└── utils/
    └── **/*.test.ts    # Utility function tests
```

## Coverage Reports
- Backend coverage: `coverage/backend/index.html`
- Frontend coverage: `coverage/frontend/index.html`

## Best Practices

### Backend Testing
- Use `supertest` for API endpoint testing
- Mock external services and APIs
- Test database transactions and rollbacks
- Include error scenarios and edge cases
- Test authentication and authorization flows

### Frontend Testing
- Test user interactions, not implementation details
- Use `screen` queries from React Testing Library
- Mock API calls and external dependencies
- Test accessibility with `@testing-library/jest-dom`
- Focus on user-facing functionality

## Continuous Integration
Both test suites can run independently in CI/CD pipelines, allowing for:
- Parallel execution
- Independent deployment gates
- Separate coverage requirements
- Team-specific test responsibilities
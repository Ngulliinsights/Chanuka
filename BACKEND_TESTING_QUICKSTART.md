# Backend Testing Quick Reference

## Your Focus: Backend & Database Testing

### Essential Commands
```bash
# Start backend testing in watch mode (recommended for development)
npm run test:backend:watch

# Run all backend tests once
npm run test:backend

# Generate coverage report
npm run test:backend:coverage

# Run only database tests
npm run test:database

# Run performance tests
npm run test:backend:performance
```

### Quick Test Script
```bash
# Use the helper script for easier commands
node scripts/test-backend-only.js watch    # Watch mode
node scripts/test-backend-only.js coverage # Coverage
node scripts/test-backend-only.js help     # See all options
```

### Test File Locations
- `server/tests/` - Main test directory
- `server/**/*.test.ts` - Co-located tests
- `db/**/*.test.ts` - Database tests

### Coverage Reports
- View at: `coverage/backend/index.html`
- Focus on server-side code coverage

### What NOT to Worry About
- Frontend tests (handled by other team)
- Client-side components
- UI interactions
- Browser testing

### Key Testing Areas for You
1. **API Endpoints** - Request/response validation
2. **Database Operations** - CRUD, migrations, transactions
3. **Authentication** - Login, JWT, permissions
4. **Business Logic** - Core application rules
5. **Error Handling** - Edge cases and failures
6. **Performance** - Load testing, query optimization
7. **Integration** - Service-to-service communication

### Test Structure Example
```typescript
// server/features/users/users.test.ts
describe('User Service', () => {
  beforeEach(async () => {
    // Setup test database
  });

  it('should create user with valid data', async () => {
    // Test implementation
  });

  it('should handle duplicate email error', async () => {
    // Error case testing
  });
});
```

### Debugging Tips
- Use `console.log` in tests for debugging
- Check `server/tests/setup.ts` for test configuration
- Database tests should clean up after themselves
- Use `--runInBand` to avoid race conditions
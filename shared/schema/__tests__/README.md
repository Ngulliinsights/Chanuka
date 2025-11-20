# Kenya Legislative Platform - Test Suite

## Overview

This comprehensive test suite validates the reorganized database schema for the Kenya Legislative Platform. The tests ensure data integrity, relationship correctness, performance, and functionality across all 9 schema domains.

## Test Structure

### Test Framework
- **Test Runner**: Jest with TypeScript support
- **Database**: PostgreSQL test database with cleanup utilities
- **ORM**: Drizzle ORM for database operations
- **Test Data**: Automated test data generators for all entities

### Test Organization

#### Core Test Files
1. **`setup.ts`** - Test framework configuration and utilities
2. **`foundation.test.ts`** - Core legislative entities (users, sponsors, bills, committees)
3. **`citizen_participation.test.ts`** - Public interaction layer (comments, votes, engagement)
4. **`parliamentary_process.test.ts`** - Legislative workflows (amendments, readings, votes)
5. **`constitutional_intelligence.test.ts`** - Legal analysis infrastructure
6. **`run_tests.ts`** - Master test runner and configuration

#### Additional Test Files ✅
7. **`argument_intelligence.test.ts`** - Argument synthesis and brief generation
8. **`advocacy_coordination.test.ts`** - Campaign and action item tracking
9. **`universal_access.test.ts`** - Offline engagement and USSD
10. **`integrity_operations.test.ts`** - Moderation and security
11. **`platform_operations.test.ts`** - Analytics and metrics
12. **`transparency_analysis.test.ts`** - Corporate influence and lobbying tracking
13. **`impact_measurement.test.ts`** - Outcome analysis and success stories
14. **`integration.test.ts`** - Cross-schema relationship tests (To be created)
15. **`performance.test.ts`** - Load testing and optimization (To be created)

## Test Coverage

### Foundation Schema Tests ✅
**15+ Test Cases**
- User creation and authentication
- Sponsor profiles and political affiliations
- Bill lifecycle tracking
- Committee assignments and membership
- Parliamentary sessions and sittings
- Foreign key relationships and constraints

**Key Test Areas:**
- Unique constraints (email, bill numbers)
- Geographic hierarchy (County → Constituency → Ward)
- Role-based access control
- Engagement metrics tracking
- Performance with high-volume data

### Citizen Participation Schema Tests ✅
**20+ Test Cases**
- Comment creation and threading
- Voting systems (comments and bills)
- Engagement tracking and analytics
- Notification preferences
- Alert systems and delivery

**Key Test Areas:**
- Moderation workflows
- Public vs private voting
- Geographic filtering
- Session management
- Real-time engagement metrics

### Parliamentary Process Schema Tests ✅
**25+ Test Cases**
- Bill committee assignments
- Amendment tracking and voting
- Version control and history
- Parliamentary readings
- Voting records and outcomes
- Public participation events

**Key Test Areas:**
- Amendment adoption workflows
- Public hearing scheduling
- Submission processing
- Cosponsor tracking
- Complete bill lifecycle

### Constitutional Intelligence Schema Tests ✅
**30+ Test Cases**
- Constitutional provision hierarchy
- Bill-constitution analysis
- Legal precedent integration
- Expert review workflows
- Audit trail tracking

**Key Test Areas:**
- Hierarchical provision structure
- AI analysis with human oversight
- Confidence scoring
- Risk assessment
- Legal precedent linking

### Transparency Analysis Schema Tests ✅
**35+ Test Cases**
- Corporate entity tracking and verification
- Financial interest disclosure and conflict detection
- Lobbying activity monitoring and expenditure tracking
- Cross-sector ownership relationship mapping
- Regulatory capture indicator analysis

**Key Test Areas:**
- Corporate ownership chain tracking
- Financial conflict identification
- Lobbying expenditure validation
- Multi-hop relationship queries
- Risk assessment algorithms

### Impact Measurement Schema Tests ✅
**30+ Test Cases**
- Participation cohort analysis and demographic tracking
- Legislative outcome correlation with public engagement
- Attribution assessment with statistical rigor
- Success story documentation and verification
- Equity metrics and digital divide analysis

**Key Test Areas:**
- Cohort behavior pattern analysis
- Causal inference methodologies
- Statistical significance validation
- Geographic and demographic equity measurement
- Long-term impact tracking

## Running Tests

### Prerequisites
```bash
# Install dependencies
npm install

# Set up test database
export TEST_DB_HOST=localhost
export TEST_DB_PORT=5433
export TEST_DB_NAME=kenya_legislative_test
export TEST_DB_USER=test_user
export TEST_DB_PASSWORD=test_password
```

### Run All Tests
```bash
# Run complete test suite
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/foundation.test.ts

# Run with verbose output
npm test -- --verbose
```

### Development Mode
```bash
# Watch mode for continuous testing
npm run test:watch

# Run tests in specific environment
NODE_ENV=test npm test
```

## Test Categories

### 1. Unit Tests
- Individual table operations
- Constraint validation
- Default value handling
- Data type validation

### 2. Integration Tests
- Cross-table relationships
- Foreign key constraints
- Cascade operations
- Transaction handling

### 3. Performance Tests
- High-volume data insertion
- Complex query optimization
- Index utilization
- Concurrent operations

### 4. Security Tests
- Access control validation
- Data privacy compliance
- Audit trail integrity
- Permission boundaries

### 5. Edge Case Tests
- Null value handling
- Empty collections
- Invalid data rejection
- Error message validation

## Test Data Strategy

### Test Data Generators
The test suite includes comprehensive data generators that create:
- **Users**: Citizens, experts, moderators with varied profiles
- **Sponsors**: MPs, Senators, MCAs with political affiliations
- **Bills**: Complete legislative content with metadata
- **Comments**: Constructive feedback with positions and sentiment
- **Constitutional Provisions**: Hierarchical structure mirroring Kenya's constitution
- **Legal Precedents**: Court cases with interpretations

### Data Variations
- **Geographic**: All 47 Kenyan counties
- **Political**: Major parties and independent candidates
- **Demographic**: Diverse age groups, professions, backgrounds
- **Temporal**: Various dates and time periods
- **Content**: Realistic legislative and civic engagement content

## Performance Benchmarks

### Test Execution Times
- **Foundation Schema**: < 2 seconds for 15+ tests
- **Citizen Participation**: < 3 seconds for 20+ tests
- **Parliamentary Process**: < 4 seconds for 25+ tests
- **Constitutional Intelligence**: < 5 seconds for 30+ tests

### Database Performance
- **Insert Operations**: 1000 records < 3 seconds
- **Complex Queries**: Multi-table joins < 500ms
- **Aggregation Queries**: Large dataset analysis < 1 second
- **Concurrent Operations**: 10 simultaneous connections supported

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Schema Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        ports: ['5433:5432']
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Quality Gates
- **Test Coverage**: Minimum 90% coverage required
- **Performance**: All tests must complete within time limits
- **Security**: No vulnerabilities in dependencies
- **Style**: Code formatting and TypeScript compliance

## Debugging and Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running on correct port
2. **Schema Conflicts**: Clear test database before running tests
3. **Permission Errors**: Check database user permissions
4. **Test Timeouts**: Increase timeout for complex operations

### Debug Commands
```bash
# Run tests with debug output
DEBUG=test:* npm test

# Run specific test with verbose output
npm test -- --verbose tests/foundation.test.ts

# Generate test coverage report
npm run test:coverage
```

### Test Isolation
Each test suite:
- Creates its own test data
- Cleans up after execution
- Runs in transaction when possible
- Uses unique identifiers to prevent conflicts

## Future Enhancements

### Planned Test Coverage
- **Argument Intelligence**: Natural language processing validation
- **Advocacy Coordination**: Campaign workflow testing
- **Universal Access**: Offline and mobile engagement testing
- **Integrity Operations**: Security and moderation testing
- **Platform Operations**: Analytics and performance testing

### Advanced Testing
- **Load Testing**: Simulating production traffic
- **Chaos Testing**: Database failure scenarios
- **Security Testing**: Penetration testing and vulnerability scanning
- **Integration Testing**: End-to-end workflow validation

## Contributing

### Adding New Tests
1. Create test file in `tests/` directory
2. Import required schemas and utilities
3. Follow existing test patterns and conventions
4. Add comprehensive test cases for all functionality
5. Include performance and edge case tests

### Test Guidelines
- **Descriptive Names**: Test names should explain what is being tested
- **Arrange-Act-Assert**: Follow AAA pattern for test structure
- **Single Responsibility**: Each test should verify one specific behavior
- **Independent Tests**: Tests should not depend on execution order
- **Meaningful Assertions**: Assert on business logic, not implementation details

## Conclusion

This test suite provides comprehensive validation of the Kenya Legislative Platform's reorganized schema architecture. The tests ensure that the platform can handle the complex requirements of democratic engagement while maintaining data integrity, performance, and security.

The modular test organization allows for independent development and testing of each domain while ensuring seamless integration across the entire platform. This testing infrastructure supports the platform's evolution from basic legislative tracking to comprehensive democratic engagement infrastructure.


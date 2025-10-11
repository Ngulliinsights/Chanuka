# Analytics Module Code Review Checklist

## General Checks

- [ ] **TypeScript Compilation**: `npm run type-check` passes without errors
- [ ] **Tests Pass**: `npm test` passes all tests including new ones
- [ ] **No Console Statements**: No `console.log`, `console.error`, etc. (use logger instead)
- [ ] **Code Formatting**: `npm run format` produces no changes
- [ ] **Linting**: `npm run lint` passes without warnings or errors
- [ ] **Dependencies**: No unnecessary dependencies added
- [ ] **Security**: No sensitive data logging or exposure

## Route-Specific Checks

- [ ] **Thin Controllers**: Routes contain only request/response handling, no business logic
- [ ] **Middleware Applied**: All analytics routes use `analyticsContextMiddleware` and `performanceTrackingMiddleware`
- [ ] **Controller Wrapper**: Complex routes use `controllerWrapper` for validation and error handling
- [ ] **Authentication**: Protected routes require appropriate authentication
- [ ] **Authorization**: Admin-only routes check user roles properly
- [ ] **Input Validation**: All route parameters validated using Zod schemas
- [ ] **Error Handling**: Routes handle errors gracefully with appropriate HTTP status codes

## Controller-Specific Checks

- [ ] **Schema Validation**: Zod schemas used for all input validation
- [ ] **Type Safety**: Controller methods have proper TypeScript types
- [ ] **Error Translation**: Domain errors translated to appropriate HTTP responses
- [ ] **No Storage Access**: Controllers only call services, never access storage directly
- [ ] **No Business Logic**: Controllers focus on HTTP concerns only
- [ ] **JSDoc Comments**: Public methods documented with JSDoc
- [ ] **Input Sanitization**: User inputs properly sanitized and validated

## Service-Specific Checks

- [ ] **No HTTP Imports**: Services don't import Express or HTTP-related modules
- [ ] **Cache Usage**: All appropriate operations use `getOrSetCache` utility
- [ ] **Error Handling**: Services throw domain-specific errors with context
- [ ] **Logging**: Appropriate log levels used with trace IDs and context
- [ ] **Business Logic**: Complex business rules properly implemented
- [ ] **Performance**: N+1 queries avoided, efficient data access patterns
- [ ] **Type Safety**: All methods have proper input/output types

## Storage-Specific Checks

- [ ] **Focused Methods**: Each method has a single, clear responsibility
- [ ] **Domain Objects**: Methods return domain objects, not raw database results
- [ ] **Error Handling**: Database errors properly caught and re-thrown with context
- [ ] **SQL Injection**: Parameterized queries used, no string concatenation
- [ ] **Connection Management**: Proper connection handling and cleanup
- [ ] **Indexing**: Queries use appropriate indexes (documented if new index needed)
- [ ] **No Business Logic**: Storage layer contains only data access logic

## Type Definition Checks

- [ ] **Complete Types**: All domain concepts properly typed
- [ ] **Interface Segregation**: Types follow interface segregation principle
- [ ] **Zod Schemas**: Runtime validation schemas match TypeScript types
- [ ] **Documentation**: Complex types have JSDoc comments
- [ ] **Consistency**: Naming conventions followed across all types
- [ ] **Reusability**: Common types extracted and reused appropriately

## Testing Checks

- [ ] **Unit Tests**: All public methods have corresponding unit tests
- [ ] **Test Coverage**: New code maintains 80%+ coverage target
- [ ] **Error Paths**: Error conditions and edge cases tested
- [ ] **Mocking**: External dependencies properly mocked
- [ ] **Integration Tests**: Critical workflows have integration tests
- [ ] **Performance Tests**: Key endpoints have performance benchmarks
- [ ] **Test Documentation**: Complex test scenarios documented

## Documentation Checks

- [ ] **README Updated**: Module README updated for any API changes
- [ ] **JSDoc Comments**: All public APIs documented
- [ ] **Code Comments**: Complex logic explained with comments
- [ ] **Migration Guide**: Breaking changes documented with migration steps
- [ ] **Examples**: Code examples provided for complex usage patterns
- [ ] **Troubleshooting**: Common issues and solutions documented

## Architecture Compliance Checks

- [ ] **Layer Separation**: Clear separation between controllers, services, and storage
- [ ] **Dependency Direction**: Dependencies flow inward (controllers → services → storage)
- [ ] **No Circular Dependencies**: Import graph remains acyclic
- [ ] **Configuration Management**: Feature flags and settings properly configured
- [ ] **Error Boundaries**: Errors properly propagated and handled at appropriate layers
- [ ] **Caching Strategy**: Consistent caching patterns applied
- [ ] **Logging Standards**: Consistent logging format and levels used

## Performance Checks

- [ ] **Query Efficiency**: Database queries are optimized and indexed
- [ ] **Cache Usage**: Appropriate caching implemented for expensive operations
- [ ] **Memory Leaks**: No potential memory leaks in long-running operations
- [ ] **Concurrent Safety**: Operations safe for concurrent execution
- [ ] **Resource Limits**: Appropriate limits set for memory, connections, etc.
- [ ] **Scalability**: Implementation scales with increased load

## Security Checks

- [ ] **Input Validation**: All inputs validated and sanitized
- [ ] **SQL Injection**: Parameterized queries used throughout
- [ ] **XSS Prevention**: User inputs properly escaped in responses
- [ ] **Authentication**: Proper authentication checks in place
- [ ] **Authorization**: Role-based access controls implemented
- [ ] **Data Exposure**: No sensitive data logged or exposed
- [ ] **Rate Limiting**: Appropriate rate limiting implemented

## Deployment Readiness Checks

- [ ] **Configuration**: All required environment variables documented
- [ ] **Migrations**: Database migrations included if schema changes
- [ ] **Backwards Compatibility**: Changes maintain API compatibility
- [ ] **Rollback Plan**: Rollback strategy documented and tested
- [ ] **Monitoring**: Appropriate monitoring and alerting added
- [ ] **Health Checks**: Health check endpoints updated if needed

## Code Quality Checks

- [ ] **DRY Principle**: No code duplication
- [ ] **Single Responsibility**: Each class/method has one clear purpose
- [ ] **Open/Closed**: Code open for extension, closed for modification
- [ ] **Liskov Substitution**: Subtypes properly substitutable for base types
- [ ] **Interface Segregation**: Clients not forced to depend on unused interfaces
- [ ] **Dependency Inversion**: High-level modules don't depend on low-level modules

## Checklist Completion

- [ ] **Self-Review**: Author has reviewed all changes
- [ ] **Peer Review**: At least one other developer has reviewed
- [ ] **Testing**: All automated tests pass
- [ ] **Integration**: Changes tested in staging environment
- [ ] **Documentation**: All documentation updated
- [ ] **Approval**: Code review approved by required reviewers

## Review Comments Template

```
## General Comments
- [ ] Overall architecture looks good
- [ ] Code follows established patterns
- [ ] Tests are comprehensive
- [ ] Documentation is clear

## Required Changes
- [ ] Fix TypeScript compilation errors
- [ ] Add missing test cases
- [ ] Update documentation
- [ ] Address security concerns

## Suggested Improvements
- [ ] Consider performance optimization
- [ ] Add additional error handling
- [ ] Improve code readability
- [ ] Consider breaking down large functions

## Approval Status
- [ ] Approved for merge
- [ ] Approved with suggestions
- [ ] Changes required
- [ ] Rejected
```

## Common Issues to Watch For

1. **Missing Error Handling**: Ensure all async operations have try/catch
2. **Type Safety**: All variables and function parameters properly typed
3. **Test Coverage**: New code has corresponding tests
4. **Documentation**: Public APIs documented
5. **Security**: Input validation and sanitization
6. **Performance**: Efficient queries and appropriate caching
7. **Architecture**: Following layered architecture principles
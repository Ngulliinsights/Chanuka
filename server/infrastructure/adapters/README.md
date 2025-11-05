# DrizzleAdapter Migration System

This directory contains the DrizzleAdapter system designed to facilitate the migration from repository pattern to direct Drizzle ORM usage as part of Phase 4 of the library migration project.

## Overview

The DrizzleAdapter provides a temporary bridge during the migration from repository pattern to direct Drizzle ORM usage. It maintains API compatibility while allowing gradual migration of domain services.

## Architecture

### Core Components

1. **DrizzleAdapter** - Generic adapter class providing CRUD operations
2. **EntityMapping** - Interface for bidirectional entity-row mapping
3. **Domain-specific mappings** - Concrete mappings for each domain entity

### Key Features

- **Type Safety**: Full TypeScript support with proper type inference
- **Error Handling**: Comprehensive error handling with fallback mechanisms
- **Performance Monitoring**: Built-in performance logging and monitoring
- **Edge Case Handling**: Robust handling of null/undefined values and corrupted data
- **Batch Operations**: Support for efficient batch create/update operations
- **Search Functionality**: Text-based search across multiple fields
- **Flexible Filtering**: Support for various filter operators (eq, like, gt, lt, etc.)

## Usage

### Basic Setup

```typescript
import { createDrizzleAdapter } from './drizzle-adapter';
import { userEntityMapping } from './mappings';
import { users } from '@shared/schema';

// Create adapter for User domain
const userAdapter = createDrizzleAdapter(users, userEntityMapping, 'users');
```

### CRUD Operations

```typescript
// Find by ID
const user = await userAdapter.findById('user-123');

// Find with filters
const activeUsers = await userAdapter.findMany([
  { field: 'is_active', operator: 'eq', value: true }
], { limit: 10, orderBy: 'created_at', orderDirection: 'desc' });

// Create new entity
const newUser = await userAdapter.create(userEntity);

// Update existing entity
const updatedUser = await userAdapter.update('user-123', { name: 'New Name' });

// Delete entity
const deleted = await userAdapter.delete('user-123');

// Count entities
const totalUsers = await userAdapter.count();
```

### Search Operations

```typescript
// Search across multiple fields
const searchResults = await userAdapter.search(
  ['name', 'email'], 
  'john',
  { limit: 20, orderBy: 'name' }
);
```

### Batch Operations

```typescript
// Batch create multiple entities
const createdUsers = await userAdapter.batchCreate([user1, user2, user3]);
```

## Entity Mappings

### Creating Custom Mappings

Each domain requires a custom entity mapping that implements the `EntityMapping` interface:

```typescript
import { EntityMapping } from '../drizzle-adapter';

export class CustomEntityMapping implements EntityMapping<MyEntity, MyRow> {
  toEntity(row: MyRow): MyEntity {
    // Handle null/undefined values
    return {
      id: row.id ?? 'default',
      name: row.name ?? 'Unknown',
      // ... other fields with proper fallbacks
    };
  }

  fromEntity(entity: MyEntity): Partial<MyRow> {
    return {
      id: entity.id,
      name: entity.name?.trim(),
      // ... other fields with proper transformations
    };
  }
}
```

### Existing Mappings

- **UserEntityMapping** - Maps User entities with name validation
- **CommentEntityMapping** - Maps Comment entities with user relationships
- **BillEntityMapping** - Maps Bill entities with metadata
- **NotificationEntityMapping** - Maps Notification entities with delivery status

## Error Handling

### Fallback Mechanisms

All mappings include comprehensive fallback mechanisms for corrupted data:

```typescript
toEntity(row: MyRow): MyEntity {
  // Handle null/undefined values directly
  const safeRow = {
    id: row.id ?? 'unknown',
    name: row.name ?? 'Default Name',
    // ... other safe defaults
  };

  return createEntity(safeRow);
}
```

### Performance Monitoring

The adapter automatically logs performance metrics:

- Operations taking >100ms are logged as info
- Operations taking >1000ms are logged as warnings
- All errors are logged with full context

## Filter Conditions

### Supported Operators

- `eq` - Equality comparison
- `like` - Pattern matching with wildcards
- `gt` - Greater than
- `lt` - Less than
- `gte` - Greater than or equal
- `lte` - Less than or equal
- `in` - Value in array
- `isNull` - Null check

### Example Filters

```typescript
const filters = [
  { field: 'status', operator: 'eq', value: 'active' },
  { field: 'created_at', operator: 'gte', value: new Date('2024-01-01') },
  { field: 'name', operator: 'like', value: 'john' },
  { field: 'role', operator: 'in', value: ['admin', 'moderator'] }
];
```

## Migration Strategy

### Phase 1: Adapter Implementation
1. Create DrizzleAdapter infrastructure ✅
2. Implement entity mappings for all domains ✅
3. Write comprehensive unit tests ✅
4. Create migration comparison tests ✅

### Phase 2: Service Migration
1. Update UserService to use adapter
2. Update CommentService to use adapter
3. Update BillService to use adapter
4. Update NotificationService to use adapter

### Phase 3: Repository Removal
1. Remove repository interfaces
2. Update all imports
3. Clean up unused code
4. Validate no repository references remain

### Phase 4: Direct ORM Migration
1. Replace adapter calls with direct Drizzle queries
2. Remove adapter layer
3. Optimize queries for performance
4. Update tests to use direct ORM

## Testing

### Test Structure

```
__tests__/
├── adapter-core.test.ts          # Core functionality tests
├── entity-mappings.test.ts       # Entity mapping tests
├── drizzle-adapter.test.ts       # Full adapter tests (with mocking)
└── migration-comparison.test.ts  # Old vs new comparison tests
```

### Running Tests

```bash
# Run all adapter tests
npm test -- server/infrastructure/adapters/__tests__ --run

# Run specific test file
npm test -- server/infrastructure/adapters/__tests__/adapter-core.test.ts --run
```

## Risk Mitigation

### Identified Risks and Mitigations

1. **Medium Risk: Adapter layer performance overhead**
   - Mitigation: Performance monitoring and benchmarking
   - Monitoring: Built-in performance logging

2. **Medium Risk: Entity mapping edge cases**
   - Mitigation: Comprehensive fallback mechanisms
   - Testing: Extensive edge case testing

3. **High Risk: Data consistency during migration**
   - Mitigation: Parallel operation support and validation
   - Testing: Migration comparison tests

## Performance Considerations

### Optimization Guidelines

1. **Use appropriate limits**: Default safety limit of 1000 records
2. **Leverage batch operations**: Use `batchCreate` for multiple inserts
3. **Optimize search queries**: Limit search fields and use proper indexing
4. **Monitor performance**: Built-in logging identifies slow operations

### Memory Management

- Automatic cleanup of large result sets
- Streaming support for large batch operations
- Connection pooling through databaseService

## Future Enhancements

### Planned Improvements

1. **Caching Layer**: Add Redis-based caching for frequently accessed entities
2. **Query Optimization**: Automatic query analysis and optimization suggestions
3. **Metrics Dashboard**: Real-time performance metrics and alerting
4. **Migration Tools**: Automated migration scripts and validation tools

### Extension Points

- Custom filter operators
- Plugin system for domain-specific logic
- Event hooks for audit logging
- Custom serialization strategies

## Troubleshooting

### Common Issues

1. **Validation Errors**: Check entity mapping fallback logic
2. **Performance Issues**: Review query complexity and add appropriate indexes
3. **Type Errors**: Ensure entity mappings match schema types
4. **Connection Issues**: Verify databaseService configuration

### Debug Mode

Enable debug logging by setting environment variable:
```bash
DEBUG=drizzle-adapter npm start
```

## Contributing

### Adding New Domain Mappings

1. Create mapping class implementing `EntityMapping<TEntity, TRow>`
2. Add comprehensive unit tests
3. Include edge case handling
4. Update this documentation

### Code Standards

- Follow existing TypeScript patterns
- Include comprehensive error handling
- Add performance monitoring
- Write thorough tests
- Document public APIs

## Related Documentation

- [Migration Specification](../../../.kiro/specs/library-migration/)
- [Database Schema](../../../shared/schema/)
- [Domain Entities](../../features/)
- [Testing Guidelines](../../../tests/)
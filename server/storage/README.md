# Server Storage Module

This module provides lightweight storage abstractions with built-in caching capabilities for the Chanuka Legislative Transparency Platform.

## Overview

The storage module replaces complex infrastructure dependencies with a simple, efficient caching layer that uses in-memory storage for fast data access.

## Architecture

```
server/storage/
├── base.ts           # Abstract BaseStorage class with caching
├── user-storage.ts   # User-specific storage operations
├── bill-storage.ts   # Bill-specific storage operations
├── index.ts          # Module exports
└── README.md         # This file
```

## Usage

### Basic Usage

```typescript
import { UserStorage, BillStorage } from '@server/storage';

// Initialize storage instances
const userStorage = new UserStorage();
const billStorage = new BillStorage();

// Use with automatic caching
const user = await userStorage.getUser(123);
const bills = await billStorage.getBills({ status: 'active' });
```

### Creating Custom Storage

```typescript
import { BaseStorage } from '@server/storage';
import { sponsors, type Sponsor } from '@shared/schema';

export class SponsorStorage extends BaseStorage<Sponsor> {
  constructor() {
    super({ 
      prefix: 'sponsors', 
      defaultTTL: 300 // 5 minutes cache
    });
  }

  async getSponsor(id: string): Promise<Sponsor | undefined> {
    return this.getCached(`id:${id}`, async () => {
      const [sponsor] = await this.db
        .select()
        .from(sponsors)
        .where(eq(sponsors.id, id));
      return sponsor;
    });
  }
}
```

## Features

### Automatic Caching
- In-memory caching with configurable TTL
- Automatic cache invalidation
- Prefix-based key namespacing

### Database Integration
- Direct access to Drizzle ORM instance
- Type-safe database operations
- Automatic connection management

### Performance Optimization
- Automatic cache cleanup
- Configurable cache expiration
- Memory-efficient storage

## Configuration

```typescript
interface StorageConfig {
  prefix?: string;      // Cache key prefix (default: none)
  defaultTTL?: number;  // Cache TTL in seconds (default: 300)
}
```

## Best Practices

1. **Use appropriate cache TTL**: Short-lived data should have shorter TTL
2. **Invalidate cache on updates**: Always invalidate relevant cache entries after data modifications
3. **Use descriptive cache keys**: Include relevant identifiers in cache keys
4. **Handle cache misses gracefully**: Always provide fallback database queries

## Examples

### User Operations
```typescript
const userStorage = new UserStorage();

// Get user with caching
const user = await userStorage.getUser(123);

// Create user and invalidate cache
const newUser = await userStorage.createUser({
  email: 'user@example.com',
  // ... other fields
});

// Check email availability
const isAvailable = await userStorage.isEmailAvailable('test@example.com');
```

### Bill Operations
```typescript
const billStorage = new BillStorage();

// Get filtered bills with caching
const activeBills = await billStorage.getBills({ 
  status: 'active',
  category: 'healthcare' 
});

// Get single bill
const bill = await billStorage.getBill(456);

// Get aggregated statistics
const stats = await billStorage.getBillStats();
```

## Migration from Legacy Storage

If migrating from existing storage implementations:

1. Replace direct database calls with storage methods
2. Remove manual caching logic
3. Update import statements to use new storage classes
4. Configure appropriate cache TTL for your use case

## Dependencies

- `@server/infrastructure/database/pool` - Database connection
- `@shared/core/observability/logging` - Logging functionality
- `drizzle-orm` - Database ORM
- `@shared/schema` - Database schema definitions
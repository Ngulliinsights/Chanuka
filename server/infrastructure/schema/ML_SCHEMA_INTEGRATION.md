# ML Intelligence Schema Integration

**Date:** March 6, 2026  
**Status:** ✅ Complete

## What Was Added

Created `ml_intelligence.ts` schema file with Drizzle ORM definitions for all MWANGA Stack tables.

### Tables Added

1. **ml_interactions** - User interaction logs for engagement model training
2. **conflict_graph_nodes** - Nodes in conflict-of-interest graph
3. **conflict_graph_edges** - Relationships between nodes
4. **vector_embeddings** - Optional pgvector storage (alternative to ChromaDB)
5. **sentiment_cache** - Cache for sentiment analysis results
6. **constitutional_analysis_cache** - Cache for constitutional analysis
7. **trojan_bill_detections** - Trojan bill detection results
8. **ml_model_metadata** - Model version tracking
9. **conflict_detection_cache** - Conflict detection results cache
10. **engagement_predictions** - Engagement predictions for A/B testing

### Features

- **Drizzle ORM Definitions:** Full type-safe schema definitions
- **Relations:** Proper foreign key relationships to users and bills
- **Indexes:** Optimized indexes for fast queries
- **Constraints:** Check constraints for data validation
- **Type Exports:** TypeScript types for select and insert operations

## Schema Structure

```typescript
// Example: ML Interactions table
export const mlInteractions = pgTable(
  'ml_interactions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').references(() => users.id),
    billId: integer('bill_id').references(() => bills.id),
    interactionType: varchar('interaction_type', { length: 50 }),
    // ... more fields
  },
  (table) => ({
    userIdIdx: index('idx_ml_interactions_user_id').on(table.userId),
    billIdIdx: index('idx_ml_interactions_bill_id').on(table.billId),
    // ... more indexes
  })
);

// Type exports
export type MLInteraction = typeof mlInteractions.$inferSelect;
export type NewMLInteraction = typeof mlInteractions.$inferInsert;
```

## Integration Points

### 1. Foundation Schema
References existing tables:
- `users` - For user relationships
- `bills` - For bill relationships

### 2. Schema Index
Added export to `server/infrastructure/schema/index.ts`:
```typescript
export * from './ml_intelligence';
```

### 3. Migration Alignment
Schema definitions match the SQL migration:
- `server/infrastructure/database/migrations/20260306_mwanga_stack_schema.sql`

## Usage Examples

### Insert ML Interaction
```typescript
import { mlInteractions, type NewMLInteraction } from '@/infrastructure/schema';
import { db } from '@/infrastructure/database';

const interaction: NewMLInteraction = {
  userId: 123,
  billId: 456,
  interactionType: 'view',
  engaged: true,
  topicMatchScore: 0.85,
  hourOfDay: 14,
  dayOfWeek: 3,
};

await db.insert(mlInteractions).values(interaction);
```

### Query Conflict Graph
```typescript
import { conflictGraphNodes, conflictGraphEdges } from '@/infrastructure/schema';
import { db } from '@/infrastructure/database';
import { eq } from 'drizzle-orm';

// Find all edges for a sponsor
const sponsorNode = await db
  .select()
  .from(conflictGraphNodes)
  .where(eq(conflictGraphNodes.entityId, 'MP-001'))
  .limit(1);

const edges = await db
  .select()
  .from(conflictGraphEdges)
  .where(eq(conflictGraphEdges.sourceNodeId, sponsorNode[0].id));
```

### Cache Sentiment Result
```typescript
import { sentimentCache, type NewSentimentCache } from '@/infrastructure/schema';
import { db } from '@/infrastructure/database';
import { createHash } from 'crypto';

const text = 'This bill promotes transparency';
const textHash = createHash('sha256').update(text).digest('hex');

const cacheEntry: NewSentimentCache = {
  textHash,
  sentiment: 'positive',
  confidence: 0.87,
  scores: { positive: 0.87, neutral: 0.10, negative: 0.03 },
  tierUsed: 'tier1',
  language: 'en',
};

await db.insert(sentimentCache).values(cacheEntry);
```

## Validation

### Type Safety
All tables have proper TypeScript types:
- `MLInteraction` - Select type
- `NewMLInteraction` - Insert type
- Similar for all other tables

### Constraints
- Check constraints for score ranges (0.0-1.0)
- Check constraints for hour/day ranges
- Unique constraints for cache keys
- Foreign key constraints for relationships

### Indexes
Optimized indexes for:
- User and bill lookups
- Timestamp-based queries
- Cache key lookups
- Graph traversal queries

## Next Steps

1. ✅ Schema definitions created
2. ✅ Added to schema index
3. ⏳ Run database migration
4. ⏳ Test schema with actual data
5. ⏳ Create repository layer for ML tables
6. ⏳ Integrate with ML models

## Files Modified

- ✅ Created: `server/infrastructure/schema/ml_intelligence.ts`
- ✅ Modified: `server/infrastructure/schema/index.ts`

## Compatibility

- **Drizzle ORM:** Compatible with latest version
- **PostgreSQL:** Requires PostgreSQL 12+
- **pgvector:** Optional (for vector_embeddings table)
- **Migration:** Matches SQL migration exactly

## Notes

### Vector Embeddings
The `vectorEmbeddings` table includes a commented-out vector field:
```typescript
// embedding: vector('embedding', { dimensions: 384 }),
```

This requires the pgvector extension. Uncomment if using pgvector instead of ChromaDB.

### Relations
All tables with foreign keys have proper Drizzle relations defined for easy joins:
```typescript
export const mlInteractionsRelations = relations(mlInteractions, ({ one }) => ({
  user: one(users, { fields: [mlInteractions.userId], references: [users.id] }),
  bill: one(bills, { fields: [mlInteractions.billId], references: [bills.id] }),
}));
```

### Cache Tables
Cache tables use SHA-256 hashes as keys for efficient lookups and deduplication.

## Testing

To test the schema:

```typescript
// Test schema compilation
import * as mlSchema from '@/infrastructure/schema/ml_intelligence';

// Verify all exports
console.log(Object.keys(mlSchema));
// Should include: mlInteractions, conflictGraphNodes, etc.

// Test type inference
const interaction: mlSchema.MLInteraction = {
  id: 1,
  userId: 123,
  billId: 456,
  interactionType: 'view',
  engaged: true,
  // ... all required fields
};
```

## Summary

The MWANGA Stack database schema is now fully integrated into the Drizzle ORM schema system. All 10 tables are defined with proper types, relations, indexes, and constraints, ready for use with the ML models.

---

*Schema integration completed by: Kiro AI Assistant*  
*Date: March 6, 2026*

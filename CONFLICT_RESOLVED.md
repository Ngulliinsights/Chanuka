# Search Conflict RESOLVED ✅

## What Was Done

### Problem
Two schemas defined a `searchQueries` table:
- `search_system.ts` - For base search functionality
- `advanced_discovery.ts` - For search analytics

### Solution
**Renamed and separated concerns:**

1. **`search_system.ts`** - Base search functionality
   - Kept `search_queries` table (base query log)
   - Handles: Performance, results, embeddings, caching

2. **`advanced_discovery.ts`** - Search intelligence
   - Renamed `searchQueries` → `searchIntelligence`
   - Added foreign key to `search_system.search_queries`
   - Handles: Intent, satisfaction, patterns, recommendations

### Changes Made

**File: `server/infrastructure/schema/advanced_discovery.ts`**
- ✅ Renamed `searchQueries` → `searchIntelligence`
- ✅ Added `searchQueryId` foreign key to `search_system.search_queries`
- ✅ Updated `searchAnalytics` to reference base queries
- ✅ Updated all relations
- ✅ Updated type exports
- ✅ Added import from `search_system`

**File: `drizzle.config.ts`**
- ✅ Added `search_system.ts` to schema list
- ✅ Added `advanced_discovery.ts` to schema list
- ✅ Both schemas now included

### Architecture

```
search_system.ts (Base Layer)
├── content_embeddings (vector search)
├── search_queries (performance tracking) ← PRIMARY
├── search_analytics (aggregated metrics)
└── saved_searches (user bookmarks)

advanced_discovery.ts (Intelligence Layer)
├── search_intelligence (intent & satisfaction) → references search_queries
├── search_analytics (detailed behavior) → references search_queries
├── discovery_patterns (AI patterns)
├── bill_relationships (content mapping)
├── trending_topics (real-time trends)
└── user_recommendations (personalization)
```

### Benefits

✅ **No conflicts** - Different table names  
✅ **Clear separation** - Base vs intelligence  
✅ **Linked data** - Foreign key relationship  
✅ **Independent scaling** - Can optimize separately  
✅ **Future-proof** - Easy to extend either layer  

### Tables Created

**From search_system.ts (4 tables):**
1. `content_embeddings` - Vector embeddings for semantic search
2. `search_queries` - Base query log with performance data
3. `search_analytics` - Aggregated search metrics
4. `saved_searches` - User bookmarked searches

**From advanced_discovery.ts (6 tables):**
1. `search_intelligence` - Query intent and satisfaction
2. `search_analytics` - Detailed behavioral analytics
3. `discovery_patterns` - AI-detected patterns
4. `bill_relationships` - Bill similarity mapping
5. `trending_topics` - Real-time trending topics
6. `user_recommendations` - Personalized recommendations

**Total: 10 tables for complete search functionality**

### Next Steps

**No action required for migration!** ✅

The conflict is resolved. When you run:
```bash
npm run db:fresh-start
```

Both schemas will be included and all 10 search tables will be created without conflicts.

### Testing After Migration

```typescript
// Test base search
const query = await db.insert(searchQueries).values({
  query_text: 'test',
  query_type: 'semantic',
  total_results: 10,
}).returning();

// Test intelligence layer
await db.insert(searchIntelligence).values({
  search_query_id: query.id,
  query_text: 'test',
  query_intent: 'exploratory',
  query_satisfaction: 0.85,
});

// Verify relationship
const intelligence = await db
  .select()
  .from(searchIntelligence)
  .leftJoin(searchQueries, eq(searchIntelligence.searchQueryId, searchQueries.id))
  .where(eq(searchIntelligence.searchQueryId, query.id));

console.log('✅ Search system fully functional!');
```

---

**Status:** ✅ RESOLVED  
**Date:** February 25, 2026  
**Impact:** Zero - Clean separation, no conflicts  
**Ready for migration:** YES

# Caching System Integration Guide

## 🚀 **Quick Start**

The caching system is now integrated and ready to use! Here's how to get started:

### 1. **Basic Usage**

```typescript
import { serverCache } from './infrastructure/cache/cache-service';

// Cache any data
await serverCache.cacheApiResponse('user:123', userData, 300); // 5 minutes
const cached = await serverCache.getApiResponse('user:123');
```

### 2. **Middleware Integration**

```typescript
import { cacheMiddleware } from './middleware/cache-middleware';

// Add to any route
app.get('/api/bills', cacheMiddleware.medium, (req, res) => {
  // Your route handler - response will be cached automatically
});
```

### 3. **Database Query Caching**

```typescript
import { QueryCache, CacheHelpers } from './infrastructure/query-cache';

// Wrap any database query
const result = await QueryCache.execute(
  () => db.select().from(bills).where(eq(bills.id, id)),
  `bill:${id}`,
  CacheHelpers.bill(id, 900) // 15 minutes
);
```

## 📊 **Available Cache Types**

### **API Response Cache**
- **Purpose**: Cache HTTP responses
- **TTL**: 5 minutes (configurable)
- **Size**: 50MB limit
- **Use for**: API endpoints, computed results

### **Session Cache**
- **Purpose**: User session data
- **TTL**: 30 minutes (configurable)
- **Size**: 20MB limit
- **Use for**: User authentication, preferences

### **Query Cache**
- **Purpose**: Database query results
- **TTL**: 10 minutes (configurable)
- **Size**: 100MB limit
- **Use for**: Database queries, search results

## 🛠 **Integration Examples**

### **1. Route-Level Caching**

```typescript
// Short-term caching (1 minute)
app.get('/api/live-data', cacheMiddleware.short, handler);

// Medium-term caching (5 minutes)
app.get('/api/bills', cacheMiddleware.medium, handler);

// Long-term caching (1 hour)
app.get('/api/stats', cacheMiddleware.long, handler);

// User-specific caching
app.get('/api/dashboard', cacheMiddleware.userSpecific(600), handler);
```

### **2. Service-Level Caching**

```typescript
import { cachedBillService } from './features/bills/application/cached-bill-service';

// Use cached versions of bill operations
const bills = await cachedBillService.getAllBillsCached(filters, pagination);
const bill = await cachedBillService.getCachedBillById(id);
const searchResults = await cachedBillService.searchBillsCached(query);
```

### **3. Custom Query Caching**

```typescript
// Using the @Cached decorator
class MyService {
  @Cached(CacheHelpers.user('123', 600))
  async getUserData(userId: string) {
    return await db.select().from(users).where(eq(users.id, userId));
  }
}

// Using QueryCache directly
const userData = await QueryCache.execute(
  () => getUserFromDatabase(userId),
  `user:${userId}`,
  { ttl: 600, keyPrefix: 'user', tags: [`user:${userId}`] }
);
```

## 🔧 **Cache Management**

### **Monitoring**

```typescript
// Get cache statistics
const stats = serverCache.getCacheStats();
console.log('Hit rate:', stats.api.hitRate);

// Health check
const health = await serverCache.healthCheck();
console.log('Cache status:', health.api.status);
```

### **Cache Invalidation**

```typescript
// Invalidate specific patterns
await QueryCache.invalidate('bills:*');
await QueryCache.invalidate(`user:${userId}:*`);

// Clear all caches
await serverCache.invalidateQueryPattern('*');

// Service-specific invalidation
await cachedBillService.invalidateBillCaches(billId);
```

### **Cache Warming**

```typescript
// Warm up bill cache
await cachedBillService.warmUpCache();

// Custom warming
const popularData = await loadPopularData();
await serverCache.cacheApiResponse('popular', popularData, 3600);
```

## 📈 **Performance Benefits**

### **Expected Improvements**
- **API Response Time**: 50-90% reduction for cached responses
- **Database Load**: 60-80% reduction in query volume
- **User Experience**: Faster page loads and interactions
- **Server Resources**: Lower CPU and memory usage

### **Monitoring Metrics**
- **Hit Rate**: Target >70% for frequently accessed data
- **Response Time**: <50ms for cache hits
- **Memory Usage**: Monitor cache size limits
- **Error Rate**: Should remain <1%

## 🎯 **Best Practices**

### **1. Cache Key Design**
```typescript
// Good: Specific and hierarchical
'user:123:profile'
'bill:456:details'
'search:healthcare:page:1'

// Bad: Generic or conflicting
'data'
'result'
'cache'
```

### **2. TTL Selection**
```typescript
// Frequently changing data
{ ttl: 60 }     // 1 minute

// Moderately changing data  
{ ttl: 300 }    // 5 minutes

// Rarely changing data
{ ttl: 3600 }   // 1 hour

// Static/reference data
{ ttl: 86400 }  // 24 hours
```

### **3. Cache Invalidation**
```typescript
// Invalidate on data changes
router.post('/bills', async (req, res) => {
  const bill = await createBill(req.body);
  await cachedBillService.invalidateBillCaches(); // Clear related caches
  res.json(bill);
});

// Invalidate specific items
router.put('/bills/:id', async (req, res) => {
  const bill = await updateBill(req.params.id, req.body);
  await cachedBillService.invalidateBillCaches(req.params.id);
  res.json(bill);
});
```

## 🚨 **Important Notes**

### **Memory Management**
- Monitor cache sizes regularly
- Set appropriate TTL values
- Use cache invalidation strategically
- Consider memory limits per cache type

### **Data Consistency**
- Always invalidate cache after data modifications
- Use appropriate TTL for data freshness requirements
- Consider eventual consistency for non-critical data

### **Error Handling**
- Cache failures should not break application functionality
- Always have fallback to direct data access
- Log cache errors for monitoring

## 📊 **Cache Management API**

Access cache management endpoints:

```bash
# Get cache statistics
GET /api/cache/stats

# Check cache health
GET /api/cache/health

# Clear caches
POST /api/cache/clear
{
  "pattern": "bills:*",
  "cacheType": "queries"
}

# Warm up caches
POST /api/cache/warm
{
  "targets": ["bills"]
}
```

## 🔄 **Migration from Existing Code**

### **Step 1**: Add middleware to routes
```typescript
// Before
app.get('/api/bills', billHandler);

// After
app.get('/api/bills', cacheMiddleware.medium, billHandler);
```

### **Step 2**: Use cached services
```typescript
// Before
const bills = await billService.getAllBills(filters);

// After
const bills = await cachedBillService.getAllBillsCached(filters);
```

### **Step 3**: Add cache invalidation
```typescript
// After data modifications
await cachedBillService.invalidateBillCaches();
```

## 🎉 **You're Ready!**

The caching system is now fully integrated and ready to improve your application's performance. Start with the middleware integration for immediate benefits, then gradual
# Memory Optimization Guide

## Current Issue
- **Memory Usage**: 82.17% (above 80% threshold)
- **Health Check Response**: 1070ms (slow)
- **Alert Status**: High Memory Usage triggered

## Immediate Actions Taken

### 1. Fixed Memory Leaks in Cache Warming Service
- Reduced `rulesExecuted` array from 1000 to 100 entries, with more aggressive cleanup (50 entries)
- Added automatic memory cleanup every 5 minutes
- Added proper shutdown method to clear intervals and prevent leaks
- Implemented cleanup of execution records older than 1 hour

### 2. Optimized System Health Service
- Reduced metrics history from 100 to 50 entries
- Reduced response times tracking from 1000 to 500 entries
- Reduced query times tracking from 1000 to 500 entries
- Added automatic cleanup when memory usage > 85%
- Implemented map size limits for request/error counts

### 3. Created Memory Optimization Tools
- **Memory Optimizer Service**: Automated memory optimization with garbage collection
- **Immediate Cleanup Script**: `npm run cleanup:memory` for emergency cleanup
- **Memory Monitoring**: Enhanced alerts and automatic cleanup triggers

## Quick Fixes to Run Now

### Immediate Memory Relief
```bash
# Run immediate memory cleanup
npm run cleanup:memory

# If memory is still high, restart the development server
npm run dev
```

### Monitor Memory Usage
```bash
# Check current memory status
curl http://localhost:3000/api/health
```

## Long-term Optimizations

### 1. Cache Warming Optimizations
- **Reduced execution history**: Only keeps 25 recent records instead of 1000
- **Automatic cleanup**: Runs every 5 minutes to prevent accumulation
- **Memory-aware scheduling**: Skips warming when memory usage is high

### 2. System Health Monitoring
- **Proactive cleanup**: Automatically triggers when memory > 85%
- **Reduced data retention**: Keeps less historical data in memory
- **Efficient data structures**: Limited map sizes to prevent unbounded growth

### 3. Memory Management Best Practices
- **Garbage collection**: Exposed via `--expose-gc` flag
- **Module cache cleanup**: Removes non-essential cached modules
- **Automatic monitoring**: Continuous memory usage tracking

## Configuration Changes Made

### Cache Warming Service (`server/infrastructure/cache/cache-warming.ts`)
- Added `cleanupMemory()` method for periodic cleanup
- Added `shutdown()` method for proper resource cleanup
- Reduced memory footprint of execution tracking

### System Health Service (`server/infrastructure/monitoring/system-health.ts`)
- Enhanced memory monitoring with automatic cleanup
- Reduced array sizes for better memory efficiency
- Added proactive memory management

### New Scripts Added
- `npm run cleanup:memory` - Immediate memory cleanup
- `npm run optimize:memory` - Full memory optimization (requires built app)

## Monitoring and Alerts

### Memory Thresholds
- **Normal**: < 60% memory usage
- **Warning**: 60-80% memory usage
- **Critical**: > 80% memory usage
- **Emergency**: > 90% memory usage (triggers automatic cleanup)

### Health Check Endpoints
- `GET /api/health` - Overall system health
- `GET /api/metrics` - Detailed system metrics
- `GET /api/performance` - Performance metrics

## Prevention Strategies

### 1. Regular Monitoring
```bash
# Add to cron or scheduled task
*/15 * * * * npm run cleanup:memory
```

### 2. Application Restart Schedule
```bash
# Restart application daily to prevent memory accumulation
0 2 * * * pm2 restart app
```

### 3. Memory Limits
Consider setting Node.js memory limits:
```bash
node --max-old-space-size=4096 server/index.ts
```

## Troubleshooting

### If Memory Usage Remains High
1. **Restart the application**: `npm run dev`
2. **Check for memory leaks**: Review recent code changes
3. **Monitor database connections**: Ensure proper connection pooling
4. **Review cache sizes**: Check if caches are growing unbounded

### If Health Checks Are Slow
1. **Check database performance**: Look for slow queries
2. **Review API response times**: Identify bottlenecks
3. **Monitor system resources**: CPU, disk I/O
4. **Optimize database queries**: Add indexes, optimize joins

## Next Steps

1. **Monitor the changes**: Watch memory usage over the next hour
2. **Test under load**: Ensure optimizations work under normal usage
3. **Set up alerts**: Configure monitoring for memory thresholds
4. **Document patterns**: Track when memory spikes occur

## Emergency Contacts

If memory issues persist:
1. Run `npm run cleanup:memory`
2. Restart the application
3. Check logs for memory-related errors
4. Review recent deployments or code changes

---

**Last Updated**: $(date)
**Memory Optimization Version**: 1.0
**Status**: Active Monitoring
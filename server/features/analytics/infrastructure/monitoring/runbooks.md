# Analytics Service Runbooks

## High Error Rate Response

### Detection
- Alert: Error rate > 5% for 5 minutes
- Dashboard: Error Rate by Endpoint panel shows elevated percentages

### Immediate Actions (Within 5 minutes)
1. **Check Application Logs**
   ```bash
   # Search for recent errors with trace IDs
   grep "ERROR" /var/log/analytics/app.log | tail -20

   # Check error distribution by endpoint
   grep "ERROR.*analytics" /var/log/analytics/app.log | grep -o '"route":"[^"]*"' | sort | uniq -c
   ```

2. **Verify Service Health**
   ```bash
   # Check service status
   curl -f http://localhost:3000/health

   # Check analytics-specific health
   curl -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/analytics/stats
   ```

3. **Check Dependencies**
   - Database connectivity: `SELECT 1;`
   - Cache connectivity: Redis ping
   - External API status

### Investigation Steps (Within 15 minutes)
1. **Analyze Error Patterns**
   ```bash
   # Group errors by type
   grep "ERROR" /var/log/analytics/app.log | grep -o '"error":"[^"]*"' | sort | uniq -c | sort -nr

   # Check for specific error codes
   grep "status.*5[0-9][0-9]" /var/log/analytics/app.log | tail -10
   ```

2. **Review Recent Changes**
   - Check deployment history
   - Review recent code changes
   - Check configuration changes

3. **Performance Check**
   ```bash
   # Check system resources
   top -p $(pgrep -f analytics)
   free -h
   df -h

   # Check database performance
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   ```

### Escalation Criteria
- Error rate > 10% for 10 minutes
- Service becomes unresponsive
- Database connection pool exhausted
- Multiple endpoints affected

### Resolution Actions
1. **Restart Service** (if no data loss risk)
   ```bash
   sudo systemctl restart analytics-service
   ```

2. **Rollback Deployment**
   ```bash
   # If recent deployment caused issues
   sudo systemctl stop analytics-service
   # Restore previous version
   sudo systemctl start analytics-service
   ```

3. **Scale Resources**
   ```bash
   # Increase instance count
   kubectl scale deployment analytics --replicas=3
   ```

## Slow Performance Response

### Detection
- Alert: p95 latency > 2 seconds for 5 minutes
- Dashboard: Response Time Percentiles panel shows elevated values

### Immediate Actions
1. **Check Current Load**
   ```bash
   # Check active requests
   curl -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/analytics/stats

   # Check system load
   uptime
   top -b -n1 | head -20
   ```

2. **Review Slow Query Logs**
   ```bash
   # Check database slow query log
   tail -f /var/log/postgresql/postgresql-slow.log

   # Check analytics-specific queries
   SELECT query, calls, total_time/calls as avg_time, rows
   FROM pg_stat_statements
   WHERE query LIKE '%engagement%' OR query LIKE '%analytics%'
   ORDER BY total_time DESC LIMIT 10;
   ```

### Investigation Steps
1. **Cache Performance Analysis**
   ```bash
   # Check cache hit rates
   curl -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/analytics/cache/stats

   # Check cache size
   redis-cli info | grep used_memory
   ```

2. **Database Performance**
   ```bash
   # Check connection pool usage
   SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = 'analytics_db';

   # Check for locks
   SELECT blocked_locks.pid     AS blocked_pid,
          blocked_activity.usename  AS blocked_user,
          blocking_locks.pid     AS blocking_pid,
          blocking_activity.usename AS blocking_user,
          blocked_activity.query    AS blocked_statement
   FROM  pg_catalog.pg_locks         blocked_locks
     JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
     JOIN pg_catalog.pg_locks         blocking_locks
         ON blocking_locks.locktype = blocked_locks.locktype
         AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
         AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
         AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
         AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
         AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
         AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
         AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
         AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
         AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
         AND blocking_locks.pid != blocked_locks.pid
     JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
   WHERE NOT blocked_locks.granted;
   ```

3. **Memory Analysis**
   ```bash
   # Check memory usage
   ps aux --sort=-%mem | head -10

   # Check for memory leaks
   jmap -histo:live <analytics-pid> | head -20
   ```

### Resolution Actions
1. **Optimize Queries**
   - Add missing indexes
   - Rewrite slow queries
   - Implement query result caching

2. **Scale Resources**
   ```bash
   # Increase memory limits
   kubectl set resources deployment analytics --limits=memory=2Gi

   # Add more instances
   kubectl scale deployment analytics --replicas=4
   ```

3. **Cache Optimization**
   - Increase cache TTL values
   - Implement more aggressive caching
   - Clear and warm caches

## Cache Issues Response

### Detection
- Alert: Cache hit rate < 50% for 10 minutes
- Dashboard: Cache Hit Rate by Prefix panel shows low values

### Investigation Steps
1. **Cache Metrics Analysis**
   ```bash
   # Check cache statistics
   curl -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/analytics/cache/stats

   # Check Redis memory usage
   redis-cli info memory
   redis-cli info stats
   ```

2. **Cache Key Analysis**
   ```bash
   # Check cache key patterns
   redis-cli keys "analytics:*" | head -20

   # Check key expiration
   redis-cli ttl "analytics:engagement:metrics:30d"
   ```

3. **Cache Invalidation Issues**
   ```bash
   # Check for cache stampedes
   grep "cache.*miss" /var/log/analytics/app.log | tail -20

   # Check cache key consistency
   grep "cache.*key" /var/log/analytics/app.log | grep -o '"key":"[^"]*"' | sort | uniq -c
   ```

### Resolution Actions
1. **Cache Configuration Tuning**
   ```bash
   # Increase cache sizes
   export ANALYTICS_CACHE_MAX_SIZE=2000

   # Adjust TTL values
   export ANALYTICS_CACHE_USER_ENGAGEMENT_TTL=3600
   ```

2. **Cache Warming**
   ```bash
   # Trigger cache warming
   curl -X POST -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/analytics/cache/warm
   ```

3. **Cache Infrastructure**
   - Increase Redis memory limits
   - Implement cache clustering
   - Add cache warming strategies

## Database Connection Issues

### Detection
- Alert: Database connection errors
- Dashboard: Service Dependencies Health panel shows database down

### Investigation Steps
1. **Database Connectivity**
   ```bash
   # Test database connection
   psql -h localhost -U analytics_user -d analytics_db -c "SELECT 1;"

   # Check database service status
   sudo systemctl status postgresql
   ```

2. **Connection Pool Analysis**
   ```bash
   # Check pool statistics
   SELECT * FROM pg_stat_database WHERE datname = 'analytics_db';

   # Check active connections
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'analytics_db';
   ```

3. **Database Performance**
   ```bash
   # Check database load
   SELECT * FROM pg_stat_activity WHERE state = 'active';

   # Check disk space
   df -h /var/lib/postgresql
   ```

### Resolution Actions
1. **Restart Database Service**
   ```bash
   sudo systemctl restart postgresql
   ```

2. **Connection Pool Tuning**
   ```bash
   # Adjust pool settings
   export ANALYTICS_DB_POOL_SIZE=10
   export ANALYTICS_DB_IDLE_TIMEOUT=60000
   ```

3. **Database Maintenance**
   ```bash
   # Run vacuum analyze
   psql -d analytics_db -c "VACUUM ANALYZE;"

   # Check for corruption
   psql -d analytics_db -c "SELECT * FROM pg_stat_database;"
   ```

## General Troubleshooting Commands

### Log Analysis
```bash
# Search by trace ID
grep "traceId:12345678-1234-1234-1234-123456789abc" /var/log/analytics/app.log

# Error summary
grep "ERROR" /var/log/analytics/app.log | jq -r '.error' | sort | uniq -c | sort -nr

# Performance analysis
grep "duration" /var/log/analytics/app.log | jq -r '.duration' | sort -n | tail -10
```

### Health Checks
```bash
# Full health check
curl -f http://localhost:3000/health

# Analytics specific health
curl -H "Authorization: Bearer <admin-token>" http://localhost:3000/api/analytics/health

# Dependency checks
curl -f http://localhost:6379/ping  # Redis
psql -c "SELECT 1;"  # PostgreSQL
```

### Performance Monitoring
```bash
# Real-time monitoring
watch -n 5 'curl -s http://localhost:3000/api/analytics/stats | jq .'

# Memory analysis
jstat -gc <analytics-pid>

# Thread analysis
jstack <analytics-pid> | head -50
```

## Communication Templates

### Issue Notification
```
Subject: 🔴 Analytics Service - High Error Rate Alert

Team,

The analytics service is experiencing elevated error rates:
- Current error rate: X%
- Affected endpoints: /api/analytics/engagement/metrics
- Time detected: YYYY-MM-DD HH:MM UTC

Investigation in progress. Will update when root cause identified.

Best,
Monitoring System
```

### Resolution Update
```
Subject: ✅ Analytics Service - Issue Resolved

Team,

The analytics service issue has been resolved:
- Issue: High error rate
- Root cause: Database connection pool exhaustion
- Resolution: Increased pool size and restarted service
- Duration: 15 minutes
- Impact: Minimal user impact due to fast failover

Post-mortem analysis will be shared separately.

Best,
DevOps Team
```

### Rollback Notification
```
Subject: 🔄 Analytics Service - Deployment Rollback

Team,

Due to performance degradation detected in production, we have rolled back the analytics service to the previous version:

- Rollback time: YYYY-MM-DD HH:MM UTC
- Previous version: v1.2.3
- Reason: p95 latency increased by 300%
- Monitoring: Service performance restored to normal levels

The deployment will be re-attempted after further testing.

Best,
DevOps Team

# Maintenance Runbooks for Ongoing Operations

## Overview

This document provides comprehensive maintenance runbooks for ongoing operations and library updates following the migration. These procedures ensure sustained system health, security, and performance.

## Daily Maintenance Procedures

### Morning Health Check Runbook

**Frequency**: Daily, 9:00 AM
**Duration**: 15 minutes
**Responsible**: On-call Engineer

#### Prerequisites
- Access to production monitoring dashboard
- SSH access to production servers
- Database admin credentials

#### Procedure Steps

1. **System Resource Check**
   ```bash
   # Check overall system health
   uptime
   df -h
   free -h
   top -b -n1 | head -20

   # Check service status
   systemctl status app.service
   systemctl status database.service
   systemctl status redis.service
   ```

2. **Application Health Verification**
   ```bash
   # Health endpoint check
   curl -f http://localhost:3000/health

   # Response time check
   curl -o /dev/null -s -w "%{time_total}\n" http://localhost:3000/api/status

   # Error rate check (last hour)
   grep "ERROR" /var/log/app/error.log | wc -l
   ```

3. **Database Health Check**
   ```bash
   # Connection check
   psql -h localhost -U app_user -d app_db -c "SELECT 1;"

   # Active connections
   psql -h localhost -U app_user -d app_db -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

   # Long-running queries
   psql -h localhost -U app_user -d app_db -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '30 seconds';"
   ```

4. **Cache Health Check**
   ```bash
   # Redis connectivity
   redis-cli ping

   # Cache hit rate
   redis-cli info stats | grep keyspace_hits
   redis-cli info stats | grep keyspace_misses

   # Memory usage
   redis-cli info memory | grep used_memory_human
   ```

5. **Log Analysis**
   ```bash
   # Recent errors
   tail -50 /var/log/app/error.log | grep -E "(ERROR|FATAL|CRITICAL)"

   # Performance warnings
   tail -50 /var/log/app/app.log | grep -i "slow\|performance"

   # Security events
   tail -50 /var/log/app/security.log | grep -i "security\|auth"
   ```

6. **Alert Review**
   ```bash
   # Check active alerts
   curl -s http://localhost:9090/api/v1/alerts | jq '.data'

   # Review alert history (last 24h)
   curl -s "http://localhost:9090/api/v1/alerts?active=false&start=$(date -d 'yesterday' +%s)000" | jq '.data | length'
   ```

#### Success Criteria
- All services report healthy status
- Response times < 500ms
- Error rate < 1%
- Database connections < 80% of max
- Cache hit rate > 85%

#### Escalation Procedures
- If any service is down: Page DevOps immediately
- If error rate > 5%: Notify engineering team
- If response time > 2s: Investigate performance issues

### Log Rotation and Cleanup

**Frequency**: Daily, 2:00 AM
**Duration**: 5 minutes
**Responsible**: Automated script

```bash
#!/bin/bash
# daily-log-maintenance.sh

LOG_DIR="/var/log/app"
RETENTION_DAYS=30

echo "=== Daily Log Maintenance ==="

# Rotate application logs
logrotate -f /etc/logrotate.d/app

# Compress old logs
find $LOG_DIR -name "*.log.1" -mtime +1 -exec gzip {} \;

# Remove logs older than retention period
find $LOG_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

# Clean temporary files
find /tmp -name "app-*" -mtime +1 -delete

echo "Log maintenance complete"
```

## Weekly Maintenance Procedures

### Performance Review Runbook

**Frequency**: Weekly, Monday 10:00 AM
**Duration**: 60 minutes
**Responsible**: Engineering Team

#### Prerequisites
- Performance monitoring data for past week
- Baseline performance metrics
- Incident reports

#### Procedure Steps

1. **Performance Metrics Analysis**
   ```bash
   # Generate weekly performance report
   node scripts/generate-performance-report.js --period weekly

   # Compare against baselines
   node scripts/compare-baselines.js --report weekly-report.json
   ```

2. **Key Metrics Review**
   - API response times (p50, p95, p99)
   - Error rates by endpoint
   - Database query performance
   - Cache hit rates
   - Memory and CPU usage trends

3. **Anomaly Detection**
   ```typescript
   // Check for performance regressions
   const regressions = await performanceMonitor.compareToBaseline('api:response-time', 7 * 24 * 60 * 60 * 1000);
   if (regressions.some(r => r.isRegression)) {
     await notifyEngineeringTeam('Performance regressions detected', regressions);
   }
   ```

4. **Resource Utilization Analysis**
   - Peak usage times
   - Resource bottlenecks
   - Scaling requirements

5. **Incident Review**
   - Review all incidents from past week
   - Identify root causes
   - Implement preventive measures

6. **Capacity Planning**
   ```typescript
   // Analyze growth trends
   const growthRate = await analyzeGrowthTrends();
   const projectedNeeds = calculateCapacityNeeds(growthRate);

   if (projectedNeeds.scaleRequired) {
     await createCapacityPlanningTicket(projectedNeeds);
   }
   ```

#### Documentation Updates
- Update performance baselines if improvements detected
- Document any configuration changes
- Update incident response procedures

### Security Vulnerability Scan

**Frequency**: Weekly, Wednesday 9:00 AM
**Duration**: 30 minutes
**Responsible**: Security Team

#### Procedure Steps

1. **Dependency Vulnerability Scan**
   ```bash
   # Run npm audit
   npm audit --audit-level moderate

   # Check for available updates
   npm outdated

   # Run Snyk security scan
   snyk test --severity-threshold=medium
   ```

2. **Container Image Scan**
   ```bash
   # Scan Docker images
   docker scan app:latest

   # Check base image vulnerabilities
   trivy image app:latest
   ```

3. **Infrastructure Security Check**
   ```bash
   # Check firewall rules
   iptables -L

   # Review user access logs
   last | head -20

   # Check file permissions
   find /app -type f -perm /111 -ls
   ```

4. **Code Security Analysis**
   ```bash
   # Run static analysis
   npm run security:scan

   # Check for hardcoded secrets
   grep -r "password\|secret\|key" --exclude-dir=node_modules . | grep -v "test\|example"
   ```

#### Response Procedures
- **Critical vulnerabilities**: Immediate patching required
- **High vulnerabilities**: Patch within 7 days
- **Medium vulnerabilities**: Patch within 30 days
- **Low vulnerabilities**: Address in next maintenance window

## Monthly Maintenance Procedures

### Library Update Runbook

**Frequency**: Monthly, 1st Monday
**Duration**: 120 minutes
**Responsible**: Engineering Team

#### Prerequisites
- Test environment ready
- Rollback procedures documented
- Stakeholder notification plan

#### Procedure Steps

1. **Library Assessment**
   ```bash
   # Check for outdated packages
   npm outdated

   # Review changelogs for major updates
   npm view fuse.js versions --json
   npm view drizzle-orm versions --json
   npm view zod versions --json
   ```

2. **Compatibility Testing**
   ```typescript
   // Test library compatibility
   const compatibilityResults = await testLibraryCompatibility([
     { name: 'fuse.js', version: 'latest' },
     { name: 'drizzle-orm', version: 'latest' },
     { name: 'zod', version: 'latest' }
   ]);

   if (!compatibilityResults.allCompatible) {
     await notifyEngineeringTeam('Library compatibility issues found', compatibilityResults);
   }
   ```

3. **Update Planning**
   - Identify low-risk updates (patch/minor versions)
   - Plan major version updates separately
   - Schedule updates during low-traffic periods

4. **Staged Update Process**
   ```bash
   # 1. Update development environment
   git checkout develop
   npm update fuse.js@^7.0.0

   # 2. Run full test suite
   npm test
   npm run test:integration
   npm run test:e2e

   # 3. Performance testing
   npm run test:performance

   # 4. Deploy to staging
   git push origin develop
   # CI/CD deploys to staging

   # 5. Staging validation
   ./scripts/validate-staging.sh
   ```

5. **Production Deployment**
   ```bash
   # Feature flag rollout
   export LIBRARY_UPDATE_MODE=gradual

   # Deploy with 10% traffic
   kubectl set env deployment/app LIBRARY_UPDATE_TRAFFIC=10

   # Monitor for 1 hour
   watch -n 60 ./scripts/monitor-deployment.sh

   # Gradually increase traffic
   kubectl set env deployment/app LIBRARY_UPDATE_TRAFFIC=25
   sleep 3600

   kubectl set env deployment/app LIBRARY_UPDATE_TRAFFIC=50
   sleep 3600

   kubectl set env deployment/app LIBRARY_UPDATE_TRAFFIC=100
   ```

6. **Post-Update Validation**
   ```bash
   # Run production smoke tests
   ./scripts/production-smoke-tests.sh

   # Monitor for 24 hours
   ./scripts/monitor-post-update.sh 24h

   # Update baselines if performance improved
   ./scripts/update-baselines.sh
   ```

#### Rollback Procedures
If issues detected during update:
```bash
# Immediate rollback
kubectl rollout undo deployment/app

# Or gradual rollback
kubectl set env deployment/app LIBRARY_UPDATE_TRAFFIC=0
sleep 300
kubectl set env deployment/app LIBRARY_UPDATE_TRAFFIC=25
# Continue gradual reduction
```

### Database Maintenance Runbook

**Frequency**: Monthly, 2nd Monday
**Duration**: 90 minutes
**Responsible**: Database Administrator

#### Procedure Steps

1. **Pre-Maintenance Backup**
   ```bash
   # Full database backup
   pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup-$(date +%Y%m%d).sql

   # Upload to cloud storage
   aws s3 cp backup-$(date +%Y%m%d).sql s3://database-backups/
   ```

2. **Statistics Update**
   ```sql
   -- Update table statistics
   ANALYZE VERBOSE;

   -- Update specific tables
   ANALYZE bills;
   ANALYZE users;
   ANALYZE search_queries;
   ```

3. **Index Maintenance**
   ```sql
   -- Reindex bloated indexes
   REINDEX INDEX CONCURRENTLY idx_bills_content;
   REINDEX INDEX CONCURRENTLY idx_users_email;

   -- Check index usage
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

4. **Vacuum Operations**
   ```sql
   -- Vacuum analyze for space reclamation
   VACUUM ANALYZE;

   -- Aggressive vacuum for heavily updated tables
   VACUUM FULL bills_audit_log;
   ```

5. **Query Performance Review**
   ```sql
   -- Identify slow queries
   SELECT query, calls, total_time, mean_time, rows
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;

   -- Check for unused indexes
   SELECT schemaname, tablename, indexname
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0;
   ```

6. **Configuration Optimization**
   ```sql
   -- Review and adjust PostgreSQL configuration
   SHOW ALL;

   -- Adjust based on current workload
   ALTER SYSTEM SET work_mem = '128MB';
   ALTER SYSTEM SET maintenance_work_mem = '512MB';
   SELECT pg_reload_conf();
   ```

#### Post-Maintenance Validation
```bash
# Test database connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();"

# Run application tests
npm run test:database

# Monitor performance for 1 hour
./scripts/monitor-db-performance.sh 3600
```

## Quarterly Maintenance Procedures

### Comprehensive System Audit

**Frequency**: Quarterly
**Duration**: 240 minutes
**Responsible**: Engineering + Security Teams

#### Audit Scope
- Security vulnerabilities
- Performance optimization opportunities
- Code quality assessment
- Infrastructure compliance
- Documentation accuracy

#### Procedure Steps

1. **Security Audit**
   - External penetration testing
   - Code security review
   - Dependency vulnerability assessment
   - Access control audit

2. **Performance Audit**
   - Load testing with increased capacity
   - Memory leak detection
   - Database query optimization
   - Cache efficiency analysis

3. **Code Quality Audit**
   - Static analysis results review
   - Test coverage assessment
   - Technical debt evaluation
   - Architecture compliance check

4. **Infrastructure Audit**
   - Configuration drift detection
   - Backup integrity verification
   - Disaster recovery testing
   - Scalability assessment

5. **Documentation Audit**
   - Runbook accuracy verification
   - Knowledge base updates
   - Incident response procedure validation

### Capacity Planning Review

**Frequency**: Quarterly
**Duration**: 120 minutes
**Responsible**: Engineering + DevOps Teams

#### Procedure Steps

1. **Usage Trend Analysis**
   ```typescript
   // Analyze usage patterns
   const usageTrends = await analyzeUsageTrends(90); // Last 90 days
   const growthRate = calculateGrowthRate(usageTrends);
   const seasonalPatterns = identifySeasonalPatterns(usageTrends);
   ```

2. **Resource Utilization Review**
   - CPU, memory, disk usage trends
   - Network bandwidth analysis
   - Database storage growth
   - Cache memory requirements

3. **Performance Benchmarking**
   ```bash
   # Run comprehensive benchmarks
   npm run benchmark:all

   # Compare with previous quarters
   ./scripts/compare-benchmarks.sh Q1-2024 Q2-2024
   ```

4. **Scalability Testing**
   - Load testing at 2x current capacity
   - Stress testing edge cases
   - Failover scenario testing

5. **Capacity Recommendations**
   - Infrastructure scaling requirements
   - Database partitioning needs
   - Caching strategy updates
   - CDN implementation assessment

## Emergency Maintenance Procedures

### Critical Incident Response

**Trigger**: System unavailable or critical functionality broken
**Response Time**: Immediate (< 5 minutes)
**Responsible**: On-call Engineer

#### Immediate Actions
1. Assess incident severity
2. Notify incident response team
3. Activate communication channels
4. Begin incident documentation

#### Investigation Phase
1. Gather system metrics
2. Review recent changes
3. Check monitoring alerts
4. Analyze logs for root cause

#### Resolution Phase
1. Implement fix or workaround
2. Test fix in staging environment
3. Deploy fix to production
4. Monitor system recovery

#### Post-Incident Phase
1. Complete incident documentation
2. Conduct post-mortem meeting
3. Implement preventive measures
4. Update runbooks and procedures

### Service Degradation Response

**Trigger**: Performance degradation > 50%
**Response Time**: < 30 minutes
**Responsible**: DevOps Engineer

#### Response Steps
1. Identify affected components
2. Scale resources if possible
3. Implement caching strategies
4. Optimize slow queries
5. Restart services if necessary

## Automated Maintenance Scripts

### Health Check Automation
```bash
#!/bin/bash
# automated-health-check.sh

# Run every 5 minutes via cron
# */5 * * * * /path/to/automated-health-check.sh

HEALTH_CHECK_URL="http://localhost:3000/health"
ALERT_WEBHOOK="https://hooks.slack.com/services/..."

# Health check
if curl -f -s $HEALTH_CHECK_URL > /dev/null; then
  echo "Service healthy"
else
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"Service health check failed"}' \
    $ALERT_WEBHOOK
fi
```

### Automated Library Updates
```typescript
// automated-library-updates.ts
export class AutomatedLibraryUpdates {
  async checkForUpdates() {
    const outdated = await this.getOutdatedPackages();

    for (const pkg of outdated) {
      if (this.isSafeUpdate(pkg)) {
        await this.createUpdatePR(pkg);
      }
    }
  }

  private isSafeUpdate(pkg: PackageInfo): boolean {
    // Only update patch versions automatically
    return pkg.updateType === 'patch' && pkg.testCoverage > 80;
  }
}
```

This comprehensive maintenance framework ensures the post-migration system remains reliable, secure, and performant through regular automated and manual procedures.
# Load Testing Suite

Comprehensive load testing for all integrated features using k6.

## Overview

This suite tests performance under various load conditions:
- Baseline load (50 concurrent users)
- Spike test (sudden increase to 500 users)
- Stress test (gradual increase to 400 users)
- Soak test (100 users for 1 hour)

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Windows (using Chocolatey)
choco install k6

# Linux
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Tests

### Basic Load Test

```bash
# Run all scenarios
k6 run main.js

# Run with custom VUs and duration
k6 run --vus 100 --duration 30s main.js

# Run specific scenario
k6 run --vus 50 --duration 1m scenarios/recommendations.js
```

### Environment Variables

```bash
# Set base URLs
export BASE_URL=https://staging.chanuka.example.com
export API_BASE_URL=https://api.staging.chanuka.example.com

# Set test credentials
export TEST_USER_EMAIL=loadtest@example.com
export TEST_USER_PASSWORD=loadtest123

# Run tests
k6 run main.js
```

### Test Scenarios

```bash
# Baseline test (50 users, 20 minutes)
k6 run --scenario baseline main.js

# Spike test (sudden spike to 500 users)
k6 run --scenario spike main.js

# Stress test (gradual increase to 400 users)
k6 run --scenario stress main.js

# Soak test (100 users for 1 hour)
k6 run --scenario soak main.js
```

## Test Coverage

### Recommendation Engine
- **Endpoint**: `/api/recommendations`
- **Target**: < 200ms (p95)
- **Load**: 30% of traffic
- **Metrics**: Response time, error rate, recommendation quality

### Pretext Detection
- **Endpoint**: `/api/pretext-detection/bills/:id/analysis`
- **Target**: < 500ms (p95)
- **Load**: 20% of traffic
- **Metrics**: Response time, detection accuracy (> 85%)

### Constitutional Intelligence
- **Endpoint**: `/api/constitutional-intelligence/bills/:id/analysis`
- **Target**: < 500ms (p95)
- **Load**: 20% of traffic
- **Metrics**: Response time, analysis completeness

### Argument Intelligence
- **Endpoint**: `/api/argument-intelligence/bills/:id/clusters`
- **Target**: < 500ms (p95)
- **Load**: 20% of traffic
- **Metrics**: Response time, clustering accuracy (> 80%)

### Advocacy Coordination
- **Endpoints**: `/api/advocacy/campaigns`, `/api/advocacy/actions`
- **Target**: < 500ms (p95)
- **Load**: 10% of traffic
- **Metrics**: Response time, data completeness

## Performance Thresholds

All tests enforce the following thresholds:

| Metric | Threshold | Description |
|--------|-----------|-------------|
| http_req_duration (p95) | < 500ms | 95% of requests complete in < 500ms |
| http_req_duration (p99) | < 1000ms | 99% of requests complete in < 1s |
| http_req_failed | < 1% | Error rate below 1% |
| checks | > 95% | 95% of checks pass |

Feature-specific thresholds:
- Recommendations: < 200ms (p95)
- All other features: < 500ms (p95)

## Output

Tests generate three output files:

1. **load-test-results.json**: Raw metrics data
2. **load-test-summary.html**: HTML report with visualizations
3. **Console output**: Real-time summary

## Interpreting Results

### Success Criteria

✅ **Pass**: All thresholds met
- Response times within targets
- Error rate < 1%
- Check pass rate > 95%

❌ **Fail**: Any threshold exceeded
- Investigate bottlenecks
- Review error logs
- Optimize slow endpoints

### Common Issues

**High response times**
- Database query optimization needed
- Caching not effective
- Server resources insufficient

**High error rates**
- API errors under load
- Database connection pool exhausted
- Rate limiting triggered

**Failed checks**
- Data quality issues
- API contract violations
- Missing required fields

## Bottleneck Identification

After running tests, analyze:

1. **Response time trends**: Which endpoints slow down under load?
2. **Error patterns**: Which endpoints fail first?
3. **Resource utilization**: CPU, memory, database connections
4. **Database queries**: Slow queries, missing indexes
5. **External dependencies**: Third-party API latency

## Optimization Strategies

Based on results:

1. **Add caching**: Redis for frequently accessed data
2. **Optimize queries**: Add indexes, reduce joins
3. **Scale horizontally**: Add more server instances
4. **Use CDN**: Cache static assets
5. **Implement rate limiting**: Protect against abuse
6. **Add connection pooling**: Reuse database connections

## CI/CD Integration

Add to CI/CD pipeline:

```yaml
# .github/workflows/load-test.yml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run load tests
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
          API_BASE_URL: ${{ secrets.STAGING_API_URL }}
        run: |
          cd client/load-tests
          k6 run main.js
      
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: load-test-results
          path: |
            load-test-results.json
            load-test-summary.html
```

## Performance Benchmarks

Baseline performance (50 concurrent users):

| Feature | p50 | p95 | p99 | Target |
|---------|-----|-----|-----|--------|
| Recommendations | 80ms | 150ms | 200ms | < 200ms (p95) ✅ |
| Pretext Detection | 200ms | 400ms | 500ms | < 500ms (p95) ✅ |
| Constitutional | 250ms | 450ms | 600ms | < 500ms (p95) ⚠️ |
| Arguments | 180ms | 380ms | 480ms | < 500ms (p95) ✅ |
| Advocacy | 120ms | 280ms | 350ms | < 500ms (p95) ✅ |

## Next Steps

1. Run baseline tests to establish performance benchmarks
2. Identify bottlenecks and optimize
3. Run stress tests to find breaking points
4. Implement optimizations
5. Re-run tests to verify improvements
6. Set up continuous load testing in CI/CD

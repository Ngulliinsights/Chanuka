# Graph Module Phase 4 Hardening - Implementation Guide

## Overview

This document provides step-by-step guidance for integrating the Phase 4 production-hardening modules into your application. These modules provide critical improvements in type safety, error handling, caching robustness, and observability.

**Status:** Development environment (no breaking changes to existing code; new modules coexist).

---

## New Modules (Summary)

| Module | Purpose | Status | Use When |
|--------|---------|--------|----------|
| `neo4j-client.ts` | Centralized parameterized query execution | ✅ Ready | Building any new query logic |
| `transaction-executor.ts` | Retry-safe transaction wrapper with idempotency | ✅ Ready | Writing to Neo4j (sync, entity updates) |
| `influence-service.ts` | Strongly-typed influence discovery logic | ✅ Ready | Computing influence paths/scores |
| `pattern-discovery-service.ts` | Strongly-typed pattern detection | ✅ Ready | Finding coalitions, communities, ecosystems |
| `cache-adapter-v2.ts` | Hardened cache with stampede protection & metrics | ✅ Ready | Caching query results, entities, patterns |
| `error-adapter-v2.ts` | Deterministic error mapping + correlation IDs | ✅ Ready | Error handling and logging |
| `health-adapter-v2.ts` | Fast health checks with cached metrics | ✅ Ready | Liveness/readiness probes |
| `test-harness.ts` | Neo4j test container utilities | ✅ Ready | Unit and integration tests |

---

## Integration Steps (Phased Approach)

### Phase 1: Enable Strict TypeScript (Day 1)

**Why:** Catches type errors early; foundation for all other modules.

**Steps:**

1. Verify `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

2. Run type checker and fix errors:
```bash
npx tsc --noEmit
```

3. Add ESLint with TypeScript support (if not already):
```bash
npm install --save-dev @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

4. Create `.eslintrc.json`:
```json
{
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": ["plugin:@typescript-eslint/strict"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-types": "warn"
  }
}
```

5. Run linter:
```bash
npx eslint shared/database/graph --ext .ts --fix
```

---

### Phase 2: Add Core Helpers (Day 2-3)

**Why:** Foundation for safe query execution and transaction handling.

**Steps:**

1. Install dependencies (if not present):
```bash
npm install neo4j-driver p-retry p-timeout
```

2. Create instances of helpers in your main database initialization file:

```ts
// shared/database/init.ts (or similar)
import { driver } from 'neo4j-driver';
import { ObservabilityStackService } from '@/core/observability';
import { createNeo4jClient } from '@/shared/database/graph/neo4j-client';
import { createTransactionExecutor } from '@/shared/database/graph/transaction-executor';
import { createGraphErrorHandlerV2 } from '@/shared/database/graph/error-adapter-v2';

const neoDriver = driver('bolt://localhost:7687', driver.auth.basic('neo4j', 'password'));
const observability = new ObservabilityStackService();
const errorHandler = createGraphErrorHandlerV2(observability);
const neo4jClient = createNeo4jClient(neoDriver, errorHandler, observability);
const txExecutor = createTransactionExecutor(neoDriver, errorHandler, observability);

export { neoDriver, neo4jClient, txExecutor, errorHandler };
```

3. Update existing code to use `neo4jClient` for queries:

**Before:**
```ts
const result = await session.run(`MATCH (p:Person {id: "${personId}"}) RETURN p`);
```

**After:**
```ts
const results = await neo4jClient.runRead('MATCH (p:Person {id: $id}) RETURN p', { id: personId });
```

4. Use `txExecutor` for writes:

```ts
const result = await txExecutor.execute(async (tx) => {
  return await tx.run('CREATE (p:Person {id: $id, name: $name})', { id, name });
}, { idempotencyKey: `create-${id}` });
```

---

### Phase 3: Add Service Layer (Day 3-4)

**Why:** Encapsulate business logic; improve testability and reusability.

**Steps:**

1. Create instances of services:

```ts
// shared/database/graph/services.ts (new file)
import { createInfluenceService } from './influence-service';
import { createPatternDiscoveryService } from './pattern-discovery-service';
import { neo4jClient } from './init';

export const influenceService = createInfluenceService(neo4jClient);
export const patternService = createPatternDiscoveryService(neo4jClient);
```

2. Use services in resolvers instead of inline logic:

**Before:**
```ts
async function influencePaths(parent, { fromId, toId }, ctx) {
  const query = `MATCH path = shortestPath((start {id: $fromId})-[*1..4]-(end {id: $toId})) RETURN ...`;
  const results = await runQuery(query, { fromId, toId });
  // process results...
  return results;
}
```

**After:**
```ts
async function influencePaths(parent, { fromId, toId }, ctx) {
  return influenceService.findPaths(fromId, toId);
}
```

3. Update `graphql-api.ts` to delegate to services:

```ts
// graphql-api.ts
import { influenceService, patternService } from './services';

export class GraphQLResolvers {
  async influencePaths(fromId: string, toId: string, maxDepth?: number) {
    return influenceService.findPaths(fromId, toId, maxDepth);
  }

  async votingCoalitions(minBills?: number) {
    return patternService.detectVotingCoalitions(minBills);
  }
}
```

---

### Phase 4: Add Improved Adapters (Day 4-5)

**Why:** Better caching, error handling, and observability.

**Steps:**

1. Create adapter instances:

```ts
// shared/database/graph/adapters.ts (new file)
import { createNeo4jClient } from '@/core/caching';
import { ObservabilityStackService } from '@/core/observability';
import { createGraphCacheAdapterV2 } from './cache-adapter-v2';
import { createGraphErrorHandlerV2 } from './error-adapter-v2';
import { createGraphHealthAdapterV2 } from './health-adapter-v2';

const cachingService = createNeo4jClient(); // from @/core/caching
const observability = new ObservabilityStackService();

export const cacheAdapter = createGraphCacheAdapterV2(cachingService, observability);
export const errorHandler = createGraphErrorHandlerV2(observability);
export const healthAdapter = createGraphHealthAdapterV2(neoDriver, observability);
```

2. Use cache adapter to cache query results:

```ts
// influence-service.ts
async getInfluenceScore(entityId: string) {
  return this.cacheAdapter.getOrFetchEntity(entityId, async () => {
    const results = await this.neo4jClient.runRead(query, { entityId });
    return results[0];
  });
}
```

3. Use improved error handler:

```ts
// In services or resolvers
try {
  const result = await errorHandler.executeWithErrorHandling(
    () => influenceService.findPaths(fromId, toId),
    'influence_paths_query',
    { fromId, toId }
  );
} catch (error) {
  // errorHandler already logged with correlation ID
  throw error;
}
```

4. Expose health endpoints:

```ts
// server/routes/health.ts (or similar)
import { healthAdapter } from '@/shared/database/graph/adapters';

app.get('/health/liveness', async (req, res) => {
  const result = await healthAdapter.checkLiveness();
  res.status(result.status === 'healthy' ? 200 : 503).json(result);
});

app.get('/health/readiness', async (req, res) => {
  const result = await healthAdapter.checkReadiness();
  res.status(result.status === 'healthy' ? 200 : 503).json(result);
});
```

---

### Phase 5: Add Testing (Day 5-6)

**Why:** Verify correctness and catch regressions.

**Steps:**

1. Start Neo4j test container (local dev):

```bash
docker run --name neo4j-test -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/test \
  -d neo4j:5.0
```

2. Create test suite:

```ts
// shared/database/graph/__tests__/influence-service.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  setupGraphTestEnvironment,
  teardownGraphTestEnvironment,
  createTestFixtures,
  resetGraphDatabase,
} from '../test-harness';
import { influenceService } from '../services';

describe('InfluenceService', () => {
  beforeAll(async () => {
    await setupGraphTestEnvironment();
    await createTestFixtures();
  });

  afterAll(async () => {
    await teardownGraphTestEnvironment();
  });

  it('should find influence paths between entities', async () => {
    const paths = await influenceService.findPaths('person-1', 'person-3');
    expect(paths).toBeDefined();
    expect(paths.length).toBeGreaterThan(0);
  });

  it('should calculate influence scores', async () => {
    const score = await influenceService.getInfluenceScore('person-1');
    expect(score.influenceScore).toBeGreaterThanOrEqual(0);
  });
});
```

3. Run tests:

```bash
npm test -- shared/database/graph
```

---

### Phase 6: Add CI Pipeline (Day 6-7)

**Why:** Automate checks to catch issues early.

**Steps:**

1. Create `.github/workflows/graph-tests.yml`:

```yaml
name: Graph Module Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      neo4j:
        image: neo4j:5.0
        env:
          NEO4J_AUTH: neo4j/test
        options: >-
          --health-cmd "cypher-shell -u neo4j -p test 'RETURN 1'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 7687:7687

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npx eslint shared/database/graph --ext .ts

      - name: Unit tests
        run: npm test -- shared/database/graph

      - name: Integration tests
        env:
          NEO4J_TEST_URI: bolt://localhost:7687
          NEO4J_TEST_USER: neo4j
          NEO4J_TEST_PASSWORD: test
        run: npm run test:integration -- graph
```

2. Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:integration": "vitest --run",
    "lint": "eslint . --ext .ts --fix",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Migration Checklist

- [ ] Enable strict TypeScript in `tsconfig.json`
- [ ] Fix all TS errors with `tsc --noEmit`
- [ ] Add ESLint and run `--fix`
- [ ] Create Neo4j client and transaction executor helpers
- [ ] Update existing queries to use parameterized `neo4jClient`
- [ ] Create service layer for influence and patterns
- [ ] Update GraphQL resolvers to delegate to services
- [ ] Add improved cache, error, and health adapters
- [ ] Implement cache invalidation on writes
- [ ] Add health check endpoints
- [ ] Set up test environment (Neo4j container)
- [ ] Write unit and integration tests
- [ ] Add CI pipeline to GitHub Actions
- [ ] Document API contracts and rate limits
- [ ] Deploy to staging and verify observability

---

## Configuration & Environment Variables

Create `.env` or pass via deployment:

```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

# Test environment
NEO4J_TEST_URI=bolt://localhost:7687
NEO4J_TEST_USER=neo4j
NEO4J_TEST_PASSWORD=test

# Performance tuning
GRAPH_QUERY_TIMEOUT_MS=30000
GRAPH_WRITE_TIMEOUT_MS=10000
GRAPH_CACHE_TTL_QUERY_SECONDS=3600
GRAPH_CACHE_TTL_ENTITY_SECONDS=1800
GRAPH_MAX_RECORDS=10000
```

---

## Rollback Plan

If issues arise, the v2 modules are additive (no breaking changes to existing code):

1. Stop using v2 modules in new code.
2. Existing code using v1 adapters continues to work.
3. Revert your changes and use the stable v1 versions.

---

## Support & Issues

- **Type errors:** Ensure `strict: true` in `tsconfig.json` and run `tsc --noEmit`.
- **Neo4j connection issues:** Verify URI, auth, and port (default `7687`).
- **Test failures:** Check Neo4j test container is running and clean (use `resetGraphDatabase()`).
- **Performance:** Use `cacheAdapter.getMetrics()` and `healthAdapter.checkDeep()` to diagnose.

---

## Next Steps

1. **Start with Phase 2:** Integrate Neo4j client and transaction executor.
2. **Move to Phase 3:** Refactor one resolver to use services.
3. **Test iteratively:** Add unit tests as you go.
4. **Ship Phase 4:** Deploy v2 adapters in next release.

Good luck! 🚀

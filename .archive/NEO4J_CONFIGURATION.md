# Neo4j Graph Database Configuration

## Overview

The Neo4j graph database provides relationship analysis, pattern discovery, and influence network capabilities for the Chanuka legislative platform. It operates as a complementary database to PostgreSQL, synchronizing data for advanced analytics.

## Environment Variables

Add these to your `.env` file:

```env
# Neo4j Connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_secure_password_here
NEO4J_DATABASE=neo4j

# Neo4j Port Configuration (docker-compose)
NEO4J_PORT=7687
NEO4J_BROWSER_PORT=7474

# Optional: Enable graph synchronization
GRAPH_SYNC_ENABLED=true
GRAPH_AUTO_SYNC_INTERVAL=60000  # ms
```

## Docker Setup

### Start Neo4j with Docker Compose

```bash
# Start Neo4j service only
docker-compose -f docker-compose.neo4j.yml up -d neo4j

# Or combine with your main compose file
docker-compose -f docker-compose.yml -f docker-compose.neo4j.yml up -d

# View logs
docker-compose -f docker-compose.neo4j.yml logs -f neo4j
```

### Browser Access

- **Neo4j Browser**: http://localhost:7474
- **Default credentials**: `neo4j` / `neo4j_password`

## Initialization

### 1. Initialize Graph Schema

```bash
npm run graph:init
```

This creates:
- Constraints for data integrity (unique IDs, emails, numbers)
- Indexes for query performance
- Database schema verification

### 2. Test Synchronization

```bash
npm run graph:sync-demo
```

This demonstrates:
- Person node creation
- Bill node creation
- Relationship creation (sponsorship)
- Database statistics

## Manual Cypher Queries

Access the Neo4j browser and run these queries:

### Check Database Health

```cypher
MATCH (n) RETURN count(n) as node_count LIMIT 1;
```

### Create Constraints (if not done via script)

```cypher
CREATE CONSTRAINT unique_person_id IF NOT EXISTS
FOR (p:Person) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT unique_bill_id IF NOT EXISTS
FOR (b:Bill) REQUIRE b.id IS UNIQUE;
```

### View Node Types

```cypher
MATCH (n) RETURN head(labels(n)) as type, count(*) as count GROUP BY type;
```

### View Relationship Types

```cypher
MATCH ()-[r]->() RETURN type(r) as type, count(*) as count GROUP BY type;
```

### Find Bill and Sponsors

```cypher
MATCH (p:Person)-[:SPONSORED]->(b:Bill)
RETURN p.name, b.title, b.status;
```

### Find Committee Memberships

```cypher
MATCH (p:Person)-[:MEMBER_OF]->(c:Committee)
RETURN p.name, c.name, c.chamber;
```

## Integration with Application

### Import and Use

```typescript
import {
  initializeNeo4jDriver,
  syncPersonToGraph,
  createSponsorshipRelationship,
} from '@server/infrastructure/database/graph';

// Initialize on app startup
initializeNeo4jDriver({
  uri: process.env.NEO4J_URI,
  username: process.env.NEO4J_USERNAME,
  password: process.env.NEO4J_PASSWORD,
});

// Sync data when it changes in PostgreSQL
const person = await db.query.people.findById(personId);
await syncPersonToGraph(person);

// Create relationships
await createSponsorshipRelationship(personId, billId, 'primary');
```

### Available Functions

#### Driver Management
- `initializeNeo4jDriver(config)` - Initialize connection
- `getNeo4jDriver()` - Get active driver
- `closeNeo4jDriver()` - Close connection
- `checkNeo4jConnectivity()` - Test connectivity

#### Queries
- `executeReadQuery(query, params)` - Read-only queries
- `executeWriteQuery(query, params)` - Write operations
- `executeTransaction(work)` - Transactional operations

#### Synchronization
- `syncEntity(label, entity)` - Sync single entity
- `syncEntities(label, entities)` - Sync multiple entities
- `syncRelationship(fromType, fromId, toType, toId, type, props)` - Create relationship
- `getEntity(label, id)` - Retrieve entity
- `countEntities(label)` - Count entities by type

#### Relationships (Helper Functions)
- `syncPersonToGraph(person)` - Sync person node
- `syncBillToGraph(bill)` - Sync bill node
- `syncCommitteeToGraph(committee)` - Sync committee node
- `createSponsorshipRelationship(personId, billId)` - Create sponsorship
- `createCommitteeMembershipRelationship(personId, committeeId)` - Create membership
- `createVotingRelationship(personId, billId, vote)` - Create voting relationship

## Schema Overview

### Node Types

**Person**
- id (unique)
- name
- type: mp | citizen | expert | official
- email (optional, unique)
- county
- party
- phone (optional)
- created_at, updated_at

**Organization**
- id (unique)
- name
- type: corporate | ngo | media | think_tank | government
- industry
- country
- created_at, updated_at

**Bill**
- id (unique)
- title
- number (unique)
- status
- chamber
- sponsor_id
- introduced_date
- created_at, updated_at

**Committee**
- id (unique)
- name
- chamber
- chair_id
- created_at, updated_at

**Topic**
- id (unique)
- name
- description
- category
- created_at, updated_at

**Argument**
- id (unique)
- type
- status
- claim
- evidence
- author_id
- bill_id
- created_at, updated_at

### Relationship Types

| Relationship | From | To | Purpose |
|---|---|---|---|
| SPONSORED | Person | Bill | Track bill sponsorship |
| MEMBER_OF | Person | Committee | Committee membership |
| ASSIGNED_TO | Bill | Committee | Committee assignment |
| MENTIONS_TOPIC | Bill | Topic | Topic coverage |
| ABOUT | Argument | Bill | Argument submission |
| HAS_FINANCIAL_INTEREST | Person | Organization | Financial disclosure |
| VOTED | Person | Bill | Voting record |
| VOTING_COALITION | Person | Person | Voting alignment |
| AFFILIATED_WITH | Person | Organization | Organization affiliation |
| REFERENCES | Bill | Organization | Document references |

## Performance Considerations

### Indexes

Automatically created for:
- Person: name, type, county, party
- Organization: name, type
- Bill: status, chamber, introduced_date, number
- Committee: chamber
- Topic: name
- Argument: type, status

### Memory Configuration

Default in docker-compose:
- Heap: 512MB - 1GB
- Page cache: 512MB

Adjust for your environment:

```yaml
environment:
  - NEO4J_server_memory_heap_initial__size=2g
  - NEO4J_server_memory_heap_max__size=4g
  - NEO4J_server_memory_pagecache_size=2g
```

### Query Optimization

1. Always use indexed properties in WHERE clauses
2. Limit result sets with LIMIT
3. Use EXPLAIN/PROFILE to analyze queries
4. Cache frequent relationship traversals

## Troubleshooting

### Connection Issues

```bash
# Test connectivity
npm run graph:test

# Check Neo4j logs
docker-compose -f docker-compose.neo4j.yml logs neo4j
```

### Authentication Errors

Verify credentials in `.env`:
```bash
# Reset Neo4j password
docker exec chanuka-neo4j cypher-shell -u neo4j -p neo4j_password \
  "ALTER USER neo4j SET PASSWORD 'new_password'"
```

### Memory Issues

```bash
# Check Neo4j memory usage
docker stats chanuka-neo4j

# Increase memory in docker-compose.neo4j.yml
```

### Data Consistency

```cypher
# Check for orphaned relationships
MATCH (a)-[r]->(b) WHERE a IS NULL OR b IS NULL
RETURN count(r) as orphaned_relationships;
```

## Monitoring

### Query Metrics

```cypher
CALL db.stats.clear();
CALL dbms.queryJmx("org.neo4j:instance=kernel#0,name=Transactions")
YIELD attributes RETURN attributes;
```

### Database Health

```cypher
SHOW DATABASES;
CALL db.stats();
SHOW CONSTRAINTS;
SHOW INDEXES;
```

## Next Steps (Phase 2+)

1. **Data Synchronization Service** - Auto-sync PostgreSQL changes
2. **Influence Scoring** - PageRank-based influence calculation
3. **Pattern Detection** - Coalition and relationship discovery
4. **Predictive Models** - Bill passage prediction
5. **Real-time Monitoring** - Anomaly detection
6. **API Integration** - GraphQL endpoints for relationships

See [graph_database_strategy.md](./shared/docs/graph_database_strategy.md) for detailed Phase 2+ planning.

## Resources

- [Neo4j Documentation](https://neo4j.com/docs/)
- [Cypher Query Language](https://neo4j.com/docs/cypher-manual/current/)
- [Neo4j Browser Guide](https://neo4j.com/docs/browser-manual/current/)
- [Graph Algorithms](https://neo4j.com/docs/graph-data-science/current/)

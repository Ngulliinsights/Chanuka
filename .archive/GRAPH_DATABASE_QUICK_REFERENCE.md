# Graph Database Quick Reference

## 🚀 Getting Started (5 minutes)

### Step 1: Start Neo4j
```bash
npm run graph:start
```

### Step 2: Initialize Schema
```bash
npm run graph:init
```

### Step 3: Test Synchronization
```bash
npm run graph:sync
```

### Step 4: Access Browser
Visit: `http://localhost:7474`  
User: `neo4j`  
Password: (from your `.env` NEO4J_PASSWORD)

---

## 📋 Available Commands

```bash
npm run graph:init       # Setup schema, constraints, indexes
npm run graph:sync       # Demo: sync sample data
npm run graph:test       # Full test: init + sync
npm run graph:start      # Start Docker container
npm run graph:stop       # Stop Docker container
npm run graph:logs       # View Neo4j logs
npm run graph:shell      # Interactive Cypher shell
```

---

## 📊 Common Cypher Queries

### Node Counts by Type
```cypher
MATCH (n) RETURN head(labels(n)) as type, count(*) as count GROUP BY type;
```

### All Relationships
```cypher
MATCH ()-[r]->() RETURN type(r) as type, count(*) as count GROUP BY type;
```

### Find Bills and Sponsors
```cypher
MATCH (p:Person)-[:SPONSORED]->(b:Bill)
RETURN p.name, b.title, b.status;
```

### Find Committee Members
```cypher
MATCH (p:Person)-[:MEMBER_OF]->(c:Committee)
RETURN p.name, c.name, c.chamber;
```

### Find People's Financial Interests
```cypher
MATCH (p:Person)-[:HAS_FINANCIAL_INTEREST]->(o:Organization)
RETURN p.name, o.name, r.type;
```

### Find Voting Patterns
```cypher
MATCH (p:Person)-[v:VOTED]->(b:Bill)
RETURN p.name, b.number, v.vote LIMIT 20;
```

### Find Arguments About Bills
```cypher
MATCH (a:Argument)-[:ABOUT]->(b:Bill)
RETURN a.claim, b.title, a.status;
```

---

## 🔧 Environment Setup

Add to `.env`:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_secure_password
NEO4J_DATABASE=neo4j
NEO4J_PORT=7687
NEO4J_BROWSER_PORT=7474
```

---

## 💻 TypeScript Integration

### Import Functions
```typescript
import {
  initializeNeo4jDriver,
  syncPersonToGraph,
  createSponsorshipRelationship,
  executeReadQuery,
} from '@server/infrastructure/database/graph';
```

### Initialize on App Startup
```typescript
initializeNeo4jDriver({
  uri: process.env.NEO4J_URI,
  username: process.env.NEO4J_USERNAME,
  password: process.env.NEO4J_PASSWORD,
});
```

### Sync Data
```typescript
// Sync a person
await syncPersonToGraph({
  id: 'person-123',
  name: 'John Doe',
  type: 'mp',
  county: 'Nairobi',
  party: 'Party Name',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// Create relationship
await createSponsorshipRelationship('person-123', 'bill-456', 'primary');
```

### Run Queries
```typescript
const result = await executeReadQuery(
  'MATCH (b:Bill) RETURN b.title, b.status'
);

console.log(result.records);
```

---

## 🏗️ Node & Relationship Types

### Node Types
- **Person** - MPs, citizens, experts
- **Organization** - Companies, NGOs, media
- **Bill** - Legislative items
- **Committee** - Parliamentary committees
- **Topic** - Issue areas
- **Argument** - Arguments & evidence

### Relationship Types
- **SPONSORED** - Person → Bill
- **MEMBER_OF** - Person → Committee
- **ASSIGNED_TO** - Bill → Committee
- **MENTIONS_TOPIC** - Bill → Topic
- **ABOUT** - Argument → Bill
- **HAS_FINANCIAL_INTEREST** - Person → Organization
- **VOTED** - Person → Bill
- **VOTING_COALITION** - Person → Person
- **AFFILIATED_WITH** - Person → Organization
- **REFERENCES** - Bill → Organization

---

## 🔍 Monitoring

### Check Database Health
```cypher
RETURN 1 as test;
```

### View Node Count
```cypher
MATCH (n) RETURN count(n) as total;
```

### View Indexes
```cypher
SHOW INDEXES;
```

### View Constraints
```cypher
SHOW CONSTRAINTS;
```

### Check Memory Usage
```bash
docker stats chanuka-neo4j
```

---

## 🛠️ Troubleshooting

### Neo4j Won't Start
```bash
# Check logs
npm run graph:logs

# Reset container
npm run graph:stop
npm run graph:start
```

### Connection Failed
```bash
# Verify credentials in .env
# Test connection
npm run graph:test
```

### Database Locked
```cypher
# In Neo4j browser, check active transactions
CALL dbms.listTransactions()
```

### Clear All Data (Development Only)
```cypher
MATCH (n) DETACH DELETE n;
```

---

## 📚 Documentation

- Full guide: `NEO4J_CONFIGURATION.md`
- Implementation: `GRAPH_DATABASE_IMPLEMENTATION_PHASE1.md`
- Strategy (Phases 2-4): `shared/docs/graph_database_strategy.md`

---

## 📝 API Reference

### Driver Management
```typescript
initializeNeo4jDriver(config)    // Initialize
getNeo4jDriver()                 // Get instance
closeNeo4jDriver()               // Close
checkNeo4jConnectivity()         // Test connection
getNeo4jStats()                  // Database stats
```

### Entity Operations
```typescript
syncEntity(label, entity)                    // Sync single
syncEntities(label, entities)                // Sync multiple
getEntity(label, id)                         // Retrieve
getEntities(label, limit)                    // Get all
countEntities(label)                         // Count
deleteEntity(label, id)                      // Delete
```

### Relationship Operations
```typescript
syncRelationship(fromType, fromId, toType, toId, type, props)
createSponsorshipRelationship(personId, billId)
createCommitteeMembershipRelationship(personId, committeeId)
createVotingRelationship(personId, billId, vote)
// ... and 7 more relationship helpers
```

### Query Execution
```typescript
executeReadQuery(query, params)              // Read
executeWriteQuery(query, params)             // Write
executeTransaction(work)                     // Transaction
```

---

## ⚡ Performance Tips

1. **Use indexes**: Always filter by indexed properties
2. **Limit results**: Add LIMIT to queries
3. **Use EXPLAIN**: Check query plans
4. **Cache relationships**: Results are fast
5. **Batch operations**: Sync multiple entities at once

---

## 🔐 Security

- Unique constraints prevent duplicates
- Transaction support ensures consistency
- Password in `.env` (not committed)
- Health checks monitor availability
- Query timeout set to 30 seconds

---

## 📈 Next Steps

1. **Sync PostgreSQL data** → Write integration service
2. **Run relationship queries** → Build analytics
3. **Implement algorithms** → Pattern detection
4. **Create API endpoints** → GraphQL/REST
5. **Build dashboard** → Visualize networks

---

**Status**: ✅ Production-Ready  
**Last Updated**: January 8, 2026  
**Questions?** See `NEO4J_CONFIGURATION.md` or `GRAPH_DATABASE_IMPLEMENTATION_PHASE1.md`

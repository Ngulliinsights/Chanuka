# Phase 2: Quick Reference & Common Tasks

**Last Updated:** January 8, 2026  
**Status:** ✅ Production-Ready

---

## Quick Start (5 Minutes)

### 1. Start Neo4j (if not running)
```bash
npm run graph:start
# Wait for: "Neo4j started successfully"
```

### 2. Initialize Schema
```bash
npm run graph:init
# Creates Phase 1 + Phase 2 schema
```

### 3. Test Pattern Discovery
```bash
npm run graph:discover-patterns
# Shows: Coalitions, Communities, Influencers
```

---

## Common Tasks

### Find Voting Coalitions

**What it does:** Identifies groups of representatives voting together >75% of the time

**How to use:**
```typescript
import { detectVotingCoalitions } from '@/shared/database/graph';

const coalitions = await detectVotingCoalitions(3); // Min 3 members

coalitions.forEach(coalition => {
  console.log(`${coalition.member_count} members, ${(coalition.cohesion_score * 100).toFixed(1)}% cohesion`);
});
```

**Output:**
```
12 members, 85.3% cohesion
8 members, 78.2% cohesion
6 members, 76.5% cohesion
```

### Detect Political Communities

**What it does:** Discovers natural groupings of representatives based on voting and professional networks

**How to use:**
```typescript
import { detectPoliticalCommunities } from '@/shared/database/graph';

const communities = await detectPoliticalCommunities(5); // Min 5 members

communities.forEach(community => {
  console.log(`Community: ${community.size} members, ${(community.density * 100).toFixed(1)}% density`);
});
```

**Output:**
```
Community: 23 members, 43.2% density
Community: 18 members, 38.7% density
Community: 12 members, 45.3% density
```

### Find How Organizations Influence Committees

**What it does:** Shows the path(s) organizations use to influence policy decisions

**How to use:**
```typescript
import { findInfluencePaths } from '@/shared/database/graph';

const paths = await findInfluencePaths(organizationId, committeeId, 4);

paths.forEach(path => {
  const route = path.path.map(n => n.entity_name).join(' → ');
  console.log(`${route} (confidence: ${(path.confidence * 100).toFixed(0)}%)`);
});
```

**Output:**
```
American Hospital Assoc → Dr. Johnson → Health Committee (confidence: 92%)
American Hospital Assoc → James Smith → Health Committee (confidence: 81%)
American Hospital Assoc → AARP → Dr. Johnson → Health Committee (confidence: 67%)
```

### Find Key Influencers

**What it does:** Ranks people/organizations by network importance

**How to use:**
```typescript
import { findKeyInfluencers } from '@/shared/database/graph';

const influencers = await findKeyInfluencers('Person', 10);

influencers.forEach((person, idx) => {
  console.log(`${idx + 1}. ${person.name} (${person.centralityScore} connections)`);
});
```

**Output:**
```
1. Rep. John Smith (47 connections)
2. Sen. Jane Doe (43 connections)
3. Rep. Mike Johnson (39 connections)
4. Dr. Sarah Williams (36 connections)
5. Rep. Tom Brown (35 connections)
```

### Check Financial Conflicts on Bills

**What it does:** Shows organizations with financial interests in bill committee members

**How to use:**
```typescript
import { findFinancialInfluencePatterns } from '@/shared/database/graph';

const patterns = await findFinancialInfluencePatterns(billId);

patterns.forEach(pattern => {
  console.log(`
    ${pattern.organization.name}
    Interest: ${pattern.interest_type}
    Through: ${pattern.connected_person.name} (${pattern.relevant_committee.name})
  `);
});
```

**Output:**
```
Pharmaceutical Corp
  Interest: directorship
  Through: Dr. Smith (Health Committee)

Tech Industry Alliance
  Interest: investment
  Through: Rep. Johnson (Commerce Committee)
```

### Analyze Influence on a Specific Bill

**What it does:** Shows all the ways various entities influence a specific bill

**How to use:**
```typescript
import { analyzeBillInfluenceFlow } from '@/shared/database/graph';

const flows = await analyzeBillInfluenceFlow(billId);

flows.forEach((paths, organizationId) => {
  console.log(`\nOrganization: ${paths[0].path[0].entity_name}`);
  paths.slice(0, 3).forEach(path => {
    console.log(`  → ${path.path.map(n => n.entity_name).slice(1).join(' → ')}`);
  });
});
```

**Output:**
```
Organization: America's Energy Alliance

  → John Smith → Energy Committee
  → Jane Doe → Energy Committee
  → Trade Association → John Smith → Energy Committee
```

---

## Advanced Pattern Queries

### Run Pre-built Analysis Queries

Phase 2 includes 12 pre-built query templates in `advanced-queries.ts`:

```typescript
import {
  QUERY_LOBBYING_COORDINATION,
  QUERY_MONEY_FLOW,
  QUERY_REVOLVING_DOOR
} from '@/shared/database/graph';

// These are Cypher query strings ready to execute
const cypher = QUERY_LOBBYING_COORDINATION;

const result = await executeReadQuery(cypher, {
  billId: 'bill_123'
});
```

**Available Queries:**
- `QUERY_INFLUENCE_CHAIN` - Full org-to-bill path
- `QUERY_REVOLVING_DOOR` - People switching sectors
- `QUERY_LOBBYING_COORDINATION` - Multiple orgs on same bill
- `QUERY_MONEY_FLOW` - Donor → Politician → Bill
- `QUERY_OPINION_LEADERS` - Expert influencers
- `QUERY_MEDIA_NARRATIVE` - Media tone analysis
- `QUERY_CROSS_PARTY_COORDINATION` - Bipartisan alliances
- `QUERY_INDUSTRY_IMPACT_ANALYSIS` - Economic impact
- `QUERY_HIDDEN_CONNECTIONS` - Non-obvious links
- `QUERY_VOTE_PREDICTION_BASIS` - Voting patterns
- `QUERY_SECTOR_INFLUENCE_TIMELINE` - Influence trends
- `QUERY_COMMITTEE_COMPOSITION_ANALYSIS` - Committee effects

---

## Creating Advanced Relationships

### Add Financial Interest

```typescript
import { createOrUpdateFinancialInterest } from '@/shared/database/graph';

await createOrUpdateFinancialInterest(personId, orgId, {
  type: 'directorship', // or: investment, consulting, ownership
  value_range: '$500k - $1M',
  percentage: 5, // ownership percentage
  verified: true,
  source: 'public_disclosure', // or: media_report, internal
  disclosure_date: '2024-01-15'
});
```

### Add Lobbying Record

```typescript
import { createOrUpdateLobbyingRelationship } from '@/shared/database/graph';

await createOrUpdateLobbyingRelationship(orgId, personId, {
  amount_spent: 250000,
  period: '2024-Q1',
  issues: ['healthcare', 'regulation'],
  registered: true,
  registration_date: '2024-01-01'
});
```

### Add Campaign Contribution

```typescript
import { createCampaignContributionRelationship } from '@/shared/database/graph';

await createCampaignContributionRelationship(donorId, recipientId, {
  amount: 5000,
  date: '2024-03-15',
  type: 'individual', // or: corporate, pac, foreign
  reported: true
});
```

### Add Voting Coalition

```typescript
import { createOrUpdateVotingCoalition } from '@/shared/database/graph';

await createOrUpdateVotingCoalition(personId1, personId2, {
  strength: 47, // number of bills voted together
  agreement_rate: 0.85, // 85% agreement
  last_vote_date: '2024-03-20'
});
```

### Add Professional Network

```typescript
import { createProfessionalNetworkRelationship } from '@/shared/database/graph';

await createProfessionalNetworkRelationship(personId1, personId2, 'colleague', '2020-01-01');
// Types: colleague, mentor, mentee, collaborator
```

---

## Data Synchronization

### Sync All Advanced Relationships

```typescript
import { batchSyncAdvancedRelationships } from '@/shared/database/graph';

const changes = [
  {
    table: 'lobbying_records',
    operation: 'INSERT',
    id: 'rec_123',
    data: { organization_id: 'org_456', person_id: 'per_789', amount_spent: 250000 },
    timestamp: new Date()
  }
  // ... more changes
];

const result = await batchSyncAdvancedRelationships(changes);
console.log(`Synced ${result.total} relationships`);
```

**Returns:**
```typescript
{
  total: 47,
  financialInterests: 10,
  lobbyingRecords: 15,
  campaignContributions: 8,
  mediaInfluence: 6,
  votingCoalitions: 5,
  professionalNetworks: 3,
  policyInfluence: 0
}
```

### Sync Individual Relationship Type

```typescript
import { syncFinancialInterests, syncLobbyingRelationships } from '@/shared/database/graph';

const financialCount = await syncFinancialInterests(events);
console.log(`Synced ${financialCount} financial interests`);

const lobbyingCount = await syncLobbyingRelationships(events);
console.log(`Synced ${lobbyingCount} lobbying records`);
```

### Auto-Calculate Voting Coalitions

```typescript
import { calculateAndSyncVotingCoalitions } from '@/shared/database/graph';

const count = await calculateAndSyncVotingCoalitions();
console.log(`Updated ${count} voting coalitions`);

// Run this periodically:
setInterval(() => calculateAndSyncVotingCoalitions(), 24 * 60 * 60 * 1000); // Daily
```

---

## Troubleshooting

### Issue: "No results from pattern discovery"

**Causes:**
1. Neo4j not running
2. Phase 1 synchronization incomplete
3. No data in Neo4j

**Solution:**
```bash
npm run graph:start              # Start Neo4j
npm run graph:init              # Initialize schema
npm run graph:sync              # Sync Phase 1 data
npm run graph:discover-patterns # Try again
```

### Issue: "Coalition detection returns empty"

**Causes:**
1. No voting data in Neo4j
2. minCoalitionSize too high
3. Voting patterns not synced

**Solution:**
```typescript
// Lower the minimum size
const coalitions = await detectVotingCoalitions(2); // was 3

// Check if voting data exists
const votes = await executeReadQuery(`
  MATCH (p:Person)-[v:VOTED]->() 
  RETURN count(v) as voteCount
`);
console.log(`Found ${votes} votes`);
```

### Issue: "Type errors on Phase 2 imports"

**Solution:**
```typescript
// ✅ CORRECT
import { findInfluencePaths } from '@/shared/database/graph';

// ❌ WRONG
import { findInfluencePaths } from '@/shared/database/graph/pattern-discovery';
```

### Issue: "Synchronization is slow"

**Solution:**
```typescript
// Use batch operations
const result = await batchSyncAdvancedRelationships(allEvents);

// Instead of
for (const event of allEvents) {
  await syncFinancialInterests([event]); // Slow - loops
}
```

---

## Performance Tips

### 1. Batch Synchronization
```typescript
// Good: 1 operation
await batchSyncAdvancedRelationships(1000 events);

// Bad: 1000 operations
events.forEach(event => await syncFinancialInterests([event]));
```

### 2. Limit Query Results
```typescript
// Good: limit results
const paths = await findInfluencePaths(org, committee, 4);
// Returns max 10 paths

// Check for large result sets
const influencers = await findKeyInfluencers('Person', 100); // Can be slow
```

### 3. Cache Results
```typescript
// Cache coalition detection (expensive operation)
const cachedCoalitions = new Map();

async function getCoalitions() {
  if (!cachedCoalitions.has('all')) {
    const coalitions = await detectVotingCoalitions(3);
    cachedCoalitions.set('all', coalitions);
  }
  return cachedCoalitions.get('all');
}

// Update cache daily
setInterval(() => cachedCoalitions.clear(), 24 * 60 * 60 * 1000);
```

### 4. Optimize Neo4j Settings
```yaml
# docker-compose.neo4j.yml
environment:
  NEO4J_dbms_memory_heap_maxSize: 4G
  NEO4J_dbms_memory_pagecache_size: 2G
  NEO4J_db_transaction_state_max_entry_size: 1M
```

---

## Integration Examples

### Use in React Component

```typescript
import { useEffect, useState } from 'react';
import { findKeyInfluencers } from '@/shared/database/graph';

export function InfluencersWidget() {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    findKeyInfluencers('Person', 10)
      .then(setInfluencers)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {influencers.map(person => (
        <li key={person.id}>
          {person.name} ({person.centralityScore} connections)
        </li>
      ))}
    </ul>
  );
}
```

### Use in API Endpoint

```typescript
import { Router } from 'express';
import { detectVotingCoalitions } from '@/shared/database/graph';

const router = Router();

router.get('/api/coalitions', async (req, res) => {
  const minSize = parseInt(req.query.minSize) || 3;
  const coalitions = await detectVotingCoalitions(minSize);
  
  res.json({
    count: coalitions.length,
    coalitions: coalitions.map(c => ({
      members: c.member_count,
      cohesion: (c.cohesion_score * 100).toFixed(1) + '%',
      strength: c.coalition_strength
    }))
  });
});

export default router;
```

### Use in Background Job

```typescript
import { CronJob } from 'cron';
import { calculateAndSyncVotingCoalitions } from '@/shared/database/graph';

// Run every day at 2 AM
const job = new CronJob('0 2 * * *', async () => {
  console.log('Updating voting coalitions...');
  const updated = await calculateAndSyncVotingCoalitions();
  console.log(`Updated ${updated} coalitions`);
});

job.start();
```

---

## Related Documentation

- [Phase 1 Implementation](./GRAPH_DATABASE_IMPLEMENTATION_PHASE1.md)
- [Full Phase 2 Guide](./GRAPH_DATABASE_IMPLEMENTATION_PHASE2.md)
- [Neo4j Configuration](./NEO4J_CONFIGURATION.md)
- [Getting Started](./GRAPH_DATABASE_GETTING_STARTED.md)

---

**Last Updated:** January 8, 2026 ✅

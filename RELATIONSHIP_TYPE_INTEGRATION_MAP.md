# Relationship Type Integration Map

**Complete Overview of Original + Phase 3 Relationship Types**

---

## Layer-by-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISCOVERY LAYER (Phase 3)                    │
│                                                                  │
│  Algorithms discovering patterns in relationship networks       │
│  - detectAmendmentCoalitions()                                 │
│  - detectPatronageNetworks()                                   │
│  - mapSentimentClusters()                                      │
│  - 10 more discovery algorithms...                             │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│                  PHASE 3 RELATIONSHIP LAYER                     │
│                                                                  │
│  Parliamentary (6)        Institutional (5)    Engagement (5)  │
│  ├─ Amendments            ├─ Appointments      ├─ Comments     │
│  ├─ Committees            ├─ Ethnic            ├─ Campaigns    │
│  ├─ Readings              ├─ Tenders           ├─ Actions      │
│  ├─ Versions              ├─ Education         ├─ Engagement   │
│  ├─ Sponsorship           ├─ Careers           └─ Influence    │
│  └─ Dependencies          └─ (Enhanced)                         │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 1 ORIGINAL RELATIONSHIP LAYER                │
│                                                                  │
│  Sponsorship | Committee | Bill Assignment | Topic Mention    │
│  Arguments   | Financial | Voting          | Voting Coalition │
│  Affiliation | Document References                           │
│                                                                  │
│  (Foundation - still active, enhanced by Phase 3)             │
└─────────────────────────────────────────────────────────────────┘
                              ↑
┌─────────────────────────────────────────────────────────────────┐
│                      NODE LAYER (Phase 1)                       │
│                                                                  │
│  Person | Bill | Committee | Topic | Argument                 │
│  Organization | Issue | Debate                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Relationship Type Hierarchy

### Level 1: Core Relationships (Phase 1)

These establish basic connections:

```
SPONSORSHIP RELATIONSHIP
├─ Person SPONSORS Bill
├─ Direct influence mapping
└─ Used by:
   ├─ Phase 3: Sponsorship Networks
   ├─ Discovery: findSponsorshipPatterns()
   └─ Query: sponsorshipNetwork()

COMMITTEE MEMBERSHIP RELATIONSHIP
├─ Person MEMBER_OF Committee
├─ Organizational structure mapping
└─ Used by:
   ├─ Phase 3: Committee Review Journeys
   ├─ Discovery: analyzeCommitteeBottlenecks()
   └─ Query: committeePath()

BILL ASSIGNMENT RELATIONSHIP
├─ Bill ASSIGNED_TO Committee
├─ Process flow mapping
└─ Used by:
   ├─ Phase 3: Committee Review Journeys
   ├─ Discovery: analyzeCommitteeBottlenecks()
   └─ Query: billEvolutionPath()

TOPIC MENTION RELATIONSHIP
├─ Bill ADDRESSES_TOPIC Topic
├─ Issue tracking
└─ Used by:
   ├─ Phase 3: Sentiment Clusters
   ├─ Discovery: mapSentimentClusters()
   └─ Query: sentimentMap()

ARGUMENT RELATIONSHIP
├─ Argument ARGUES_FOR/AGAINST Bill
├─ Position mapping
└─ Used by:
   ├─ Phase 3: Comment Networks
   ├─ Discovery: mapSentimentClusters()
   └─ Query: sentimentMap()

VOTING RELATIONSHIP
├─ Person VOTES_ON Bill
├─ Vote recording
└─ Used by:
   ├─ Phase 3: Session Participation
   ├─ Discovery: detectAmendmentCoalitions()
   └─ Query: sessionParticipation()

And 4 more core types...
```

### Level 2: Phase 3 Enhancements

These explore deeper patterns:

```
AMENDMENT NETWORKS
├─ Built on: Bill data + changes
├─ Creates: Amendment MODIFIES Bill, CONFLICTS_WITH Amendment
├─ Purpose: Discover legislative patterns
└─ Discovery: detectAmendmentCoalitions()

COMMITTEE REVIEW JOURNEYS
├─ Built on: Bill ASSIGNED_TO Committee + person MEMBER_OF
├─ Creates: Committee REVIEWS Bill, ROUTES_TO Committee
├─ Purpose: Find bottlenecks
└─ Discovery: analyzeCommitteeBottlenecks()

SPONSORSHIP NETWORKS
├─ Built on: Person SPONSORS Bill
├─ Creates: Co-sponsorship patterns
├─ Purpose: Find collaboration patterns
└─ Discovery: findSponsorshipPatterns()

PATRONAGE NETWORKS
├─ Built on: Appointment records + votes
├─ Creates: Patron CLIENT_OF Patron chains
├─ Purpose: Detect elite circulation
└─ Discovery: detectPatronageNetworks()

ETHNIC NETWORKS
├─ Built on: Constituency data + voting patterns
├─ Creates: Ethnic GROUP_FROM Constituency
├─ Purpose: Analyze representation
└─ Discovery: analyzeEthnicRepresentation()

And 10 more Phase 3 types...
```

---

## Data Flow: How They Connect

### Example 1: Bill Sponsorship Analysis

```
PostgreSQL Data
    ↓
Phase 1: Person SPONSORS Bill (original relationship)
    ↓
    Creates nodes and basic links
    Person(name=John, party=Democratic)
        ↓
    SPONSORS (relationship)
        ↓
    Bill(number=H.123, title=Healthcare Reform)
    ↓
Phase 3: Sponsorship Networks Enhancement
    ↓
    createSponsorshipNetwork()
    ├─ Identifies other sponsors
    ├─ Links co-sponsors
    ├─ Maps policy focus areas
    └─ Creates collaboration links
    ↓
Discovery: findSponsorshipPatterns()
    ↓
Results:
    - Coalition members: [John, Mary, Frank]
    - Policy focus: Healthcare
    - Co-sponsorship alliances: [Healthcare Coalition]
    - Activity level: 15 bills sponsored
    ↓
Query: sponsorshipNetwork(personId)
    ↓
Returns: Full sponsorship ecosystem
```

### Example 2: Committee Bottleneck Analysis

```
PostgreSQL Data
    ↓
Phase 1: Bill ASSIGNED_TO Committee (original)
        + Person MEMBER_OF Committee (original)
    ↓
    Creates:
    Bill(H.456) → ASSIGNED_TO → Committee(Healthcare)
    Person(John) → MEMBER_OF → Committee(Healthcare)
    ↓
Phase 3: Committee Review Journeys Enhancement
    ↓
    createCommitteeReviewJourney()
    ├─ Tracks journey through committees
    ├─ Records review duration
    ├─ Identifies decision points
    └─ Maps routing paths
    ↓
Discovery: analyzeCommitteeBottlenecks()
    ↓
Results:
    - Bottleneck: Healthcare Committee
    - Avg duration: 120 days
    - Bills stuck: 5
    - Chair person: John Smith
    ↓
Query: committeePath(billId)
    ↓
Returns: Full journey with timing
```

### Example 3: Patronage Network Analysis

```
PostgreSQL Data
    ↓
Phase 1: Person AFFILIATED_WITH Organization (original)
        + Appointment records
    ↓
    Creates:
    Person(John) → AFFILIATED_WITH → Ministry(Finance)
    Person(Mary) → AFFILIATED_WITH → Ministry(Finance)
    ↓
Phase 3: Institutional Networks Enhancement
    ↓
    createAppointmentNetwork()
    ├─ Links appointment sequences
    ├─ Identifies patron-client relationships
    ├─ Tracks career paths
    └─ Scores corruption risk
    ↓
Discovery: detectPatronageNetworks()
    ↓
Results:
    - Patronage head: John Smith
    - Chain length: 4 hops
    - Members: [Mary, Frank, Susan]
    - Risk score: 0.78 (high)
    ↓
Query: patronageChain(personId)
    ↓
Returns: Full patronage structure
```

---

## Coverage Map

### Original Types Distribution

```
Legislative Process
├─ Sponsorship ✅
├─ Committee Membership ✅
├─ Bill Assignment ✅
└─ Voting ✅

Content Analysis
├─ Topic Mention ✅
├─ Arguments ✅
└─ Document Reference ✅

Political Economy
├─ Financial Interest ✅
├─ Affiliation ✅
└─ Voting Coalition ✅
```

### Phase 3 Types Distribution

```
Parliamentary Process (6 types)
├─ Amendments ✅
├─ Committee Journeys ✅
├─ Session Participation ✅
├─ Version Evolution ✅
├─ Sponsorship Networks ✅
└─ Dependencies ✅

Institutional Networks (5 types)
├─ Appointments ✅
├─ Ethnic Representation ✅
├─ Tenders/Infrastructure ✅
├─ Education/Professional ✅
└─ Career Transitions ✅

Engagement Networks (5 types)
├─ Comments/Sentiment ✅
├─ Campaign Participation ✅
├─ Action Items ✅
├─ Constituency Engagement ✅
└─ Influence/Trust ✅
```

---

## Relationship Overlap & Complementarity

### Where Phase 3 Extends Phase 1

| Original Type | Phase 3 Extension | Benefit |
|---------------|------------------|---------|
| SPONSORSHIP | Sponsorship Networks | Reveals coalitions |
| COMMITTEE_MEMBERSHIP | Committee Journeys | Finds bottlenecks |
| BILL_ASSIGNMENT | Committee Routes | Maps detailed flow |
| TOPIC_MENTION | Sentiment Clusters | Analyzes discourse |
| ARGUMENT | Comment Networks | Captures full debate |
| VOTING | Session Participation | Detailed engagement |
| VOTING_COALITION | Amendment Coalitions | Behavior patterns |
| AFFILIATION | Educational Networks | Elite formation |
| FINANCIAL_INTEREST | Tender Anomalies | Detects irregularities |
| (No original) | Patronage Networks | Reveals power |

### Completely New in Phase 3

| Type | Discovery | Insight |
|------|-----------|---------|
| Amendment Networks | Coalition detection | Legislative influence |
| Version Evolution | Evolution patterns | Bill momentum |
| Ethnic Networks | Representation analysis | Democratic balance |
| Tender Networks | Anomaly detection | Corruption signals |
| Campaign Networks | Mobilization analysis | Advocacy effectiveness |
| Influence Networks | Trust mapping | Information flow |
| Constituency Engagement | Mobilization detection | Grassroots activity |

---

## Import & Usage Map

### For Using Original Types Only

```typescript
import {
  createSponsorshipRelationship,
  createCommitteeMembershipRelationship,
  createVotingRelationship,
  // ... 7 more
} from '@/database/graph';
```

### For Using Phase 3 Types Only

```typescript
import {
  ParliamentaryNetworks,
  InstitutionalNetworks,
  EngagementNetworks,
  NetworkDiscovery,
  NetworkQueries,
} from '@/database/graph';
```

### For Using Both (Recommended)

```typescript
import {
  // Original types
  createSponsorshipRelationship,
  createCommitteeMembershipRelationship,
  createVotingRelationship,
  // ... 7 more
  
  // Phase 3 types
  ParliamentaryNetworks,
  InstitutionalNetworks,
  EngagementNetworks,
  NetworkDiscovery,
  NetworkQueries,
} from '@/database/graph';
```

---

## Completeness Verification

### Original Types (Phase 1)

✅ All 10 types implemented  
✅ All still active and functional  
✅ All syncing logic working  
✅ All in `relationships.ts`  
✅ All exported through index.ts  

### New Types (Phase 3)

✅ All 15 types implemented  
✅ All with full CRUD operations  
✅ All with discovery algorithms  
✅ All with query templates  
✅ All exported through index.ts  

### Integration

✅ Phase 3 builds on Phase 1  
✅ No conflicts or overlaps  
✅ Backward compatible  
✅ Forward extensible  
✅ Production ready  

---

## Summary Matrix

| Aspect | Original (Phase 1) | Phase 3 | Combined |
|--------|-------------------|---------|----------|
| **Relationship Types** | 10 | 15 | 25+ |
| **Purpose** | Foundation | Advanced | Complete |
| **Status** | Active | Implemented | Integrated |
| **Use Cases** | Basic tracking | Pattern discovery | Comprehensive |
| **File Location** | relationships.ts | parliamentary/institutional/engagement | All through index.ts |
| **Query Support** | Basic | Pre-built (18) | Full (28+) |

---

## Key Insight

The original 10 relationship types provide the **foundation** (what happened),  
while the 15 Phase 3 types enable **discovery** (why it happened and patterns).

Together they create a comprehensive knowledge graph capable of sophisticated legislative and institutional analysis across all three domains.

**Total Coverage: 25+ Relationship Types**  
**Status: Complete Integration** ✅

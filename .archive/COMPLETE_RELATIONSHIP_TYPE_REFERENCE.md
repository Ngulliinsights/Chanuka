# Complete Relationship Type Reference

**All 25+ Relationship Types in One Place**

---

## Quick Answer

**Original Types:** 10 from Phase 1 - Still active and fully functional ✅  
**New Types:** 15 from Phase 3 - Fully implemented and integrated ✅  
**Total:** 25+ relationship types with complete coverage

---

## The 10 Original Types (Phase 1) - STILL ACTIVE

### 1. SPONSORSHIP
- **Function:** `createSponsorshipRelationship()`
- **Link:** Person → Bill
- **File:** `shared/database/graph/relationships.ts`
- **Status:** ✅ Active
- **Enhanced by Phase 3:** Sponsorship Networks module

### 2. COMMITTEE_MEMBERSHIP
- **Function:** `createCommitteeMembershipRelationship()`
- **Link:** Person → Committee
- **File:** `shared/database/graph/relationships.ts`
- **Status:** ✅ Active
- **Enhanced by Phase 3:** Committee Review Journeys module

### 3. BILL_ASSIGNMENT
- **Function:** `createBillAssignmentRelationship()`
- **Link:** Bill → Committee
- **File:** `shared/database/graph/relationships.ts`
- **Status:** ✅ Active
- **Enhanced by Phase 3:** Committee Routes, Bill Dependencies

### 4. TOPIC_MENTION
- **Function:** `createTopicMentionRelationship()`
- **Link:** Bill → Topic
- **File:** `shared/database/graph/relationships.ts`
- **Status:** ✅ Active
- **Enhanced by Phase 3:** Sentiment Clusters

### 5. ARGUMENT
- **Function:** `createArgumentRelationship()`
- **Link:** Argument → Bill
- **File:** `shared/database/graph/relationships.ts`
- **Status:** ✅ Active
- **Enhanced by Phase 3:** Comment Networks, Sentiment Analysis

### 6. FINANCIAL_INTEREST
- **Function:** `createFinancialInterestRelationship()`
- **Link:** Person → Organization
- **File:** `shared/database/graph/relationships.ts`
- **Status:** ✅ Active
- **Enhanced by Phase 3:** Tender Anomalies detection

### 7. VOTING
- **Function:** `createVotingRelationship()`
- **Link:** Person → Bill
- **File:** `shared/database/graph/relationships.ts`
- **Status:** ✅ Active
- **Enhanced by Phase 3:** Session Participation

### 8. VOTING_COALITION
- **Function:** `createVotingCoalitionRelationship()`
- **Link:** Person ↔ Person
- **File:** `shared/database/graph/relationships.ts`
- **Status:** ✅ Active
- **Enhanced by Phase 3:** Amendment Coalitions

### 9. AFFILIATION
- **Function:** `createAffiliationRelationship()`
- **Link:** Person → Organization
- **File:** `shared/database/graph/relationships.ts`
- **Status:** ✅ Active
- **Enhanced by Phase 3:** Educational Networks, Professional Networks

### 10. DOCUMENT_REFERENCE
- **Function:** `createDocumentReferenceRelationship()`
- **Link:** Document → Bill
- **File:** `shared/database/graph/relationships.ts`
- **Status:** ✅ Active
- **Enhanced by Phase 3:** Comment Threads, Argument Chains

---

## The 15 New Types (Phase 3) - FULLY IMPLEMENTED

### Parliamentary Networks (6 types)

#### 11. AMENDMENT
- **Functions:** `createAmendmentNetwork()`, `linkAmendmentConflicts()`
- **Link:** Amendment → Bill, Amendment ↔ Amendment
- **File:** `shared/database/graph/parliamentary-networks.ts`
- **Discovery:** `detectAmendmentCoalitions()`
- **Status:** ✅ Complete

#### 12. COMMITTEE_REVIEW
- **Functions:** `createCommitteeReviewJourney()`, `linkCommitteeRoutes()`
- **Link:** Bill → Committee → Committee
- **File:** `shared/database/graph/parliamentary-networks.ts`
- **Discovery:** `analyzeCommitteeBottlenecks()`
- **Status:** ✅ Complete

#### 13. SESSION_PARTICIPATION
- **Function:** `createSessionParticipation()`
- **Link:** Person → Session → Bill
- **File:** `shared/database/graph/parliamentary-networks.ts`
- **Data:** Speaking, voting, engagement metrics
- **Status:** ✅ Complete

#### 14. BILL_VERSION
- **Functions:** `createBillVersionChain()`, `linkVersionEvolution()`
- **Link:** Bill → Version → Version
- **File:** `shared/database/graph/parliamentary-networks.ts`
- **Discovery:** `identifyBillEvolutionPatterns()`
- **Status:** ✅ Complete

#### 15. SPONSORSHIP_NETWORK
- **Functions:** `createSponsorshipNetwork()`, `linkCoSponsorshipAlliances()`
- **Link:** Person ↔ Person, Bill ← Sponsors
- **File:** `shared/database/graph/parliamentary-networks.ts`
- **Discovery:** `findSponsorshipPatterns()`
- **Status:** ✅ Complete
- **Note:** Enhances original SPONSORSHIP type

#### 16. BILL_DEPENDENCY
- **Function:** `createBillDependencyNetwork()`
- **Link:** Bill → Bill (depends on)
- **File:** `shared/database/graph/parliamentary-networks.ts`
- **Data:** Legislative hierarchies, relationships
- **Status:** ✅ Complete

### Institutional Networks (5 types)

#### 17. APPOINTMENT_NETWORK
- **Functions:** `createAppointmentNetwork()`, `linkPatronageChains()`
- **Link:** Person → Position → Person
- **File:** `shared/database/graph/institutional-networks.ts`
- **Discovery:** `detectPatronageNetworks()`
- **Status:** ✅ Complete

#### 18. ETHNIC_NETWORK
- **Functions:** `createEthnicRepresentation()`, `createEthnicVotingBlocs()`, `linkEthnicNetworks()`
- **Link:** EthnicGroup → Constituency, Constituency ↔ VotingBloc
- **File:** `shared/database/graph/institutional-networks.ts`
- **Discovery:** `analyzeEthnicRepresentation()`
- **Status:** ✅ Complete

#### 19. TENDER_NETWORK
- **Functions:** `createTenderNetwork()`, `createInfrastructureAllocationNetwork()`
- **Link:** Tender → Organization, Infrastructure → Region
- **File:** `shared/database/graph/institutional-networks.ts`
- **Discovery:** `detectTenderAnomalies()`
- **Status:** ✅ Complete

#### 20. EDUCATIONAL_NETWORK
- **Functions:** `createEducationalNetwork()`, `createProfessionalNetwork()`, `linkMentorshipNetworks()`
- **Link:** Person → School, Person → Profession, Person → Mentor
- **File:** `shared/database/graph/institutional-networks.ts`
- **Discovery:** `analyzeEducationalNetworks()`
- **Status:** ✅ Complete

#### 21. CAREER_TRANSITION
- **Function:** `createCareerTransitionNetwork()`
- **Link:** Person → Sector → Person
- **File:** `shared/database/graph/institutional-networks.ts`
- **Data:** Revolving door patterns, sector mobility
- **Status:** ✅ Complete

### Engagement Networks (5 types)

#### 22. COMMENT_NETWORK
- **Functions:** `createCommentNetwork()`, `linkCommentThreads()`, `createSentimentClusters()`
- **Link:** Person → Comment → Bill, Comment ↔ Comment (threads)
- **File:** `shared/database/graph/engagement-networks.ts`
- **Discovery:** `mapSentimentClusters()`
- **Status:** ✅ Complete

#### 23. CAMPAIGN_NETWORK
- **Functions:** `createCampaignParticipationNetwork()`, `linkParticipantCoordination()`
- **Link:** Person → Campaign, Campaign → Issue
- **File:** `shared/database/graph/engagement-networks.ts`
- **Discovery:** `analyzeCampaignEffectiveness()`
- **Status:** ✅ Complete

#### 24. ACTION_NETWORK
- **Functions:** `createActionItemNetwork()`, `linkActionProgression()`
- **Link:** Action → Status → Completion
- **File:** `shared/database/graph/engagement-networks.ts`
- **Data:** Action tracking, completion rates
- **Status:** ✅ Complete

#### 25. CONSTITUENCY_ENGAGEMENT
- **Functions:** `createConstituencyEngagementNetwork()`, `createLocalAdvocacyNetwork()`
- **Link:** Person → Constituency, Advocate → Constituency
- **File:** `shared/database/graph/engagement-networks.ts`
- **Discovery:** `detectConstituencyMobilization()`
- **Status:** ✅ Complete

#### 26. INFLUENCE_NETWORK
- **Functions:** `createUserInfluenceNetwork()`, `linkTrustNetworks()`
- **Link:** Person → Influence → Person, Trust domain formation
- **File:** `shared/database/graph/engagement-networks.ts`
- **Discovery:** `mapUserInfluenceNetworks()`
- **Status:** ✅ Complete

---

## Side-by-Side Comparison

| # | Original (Phase 1) | Phase 3 New | Combined |
|---|-------------------|------------|----------|
| 1 | Sponsorship | Amendment Networks | 25+ Types |
| 2 | Committee Membership | Committee Review Journeys | Complete |
| 3 | Bill Assignment | Session Participation | Coverage |
| 4 | Topic Mention | Bill Version Evolution | All |
| 5 | Arguments | Sponsorship Networks | Domains |
| 6 | Financial Interest | Bill Dependencies | Covered |
| 7 | Voting | Appointment Networks | ✅ |
| 8 | Voting Coalition | Ethnic Networks | ✅ |
| 9 | Affiliation | Tender Networks | ✅ |
| 10 | Document Reference | Educational Networks | ✅ |
| | | Career Transitions | ✅ |
| | | Comment Networks | ✅ |
| | | Campaign Networks | ✅ |
| | | Action Networks | ✅ |
| | | Constituency Engagement | ✅ |
| | | Influence Networks | ✅ |

---

## How to Use Them

### For Original Types (Foundation)

```typescript
import {
  createSponsorshipRelationship,
  createCommitteeMembershipRelationship,
  createVotingRelationship,
  // ... 7 more
} from '@/database/graph';

// Basic relationships
await createSponsorshipRelationship(driver, personId, billId);
await createVotingRelationship(driver, personId, billId, 'yes');
```

### For Phase 3 Types (Advanced Analysis)

```typescript
import {
  ParliamentaryNetworks,
  InstitutionalNetworks,
  EngagementNetworks,
  NetworkDiscovery,
  NetworkQueries,
} from '@/database/graph';

// Enhanced networks
const network = await ParliamentaryNetworks.createAmendmentNetwork(driver, data);
const patterns = await NetworkDiscovery.detectAmendmentCoalitions(driver);
const results = await neo4j.executeQuery(NetworkQueries.parliamentary.billEvolutionPath(billId));
```

### Combined Usage (Recommended)

```typescript
// 1. Create original foundation
await createSponsorshipRelationship(driver, personId, billId);

// 2. Enhance with Phase 3
const network = await ParliamentaryNetworks.createSponsorshipNetwork(driver, data);

// 3. Discover patterns
const patterns = await NetworkDiscovery.findSponsorshipPatterns(driver);

// 4. Query results
const results = await neo4j.executeQuery(
  NetworkQueries.parliamentary.sponsorshipNetwork(personId)
);
```

---

## File References

### Original Types Location
```
shared/database/graph/relationships.ts
├── createSponsorshipRelationship()
├── createCommitteeMembershipRelationship()
├── createBillAssignmentRelationship()
├── createTopicMentionRelationship()
├── createArgumentRelationship()
├── createFinancialInterestRelationship()
├── createVotingRelationship()
├── createVotingCoalitionRelationship()
├── createAffiliationRelationship()
└── createDocumentReferenceRelationship()
```

### Phase 3 Types Locations
```
shared/database/graph/
├── parliamentary-networks.ts (6 types, 10 functions)
├── institutional-networks.ts (5 types, 11 functions)
├── engagement-networks.ts (5 types, 11 functions)
├── network-discovery.ts (13 algorithms)
├── network-sync.ts (7 sync functions)
└── network-queries.ts (18 pre-built queries)
```

### All Exported Through
```
shared/database/graph/index.ts
```

---

## Status Overview

| Component | Count | Status |
|-----------|-------|--------|
| Original Types | 10 | ✅ Active |
| Phase 3 Types | 15 | ✅ Complete |
| Core Functions | 32 | ✅ Implemented |
| Discovery Algorithms | 13 | ✅ Ready |
| Query Templates | 18 | ✅ Pre-built |
| **Total** | **25+** | **✅ Integrated** |

---

## Summary

**Original Types (Phase 1):** Foundation layer - still active, production-tested ✅  
**Phase 3 Types:** Advanced layer - fully implemented, discovery-ready ✅  
**Integration:** Complete - Phase 3 builds on Phase 1 ✅  
**Status:** Production-ready ✅

You have comprehensive coverage across all domains with both foundational relationships and advanced pattern discovery capabilities.

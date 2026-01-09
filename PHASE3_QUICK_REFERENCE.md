# Phase 3 Quick Reference Guide

## Running Discovery

```bash
npm run graph:discover-networks
```

Executes all 13 discovery algorithms across the 15 relationship types and displays formatted results.

---

## Import Examples

### Import All Phase 3 Modules

```typescript
import {
  ParliamentaryNetworks,
  InstitutionalNetworks,
  EngagementNetworks,
  NetworkDiscovery,
  NetworkSync,
  NetworkQueries,
} from '@/database/graph';
```

### Import Specific Components

```typescript
// Parliamentary
import {
  createAmendmentNetwork,
  linkAmendmentConflicts,
  ParliamentaryNetworks,
} from '@/database/graph';

// Institutional
import {
  createAppointmentNetwork,
  createEthnicRepresentation,
  InstitutionalNetworks,
} from '@/database/graph';

// Engagement
import {
  createCommentNetwork,
  createCampaignParticipationNetwork,
  EngagementNetworks,
} from '@/database/graph';

// Discovery
import { NetworkDiscovery } from '@/database/graph';

// Sync
import { NetworkSync } from '@/database/graph';

// Queries
import { NetworkQueries } from '@/database/graph';
```

---

## Parliamentary Networks (6 types)

### Amendment Networks

```typescript
// Create amendment network
const amendments = await ParliamentaryNetworks.createAmendmentNetwork(
  driver,
  amendmentsList,
  billId
);

// Link conflicting amendments
const conflicts = await ParliamentaryNetworks.linkAmendmentConflicts(
  driver,
  conflictsList
);
```

### Committee Review Journeys

```typescript
// Create committee review journey
const journey = await ParliamentaryNetworks.createCommitteeReviewJourney(
  driver,
  billId,
  committeeSequence
);

// Link committee routes
const routes = await ParliamentaryNetworks.linkCommitteeRoutes(
  driver,
  routesList
);
```

### Session Participation

```typescript
// Create session participation
const participation = await ParliamentaryNetworks.createSessionParticipation(
  driver,
  sessionId,
  participantsList
);
```

### Bill Version Evolution

```typescript
// Create bill version chain
const versions = await ParliamentaryNetworks.createBillVersionChain(
  driver,
  billId,
  versionsList
);

// Link version evolution
const evolution = await ParliamentaryNetworks.linkVersionEvolution(
  driver,
  evolutionsList
);
```

### Sponsorship Networks

```typescript
// Create sponsorship network
const sponsorship = await ParliamentaryNetworks.createSponsorshipNetwork(
  driver,
  sponsorshipsList
);

// Link co-sponsorship alliances
const alliances = await ParliamentaryNetworks.linkCoSponsorshipAlliances(
  driver,
  alliancesList
);
```

### Bill Dependencies

```typescript
// Create bill dependency network
const dependencies = await ParliamentaryNetworks.createBillDependencyNetwork(
  driver,
  dependenciesList
);
```

---

## Institutional Networks (5 types)

### Appointment Networks

```typescript
// Create appointment network
const appointments = await InstitutionalNetworks.createAppointmentNetwork(
  driver,
  appointmentsList
);

// Link patronage chains
const patronage = await InstitutionalNetworks.linkPatronageChains(
  driver,
  patronagesList
);
```

### Ethnic Networks

```typescript
// Create ethnic representation
const ethnic = await InstitutionalNetworks.createEthnicRepresentation(
  driver,
  ethnicGroupsList
);

// Create ethnic voting blocs
const blocs = await InstitutionalNetworks.createEthnicVotingBlocs(
  driver,
  blocsList
);

// Link ethnic networks
const links = await InstitutionalNetworks.linkEthnicNetworks(
  driver,
  linksList
);
```

### Tender Networks

```typescript
// Create tender network
const tenders = await InstitutionalNetworks.createTenderNetwork(
  driver,
  tendersList
);

// Create infrastructure allocation network
const infrastructure = await InstitutionalNetworks.createInfrastructureAllocationNetwork(
  driver,
  allocationsList
);
```

### Educational Networks

```typescript
// Create educational network
const education = await InstitutionalNetworks.createEducationalNetwork(
  driver,
  educationList
);

// Create professional network
const professional = await InstitutionalNetworks.createProfessionalNetwork(
  driver,
  professionalList
);

// Link mentorship networks
const mentorship = await InstitutionalNetworks.linkMentorshipNetworks(
  driver,
  mentorshipList
);
```

### Revolving Door

```typescript
// Create career transition network
const transitions = await InstitutionalNetworks.createCareerTransitionNetwork(
  driver,
  transitionsList
);
```

---

## Engagement Networks (5 types)

### Comment Networks

```typescript
// Create comment network
const comments = await EngagementNetworks.createCommentNetwork(
  driver,
  commentsList
);

// Link comment threads
const threads = await EngagementNetworks.linkCommentThreads(
  driver,
  threadsList
);

// Create sentiment clusters
const sentiment = await EngagementNetworks.createSentimentClusters(
  driver,
  sentimentList
);
```

### Campaign Networks

```typescript
// Create campaign participation network
const participation = await EngagementNetworks.createCampaignParticipationNetwork(
  driver,
  campaignId,
  participantsList
);

// Link participant coordination
const coordination = await EngagementNetworks.linkParticipantCoordination(
  driver,
  coordinationList
);
```

### Action Networks

```typescript
// Create action item network
const actions = await EngagementNetworks.createActionItemNetwork(
  driver,
  actionsList
);

// Link action progression
const progression = await EngagementNetworks.linkActionProgression(
  driver,
  progressionList
);
```

### Constituency Networks

```typescript
// Create constituency engagement network
const engagement = await EngagementNetworks.createConstituencyEngagementNetwork(
  driver,
  constituencyId,
  engagementList
);

// Create local advocacy network
const advocacy = await EngagementNetworks.createLocalAdvocacyNetwork(
  driver,
  advocacyList
);
```

### Influence Networks

```typescript
// Create user influence network
const influence = await EngagementNetworks.createUserInfluenceNetwork(
  driver,
  influenceList
);

// Link trust networks
const trust = await EngagementNetworks.linkTrustNetworks(
  driver,
  trustList
);
```

---

## Discovery Algorithms

### Parliamentary Discovery

```typescript
// Detect amendment coalitions
const coalitions = await NetworkDiscovery.detectAmendmentCoalitions(driver);

// Analyze committee bottlenecks
const bottlenecks = await NetworkDiscovery.analyzeCommitteeBottlenecks(driver);

// Identify bill evolution patterns
const patterns = await NetworkDiscovery.identifyBillEvolutionPatterns(driver);

// Find sponsorship patterns
const sponsorships = await NetworkDiscovery.findSponsorshipPatterns(driver);
```

### Institutional Discovery

```typescript
// Detect patronage networks
const patronage = await NetworkDiscovery.detectPatronageNetworks(driver);

// Analyze ethnic representation
const ethnic = await NetworkDiscovery.analyzeEthnicRepresentation(driver);

// Detect tender anomalies
const anomalies = await NetworkDiscovery.detectTenderAnomalies(driver);

// Analyze educational networks
const education = await NetworkDiscovery.analyzeEducationalNetworks(driver);
```

### Engagement Discovery

```typescript
// Map sentiment clusters
const sentiment = await NetworkDiscovery.mapSentimentClusters(driver);

// Identify key advocates
const advocates = await NetworkDiscovery.identifyKeyAdvocates(driver);

// Analyze campaign effectiveness
const campaigns = await NetworkDiscovery.analyzeCampaignEffectiveness(driver);

// Detect constituency mobilization
const mobilization = await NetworkDiscovery.detectConstituencyMobilization(driver);

// Map user influence networks
const influence = await NetworkDiscovery.mapUserInfluenceNetworks(driver);
```

---

## Synchronization

### Sync Domain-Specific Networks

```typescript
// Sync parliamentary networks
const stats = await NetworkSync.syncParliamentaryNetworks(
  amendments,
  committees,
  sessions,
  versions,
  sponsorships,
  dependencies
);

// Sync institutional networks
const stats = await NetworkSync.syncInstitutionalNetworks(
  appointments,
  ethnicGroups,
  tenders,
  credentials
);

// Sync engagement networks
const stats = await NetworkSync.syncEngagementNetworks(
  comments,
  campaigns,
  actions,
  engagements,
  influences
);
```

### Sync All Networks

```typescript
const stats = await NetworkSync.syncAllNetworks({
  parliamentary: {
    amendments,
    committees,
    sessions,
    versions,
    sponsorships,
    dependencies,
  },
  institutional: {
    appointments,
    ethnicGroups,
    tenders,
    credentials,
  },
  engagement: {
    comments,
    campaigns,
    actions,
    engagements,
    influences,
  },
});

console.log(`Synced ${stats.totalRelationships} relationships`);
```

### Handle Change Events

```typescript
const event = {
  type: 'create',
  domain: 'parliamentary',
  relationship: 'amendment',
  data: amendmentData,
};

await NetworkSync.handleNetworkChangeEvent(event);
```

---

## Pre-Built Queries

### Parliamentary Queries

```typescript
// Bill evolution path
const query = NetworkQueries.parliamentary.billEvolutionPath(billId);
const result = await neo4j.executeQuery(query);

// Committee path
const query = NetworkQueries.parliamentary.committeePath(billId);
const result = await neo4j.executeQuery(query);

// Sponsorship network
const query = NetworkQueries.parliamentary.sponsorshipNetwork(personId);
const result = await neo4j.executeQuery(query);

// Bill dependencies
const query = NetworkQueries.parliamentary.billDependencies(billId);
const result = await neo4j.executeQuery(query);

// Session participation
const query = NetworkQueries.parliamentary.sessionParticipation(sessionId);
const result = await neo4j.executeQuery(query);
```

### Institutional Queries

```typescript
// Patronage chain
const query = NetworkQueries.institutional.patronageChain(personId);
const result = await neo4j.executeQuery(query);

// Institutional capture
const query = NetworkQueries.institutional.institutionalCapture(institutionId);
const result = await neo4j.executeQuery(query);

// Ethnic representation
const query = NetworkQueries.institutional.ethnicRepresentation(ethnicGroupId);
const result = await neo4j.executeQuery(query);

// Tender anomalies
const query = NetworkQueries.institutional.tenderAnomalies();
const result = await neo4j.executeQuery(query);

// Educational elites
const query = NetworkQueries.institutional.educationalElites(schoolId);
const result = await neo4j.executeQuery(query);

// Revolving door
const query = NetworkQueries.institutional.revolvingDoor();
const result = await neo4j.executeQuery(query);
```

### Engagement Queries

```typescript
// Sentiment map
const query = NetworkQueries.engagement.sentimentMap(topicId);
const result = await neo4j.executeQuery(query);

// Campaign ecosystem
const query = NetworkQueries.engagement.campaignEcosystem(campaignId);
const result = await neo4j.executeQuery(query);

// Campaign momentum
const query = NetworkQueries.engagement.campaignMomentum(campaignId);
const result = await neo4j.executeQuery(query);

// Action completion
const query = NetworkQueries.engagement.actionCompletion(actionId);
const result = await neo4j.executeQuery(query);

// Advocate influence
const query = NetworkQueries.engagement.advocateInfluence(advocateId);
const result = await neo4j.executeQuery(query);

// Constituency mobilization
const query = NetworkQueries.engagement.constituencyMobilization(constituencyId);
const result = await neo4j.executeQuery(query);

// Trust network
const query = NetworkQueries.engagement.trustNetwork(userId);
const result = await neo4j.executeQuery(query);
```

### Cross-Network Queries

```typescript
// Influence paths across networks
const query = NetworkQueries.crossNetwork.influencePathsAcrossNetworks(userId);
const result = await neo4j.executeQuery(query);

// Network clusters
const query = NetworkQueries.crossNetwork.networkClusters();
const result = await neo4j.executeQuery(query);

// High value nodes
const query = NetworkQueries.crossNetwork.highValueNodes();
const result = await neo4j.executeQuery(query);
```

---

## npm Commands

```bash
# Run discovery demo
npm run graph:discover-networks

# (Future) Run network synchronization
npm run graph:sync-networks

# (Shorthand) Run Phase 3 demo
npm run graph:phase3:demo

# (Existing) Other graph commands
npm run graph:init
npm run graph:sync
npm run graph:start
npm run graph:stop
npm run graph:test
```

---

## Data Model Reference

### Parliamentary Data Models

- `Amendment` - Amendment metadata
- `AmendmentConflict` - Conflict information
- `CommitteeReview` - Committee review record
- `CommitteeRoute` - Committee routing
- `SessionParticipation` - Participation record
- `BillVersion` - Bill version
- `VersionEvolution` - Change information
- `Sponsorship` - Sponsorship relationship
- `CoSponsorshipAlliance` - Co-sponsorship info
- `BillDependency` - Dependency relationship

### Institutional Data Models

- `Appointment` - Appointment record
- `PatronageLink` - Patronage relationship
- `EthnicRepresentation` - Representation data
- `EthnicVotingBloc` - Voting bloc data
- `EthnicNetworkLink` - Network connection
- `TenderAward` - Award record
- `InfrastructureAllocation` - Allocation data
- `EducationalCredential` - Educational background
- `ProfessionalCredential` - Professional affiliation
- `MentorshipLink` - Mentorship relationship
- `CareerTransition` - Career transition

### Engagement Data Models

- `Comment` - Comment record
- `CommentThread` - Discussion thread
- `SentimentCluster` - Sentiment cluster
- `CampaignParticipant` - Participant record
- `ParticipantCoordination` - Coordination data
- `ActionItem` - Action record
- `ActionProgression` - Progress tracking
- `ConstituencyEngagement` - Engagement record
- `LocalAdvocacy` - Advocacy record
- `UserInfluence` - Influence metrics
- `TrustLink` - Trust relationship

---

## Troubleshooting

### Neo4j Connection Issues

```bash
# Check Neo4j status
npm run graph:health

# Restart Neo4j
npm run graph:stop
npm run graph:start

# Check logs
npm run graph:logs
```

### Discovery Algorithm Errors

```bash
# Run with verbose logging
npm run graph:discover-networks 2>&1 | tee discovery.log

# Check specific algorithm
# Modify discover-networks.ts to run single algorithm
```

### Sync Issues

```bash
# Verify data consistency
npm run db:verify-alignment

# Check schema alignment
npm run db:schema:check
```

---

## Key Files

| File | Purpose |
|------|---------|
| `shared/database/graph/parliamentary-networks.ts` | 6 parliamentary types |
| `shared/database/graph/institutional-networks.ts` | 5 institutional types |
| `shared/database/graph/engagement-networks.ts` | 5 engagement types |
| `shared/database/graph/network-discovery.ts` | 13 algorithms |
| `shared/database/graph/network-sync.ts` | Synchronization |
| `shared/database/graph/network-queries.ts` | Pre-built queries |
| `shared/database/graph/index.ts` | All exports |
| `scripts/database/graph/discover-networks.ts` | Demo script |
| `shared/docs/GRAPH_DATABASE_PHASE3_IMPLEMENTATION.md` | Full documentation |
| `PHASE3_COMPLETION_REPORT.md` | Completion report |

---

## Getting Started Checklist

- [ ] Run `npm run graph:discover-networks` to verify setup
- [ ] Review `GRAPH_DATABASE_PHASE3_IMPLEMENTATION.md` for architecture
- [ ] Check `PHASE3_COMPLETION_REPORT.md` for full details
- [ ] Import Phase 3 modules in your code
- [ ] Start with one domain (parliamentary, institutional, or engagement)
- [ ] Test discovery algorithms
- [ ] Implement sync service
- [ ] Deploy to production

---

## Support & Questions

Refer to:
- `shared/docs/GRAPH_DATABASE_PHASE3_IMPLEMENTATION.md` - Full documentation
- `PHASE3_COMPLETION_REPORT.md` - Detailed report
- Code comments in module files
- npm command help: `npm run graph:discover-networks --help`

# Graph Database Phase 2 Extension Analysis
## Additional Schema Relationships to Consider for the Graph

**Analysis Date:** January 8, 2026  
**Context:** After Phase 1 (Foundation) and Phase 2 (Advanced Relationships) implementation  
**Focus:** Unexploited relationships that would benefit from graph modeling

---

## Executive Summary

Your schemas contain **15 additional relationship domains** that could benefit from graph modeling but haven't been considered yet. These fall into 3 categories:

1. **Parliamentary Process Relationships** (6 types) - Bill lifecycle & amendment chains
2. **Political Economy Relationships** (5 types) - Power structures, ethnicity, appointments
3. **Citizen & Advocacy Relationships** (4 types) - Community networks, campaign dynamics

These relationships are particularly valuable because they:
- Create complex multi-hop patterns (amendment chains, sponsorship networks)
- Enable temporal analysis (bill evolution, appointment timing)
- Require network centrality calculations (who drives change, advocates reach)
- Support community detection (constituency clusters, ethnic networks)

---

## Part 1: Parliamentary Process Relationships

### 1. Bill Amendment Networks (HIGH VALUE ⭐⭐⭐)

**Current State:** `bill_amendments` table tracks amendments but treats them as isolated changes

**Graph Opportunity:** Model amendment chains and amendment influence networks

```
(Amendment)-[REFINES]-(Bill)
(Amendment)-[SUPERSEDES]-(Amendment)
(Amendment)-[CONFLICTS_WITH]-(Amendment)
(Amendment)-[PROPOSED_BY]-(Person)
(Amendment)-[PROPOSES_CHANGE_TO]-(Section)
(Amendment)-[AFFECTS_TOPIC]-(Topic)
```

**Why This Matters:**
- Track amendment chains: who proposes amendments to amendments?
- Find blocking coalitions: which amendments propose contradictory changes?
- Identify key amendments: which amendments receive most counter-amendments?
- Pattern discovery: amendments that always come together
- Influence paths: show how specific people reshape bills through amendments

**Example Query:**
```cypher
// Show how a bill evolved through amendments
MATCH (bill:Bill {id: $billId})-[:SUBJECT_OF]-(amendment:Amendment)
MATCH (amendment)-[:PROPOSED_BY]-(person:Person)
MATCH (amendment)-[c:CONFLICTS_WITH|SUPERSEDES]-(other:Amendment)
RETURN bill, collect({amendment: amendment, proposer: person, conflicts: c}) as evolution
ORDER BY amendment.proposed_date
```

**Data Model:**
```typescript
interface AmendmentRelationship {
  amendment_id: string;
  related_amendment_id?: string;
  relationship_type: 'supersedes' | 'conflicts' | 'builds_on' | 'clarifies';
  conflict_severity: number; // 0-100: how contradictory
  amendment_power_index: number; // how influential this amendment
  proposed_by_person_id: string;
  proposed_date: Date;
}
```

---

### 2. Bill Committee Review Journeys (HIGH VALUE ⭐⭐⭐)

**Current State:** `bill_committee_assignments` treats committee reviews as isolated assignments

**Graph Opportunity:** Model multi-committee review paths and committee networks

```
(Bill)-[ASSIGNED_TO]-(Committee)
(Committee)-[RECEIVED_FROM]-(Committee)
(Bill)-[SEQUENTIAL_REVIEW]->(Committee)
(Committee)-[ROUTES_TO]-(Committee)
(Bill)-[REPORT_INFORMED]-(Argument)
(Committee)-[SPECIALIZES_IN]-(Topic)
```

**Why This Matters:**
- Track bill routing: which committees review in sequence?
- Committee influence: which committees have blocking power?
- Report chains: how do committee reports influence each other?
- Bottlenecks: find which committees slow down bills
- Committee coalitions: which committees typically align/oppose?

**Example Query:**
```cypher
// Show bottleneck committees (bills stuck in review)
MATCH (bill:Bill)-[a1:ASSIGNED_TO]->(comm:Committee)
WHERE a1.status IN ['reviewing', 'report_pending']
AND date(a1.assigned_date) < date() - interval '60 days'
WITH comm, count(bill) as stuck_bills
MATCH (comm)-[:REVIEWS]->(topic:Topic)
RETURN comm.name, stuck_bills, collect(topic.name) as specialties
ORDER BY stuck_bills DESC
```

**Data Model:**
```typescript
interface CommitteeReviewPath {
  bill_id: string;
  primary_committee_id: string;
  review_sequence: number; // which committee in the sequence
  next_committee_id?: string;
  review_duration_days: number;
  status: 'assigned' | 'reviewing' | 'report_pending' | 'completed';
  report_influenced_decisions: boolean;
  recommendations_adopted_count: number;
}
```

---

### 3. Bill Reading & Session Participation (MEDIUM VALUE ⭐⭐)

**Current State:** `bill_readings` and `parliamentary_sessions` exist separately

**Graph Opportunity:** Model participation patterns across readings

```
(Bill)-[DISCUSSED_IN]-(Session)
(Person)-[PARTICIPATED_IN]-(Session)
(Bill)-[SUCCESSIVE_READINGS]-(Bill)
(Session)-[PRECEDED_BY]-(Session)
(Person)-[SPEAKING_FREQUENCY]-(Bill)
(Topic)-[CENTRAL_IN]-(Session)
```

**Why This Matters:**
- Session attendance patterns: who participates in which bills?
- Reading progression: track bill momentum across readings
- Speaking patterns: identify influential speakers by frequency
- Parliamentary engagement: member participation across sessions
- Session themes: topics that dominate parliamentary calendar

**Example Query:**
```cypher
// Find speakers who dominate bills (high influence)
MATCH (bill:Bill)-[:DISCUSSED_IN]->(session:Session)
MATCH (session)-[:HOSTED]-(speaker:Person)
WITH bill, speaker, count(session) as speaking_count
MATCH (bill)-[:ABOUT]-(topic:Topic)
RETURN speaker.name, count(bill) as bills_spoken_on, speaking_count as total_speeches, collect(topic.name) as topics
ORDER BY total_speeches DESC
LIMIT 20
```

---

### 4. Bill Version Evolution Chains (MEDIUM VALUE ⭐⭐)

**Current State:** `bill_versions` tracks versions sequentially but separately

**Graph Opportunity:** Model significant changes between versions

```
(Bill)-[HAS_VERSION]-(BillVersion)
(BillVersion)-[EVOLVED_TO]-(BillVersion)
(BillVersion)-[DOCUMENT_CHANGED]-(Topic)
(BillVersion)-[CONTENT_STABILITY_SCORE]-(number)
(BillVersion)-[CREATED_BY_STAGE]-(Stage)
```

**Why This Matters:**
- Track fundamental shifts in bills
- Identify controversial versions (most changes)
- Content stability: which bills change frequently vs stable?
- Version influences: which version changes matter most?
- Reversals: find sections that revert back and forth

**Example Query:**
```cypher
// Identify unstable bills (many versions, major changes)
MATCH (bill:Bill)-[:HAS_VERSION]->(v:BillVersion)
WITH bill, count(v) as version_count, collect(v.created_by_stage) as stages
WHERE version_count > 5
RETURN bill.title, version_count, stages
ORDER BY version_count DESC
```

---

### 5. Sponsorship & Co-sponsorship Networks (MEDIUM VALUE ⭐⭐)

**Current State:** Basic sponsor tracking in foundation schema

**Graph Opportunity:** Model sponsorship patterns and political partnerships

```
(Person)-[PRIMARY_SPONSOR]-(Bill)
(Person)-[CO_SPONSOR]-(Bill)
(Person)-[CO_SPONSORS_WITH]-(Person)
(Person)-[SPONSOR_ALLIANCE]-(Person)
(Sponsor)-[INTRODUCES_ON_BEHALF_OF]-(Organization)
```

**Why This Matters:**
- Sponsorship partnerships: who co-sponsors with whom?
- Bill authorship networks: groups of people working together
- Sponsorship influence: which sponsors carry bills through
- Cross-party collaboration: sponsor diversity indicates broader support
- Persistent partnerships: recurring co-sponsor pairs

**Example Query:**
```cypher
// Find strong sponsorship partnerships
MATCH (p1:Person)-[:CO_SPONSORS_WITH]-(p2:Person)
WITH p1, p2, count(*) as bills_together
WHERE bills_together >= 5
MATCH (p1)-[:MEMBER_OF]-(c1:Committee)
MATCH (p2)-[:MEMBER_OF]-(c2:Committee)
RETURN p1.name, p2.name, p1.party, p2.party, bills_together, c1.name, c2.name
```

---

### 6. Bill Dependency & Reference Networks (MEDIUM VALUE ⭐⭐)

**Current State:** `billRelationships` table exists in discovery schema (conflicting/similar only)

**Graph Opportunity:** Model technical dependencies and amendments/references

```
(Bill)-[AMENDS]-(Bill)
(Bill)-[SUPERSEDES]-(Bill)
(Bill)-[REPEALS_SECTION_OF]-(Bill)
(Bill)-[REFERENCES]-(Bill)
(Bill)-[CREATES_FRAMEWORK_FOR]-(Bill)
(Bill)-[IMPLEMENTATION_OF]-(Bill)
```

**Why This Matters:**
- Bill archaeology: understand legislative history
- Impact analysis: which bills create cascading dependencies
- Legislative coherence: find contradictory bills
- Implementation chains: bills that must pass together
- Repeal patterns: identify obsolete legislation

**Example Query:**
```cypher
// Find bills that must pass together (tight dependencies)
MATCH (bill:Bill)-[r:AMENDS|IMPLEMENTS]->(other:Bill)
WITH bill, count(r) as dependencies
WHERE dependencies >= 3
RETURN bill.title, dependencies
ORDER BY dependencies DESC
```

---

## Part 2: Political Economy Relationships

### 7. Appointment Networks (HIGH VALUE ⭐⭐⭐)

**Current State:** `political_appointments` table tracks individual appointments

**Graph Opportunity:** Model patronage networks, power consolidation, and institutional capture

```
(Person)-[APPOINTED_TO]-(Position)
(Position)-[IN_INSTITUTION]-(Institution)
(Person)-[APPOINTED_BY]-(Person)
(Person)-[APPOINTS]-(Person)
(Person)-[ETHNIC_COALITION]-(Person)
(Institution)-[CONTROLLED_BY_PARTY]-(Party)
(Institution)-[ETHNICALLY_DOMINATED_BY]-(EthnicGroup)
(Person)-[GATEKEEPING_ROLE]-(Institution)
```

**Why This Matters:**
- Patronage mapping: who appoints whom, when, and why
- Institutional capture: track how parties capture agencies
- Ethnic distribution analysis: representation vs population ratios
- Power consolidation: who has most appointment influence
- Revolving door networks: movement between sectors
- Cabinet networks: who works together across institutions

**Example Query:**
```cypher
// Find ethnic patronage patterns
MATCH (person:Person {ethnicity: $ethnicity})-[a:APPOINTED_TO]->(pos:Position)
MATCH (pos)-[:IN_INSTITUTION]->(inst:Institution)
WITH person, inst, count(a) as appointments
MATCH (appointer:Person)-[:APPOINTS]->(person)
WITH inst, collect({person: person, appointer: appointer}) as ethnic_team
RETURN inst.name, size(ethnic_team) as ethnic_appointees, ethnic_team
```

**Data Model:**
```typescript
interface AppointmentNetwork {
  appointee_id: string;
  appointer_id: string;
  position_id: string;
  institution_id: string;
  appointment_date: Date;
  ethnicity: string;
  party_affiliation: string;
  tenure_days: number;
  competitive_score: number; // was there competition for this role?
  ethnic_balance_score: number; // diversity in institution
}
```

---

### 8. Ethnic Constituency Networks (HIGH VALUE ⭐⭐⭐)

**Current State:** Schema has ethnicity field but no relationships

**Graph Opportunity:** Model ethnic voting blocs, representation, and political economy

```
(EthnicGroup)-[REPRESENTS]-(Constituency)
(Person)-[BELONGS_TO]-(EthnicGroup)
(EthnicGroup)-[VOTES_FOR]-(Party)
(EthnicGroup)-[NEGOTIATES_WITH]-(Party)
(Constituency)-[ETHNICALLY_MAJORITY]-(EthnicGroup)
(Bill)-[AFFECTS_ETHNIC_GROUP]-(EthnicGroup)
```

**Why This Matters:**
- Ethnic politics: map voting bloc influence
- Representation: track ethnic group political power
- Equity analysis: which groups benefit from which bills?
- Coalition patterns: which ethnic groups work together?
- Exclusion analysis: underrepresented communities
- Bill impact: disproportionate impacts by ethnicity

**Example Query:**
```cypher
// Show ethnic representation imbalance
MATCH (constituency:Constituency)-[:REPRESENTED_BY]-(person:Person)
MATCH (constituency)-[:ETHNICALLY_MAJORITY]-(majority:EthnicGroup)
MATCH (person)-[:BELONGS_TO]-(ethnic:EthnicGroup)
WHERE majority.name <> ethnic.name
RETURN constituency.name, majority.name, ethnic.name, person.name
// Returns: representatives from different ethnic group than constituents
```

---

### 9. Tender & Infrastructure Allocation Networks (MEDIUM VALUE ⭐⭐)

**Current State:** `tender_allocations` and `infrastructure_projects` tables exist

**Graph Opportunity:** Model resource distribution patterns and patronage indicators

```
(Person)-[AWARDS_TENDER_TO]-(Organization)
(Organization)-[WINS_TENDER_FROM]-(Institution)
(Institution)-[CONTROLLED_BY]-(Party)
(Organization)-[LINKED_TO]-(Person)
(Person)-[BENEFITS_FROM]-(Infrastructure)
(Constituency)-[RECEIVES_INFRASTRUCTURE]-(Infrastructure)
(Infrastructure)-[ALLOCATED_BY]-(Person)
```

**Why This Matters:**
- Resource mapping: who gets what infrastructure?
- Patronage indicators: tender distribution patterns
- Regional equity: infrastructure allocation by region/ethnicity
- Conflict of interest: tender winners connected to decision-makers
- Corruption signals: unusual concentration of awards
- Development analysis: infrastructure reach and equity

**Example Query:**
```cypher
// Find suspicious tender patterns (concentration of awards)
MATCH (person:Person)-[a:AWARDS_TENDER_TO]->(org:Organization)
WITH org, count(a) as tender_count, collect(person.name) as awarders
WHERE tender_count > 5
MATCH (org)-[:LINKED_TO]-(person2:Person)
WHERE person2 IN awarders
RETURN org.name, tender_count, person2.name, "POTENTIAL_CONFLICT" as flag
```

---

### 10. Educational & Professional Pedigree Networks (MEDIUM VALUE ⭐⭐)

**Current State:** Schema has education fields, no relationships

**Graph Opportunity:** Model elite networks, credentialing, and competence signals

```
(Person)-[STUDIED_AT]-(Institution)
(Institution)-[TRAINS_PROFESSIONALS_FOR]-(Sector)
(Person)-[TRAINED_BY]-(Person)
(Person)-[PROFESSIONAL_CREDENTIAL]-(Credential)
(Credential)-[CONFERS_AUTHORITY_IN]-(Domain)
(Person)-[ALUMNI_NETWORK]-(Person)
```

**Why This Matters:**
- Elite networks: track educational gatekeeping
- Competence signals: identify credentials for key roles
- Patronage indicators: hires from same school
- Brain drain: talent leaving/entering sectors
- Credibility assessment: qualification patterns
- Qualification gaps: unexpectedly unqualified appointees

**Example Query:**
```cypher
// Find educational gatekeeping (same school dominates sector)
MATCH (person:Person)-[:APPOINTED_TO]->(pos:Position)
MATCH (pos)-[:IN_INSTITUTION]->(inst:Institution {sector: $sector})
MATCH (person)-[:STUDIED_AT]->(school:Institution {type: 'university'})
WITH school, count(person) as appointees
WHERE appointees > 5
RETURN school.name, appointees, "GATEKEEPING" as flag
```

---

## Part 3: Citizen & Advocacy Relationships

### 11. Comment & Sentiment Networks (MEDIUM VALUE ⭐⭐)

**Current State:** `comments` table has sentiment but treated as isolated feedback

**Graph Opportunity:** Model citizen networks, argument patterns, and consensus

```
(User)-[COMMENTS_ON]-(Bill)
(Comment)-[REPLIES_TO]-(Comment)
(User)-[AGREES_WITH]-(User)
(User)-[DISAGREES_WITH]-(User)
(Comment)-[SUPPORTS_ARGUMENT]-(Argument)
(Sentiment)-[CLUSTERS_AROUND]-(Topic)
(User)-[PART_OF_COALITION]-(User)
```

**Why This Matters:**
- Opinion networks: which citizens influence each other?
- Consensus mapping: find areas of agreement/disagreement
- Argument patterns: which arguments resonate?
- Echo chambers: find isolated opinion clusters
- Influence analysis: whose opinions matter most?
- Community detection: identify citizen communities

**Example Query:**
```cypher
// Find strong pro/con citizen clusters
MATCH (user1:User)-[c1:COMMENTS_ON]-(bill:Bill)
MATCH (user2:User)-[c2:COMMENTS_ON]-(bill)
WHERE c1.position = c2.position
AND c1.sentiment_score > 0.5
WITH user1, user2, bill, c1.position as position
MATCH (user1)-[:AGREES_WITH]-(user2)
WITH bill, position, count(*) as cluster_size
WHERE cluster_size >= 10
RETURN bill.title, position, cluster_size
```

---

### 12. Campaign Participant Networks (HIGH VALUE ⭐⭐⭐)

**Current State:** `campaigns` and `campaign_participants` tracked separately

**Graph Opportunity:** Model advocacy networks, collective action, and campaign ecosystems

```
(Campaign)-[RECRUITS]-(User)
(User)-[PARTICIPATES_IN]-(Campaign)
(User)-[RECRUITS_FOR]-(Campaign)
(Campaign)-[SUPPORTS_BILL]-(Bill)
(Campaign)-[COORDINATES_WITH]-(Campaign)
(Campaign)-[SUPPORTS_ADVOCACY_OF]-(Organization)
(User)-[ACTIVE_IN_CAMPAIGNS]-(Topic)
(Organization)-[FUNDS_CAMPAIGN]-(Campaign)
```

**Why This Matters:**
- Campaign networks: who organizes campaigns together?
- Advocacy ecosystems: which organizations coordinate?
- Grassroots reach: how far does campaign messaging spread?
- Participant journeys: which campaigns convert participants?
- Campaign influence: how many participants matter?
- Organizational power: who drives advocacy?

**Example Query:**
```cypher
// Find coordination between campaigns (shared participants)
MATCH (campaign1:Campaign)-[:RECRUITS]->(user:User)
MATCH (campaign2:Campaign)-[:RECRUITS]->(user)
WHERE campaign1.id < campaign2.id
WITH campaign1, campaign2, count(user) as shared_participants
WHERE shared_participants >= 10
RETURN campaign1.title, campaign2.title, shared_participants, "COORDINATED" as relationship
```

---

### 13. Action Item Completion Networks (MEDIUM VALUE ⭐⭐)

**Current State:** `action_items` and `participant_actions` tables exist separately

**Graph Opportunity:** Model campaign effectiveness, participant progression, and momentum

```
(Campaign)-[PROPOSES_ACTION]-(ActionItem)
(User)-[COMPLETES_ACTION]-(ActionItem)
(ActionItem)-[BUILDS_MOMENTUM_FOR]-(ActionItem)
(ActionItem)-[ENABLES]-(ActionItem)
(User)-[PROGRESSES_THROUGH_CAMPAIGN]-(ActionItem)
(ActionItem)-[PREREQUISITES]-(ActionItem)
(Campaign)-[MEASURES_SUCCESS_BY]-(ActionItem)
```

**Why This Matters:**
- Campaign progression: track participant journey through actions
- Momentum analysis: which actions drive subsequent participation?
- Drop-off patterns: where do participants abandon campaigns?
- Action effectiveness: which actions matter most?
- Sequencing: optimal order for campaign actions
- Barrier identification: where campaigns lose participants

**Example Query:**
```cypher
// Find critical actions (highest completion correlation with campaign success)
MATCH (campaign:Campaign)-[:PROPOSES_ACTION]->(action1:ActionItem)
MATCH (campaign)-[:PROPOSES_ACTION]->(action2:ActionItem)
WHERE action1.sequence < action2.sequence
MATCH (user:User)-[c1:COMPLETES_ACTION]->(action1)
MATCH (user)-[c2:COMPLETES_ACTION]->(action2)
WITH action1, action2, count(user) as downstream_completions
WITH action1, avg(downstream_completions) as impact
RETURN action1.description, impact
ORDER BY impact DESC
```

---

### 14. Constituency Engagement Networks (MEDIUM VALUE ⭐⭐)

**Current State:** Comments tracked by county/constituency but no network analysis

**Graph Opportunity:** Model local advocacy, constituency pressure, and representative accountability

```
(Constituency)-[ENGAGED_ON_BILL]-(Bill)
(Constituency)-[PRESSURES]-(Representative)
(User)-[REPRESENTS_INTERESTS_OF]-(Constituency)
(Constituency)-[MOBILIZES_FOR_CAMPAIGN]-(Campaign)
(Constituency)-[REACHES_LEGISLATOR]-(Person)
(Bill)-[AFFECTS_CONSTITUENCY]-(Constituency)
(User)-[INFLUENCES_PEER_IN]-(Constituency)
```

**Why This Matters:**
- Local representation: which constituencies are heard?
- Pressure analysis: which constituencies move legislators?
- Geographic patterns: which regions engage on what?
- Accountability tracking: legislator responsiveness by constituency
- Campaign reach: geographic spread of advocacy
- Equity analysis: whose voices count more?

**Example Query:**
```cypher
// Find underrepresented constituencies (low engagement on bills affecting them)
MATCH (bill:Bill)-[:AFFECTS_CONSTITUENCY]->(const:Constituency)
MATCH (const)-[:ENGAGED_ON_BILL]->(bill)
WITH const, count(*) as engagement_score
MATCH (const)-[:PRESSURES]->(rep:Person)
WITH const, rep, engagement_score
WHERE engagement_score < 5
RETURN const.name, rep.name, engagement_score, "UNDERREPRESENTED" as flag
```

---

### 15. User Influence & Trust Networks (MEDIUM VALUE ⭐⭐)

**Current State:** Users exist but no explicit trust/influence relationships

**Graph Opportunity:** Model expert networks, reputation, and community influence

```
(User)-[FOLLOWS]-(User)
(User)-[TRUSTS_ON_TOPIC]-(User)
(User)-[INFLUENTIAL_ARGUMENT]-(Argument)
(User)-[EXPERT_IN]-(Topic)
(User)-[COMMUNITY_LEADER_FOR]-(Constituency)
(User)-[MOBILIZES]-(User)
(User)-[REPUTATION_SCORE]-(numeric_value)
```

**Why This Matters:**
- Community influence: who influences whom in advocacy?
- Expert identification: finding genuine subject matter experts
- Reputation tracking: building trust metrics
- Misinformation patterns: identifying bad-faith actors
- Influencer networks: who drives opinion?
- Network effects: how influence spreads through communities

**Example Query:**
```cypher
// Find opinion leaders in specific communities
MATCH (user:User)-[follow:FOLLOWS]-(leader:User)
MATCH (leader)-[:COMMENTS_ON]-(bill:Bill)
WHERE bill.topic = $topic
WITH leader, count(follow) as followers, count(bill) as opinions
WHERE followers >= 50 AND opinions >= 10
RETURN leader.name, followers, opinions, "OPINION_LEADER" as role
```

---

## Implementation Priority Matrix

### High Value, High Complexity (Implement Phase 3-4)

| Relationship | Value | Complexity | Use Cases |
|--------------|-------|-----------|-----------|
| **Amendment Networks** | ⭐⭐⭐ | High | Bill evolution, influence paths, blocking coalitions |
| **Appointment Networks** | ⭐⭐⭐ | High | Patronage mapping, institutional capture, ethnic analysis |
| **Campaign Participant Networks** | ⭐⭐⭐ | Medium | Advocacy ecosystems, grassroots reach, mobilization |
| **Committee Review Journeys** | ⭐⭐⭐ | Medium | Bottleneck analysis, routing logic, committee influence |

### Medium Value, Medium Complexity (Phase 4-5)

| Relationship | Value | Complexity | Use Cases |
|--------------|-------|-----------|-----------|
| **Ethnic Constituency Networks** | ⭐⭐⭐ | Medium | Ethnic politics, representation equity, voting blocs |
| **Tender & Infrastructure Networks** | ⭐⭐ | Medium | Resource allocation, patronage signals, equity analysis |
| **Comment & Sentiment Networks** | ⭐⭐ | Medium | Consensus mapping, argument patterns, echo chambers |
| **Action Item Networks** | ⭐⭐ | Medium | Campaign effectiveness, progression paths, barriers |

### Lower Priority, Lower Complexity (Phase 5+)

| Relationship | Value | Complexity | Use Cases |
|--------------|-------|-----------|-----------|
| **Bill Version Evolution** | ⭐⭐ | Low | Stability analysis, controversial sections |
| **Sponsorship Networks** | ⭐⭐ | Low | Partnerships, collaboration patterns |
| **Bill Dependencies** | ⭐⭐ | Low | Legislative archaeology, dependencies |
| **Educational Networks** | ⭐⭐ | Low | Elite networks, gatekeeping, qualifications |
| **Constituency Engagement** | ⭐⭐ | Medium | Local advocacy, equity, accountability |
| **User Trust Networks** | ⭐⭐ | Medium | Influence, reputation, community leaders |

---

## Quick Reference: Entity-Relationship Summary

### New Node Types to Add

```typescript
// Parliamentary Entities
Amendment
Section
Stage
CommitteeReport
InstitutionalRole
EthnicGroup
Tender
InfrastructureProject
Credential
ActionItem
CampaignNetwork
```

### New Relationship Types

```
// Parliamentary
-[SUBJECT_TO]- (amendments on bills)
-[REFINES]- (amendment improves)
-[SUPERSEDES]- (amendment replaces)
-[CONFLICTS_WITH]- (amendments contradict)
-[SEQUENTIAL_REVIEW]- (committee ordering)
-[ROUTES_TO]- (committee next steps)
-[DISCUSSED_IN]- (session mentions)
-[PARTICIPATED_IN]- (session attendance)
-[EVOLVED_TO]- (version progression)
-[CO_SPONSORS_WITH]- (sponsorship partners)
-[AMENDS]- (bill lifecycle)

// Political Economy
-[APPOINTED_TO]- (appointment)
-[APPOINTED_BY]- (appointer)
-[APPOINTS]- (appointment power)
-[ETHNIC_COALITION]- (ethnic voting bloc)
-[ETHNICALLY_DOMINATED_BY]- (institutional capture)
-[BELONGS_TO]- (ethnic group membership)
-[VOTES_FOR]- (ethnic voting pattern)
-[AWARDS_TENDER_TO]- (patronage)
-[LINKED_TO]- (corruption signals)
-[STUDIED_AT]- (educational gatekeeping)
-[TRAINED_BY]- (mentorship)
-[ALUMNI_NETWORK]- (institutional networks)

// Citizen/Advocacy
-[REPLIES_TO]- (comment threading)
-[AGREES_WITH]- (opinion agreement)
-[DISAGREES_WITH]- (opinion disagreement)
-[SUPPORTS_ARGUMENT]- (argument endorsement)
-[CLUSTERS_AROUND]- (sentiment clustering)
-[PART_OF_COALITION]- (citizen coalitions)
-[PARTICIPATES_IN]- (campaign participation)
-[RECRUITS_FOR]- (campaign recruitment)
-[COORDINATES_WITH]- (campaign coordination)
-[SUPPORTS_ADVOCACY_OF]- (organizational support)
-[COMPLETES_ACTION]- (action completion)
-[BUILDS_MOMENTUM_FOR]- (action sequencing)
-[ENABLES]- (action dependencies)
-[PROGRESSES_THROUGH]- (participant journey)
-[PRESSURES]- (constituency pressure)
-[REPRESENTS_INTERESTS_OF]- (constituency representation)
-[MOBILIZES]- (influencer networks)
-[FOLLOWS]- (user following)
-[TRUSTS_ON_TOPIC]- (topic expertise)
-[EXPERT_IN]- (expertise)
-[INFLUENTIAL_ARGUMENT]- (argument impact)
```

---

## Recommended Implementation Path

### Phase 3 Extension (Next 3 months)

**Focus:** High-value parliamentary relationships

1. Amendment networks (enable amendment chain analysis)
2. Appointment networks (political economy + patronage)
3. Campaign participant networks (advocacy ecosystem)
4. Committee review journeys (legislative bottleneck analysis)

**Estimated Effort:** 4-6 weeks of development

**New Capabilities:**
- Amendment influence paths
- Patronage network mapping
- Campaign coordination detection
- Committee bottleneck identification

### Phase 4 Extension (3-6 months out)

**Focus:** Political economy + citizen engagement

1. Ethnic constituency networks (representation equity)
2. Tender/infrastructure networks (resource allocation)
3. Comment/sentiment networks (consensus analysis)
4. Action item progression (campaign effectiveness)

**Estimated Effort:** 4-6 weeks

**New Capabilities:**
- Ethnic representation analysis
- Resource allocation equity
- Opinion clustering and consensus
- Campaign progression funnels

### Phase 5+ Extension (6+ months out)

Lower-value relationships and refinement

---

## Recommended Next Question

**Would you like me to:**

1. **Design Phase 3** - Full specification for amendment + appointment networks (highest ROI)
2. **Build Phase 3** - Implement the 4 Phase 3 relationships right away
3. **Analyze Specific Domain** - Deep dive into one relationship type (e.g., ethnic networks)
4. **Create Comparison** - Show how Phase 2 relationships could enhance Phase 3 entities

Which direction interests you most?

---

## Document Version

**Created:** January 8, 2026  
**Status:** Analysis Complete  
**Context:** Phase 1 & 2 completed, evaluating Phase 3+ opportunities  
**Total Relationships Identified:** 15 types across 3 domains

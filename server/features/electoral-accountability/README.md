# Electoral Accountability Engine

**Status:** ✅ Implemented  
**Priority:** PRIMARY FEATURE  
**Purpose:** Convert legislative transparency into measurable electoral consequence

---

## Overview

The Electoral Accountability Engine is Chanuka's distinguishing feature - the layer that converts transparency into political cost. While most civic platforms measure engagement (sessions, comments, sentiment ratings), Chanuka measures outcomes: MPs who changed votes under constituency pressure, bills challenged successfully in court, candidates who lost seats after voting records became local campaign material.

**Core Thesis:** Information is only as powerful as the mechanism that converts it into political cost.

---

## Key Features

### 1. Constituency-Mapped Voting Records

Every MP vote is indexed by:
- Ward
- Constituency  
- County
- Electoral cycle
- Days until next election

This geographic granularity enables ward-level accountability that matters at campaign time.

### 2. Ward-Level Sentiment Aggregation

Community sentiment on bills is aggregated by:
- Ward (most granular)
- Constituency
- County

Sentiment data includes:
- Support/oppose/neutral counts
- Confidence levels
- Sample size adequacy
- Demographic distributions (anonymized)

### 3. Representative Gap Analysis

Automated calculation of the "accountability distance" between:
- What constituents want (sentiment)
- How their MP voted (voting record)

Gap metrics include:
- Alignment gap (0-100)
- Gap severity (low/medium/high/critical)
- Electoral risk score (0-100)
- Misalignment flag

### 4. Electoral Pressure Campaigns

Organized accountability actions targeting specific misalignments:
- Campaign creation and management
- Participant tracking
- Outcome measurement (vote changes, policy changes)
- Media mention tracking
- Electoral impact documentation

### 5. Accountability Dashboards

Data exports formatted for:
- Civil society organizations
- Legal teams
- Opposition campaign strategists
- Media organizations

Export types:
- MP scorecards
- Constituency reports
- Campaign data packages

---

## API Endpoints

### GET `/api/electoral-accountability/mp-voting-record`

Get MP voting record mapped to constituency.

**Query Parameters:**
- `sponsorId` (required): MP's sponsor ID
- `constituency` (optional): Filter by constituency
- `startDate` (optional): Filter by date range
- `endDate` (optional): Filter by date range
- `includeGapAnalysis` (optional): Include gap analysis data

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "bill_id": "uuid",
      "sponsor_id": "uuid",
      "vote": "yes",
      "vote_date": "2024-03-15T10:30:00Z",
      "constituency": "Westlands",
      "county": "Nairobi",
      "alignment_with_constituency": 45.5,
      "days_until_next_election": 1095
    }
  ],
  "count": 42
}
```

### GET `/api/electoral-accountability/constituency-sentiment`

Get constituency sentiment for a bill.

**Query Parameters:**
- `billId` (required): Bill ID
- `constituency` (required): Constituency name

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bill_id": "uuid",
    "constituency": "Westlands",
    "county": "Nairobi",
    "support_count": 234,
    "oppose_count": 89,
    "neutral_count": 45,
    "total_responses": 368,
    "sentiment_score": 42.5,
    "confidence_level": 85.3,
    "sample_size_adequate": true
  }
}
```

### GET `/api/electoral-accountability/critical-gaps`

Get critical misalignments with high electoral risk.

**Query Parameters:**
- `constituency` (optional): Filter by constituency
- `sponsorId` (optional): Filter by MP
- `minRiskScore` (optional): Minimum electoral risk score (0-100)
- `limit` (optional): Max results (default 50, max 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "alignment_gap": 78.5,
      "gap_severity": "critical",
      "electoral_risk_score": 92.3,
      "constituency": "Westlands",
      "is_misaligned": true,
      "constituent_position": "oppose",
      "representative_vote": "yes",
      "days_until_election": 365
    }
  ],
  "count": 12
}
```

### POST `/api/electoral-accountability/pressure-campaign`

Create electoral pressure campaign.

**Request Body:**
```json
{
  "campaignName": "Hold MP Accountable on Finance Bill",
  "description": "MP voted YES despite 78% constituency opposition",
  "targetSponsorId": "uuid",
  "targetConstituency": "Westlands",
  "targetCounty": "Nairobi",
  "triggeredByBillId": "uuid",
  "triggeredByGapId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "campaign_name": "Hold MP Accountable on Finance Bill",
    "campaign_slug": "hold-mp-accountable-on-finance-bill-1709640000000",
    "status": "active",
    "participant_count": 0,
    "created_at": "2024-03-15T10:30:00Z"
  }
}
```

### GET `/api/electoral-accountability/mp-scorecard`

Get comprehensive MP accountability scorecard.

**Query Parameters:**
- `sponsorId` (required): MP's sponsor ID
- `constituency` (required): Constituency name

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVotes": 42,
    "alignedVotes": 28,
    "misalignedVotes": 14,
    "alignmentPercentage": 66.7,
    "averageGap": 32.5,
    "criticalGaps": 3,
    "activeCampaigns": 2,
    "electoralRiskScore": 45.8
  }
}
```

---

## Database Schema

### `voting_records`

Core voting data mapped to constituencies.

**Key Fields:**
- `bill_id`, `sponsor_id`, `vote`, `vote_date`
- `county`, `constituency`, `ward` (geographic mapping)
- `days_until_next_election`, `election_cycle` (electoral context)
- `constituent_sentiment_score`, `alignment_with_constituency` (accountability metrics)

**Indexes:**
- Constituency + vote date (hot path)
- Sponsor + vote date (MP history)
- Bill + vote + constituency (bill analysis)
- Election cycle + days until election (electoral pressure)

### `constituency_sentiment`

Ward-level community voice aggregated by constituency.

**Key Fields:**
- `county`, `constituency`, `ward`, `bill_id`
- `support_count`, `oppose_count`, `neutral_count`, `total_responses`
- `sentiment_score`, `confidence_level`, `sample_size_adequate`
- `age_distribution`, `gender_distribution` (anonymized demographics)

**Indexes:**
- Bill + constituency (primary lookup)
- County + bill (geographic aggregation)
- Ward + bill (ward-level granularity)

### `representative_gap_analysis`

The "accountability distance" between constituent wants and MP votes.

**Key Fields:**
- `voting_record_id`, `sentiment_id`
- `alignment_gap`, `gap_severity`, `electoral_risk_score`
- `is_misaligned`, `constituent_position`, `representative_vote`
- `days_until_election`

**Indexes:**
- Gap severity + electoral risk (critical gaps)
- Sponsor + alignment gap (MP accountability)
- Constituency + misalignment (constituency accountability)
- Days until election + electoral risk (electoral cycle tracking)

### `electoral_pressure_campaigns`

Organized accountability actions.

**Key Fields:**
- `campaign_name`, `campaign_slug`, `description`
- `target_sponsor_id`, `target_constituency`, `target_county`
- `status`, `participant_count`, `signature_count`
- `representative_responded`, `vote_changed`, `policy_changed`

**Indexes:**
- Active campaigns by constituency
- Sponsor + status + participants
- Successful campaigns (status = successful OR vote_changed = true)

### `accountability_dashboard_exports`

Data exports for civil society, legal teams, campaign strategists.

**Key Fields:**
- `export_name`, `export_type` (mp_scorecard, constituency_report, campaign_data)
- `constituency`, `county`, `sponsor_id`
- `export_data`, `summary_statistics`
- `requested_by`, `organization`, `purpose`

---

## Usage Examples

### Example 1: Get MP Voting Record

```typescript
import { electoralAccountabilityService } from '@server/features/electoral-accountability';

const records = await electoralAccountabilityService.getMPVotingRecord(
  'sponsor-uuid',
  {
    constituency: 'Westlands',
    startDate: new Date('2024-01-01'),
    includeGapAnalysis: true,
  }
);

console.log(`MP has ${records.length} votes in Westlands constituency`);
```

### Example 2: Calculate Representative Gap

```typescript
const gap = await electoralAccountabilityService.calculateRepresentativeGap(
  'voting-record-uuid',
  'sentiment-uuid'
);

console.log(`Alignment gap: ${gap.alignment_gap}%`);
console.log(`Gap severity: ${gap.gap_severity}`);
console.log(`Electoral risk: ${gap.electoral_risk_score}`);
```

### Example 3: Get Critical Gaps

```typescript
const criticalGaps = await electoralAccountabilityService.getCriticalGaps({
  constituency: 'Westlands',
  minRiskScore: 70,
  limit: 10,
});

console.log(`Found ${criticalGaps.length} critical misalignments`);
```

### Example 4: Create Pressure Campaign

```typescript
const campaign = await electoralAccountabilityService.createPressureCampaign({
  campaignName: 'Hold MP Accountable on Finance Bill',
  description: 'MP voted YES despite 78% constituency opposition',
  targetSponsorId: 'sponsor-uuid',
  targetConstituency: 'Westlands',
  targetCounty: 'Nairobi',
  triggeredByBillId: 'bill-uuid',
  triggeredByGapId: 'gap-uuid',
  createdBy: 'user-uuid',
});

console.log(`Campaign created: ${campaign.campaign_slug}`);
```

### Example 5: Get MP Accountability Scorecard

```typescript
const scorecard = await electoralAccountabilityService.getMPAccountabilityScorecard(
  'sponsor-uuid',
  'Westlands'
);

console.log(`Alignment: ${scorecard.alignmentPercentage}%`);
console.log(`Critical gaps: ${scorecard.criticalGaps}`);
console.log(`Electoral risk: ${scorecard.electoralRiskScore}`);
```

---

## Integration Points

### With Bills Feature

- Voting records linked to bills
- Gap analysis triggered on bill votes
- Bill sentiment aggregated by constituency

### With Community Feature

- Community votes feed constituency sentiment
- Ward-level aggregation
- Demographic distribution tracking

### With Notifications Feature

- Alert constituents when MP votes against their sentiment
- Notify campaign participants of updates
- Alert civil society of critical gaps

### With Analytics Feature

- Track alignment trends over time
- Measure campaign effectiveness
- Analyze electoral risk patterns

---

## Success Metrics

Unlike engagement metrics (sessions, comments), we measure outcomes:

1. **MPs who changed votes** under constituency pressure
2. **Bills challenged successfully** in court using gap analysis
3. **Candidates who lost seats** after voting records became campaign material
4. **Policy changes** resulting from pressure campaigns
5. **Media coverage** of accountability gaps
6. **Civil society adoption** of dashboard exports

---

## Implementation Status

- ✅ Database schema
- ✅ Domain service
- ✅ Repository layer
- ✅ HTTP API routes
- ✅ Type definitions
- ⏳ Authentication middleware (TODO)
- ⏳ Client components (TODO)
- ⏳ Data import scripts (TODO)
- ⏳ Automated gap calculation (TODO)
- ⏳ Campaign management UI (TODO)

---

## Next Steps

1. **Add authentication middleware** to routes
2. **Create data import scripts** for historical voting records
3. **Implement automated gap calculation** on bill vote events
4. **Build client components** for accountability dashboards
5. **Create campaign management UI**
6. **Integrate with notification system** for alerts
7. **Add export generation** for civil society dashboards
8. **Implement caching** for frequently accessed scorecards

---

## Related Documentation

- [CHANUKA_FORMAL_PITCH.md](../../../docs/CHANUKA_FORMAL_PITCH.md) - Product overview
- [STRATEGIC_INSIGHTS.md](../../../docs/STRATEGIC_INSIGHTS.md) - Strategic analysis
- [DESIGN_DECISIONS.md](../../../docs/DESIGN_DECISIONS.md) - Architectural decisions

---

**Last Updated:** March 5, 2026  
**Feature Owner:** Electoral Accountability Team  
**Status:** Primary Feature - Active Development

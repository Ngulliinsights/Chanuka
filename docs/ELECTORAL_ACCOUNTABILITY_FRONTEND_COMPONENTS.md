# Electoral Accountability - Frontend Components Assessment

**Date:** March 5, 2026  
**Status:** Planning Phase  
**Purpose:** Define required React components for Electoral Accountability Engine

---

## Overview

This document outlines all frontend components needed to make the Electoral Accountability Engine accessible to users. Components are organized by feature area and prioritized by importance.

---

## Component Architecture

### Directory Structure

```
client/src/features/electoral-accountability/
├── pages/
│   ├── ElectoralAccountabilityDashboard.tsx
│   ├── MPAccountabilityPage.tsx
│   ├── ConstituencyAccountabilityPage.tsx
│   ├── PressureCampaignPage.tsx
│   └── CriticalGapsPage.tsx
├── ui/
│   ├── mp-scorecard/
│   │   ├── MPScorecard.tsx
│   │   ├── VotingRecordTimeline.tsx
│   │   ├── AlignmentChart.tsx
│   │   └── CriticalGapsAlert.tsx
│   ├── constituency/
│   │   ├── ConstituencySentimentDisplay.tsx
│   │   ├── WardLevelBreakdown.tsx
│   │   ├── SentimentTrendChart.tsx
│   │   └── DemographicDistribution.tsx
│   ├── gap-analysis/
│   │   ├── GapVisualization.tsx
│   │   ├── GapSeverityBadge.tsx
│   │   ├── ElectoralRiskMeter.tsx
│   │   └── MisalignmentIndicator.tsx
│   ├── campaigns/
│   │   ├── PressureCampaignCard.tsx
│   │   ├── CampaignCreationForm.tsx
│   │   ├── CampaignMetrics.tsx
│   │   ├── ParticipantList.tsx
│   │   └── CampaignTimeline.tsx
│   ├── exports/
│   │   ├── DashboardExportForm.tsx
│   │   ├── ExportPreview.tsx
│   │   └── ExportDownloadButton.tsx
│   └── shared/
│       ├── AccountabilityMetricCard.tsx
│       ├── ConstituencySelector.tsx
│       ├── MPSelector.tsx
│       └── DateRangeFilter.tsx
├── hooks/
│   ├── useElectoralAccountability.ts
│   ├── useMPVotingRecord.ts
│   ├── useConstituencySentiment.ts
│   ├── useCriticalGaps.ts
│   ├── usePressureCampaigns.ts
│   └── useMPScorecard.ts
├── services/
│   └── electoral-accountability-api.ts
└── types/
    └── index.ts
```

---

## Priority 1: Core Components (MVP)

### 1.1 MP Accountability Scorecard

**Component:** `MPScorecard.tsx`

**Purpose:** Display comprehensive MP accountability metrics

**Features:**
- Total votes vs aligned votes
- Alignment percentage (visual gauge)
- Critical gaps count (alert badge)
- Active campaigns count
- Electoral risk score
- Quick actions (view details, create campaign)

**Data Requirements:**
- MP scorecard data from `/api/electoral-accountability/mp-scorecard`
- Sponsor information
- Constituency context

**UI Elements:**
- Metric cards with icons
- Progress bars for alignment percentage
- Color-coded risk indicators (green/yellow/red)
- Action buttons

**Example:**
```tsx
<MPScorecard
  sponsorId="uuid"
  constituency="Westlands"
  onViewDetails={() => {}}
  onCreateCampaign={() => {}}
/>
```

---

### 1.2 Voting Record Timeline

**Component:** `VotingRecordTimeline.tsx`

**Purpose:** Visual timeline of MP votes with alignment indicators

**Features:**
- Chronological list of votes
- Bill titles and dates
- Vote indicators (yes/no/abstain/absent)
- Alignment status (aligned/misaligned)
- Gap severity badges
- Click to view bill details

**Data Requirements:**
- Voting records from `/api/electoral-accountability/mp-voting-record`
- Bill metadata
- Gap analysis data

**UI Elements:**
- Timeline component
- Vote badges with colors
- Alignment icons (✓ aligned, ✗ misaligned)
- Severity badges (low/medium/high/critical)

---

### 1.3 Constituency Sentiment Display

**Component:** `ConstituencySentimentDisplay.tsx`

**Purpose:** Show ward-level community voice on bills

**Features:**
- Support/oppose/neutral counts
- Sentiment score visualization
- Confidence level indicator
- Sample size adequacy badge
- Ward-level breakdown (expandable)

**Data Requirements:**
- Constituency sentiment from `/api/electoral-accountability/constituency-sentiment`
- Ward-level data

**UI Elements:**
- Pie chart or bar chart
- Sentiment score meter (-100 to +100)
- Confidence badge
- Expandable ward list

---

### 1.4 Gap Visualization

**Component:** `GapVisualization.tsx`

**Purpose:** Visual representation of representative-constituent gap

**Features:**
- Alignment gap percentage
- Gap severity indicator
- Electoral risk score
- Constituent position vs MP vote comparison
- Days until election context

**Data Requirements:**
- Gap analysis data
- Voting record
- Sentiment data

**UI Elements:**
- Gap meter (0-100%)
- Severity badge with color coding
- Risk score gauge
- Comparison chart (constituent want vs MP vote)

---

### 1.5 Critical Gaps Dashboard

**Component:** `CriticalGapsPage.tsx`

**Purpose:** List of high-risk misalignments requiring attention

**Features:**
- Filterable list of critical gaps
- Sort by risk score, date, constituency
- Quick actions (view details, create campaign)
- Bulk campaign creation
- Export to CSV

**Data Requirements:**
- Critical gaps from `/api/electoral-accountability/critical-gaps`
- Filters (constituency, min risk score)

**UI Elements:**
- Data table with sorting/filtering
- Risk score column with visual indicators
- Action buttons per row
- Bulk action toolbar

---

## Priority 2: Campaign Management

### 2.1 Pressure Campaign Card

**Component:** `PressureCampaignCard.tsx`

**Purpose:** Display campaign summary and metrics

**Features:**
- Campaign name and description
- Target MP and constituency
- Participant count
- Signature count
- Media mentions
- Status (active/successful/failed/closed)
- Outcomes (vote changed, policy changed)

**Data Requirements:**
- Campaign data
- Target sponsor info
- Triggered bill/gap info

**UI Elements:**
- Card layout
- Metric badges
- Status indicator
- Progress bars
- Action buttons (join, share, view details)

---

### 2.2 Campaign Creation Form

**Component:** `CampaignCreationForm.tsx`

**Purpose:** Create new electoral pressure campaign

**Features:**
- Campaign name input
- Description textarea
- Target MP selector
- Target constituency selector
- Triggered bill selector (optional)
- Triggered gap selector (optional)
- Preview before submission

**Data Requirements:**
- MP list
- Constituency list
- Bill list
- Gap list

**UI Elements:**
- Multi-step form
- Autocomplete selectors
- Rich text editor for description
- Preview panel
- Submit button

---

### 2.3 Campaign Metrics Dashboard

**Component:** `CampaignMetrics.tsx`

**Purpose:** Track campaign performance and outcomes

**Features:**
- Participant growth chart
- Signature count timeline
- Media mention tracker
- Social media reach
- Outcome indicators
- Comparison with similar campaigns

**Data Requirements:**
- Campaign metrics over time
- Historical data for comparison

**UI Elements:**
- Line charts for trends
- Metric cards
- Outcome badges
- Comparison table

---

## Priority 3: Data Exports & Civil Society Tools

### 3.1 Dashboard Export Form

**Component:** `DashboardExportForm.tsx`

**Purpose:** Request accountability data exports

**Features:**
- Export type selector (MP scorecard, constituency report, campaign data)
- Scope selectors (constituency, county, MP)
- Date range picker
- Organization name input
- Purpose textarea
- Format selector (CSV, JSON, PDF)

**Data Requirements:**
- Export types
- Available constituencies/counties/MPs

**UI Elements:**
- Multi-step form
- Date range picker
- Dropdown selectors
- Text inputs
- Submit button

---

### 3.2 Export Preview

**Component:** `ExportPreview.tsx`

**Purpose:** Preview export data before download

**Features:**
- Data table preview
- Summary statistics
- Export metadata
- Download button
- Share button

**Data Requirements:**
- Export data
- Summary statistics

**UI Elements:**
- Data table
- Metric cards
- Download button
- Share options

---

## Priority 4: Advanced Visualizations

### 4.1 Alignment Chart

**Component:** `AlignmentChart.tsx`

**Purpose:** Visual trend of MP alignment over time

**Features:**
- Line chart of alignment percentage
- Trend indicators (improving/declining)
- Key events markers (elections, major bills)
- Comparison with constituency average

**Data Requirements:**
- Historical voting records
- Gap analysis over time
- Election dates

**UI Elements:**
- Line chart (Chart.js or Recharts)
- Trend arrows
- Event markers
- Legend

---

### 4.2 Electoral Risk Meter

**Component:** `ElectoralRiskMeter.tsx`

**Purpose:** Visual gauge of electoral risk

**Features:**
- Risk score (0-100)
- Color-coded zones (low/medium/high/critical)
- Days until election countdown
- Risk factors breakdown

**Data Requirements:**
- Electoral risk score
- Days until election
- Contributing factors

**UI Elements:**
- Gauge/meter component
- Color zones
- Countdown timer
- Factor list

---

### 4.3 Ward-Level Breakdown

**Component:** `WardLevelBreakdown.tsx`

**Purpose:** Granular sentiment data by ward

**Features:**
- Ward list with sentiment scores
- Interactive map (optional)
- Sort by sentiment, sample size
- Drill-down to ward details

**Data Requirements:**
- Ward-level sentiment data
- Geographic boundaries (for map)

**UI Elements:**
- Data table or list
- Map component (optional)
- Sort controls
- Expandable rows

---

## Shared Hooks

### useElectoralAccountability

**Purpose:** Main hook for electoral accountability data

**Methods:**
- `getMPVotingRecord(sponsorId, options)`
- `getConstituencySentiment(billId, constituency)`
- `getCriticalGaps(options)`
- `getMPScorecard(sponsorId, constituency)`
- `createPressureCampaign(data)`

---

### useMPVotingRecord

**Purpose:** Fetch and manage MP voting records

**Features:**
- Fetch voting records
- Filter by constituency, date range
- Include gap analysis
- Pagination support
- Loading and error states

---

### useConstituencySentiment

**Purpose:** Fetch constituency sentiment data

**Features:**
- Fetch sentiment for bill and constituency
- Real-time updates (optional)
- Loading and error states

---

### useCriticalGaps

**Purpose:** Fetch and filter critical gaps

**Features:**
- Fetch critical gaps
- Filter by constituency, sponsor, risk score
- Sort options
- Pagination
- Loading and error states

---

### usePressureCampaigns

**Purpose:** Manage pressure campaigns

**Features:**
- Fetch campaigns
- Create campaign
- Update campaign
- Join campaign
- Loading and error states

---

### useMPScorecard

**Purpose:** Fetch MP accountability scorecard

**Features:**
- Fetch scorecard data
- Cache results
- Refresh on demand
- Loading and error states

---

## API Service Layer

### electoral-accountability-api.ts

**Methods:**
```typescript
export const electoralAccountabilityApi = {
  // Voting Records
  getMPVotingRecord(sponsorId: string, options?: GetVotingRecordOptions): Promise<VotingRecord[]>
  
  // Constituency Sentiment
  getConstituencySentiment(billId: string, constituency: string): Promise<ConstituencySentiment>
  
  // Critical Gaps
  getCriticalGaps(options?: GetCriticalGapsOptions): Promise<RepresentativeGapAnalysis[]>
  
  // Pressure Campaigns
  createPressureCampaign(data: CreateCampaignData): Promise<ElectoralPressureCampaign>
  getPressureCampaigns(options?: GetCampaignsOptions): Promise<ElectoralPressureCampaign[]>
  
  // MP Scorecard
  getMPScorecard(sponsorId: string, constituency: string): Promise<MPScorecard>
  
  // Dashboard Exports
  requestExport(data: ExportRequestData): Promise<ExportRequest>
  getExport(exportId: string): Promise<DashboardExport>
  downloadExport(exportId: string): Promise<Blob>
}
```

---

## Type Definitions

### types/index.ts

```typescript
export interface VotingRecord {
  id: string;
  billId: string;
  sponsorId: string;
  vote: 'yes' | 'no' | 'abstain' | 'absent';
  voteDate: string;
  chamber: string;
  constituency: string;
  county: string;
  alignmentWithConstituency: number;
  daysUntilNextElection: number;
}

export interface ConstituencySentiment {
  id: string;
  billId: string;
  constituency: string;
  county: string;
  supportCount: number;
  opposeCount: number;
  neutralCount: number;
  totalResponses: number;
  sentimentScore: number;
  confidenceLevel: number;
  sampleSizeAdequate: boolean;
}

export interface RepresentativeGapAnalysis {
  id: string;
  alignmentGap: number;
  gapSeverity: 'low' | 'medium' | 'high' | 'critical';
  electoralRiskScore: number;
  constituency: string;
  isMisaligned: boolean;
  constituentPosition: 'support' | 'oppose' | 'neutral';
  representativeVote: 'yes' | 'no' | 'abstain' | 'absent';
  daysUntilElection: number;
}

export interface ElectoralPressureCampaign {
  id: string;
  campaignName: string;
  campaignSlug: string;
  description: string;
  targetSponsorId: string;
  targetConstituency: string;
  status: 'active' | 'successful' | 'failed' | 'closed';
  participantCount: number;
  signatureCount: number;
  mediaMentions: number;
  representativeResponded: boolean;
  voteChanged: boolean;
  policyChanged: boolean;
}

export interface MPScorecard {
  totalVotes: number;
  alignedVotes: number;
  misalignedVotes: number;
  alignmentPercentage: number;
  averageGap: number;
  criticalGaps: number;
  activeCampaigns: number;
  electoralRiskScore: number;
}
```

---

## Implementation Priority

### Phase 1: MVP (2-3 weeks)
1. MP Scorecard component
2. Voting Record Timeline
3. Constituency Sentiment Display
4. Gap Visualization
5. Critical Gaps Dashboard
6. Basic hooks and API service

### Phase 2: Campaign Management (1-2 weeks)
1. Pressure Campaign Card
2. Campaign Creation Form
3. Campaign Metrics Dashboard
4. Campaign list page

### Phase 3: Data Exports (1 week)
1. Dashboard Export Form
2. Export Preview
3. Export download functionality

### Phase 4: Advanced Features (2 weeks)
1. Alignment Chart
2. Electoral Risk Meter
3. Ward-Level Breakdown
4. Interactive maps (optional)
5. Real-time updates (optional)

---

## Design Considerations

### Accessibility
- WCAG AA compliance
- Screen reader support
- Keyboard navigation
- High contrast mode
- Responsive design (mobile-first)

### Performance
- Lazy loading for large lists
- Pagination for data tables
- Caching with React Query
- Optimistic updates
- Skeleton loaders

### User Experience
- Clear visual hierarchy
- Intuitive navigation
- Contextual help tooltips
- Error messages with recovery actions
- Success feedback
- Loading states

### Data Visualization
- Use consistent color scheme
- Color-blind friendly palettes
- Clear legends and labels
- Interactive tooltips
- Responsive charts

---

## Dependencies

### Required Libraries
- **React Query** - Data fetching and caching
- **Chart.js** or **Recharts** - Data visualization
- **React Hook Form** - Form management
- **Zod** - Client-side validation
- **date-fns** - Date manipulation
- **Tailwind CSS** - Styling
- **Headless UI** - Accessible components
- **React Router** - Navigation

### Optional Libraries
- **Leaflet** or **Mapbox** - Interactive maps
- **Socket.io-client** - Real-time updates
- **jsPDF** - PDF generation
- **Papa Parse** - CSV parsing

---

## Testing Strategy

### Unit Tests
- Component rendering
- Hook logic
- API service methods
- Utility functions

### Integration Tests
- User flows (view scorecard, create campaign)
- API integration
- Form submissions
- Data fetching and caching

### E2E Tests
- Complete user journeys
- Critical paths (create campaign, view gaps)
- Cross-browser testing

---

## Next Steps

1. **Create base components** - Start with shared components (selectors, metric cards)
2. **Implement API service** - Build the API client layer
3. **Build core hooks** - Implement data fetching hooks
4. **Develop MVP components** - Focus on Priority 1 components
5. **Add campaign management** - Implement Priority 2 components
6. **Integrate with existing features** - Connect to bills, community, notifications
7. **Testing and refinement** - Comprehensive testing and UX improvements

---

**Total Estimated Effort:** 6-8 weeks for full implementation  
**MVP Delivery:** 2-3 weeks  
**Team Size:** 2-3 frontend developers

---

**Document Status:** ✅ Complete  
**Last Updated:** March 5, 2026  
**Next Review:** After MVP implementation

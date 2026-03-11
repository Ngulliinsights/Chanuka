# Electoral Accountability Feature - Frontend

**Status:** ✅ MVP COMPLETE  
**Priority:** PRIMARY FEATURE  
**Framework:** React 18 + TypeScript + Tailwind CSS

---

## Overview

The Electoral Accountability Engine frontend provides a comprehensive UI for tracking MP voting records, constituency sentiment, representative gaps, and electoral pressure campaigns. This is Chanuka's distinguishing feature that converts legislative transparency into measurable electoral consequence.

---

## Features Implemented

### ✅ Core Components (MVP)

1. **MPScorecard** - Comprehensive MP accountability metrics
   - Alignment percentage with visual gauge
   - Misaligned votes count
   - Critical gaps alert
   - Active campaigns tracker
   - Average gap visualization
   - Electoral risk score
   - Action buttons (view details, create campaign)

2. **VotingRecordTimeline** - Visual timeline of MP votes
   - Chronological vote display
   - Vote type indicators (yes/no/abstain/absent)
   - Alignment status badges
   - Interactive vote cards
   - Hansard references
   - Days until election context

3. **AccountabilityMetricCard** - Reusable metric display
   - Configurable severity levels
   - Trend indicators
   - Icon support
   - Click handlers
   - Responsive design

4. **GapSeverityBadge** - Visual severity indicators
   - Four severity levels (low/medium/high/critical)
   - Color-coded badges
   - Icon support
   - Multiple sizes

5. **ElectoralAccountabilityDashboard** - Main page
   - Integrated scorecard and timeline
   - Info banner explaining the feature
   - Quick stats section
   - Responsive layout

### ✅ Data Layer

1. **API Service** (`electoral-accountability-api.ts`)
   - Complete REST API client
   - Type-safe requests/responses
   - Error handling
   - All 6 endpoints implemented

2. **React Query Hooks** (`useElectoralAccountability.ts`)
   - `useMPVotingRecord` - Fetch voting records
   - `useConstituencySentiment` - Fetch sentiment data
   - `useCriticalGaps` - Fetch critical gaps
   - `usePressureCampaigns` - Fetch campaigns
   - `useMPScorecard` - Fetch scorecard
   - `useCreatePressureCampaign` - Create campaign
   - `useElectoralAccountability` - Combined hook
   - Automatic caching and refetching
   - Optimistic updates

3. **TypeScript Types** (`types/index.ts`)
   - Complete type definitions
   - API request/response types
   - Component prop types
   - Utility types

---

## Component Architecture

```
client/src/features/electoral-accountability/
├── pages/
│   └── ElectoralAccountabilityDashboard.tsx    # Main dashboard page
├── ui/
│   ├── mp-scorecard/
│   │   ├── MPScorecard.tsx                     # MP accountability metrics
│   │   └── VotingRecordTimeline.tsx            # Vote timeline
│   └── shared/
│       ├── AccountabilityMetricCard.tsx        # Reusable metric card
│       └── GapSeverityBadge.tsx                # Severity badge
├── hooks/
│   └── useElectoralAccountability.ts           # React Query hooks
├── services/
│   └── electoral-accountability-api.ts         # API client
├── types/
│   └── index.ts                                # TypeScript types
├── index.ts                                    # Public API
└── README.md                                   # This file
```

---

## Usage Examples

### Basic Usage

```tsx
import { ElectoralAccountabilityDashboard } from '@/features/electoral-accountability';

function App() {
  return <ElectoralAccountabilityDashboard />;
}
```

### Using Individual Components

```tsx
import { MPScorecard, VotingRecordTimeline } from '@/features/electoral-accountability';

function MPAccountabilityPage() {
  return (
    <div>
      <MPScorecard
        sponsorId="sponsor-uuid"
        constituency="Westlands"
        onViewDetails={() => console.log('View details')}
        onCreateCampaign={() => console.log('Create campaign')}
      />
      
      <VotingRecordTimeline
        sponsorId="sponsor-uuid"
        constituency="Westlands"
        includeGapAnalysis={true}
        onVoteClick={(record) => console.log('Vote clicked:', record)}
      />
    </div>
  );
}
```

### Using Hooks Directly

```tsx
import { useMPScorecard, useCriticalGaps } from '@/features/electoral-accountability';

function CustomComponent() {
  const { data: scorecard, isLoading } = useMPScorecard('sponsor-id', 'Westlands');
  const { data: gaps } = useCriticalGaps({ minRiskScore: 70 });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Alignment: {scorecard?.alignmentPercentage}%</h2>
      <p>Critical Gaps: {gaps?.length}</p>
    </div>
  );
}
```

### Creating a Campaign

```tsx
import { useCreatePressureCampaign } from '@/features/electoral-accountability';

function CampaignForm() {
  const createCampaign = useCreatePressureCampaign();

  const handleSubmit = async (data) => {
    try {
      const campaign = await createCampaign.mutateAsync({
        campaignName: 'Hold MP Accountable',
        description: 'MP voted against constituency sentiment',
        targetSponsorId: 'sponsor-id',
        targetConstituency: 'Westlands',
        targetCounty: 'Nairobi',
      });
      console.log('Campaign created:', campaign);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Design System

### Colors

**Severity Levels:**
- Low: Green (`bg-green-50`, `text-green-800`, `border-green-200`)
- Medium: Yellow (`bg-yellow-50`, `text-yellow-800`, `border-yellow-200`)
- High: Orange (`bg-orange-50`, `text-orange-800`, `border-orange-200`)
- Critical: Red (`bg-red-50`, `text-red-800`, `border-red-200`)

**Vote Types:**
- Yes: Green (`text-green-600`, `bg-green-50`)
- No: Red (`text-red-600`, `bg-red-50`)
- Abstain: Yellow (`text-yellow-600`, `bg-yellow-50`)
- Absent: Gray (`text-gray-600`, `bg-gray-50`)

### Typography

- **Headings:** Bold, Gray-900
- **Body:** Regular, Gray-700
- **Captions:** Small, Gray-600
- **Metrics:** 3xl Bold for primary values

### Spacing

- **Card Padding:** `p-6`
- **Section Gaps:** `space-y-6` or `space-y-8`
- **Grid Gaps:** `gap-4` or `gap-6`

### Interactions

- **Hover:** `hover:shadow-lg hover:scale-105`
- **Focus:** `focus:outline-none focus:ring-2 focus:ring-blue-500`
- **Transitions:** `transition-all duration-200`

---

## Accessibility

### WCAG AA Compliance

- ✅ Semantic HTML elements
- ✅ ARIA labels and roles
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Color contrast ratios
- ✅ Screen reader friendly
- ✅ Responsive design

### Keyboard Navigation

- **Tab:** Navigate between interactive elements
- **Enter/Space:** Activate buttons and links
- **Escape:** Close modals (when implemented)

---

## Performance

### Optimization Strategies

1. **React Query Caching**
   - Scorecard: 1 hour stale time
   - Voting records: 5 minutes
   - Critical gaps: 15 minutes
   - Sentiment: 10 minutes

2. **Lazy Loading**
   - Components load on demand
   - Images lazy loaded
   - Code splitting ready

3. **Memoization**
   - Expensive calculations memoized
   - Component re-renders minimized

---

## Testing

### Unit Tests (TODO)

```tsx
// MPScorecard.test.tsx
describe('MPScorecard', () => {
  it('renders scorecard with data', () => {
    // Test implementation
  });

  it('shows critical gap alert', () => {
    // Test implementation
  });

  it('calls onCreateCampaign when button clicked', () => {
    // Test implementation
  });
});
```

### Integration Tests (TODO)

```tsx
// ElectoralAccountabilityDashboard.test.tsx
describe('ElectoralAccountabilityDashboard', () => {
  it('loads and displays MP data', async () => {
    // Test implementation
  });

  it('handles API errors gracefully', async () => {
    // Test implementation
  });
});
```

---

## Pending Components

### Priority 2: Campaign Management (TODO)

- [ ] PressureCampaignCard
- [ ] CampaignCreationForm
- [ ] CampaignMetrics
- [ ] ParticipantList
- [ ] CampaignTimeline

### Priority 3: Data Exports (TODO)

- [ ] DashboardExportForm
- [ ] ExportPreview
- [ ] ExportDownloadButton

### Priority 4: Advanced Visualizations (TODO)

- [ ] ConstituencySentimentDisplay
- [ ] GapVisualization
- [ ] AlignmentChart
- [ ] ElectoralRiskMeter
- [ ] WardLevelBreakdown

---

## Dependencies

### Required

- `react` ^18.0.0
- `react-query` ^4.0.0 or `@tanstack/react-query` ^5.0.0
- `lucide-react` ^0.263.0 (icons)
- `date-fns` ^2.30.0 (date formatting)
- `tailwindcss` ^3.3.0 (styling)

### Optional

- `recharts` or `chart.js` (for advanced charts)
- `react-hook-form` (for campaign forms)
- `zod` (for client-side validation)

---

## Integration with Existing Features

### Bills Feature

```tsx
// Link from bill detail page to accountability
<Link to={`/accountability/mp/${bill.sponsorId}?bill=${bill.id}`}>
  View MP Accountability
</Link>
```

### Community Feature

```tsx
// Show constituency sentiment in community discussions
<ConstituencySentimentDisplay
  billId={bill.id}
  constituency={user.constituency}
/>
```

### Notifications Feature

```tsx
// Notify users of critical gaps
if (gap.gapSeverity === 'critical') {
  notificationService.send({
    type: 'critical_gap',
    message: `Your MP voted against ${gap.constituentPosition} sentiment`,
  });
}
```

---

## API Endpoints Used

1. `GET /api/electoral-accountability/mp-voting-record`
2. `GET /api/electoral-accountability/constituency-sentiment`
3. `GET /api/electoral-accountability/critical-gaps`
4. `POST /api/electoral-accountability/pressure-campaign`
5. `GET /api/electoral-accountability/mp-scorecard`
6. `GET /api/electoral-accountability/health`

---

## Environment Variables

```env
# API Base URL (optional, defaults to /api)
VITE_API_BASE_URL=http://localhost:4200/api

# Feature Flags (optional)
VITE_ENABLE_ELECTORAL_ACCOUNTABILITY=true
VITE_ENABLE_CAMPAIGN_CREATION=true
```

---

## Troubleshooting

### Common Issues

**Issue:** "Failed to fetch voting record"
- **Solution:** Check API endpoint is accessible and sponsor ID is valid

**Issue:** "No voting records found"
- **Solution:** Verify data exists in database for the MP and constituency

**Issue:** Components not rendering
- **Solution:** Ensure React Query provider is configured in app root

**Issue:** TypeScript errors
- **Solution:** Run `npm install` to ensure all types are available

---

## Future Enhancements

1. **Real-time Updates** - WebSocket integration for live gap calculations
2. **Interactive Maps** - Geographic visualization of gaps by constituency
3. **Advanced Charts** - Trend analysis and predictive analytics
4. **Mobile App** - Native mobile experience
5. **Offline Support** - Progressive Web App capabilities
6. **Export to PDF** - Generate printable accountability reports

---

## Contributing

### Adding New Components

1. Create component in appropriate `ui/` subdirectory
2. Add TypeScript types to `types/index.ts`
3. Export from `index.ts`
4. Add tests
5. Update this README

### Code Style

- Use functional components with hooks
- TypeScript strict mode
- Tailwind CSS for styling
- Lucide React for icons
- ESLint + Prettier for formatting

---

## License

Part of the Chanuka Legislative Transparency Platform

---

**Status:** ✅ MVP Complete  
**Last Updated:** March 5, 2026  
**Maintainer:** Frontend Team  
**Next Milestone:** Campaign Management Components (Priority 2)

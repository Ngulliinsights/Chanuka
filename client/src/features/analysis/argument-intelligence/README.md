# Argument Intelligence Feature

AI-powered analysis and visualization of citizen arguments on legislative bills.

## Overview

The Argument Intelligence feature provides comprehensive tools for processing, analyzing, and visualizing citizen comments and arguments. It uses NLP and machine learning to extract structured arguments, cluster similar viewpoints, analyze sentiment, assess quality, and track position changes over time.

## Features

### 1. Argument Clustering
- Automatically groups similar arguments by semantic similarity
- Identifies key themes and concerns
- Shows cohesion scores for each cluster
- Displays representative claims

### 2. Sentiment Analysis
- Overall sentiment scoring (-1 to 1 scale)
- Position-based sentiment breakdown
- Visual heatmap representation
- Distribution analysis

### 3. Quality Metrics
- 5-dimensional quality assessment:
  - **Clarity**: How well-articulated the argument is
  - **Evidence**: Strength of supporting evidence
  - **Reasoning**: Logical coherence
  - **Relevance**: Connection to the bill
  - **Constructiveness**: Contribution to discussion
- Visual quality profiles
- Overall quality scoring

### 4. Position Tracking
- Track how user positions change over time
- Visualize position history
- Show strength of conviction
- Identify position changes

### 5. Filtering & Search
- Filter by position (support/oppose/neutral)
- Filter by argument type
- Filter by confidence and strength thresholds
- Full-text search across arguments

## Components

### ArgumentIntelligenceDashboard
Main dashboard component that integrates all features.

```tsx
import { ArgumentIntelligenceDashboard } from '@client/features/argument-intelligence';

<ArgumentIntelligenceDashboard billId="bill_123" />
```

### ArgumentIntelligenceWidget
Compact widget for embedding in bill pages or community discussions.

```tsx
import { ArgumentIntelligenceWidget } from '@client/features/argument-intelligence';

<ArgumentIntelligenceWidget 
  billId="bill_123" 
  compact={false}
/>
```

### Individual Components

```tsx
import {
  ArgumentClusterDisplay,
  SentimentHeatmap,
  QualityMetricsDisplay,
  PositionTrackingChart,
  ArgumentFilters,
} from '@client/features/argument-intelligence';

// Use individual components as needed
<ArgumentClusterDisplay 
  clusters={clusters}
  onClusterClick={handleClusterClick}
/>

<SentimentHeatmap sentimentData={sentimentData} />

<QualityMetricsDisplay metrics={qualityMetrics} />

<PositionTrackingChart tracking={positionTracking} />

<ArgumentFilters
  filters={filters}
  onFiltersChange={updateFilters}
  onClearFilters={clearFilters}
  onSearch={handleSearch}
/>
```

## Hooks

### useArgumentIntelligence
Main hook for managing argument intelligence data.

```tsx
import { useArgumentIntelligence } from '@client/features/argument-intelligence';

function MyComponent({ billId }) {
  const {
    arguments,
    statistics,
    clusters,
    argumentMap,
    loading,
    error,
    filters,
    updateFilters,
    clearFilters,
    refetch,
  } = useArgumentIntelligence(billId);

  // Use the data...
}
```

## API Integration

The feature integrates with the backend Argument Intelligence API:

- `GET /api/argument-intelligence/arguments/:billId` - Get arguments with filters
- `GET /api/argument-intelligence/statistics/:billId` - Get statistics
- `POST /api/argument-intelligence/cluster-arguments` - Cluster arguments
- `GET /api/argument-intelligence/argument-map/:billId` - Get argument map
- `GET /api/argument-intelligence/search` - Search arguments

See `server/features/argument-intelligence/API_DOCUMENTATION.md` for full API documentation.

## Integration with Community Feature

The Argument Intelligence feature is designed to integrate seamlessly with the community/discussion features:

```tsx
import { ArgumentIntelligenceWidget } from '@client/features/argument-intelligence';
import { DiscussionThread } from '@client/features/community';

function BillDiscussionPage({ billId }) {
  return (
    <div>
      {/* Show argument intelligence widget */}
      <ArgumentIntelligenceWidget billId={billId} />
      
      {/* Show discussion thread */}
      <DiscussionThread billId={billId} />
    </div>
  );
}
```

## Real-time Processing

Arguments are automatically processed in the background when comments are created:

1. User creates a comment
2. Comment is stored in database
3. Comment is returned to user immediately
4. Background processing extracts arguments, claims, and evidence
5. Results are stored and available for visualization

## Performance

- Argument clustering: < 5 seconds for 100 arguments
- Statistics calculation: < 500ms
- Visualization rendering: < 1 second
- All API calls are cached for optimal performance

## Testing

The feature includes comprehensive tests:

- **Unit Tests**: Individual component tests
- **Hook Tests**: Hook behavior and state management
- **E2E Tests**: Complete user workflows

Run tests:
```bash
npm test argument-intelligence
```

## Accessibility

All components are built with accessibility in mind:

- Semantic HTML structure
- ARIA labels where appropriate
- Keyboard navigation support
- Screen reader compatible
- Color contrast compliance

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Future Enhancements

- Real-time argument updates via WebSocket
- Advanced network visualization (D3.js/Cytoscape)
- Export functionality (PDF, CSV)
- Comparative analysis across bills
- Stakeholder coalition recommendations
- Evidence validation and fact-checking integration

## Contributing

When adding new features:

1. Follow the existing component structure
2. Add TypeScript types to `types.ts`
3. Update API client in `api/argument-intelligence-api.ts`
4. Write comprehensive tests
5. Update this README

## License

Part of the Chanuka Platform - See main project LICENSE

# Feature Flags Admin UI

Complete admin interface for managing feature flags, rollouts, and A/B tests.

## Features

- **Flag Management**: Create, edit, delete, and toggle feature flags
- **Rollout Controls**: Adjust rollout percentage with visual slider
- **User Targeting**: Include/exclude specific users
- **A/B Testing**: Configure variants and distribution
- **Analytics Dashboard**: View flag usage metrics and evaluation statistics
- **Real-time Updates**: Automatic UI updates via React Query

## Components

### FeatureFlagsPage
Main admin page that orchestrates all feature flag management functionality.

**Location**: `pages/FeatureFlagsPage.tsx`

**Features**:
- Flag list display
- Create/edit modal
- Analytics modal
- Responsive layout

### FlagList
Displays all feature flags with status, rollout percentage, and action buttons.

**Location**: `ui/FlagList.tsx`

**Features**:
- Flag status badges (Enabled/Disabled)
- Rollout percentage display
- A/B test indicators
- Quick toggle, edit, analytics, and delete actions
- Loading and error states

### FlagEditor
Modal form for creating and editing feature flags.

**Location**: `ui/FlagEditor.tsx`

**Features**:
- Basic flag configuration (name, description, enabled)
- Rollout percentage slider (0-100%)
- User targeting (include/exclude lists)
- A/B test configuration (variants and distribution)
- Form validation
- Create and update modes

### RolloutControls
Dedicated component for managing rollout percentage.

**Location**: `ui/RolloutControls.tsx`

**Features**:
- Visual slider for percentage adjustment
- Quick-set buttons (0%, 10%, 25%, 50%, 100%)
- Change preview before applying
- Real-time percentage display

### AnalyticsDashboard
Modal displaying comprehensive analytics for a feature flag.

**Location**: `ui/AnalyticsDashboard.tsx`

**Features**:
- Total evaluations count
- Enabled/disabled counts and percentages
- Visual distribution bar
- Additional metrics display
- Real-time data loading

## API Integration

### Hooks
All API interactions are handled through React Query hooks:

- `useFeatureFlags()` - Fetch all flags
- `useFeatureFlag(name)` - Fetch single flag
- `useFlagAnalytics(name)` - Fetch flag analytics
- `useCreateFlag()` - Create new flag
- `useUpdateFlag()` - Update existing flag
- `useDeleteFlag()` - Delete flag
- `useToggleFlag()` - Toggle flag enabled state
- `useUpdateRollout()` - Update rollout percentage

### API Client
**Location**: `api/feature-flags-api.ts`

Provides typed API methods for all feature flag operations:
- `getAllFlags()` - GET /api/feature-flags/flags
- `getFlag(name)` - GET /api/feature-flags/flags/:name
- `createFlag(data)` - POST /api/feature-flags/flags
- `updateFlag(name, data)` - PUT /api/feature-flags/flags/:name
- `deleteFlag(name)` - DELETE /api/feature-flags/flags/:name
- `toggleFlag(name, enabled)` - POST /api/feature-flags/flags/:name/toggle
- `updateRollout(name, percentage)` - POST /api/feature-flags/flags/:name/rollout
- `getAnalytics(name)` - GET /api/feature-flags/flags/:name/analytics

## Types

**Location**: `types.ts`

### FeatureFlag
```typescript
interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  userTargeting?: UserTargeting;
  abTestConfig?: ABTestConfig;
  dependencies: string[];
  metadata: {
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
  };
}
```

### UserTargeting
```typescript
interface UserTargeting {
  include?: string[];
  exclude?: string[];
  attributes?: Record<string, any>;
}
```

### ABTestConfig
```typescript
interface ABTestConfig {
  variants: string[];
  distribution: number[];
  metrics: string[];
}
```

## Usage

### Adding to Routes
```typescript
import { FeatureFlagsPage } from '@/features/feature-flags';

// In your router configuration
{
  path: '/admin/feature-flags',
  element: <FeatureFlagsPage />,
}
```

### Using Individual Components
```typescript
import { FlagList, FlagEditor, RolloutControls } from '@/features/feature-flags';

function CustomFlagManager() {
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | undefined>();
  
  return (
    <div>
      <FlagList 
        onEdit={setSelectedFlag}
        onViewAnalytics={(flag) => console.log(flag)}
      />
      {selectedFlag && (
        <RolloutControls flag={selectedFlag} />
      )}
    </div>
  );
}
```

## Testing

Test files are located in `__tests__/`:
- `FlagList.test.tsx` - Flag list component tests
- `FlagEditor.test.tsx` - Flag editor component tests
- `RolloutControls.test.tsx` - Rollout controls tests
- `AnalyticsDashboard.test.tsx` - Analytics dashboard tests
- `feature-flags-e2e.test.tsx` - End-to-end workflow tests

Run tests:
```bash
npm test -- src/features/feature-flags/__tests__/
```

## Backend Integration

This UI integrates with the existing backend feature flag system:
- **Service**: `server/features/feature-flags/domain/service.ts`
- **Routes**: `server/features/feature-flags/application/routes.ts`
- **API Base**: `/api/feature-flags`

The backend provides:
- Feature flag CRUD operations
- User targeting logic
- Percentage-based rollouts
- A/B test variant assignment
- Analytics and evaluation tracking

## Styling

Components use Tailwind CSS for styling with a consistent design system:
- **Colors**: Blue for primary actions, green for enabled states, red for destructive actions
- **Spacing**: Consistent padding and margins
- **Typography**: Clear hierarchy with appropriate font sizes
- **Responsive**: Mobile-friendly layouts

## Accessibility

- Semantic HTML elements
- Proper ARIA labels
- Keyboard navigation support
- Focus management in modals
- Screen reader friendly

## Future Enhancements

- [ ] Bulk operations (enable/disable multiple flags)
- [ ] Flag templates for common patterns
- [ ] Advanced analytics with charts
- [ ] Flag dependency visualization
- [ ] Audit log viewer
- [ ] Export/import flag configurations
- [ ] Flag scheduling (enable/disable at specific times)
- [ ] Webhook notifications for flag changes

## Related Documentation

- [Backend Feature Flags Implementation](../../../../../server/features/feature-flags/README.md)
- [Feature Flag Design](../../../../../.agent/specs/strategic-integration/design.md)
- [Strategic Integration Tasks](../../../../../.agent/specs/strategic-integration/tasks.md)

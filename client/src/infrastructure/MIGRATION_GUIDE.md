# WebSocket/Real-time Consolidation Migration Guide

This guide helps you migrate from scattered WebSocket and real-time implementations to the consolidated `client/src/infrastructure/realtime` module.

## Overview

All WebSocket and real-time functionality has been consolidated into a single module at `client/src/infrastructure/realtime/`. This provides a unified, type-safe interface for all real-time features.

## Migration Steps

### 1. Identify Files to Replace

Look for files containing WebSocket or real-time logic in these locations:

- `src/hooks/use-websocket.ts`
- `src/hooks/use-realtime-engagement.ts`
- `src/services/webSocketService.ts`
- `src/services/community-websocket-extension.ts`
- Any files with WebSocket connections or real-time subscriptions

### 2. Update Imports

Replace old imports with the consolidated module:

```typescript
// ❌ Old way
import { useWebSocket } from './hooks/use-websocket';
import { useRealTimeEngagement } from './hooks/use-realtime-engagement';

// ✅ New way
import { useWebSocket, useBillTracking, useCommunityRealTime } from '@client/infrastructure/realtime';
```

### 3. Replace Hook Usage

#### For Bill Tracking

```typescript
// ❌ Old way
const { subscribeToBill, getBillUpdates } = useRealTimeEngagement();

// ✅ New way
const { subscribeToBill, getBillUpdates } = useBillTracking();
```

#### For Community Features

```typescript
// ❌ Old way
const { getTypingIndicators, sendTypingIndicator } = useRealTimeEngagement();

// ✅ New way
const { typingIndicators, sendTypingIndicator } = useCommunityRealTime();
```

### 4. Update Service Access

```typescript
// ❌ Old way
import { webSocketService } from './services/webSocketService';

// ✅ New way
import { realTimeService } from '@client/infrastructure/realtime';
const wsManager = realTimeService.getWebSocketManager();
const billService = realTimeService.getBillTrackingService();
```

### 5. Configuration Updates

Replace any custom WebSocket configuration:

```typescript
// ❌ Old way
const wsConfig = {
  url: 'ws://localhost:3001',
  reconnect: true,
};

// ✅ New way
import { getRealTimeConfig } from '@client/infrastructure/realtime';
const config = getRealTimeConfig();
```

## Code Examples

### Before Migration

```typescript
// Component using scattered real-time features
import React, { useEffect } from 'react';
import { useWebSocket } from '../hooks/use-websocket';
import { useRealTimeEngagement } from '../hooks/use-realtime-engagement';

function BillTracker({ billId }) {
  const { isConnected } = useWebSocket();
  const { subscribeToBill, getBillUpdates, getEngagementMetrics } = useRealTimeEngagement();

  useEffect(() => {
    subscribeToBill(billId);
    return () => {
      // Unsubscribe logic
    };
  }, [billId, subscribeToBill]);

  const updates = getBillUpdates(billId);
  const metrics = getEngagementMetrics(billId);

  return (
    <div>
      <div>Connection: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Render updates */}
    </div>
  );
}
```

### After Migration

```typescript
// Component using consolidated real-time module
import React, { useEffect } from 'react';
import { useBillTracking, useCommunityRealTime } from '@client/infrastructure/realtime';

function BillTracker({ billId }) {
  const {
    isConnected,
    subscribeToBill,
    unsubscribeFromBill,
    getBillUpdates,
    getEngagementMetrics
  } = useBillTracking();

  const { typingIndicators, sendTypingIndicator } = useCommunityRealTime();

  useEffect(() => {
    subscribeToBill(billId);
    return () => {
      unsubscribeFromBill(billId);
    };
  }, [billId, subscribeToBill, unsubscribeFromBill]);

  const updates = getBillUpdates(billId);
  const metrics = getEngagementMetrics(billId);

  return (
    <div>
      <div>Connection: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {/* Render updates */}
    </div>
  );
}
```

## Breaking Changes

### 1. Hook API Changes

- `useRealTimeEngagement` is deprecated
- Split into `useBillTracking` and `useCommunityRealTime`
- Some method names may have changed

### 2. Service Structure

- Services are now accessed through `realTimeService`
- Direct WebSocket access is discouraged (use hooks instead)

### 3. Configuration

- Configuration is now centralized
- Environment-specific configs are handled automatically

## Testing Migration

### Update Test Mocks

```typescript
// ❌ Old mock
vitest.mock('../hooks/use-websocket', () => ({
  useWebSocket: vitest.fn(() => ({ isConnected: true })),
}));

// ✅ New mock
vitest.mock('@client/infrastructure/realtime', () => ({
  useBillTracking: vitest.fn(() => ({
    isConnected: true,
    subscribeToBill: vitest.fn(),
    getBillUpdates: vitest.fn(() => []),
  })),
}));
```

### Update Test Assertions

```typescript
// ❌ Old test
expect(useWebSocket).toHaveBeenCalled();

// ✅ New test
expect(useBillTracking).toHaveBeenCalled();
```

## Migration Checklist

- [ ] Identify all WebSocket/real-time related files
- [ ] Create backup of existing implementation
- [ ] Update imports to use consolidated module
- [ ] Replace deprecated hooks with new ones
- [ ] Update service access patterns
- [ ] Migrate configuration
- [ ] Update tests and mocks
- [ ] Test all real-time functionality
- [ ] Update documentation
- [ ] Remove old files after successful migration

## Troubleshooting

### Common Issues

1. **Import Path Errors**
   - Ensure `@client/infrastructure/realtime` is correctly configured in your module resolution

2. **Hook Not Found**
   - Verify the hook is exported from the main index file

3. **Type Errors**
   - Check that TypeScript types are properly imported
   - Run `npm run type-check` to verify types

4. **Missing Functionality**
   - Some features may have been renamed or restructured
   - Check the consolidated module's README for the correct API

### Debug Steps

1. Check console for error messages
2. Verify module is properly installed and imported
3. Review the consolidated module's type definitions
4. Test with a simple component first
5. Gradually migrate complex features

## Rollback Plan

If migration fails:

1. Keep the old files backed up
2. Restore old imports and implementations
3. Revert to previous working state
4. Debug issues in a separate branch
5. Retry migration after fixing issues

## Support

For migration assistance:

1. Review the consolidated module's README
2. Check existing GitHub issues
3. Consult the development team
4. Test in development environment first

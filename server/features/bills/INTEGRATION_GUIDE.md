# Bill Integration Guide

## Overview

The Bills feature now includes automatic integration with intelligence features (Pretext Detection, Constitutional Analysis, Market Intelligence) and engagement features (Notifications, Recommendations).

## Architecture

### Components

1. **BillIntegrationOrchestrator** - Coordinates processing of bills through intelligence features
2. **BillLifecycleHooks** - Event-driven hooks that trigger on bill create/update/status change
3. **Integration Status Routes** - API endpoints to monitor and control integrations

### Integration Flow

```
Bill Created/Updated
    ↓
BillLifecycleHooks (async, non-blocking)
    ↓
BillIntegrationOrchestrator
    ↓
    ├─→ Pretext Detection (optional)
    ├─→ Constitutional Analysis (optional)
    ├─→ Market Intelligence (optional)
    ├─→ Notifications (optional)
    └─→ Recommendations (optional)
```

## Safety Features

### Non-Blocking Design

All integrations run asynchronously and never block bill operations:

```typescript
// Fire and forget - doesn't block bill creation
billLifecycleHooks.onBillCreated(newBill).catch(error => {
  logger.warn({ error }, 'Hook failed (non-blocking)');
});
```

### Graceful Degradation

Each integration feature is optional and fails gracefully:

```typescript
try {
  const { pretextDetectionService } = await import('@server/features/pretext-detection');
  // Use feature
} catch (error) {
  // Feature not available - continue without it
  logger.debug({ error }, 'Pretext detection not available');
}
```

### Feature Flags

Integrations can be enabled/disabled at runtime:

```typescript
// Disable all hooks
billLifecycleHooks.setEnabled(false);

// Enable all hooks
billLifecycleHooks.setEnabled(true);
```

## API Endpoints

### Get Integration Status

```http
GET /api/bills/integration/status
```

Response:
```json
{
  "success": true,
  "data": {
    "hooksEnabled": true,
    "availableFeatures": {
      "pretextDetection": true,
      "constitutionalAnalysis": true,
      "marketIntelligence": false,
      "notifications": true,
      "recommendations": true
    },
    "timestamp": "2026-03-05T10:30:00Z"
  }
}
```

### Enable Hooks

```http
POST /api/bills/integration/enable
```

### Disable Hooks

```http
POST /api/bills/integration/disable
```

## Usage Examples

### Programmatic Control

```typescript
import { billLifecycleHooks, billIntegrationOrchestrator } from '@server/features/bills';

// Disable hooks for testing
billLifecycleHooks.setEnabled(false);

// Manually trigger processing
const result = await billIntegrationOrchestrator.processBill(bill);
if (result.isOk) {
  console.log('Analysis:', result.value);
}

// Re-enable hooks
billLifecycleHooks.setEnabled(true);
```

### Monitoring

```typescript
import { logger } from '@server/infrastructure/observability';

// Hooks log all activity
logger.info({ billId: bill.id }, 'Processing bill through integration pipeline');
logger.info({ billId: bill.id, result }, 'Bill integration pipeline completed');
```

## Integration Points

### Pretext Detection

Automatically analyzes bills for trojan patterns:

```typescript
{
  hasTrojan: boolean;
  concerns: string[];
}
```

### Constitutional Analysis

Analyzes constitutional implications:

```typescript
{
  concerns: string[];
  riskLevel: 'low' | 'medium' | 'high';
}
```

### Market Intelligence

Analyzes economic impact:

```typescript
{
  economicImpact: string;
  affectedSectors: string[];
}
```

### Notifications

Notifies interested users about:
- New bills matching their interests
- Bill status changes
- Critical findings (trojans, constitutional issues)

### Recommendations

Updates recommendation engine with:
- New bill data
- User engagement patterns
- Analysis results

## Performance Considerations

### Async Processing

All integrations run asynchronously to avoid blocking:

```typescript
// Bill creation returns immediately
const bill = await billService.createBill(data);

// Integrations process in background
// (no waiting required)
```

### Caching

Integration results are cached to avoid reprocessing:

```typescript
// First analysis - runs all features
await orchestrator.processBill(bill);

// Subsequent calls - uses cached results
await orchestrator.processBill(bill); // Fast
```

### Selective Reprocessing

Only significant changes trigger reprocessing:

```typescript
// Triggers reprocessing
await billService.updateBill(id, { 
  title: 'New Title',  // Significant
  full_text: 'New text' // Significant
});

// Doesn't trigger reprocessing
await billService.updateBill(id, { 
  view_count: 100  // Not significant
});
```

## Testing

### Unit Tests

```typescript
import { billLifecycleHooks } from '@server/features/bills';

describe('BillLifecycleHooks', () => {
  beforeEach(() => {
    billLifecycleHooks.setEnabled(false);
  });

  it('should not process when disabled', async () => {
    await billLifecycleHooks.onBillCreated(bill);
    // No processing occurs
  });
});
```

### Integration Tests

```typescript
describe('Bill Integration', () => {
  it('should process bill through pipeline', async () => {
    const bill = await billService.createBill(data);
    
    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check results
    const status = await fetch('/api/bills/integration/status');
    expect(status.hooksEnabled).toBe(true);
  });
});
```

## Troubleshooting

### Hooks Not Running

Check if hooks are enabled:

```typescript
console.log(billLifecycleHooks.isHooksEnabled()); // Should be true
```

### Feature Not Available

Check feature availability:

```http
GET /api/bills/integration/status
```

Look at `availableFeatures` to see which features are loaded.

### Performance Issues

If integrations are slow:

1. Check logs for errors
2. Verify features are responding
3. Consider disabling specific features
4. Monitor async queue depth

## Migration Guide

### Existing Code

No changes required! The integration is backward compatible:

```typescript
// This still works exactly as before
const bill = await billService.createBill(data);
```

### Opting Out

To disable integrations:

```typescript
// Globally
billLifecycleHooks.setEnabled(false);

// Or via API
POST /api/bills/integration/disable
```

## Future Enhancements

Planned improvements:

1. **Batch Processing** - Process multiple bills efficiently
2. **Priority Queue** - Prioritize important bills
3. **Retry Logic** - Retry failed integrations
4. **Metrics Dashboard** - Visualize integration performance
5. **Custom Pipelines** - Configure which features run per bill type

## Support

For issues or questions:

1. Check logs: `logger.info({ billId }, 'Integration status')`
2. Check status endpoint: `GET /api/bills/integration/status`
3. Review this guide
4. Contact the platform team

---

**Status:** Production Ready  
**Version:** 1.0.0  
**Last Updated:** March 5, 2026

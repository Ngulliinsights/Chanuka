# Bill Integration Quick Start

## TL;DR

Bills now automatically process through intelligence features. No code changes needed - it just works!

## What Happens Automatically

When you create or update a bill:

```typescript
const bill = await billService.createBill({
  title: "Digital Privacy Act",
  summary: "Protects user data",
  // ... other fields
});
// ✅ Bill created immediately
// 🔄 Background: Pretext detection runs
// 🔄 Background: Constitutional analysis runs
// 🔄 Background: Market intelligence runs
// 🔄 Background: Users notified
// 🔄 Background: Recommendations updated
```

## Control Integration

### Check Status

```typescript
GET /api/bills/integration/status
```

### Disable (for testing)

```typescript
import { billLifecycleHooks } from '@server/features/bills';

billLifecycleHooks.setEnabled(false);
// Now bills won't trigger integrations
```

### Re-enable

```typescript
billLifecycleHooks.setEnabled(true);
// Back to normal
```

## Manual Processing

```typescript
import { billIntegrationOrchestrator } from '@server/features/bills';

const result = await billIntegrationOrchestrator.processBill(bill);
if (result.isOk) {
  console.log('Pretext:', result.value.pretextDetection);
  console.log('Constitutional:', result.value.constitutionalAnalysis);
  console.log('Market:', result.value.marketIntelligence);
}
```

## Testing

```typescript
describe('My Bill Test', () => {
  beforeEach(() => {
    // Disable integrations for faster tests
    billLifecycleHooks.setEnabled(false);
  });

  afterEach(() => {
    // Re-enable for other tests
    billLifecycleHooks.setEnabled(true);
  });

  it('should create bill', async () => {
    const bill = await billService.createBill(data);
    expect(bill).toBeDefined();
    // No integration processing in test
  });
});
```

## Troubleshooting

### Integrations not running?

```typescript
// Check if enabled
console.log(billLifecycleHooks.isHooksEnabled());

// Check which features are available
const response = await fetch('/api/bills/integration/status');
console.log(response.availableFeatures);
```

### Too slow?

Integrations run in background and don't block. If you're seeing slowness, it's not the integrations.

### Want to opt out?

```typescript
// Globally disable
billLifecycleHooks.setEnabled(false);

// Or via API
POST /api/bills/integration/disable
```

## That's It!

The integration is designed to be invisible. Just use the bill service as normal and everything happens automatically.

For more details, see [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

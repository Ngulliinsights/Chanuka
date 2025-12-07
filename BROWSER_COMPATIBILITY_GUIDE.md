# Browser Compatibility - Quick Reference Guide

## TL;DR

All browser APIs work everywhere. Use them directly—polyfills handle older browsers automatically.

---

## What Changed?

### Before
```typescript
// Old way: check, detect, implement fallback in every component
import { featureDetector } from '@client/core';

export function MyComponent() {
  const supportsFeature = useMemo(() => 
    featureDetector.detectIntersectionObserverSupport()
  );
  
  if (supportsFeature) {
    // Native implementation
  } else {
    // Manual fallback implementation
  }
}
```

### After
```typescript
// New way: just use the API, polyfill handles it
import { useIntersectionObserver } from '@client/components/compatibility/FeatureFallbacks';

export function MyComponent() {
  const isVisible = useIntersectionObserver(ref);
  // That's it! Works in all browsers
}
```

---

## Using Browser APIs

### IntersectionObserver
```typescript
import { useIntersectionObserver } from '@client/components/compatibility/FeatureFallbacks';

const isVisible = useIntersectionObserver(ref, { rootMargin: '50px' });
// Works in IE11+ thanks to polyfill
```

### ResizeObserver
```typescript
import { useResizeObserver } from '@client/components/compatibility/FeatureFallbacks';

useResizeObserver(ref, (entry) => {
  console.log(entry.contentRect);
});
// Works in IE11+ thanks to polyfill
```

### Clipboard API
```typescript
import { ClipboardButton } from '@client/components/compatibility/FeatureFallbacks';

<ClipboardButton text="Copy me!" onSuccess={() => alert('Copied!')}>
  📋 Copy
</ClipboardButton>
// Works everywhere - polyfill uses execCommand fallback
```

### Fullscreen API
```typescript
import { FullscreenButton } from '@client/components/compatibility/FeatureFallbacks';

const ref = useRef<HTMLDivElement>(null);
<FullscreenButton 
  targetRef={ref}
  onEnterFullscreen={() => console.log('fullscreen!')}
>
  🖥️ Fullscreen
</FullscreenButton>
// Works in all browsers, polyfill handles vendor prefixes
```

### Storage APIs
```typescript
import { useStorageFallback } from '@client/components/compatibility/FeatureFallbacks';

const [value, setValue] = useStorageFallback('myKey', 'default');
// localStorage always works, polyfill provides memory fallback if disabled
```

### Web Workers
```typescript
import { useWebWorkerFallback } from '@client/components/compatibility/FeatureFallbacks';

const processData = useWebWorkerFallback('/worker.js', (data) => {
  // Fallback function for older browsers
  return heavyComputation(data);
});

const result = await processData(myData);
// Uses worker if available, main thread otherwise
```

---

## Displaying Browser Information

### Show Warning if Browser is Old
```typescript
import { BrowserCompatibilityWarning } from '@client/components/compatibility/useBrowserStatus';

<BrowserCompatibilityWarning />
// Shows yellow banner if compatibility < 80%
```

### Show Detailed Diagnostics
```typescript
import { BrowserCompatibilityDetails } from '@client/components/compatibility/useBrowserStatus';

<BrowserCompatibilityDetails />
// Shows browser info, features, score, recommendations
```

### Custom Compatibility Checks
```typescript
import { useBrowserCompatibilityStatus } from '@client/components/compatibility/useBrowserStatus';

export function MyComponent() {
  const status = useBrowserCompatibilityStatus();
  
  if (!status) return <div>Loading...</div>;
  
  return (
    <div>
      Browser: {status.browserInfo.name}
      Score: {status.compatibilityScore}%
      Features: {Object.values(status.browserInfo.features).filter(Boolean).length}
    </div>
  );
}
```

---

## For Developers

### When to Use What

| Need | Use | Location |
|------|-----|----------|
| Lazy load images | `LazyImage` component | `FeatureFallbacks.tsx` |
| Observe element visibility | `useIntersectionObserver` hook | `FeatureFallbacks.tsx` |
| Observe element size | `useResizeObserver` hook | `FeatureFallbacks.tsx` |
| Copy to clipboard | `ClipboardButton` or `navigator.clipboard` | Any file |
| Fullscreen toggle | `FullscreenButton` or standard API | Any file |
| Persistent storage | `useStorageFallback` or `localStorage` | `FeatureFallbacks.tsx` |
| Background processing | `useWebWorkerFallback` | `FeatureFallbacks.tsx` |
| Display warnings | `BrowserCompatibilityWarning` | `useBrowserStatus.tsx` |
| Show diagnostics | `BrowserCompatibilityDetails` | `useBrowserStatus.tsx` |
| Check browser info | `useBrowserCompatibilityStatus()` hook | `useBrowserStatus.tsx` |

### Key Principle

**Don't check if a feature exists.** The polyfill guarantees it does. Just use it.

```typescript
// ❌ DON'T DO THIS
if ('IntersectionObserver' in window) {
  // use IntersectionObserver
} else {
  // manual fallback
}

// ✅ DO THIS INSTEAD
// IntersectionObserver is guaranteed to exist
const observer = new IntersectionObserver(callback);
```

---

## Under the Hood

### Where Polyfills Load
```typescript
// Automatic at app startup in browser.ts
if (isBrowserEnv() && !isTestEnv()) {
  browserCompatibilityManager.initialize(); // Auto-called
}
```

### What Gets Polyfilled
- ✅ IntersectionObserver
- ✅ ResizeObserver
- ✅ Fetch API
- ✅ Promises
- ✅ localStorage/sessionStorage
- ✅ Fullscreen API
- ✅ Clipboard API

### Browsers Supported
- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+
- IE 11 (with polyfills)

---

## Common Issues

### "ClipboardButton didn't copy"
**Probably:** Permissions issue or HTTPS required
**Solution:** Check browser console, use error callback
```typescript
<ClipboardButton 
  text="test"
  onError={(err) => console.error(err)}
>
  Copy
</ClipboardButton>
```

### "ResizeObserver not firing"
**Probably:** Element size didn't actually change
**Solution:** Verify element dimensions changed, add logging
```typescript
useResizeObserver(ref, (entry) => {
  console.log('New size:', entry.contentRect.width, entry.contentRect.height);
});
```

### "LazyImage not loading"
**Probably:** Image URL is wrong or CORS issue
**Solution:** Check image URL, use `onError` callback
```typescript
<LazyImage
  src="/image.jpg"
  alt="test"
  onError={() => console.error('Failed to load image')}
/>
```

---

## Testing

### Don't test polyfills in components
```typescript
// ❌ DON'T test that IntersectionObserver fallback works
// ❌ DON'T test ResizeObserver detection

// ✅ DO test that your component uses the API correctly
// ✅ DO test the component's behavior, not the polyfill
```

### Mock the API in tests
```typescript
describe('MyComponent', () => {
  beforeEach(() => {
    // API is always available, no need to mock
    expect('IntersectionObserver' in window).toBe(true);
  });
});
```

---

## Performance Tips

1. **Polyfills load automatically** - nothing to do
2. **Use hooks instead of raw APIs** - cleaner code
3. **Memoize expensive callbacks** - standard React practice
4. **Use lazy loading** - reduces initial load
5. **Profile in old browsers** - polyfills are slower but sufficient

---

## FAQ

**Q: What if a polyfill fails to load?**  
A: Application continues working. Native APIs preferred, graceful fallback to memory-only storage.

**Q: Can I check browser compatibility?**  
A: Yes, use `useBrowserCompatibilityStatus()` for display only, not for logic.

**Q: Do I need to remove feature detection checks?**  
A: Gradually. Old code still works. New code shouldn't check for features.

**Q: What about IE11?**  
A: Polyfills support IE11. Works (slower), but functional.

**Q: Can I customize which polyfills load?**  
A: Currently no, all load automatically. Future enhancement.

**Q: How do I debug polyfill issues?**  
A: Check browser console, use `BrowserCompatibilityDetails` component.

---

## More Resources

- [Full Architecture Refactoring Document](./BROWSER_ARCHITECTURE_REFACTORING.md)
- [browser.ts source](./client/src/utils/browser.ts)
- [FeatureFallbacks source](./client/src/components/compatibility/FeatureFallbacks.tsx)
- [useBrowserStatus source](./client/src/components/compatibility/useBrowserStatus.tsx)

---

## Support

For issues or questions:
1. Check the full architecture document
2. Review the source code comments
3. Check component error callbacks
4. Use BrowserCompatibilityDetails for diagnostics

# Asset Loading Infrastructure Module

## Overview

The Asset Loading Infrastructure module provides asset loading and management utilities for optimizing resource loading, implementing lazy loading strategies, and managing asset preloading capabilities across the Chanuka platform.

## Purpose and Responsibilities

- **Asset Preloading**: Preload critical assets for faster initial render
- **Lazy Loading**: Defer non-critical asset loading until needed
- **Image Optimization**: Optimize image loading with responsive images
- **Font Loading**: Manage web font loading strategies
- **Resource Prioritization**: Prioritize critical resources
- **Loading State Management**: Track asset loading progress

## Public Exports

### Components

- `AssetLoadingProvider` - Provider component for asset loading context

### Hooks

- `useAssetLoading()` - Access asset loading context and utilities
- `usePreloadAssets()` - Preload specific assets programmatically
- `useLazyImage()` - Lazy load images with intersection observer

### Types

- `AssetLoadingConfig` - Asset loading configuration
- `AssetType` - Supported asset types
- `LoadingStrategy` - Loading strategy options

## Usage Examples

### Basic Asset Loading Provider

```typescript
import { AssetLoadingProvider } from '@/infrastructure/asset-loading';

function App() {
  return (
    <AssetLoadingProvider
      preloadAssets={[
        '/images/logo.png',
        '/images/hero.jpg',
        '/fonts/primary.woff2'
      ]}
      lazyLoadImages={true}
      onLoadComplete={() => console.log('Assets loaded')}
    >
      <YourApp />
    </AssetLoadingProvider>
  );
}
```

### Preload Critical Assets

```typescript
import { AssetLoadingProvider } from '@/infrastructure/asset-loading';

function Root() {
  const criticalAssets = [
    { url: '/images/hero.jpg', type: 'image', priority: 'high' },
    { url: '/fonts/primary.woff2', type: 'font', priority: 'high' },
    { url: '/css/critical.css', type: 'style', priority: 'high' }
  ];

  return (
    <AssetLoadingProvider
      preloadAssets={criticalAssets}
      showLoadingScreen={true}
      minimumLoadingTime={500}
    >
      <App />
    </AssetLoadingProvider>
  );
}
```

### Lazy Load Images

```typescript
import { useLazyImage } from '@/infrastructure/asset-loading';

function ImageGallery({ images }) {
  return (
    <div className="gallery">
      {images.map(img => (
        <LazyImage key={img.id} src={img.url} alt={img.alt} />
      ))}
    </div>
  );
}

function LazyImage({ src, alt }) {
  const { ref, isLoaded, error } = useLazyImage(src);

  return (
    <div ref={ref} className="image-container">
      {!isLoaded && <Skeleton />}
      {error && <ErrorPlaceholder />}
      {isLoaded && <img src={src} alt={alt} />}
    </div>
  );
}
```

### Programmatic Asset Preloading

```typescript
import { usePreloadAssets } from '@/infrastructure/asset-loading';

function Dashboard() {
  const { preload, isLoading, progress } = usePreloadAssets();

  useEffect(() => {
    // Preload dashboard assets on mount
    preload([
      '/api/dashboard/data',
      '/images/charts/background.png',
      '/fonts/dashboard.woff2'
    ]);
  }, []);

  if (isLoading) {
    return <LoadingScreen progress={progress} />;
  }

  return <DashboardContent />;
}
```

### Responsive Image Loading

```typescript
import { AssetLoadingProvider } from '@/infrastructure/asset-loading';

function App() {
  return (
    <AssetLoadingProvider
      responsiveImages={{
        enabled: true,
        breakpoints: {
          mobile: 640,
          tablet: 1024,
          desktop: 1920
        },
        formats: ['webp', 'jpg']
      }}
    >
      <YourApp />
    </AssetLoadingProvider>
  );
}
```

### Font Loading Strategy

```typescript
import { AssetLoadingProvider } from '@/infrastructure/asset-loading';

function App() {
  return (
    <AssetLoadingProvider
      fontLoadingStrategy="swap" // or "block", "fallback", "optional"
      preloadFonts={[
        '/fonts/primary-regular.woff2',
        '/fonts/primary-bold.woff2'
      ]}
    >
      <YourApp />
    </AssetLoadingProvider>
  );
}
```

## Best Practices

1. **Critical Assets First**: Preload only critical above-the-fold assets
2. **Lazy Load Below Fold**: Defer loading of below-the-fold content
3. **Responsive Images**: Use srcset and sizes for responsive images
4. **Font Display**: Use font-display: swap for better perceived performance
5. **Resource Hints**: Use preload, prefetch, and preconnect appropriately
6. **Loading Feedback**: Provide visual feedback during asset loading
7. **Error Handling**: Handle asset loading failures gracefully

## Sub-Module Organization

```
asset-loading/
├── index.ts                    # Public API exports
├── AssetLoadingProvider.tsx    # Provider component
└── README.md                   # This file
```

## Integration Points

- **Browser Module**: Detects browser capabilities for optimal loading
- **Performance Module**: Tracks asset loading performance metrics
- **Observability Module**: Monitors asset loading success/failure rates
- **Cache Module**: Caches loaded assets for faster subsequent loads

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md documenting purpose and API
- **Requirement 5.1**: All exports documented in index.ts
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [Browser Module](../browser/README.md) - Browser capability detection
- [Observability Module](../observability/README.md) - Performance tracking
- [Cache Module](../cache/README.md) - Asset caching

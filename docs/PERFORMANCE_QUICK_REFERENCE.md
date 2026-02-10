# Performance Optimization Quick Reference

**Date:** February 10, 2026

## Quick Commands

### Build & Analysis
```bash
# Standard build
npm run build

# Build with bundle analysis
ANALYZE=true npm run build

# Build with analysis auto-open
ANALYZE=true ANALYZE_OPEN=true npm run build

# Type check
npm run type-check

# Preview production build
npm run preview
```

### Performance Testing
```bash
# Lighthouse audit
npm run build
npm run preview
# Open Chrome DevTools > Lighthouse > Run audit

# Check bundle sizes
ls -lh dist/assets/js/

# Check compressed sizes
ls -lh dist/assets/js/*.br
ls -lh dist/assets/js/*.gz
```

## Chunk Strategy

### Vendor Chunks (node_modules)
| Chunk | Contents | Size Target |
|-------|----------|-------------|
| react-vendor | React core | ~150KB |
| router-vendor | React Router | ~50KB |
| ui-vendor | UI libraries | ~100KB |
| data-vendor | Data fetching | ~80KB |
| charts-vendor | Visualization | ~150KB |
| date-vendor | Date utilities | ~30KB |
| state-vendor | Redux | ~50KB |
| vendor | Other deps | ~100KB |

### Application Chunks (src/)
| Chunk | Contents | Size Target |
|-------|----------|-------------|
| app-core | Core infrastructure | ~120KB |
| infrastructure | Infrastructure layer | ~80KB |
| services | Service layer | ~60KB |
| feature-{name} | Per-feature code | ~50-100KB |
| ui-{category} | UI components | ~40-80KB |

## Performance Targets

### Core Web Vitals
- **LCP:** < 2.5s (Largest Contentful Paint)
- **FID:** < 100ms (First Input Delay)
- **CLS:** < 0.1 (Cumulative Layout Shift)

### Load Times
- **Initial Load:** < 3s
- **Time to Interactive:** < 3.5s
- **First Contentful Paint:** < 1.5s

### Bundle Sizes
- **Total Initial:** < 700KB
- **Per Chunk:** < 400KB
- **Vendor Chunks:** < 200KB each
- **Feature Chunks:** < 150KB each

## Optimization Checklist

### Before Committing
- [ ] Run `npm run type-check`
- [ ] Run `npm run build`
- [ ] Check for chunk size warnings
- [ ] Verify no new large dependencies

### Before Deploying
- [ ] Run bundle analysis
- [ ] Check compressed sizes
- [ ] Test with Lighthouse
- [ ] Verify Core Web Vitals
- [ ] Test on slow 3G network

### After Deploying
- [ ] Monitor bundle sizes
- [ ] Track Core Web Vitals
- [ ] Check error rates
- [ ] Monitor load times
- [ ] Review user feedback

## Common Issues & Solutions

### Issue: Chunk Too Large
```bash
# 1. Identify the problem
ANALYZE=true npm run build

# 2. Check what's in the chunk
# Look at bundle-analysis.html

# 3. Solutions:
# - Move large dependency to separate chunk
# - Lazy load the feature
# - Find lighter alternative library
```

### Issue: Slow Build
```bash
# Temporary: Reduce Terser passes
# In vite.config.ts: passes: 1

# Permanent: Use esbuild for dev
# In vite.config.ts: minify: 'esbuild'
```

### Issue: Cache Not Working
```bash
# 1. Check filenames have hashes
ls dist/assets/js/

# 2. Verify cache headers
curl -I https://your-domain.com/assets/js/app-[hash].js

# 3. Clear browser cache
# Hard refresh: Ctrl+Shift+R
```

## Adding New Features

### Best Practices
```typescript
// 1. Use lazy loading for routes
const NewFeature = lazy(() => import('@client/features/new-feature'))

// 2. Keep features self-contained
// features/new-feature/
//   ├── pages/
//   ├── components/
//   ├── hooks/
//   └── index.ts

// 3. Avoid importing heavy libraries in core
// Import charts only in chart components
// Import date-fns only where needed

// 4. Use dynamic imports for heavy components
const HeavyChart = lazy(() => import('./HeavyChart'))
```

### Chunk Naming
```typescript
// Feature chunks automatically named: feature-{name}
// Example: features/bills/ → feature-bills

// UI chunks automatically named: ui-{category}
// Example: lib/ui/dashboard/ → ui-dashboard
```

## Monitoring

### Bundle Size Tracking
```bash
# Create baseline
npm run build > build-baseline.txt

# Compare after changes
npm run build > build-current.txt
diff build-baseline.txt build-current.txt
```

### Performance Metrics
```javascript
// Add to your analytics
import { getCLS, getFID, getLCP } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getLCP(console.log)
```

## Configuration Files

### Key Files
- `client/vite.config.ts` - Build configuration
- `client/src/app/shell/AppRouter.tsx` - Route configuration
- `client/package.json` - Dependencies

### Important Settings
```typescript
// vite.config.ts
{
  chunkSizeWarningLimit: 400,  // Chunk size limit
  minify: 'terser',            // Minification
  cssCodeSplit: true,          // CSS splitting
  target: 'es2020',            // Browser target
}
```

## Resources

### Documentation
- [Performance Optimizations](./PERFORMANCE_OPTIMIZATIONS.md)
- [Implementation Summary](./PERFORMANCE_IMPLEMENTATION_SUMMARY.md)
- [Bug Fix Report](./BUG_FIX_REPORT.md)
- [Client Health Check](./CLIENT_HEALTH_CHECK.md)

### External Resources
- [Vite Performance](https://vitejs.dev/guide/performance.html)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Bundle Analysis](https://github.com/btd/rollup-plugin-visualizer)

## Quick Tips

### 💡 Do's
- ✅ Use lazy loading for routes
- ✅ Keep vendor chunks stable
- ✅ Monitor bundle sizes regularly
- ✅ Test on slow networks
- ✅ Use code splitting for features

### ⚠️ Don'ts
- ❌ Import heavy libraries in core
- ❌ Create chunks > 400KB
- ❌ Skip bundle analysis
- ❌ Ignore chunk size warnings
- ❌ Add dependencies without checking size

## Support

### Questions?
- Check documentation in `docs/`
- Run bundle analysis
- Review Vite configuration
- Test with Lighthouse

### Issues?
- Check troubleshooting section
- Review build output
- Analyze bundle composition
- Test in production mode

---

**Last Updated:** February 10, 2026  
**Status:** ✅ Active  
**Maintained By:** Development Team

# Chanuka Client: Tactical Implementation Guide

**Focus:** Immediate, High-Impact Optimizations (This Sprint)

---

## 1. SCHEMA MARKUP IMPLEMENTATION

### 1.1 Add to `client/index.html` (Head Section)

```html
<!-- JSON-LD Schema Markup -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Chanuka - Legislative Transparency Platform",
  "description": "Transparent access to legislation, budget analysis, and civic engagement tools for informed democratic participation in Kenya",
  "url": "https://chanuka.org",
  "applicationCategory": "GovernmentApplication",
  "isAccessibleForFree": true,
  "screenshot": [
    "https://chanuka.org/og-image-large.png",
    "https://chanuka.org/og-image-square.png"
  ],
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "author": {
    "@type": "Organization",
    "name": "Chanuka Project"
  }
}
</script>

<!-- Organization Schema -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Chanuka",
  "url": "https://chanuka.org",
  "logo": "https://chanuka.org/logo.png",
  "description": "Making legislative processes transparent, understandable, and actionable for all citizens",
  "sameAs": [
    "https://twitter.com/chanuka",
    "https://facebook.com/chanuka"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "email": "support@chanuka.org"
  }
}
</script>

<!-- Breadcrumb Navigation (Schema) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://chanuka.org"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Bills",
      "item": "https://chanuka.org/bills"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Budget",
      "item": "https://chanuka.org/budget"
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": "Representatives",
      "item": "https://chanuka.org/representatives"
    }
  ]
}
</script>
```

---

## 2. DYNAMIC META TAG GENERATOR

### 2.1 Create `client/src/utils/seo.ts`

```typescript
/**
 * SEO Utilities for Dynamic Meta Tags & Schema Generation
 */

interface PageSEOConfig {
  title: string;              // 50-60 chars
  description: string;        // 150-160 chars
  canonical: string;
  ogImage: string;
  ogImageAlt: string;
  twitterCard: 'summary' | 'summary_large_image';
  keywords?: string[];
  author?: string;
  published?: string;
  modified?: string;
}

export function generateMetaTags(config: PageSEOConfig): void {
  // Title
  updateOrCreateMetaTag('title', '', config.title);
  document.title = config.title;

  // Description
  updateOrCreateMetaTag('name', 'description', config.description);

  // Canonical
  updateOrCreateCanonical(config.canonical);

  // Open Graph
  updateOrCreateMetaTag('property', 'og:title', config.title);
  updateOrCreateMetaTag('property', 'og:description', config.description);
  updateOrCreateMetaTag('property', 'og:image', config.ogImage);
  updateOrCreateMetaTag('property', 'og:image:alt', config.ogImageAlt);
  updateOrCreateMetaTag('property', 'og:url', config.canonical);
  updateOrCreateMetaTag('property', 'og:type', 'website');

  // Twitter
  updateOrCreateMetaTag('name', 'twitter:card', config.twitterCard);
  updateOrCreateMetaTag('name', 'twitter:title', config.title);
  updateOrCreateMetaTag('name', 'twitter:description', config.description);
  updateOrCreateMetaTag('name', 'twitter:image', config.ogImage);
  updateOrCreateMetaTag('name', 'twitter:creator', '@chanuka');

  // Additional
  if (config.keywords?.length) {
    updateOrCreateMetaTag('name', 'keywords', config.keywords.join(', '));
  }
  if (config.author) {
    updateOrCreateMetaTag('name', 'author', config.author);
  }
  if (config.published) {
    updateOrCreateMetaTag('property', 'article:published_time', config.published);
  }
  if (config.modified) {
    updateOrCreateMetaTag('property', 'article:modified_time', config.modified);
  }
}

function updateOrCreateMetaTag(
  attribute: 'name' | 'property',
  attrValue: string,
  content: string
): void {
  const selector = `meta[${attribute}="${attrValue}"]`;
  let element = document.querySelector(selector) as HTMLMetaElement;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, attrValue);
    document.head.appendChild(element);
  }

  element.content = content;
}

function updateOrCreateCanonical(url: string): void {
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }

  canonical.href = url;
}

// PAGE-SPECIFIC SEO CONFIGS
export const SEOConfigs = {
  home: (): PageSEOConfig => ({
    title: 'Chanuka: Transparent Legislative Access & Civic Engagement',
    description: 'Understand bills, track representatives, and engage in real-time policy discussions. Free platform for informed democratic participation in Kenya.',
    canonical: 'https://chanuka.org',
    ogImage: 'https://chanuka.org/og-home-large.png',
    ogImageAlt: 'Chanuka platform showing bill information and community discussions',
    twitterCard: 'summary_large_image',
    keywords: ['bill tracker', 'Kenya legislation', 'civic engagement', 'transparency'],
  }),

  bills: (): PageSEOConfig => ({
    title: 'Bills & Legislation Tracker | Chanuka',
    description: 'Track all bills in Kenya\'s legislature. See bill status, sponsorship, community input, and expert analysis. Real-time updates on legislation affecting your life.',
    canonical: 'https://chanuka.org/bills',
    ogImage: 'https://chanuka.org/og-bills.png',
    ogImageAlt: 'Legislative bills dashboard with filtering and search',
    twitterCard: 'summary',
    keywords: ['bill tracker', 'legislation', 'parliament', 'government transparency'],
  }),

  bill: (billId: string, billTitle: string): PageSEOConfig => ({
    title: `${billTitle} - Bill ${billId} | Chanuka`,
    description: `Bill ${billId}: ${billTitle}. See sponsorship, community perspective, expert analysis, and how to engage in the legislative process.`,
    canonical: `https://chanuka.org/bills/${billId}`,
    ogImage: 'https://chanuka.org/og-bill.png',
    ogImageAlt: `Detailed analysis of ${billTitle}`,
    twitterCard: 'summary',
    keywords: [billTitle, `Bill ${billId}`, 'legislation', 'Kenya parliament'],
  }),

  representatives: (): PageSEOConfig => ({
    title: 'Kenya Parliament Representatives & Voting Records | Chanuka',
    description: 'Find your representative, view voting records, track positions on key issues, and see how they engage with constituents.',
    canonical: 'https://chanuka.org/representatives',
    ogImage: 'https://chanuka.org/og-representatives.png',
    ogImageAlt: 'Representatives directory with voting records',
    twitterCard: 'summary',
    keywords: ['representatives', 'voting record', 'parliament', 'legislators'],
  }),

  search: (query: string): PageSEOConfig => ({
    title: `Search: "${query}" - Bills, Reps & Policies | Chanuka`,
    description: `Search results for "${query}" across all bills, representatives, budget items, and civic discussions in Kenya's legislature.`,
    canonical: `https://chanuka.org/search?q=${encodeURIComponent(query)}`,
    ogImage: 'https://chanuka.org/og-search.png',
    ogImageAlt: 'Search results for legislation and government information',
    twitterCard: 'summary',
  }),

  education: (): PageSEOConfig => ({
    title: 'How Parliament Works: Civic Education & Learning | Chanuka',
    description: 'Learn how Kenya\'s legislative process works. From bill introduction to budget execution, understand the systems that govern you.',
    canonical: 'https://chanuka.org/education',
    ogImage: 'https://chanuka.org/og-education.png',
    ogImageAlt: 'Educational resources explaining parliamentary processes',
    twitterCard: 'summary',
    keywords: ['civic education', 'legislative process', 'government', 'Kenya parliament'],
  }),
};

// USAGE IN COMPONENTS
// import { generateMetaTags, SEOConfigs } from '@/utils/seo';
// 
// useEffect(() => {
//   generateMetaTags(SEOConfigs.bills());
// }, []);
```

---

## 3. BREADCRUMB NAVIGATION COMPONENT

### 3.1 Create `client/src/components/ui/breadcrumb-nav.tsx`

```tsx
/**
 * SEO-Optimized Breadcrumb Navigation Component
 * Helps both users and search engines understand site structure
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
  ariaLabel?: string;
}

export function BreadcrumbNav({
  items,
  className = '',
  ariaLabel = 'Breadcrumb'
}: BreadcrumbNavProps) {
  return (
    <nav aria-label={ariaLabel} className={cn('mb-4', className)}>
      <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item.href}-${index}`} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
            )}
            
            {item.current ? (
              <span
                aria-current="page"
                className="text-foreground font-medium"
              >
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// USAGE EXAMPLES
export function BillDetailPageWithBreadcrumb() {
  const billId = 'B-2024-047';
  const billTitle = 'Finance Act 2024';

  return (
    <>
      <BreadcrumbNav
        items={[
          { label: 'Home', href: '/' },
          { label: 'Bills', href: '/bills' },
          { label: 'Budget Bills', href: '/bills?category=budget' },
          { label: billTitle, href: `/bills/${billId}`, current: true }
        ]}
        ariaLabel="Bill detail page breadcrumb"
      />
      
      {/* Page content */}
    </>
  );
}
```

---

## 4. MOBILE TOUCH TARGET AUDIT & FIX

### 4.1 Create Audit Script `client/scripts/audit-touch-targets.js`

```javascript
/**
 * Touch Target Audit Script
 * Identifies elements that don't meet 44x44px minimum
 * Usage: node scripts/audit-touch-targets.js
 */

const fs = require('fs');
const path = require('path');

const MINIMUM_TOUCH_SIZE = 44;
const MINIMUM_SPACING = 12;

// Common interactive selectors to audit
const INTERACTIVE_SELECTORS = [
  'button',
  'a[href]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  '[role="button"]',
  '[role="link"]',
];

// Scan all TSX/JSX files
function scanComponentsForInteractiveElements(dirPath = './src') {
  const components = [];
  const files = fs.readdirSync(dirPath, { recursive: true });

  files.forEach((file) => {
    if (!file.endsWith('.tsx') && !file.endsWith('.jsx')) return;

    const filePath = path.join(dirPath, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Find button/link definitions with explicit sizes
    const sizeMatches = content.matchAll(/className=".*?[wh]-(3[0-2]|[1-3][0-9]|[0-9])\b/g);

    for (const match of sizeMatches) {
      const className = match[0];
      const sizeMatch = className.match(/[wh]-(\d+)/g);

      if (sizeMatch) {
        const widthMatch = className.match(/w-(\d+)/);
        const heightMatch = className.match(/h-(\d+)/);

        const width = widthMatch ? parseInt(widthMatch[1]) * 4 : null; // Tailwind: 1 = 4px
        const height = heightMatch ? parseInt(heightMatch[1]) * 4 : null;

        if ((width && width < MINIMUM_TOUCH_SIZE) || (height && height < MINIMUM_TOUCH_SIZE)) {
          components.push({
            file: filePath,
            issue: `Small touch target: ${width || '?'}x${height || '?'}px`,
            code: className
          });
        }
      }
    }
  });

  return components;
}

// Generate report
const issues = scanComponentsForInteractiveElements();

console.log('\n=== TOUCH TARGET AUDIT REPORT ===\n');
console.log(`Found ${issues.length} potential issues:\n`);

issues.forEach((issue) => {
  console.log(`📍 ${issue.file}`);
  console.log(`   Issue: ${issue.issue}`);
  console.log(`   Code: ${issue.code}\n`);
});

// Save report
const report = {
  timestamp: new Date().toISOString(),
  totalIssues: issues.length,
  minimumSize: MINIMUM_TOUCH_SIZE,
  issues: issues
};

fs.writeFileSync(
  './reports/touch-target-audit.json',
  JSON.stringify(report, null, 2)
);

console.log(`\n✅ Report saved to reports/touch-target-audit.json`);
```

### 4.2 Fix Common Touch Target Issues

```tsx
// BEFORE: Undersized buttons
<button className="px-2 py-1 text-xs">Small Button</button>
{/* Results in ~30x24px touch target - TOO SMALL */}

// AFTER: Properly sized buttons
<button className="px-4 py-2 min-h-[44px] min-w-[44px]">
  Accessible Button
</button>
{/* Results in 44x44px minimum */}

// FOR ICON BUTTONS: Add padding
<button className="p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center">
  <IconComponent className="h-6 w-6" />
</button>

// FOR LINK ELEMENTS: Add padding
<a href="/bills" className="block p-3 min-h-[44px] min-w-[44px]">
  Tracked Bills
</a>
```

---

## 5. ENGAGEMENT SIGNAL TRACKING

### 5.1 Create `client/src/utils/engagement-tracking.ts`

```typescript
/**
 * Engagement Signal Tracking
 * Tracks metrics that indicate user satisfaction and platform value
 */

import { logger } from '@client/utils/logger';

interface EngagementSignal {
  type: string;
  value?: any;
  context?: Record<string, any>;
  timestamp: string;
}

class EngagementTracker {
  private signals: EngagementSignal[] = [];
  private sessionStartTime = Date.now();
  private lastInteractionTime = Date.now();
  private scrollDepth = 0;
  private maxScrollDepth = 0;

  /**
   * Track page view with engagement potential
   */
  trackPageView(pageName: string, metadata?: Record<string, any>) {
    this.recordSignal('page_view', undefined, {
      pageName,
      ...metadata
    });
  }

  /**
   * Track content engagement (reading)
   * Triggered when user spends significant time on content
   */
  trackContentEngagement(contentId: string, contentType: 'bill' | 'article' | 'discussion', timeSpent: number) {
    if (timeSpent > 120000) { // 2+ minutes
      this.recordSignal('deep_content_engagement', timeSpent, {
        contentId,
        contentType,
        timeSpentSeconds: Math.round(timeSpent / 1000)
      });
    }
  }

  /**
   * Track when user scrolls through page
   * Deep scroll indicates content interest
   */
  initScrollTracking() {
    window.addEventListener('scroll', () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;

      const scrollPercent = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );

      if (scrollPercent > this.maxScrollDepth) {
        this.maxScrollDepth = scrollPercent;

        // Track milestones
        if ([25, 50, 75, 100].includes(scrollPercent)) {
          this.recordSignal('scroll_milestone', scrollPercent, {
            percentage: scrollPercent
          });
        }
      }

      this.lastInteractionTime = Date.now();
    });
  }

  /**
   * Track user interaction (clicks, form submissions, etc.)
   */
  trackInteraction(action: string, target?: string, metadata?: Record<string, any>) {
    this.recordSignal('user_interaction', undefined, {
      action,
      target,
      ...metadata
    });
    this.lastInteractionTime = Date.now();
  }

  /**
   * Track micro-conversions (meaningful user actions)
   */
  trackMicroConversion(conversionType: string, value?: any) {
    this.recordSignal('micro_conversion', value, {
      conversionType,
      sessionDuration: Date.now() - this.sessionStartTime
    });
  }

  /**
   * Track community contribution
   */
  trackCommunityContribution(type: 'comment' | 'campaign_join' | 'discussion_start') {
    this.recordSignal('community_contribution', undefined, {
      contributionType: type,
      sessionDuration: Date.now() - this.sessionStartTime
    });
  }

  /**
   * Track feature adoption
   */
  trackFeatureAdoption(featureName: string, success: boolean) {
    this.recordSignal('feature_adoption', success, {
      featureName,
      success
    });
  }

  /**
   * Internal method to record signal
   */
  private recordSignal(
    type: string,
    value: any,
    context?: Record<string, any>
  ) {
    const signal: EngagementSignal = {
      type,
      value,
      context,
      timestamp: new Date().toISOString()
    };

    this.signals.push(signal);

    // Send to analytics service
    this.sendSignal(signal);
  }

  /**
   * Send signal to analytics backend
   */
  private sendSignal(signal: EngagementSignal) {
    // Send to your analytics service
    // This could be Google Analytics, Mixpanel, custom backend, etc.
    logger.debug('engagement_signal', signal);

    // Example: Send to custom endpoint
    try {
      navigator.sendBeacon('/api/analytics/engagement', JSON.stringify(signal));
    } catch (error) {
      logger.error('Failed to send engagement signal', { error, signal });
    }
  }

  /**
   * Get session summary
   */
  getSessionSummary() {
    return {
      sessionDuration: Date.now() - this.sessionStartTime,
      signalCount: this.signals.length,
      maxScrollDepth: this.maxScrollDepth,
      lastInteraction: this.lastInteractionTime,
      signals: this.signals
    };
  }

  /**
   * End session and send final analytics
   */
  endSession() {
    const summary = this.getSessionSummary();
    this.recordSignal('session_end', undefined, summary);
  }
}

// Export singleton instance
export const engagementTracker = new EngagementTracker();

// Initialize tracking on app load
export function initializeEngagementTracking() {
  engagementTracker.trackPageView('app_initialized');
  engagementTracker.initScrollTracking();

  // End session when user leaves
  window.addEventListener('beforeunload', () => {
    engagementTracker.endSession();
  });
}

// USAGE IN COMPONENTS
// import { engagementTracker } from '@/utils/engagement-tracking';
//
// useEffect(() => {
//   engagementTracker.trackPageView('bills_page');
//   
//   return () => {
//     // Track when component unmounts
//     engagementTracker.trackPageView('bills_page_exit');
//   };
// }, []);
//
// const handleBillClick = (billId: string) => {
//   engagementTracker.trackInteraction('bill_clicked', billId);
//   navigateToBill(billId);
// };
```

### 5.2 Initialize in App Component

```tsx
// In client/src/App.tsx
import { initializeEngagementTracking } from '@client/utils/engagement-tracking';

function App() {
  useEffect(() => {
    // Initialize engagement tracking
    initializeEngagementTracking();
  }, []);

  return (
    // ... rest of app
  );
}
```

---

## 6. MOBILE CTA OPTIMIZATION

### 6.1 Create Mobile-Optimized CTA Component

```tsx
/**
 * Mobile-Optimized Call-to-Action Component
 * Handles touch-friendly sizing, spacing, and placement
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface MobileCTAProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
  icon?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function MobileCTA({
  label,
  onClick,
  variant = 'primary',
  icon,
  className = '',
  ariaLabel,
  disabled = false
}: MobileCTAProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel || label}
      className={cn(
        // Base styling
        'flex items-center justify-center gap-2',
        'rounded-lg font-medium transition-all duration-200',
        
        // Mobile-optimized sizing
        'min-h-[48px] min-w-[48px]',  // Touch target minimum
        'px-4 py-3',                   // Padding for small screens
        'text-base',                   // Readable on mobile
        
        // Variant styling
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95',
        variant === 'secondary' && 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:scale-95',
        variant === 'tertiary' && 'text-blue-600 hover:bg-blue-50 active:scale-95',
        
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
        
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="text-sm md:text-base">{label}</span>
    </button>
  );
}

// Usage in mobile pages
export function BillDetailMobileView({ billId }) {
  return (
    <div className="flex flex-col gap-3 pb-24">
      {/* Main content */}
      
      {/* Floating/Sticky CTA Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 flex gap-2">
        <MobileCTA
          label="Explore"
          onClick={() => navigateTo(`/bills/${billId}`)}
          variant="primary"
          className="flex-1"
          ariaLabel={`Explore bill ${billId} details`}
        />
        <MobileCTA
          label="Share"
          onClick={() => shareContent(billId)}
          variant="secondary"
          className="flex-1"
          ariaLabel="Share this bill"
        />
      </div>
    </div>
  );
}
```

---

## 7. ADD TO PACKAGE.JSON SCRIPTS

```json
{
  "scripts": {
    "audit:touch-targets": "node scripts/audit-touch-targets.js",
    "audit:seo": "node scripts/audit-seo.js",
    "generate:sitemap": "node scripts/generate-sitemap.js",
    "test:mobile": "playwright test --project=mobile-chrome --reporter=html"
  }
}
```

---

## IMPLEMENTATION CHECKLIST

### Week 1: Foundation
- [ ] Add schema markup to `index.html`
- [ ] Create SEO utilities file (`seo.ts`)
- [ ] Implement breadcrumb navigation component
- [ ] Run touch target audit
- [ ] Fix identified touch target issues

### Week 2: Tracking & Analytics
- [ ] Create engagement tracking utility
- [ ] Initialize tracking in App component
- [ ] Connect to analytics service
- [ ] Set up analytics dashboard

### Week 3: Mobile Optimization
- [ ] Implement mobile CTA component
- [ ] Update mobile pages with proper CTAs
- [ ] Test on actual devices
- [ ] Measure mobile conversion improvements

### Week 4: Testing & Verification
- [ ] Validate all schema markup with [schema.org validator](https://validator.schema.org/)
- [ ] Test meta tags with [Open Graph debugger](https://developers.facebook.com/tools/debug/og/object/)
- [ ] Verify mobile experience on multiple devices
- [ ] Check SEO with Google Search Console

---

## MONITORING & MEASUREMENT

Track these metrics in your analytics dashboard:

```
Weekly Monitoring:
├─ Schema markup validation: 100% valid
├─ Meta tag completeness: 100% of pages
├─ Mobile touch target compliance: 100%
├─ Breadcrumb implementation: All key pages
└─ Engagement signal data collection: Active

Monthly Metrics:
├─ Organic search impressions: Track trend
├─ Keyword rankings: Top 20 keywords
├─ Mobile click-through rate: Target 4.5%+
├─ Session duration: Target 4+ minutes
├─ Pages per session: Target 3.5+
└─ Return visitor rate: Target 40%+
```

---

## NEXT STEPS

1. **Implement schema markup** (1 day)
2. **Create SEO utilities** (2 days)
3. **Fix touch targets** (1-2 days)
4. **Add engagement tracking** (2-3 days)
5. **Optimize mobile CTAs** (1-2 days)
6. **Test and validate** (2-3 days)

**Total Time:** 1-2 weeks for complete implementation

**Expected Impact:** 15-25% improvement in key metrics within 4-6 weeks

/**
 * Low-Bandwidth & Offline-First Design Patterns
 * ============================================
 *
 * Supporting users on basic devices with limited digital literacy,
 * slower connections, and low bandwidth constraints.
 * Roadmap requirement: "basic devices with limited digital literacy"
 */

export const LowBandwidthPrinciples = {
  philosophy: 'Core content first, enhancements progressive',
  priorities: [
    '1. Essential information loads first',
    '2. Plain HTML works without JavaScript',
    '3. Images optimized or optional',
    '4. Simple interactions on slow networks',
    '5. Offline-first data caching',
  ],

  targetBandwidth: {
    slow2G: '50 kbps - Dial-up era speed',
    fast2G: '50-250 kbps - Slow mobile',
    slow3G: '250-400 kbps - Urban 3G in developing regions',
    fast3G: '400-4000 kbps - Good 3G conditions',
  },

  targetDevices: [
    'Feature phones with basic browsers',
    'Older Android devices (2GB RAM or less)',
    'Tablets with older OS versions',
    'Desktop with dial-up/satellite connection',
  ],

  userProfiles: [
    'Rural users with limited infrastructure',
    'Low-income users with data caps',
    'Users in countries with limited connectivity',
    'Users on metered connections (flights, travel)',
  ],
};

/**
 * Bundle Size Targets
 */
export const BundleSizeTargets = {
  core: {
    target: '< 50 KB',
    description: 'Initial HTML + critical CSS (gzipped)',
  },

  javascript: {
    target: '< 100 KB',
    description: 'Essential functionality (gzipped)',
  },

  images: {
    target: '< 50 KB',
    description: 'All images combined (optimized)',
  },

  total: {
    target: '< 200 KB',
    description: 'Complete page (gzipped)',
    rationale: 'At 50 kbps, this loads in ~40 seconds on slowest connection',
  },

  loadingMetrics: {
    firstContentfulPaint: '< 3 seconds',
    largestContentfulPaint: '< 5 seconds',
    interactive: '< 8 seconds',
  },
};

/**
 * HTML-First Architecture
 * Core functionality works without JavaScript
 */
export const HTMLFirstArchitecture = {
  principle: 'Progressive enhancement - base HTML works, JS enhances',

  coreHtmlFeatures: [
    'Search form (HTML form submission)',
    'Bill listing (HTML table or list)',
    'Navigation (HTML links)',
    'Filters (HTML form with method="get")',
  ],

  enhancedFeatures: [
    'Live search preview (JavaScript)',
    'Infinite scroll (JavaScript)',
    'Modal interactions (JavaScript)',
    'Real-time notifications (WebSocket)',
  ],

  fallback: {
    noJS_search: 'Full page reload with ?search=query',
    noJS_filter: 'Full page reload with filter parameters',
    noJS_sort: 'Link-based sorting (?sort=date&order=asc)',
  },

  example: {
    withoutJS: `
      <form method="get" action="/search">
        <input name="q" placeholder="Bill number..." />
        <button type="submit">Search</button>
      </form>
    `,
    withJS: `
      // Same form, but JavaScript adds:
      // - Debounced live preview
      // - Autocomplete suggestions
      // - Page swap without reload
    `,
  },
};

/**
 * Image Optimization Strategy
 */
export const ImageOptimization = {
  philosophy: 'No image is better than a slow image',

  strategies: {
    /**
     * Art Direction: Show different images for different contexts
     */
    artDirection: {
      lowBandwidth: {
        format: 'No images (icons only)',
        rationale: 'Saves 50+ KB',
      },
      normal: {
        format: 'WebP (modern browsers)',
        sizes: 'Responsive (480px / 768px / 1200px)',
        rationale: 'WebP 30-40% smaller than JPEG',
      },
      fallback: {
        format: 'JPEG (old browsers)',
        rationale: 'Last resort for maximum compatibility',
      },
    },

    /**
     * Lazy Loading
     */
    lazyLoading: {
      threshold: 'Load 300px before scrolling into view',
      blurredPlaceholder: 'Small, blurred LQIP (Low Quality Image Placeholder)',
      native: 'Use loading="lazy" on img tags',
      javascript: 'Fallback with Intersection Observer',
    },

    /**
     * Icon Strategy
     */
    icons: {
      format: 'SVG inline or sprite sheet',
      sizes: 'Monochrome icons (no color variations)',
      compression: 'Minimize SVG code, no style attributes',
      example: {
        bill: '<svg><path d="M..."/></svg>',
        sponsor: '<svg><path d="M..."/></svg>',
      },
    },

    /**
     * Logo and Branding
     */
    branding: {
      logo: 'SVG (< 5 KB)',
      favicon: 'Single ICO or PNG (< 10 KB)',
      avoid: 'High-resolution mockups, illustrations',
    },
  },

  optimization: {
    webp: {
      tool: 'imagemin-webp',
      size: '30-40% smaller than JPEG',
      support: '89% of browsers (fallback to JPEG)',
    },

    responsive: {
      srcset: 'Use srcset for multiple sizes',
      maxWidth: 'Limit max-width to necessary size',
      sizes: 'Let browser choose best size',
      example: `
        <img
          src="bill-480.jpg"
          srcset="
            bill-480.jpg 480w,
            bill-768.jpg 768w,
            bill-1200.jpg 1200w
          "
          sizes="(max-width: 768px) 100vw, 50vw"
          alt="Bill preview"
        />
      `,
    },

    responsive_webp: {
      example: `
        <picture>
          <source
            srcset="bill-480.webp 480w, bill-768.webp 768w"
            type="image/webp"
          />
          <source
            srcset="bill-480.jpg 480w, bill-768.jpg 768w"
            type="image/jpeg"
          />
          <img src="bill-768.jpg" alt="Bill" />
        </picture>
      `,
    },
  },

  sizes: {
    billCover: '480x300px max (WebP: < 20 KB)',
    avatar: '48x48px (SVG or < 2 KB PNG)',
    icon: '24x24px (inline SVG)',
    background: 'Gradient or pattern (no image)',
  },
};

/**
 * CSS Optimization
 */
export const CSSOptimization = {
  philosophy: 'Minimal CSS, essential only',

  critical_css: {
    target: '< 15 KB',
    includes: [
      'Layout (grid/flexbox)',
      'Typography baseline',
      'Button styles',
      'Form controls',
      'Header/footer',
      'Color scheme',
    ],
    inlinedInHead: true,
  },

  non_critical_css: {
    target: '< 20 KB',
    includes: [
      'Animations (prefers-reduced-motion)',
      'Hover states',
      'Modal overlays',
      'Advanced layouts',
    ],
    loadedAsync: true,
  },

  removal: [
    'Remove unused CSS selectors (PurgeCSS)',
    'No UI framework bloat (Bootstrap, Material)',
    'No CSS-in-JS runtime (use CSS files)',
    'No CSS animations on low-bandwidth',
  ],

  minification: {
    technique: 'CSS minification + gzip',
    reduction: '50-70% file size',
    tools: ['cssnano', 'postcss'],
  },

  fastCSS: `
    /* GOOD: Minimal, efficient CSS */
    body { font: 16px system-ui; line-height: 1.5; }
    .button { background: #0d3b66; color: white; padding: .5rem 1rem; }

    /* BAD: Unnecessary complexity */
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont...; ... }
    .button { box-shadow: 0 2px 8px rgba(...); transition: all 200ms; }
  `,
};

/**
 * JavaScript Optimization
 */
export const JavaScriptOptimization = {
  /**
   * Code Splitting
   */
  codeSplitting: {
    initial: 'Core app shell (search, navigation)',
    route: 'Bill details loaded on demand',
    interaction: 'Advanced UI only when needed',
  },

  /**
   * Lazy Loading JavaScript
   */
  lazyLoadingJS: {
    example: `
      <!-- Load analytics only after page interactive -->
      <script defer>
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', loadAnalytics);
        } else {
          loadAnalytics();
        }
      </script>
    `,
  },

  /**
   * No JavaScript Libraries (Low-Bandwidth Version)
   */
  noLibraries: {
    dont: ['React', 'Vue', 'Angular', 'jQuery', 'Bootstrap.js'],
    reasoning: 'React alone is 40+ KB, Vue is 30+ KB',
    instead: 'Vanilla JavaScript + Web Components if needed',
  },

  /**
   * Lightweight Alternatives
   */
  alternatives: {
    routing: 'Use HTML form method="get" not SPA routing',
    form: 'Native form validation, not custom',
    interaction: 'CSS :hover and :focus, not JavaScript',
  },

  /**
   * Performance Budgets
   */
  performanceBudgets: {
    initialLoad: {
      html: '20 KB',
      css: '15 KB',
      js: '40 KB',
      total: '75 KB',
      timeLimit: '5 seconds at 50 kbps',
    },
    onScroll: {
      lazy_images: '< 50 ms load time',
      infinite_scroll: 'Use pagination instead',
    },
  },
};

/**
 * Network Adaptation
 */
export const NetworkAdaptation = {
  /**
   * Detect Network Speed
   */
  detection: {
    api: 'navigator.connection.effectiveType',
    values: ['slow-2g', 'fast-2g', '3g', '4g'],
    example: `
      if (navigator.connection?.effectiveType === 'slow-2g') {
        // Load low-bandwidth variant
      }
    `,
  },

  /**
   * Data Saver Mode
   */
  dataSaverMode: {
    detection: 'navigator.connection.saveData',
    example: `
      if (navigator.connection?.saveData) {
        // Don't autoplay videos
        // Don't load images
        // Use text summaries
      }
    `,
  },

  /**
   * Adaptive Content
   */
  adaptiveContent: {
    text: 'Always available (lightest)',
    text_with_icons: 'Available on 3g+',
    images: 'Available on 4g',
    video: 'Only explicitly requested',
  },

  /**
   * Service Worker for Offline
   */
  serviceWorker: {
    purpose: 'Cache essential content for offline access',
    strategy: 'Cache-first for assets, network-first for API',
    example: `
      // Cache essential bill data
      const cache = await caches.open('bills-v1');
      cache.addAll([
        '/bills/HB1234',
        '/bills/HB5678',
      ]);
    `,
  },
};

/**
 * Data Reduction Techniques
 */
export const DataReduction = {
  /**
   * API Response Sizes
   */
  apiPayloads: {
    billsList: {
      current: '500 JSON fields per bill',
      reduced: 'Only: id, title, number, status, sponsor',
      savings: '80% reduction',
    },

    billDetail: {
      current: 'Full text + all amendments + all votes',
      reduced: 'Summary view first, sections on-demand',
      savings: '70% reduction',
    },
  },

  /**
   * Pagination vs Infinite Scroll
   */
  pagination: {
    lowBandwidth: 'Traditional pagination (link-based)',
    reasoning: 'Avoid loading 1000 items at once',
    example: '20 items per page, next/prev links',
  },

  /**
   * Text Compression
   */
  compression: {
    gzip: 'Standard, ~ 70% reduction',
    brotli: 'Better for text, ~ 80% reduction',
    example: 'Content-Encoding: br',
  },

  /**
   * JSON Optimization
   */
  jsonOptimization: {
    problem: `
      {
        "id": "123",
        "title": "Bill Title",
        "dateIntroduced": "2024-01-15",
        ...100 more fields...
      }
    `,
    solution: `
      // Use field aliases
      {
        "i": "123",  // id
        "t": "Bill Title",  // title
        "d": "2024-01-15",  // date
      }
    `,
    savings: '40-50% reduction',
  },
};

/**
 * Low-Bandwidth Component Patterns
 */
export const LowBandwidthComponents = {
  /**
   * BillCard
   * Minimal but complete
   */
  billCard: {
    structure: `
      <article class="bill-card">
        <h3><a href="/bills/HB1234">HB 1234</a></h3>
        <p class="title">Education Funding Reform</p>
        <p class="sponsor">Sponsored by: <a href="/sponsor/123">Name</a></p>
        <p class="status">Status: In Committee</p>
        <a href="/bills/HB1234" class="link-full">View full bill</a>
      </article>
    `,
    styling: 'No shadow, border, or background color',
    size: '< 500 bytes per card',
  },

  /**
   * Search Form
   * HTML-first, no autocomplete
   */
  searchForm: {
    structure: `
      <form method="get" action="/search">
        <input
          name="q"
          type="text"
          placeholder="Bill number or keyword"
          maxlength="100"
          required
        />
        <button type="submit">Search</button>
      </form>
    `,
    enhancement: 'JavaScript adds live preview below form',
    size: '< 300 bytes',
  },

  /**
   * Table for Comparison
   * Simple, no JavaScript
   */
  comparisonTable: {
    structure: `
      <table>
        <tr>
          <th>Bill</th>
          <th>Status</th>
        </tr>
        <tr>
          <td><a href="/bills/HB1">HB 1</a></td>
          <td>Passed</td>
        </tr>
      </table>
    `,
    styling: 'Simple borders, no fancy sorting',
    javascript: 'Enhanced with sorting if JavaScript loads',
  },

  /**
   * Collapsible Sections
   * Progressive enhancement
   */
  collapsible: {
    html_only: `
      <details>
        <summary>More information</summary>
        <p>This content is revealed without JavaScript</p>
      </details>
    `,
    note: '<details> is HTML standard, works without JS',
  },
};

/**
 * Loading State & Skeleton Screens
 */
export const LoadingStates = {
  philosophy: "Show content faster, don't wait for images",

  skeleton: {
    approach: 'Show text placeholders while loading',
    css: '.skeleton { background: linear-gradient(...); animation: pulse; }',
    benefits: [
      'Content visible immediately',
      'Feels faster than blank page',
      'No layout shift when real content loads',
    ],
  },

  progressIndicator: {
    approach: 'Linear progress bar at top of page',
    html: '<div class="progress-bar"></div>',
    benefits: 'User knows something is loading',
  },

  timing: {
    show: '200ms after request starts',
    hide: 'When content renders',
    note: "Don't show for fast loads (< 200ms)",
  },
};

/**
 * Testing Checklist: Low-Bandwidth Support
 */
export const LowBandwidthTestingChecklist = {
  bundleSize: [
    '☐ Initial bundle < 75 KB (gzipped)',
    '☐ CSS < 15 KB critical',
    '☐ JavaScript < 40 KB initial',
    '☐ Images < 50 KB total',
  ],

  networkThrottling: [
    '☐ Test on Slow 3G (Chrome DevTools)',
    '☐ Test on Fast 3G',
    '☐ Test with Data Saver mode enabled',
    '☐ Test on actual slow device if possible',
  ],

  htmlFirst: [
    '☐ Core functions work without JavaScript',
    '☐ Search form submits without JS',
    '☐ Links work without SPA routing',
    '☐ Tables display correctly without JS',
  ],

  progressiveEnhancement: [
    '☐ JavaScript loads async, not blocking render',
    "☐ JS errors don't break core functionality",
    '☐ Page usable before JS loads',
    '☐ Enhanced features progressive, not required',
  ],

  images: [
    '☐ All images have alt text',
    '☐ WebP with JPEG fallback',
    '☐ Responsive images (srcset)',
    '☐ Lazy loading implemented',
    '☐ Option to disable images',
  ],

  offline: [
    '☐ Service worker caches essential content',
    '☐ Cached content accessible offline',
    '☐ Queue updates for when online',
    '☐ Clear indication of offline state',
  ],

  userExperience: [
    '☐ FCP (First Contentful Paint) < 3s',
    '☐ LCP (Largest Contentful Paint) < 5s',
    '☐ No layout shift when images load',
    '☐ Readable text immediately',
  ],
};

/**
 * Configuration for Low-Bandwidth Mode
 */
export interface LowBandwidthConfig {
  enabled: boolean;
  disableImages: boolean;
  simplifyLayout: boolean;
  disableAnimations: boolean;
  offlineMode: boolean;
}

export const defaultLowBandwidthConfig: LowBandwidthConfig = {
  enabled: false, // Auto-detect or user can enable
  disableImages: false,
  simplifyLayout: false,
  disableAnimations: true,
  offlineMode: false,
};

/**
 * Helper to detect and apply low-bandwidth mode
 */
export function shouldUseLowBandwidthMode(): boolean {
  if (typeof navigator === 'undefined') return false;

  const connection = (navigator as any).connection;
  if (!connection) return false;

  const effectiveType = connection.effectiveType;
  return effectiveType === 'slow-2g' || effectiveType === 'fast-2g';
}

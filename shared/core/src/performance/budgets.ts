/**
 * Performance Budget Configuration System
 *
 * Defines strict performance budgets for Core Web Vitals and bundle sizes
 * with automated enforcement and monitoring capabilities.
 */

export interface PerformanceBudget {
  /** Budget name for identification */
  name: string;
  /** Human-readable description */
  description: string;
  /** Budget category */
  category: 'core-web-vitals' | 'bundle-size' | 'resource-size' | 'styling' | 'custom';
  /** Metric to measure against */
  metric: string;
  /** Budget threshold value */
  threshold: number;
  /** Unit of measurement (ms, KB, MB, etc.) */
  unit: string;
  /** Comparison operator */
  operator: 'less-than' | 'less-than-equal' | 'greater-than' | 'greater-than-equal';
  /** Whether to fail build on violation */
  failOnViolation: boolean;
  /** Warning threshold (optional) */
  warningThreshold?: number;
  /** Environment-specific overrides */
  environmentOverrides?: Record<string, Partial<Omit<PerformanceBudget, 'name' | 'environmentOverrides'>>>;
}

export interface CoreWebVitalsBudgets {
  /** Largest Contentful Paint */
  lcp: PerformanceBudget;
  /** First Input Delay */
  fid: PerformanceBudget;
  /** Cumulative Layout Shift */
  cls: PerformanceBudget;
  /** First Contentful Paint */
  fcp: PerformanceBudget;
  /** Time to First Byte */
  ttfb: PerformanceBudget;
}

export interface BundleSizeBudgets {
  /** Total JavaScript bundle size */
  totalJs: PerformanceBudget;
  /** Initial chunk size */
  initialChunk: PerformanceBudget;
  /** Largest chunk size */
  largestChunk: PerformanceBudget;
  /** Total CSS bundle size */
  totalCss: PerformanceBudget;
  /** Total asset size (images, fonts, etc.) */
  totalAssets: PerformanceBudget;
}

export interface StylingBudgets {
  /** Total Tailwind CSS size */
  totalTailwind: PerformanceBudget;
  /** Design system CSS size */
  designSystemCss: PerformanceBudget;
  /** Component styles size */
  componentStyles: PerformanceBudget;
  /** Total styling bundle size */
  totalStylingBundle: PerformanceBudget;
  /** Gzipped styling size */
  stylingGzip: PerformanceBudget;
}

export interface PerformanceBudgetConfig {
  /** Core Web Vitals budgets */
  coreWebVitals: CoreWebVitalsBudgets;
  /** Bundle size budgets */
  bundleSize: BundleSizeBudgets;
  /** Styling budgets */
  styling: StylingBudgets;
  /** Custom performance budgets */
  custom: PerformanceBudget[];
  /** Global configuration */
  config: {
    /** Environment (development, staging, production) */
    environment: string;
    /** Whether to enable strict mode (fail on any violation) */
    strictMode: boolean;
    /** Whether to collect historical data for trend analysis */
    enableTrendAnalysis: boolean;
    /** Alert thresholds */
    alerts: {
      /** Email addresses for alerts */
      emailRecipients: string[];
      /** Slack webhook URL */
      slackWebhook?: string;
      /** Alert on warning thresholds */
      alertOnWarnings: boolean;
    };
  };
}

/**
 * Default performance budgets based on industry standards
 * These represent "good" performance targets
 */
export const DEFAULT_CORE_WEB_VITALS_BUDGETS: CoreWebVitalsBudgets = {
  lcp: {
    name: 'Largest Contentful Paint',
    description: 'Time until the largest content element is painted',
    category: 'core-web-vitals',
    metric: 'lcp',
    threshold: 2500, // 2.5 seconds
    unit: 'ms',
    operator: 'less-than',
    failOnViolation: true,
    warningThreshold: 2000,
  },
  fid: {
    name: 'First Input Delay',
    description: 'Time until the page responds to user input',
    category: 'core-web-vitals',
    metric: 'fid',
    threshold: 100, // 100ms
    unit: 'ms',
    operator: 'less-than',
    failOnViolation: true,
    warningThreshold: 50,
  },
  cls: {
    name: 'Cumulative Layout Shift',
    description: 'Visual stability of the page layout',
    category: 'core-web-vitals',
    metric: 'cls',
    threshold: 0.1, // 0.1 score
    unit: 'score',
    operator: 'less-than',
    failOnViolation: true,
    warningThreshold: 0.05,
  },
  fcp: {
    name: 'First Contentful Paint',
    description: 'Time until the first content is painted',
    category: 'core-web-vitals',
    metric: 'fcp',
    threshold: 1800, // 1.8 seconds
    unit: 'ms',
    operator: 'less-than',
    failOnViolation: false,
    warningThreshold: 1400,
  },
  ttfb: {
    name: 'Time to First Byte',
    description: 'Time until the first byte of response is received',
    category: 'core-web-vitals',
    metric: 'ttfb',
    threshold: 800, // 800ms
    unit: 'ms',
    operator: 'less-than',
    failOnViolation: false,
    warningThreshold: 600,
  },
};

/**
 * Default bundle size budgets
 */
export const DEFAULT_BUNDLE_SIZE_BUDGETS: BundleSizeBudgets = {
  totalJs: {
    name: 'Total JavaScript Bundle Size',
    description: 'Total size of all JavaScript bundles',
    category: 'bundle-size',
    metric: 'totalJsSize',
    threshold: 1024, // 1MB
    unit: 'KB',
    operator: 'less-than',
    failOnViolation: true,
    warningThreshold: 800,
  },
  initialChunk: {
    name: 'Initial Chunk Size',
    description: 'Size of the initial JavaScript chunk',
    category: 'bundle-size',
    metric: 'initialChunkSize',
    threshold: 512, // 512KB
    unit: 'KB',
    operator: 'less-than',
    failOnViolation: true,
    warningThreshold: 400,
  },
  largestChunk: {
    name: 'Largest Chunk Size',
    description: 'Size of the largest JavaScript chunk',
    category: 'bundle-size',
    metric: 'largestChunkSize',
    threshold: 1024, // 1MB
    unit: 'KB',
    operator: 'less-than',
    failOnViolation: false,
    warningThreshold: 800,
  },
  totalCss: {
    name: 'Total CSS Bundle Size',
    description: 'Total size of all CSS bundles',
    category: 'bundle-size',
    metric: 'totalCssSize',
    threshold: 256, // 256KB
    unit: 'KB',
    operator: 'less-than',
    failOnViolation: false,
    warningThreshold: 200,
  },
  totalAssets: {
    name: 'Total Asset Size',
    description: 'Total size of all static assets (images, fonts, etc.)',
    category: 'bundle-size',
    metric: 'totalAssetSize',
    threshold: 2048, // 2MB
    unit: 'KB',
    operator: 'less-than',
    failOnViolation: false,
    warningThreshold: 1536,
  },
};

/**
 * Default styling budgets
 */
export const DEFAULT_STYLING_BUDGETS: StylingBudgets = {
  totalTailwind: {
    name: 'Total Tailwind CSS Size',
    description: 'Total size of Tailwind CSS and related utilities',
    category: 'styling',
    metric: 'totalTailwindSize',
    threshold: 100, // 100KB
    unit: 'KB',
    operator: 'less-than',
    failOnViolation: false,
    warningThreshold: 80,
  },
  designSystemCss: {
    name: 'Design System CSS Size',
    description: 'Size of design system CSS (chanuka-design-system.css)',
    category: 'styling',
    metric: 'designSystemCssSize',
    threshold: 50, // 50KB
    unit: 'KB',
    operator: 'less-than',
    failOnViolation: false,
    warningThreshold: 40,
  },
  componentStyles: {
    name: 'Component Styles Size',
    description: 'Total size of component-specific styles',
    category: 'styling',
    metric: 'componentStylesSize',
    threshold: 25, // 25KB
    unit: 'KB',
    operator: 'less-than',
    failOnViolation: false,
    warningThreshold: 20,
  },
  totalStylingBundle: {
    name: 'Total Styling Bundle Size',
    description: 'Total size of all styling assets combined',
    category: 'styling',
    metric: 'totalStylingBundleSize',
    threshold: 200, // 200KB
    unit: 'KB',
    operator: 'less-than',
    failOnViolation: true,
    warningThreshold: 150,
  },
  stylingGzip: {
    name: 'Styling Gzip Size',
    description: 'Gzipped size of all styling assets combined',
    category: 'styling',
    metric: 'stylingGzipSize',
    threshold: 50, // 50KB
    unit: 'KB',
    operator: 'less-than',
    failOnViolation: false,
    warningThreshold: 40,
  },
};

/**
 * Production-optimized budgets (stricter than defaults)
 */
export const PRODUCTION_BUDGETS: PerformanceBudgetConfig = {
  coreWebVitals: {
    ...DEFAULT_CORE_WEB_VITALS_BUDGETS,
    lcp: { ...DEFAULT_CORE_WEB_VITALS_BUDGETS.lcp, threshold: 2000, warningThreshold: 1500 },
    fid: { ...DEFAULT_CORE_WEB_VITALS_BUDGETS.fid, threshold: 75, warningThreshold: 40 },
    cls: { ...DEFAULT_CORE_WEB_VITALS_BUDGETS.cls, threshold: 0.05, warningThreshold: 0.025 },
  },
  bundleSize: {
    ...DEFAULT_BUNDLE_SIZE_BUDGETS,
    totalJs: { ...DEFAULT_BUNDLE_SIZE_BUDGETS.totalJs, threshold: 800, warningThreshold: 600 },
    initialChunk: { ...DEFAULT_BUNDLE_SIZE_BUDGETS.initialChunk, threshold: 400, warningThreshold: 300 },
  },
  styling: {
    ...DEFAULT_STYLING_BUDGETS,
    totalStylingBundle: { ...DEFAULT_STYLING_BUDGETS.totalStylingBundle, threshold: 150, warningThreshold: 120 },
    stylingGzip: { ...DEFAULT_STYLING_BUDGETS.stylingGzip, threshold: 40, warningThreshold: 30 },
  },
  custom: [],
  config: {
    environment: 'production',
    strictMode: true,
    enableTrendAnalysis: true,
    alerts: {
      emailRecipients: [],
      alertOnWarnings: true,
    },
  },
};

/**
 * Development budgets (more lenient)
 */
export const DEVELOPMENT_BUDGETS: PerformanceBudgetConfig = {
  coreWebVitals: {
    ...DEFAULT_CORE_WEB_VITALS_BUDGETS,
    lcp: { ...DEFAULT_CORE_WEB_VITALS_BUDGETS.lcp, failOnViolation: false },
    fid: { ...DEFAULT_CORE_WEB_VITALS_BUDGETS.fid, failOnViolation: false },
    cls: { ...DEFAULT_CORE_WEB_VITALS_BUDGETS.cls, failOnViolation: false },
  },
  bundleSize: {
    ...DEFAULT_BUNDLE_SIZE_BUDGETS,
    totalJs: { ...DEFAULT_BUNDLE_SIZE_BUDGETS.totalJs, threshold: 1536, failOnViolation: false },
    initialChunk: { ...DEFAULT_BUNDLE_SIZE_BUDGETS.initialChunk, threshold: 768, failOnViolation: false },
  },
  styling: {
    ...DEFAULT_STYLING_BUDGETS,
    totalStylingBundle: { ...DEFAULT_STYLING_BUDGETS.totalStylingBundle, threshold: 300, failOnViolation: false },
  },
  custom: [],
  config: {
    environment: 'development',
    strictMode: false,
    enableTrendAnalysis: false,
    alerts: {
      emailRecipients: [],
      alertOnWarnings: false,
    },
  },
};

/**
 * Get performance budgets for the current environment
 */
export function getPerformanceBudgets(environment: string = process.env.NODE_ENV || 'development'): PerformanceBudgetConfig {
  switch (environment.toLowerCase()) {
    case 'production':
    case 'staging':
      return PRODUCTION_BUDGETS;
    case 'development':
    case 'test':
    default:
      return DEVELOPMENT_BUDGETS;
  }
}

/**
 * Validate a performance budget configuration
 */
export function validateBudgetConfig(config: PerformanceBudgetConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate Core Web Vitals budgets
  Object.entries(config.coreWebVitals).forEach(([key, budget]) => {
    if (budget.threshold <= 0) {
      errors.push(`${budget.name}: threshold must be positive`);
    }
    if (budget.warningThreshold && budget.warningThreshold >= budget.threshold) {
      errors.push(`${budget.name}: warning threshold must be less than main threshold`);
    }
  });

  // Validate bundle size budgets
  Object.entries(config.bundleSize).forEach(([key, budget]) => {
    if (budget.threshold <= 0) {
      errors.push(`${budget.name}: threshold must be positive`);
    }
  });

  // Validate styling budgets
  Object.entries(config.styling).forEach(([key, budget]) => {
    if (budget.threshold <= 0) {
      errors.push(`${budget.name}: threshold must be positive`);
    }
  });

  // Validate custom budgets
  config.custom.forEach((budget, index) => {
    if (!budget.name) {
      errors.push(`Custom budget ${index}: name is required`);
    }
    if (budget.threshold <= 0) {
      errors.push(`${budget.name}: threshold must be positive`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}


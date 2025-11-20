/**
 * Style Performance Utilities
 * Helpers for optimizing CSS performance and reducing layout shifts
 */

/**
 * Preload critical CSS custom properties
 * Ensures design tokens are available immediately
 */
export function preloadDesignTokens(): void {
  if (typeof document === 'undefined') return;

  // Create a style element with critical design tokens
  const criticalTokens = document.createElement('style');
  criticalTokens.textContent = `
    :root {
      --color-primary: 213 94% 23%;
      --color-accent: 28 94% 54%;
      --color-background: 210 20% 98%;
      --color-foreground: 0 0% 10%;
      --space-4: 1rem;
      --radius-md: 0.375rem;
      --touch-target-min: 44px;
      --duration-normal: 250ms;
    }
  `;
  
  // Insert before any other stylesheets
  const firstStylesheet = document.querySelector('link[rel="stylesheet"], style');
  if (firstStylesheet) {
    document.head.insertBefore(criticalTokens, firstStylesheet);
  } else {
    document.head.appendChild(criticalTokens);
  }
}

/**
 * Optimize CSS custom property updates
 * Batches multiple property updates to reduce reflows
 */
export function batchStyleUpdates(
  element: HTMLElement,
  updates: Record<string, string>
): void {
  // Use requestAnimationFrame to batch updates
  requestAnimationFrame(() => {
    Object.entries(updates).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });
  });
}

/**
 * Create optimized CSS class utilities
 * Generates utility classes that leverage design tokens
 */
export const styleUtils = {
  // Color utilities
  primaryBg: 'bg-[hsl(var(--color-primary))]',
  primaryText: 'text-[hsl(var(--color-primary))]',
  accentBg: 'bg-[hsl(var(--color-accent))]',
  accentText: 'text-[hsl(var(--color-accent))]',
  
  // Spacing utilities
  spacing: {
    xs: 'p-[var(--space-1)]',
    sm: 'p-[var(--space-2)]',
    md: 'p-[var(--space-4)]',
    lg: 'p-[var(--space-6)]',
    xl: 'p-[var(--space-8)]',
  },
  
  // Touch-friendly utilities
  touchTarget: 'min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]',
  touchRecommended: 'min-h-[var(--touch-target-recommended)] min-w-[var(--touch-target-recommended)]',
  
  // Animation utilities
  transition: 'transition-all duration-[var(--duration-normal)]',
  
  // Border radius utilities
  rounded: {
    sm: 'rounded-[var(--radius-sm)]',
    md: 'rounded-[var(--radius-md)]',
    lg: 'rounded-[var(--radius-lg)]',
    full: 'rounded-[var(--radius-full)]',
  }
};

/**
 * CSS-in-JS performance helper
 * Only use for truly dynamic styles that can't be achieved with classes
 */
export function createDynamicStyles(
  baseStyles: Record<string, string>,
  dynamicValues: Record<string, string | number>
): React.CSSProperties {
  const styles: React.CSSProperties = { ...baseStyles };
  
  // Only add dynamic values that are actually dynamic
  Object.entries(dynamicValues).forEach(([key, value]) => {
    if (typeof value === 'number' || (typeof value === 'string' && value.includes('%'))) {
      (styles as any)[key] = value;
    }
  });
  
  return styles;
}

/**
 * Layout shift prevention utilities
 */
export const layoutStable = {
  // Prevent layout shifts during loading
  skeleton: 'animate-pulse bg-[hsl(var(--color-muted))]',
  
  // Stable container dimensions
  aspectSquare: 'aspect-square',
  aspectVideo: 'aspect-video',
  
  // GPU-accelerated transforms
  gpuAccelerated: 'transform-gpu will-change-transform',
  
  // Contain layout calculations
  containLayout: 'contain-layout',
};

/**
 * Performance monitoring for styles
 */
export function measureStylePerformance(name: string, fn: () => void): void {
  if (typeof performance === 'undefined') {
    fn();
    return;
  }
  
  const start = performance.now();
  fn();
  const end = performance.now();
  
  console.log(`Style operation "${name}" took ${end - start} milliseconds`);
}

/**
 * Check if design tokens are loaded
 */
export function areDesignTokensLoaded(): boolean {
  if (typeof window === 'undefined') return false;
  
  const testElement = document.createElement('div');
  testElement.style.color = 'hsl(var(--color-primary))';
  document.body.appendChild(testElement);
  
  const computedColor = window.getComputedStyle(testElement).color;
  document.body.removeChild(testElement);
  
  // If the color is not the fallback, tokens are loaded
  return computedColor !== 'hsl(var(--color-primary))';
}
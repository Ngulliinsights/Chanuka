/**
 * Class Name Utilities
 * Consistent CSS class generation and management
 */

export type ClassValue = string | number | boolean | undefined | null | ClassValue[] | Record<string, any>;

/**
 * Combine class names conditionally
 */
export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(' ');
}

/**
 * Generate component class names with variants
 */
export function createComponentClasses(
  base: string,
  variants?: Record<string, string | boolean | undefined>,
  modifiers?: Record<string, boolean | undefined>
): string {
  const classes = [base];

  if (variants) {
    Object.entries(variants).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        classes.push(`${base}--${key}-${value}`);
      } else if (value === true) {
        classes.push(`${base}--${key}`);
      }
    });
  }

  if (modifiers) {
    Object.entries(modifiers).forEach(([key, value]) => {
      if (value) {
        classes.push(`${base}--${key}`);
      }
    });
  }

  return classes.join(' ');
}

/**
 * Generate Chanuka-specific class names
 */
export const chanukaClasses = {
  // Component base classes
  button: (variant?: string, size?: string) => 
    cn('chanuka-btn', variant && `chanuka-btn-${variant}`, size && `chanuka-btn-${size}`),
  
  card: (variant?: string, interactive?: boolean) =>
    cn('chanuka-card', variant && `chanuka-card-${variant}`, interactive && 'chanuka-card-interactive'),
  
  input: (state?: 'error' | 'success' | 'focus') =>
    cn('chanuka-input', state && `chanuka-input-${state}`),
  
  navigation: (type?: 'header' | 'sidebar' | 'mobile') =>
    cn('chanuka-nav', type && `chanuka-nav-${type}`),

  // Status classes
  status: (type: 'success' | 'warning' | 'error' | 'info', variant?: 'badge' | 'alert') =>
    cn('chanuka-status', `chanuka-status-${type}`, variant && `chanuka-status-${variant}`),

  // Layout classes
  container: (size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl') =>
    cn('chanuka-container', size && `chanuka-container-${size}`),
  
  grid: (cols?: number, gap?: 'sm' | 'md' | 'lg') =>
    cn('chanuka-grid', cols && `chanuka-grid-cols-${cols}`, gap && `chanuka-grid-gap-${gap}`),
};

/**
 * Responsive class utilities
 */
export const responsiveClasses = {
  // Hide/show at breakpoints
  hide: (breakpoint: 'sm' | 'md' | 'lg' | 'xl') => `hidden ${breakpoint}:block`,
  show: (breakpoint: 'sm' | 'md' | 'lg' | 'xl') => `block ${breakpoint}:hidden`,
  
  // Responsive text sizes
  text: (sizes: { sm?: string; md?: string; lg?: string; xl?: string }) => {
    const classes = [];
    if (sizes.sm) classes.push(`text-${sizes.sm}`);
    if (sizes.md) classes.push(`md:text-${sizes.md}`);
    if (sizes.lg) classes.push(`lg:text-${sizes.lg}`);
    if (sizes.xl) classes.push(`xl:text-${sizes.xl}`);
    return classes.join(' ');
  },
  
  // Responsive spacing
  spacing: (property: 'p' | 'm', sizes: { sm?: string; md?: string; lg?: string }) => {
    const classes = [];
    if (sizes.sm) classes.push(`${property}-${sizes.sm}`);
    if (sizes.md) classes.push(`md:${property}-${sizes.md}`);
    if (sizes.lg) classes.push(`lg:${property}-${sizes.lg}`);
    return classes.join(' ');
  },
};

/**
 * Accessibility class utilities
 */
export const a11yClasses = {
  // Screen reader only
  srOnly: 'sr-only',
  
  // Focus visible
  focusVisible: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
  
  // Skip links
  skipLink: 'sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md',
  
  // High contrast support
  highContrast: 'contrast-more:border-2 contrast-more:border-black',
  
  // Reduced motion support
  reducedMotion: 'motion-reduce:transition-none motion-reduce:animate-none',
};
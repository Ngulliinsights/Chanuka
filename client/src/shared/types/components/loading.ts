/**
 * Loading Component Types - STANDARDIZED
 *
 * Standardized component prop types following the exemplary pattern from loading.ts
 * Key improvements:
 * - Consistent naming conventions (PascalCase for interfaces)
 * - Proper JSDoc documentation
 * - Immutable types where appropriate
 * - Comprehensive type safety
 */

// ============================================================================
// Loading Component Props
// ============================================================================

export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type AssetIndicatorPosition = 'fixed' | 'relative' | 'absolute';

/**
 * Base loading component props interface
 * Follows the pattern from LoadingComponentProps in loading.ts
 */
export interface LoadingComponentProps {
  isLoading: boolean;
  error?: string;
  progress?: number;
  message?: string;
  size?: LoadingSize;
  showMessage?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Loading indicator props
 * Standardized from LoadingProps in loading.ts
 */
export interface LoadingProps {
  size?: LoadingSize;
  message?: string;
  showMessage?: boolean;
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

/**
 * Asset loading indicator props
 * Standardized from AssetLoadingIndicatorProps in loading.ts
 */
export interface AssetLoadingIndicatorProps {
  className?: string;
  showDetails?: boolean;
  showProgress?: boolean;
  minimal?: boolean;
  position?: AssetIndicatorPosition;
}

/**
 * Global loading indicator props
 * Extended from the loading.ts patterns
 */
export interface GlobalLoadingIndicatorProps extends LoadingComponentProps {
  fullScreen?: boolean;
  backdropOpacity?: number;
  zIndex?: number;
}

/**
 * Minimal loading indicator props
 * Simplified version for minimal UIs
 */
export interface MinimalLoadingIndicatorProps {
  size?: LoadingSize;
  className?: string;
  'aria-label'?: string;
}
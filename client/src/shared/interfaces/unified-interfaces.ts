/**
 * Unified Interfaces for Client Architecture Standardization
 * 
 * This file defines the unified interfaces that will serve as the foundation
 * for consolidating overlapping functionalities across the client architecture.
 */

import { z } from 'zod';
import { ReactNode, ComponentType } from 'react';

// ============================================================================
// CORE SHARED TYPES
// ============================================================================

export type Priority = 'high' | 'medium' | 'low';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type LoadingType = 'page' | 'component' | 'api' | 'asset' | 'progressive';
export type ErrorType = 'validation' | 'network' | 'permission' | 'system' | 'configuration';
export type ConnectionType = 'fast' | 'slow' | 'offline' | 'unknown';

// ============================================================================
// UNIFIED LOADING SYSTEM INTERFACES
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  loadingType: LoadingType;
  progress?: number;
  message?: string;
  error?: Error | null;
  hasTimedOut: boolean;
  retryCount: number;
  stage?: string;
  estimatedTime?: number;
}

export interface LoadingOptions {
  type: LoadingType;
  timeout?: number;
  retryStrategy?: 'exponential' | 'linear' | 'none';
  maxRetries?: number;
  connectionAware?: boolean;
  progressTracking?: boolean;
  showTimeoutWarning?: boolean;
  timeoutWarningThreshold?: number;
}

export interface LoadingOperation {
  id: string;
  type: LoadingType;
  message: string;
  priority: Priority;
  timeout: number;
  maxRetries: number;
  connectionAware: boolean;
  stage?: string;
  startTime: number;
  retryCount: number;
}

export interface ProgressiveStage {
  id: string;
  message: string;
  duration?: number;
}

export interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  message?: string;
  progress?: number;
  className?: string;
}

export interface ProgressBarProps {
  progress: number;
  showPercentage?: boolean;
  animated?: boolean;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
}

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
}

export interface UnifiedLoadingSystem {
  // Core loading state management
  useLoading: (options?: LoadingOptions) => LoadingState & {
    startLoading: (type: LoadingType, options?: LoadingOptions) => void;
    stopLoading: (success?: boolean, error?: Error) => void;
    updateProgress: (progress: number, message?: string) => void;
    setStage: (stage: string, message?: string) => void;
    retry: () => void;
    reset: () => void;
  };
  
  // Specialized loading hooks
  usePageLoading: () => LoadingState;
  useComponentLoading: () => LoadingState;
  useAssetLoading: () => LoadingState;
  useProgressiveLoading: (stages: ProgressiveStage[]) => LoadingState & {
    currentStage: ProgressiveStage | null;
    completeCurrentStage: () => void;
    failCurrentStage: (error: Error) => void;
  };
  
  // Loading components
  LoadingIndicator: ComponentType<LoadingIndicatorProps>;
  ProgressBar: ComponentType<ProgressBarProps>;
  SkeletonLoader: ComponentType<SkeletonProps>;
  
  // Loading utilities
  createLoadingOperation: (config: LoadingOptions & { id: string }) => LoadingOperation;
  manageLoadingQueue: (operations: LoadingOperation[]) => {
    addOperation: (operation: LoadingOperation) => void;
    removeOperation: (id: string) => void;
    getQueueStatus: () => { total: number; active: number; completed: number; failed: number };
  };
}

// ============================================================================
// UNIFIED ERROR HANDLING INTERFACES
// ============================================================================

export interface AppError extends Error {
  type: ErrorType;
  severity: Severity;
  recoverable: boolean;
  context: ErrorContext;
  timestamp: number;
  id: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  additionalData?: Record<string, any>;
}

export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  automatic: boolean;
  action: () => Promise<boolean>;
  conditions?: (error: AppError) => boolean;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<ErrorFallbackProps>;
  onError?: (error: AppError, errorInfo: any) => void;
  isolate?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

export interface ErrorFallbackProps {
  error: AppError;
  resetError: () => void;
  retry?: () => void;
  canRecover: boolean;
  recoveryStrategies: RecoveryStrategy[];
}

export interface ErrorHandler {
  handleError: (error: Error, context?: Partial<ErrorContext>) => void;
  createError: (type: ErrorType, message: string, context?: Partial<ErrorContext>) => AppError;
  reportError: (error: AppError) => void;
  clearErrors: () => void;
  getErrors: () => AppError[];
}

export interface ErrorRecovery {
  canRecover: (error: AppError) => boolean;
  getRecoveryStrategies: (error: AppError) => RecoveryStrategy[];
  executeRecovery: (strategy: RecoveryStrategy, error: AppError) => Promise<boolean>;
  registerStrategy: (strategy: RecoveryStrategy) => void;
}

export interface UnifiedErrorSystem {
  // Error boundary components
  ErrorBoundary: ComponentType<ErrorBoundaryProps>;
  PageErrorBoundary: ComponentType<ErrorBoundaryProps>;
  ComponentErrorBoundary: ComponentType<ErrorBoundaryProps>;
  
  // Error handling hooks
  useErrorHandler: () => ErrorHandler;
  useErrorRecovery: () => ErrorRecovery;
  useErrorState: () => {
    errors: AppError[];
    hasErrors: boolean;
    clearErrors: () => void;
    addError: (error: AppError) => void;
  };
  
  // Error utilities
  createError: (type: ErrorType, message: string, context?: Partial<ErrorContext>) => AppError;
  handleError: (error: Error, context?: Partial<ErrorContext>) => void;
  isRecoverable: (error: AppError) => boolean;
  
  // Recovery system
  RecoveryManager: {
    registerStrategy: (strategy: RecoveryStrategy) => void;
    getStrategies: (error: AppError) => RecoveryStrategy[];
    executeRecovery: (strategy: RecoveryStrategy, error: AppError) => Promise<boolean>;
  };
}

// ============================================================================
// UNIFIED FORM AND VALIDATION INTERFACES
// ============================================================================

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  data?: any;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Type alias for backward compatibility
export type ValidationError = ValidationErrorDetail;

export interface ValidationSchema<T = any> {
  schema: z.ZodSchema<T>;
  errorMessages?: Record<string, string>;
  transform?: (data: any) => T;
  validate: (data: any) => ValidationResult;
}

export interface FormState<T = any> {
  values: Partial<T>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  submitCount: number;
}

export interface FieldState {
  value: any;
  error?: string;
  touched: boolean;
  focused: boolean;
  dirty: boolean;
}

export interface FormProps<T = any> {
  schema: ValidationSchema<T>;
  initialValues?: Partial<T>;
  onSubmit: (values: T) => void | Promise<void>;
  onError?: (errors: ValidationError[]) => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  resetOnSubmit?: boolean;
  children: ReactNode;
}

export interface FormFieldProps {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

export interface FormInputProps {
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  className?: string;
}

export interface UnifiedFormSystem {
  // Form components
  Form: ComponentType<FormProps>;
  FormField: ComponentType<FormFieldProps>;
  FormInput: ComponentType<FormInputProps>;
  FormTextarea: ComponentType<FormInputProps>;
  FormSelect: ComponentType<FormInputProps & { options: Array<{ value: string; label: string }> }>;
  FormCheckbox: ComponentType<FormInputProps>;
  FormRadio: ComponentType<FormInputProps & { options: Array<{ value: string; label: string }> }>;
  
  // Validation system
  createSchema: <T>(definition: z.ZodSchema<T>, options?: { errorMessages?: Record<string, string> }) => ValidationSchema<T>;
  validateField: (value: any, schema: ValidationSchema) => ValidationResult;
  validateForm: <T>(values: Partial<T>, schema: ValidationSchema<T>) => ValidationResult;
  
  // Form hooks
  useForm: <T>(schema: ValidationSchema<T>, options?: { initialValues?: Partial<T> }) => FormState<T> & {
    setValue: (name: keyof T, value: any) => void;
    setError: (name: keyof T, error: string) => void;
    clearError: (name: keyof T) => void;
    reset: (values?: Partial<T>) => void;
    submit: () => Promise<void>;
  };
  useFormField: (name: string) => FieldState & {
    setValue: (value: any) => void;
    setTouched: (touched: boolean) => void;
    setFocused: (focused: boolean) => void;
  };
  
  // Form utilities
  FormBuilder: {
    createField: (config: any) => ComponentType<any>;
    createForm: (config: any) => ComponentType<any>;
  };
}

// ============================================================================
// UNIFIED NAVIGATION INTERFACES
// ============================================================================

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: ComponentType<any>;
  badge?: string | number;
  children?: NavigationItem[];
  permissions?: string[];
  external?: boolean;
}

export interface NavigationState {
  currentPath: string;
  breadcrumbs: NavigationItem[];
  sidebarCollapsed: boolean;
  isMobile: boolean;
  activeItem?: NavigationItem;
}

export interface RouteAccessState {
  hasAccess: boolean;
  requiredPermissions: string[];
  userPermissions: string[];
  redirectPath?: string;
}

export interface NavigationProps {
  items: NavigationItem[];
  variant?: 'sidebar' | 'header' | 'breadcrumb';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onItemClick?: (item: NavigationItem) => void;
}

export interface SidebarProps {
  items: NavigationItem[];
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  width?: number;
  collapsedWidth?: number;
}

export interface MobileNavProps {
  items: NavigationItem[];
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}

export interface RouteGuardProps {
  children: ReactNode;
  requiredPermissions?: string[];
  fallback?: ComponentType<any>;
  redirectTo?: string;
}

export interface UnifiedNavigationSystem {
  // Navigation components
  Navigation: ComponentType<NavigationProps>;
  Sidebar: ComponentType<SidebarProps>;
  MobileNav: ComponentType<MobileNavProps>;
  Breadcrumbs: ComponentType<{ items: NavigationItem[] }>;
  
  // Navigation hooks
  useNavigation: () => NavigationState & {
    navigate: (path: string) => void;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
  };
  useRouteAccess: (requiredPermissions?: string[]) => RouteAccessState;
  useBreadcrumbs: () => NavigationItem[];
  
  // Navigation utilities
  NavigationManager: {
    registerRoutes: (routes: NavigationItem[]) => void;
    getRoute: (path: string) => NavigationItem | undefined;
    hasAccess: (route: NavigationItem, permissions: string[]) => boolean;
  };
  RouteGuard: ComponentType<RouteGuardProps>;
}

// ============================================================================
// UNIFIED CONFIGURATION INTERFACES
// ============================================================================

export interface ConfigurationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    default?: any;
    validation?: z.ZodSchema;
    description?: string;
  };
}

export interface ConfigurationManager {
  get: <T = any>(key: string, defaultValue?: T) => T;
  set: (key: string, value: any) => void;
  has: (key: string) => boolean;
  remove: (key: string) => void;
  clear: () => void;
  validate: (config: any, schema: ConfigurationSchema) => ValidationResult;
  subscribe: (key: string, callback: (value: any) => void) => () => void;
}

// ============================================================================
// UNIFIED COMPONENT INTERFACES
// ============================================================================

export interface BaseComponentProps {
  id?: string;
  className?: string;
  'data-testid'?: string;
  children?: ReactNode;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface DataComponentProps<T = any> extends BaseComponentProps {
  data?: T;
  loading?: boolean;
  error?: Error;
  onRetry?: () => void;
  emptyState?: ComponentType<any>;
  errorState?: ComponentType<any>;
  loadingState?: ComponentType<any>;
}

// ============================================================================
// UNIFIED STYLING INTERFACES
// ============================================================================

export interface DesignTokens {
  colors: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    semantic: {
      success: Record<string, string>;
      warning: Record<string, string>;
      error: Record<string, string>;
      info: Record<string, string>;
    };
    neutral: Record<string, string>;
  };
  typography: {
    fontFamilies: Record<string, string>;
    fontSizes: Record<string, string>;
    lineHeights: Record<string, string>;
    fontWeights: Record<string, string>;
  };
  spacing: Record<string, string>;
  breakpoints: Record<string, string>;
  shadows: Record<string, string>;
  borderRadius: Record<string, string>;
}

export interface ThemeConfig {
  tokens: DesignTokens;
  components: Record<string, any>;
  utilities: Record<string, string>;
}

// ============================================================================
// UNIFIED TESTING INTERFACES
// ============================================================================

export interface TestUtilities {
  renderWithProviders: (component: ReactNode, options?: any) => any;
  createMockProps: <T>(overrides?: Partial<T>) => T;
  waitForElement: (selector: string, timeout?: number) => Promise<Element>;
  fireEvent: any;
  screen: any;
  userEvent: any;
}

export interface MockFactories {
  createMockUser: (overrides?: any) => any;
  createMockError: (type: ErrorType, overrides?: any) => AppError;
  createMockLoadingState: (overrides?: Partial<LoadingState>) => LoadingState;
  createMockNavigationItem: (overrides?: Partial<NavigationItem>) => NavigationItem;
}

// ============================================================================
// UNIFIED PERFORMANCE INTERFACES
// ============================================================================

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  bundleSize: number;
  memoryUsage: number;
  networkRequests: number;
}

export interface PerformanceMonitor {
  startMeasurement: (name: string) => void;
  endMeasurement: (name: string) => number;
  getMetrics: () => PerformanceMetrics;
  reportMetrics: (metrics: PerformanceMetrics) => void;
}

// ============================================================================
// UNIFIED ACCESSIBILITY INTERFACES
// ============================================================================

export interface AccessibilityFeatures {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  focusManagement: {
    trapFocus: (element: HTMLElement) => () => void;
    restoreFocus: (element: HTMLElement) => void;
    getNextFocusableElement: (element: HTMLElement) => HTMLElement | null;
  };
  keyboardNavigation: {
    registerShortcut: (key: string, handler: () => void, options?: any) => () => void;
    handleArrowNavigation: (elements: HTMLElement[], currentIndex: number) => void;
  };
}

// ============================================================================
// EXPORT ALL INTERFACES
// ============================================================================

export type {
  // Core types
  Priority,
  Severity,
  LoadingType,
  ErrorType,
  ConnectionType,
  
  // System interfaces
  UnifiedLoadingSystem,
  UnifiedErrorSystem,
  UnifiedFormSystem,
  UnifiedNavigationSystem,
  
  // Component interfaces
  BaseComponentProps,
  InteractiveComponentProps,
  DataComponentProps,
  
  // Utility interfaces
  ConfigurationManager,
  TestUtilities,
  MockFactories,
  PerformanceMonitor,
  AccessibilityFeatures,
  
  // Configuration
  DesignTokens,
  ThemeConfig,
};


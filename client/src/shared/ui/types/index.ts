/**
 * Shared UI Types Library
 * Consolidated type definitions for all shared UI components
 */

import React from 'react';

// ============================================================================
// Base Component Types
// ============================================================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

export interface BaseInteractiveProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

// ============================================================================
// Common UI Types
// ============================================================================

export type Size = 'sm' | 'md' | 'lg';
export type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type Status = 'idle' | 'loading' | 'success' | 'error';
export type Theme = 'light' | 'dark' | 'auto';

// ============================================================================
// Loading Types (Simplified)
// ============================================================================

export type LoadingSize = Size;
export type LoadingState = Status;
export type LoadingType = 'page' | 'component' | 'inline';

export interface LoadingProps extends BaseComponentProps {
  size?: LoadingSize;
  state?: LoadingState;
  type?: LoadingType;
  message?: string;
  showMessage?: boolean;
}

export interface LoadingConfig {
  timeout: number;
  retryDelay: number;
  maxRetries: number;
  showProgress: boolean;
}

// ============================================================================
// Error Types (Simplified)
// ============================================================================

export interface ErrorInfo {
  message: string;
  code?: string;
  type?: string;
  details?: Record<string, any>;
}

export interface ErrorProps extends BaseComponentProps {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
}

// ============================================================================
// Widget Types (Simplified)
// ============================================================================

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  position: WidgetPosition;
  size: WidgetSize;
  visible?: boolean;
  settings?: Record<string, any>;
}

export interface WidgetProps extends BaseComponentProps {
  config: WidgetConfig;
  data?: any;
  loading?: boolean;
  error?: ErrorInfo;
  onUpdate?: (config: Partial<WidgetConfig>) => void;
  onRemove?: () => void;
}

// ============================================================================
// Dashboard Types (Simplified)
// ============================================================================

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  theme?: Theme;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface DashboardState {
  config: DashboardConfig | null;
  loading: boolean;
  error: ErrorInfo | null;
}

export interface DashboardProps extends BaseComponentProps {
  config?: DashboardConfig;
  onConfigChange?: (config: DashboardConfig) => void;
  onError?: (error: ErrorInfo) => void;
}

// ============================================================================
// Navigation Types (Simplified)
// ============================================================================

export type UserRole = 'public' | 'citizen' | 'expert' | 'admin';
export type NavigationSection = 'legislative' | 'community' | 'tools' | 'user' | 'admin';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  section: NavigationSection;
  description?: string;
  badge?: number;
  allowedRoles?: UserRole[];
  requiresAuth?: boolean;
}

export interface NavigationProps extends BaseComponentProps {
  items?: NavigationItem[];
  currentPath?: string;
  userRole?: UserRole;
  onNavigate?: (item: NavigationItem) => void;
}

// ============================================================================
// Form Types
// ============================================================================

export interface FormFieldProps extends BaseComponentProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

// ============================================================================
// Modal Types
// ============================================================================

export interface ModalProps extends BaseComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  size?: Size;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export interface NotificationProps extends BaseComponentProps {
  notification: NotificationData;
  onRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onAction?: (id: string, actionIndex: number) => void;
}

// ============================================================================
// Privacy Types
// ============================================================================

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts';
  showActivity: boolean;
  showMetrics: boolean;
  allowAnalytics: boolean;
  allowDataExport: boolean;
}

export interface PrivacyProps extends BaseComponentProps {
  settings: PrivacySettings;
  onSettingsChange: (settings: PrivacySettings) => void;
  mode?: 'full' | 'modal' | 'compact';
}

// ============================================================================
// Mobile Types
// ============================================================================

export interface MobileConfig {
  breakpoint: number;
  touchEnabled: boolean;
  swipeEnabled: boolean;
}

export interface MobileProps extends BaseComponentProps {
  config?: MobileConfig;
  responsive?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export type ComponentRef<T = HTMLElement> = React.RefObject<T>;
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

// Generic hook return type
export interface UseHookResult<T, E = Error> {
  data: T | null;
  loading: boolean;
  error: E | null;
  refetch: () => Promise<void>;
}

// Generic API response type
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}
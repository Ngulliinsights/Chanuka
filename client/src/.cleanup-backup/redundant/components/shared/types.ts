// Shared TypeScript interfaces for component variants

export interface ComponentVariant {
  size?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark';
  layout?: 'grid' | 'list';
}

export interface DashboardComponentVariant extends ComponentVariant {
  variant?: 'full-page' | 'section';
  showStats?: boolean;
  showActivity?: boolean;
  showBills?: boolean;
}

export type DashboardVariant = 'full-page' | 'section';

export interface PrivacyComponentVariant extends ComponentVariant {
  mode?: 'public' | 'private' | 'restricted';
  consent?: boolean;
  tracking?: boolean;
  showModal?: boolean;
}

export type PrivacyMode = 'full' | 'modal' | 'compact';

export interface AuthComponentVariant extends ComponentVariant {
  showSocialLogin?: boolean;
  showForgotPassword?: boolean;
  securityLevel?: 'basic' | 'enhanced';
}

// Common component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  testId?: string;
}

// Hook return types
export interface UseDashboardDataReturn {
  stats: any;
  activity: any[];
  bills: any[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UsePrivacySettingsReturn {
  settings: any;
  updateSetting: (key: string, value: any) => Promise<void>;
  loading: boolean;
  error: string | null;
}
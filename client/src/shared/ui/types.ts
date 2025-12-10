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

// Hook return types - Supporting types
export interface DashboardStats {
  totalBills: number;
  totalComments: number;
  activeTracking: number;
  civicScore: number;
  monthlyGrowth: number;
}

export interface ActivityRecord {
  id: string;
  type: 'view' | 'comment' | 'save' | 'share' | 'vote';
  title: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface BillRecord {
  id: string;
  title: string;
  status: string;
  category: string;
  engagementCount: number;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts';
  showActivity: boolean;
  showMetrics: boolean;
  showRecommendations: boolean;
  allowDataExport: boolean;
  allowAnalytics: boolean;
}

export interface UseDashboardDataReturn {
  stats: DashboardStats;
  activity: ActivityRecord[];
  bills: BillRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UsePrivacySettingsReturn {
  settings: PrivacySettings;
  updateSetting: <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => Promise<void>;
  loading: boolean;
  error: string | null;
}
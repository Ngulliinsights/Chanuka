/**
 * Core dashboard type declarations
 */

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  config: Record<string, any>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  settings: Record<string, any>;
}

export interface DashboardPreferences {
  theme?: 'light' | 'dark' | 'auto';
  layout?: 'compact' | 'standard' | 'expanded';
  defaultView?: 'list' | 'grid' | 'cards';
  refreshInterval?: number;
}

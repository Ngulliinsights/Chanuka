import React from 'react';

import NavigationAnalytics from './NavigationAnalytics';

export interface NavigationMetrics {
  pageLoadTime: number;
  navigationTime: number;
  userInteractions: number;
  searchQueries: string[];
  mostVisitedPages: string[];
}

export const NavigationAnalyticsContext = React.createContext<{
  metrics: NavigationMetrics;
  reportAnalytics: () => void;
} | null>(null);

export function useNavigationAnalytics() {
  const context = React.useContext(NavigationAnalyticsContext);
  if (!context) {
    throw new Error('useNavigationAnalytics must be used within NavigationAnalytics');
  }
  return context;
}

export function withNavigationAnalytics<P extends object>(Component: React.ComponentType<P>) {
  return function AnalyticsWrappedComponent(props: P) {
    return (
      <NavigationAnalytics>
        <Component {...props} />
      </NavigationAnalytics>
    );
  };
}
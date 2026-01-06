/**
 * Mobile Component Fallbacks
 *
 * Shared fallback components used when mobile components are not available.
 * This eliminates code duplication between components.
 */

import React from 'react';

// Re-export hooks from separate files
export { useBottomSheet } from './hooks/useBottomSheet';
export { useInfiniteScroll } from './hooks/useInfiniteScroll';
export { useMobileTabs } from './hooks/useMobileTabs';

// Layout fallbacks
export const MobileLayout = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: unknown;
}) => (
  <div className="mobile-layout" {...props}>
    {children}
  </div>
);

export const MobileContainer = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: unknown;
}) => (
  <div className="mobile-container" {...props}>
    {children}
  </div>
);

export const MobileSection = ({
  children,
  title,
  ...props
}: {
  children: React.ReactNode;
  title?: string;
  [key: string]: unknown;
}) => (
  <section className="mobile-section" {...props}>
    {title && <h2 className="mobile-section-title">{title}</h2>}
    {children}
  </section>
);

export const MobileGrid = ({
  children,
  columns = 1,
  gap = 'sm',
  ...props
}: {
  children: React.ReactNode;
  columns?: number;
  gap?: string;
  [key: string]: unknown;
}) => (
  <div className={`mobile-grid mobile-grid-cols-${columns} mobile-gap-${gap}`} {...props}>
    {children}
  </div>
);

// Interaction fallbacks
// Interaction fallbacks
export const InfiniteScroll = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: unknown;
}) => (
  <div className="infinite-scroll" {...props}>
    {children}
  </div>
);

export const MobileTabSelector = ({
  _tabs,
  _activeTab,
  _onTabChange,
  ...props
}: {
  _tabs?: unknown;
  _activeTab?: unknown;
  _onTabChange?: unknown;
  [key: string]: unknown;
}) => (
  <div className="mobile-tab-selector" {...props}>
    Tab Selector Placeholder
  </div>
);

// Data display fallbacks
// Data display fallbacks
export const MobileMetricCard = ({
  title,
  value,
  ...props
}: {
  title: string;
  value: string | number;
  [key: string]: unknown;
}) => (
  <div className="mobile-metric-card" {...props}>
    <div>
      {title}: {value}
    </div>
  </div>
);

export const MobileBarChart = ({
  _data,
  ...props
}: {
  _data?: unknown;
  [key: string]: unknown;
}) => (
  <div className="mobile-bar-chart" {...props}>
    Bar Chart Placeholder
  </div>
);

export const MobilePieChart = ({
  _data,
  ...props
}: {
  _data?: unknown;
  [key: string]: unknown;
}) => (
  <div className="mobile-pie-chart" {...props}>
    Pie Chart Placeholder
  </div>
);

export const SwipeGestures = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: unknown;
}) => (
  <div className="swipe-gestures" {...props}>
    {children}
  </div>
);

// Type definitions for fallbacks
export type { MobileTab } from './constants';

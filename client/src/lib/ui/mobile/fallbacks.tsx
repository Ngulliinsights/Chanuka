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
export   [key: string]: unknown;
}) => (
  <div className="mobile-layout" {...props}>
    {children}
  </div>
);

export   [key: string]: unknown;
}) => (
  <div className="mobile-container" {...props}>
    {children}
  </div>
);

export   title?: string;
  [key: string]: unknown;
}) => (
  <section className="mobile-section" {...props}>
    {title && <h2 className="mobile-section-title">{title}</h2>}
    {children}
  </section>
);

export   columns?: number;
  gap?: string;
  [key: string]: unknown;
}) => (
  <div className={`mobile-grid mobile-grid-cols-${columns} mobile-gap-${gap}`} {...props}>
    {children}
  </div>
);

// Interaction fallbacks
// Interaction fallbacks
export   [key: string]: unknown;
}) => (
  <div className="infinite-scroll" {...props}>
    {children}
  </div>
);

export   _activeTab?: unknown;
  _onTabChange?: unknown;
  [key: string]: unknown;
}) => (
  <div className="mobile-tab-selector" {...props}>
    Tab Selector Placeholder
  </div>
);

// Data display fallbacks
// Data display fallbacks
export   value: string | number;
  [key: string]: unknown;
}) => (
  <div className="mobile-metric-card" {...props}>
    <div>
      {title}: {value}
    </div>
  </div>
);

export   [key: string]: unknown;
}) => (
  <div className="mobile-bar-chart" {...props}>
    Bar Chart Placeholder
  </div>
);

export   [key: string]: unknown;
}) => (
  <div className="mobile-pie-chart" {...props}>
    Pie Chart Placeholder
  </div>
);

export   [key: string]: unknown;
}) => (
  <div className="swipe-gestures" {...props}>
    {children}
  </div>
);

// Type definitions for fallbacks
export type { MobileTab } from './constants';

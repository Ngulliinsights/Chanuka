/**
 * Mobile Components - Barrel Export
 *
 * This file provides convenient imports for all mobile-optimized components.
 * Used for responsive/mobile-first UI patterns.
 */

// Main layout wrapper - aliased for compatibility
export { MobileLayout as MobileOptimizedLayout } from './layout/MobileLayout'

// Layout components
export { MobileLayout } from './layout/MobileLayout'
export { MobileHeader } from './layout/MobileHeader'
export { SafeAreaWrapper } from './layout/SafeAreaWrapper'
export { AutoHideHeader } from './layout/AutoHideHeader'

// Interaction components (touch & gestures)
export { PullToRefresh } from './interaction/PullToRefresh'
export { MobileBottomSheet } from './interaction/MobileBottomSheet'
export { InfiniteScroll } from './interaction/InfiniteScroll'
export { ScrollToTopButton } from './interaction/ScrollToTopButton'
export type { SwipeDirection, SwipeGestureData } from './interaction/SwipeGestures'

// Data display components (mobile-optimized content)
export { MobileDataVisualization } from './data-display/MobileDataVisualization'
export { MobileTabSelector } from './data-display/MobileTabSelector'
export { MobileBillCard } from './data-display/MobileBillCard'
export { MobileChartCarousel } from './data-display/MobileChartCarousel'
export type { MobileTab } from './data-display/MobileTabSelector'

// Feedback components
export { OfflineStatusBanner } from './feedback/OfflineStatusBanner'

// Navigation components
export { MobileNavigation } from './MobileNavigation'

// Fallback components (for when full implementations aren't available)
export {
  MobileContainer,
  MobileSection,
  MobileGrid,
  MobileMetricCard,
  MobileBarChart,
  MobilePieChart,
  SwipeGestures,
  useBottomSheet,
  useInfiniteScroll,
  useMobileTabs
} from './fallbacks.tsx'
export type { MobileTab as FallbackMobileTab, ChartData } from './fallbacks.tsx'

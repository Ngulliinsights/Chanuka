/**
 * Realtime components index
 *
 * Provides a single entry point for realtime features and bridges the
 * existing `real-time` folder to reduce duplication. Consumers can import
 * from `components/realtime` while we progressively migrate files.
 */

export { default as RealTimeDashboard } from './RealTimeDashboard';
export { RealTimeNotifications } from './RealTimeNotifications';

// NOTE: Both dashboard and notifications live in `realtime/` now; keep this
// index as the single import surface for real-time features.

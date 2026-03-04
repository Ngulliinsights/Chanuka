/**
 * Realtime Model Layer
 *
 * Centralized exports for realtime domain models and services
 */

export { realtimeOptimizer } from '../../../infrastructure/realtime/optimization';

export type {
  ConnectionMetrics,
  OptimizationConfig,
  MessageBatch,
  DeltaState,
} from '../../../infrastructure/realtime/optimization';

// ============================================================================
// MACHINE LEARNING MODELS INDEX
// ============================================================================
// Central registry for all ML models used in the platform

export * from './trojan-bill-detector';
export * from './constitutional-analyzer';
export * from './conflict-detector';
export * from './sentiment-analyzer';
export * from './engagement-predictor';
export * from './transparency-scorer';
export * from './influence-mapper';
export * from './real-time-classifier';

// Model registry for dynamic loading
export const MODEL_REGISTRY = {
  'trojan-bill-detector': () => import('./trojan-bill-detector'),
  'constitutional-analyzer': () => import('./constitutional-analyzer'),
  'conflict-detector': () => import('./conflict-detector'),
  'sentiment-analyzer': () => import('./sentiment-analyzer'),
  'engagement-predictor': () => import('./engagement-predictor'),
  'transparency-scorer': () => import('./transparency-scorer'),
  'influence-mapper': () => import('./influence-mapper'),
  'real-time-classifier': () => import('./real-time-classifier'),
} as const;

export type ModelType = keyof typeof MODEL_REGISTRY;
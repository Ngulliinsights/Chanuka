/**
 * Transformation Utilities
 * Central export for all transformation utilities
 * 
 * Requirements: 4.1, 4.2
 */

// Core types
export type {
  Transformer,
  PartialTransformer,
  TransformationContext,
  TransformationOptions,
  TransformationResult,
  TransformationError,
  TransformerRegistryEntry,
  TransformationPipeline,
} from './types';

// Registry
export {
  transformerRegistry,
  registerTransformer,
  getTransformer,
} from './registry';

// Base transformers
export {
  createIdentityTransformer,
  dateToStringTransformer,
  optionalDateToStringTransformer,
  createEnumTransformer,
  createArrayTransformer,
  createOptionalArrayTransformer,
  createOptionalTransformer,
  createFieldMappingTransformer,
  composeTransformers,
  createValidatingTransformer,
  createContextualTransformer,
  applyTransformationOptions,
  createSafeTransformer,
} from './base';

// Entity transformers
export * from './entities';
export { registerAllTransformers } from './entities';

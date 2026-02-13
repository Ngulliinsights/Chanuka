/**
 * Transformation Utility Types
 * Core interfaces and types for the transformation layer
 * 
 * Requirements: 4.1, 4.2
 */

/**
 * Transformer interface for bidirectional data transformation
 * Converts between source and target types with type safety
 * 
 * @template TSource - Source type (e.g., database table type)
 * @template TTarget - Target type (e.g., domain entity type)
 */
export interface Transformer<TSource, TTarget> {
  /**
   * Transform from source to target
   * @param source - Source data to transform
   * @returns Transformed target data
   */
  transform(source: TSource): TTarget;

  /**
   * Reverse transform from target to source
   * @param target - Target data to reverse transform
   * @returns Transformed source data
   */
  reverse(target: TTarget): TSource;
}

/**
 * Partial transformer for one-way transformations
 * Used when reverse transformation is not needed or not possible
 * 
 * @template TSource - Source type
 * @template TTarget - Target type
 */
export interface PartialTransformer<TSource, TTarget> {
  /**
   * Transform from source to target
   * @param source - Source data to transform
   * @returns Transformed target data
   */
  transform(source: TSource): TTarget;
}

/**
 * Transformation context for passing additional data during transformation
 */
export interface TransformationContext {
  /**
   * User ID performing the transformation (for audit trails)
   */
  readonly userId?: string;

  /**
   * Timestamp of transformation
   */
  readonly timestamp?: Date;

  /**
   * Additional metadata for transformation
   */
  readonly metadata?: Readonly<Record<string, unknown>>;

  /**
   * Transformation options
   */
  readonly options?: TransformationOptions;
}

/**
 * Transformation options for customizing transformation behavior
 */
export interface TransformationOptions {
  /**
   * Whether to include null/undefined fields in output
   */
  readonly includeNullFields?: boolean;

  /**
   * Whether to validate data during transformation
   */
  readonly validate?: boolean;

  /**
   * Whether to throw errors on validation failure
   */
  readonly throwOnValidationError?: boolean;

  /**
   * Custom field mappings
   */
  readonly fieldMappings?: Readonly<Record<string, string>>;

  /**
   * Fields to exclude from transformation
   */
  readonly excludeFields?: readonly string[];

  /**
   * Fields to include in transformation (if specified, only these fields are included)
   */
  readonly includeFields?: readonly string[];
}

/**
 * Transformation result with validation information
 */
export interface TransformationResult<T> {
  /**
   * Transformed data
   */
  readonly data: T;

  /**
   * Whether transformation was successful
   */
  readonly success: boolean;

  /**
   * Validation errors if any
   */
  readonly errors?: readonly TransformationError[];

  /**
   * Warnings during transformation
   */
  readonly warnings?: readonly string[];

  /**
   * Transformation metadata
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Transformation error details
 */
export interface TransformationError {
  /**
   * Error code
   */
  readonly code: string;

  /**
   * Error message
   */
  readonly message: string;

  /**
   * Field that caused the error
   */
  readonly field?: string;

  /**
   * Original value that caused the error
   */
  readonly value?: unknown;

  /**
   * Error severity
   */
  readonly severity: 'error' | 'warning';
}

/**
 * Transformer registry entry
 */
export interface TransformerRegistryEntry<TSource = unknown, TTarget = unknown> {
  /**
   * Unique identifier for the transformer
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Description of what this transformer does
   */
  readonly description: string;

  /**
   * Source type name
   */
  readonly sourceType: string;

  /**
   * Target type name
   */
  readonly targetType: string;

  /**
   * The transformer instance
   */
  readonly transformer: Transformer<TSource, TTarget>;

  /**
   * Whether this transformer is bidirectional
   */
  readonly bidirectional: boolean;

  /**
   * Tags for categorization
   */
  readonly tags?: readonly string[];
}

/**
 * Transformation pipeline for chaining multiple transformers
 */
export interface TransformationPipeline<TInput, TOutput> {
  /**
   * Add a transformation step to the pipeline
   */
  pipe<TNext>(transformer: Transformer<TOutput, TNext> | PartialTransformer<TOutput, TNext>): TransformationPipeline<TInput, TNext>;

  /**
   * Execute the transformation pipeline
   */
  execute(input: TInput, context?: TransformationContext): TOutput;

  /**
   * Execute the transformation pipeline with validation
   */
  executeWithValidation(input: TInput, context?: TransformationContext): TransformationResult<TOutput>;
}

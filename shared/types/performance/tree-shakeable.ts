/**
 * Tree-Shakeable Type Exports
 * Types and utilities designed for optimal tree-shaking in bundlers
 */

import { z } from 'zod';
import { createValidatedType } from '../core/validation';

// ============================================================================
// Tree-Shakeable Type Patterns
// ============================================================================

/**
 * Tree-shakeable type marker interface
 * Used to identify types that are safe for tree-shaking
 */
export interface TreeShakeableType {
  /** Unique identifier for the type */
  readonly __treeShakeableId: string;

  /** Type name for debugging */
  readonly __typeName: string;

  /** Indicates if this type can be safely tree-shaken */
  readonly __isTreeShakeable: true;
}

/**
 * Tree-shakeable module marker
 * Used to mark modules that export tree-shakeable types
 */
export interface TreeShakeableModule {
  /** Module identifier */
  readonly __moduleId: string;

  /** Module name */
  readonly __moduleName: string;

  /** Tree-shakeable exports */
  readonly __treeShakeableExports: string[];

  /** Indicates if this module is designed for tree-shaking */
  readonly __isTreeShakeableModule: true;
}

// ============================================================================
// Tree-Shakeable Type Definitions
// ============================================================================

/**
 * Tree-shakeable configuration type
 * Designed to be easily eliminated by bundlers when not used
 */
export type TreeShakeableConfig = {
  /** Enable tree-shaking optimizations */
  readonly enableTreeShaking: boolean;

  /** Tree-shaking aggressiveness level */
  readonly aggressiveness: 'conservative' | 'moderate' | 'aggressive';

  /** Side effect free modules */
  readonly sideEffectFreeModules: string[];

  /** Pure functions annotation */
  readonly pureFunctions: string[];

  /** Tree-shaking annotations */
  readonly annotations: TreeShakingAnnotation[];
};

/**
 * Tree-shaking annotation
 * Provides hints to bundlers about tree-shaking behavior
 */
export type TreeShakingAnnotation = {
  /** Annotation type */
  readonly type: 'pure' | 'side-effect-free' | 'no-side-effects' | 'used' | 'preserve';

  /** Target identifier */
  readonly target: string;

  /** Reason for annotation */
  readonly reason?: string;

  /** Scope of annotation */
  readonly scope?: 'function' | 'class' | 'variable' | 'type' | 'module';
};

// ============================================================================
// Tree-Shakeable Utility Types
// ============================================================================

/**
 * Pure function marker
 * Indicates a function has no side effects and can be safely tree-shaken
 */
export type PureFunction<T extends (...args: unknown[]) => any> = T & {
  /** Pure function marker */
  readonly __pure: true;

  /** Function name */
  readonly __functionName: string;
};

/**
 * Side-effect-free type marker
 * Indicates a type can be safely eliminated if not used
 */
export type SideEffectFreeType<T> = T & {
  /** Side-effect-free marker */
  readonly __sideEffectFree: true;

  /** Type identifier */
  readonly __typeId: string;
};

// ============================================================================
// Tree-Shakeable Validation Types
// ============================================================================

/**
 * Tree-shakeable validated type
 * Combines validation with tree-shaking optimizations
 */
export interface TreeShakeableValidatedType<T> extends TreeShakeableType {
  /** Validation schema */
  readonly schema: z.ZodSchema<T>;

  /** Validate function */
  readonly validate: (input: unknown) => { success: true; data: T } | { success: false; error: Error };

  /** Type guard */
  readonly typeGuard: (input: unknown) => input is T;

  /** Tree-shaking metadata */
  readonly treeShaking: TreeShakingMetadata;
}

/**
 * Tree-shaking metadata
 * Provides information to bundlers about tree-shaking behavior
 */
export type TreeShakingMetadata = {
  /** Indicates if this type can be safely eliminated */
  readonly canEliminate: boolean;

  /** Dependencies that prevent elimination */
  readonly dependencies: string[];

  /** Side effects */
  readonly sideEffects: string[];

  /** Usage patterns */
  readonly usagePatterns: TreeShakingUsagePattern[];
};

export type TreeShakingUsagePattern =
  | 'runtime-validation'
  | 'type-guards'
  | 'schema-validation'
  | 'data-transformations'
  | 'conditional-logic'
  | 'utility-functions';

// ============================================================================
// Tree-Shakeable Type Factory
// ============================================================================

/**
 * Create a tree-shakeable validated type
 */
export function createTreeShakeableValidatedType<T>(
  schema: z.ZodSchema<T>,
  typeName: string,
  treeShakingConfig: TreeShakingConfig = {}
): TreeShakeableValidatedType<T> {
  const baseValidatedType = createValidatedType(schema, typeName);

  return {
    __treeShakeableId: `tree-shakeable-${typeName}-${Math.random().toString(36).substr(2, 9)}`,
    __typeName: typeName,
    __isTreeShakeable: true,

    schema: baseValidatedType.schema,

    validate: baseValidatedType.validate,

    typeGuard: baseValidatedType.typeGuard,

    treeShaking: {
      canEliminate: treeShakingConfig.canEliminate ?? true,
      dependencies: treeShakingConfig.dependencies ?? [],
      sideEffects: treeShakingConfig.sideEffects ?? [],
      usagePatterns: treeShakingConfig.usagePatterns ?? ['runtime-validation'],
    }
  };
}

/**
 * Tree-shaking configuration for validated types
 */
export type TreeShakingConfig = {
  /** Indicates if this type can be safely eliminated */
  readonly canEliminate?: boolean;

  /** Dependencies that prevent elimination */
  readonly dependencies?: string[];

  /** Side effects */
  readonly sideEffects?: string[];

  /** Usage patterns */
  readonly usagePatterns?: TreeShakingUsagePattern[];
};

// ============================================================================
// Tree-Shakeable Module Utilities
// ============================================================================

/**
 * Create a tree-shakeable module marker
 */
export function createTreeShakeableModule(
  moduleId: string,
  moduleName: string,
  exports: string[]
): TreeShakeableModule {
  return {
    __moduleId: moduleId,
    __moduleName: moduleName,
    __treeShakeableExports: exports,
    __isTreeShakeableModule: true,
  };
}

/**
 * Tree-shakeable module configuration
 */
export type TreeShakeableModuleConfig = {
  /** Module identifier */
  readonly moduleId: string;

  /** Module name */
  readonly moduleName: string;

  /** Export configuration */
  readonly exports: TreeShakeableExportConfig[];

  /** Tree-shaking strategy */
  readonly strategy: TreeShakingStrategy;
};

export type TreeShakeableExportConfig = {
  /** Export name */
  readonly name: string;

  /** Export type */
  readonly type: 'type' | 'function' | 'class' | 'variable' | 'namespace';

  /** Tree-shaking behavior */
  readonly treeShaking: 'aggressive' | 'conservative' | 'preserve';

  /** Side effects */
  readonly sideEffects: 'none' | 'read' | 'write' | 'unknown';
};

export type TreeShakingStrategy =
  | 'aggressive-elimination'
  | 'conservative-preservation'
  | 'usage-based'
  | 'dependency-aware'
  | 'hybrid';

// ============================================================================
// Tree-Shakeable Type Analysis
// ============================================================================

/**
 * Tree-shakeable type analysis result
 */
export type TreeShakeableAnalysis = {
  /** Analysis timestamp */
  readonly timestamp: number;

  /** Analyzed types */
  readonly types: TreeShakeableTypeAnalysis[];

  /** Modules analyzed */
  readonly modules: TreeShakeableModuleAnalysis[];

  /** Tree-shaking potential */
  readonly potential: TreeShakingPotential;

  /** Recommendations */
  readonly recommendations: TreeShakingRecommendation[];
};

export type TreeShakeableTypeAnalysis = {
  /** Type identifier */
  readonly typeId: string;

  /** Type name */
  readonly typeName: string;

  /** Can be eliminated */
  readonly canEliminate: boolean;

  /** Elimination impact */
  readonly eliminationImpact: 'low' | 'medium' | 'high';

  /** Dependencies */
  readonly dependencies: string[];

  /** Side effects */
  readonly sideEffects: string[];
};

export type TreeShakeableModuleAnalysis = {
  /** Module identifier */
  readonly moduleId: string;

  /** Module name */
  readonly moduleName: string;

  /** Tree-shaking score */
  readonly score: number;

  /** Elimination potential */
  readonly eliminationPotential: number;

  /** Export analysis */
  readonly exports: TreeShakeableExportAnalysis[];
};

export type TreeShakeableExportAnalysis = {
  /** Export name */
  readonly name: string;

  /** Export type */
  readonly type: string;

  /** Can be eliminated */
  readonly canEliminate: boolean;

  /** Usage count */
  readonly usageCount: number;
};

export type TreeShakingPotential = {
  /** Total potential savings */
  readonly totalSavingsBytes: number;

  /** Percentage reduction */
  readonly percentageReduction: number;

  /** Impact on bundle size */
  readonly bundleSizeImpact: 'low' | 'medium' | 'high';

  /** Critical path impact */
  readonly criticalPathImpact: 'none' | 'low' | 'medium' | 'high';
};

export type TreeShakingRecommendation = {
  /** Recommendation identifier */
  readonly id: string;

  /** Recommendation type */
  readonly type: TreeShakingRecommendationType;

  /** Target */
  readonly target: string;

  /** Description */
  readonly description: string;

  /** Estimated impact */
  readonly estimatedImpact: number;

  /** Implementation complexity */
  readonly complexity: 'low' | 'medium' | 'high';
};

export type TreeShakingRecommendationType =
  | 'add-pure-annotation'
  | 'mark-side-effect-free'
  | 'restructure-dependencies'
  | 'eliminate-unused-exports'
  | 'optimize-imports'
  | 'lazy-load-module'
  | 'code-split-component';

// ============================================================================
// Tree-Shakeable Type Analysis Utilities
// ============================================================================

/**
 * Analyze tree-shakeable types
 */
export function analyzeTreeShakeableTypes(
  types: TreeShakeableValidatedType<any>[]
): TreeShakeableAnalysis {
  const timestamp = Date.now();
  const typeAnalyses = types.map(type => analyzeTreeShakeableType(type));

  return {
    timestamp,
    types: typeAnalyses,
    modules: [],
    potential: calculateTreeShakingPotential(typeAnalyses),
    recommendations: generateTreeShakingRecommendations(typeAnalyses),
  };
}

function analyzeTreeShakeableType<T>(
  type: TreeShakeableValidatedType<T>
): TreeShakeableTypeAnalysis {
  return {
    typeId: type.__treeShakeableId,
    typeName: type.__typeName,
    canEliminate: type.treeShaking.canEliminate,
    eliminationImpact: getEliminationImpact(type),
    dependencies: type.treeShaking.dependencies,
    sideEffects: type.treeShaking.sideEffects,
  };
}

function getEliminationImpact(
  type: TreeShakeableValidatedType<any>
): 'low' | 'medium' | 'high' {
  if (type.treeShaking.dependencies.length > 5) return 'high';
  if (type.treeShaking.sideEffects.length > 0) return 'medium';
  return 'low';
}

function calculateTreeShakingPotential(
  types: TreeShakeableTypeAnalysis[]
): TreeShakingPotential {
  const eliminableTypes = types.filter(t => t.canEliminate);
  const percentageReduction = (eliminableTypes.length / types.length) * 100;

  return {
    totalSavingsBytes: eliminableTypes.length * 1024, // Estimate
    percentageReduction,
    bundleSizeImpact: getBundleSizeImpact(percentageReduction),
    criticalPathImpact: 'none',
  };
}

function getBundleSizeImpact(
  percentage: number
): 'low' | 'medium' | 'high' {
  if (percentage > 30) return 'high';
  if (percentage > 15) return 'medium';
  return 'low';
}

function generateTreeShakingRecommendations(
  types: TreeShakeableTypeAnalysis[]
): TreeShakingRecommendation[] {
  const recommendations: TreeShakingRecommendation[] = [];

  // Recommendations for types with high elimination impact
  const highImpactTypes = types.filter(t =>
    t.canEliminate && t.eliminationImpact === 'high'
  );

  if (highImpactTypes.length > 0) {
    recommendations.push({
      id: 'rec-high-impact-elimination',
      type: 'add-pure-annotation',
      target: highImpactTypes.map(t => t.typeName).join(', '),
      description: 'High impact types identified for tree-shaking optimization',
      estimatedImpact: 30,
      complexity: 'low',
    });
  }

  // Recommendations for types with side effects
  const sideEffectTypes = types.filter(t => t.sideEffects.length > 0);

  if (sideEffectTypes.length > 0) {
    recommendations.push({
      id: 'rec-side-effect-optimization',
      type: 'restructure-dependencies',
      target: sideEffectTypes.map(t => t.typeName).join(', '),
      description: 'Types with side effects need dependency restructuring for better tree-shaking',
      estimatedImpact: 20,
      complexity: 'medium',
    });
  }

  return recommendations;
}

// ============================================================================
// Tree-Shakeable Type Validation Schemas
// ============================================================================

export const TreeShakeableConfigSchema = z.object({
  enableTreeShaking: z.boolean(),
  aggressiveness: z.enum(['conservative', 'moderate', 'aggressive']),
  sideEffectFreeModules: z.array(z.string()),
  pureFunctions: z.array(z.string()),
  annotations: z.array(z.any()), // Would be validated separately
});

export const ValidatedTreeShakeableConfig = createValidatedType(
  TreeShakeableConfigSchema,
  'TreeShakeableConfig'
);

// ============================================================================
// Tree-Shakeable Type Utilities
// ============================================================================

/**
 * Mark a function as pure for tree-shaking
 */
export function markAsPure<T extends (...args: unknown[]) => any>(
  fn: T,
  functionName: string
): PureFunction<T> {
  const pureFn = fn as PureFunction<T>;
  pureFn.__pure = true;
  pureFn.__functionName = functionName;
  return pureFn;
}

/**
 * Mark a type as side-effect-free
 */
export function markAsSideEffectFree<T>(
  obj: T,
  typeId: string
): SideEffectFreeType<T> {
  const sideEffectFree = obj as SideEffectFreeType<T>;
  sideEffectFree.__sideEffectFree = true;
  sideEffectFree.__typeId = typeId;
  return sideEffectFree;
}

/**
 * Create tree-shaking annotations
 */
export function createTreeShakingAnnotations(
  annotations: TreeShakingAnnotation[]
): TreeShakingAnnotation[] {
  return annotations.map(annotation => ({
    ...annotation,
    // Ensure proper defaults
    reason: annotation.reason || 'tree-shaking optimization',
    scope: annotation.scope || 'function',
  }));
}
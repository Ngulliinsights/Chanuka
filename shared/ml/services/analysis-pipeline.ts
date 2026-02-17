// ============================================================================
// ANALYSIS PIPELINE - Automated ML Analysis Workflows
// ============================================================================
// Orchestrates complex analysis workflows with enhanced safety and performance

import { z } from 'zod';

import { mlOrchestrator, type MLRequest } from './ml-orchestrator';

// ============================================================================
// SCHEMAS
// ============================================================================

export const PipelineStepSchema = z.object({
  id: z.string().min(1).max(50),
  modelType: z.enum([
    'trojan-bill-detector',
    'constitutional-analyzer',
    'conflict-detector',
    'sentiment-analyzer',
    'engagement-predictor',
    'transparency-scorer',
    'influence-mapper',
    'real-time-classifier',
  ]),
  dependsOn: z.array(z.string()).optional(),
  condition: z.string().max(500).optional(),
  inputMapping: z.record(z.string().max(1000)).optional(),
  parallel: z.boolean().default(false),
  optional: z.boolean().default(false), // Step can fail without failing pipeline
  timeout: z.number().min(1000).max(120000).optional(),
});

export const PipelineConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  steps: z.array(PipelineStepSchema).min(1),
  outputMapping: z.record(z.string().max(1000)).optional(),
  maxConcurrency: z.number().min(1).max(10).default(5),
});

export const PipelineInputSchema = z.object({
  pipelineId: z.string(),
  input: z.any(),
  options: z.object({
    skipCache: z.boolean().default(false),
    timeout: z.number().min(5000).max(300000).default(120000),
    continueOnError: z.boolean().default(false),
    validateOutput: z.boolean().default(true),
  }).optional(),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
export type PipelineStep = z.infer<typeof PipelineStepSchema>;
export type PipelineInput = z.infer<typeof PipelineInputSchema>;

// ============================================================================
// INTERFACES
// ============================================================================

interface StepResult {
  stepId: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
  skipped?: boolean;
  cached?: boolean;
}

export interface PipelineResult {
  success: boolean;
  results: Record<string, unknown>;
  stepResults: StepResult[];
  totalProcessingTime: number;
  error?: string;
  metadata: {
    pipelineId: string;
    executionId: string;
    timestamp: string;
    stepsExecuted: number;
    stepsSkipped: number;
    stepsFailed: number;
  };
}

interface ExpressionContext {
  input: any;
  steps: Record<string, StepResult>;
  env: Record<string, unknown>;
}

// ============================================================================
// SAFE EXPRESSION EVALUATOR
// ============================================================================

class SafeExpressionEvaluator {
  private static readonly ALLOWED_OPERATORS = [
    '+', '-', '*', '/', '%',
    '==', '!=', '===', '!==',
    '>', '<', '>=', '<=',
    '&&', '||', '!',
    '?', ':',
  ];

  private static readonly FORBIDDEN_PATTERNS = [
    /\beval\b/,
    /\bFunction\b/,
    /\b__proto__\b/,
    /\bconstructor\b/,
    /\bprocess\b/,
    /\brequire\b/,
    /\bimport\b/,
    /\bexport\b/,
    /\bdelete\b/,
  ];

  static evaluate(expression: string, context: ExpressionContext): any {
    // Validate expression safety
    this.validateExpression(expression);

    try {
      // Handle simple literals
      if (this.isSimpleLiteral(expression)) {
        return this.parseLiteral(expression);
      }

      // Create safe evaluation environment
      const safeContext = this.createSafeContext(context);
      
      // Use Function constructor with strict mode and limited scope
      const func = new Function(
        'context',
        `'use strict';
        const { input, steps, env } = context;
        try {
          return (${expression});
        } catch (e) {
          throw new Error('Expression evaluation failed: ' + e.message);
        }`
      );

      return func(safeContext);
    } catch (error) {
      throw new Error(
        `Failed to evaluate expression "${expression}": ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private static validateExpression(expression: string): void {
    // Check for forbidden patterns
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(expression)) {
        throw new Error(`Forbidden pattern in expression: ${pattern.source}`);
      }
    }

    // Check length
    if (expression.length > 1000) {
      throw new Error('Expression exceeds maximum length');
    }
  }

  private static isSimpleLiteral(expression: string): boolean {
    return /^(".*"|'.*'|\d+(\.\d+)?|true|false|null)$/.test(expression.trim());
  }

  private static parseLiteral(expression: string): any {
    const trimmed = expression.trim();
    
    // String literal
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    
    // Number literal
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }
    
    // Boolean/null literal
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'null') return null;
    
    return undefined;
  }

  private static createSafeContext(context: ExpressionContext): ExpressionContext {
    // Create a deep copy to prevent context mutation
    return {
      input: this.deepCopy(context.input),
      steps: this.deepCopy(context.steps),
      env: this.deepCopy(context.env),
    };
  }

  private static deepCopy(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepCopy(item));
    }
    
    const copy: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = this.deepCopy(obj[key]);
      }
    }
    return copy;
  }
}

// ============================================================================
// ANALYSIS PIPELINE
// ============================================================================

export class AnalysisPipeline {
  private pipelines = new Map<string, PipelineConfig>();
  private executionHistory = new Map<string, PipelineResult[]>();
  private readonly MAX_HISTORY_PER_PIPELINE = 100;

  constructor() {
    this.initializeDefaultPipelines();
  }

  // ============================================================================
  // PIPELINE INITIALIZATION
  // ============================================================================

  private initializeDefaultPipelines(): void {
    // Comprehensive Bill Analysis
    this.registerPipeline({
      name: 'comprehensive-bill-analysis',
      description: 'Complete analysis including trojan detection, constitutional review, and transparency scoring',
      maxConcurrency: 3,
      steps: [
        {
          id: 'trojan-detection',
          modelType: 'trojan-bill-detector',
          parallel: true,
          timeout: 45000,
        },
        {
          id: 'constitutional-analysis',
          modelType: 'constitutional-analyzer',
          parallel: true,
          timeout: 45000,
        },
        {
          id: 'transparency-scoring',
          modelType: 'transparency-scorer',
          parallel: true,
          timeout: 30000,
          inputMapping: {
            entityType: '"bill"',
            entityId: 'input.billId',
            assessmentData: 'input.transparencyData || {}',
            contextualFactors: 'input.contextualFactors || {}',
          },
        },
        {
          id: 'conflict-detection',
          modelType: 'conflict-detector',
          dependsOn: ['trojan-detection'],
          timeout: 30000,
          inputMapping: {
            billId: 'input.billId',
            billText: 'input.billText',
            billTitle: 'input.billTitle',
            sponsorId: 'input.sponsorId',
            sponsorFinancialInterests: 'input.sponsorFinancialInterests || []',
          },
        },
        {
          id: 'engagement-prediction',
          modelType: 'engagement-predictor',
          dependsOn: ['constitutional-analysis', 'trojan-detection'],
          optional: true,
          timeout: 25000,
          inputMapping: {
            contentType: '"bill"',
            contentMetadata: `{
              title: input.billTitle,
              length: input.billText.length,
              complexity: "medium",
              urgency: steps["trojan-detection"].result?.redFlags?.includes("rushed_process") ? "high" : "medium",
              topics: [steps["constitutional-analysis"].result?.citedProvisions?.[0]?.article || "general"]
            }`,
          },
        },
      ],
      outputMapping: {
        trojanAnalysis: 'steps["trojan-detection"].result',
        constitutionalAnalysis: 'steps["constitutional-analysis"].result',
        transparencyScore: 'steps["transparency-scoring"].result',
        conflictAnalysis: 'steps["conflict-detection"].result',
        engagementPrediction: 'steps["engagement-prediction"]?.result',
        overallRiskScore: '(steps["trojan-detection"].result.trojanRiskScore + (100 - steps["transparency-scoring"].result.overallScore)) / 2',
      },
    });

    // Real-time Content Processing
    this.registerPipeline({
      name: 'real-time-content-processing',
      description: 'Fast processing for user-generated content classification and moderation',
      maxConcurrency: 5,
      steps: [
        {
          id: 'content-classification',
          modelType: 'real-time-classifier',
          timeout: 10000,
          inputMapping: {
            content: 'input.content',
            classificationTasks: '["urgency_level", "sentiment_polarity", "misinformation_risk", "public_interest_level"]',
          },
        },
        {
          id: 'sentiment-analysis',
          modelType: 'sentiment-analyzer',
          parallel: true,
          timeout: 10000,
          inputMapping: {
            text: 'input.content.text',
            context: 'input.content.source',
          },
        },
        {
          id: 'engagement-prediction',
          modelType: 'engagement-predictor',
          dependsOn: ['content-classification', 'sentiment-analysis'],
          condition: 'steps["content-classification"].result?.classifications?.publicInterestLevel?.level !== "very_low"',
          optional: true,
          timeout: 15000,
          inputMapping: {
            contentType: 'input.content.source === "bill" ? "bill" : "comment"',
            contentMetadata: `{
              title: input.content.title || "",
              length: input.content.text.length,
              complexity: "medium",
              urgency: steps["content-classification"].result?.classifications?.urgencyLevel?.level || "normal",
              topics: [steps["content-classification"].result?.classifications?.topicCategory?.primary || "general"],
              sentiment: steps["sentiment-analysis"].result?.overallSentiment
            }`,
          },
        },
      ],
      outputMapping: {
        classification: 'steps["content-classification"].result',
        sentiment: 'steps["sentiment-analysis"].result',
        engagement: 'steps["engagement-prediction"]?.result',
        priority: 'this.calculateContentPriority(steps)',
      },
    });

    // Sponsor Integrity Assessment
    this.registerPipeline({
      name: 'sponsor-integrity-assessment',
      description: 'Comprehensive integrity assessment with conflict detection and influence analysis',
      maxConcurrency: 3,
      steps: [
        {
          id: 'transparency-scoring',
          modelType: 'transparency-scorer',
          timeout: 30000,
          inputMapping: {
            entityType: '"sponsor"',
            entityId: 'input.sponsorId',
            assessmentData: 'input.sponsorData',
            contextualFactors: 'input.contextualFactors || {}',
          },
        },
        {
          id: 'conflict-detection',
          modelType: 'conflict-detector',
          parallel: true,
          timeout: 30000,
          inputMapping: {
            billId: 'input.billId',
            billText: 'input.billText',
            billTitle: 'input.billTitle',
            sponsorId: 'input.sponsorId',
            sponsorFinancialInterests: 'input.sponsorFinancialInterests || []',
          },
        },
        {
          id: 'influence-analysis',
          modelType: 'influence-mapper',
          dependsOn: ['conflict-detection'],
          timeout: 45000,
          inputMapping: {
            analysisType: '"influence_prediction"',
            entities: 'input.networkEntities || []',
            relationships: 'input.networkRelationships || []',
            contextualData: `{
              timeframe: input.timeframe,
              focusEntity: input.sponsorId
            }`,
          },
        },
      ],
      outputMapping: {
        transparencyScore: 'steps["transparency-scoring"].result',
        conflicts: 'steps["conflict-detection"].result',
        influenceAnalysis: 'steps["influence-analysis"].result',
        integrityScore: 'this.calculateIntegrityScore(steps)',
        riskLevel: 'this.assessSponsorRisk(steps)',
      },
    });

    // Public Engagement Analysis
    this.registerPipeline({
      name: 'public-engagement-analysis',
      description: 'Analysis of public engagement patterns and sentiment',
      maxConcurrency: 3,
      steps: [
        {
          id: 'sentiment-analysis',
          modelType: 'sentiment-analyzer',
          timeout: 15000,
          inputMapping: {
            text: 'input.content.text',
            context: 'input.content.context',
          },
        },
        {
          id: 'engagement-prediction',
          modelType: 'engagement-predictor',
          parallel: true,
          timeout: 20000,
          inputMapping: {
            contentType: 'input.contentType',
            contentMetadata: 'input.contentMetadata',
            userProfile: 'input.userProfile',
            contextualFactors: 'input.contextualFactors || {}',
          },
        },
        {
          id: 'content-classification',
          modelType: 'real-time-classifier',
          parallel: true,
          timeout: 10000,
          inputMapping: {
            content: 'input.content',
            classificationTasks: '["topic_category", "public_interest_level", "engagement_potential"]',
          },
        },
      ],
      outputMapping: {
        sentiment: 'steps["sentiment-analysis"].result',
        engagement: 'steps["engagement-prediction"].result',
        classification: 'steps["content-classification"].result',
        publicReaction: 'this.analyzePublicReaction(steps)',
      },
    });
  }

  // ============================================================================
  // PIPELINE EXECUTION
  // ============================================================================

  async executePipeline(input: PipelineInput): Promise<PipelineResult> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    
    try {
      const validatedInput = PipelineInputSchema.parse(input);
      
      const pipeline = this.pipelines.get(validatedInput.pipelineId);
      if (!pipeline) {
        throw new Error(`Pipeline '${validatedInput.pipelineId}' not found`);
      }

      // Validate pipeline structure
      this.validatePipelineStructure(pipeline);

      const result = await this.executeSteps(
        pipeline,
        validatedInput.input,
        validatedInput.options,
        executionId
      );

      // Store execution history
      this.storeExecutionHistory(validatedInput.pipelineId, result);

      return result;

    } catch (error) {
      const errorResult: PipelineResult = {
        success: false,
        results: {},
        stepResults: [],
        totalProcessingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          pipelineId: input.pipelineId,
          executionId,
          timestamp: new Date().toISOString(),
          stepsExecuted: 0,
          stepsSkipped: 0,
          stepsFailed: 0,
        },
      };

      this.storeExecutionHistory(input.pipelineId, errorResult);
      return errorResult;
    }
  }

  private async executeSteps(
    pipeline: PipelineConfig,
    input: any,
    options: any,
    executionId: string
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    const stepOutputs: Record<string, StepResult> = {};
    const executedSteps = new Set<string>();
    let stepsSkipped = 0;
    let stepsFailed = 0;

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(pipeline.steps);
    
    // Execute steps in dependency order
    while (executedSteps.size < pipeline.steps.length) {
      const readySteps = this.getReadySteps(
        pipeline.steps,
        executedSteps,
        dependencyGraph
      );

      if (readySteps.length === 0) {
        const remainingSteps = pipeline.steps.filter(s => !executedSteps.has(s.id));
        if (remainingSteps.length > 0) {
          throw new Error(`Circular dependency or unmet dependencies detected for steps: ${remainingSteps.map(s => s.id).join(', ')}`);
        }
        break;
      }

      // Execute ready steps (respecting max concurrency)
      const stepBatches = this.createStepBatches(
        readySteps,
        pipeline.maxConcurrency
      );

      for (const batch of stepBatches) {
        const batchResults = await Promise.allSettled(
          batch.map(step =>
            this.executeStep(step, input, stepOutputs, options)
          )
        );

        for (let i = 0; i < batch.length; i++) {
          const step = batch[i];
          const result = batchResults[i];

          if (result.status === 'fulfilled') {
            const stepResult = result.value;
            stepResults.push(stepResult);
            stepOutputs[step.id] = stepResult;
            executedSteps.add(step.id);

            if (stepResult.skipped) {
              stepsSkipped++;
            } else if (!stepResult.success) {
              stepsFailed++;
              if (!options?.continueOnError && !step.optional) {
                throw new Error(`Critical step '${step.id}' failed: ${stepResult.error}`);
              }
            }
          } else {
            const errorResult: StepResult = {
              stepId: step.id,
              success: false,
              error: result.reason?.message || 'Unknown error',
              processingTime: 0,
            };
            stepResults.push(errorResult);
            stepsFailed++;

            if (!options?.continueOnError && !step.optional) {
              throw new Error(`Step '${step.id}' failed: ${errorResult.error}`);
            }
            executedSteps.add(step.id);
          }
        }
      }
    }

    // Generate final output
    const results = this.generateFinalOutput(pipeline, stepOutputs, input);

    return {
      success: stepsFailed === 0 || options?.continueOnError,
      results,
      stepResults,
      totalProcessingTime: Date.now() - startTime,
      metadata: {
        pipelineId: pipeline.name,
        executionId,
        timestamp: new Date().toISOString(),
        stepsExecuted: executedSteps.size,
        stepsSkipped,
        stepsFailed,
      },
    };
  }

  private async executeStep(
    step: PipelineStep,
    pipelineInput: any,
    stepOutputs: Record<string, StepResult>,
    options?: any
  ): Promise<StepResult> {
    const stepStartTime = Date.now();
    
    try {
      // Check condition if specified
      if (step.condition) {
        const context: ExpressionContext = {
          input: pipelineInput,
          steps: stepOutputs,
          env: {},
        };
        
        const conditionResult = SafeExpressionEvaluator.evaluate(
          step.condition,
          context
        );
        
        if (!conditionResult) {
          return {
            stepId: step.id,
            success: true,
            result: null,
            processingTime: Date.now() - stepStartTime,
            skipped: true,
          };
        }
      }

      // Map inputs
      const modelInput = this.mapInputs(step.inputMapping, pipelineInput, stepOutputs);
      
      // Execute model
      const mlRequest: MLRequest = {
        modelType: step.modelType,
        input: modelInput,
        options: {
          priority: 'normal',
          cacheResults: !options?.skipCache,
          timeout: step.timeout || options?.timeout || 30000,
          async: false,
          retryOnFailure: true,
          maxRetries: 2,
        },
      };

      const response = await mlOrchestrator.processRequest(mlRequest);
      
      if (!response.success) {
        throw new Error(response.error || 'Model execution failed');
      }

      return {
        stepId: step.id,
        success: true,
        result: response.result,
        processingTime: Date.now() - stepStartTime,
        cached: response.metadata.cached,
      };

    } catch (error) {
      return {
        stepId: step.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - stepStartTime,
      };
    }
  }

  // ============================================================================
  // DEPENDENCY MANAGEMENT
  // ============================================================================

  private buildDependencyGraph(steps: PipelineStep[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();
    
    for (const step of steps) {
      graph.set(step.id, new Set(step.dependsOn || []));
    }
    
    return graph;
  }

  private getReadySteps(
    steps: PipelineStep[],
    executedSteps: Set<string>,
    dependencyGraph: Map<string, Set<string>>
  ): PipelineStep[] {
    return steps.filter(step => {
      if (executedSteps.has(step.id)) return false;
      
      const dependencies = dependencyGraph.get(step.id) || new Set();
      return Array.from(dependencies).every(dep => executedSteps.has(dep));
    });
  }

  private createStepBatches(
    steps: PipelineStep[],
    maxConcurrency: number
  ): PipelineStep[][] {
    const parallelSteps = steps.filter(s => s.parallel);
    const sequentialSteps = steps.filter(s => !s.parallel);

    const batches: PipelineStep[][] = [];

    // Add parallel steps in batches
    for (let i = 0; i < parallelSteps.length; i += maxConcurrency) {
      batches.push(parallelSteps.slice(i, i + maxConcurrency));
    }

    // Add sequential steps one at a time
    for (const step of sequentialSteps) {
      batches.push([step]);
    }

    return batches;
  }

  private validatePipelineStructure(pipeline: PipelineConfig): void {
    const stepIds = new Set(pipeline.steps.map(s => s.id));
    
    // Check for duplicate step IDs
    if (stepIds.size !== pipeline.steps.length) {
      throw new Error('Duplicate step IDs found in pipeline');
    }
    
    // Check for invalid dependencies
    for (const step of pipeline.steps) {
      for (const dep of step.dependsOn || []) {
        if (!stepIds.has(dep)) {
          throw new Error(`Step '${step.id}' depends on non-existent step '${dep}'`);
        }
      }
    }
    
    // Check for circular dependencies
    this.detectCircularDependencies(pipeline.steps);
  }

  private detectCircularDependencies(steps: PipelineStep[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const hasCycle = (stepId: string, graph: Map<string, string[]>): boolean => {
      visited.add(stepId);
      recursionStack.add(stepId);
      
      const dependencies = graph.get(stepId) || [];
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (hasCycle(dep, graph)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }
      
      recursionStack.delete(stepId);
      return false;
    };
    
    const graph = new Map<string, string[]>();
    for (const step of steps) {
      graph.set(step.id, step.dependsOn || []);
    }
    
    for (const step of steps) {
      if (!visited.has(step.id)) {
        if (hasCycle(step.id, graph)) {
          throw new Error('Circular dependency detected in pipeline');
        }
      }
    }
  }

  // ============================================================================
  // INPUT/OUTPUT MAPPING
  // ============================================================================

  private mapInputs(
    inputMapping: Record<string, string> | undefined,
    pipelineInput: any,
    stepOutputs: Record<string, StepResult>
  ): any {
    if (!inputMapping) {
      return pipelineInput;
    }

    const mappedInput: any = {};
    const context: ExpressionContext = {
      input: pipelineInput,
      steps: stepOutputs,
      env: {},
    };
    
    for (const [key, expression] of Object.entries(inputMapping)) {
      try {
        mappedInput[key] = SafeExpressionEvaluator.evaluate(expression, context);
      } catch (error) {
        console.warn(`Failed to map input '${key}':`, error);
        mappedInput[key] = null;
      }
    }

    return mappedInput;
  }

  private generateFinalOutput(
    pipeline: PipelineConfig,
    stepOutputs: Record<string, StepResult>,
    pipelineInput: any
  ): Record<string, unknown> {
    if (!pipeline.outputMapping) {
      // Return all step results if no output mapping specified
      const results: Record<string, unknown> = {};
      for (const [stepId, stepResult] of Object.entries(stepOutputs)) {
        results[stepId] = stepResult.result;
      }
      return results;
    }

    const finalOutput: Record<string, unknown> = {};
    const context: ExpressionContext = {
      input: pipelineInput,
      steps: stepOutputs,
      env: { this: this }, // Allow calling helper methods
    };
    
    for (const [key, expression] of Object.entries(pipeline.outputMapping)) {
      try {
        // Special handling for helper method calls
        if (expression.startsWith('this.')) {
          const methodName = expression.match(/this\.(\w+)/)?.[1];
          if (methodName && typeof (this as any)[methodName] === 'function') {
            finalOutput[key] = (this as any)[methodName](stepOutputs);
          } else {
            finalOutput[key] = SafeExpressionEvaluator.evaluate(expression, context);
          }
        } else {
          finalOutput[key] = SafeExpressionEvaluator.evaluate(expression, context);
        }
      } catch (error) {
        console.warn(`Failed to generate output '${key}':`, error);
        finalOutput[key] = null;
      }
    }

    return finalOutput;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private calculateContentPriority(steps: Record<string, StepResult>): number {
    let priority = 50;
    
    const classification = steps['content-classification']?.result?.classifications;
    const engagement = steps['engagement-prediction']?.result;
    
    if (classification?.urgencyLevel?.level === 'critical') priority += 30;
    else if (classification?.urgencyLevel?.level === 'high') priority += 20;
    
    if (classification?.publicInterestLevel?.level === 'very_high') priority += 20;
    else if (classification?.publicInterestLevel?.level === 'high') priority += 10;
    
    if (engagement?.engagementScore > 80) priority += 15;
    else if (engagement?.engagementScore > 60) priority += 10;
    
    return Math.min(100, Math.max(0, priority));
  }

  private calculateIntegrityScore(steps: Record<string, StepResult>): number {
    const transparency = steps['transparency-scoring']?.result?.overallScore || 0;
    const conflictScore = steps['conflict-detection']?.result?.conflictScore || 0;
    const corruptionRisk = steps['influence-analysis']?.result?.riskAssessment?.corruptionRisk || 0;
    
    return Math.max(0, Math.min(100, transparency - conflictScore - (corruptionRisk / 2)));
  }

  private assessSponsorRisk(steps: Record<string, StepResult>): string {
    const integrityScore = this.calculateIntegrityScore(steps);
    
    if (integrityScore < 30) return 'high';
    if (integrityScore < 60) return 'medium';
    return 'low';
  }

  private analyzePublicReaction(steps: Record<string, StepResult>): any {
    const sentiment = steps['sentiment-analysis']?.result;
    const engagement = steps['engagement-prediction']?.result;
    
    return {
      overallSentiment: sentiment?.overallSentiment || 'neutral',
      engagementLevel: engagement?.engagementScore > 70 ? 'high' : engagement?.engagementScore > 40 ? 'moderate' : 'low',
      predictedReach: (engagement?.predictions?.shareProbability || 0) * 1000,
      viralPotential: engagement?.engagementScore > 80 ? 'high' : engagement?.engagementScore > 60 ? 'moderate' : 'low',
    };
  }

  // ============================================================================
  // PIPELINE MANAGEMENT
  // ============================================================================

  registerPipeline(config: PipelineConfig): void {
    const validatedConfig = PipelineConfigSchema.parse(config);
    this.validatePipelineStructure(validatedConfig);
    this.pipelines.set(validatedConfig.name, validatedConfig);
  }

  getPipelineConfig(pipelineId: string): PipelineConfig | null {
    return this.pipelines.get(pipelineId) || null;
  }

  getAvailablePipelines(): Array<{id: string; name: string; description: string}> {
    return Array.from(this.pipelines.entries()).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
    }));
  }

  deletePipeline(pipelineId: string): boolean {
    return this.pipelines.delete(pipelineId);
  }

  // ============================================================================
  // EXECUTION HISTORY
  // ============================================================================

  private storeExecutionHistory(pipelineId: string, result: PipelineResult): void {
    const history = this.executionHistory.get(pipelineId) || [];
    history.push(result);
    
    // Keep only recent executions
    if (history.length > this.MAX_HISTORY_PER_PIPELINE) {
      history.shift();
    }
    
    this.executionHistory.set(pipelineId, history);
  }

  getExecutionHistory(pipelineId: string, limit = 10): PipelineResult[] {
    const history = this.executionHistory.get(pipelineId) || [];
    return history.slice(-limit);
  }

  clearExecutionHistory(pipelineId?: string): void {
    if (pipelineId) {
      this.executionHistory.delete(pipelineId);
    } else {
      this.executionHistory.clear();
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const analysisPipeline = new AnalysisPipeline();
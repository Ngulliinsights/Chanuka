// ============================================================================
// ANALYSIS PIPELINE - Automated ML Analysis Workflows
// ============================================================================
// Orchestrates complex analysis workflows combining multiple ML models

import { z } from 'zod';
import { mlOrchestrator, type MLRequest } from './ml-orchestrator';

export const PipelineConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  steps: z.array(z.object({
    id: z.string(),
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
    dependsOn: z.array(z.string()).optional(), // Step IDs this step depends on
    condition: z.string().optional(), // JavaScript condition to evaluate
    inputMapping: z.record(z.string()).optional(), // Map previous step outputs to inputs
    parallel: z.boolean().default(false),
  })),
  outputMapping: z.record(z.string()).optional(), // Map step outputs to final output
});

export const PipelineInputSchema = z.object({
  pipelineId: z.string(),
  input: z.any(),
  options: z.object({
    skipCache: z.boolean().default(false),
    timeout: z.number().default(120000), // 2 minutes
    continueOnError: z.boolean().default(false),
  }).optional(),
});

export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
export type PipelineInput = z.infer<typeof PipelineInputSchema>;

interface StepResult {
  stepId: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
}

interface PipelineResult {
  success: boolean;
  results: Record<string, any>;
  stepResults: StepResult[];
  totalProcessingTime: number;
  error?: string;
}

export class AnalysisPipeline {
  private pipelines = new Map<string, PipelineConfig>();

  constructor() {
    this.initializeDefaultPipelines();
  }

  private initializeDefaultPipelines() {
    // Comprehensive Bill Analysis Pipeline
    this.registerPipeline({
      name: 'comprehensive-bill-analysis',
      description: 'Complete analysis of a bill including trojan detection, constitutional review, and transparency scoring',
      steps: [
        {
          id: 'trojan-detection',
          modelType: 'trojan-bill-detector',
          parallel: true,
        },
        {
          id: 'constitutional-analysis',
          modelType: 'constitutional-analyzer',
          parallel: true,
        },
        {
          id: 'transparency-scoring',
          modelType: 'transparency-scorer',
          parallel: true,
          inputMapping: {
            entityType: '"bill"',
            entityId: 'input.billId',
            assessmentData: 'input.transparencyData',
            contextualFactors: 'input.contextualFactors',
          },
        },
        {
          id: 'conflict-detection',
          modelType: 'conflict-detector',
          dependsOn: ['trojan-detection'],
          inputMapping: {
            billId: 'input.billId',
            billText: 'input.billText',
            billTitle: 'input.billTitle',
            sponsorId: 'input.sponsorId',
            sponsorFinancialInterests: 'input.sponsorFinancialInterests',
          },
        },
        {
          id: 'engagement-prediction',
          modelType: 'engagement-predictor',
          dependsOn: ['constitutional-analysis', 'trojan-detection'],
          inputMapping: {
            contentType: '"bill"',
            contentMetadata: '{title: input.billTitle, length: input.billText.length, complexity: "medium", urgency: steps["trojan-detection"].result.redFlags.includes("rushed_process") ? "high" : "medium", topics: [steps["constitutional-analysis"].result.citedProvisions[0]?.article || "general"]}',
          },
        },
      ],
      outputMapping: {
        trojanAnalysis: 'steps["trojan-detection"].result',
        constitutionalAnalysis: 'steps["constitutional-analysis"].result',
        transparencyScore: 'steps["transparency-scoring"].result',
        conflictAnalysis: 'steps["conflict-detection"].result',
        engagementPrediction: 'steps["engagement-prediction"].result',
        overallRiskScore: '(steps["trojan-detection"].result.trojanRiskScore + (100 - steps["transparency-scoring"].result.overallScore)) / 2',
        recommendedActions: 'this.generateBillRecommendations(steps)',
      },
    });

    // Real-time Content Processing Pipeline
    this.registerPipeline({
      name: 'real-time-content-processing',
      description: 'Real-time processing of user-generated content for classification and moderation',
      steps: [
        {
          id: 'content-classification',
          modelType: 'real-time-classifier',
          inputMapping: {
            content: 'input.content',
            classificationTasks: '["urgency_level", "sentiment_polarity", "misinformation_risk", "public_interest_level"]',
          },
        },
        {
          id: 'sentiment-analysis',
          modelType: 'sentiment-analyzer',
          parallel: true,
          inputMapping: {
            text: 'input.content.text',
            context: 'input.content.source',
          },
        },
        {
          id: 'engagement-prediction',
          modelType: 'engagement-predictor',
          dependsOn: ['content-classification', 'sentiment-analysis'],
          condition: 'steps["content-classification"].result.classifications.publicInterestLevel?.level !== "very_low"',
          inputMapping: {
            contentType: 'input.content.source === "bill" ? "bill" : "comment"',
            contentMetadata: '{title: input.content.title || "", length: input.content.text.length, complexity: "medium", urgency: steps["content-classification"].result.classifications.urgencyLevel?.level || "normal", topics: [steps["content-classification"].result.classifications.topicCategory?.primary || "general"], sentiment: steps["sentiment-analysis"].result.overallSentiment}',
          },
        },
      ],
      outputMapping: {
        classification: 'steps["content-classification"].result',
        sentiment: 'steps["sentiment-analysis"].result',
        engagement: 'steps["engagement-prediction"]?.result',
        moderationAction: 'this.determineModerationAction(steps)',
        priority: 'this.calculateContentPriority(steps)',
      },
    });

    // Sponsor Integrity Assessment Pipeline
    this.registerPipeline({
      name: 'sponsor-integrity-assessment',
      description: 'Comprehensive assessment of sponsor integrity including conflict detection and transparency scoring',
      steps: [
        {
          id: 'transparency-scoring',
          modelType: 'transparency-scorer',
          inputMapping: {
            entityType: '"sponsor"',
            entityId: 'input.sponsorId',
            assessmentData: 'input.sponsorData',
            contextualFactors: 'input.contextualFactors',
          },
        },
        {
          id: 'conflict-detection',
          modelType: 'conflict-detector',
          parallel: true,
          inputMapping: {
            billId: 'input.billId',
            billText: 'input.billText',
            billTitle: 'input.billTitle',
            sponsorId: 'input.sponsorId',
            sponsorFinancialInterests: 'input.sponsorFinancialInterests',
          },
        },
        {
          id: 'influence-analysis',
          modelType: 'influence-mapper',
          dependsOn: ['conflict-detection'],
          inputMapping: {
            analysisType: '"influence_prediction"',
            entities: 'input.networkEntities',
            relationships: 'input.networkRelationships',
            contextualData: '{timeframe: input.timeframe, focusEntity: input.sponsorId}',
          },
        },
      ],
      outputMapping: {
        transparencyScore: 'steps["transparency-scoring"].result',
        conflicts: 'steps["conflict-detection"].result',
        influenceAnalysis: 'steps["influence-analysis"].result',
        integrityScore: 'this.calculateIntegrityScore(steps)',
        riskLevel: 'this.assessSponsorRisk(steps)',
        recommendations: 'this.generateSponsorRecommendations(steps)',
      },
    });

    // Public Engagement Analysis Pipeline
    this.registerPipeline({
      name: 'public-engagement-analysis',
      description: 'Analysis of public engagement patterns and sentiment around political content',
      steps: [
        {
          id: 'sentiment-analysis',
          modelType: 'sentiment-analyzer',
          inputMapping: {
            text: 'input.content.text',
            context: 'input.content.context',
          },
        },
        {
          id: 'engagement-prediction',
          modelType: 'engagement-predictor',
          parallel: true,
          inputMapping: {
            contentType: 'input.contentType',
            contentMetadata: 'input.contentMetadata',
            userProfile: 'input.userProfile',
            contextualFactors: 'input.contextualFactors',
          },
        },
        {
          id: 'content-classification',
          modelType: 'real-time-classifier',
          parallel: true,
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
        engagementStrategy: 'this.recommendEngagementStrategy(steps)',
      },
    });
  }

  registerPipeline(config: PipelineConfig): void {
    const validatedConfig = PipelineConfigSchema.parse(config);
    this.pipelines.set(validatedConfig.name, validatedConfig);
  }

  async executePipeline(input: PipelineInput): Promise<PipelineResult> {
    const startTime = Date.now();
    const validatedInput = PipelineInputSchema.parse(input);
    
    const pipeline = this.pipelines.get(validatedInput.pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${validatedInput.pipelineId} not found`);
    }

    try {
      const stepResults: StepResult[] = [];
      const stepOutputs: Record<string, any> = {};
      const executedSteps = new Set<string>();
      
      // Execute steps in dependency order
      while (executedSteps.size < pipeline.steps.length) {
        const readySteps = pipeline.steps.filter(step => 
          !executedSteps.has(step.id) &&
          (step.dependsOn || []).every(dep => executedSteps.has(dep))
        );

        if (readySteps.length === 0) {
          throw new Error('Circular dependency detected in pipeline steps');
        }

        // Group parallel steps
        const parallelSteps = readySteps.filter(step => step.parallel);
        const sequentialSteps = readySteps.filter(step => !step.parallel);

        // Execute parallel steps
        if (parallelSteps.length > 0) {
          const parallelPromises = parallelSteps.map(step => 
            this.executeStep(step, validatedInput.input, stepOutputs, validatedInput.options)
          );
          
          const parallelResults = await Promise.allSettled(parallelPromises);
          
          for (let i = 0; i < parallelSteps.length; i++) {
            const step = parallelSteps[i];
            const result = parallelResults[i];
            
            if (result.status === 'fulfilled') {
              stepResults.push(result.value);
              stepOutputs[step.id] = result.value;
              executedSteps.add(step.id);
            } else {
              const errorResult: StepResult = {
                stepId: step.id,
                success: false,
                error: result.reason?.message || 'Unknown error',
                processingTime: 0,
              };
              stepResults.push(errorResult);
              
              if (!validatedInput.options?.continueOnError) {
                throw new Error(`Step ${step.id} failed: ${errorResult.error}`);
              }
            }
          }
        }

        // Execute sequential steps
        for (const step of sequentialSteps) {
          try {
            const result = await this.executeStep(step, validatedInput.input, stepOutputs, validatedInput.options);
            stepResults.push(result);
            stepOutputs[step.id] = result;
            executedSteps.add(step.id);
          } catch (error) {
            const errorResult: StepResult = {
              stepId: step.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              processingTime: 0,
            };
            stepResults.push(errorResult);
            
            if (!validatedInput.options?.continueOnError) {
              throw error;
            }
          }
        }
      }

      // Generate final output
      const results = this.generateFinalOutput(pipeline, stepOutputs, validatedInput.input);
      
      return {
        success: true,
        results,
        stepResults,
        totalProcessingTime: Date.now() - startTime,
      };

    } catch (error) {
      return {
        success: false,
        results: {},
        stepResults: [],
        totalProcessingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeStep(
    step: any,
    pipelineInput: any,
    stepOutputs: Record<string, any>,
    options?: any
  ): Promise<StepResult> {
    const stepStartTime = Date.now();
    
    try {
      // Check condition if specified
      if (step.condition) {
        const conditionResult = this.evaluateCondition(step.condition, pipelineInput, stepOutputs);
        if (!conditionResult) {
          return {
            stepId: step.id,
            success: true,
            result: null,
            processingTime: Date.now() - stepStartTime,
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
          timeout: options?.timeout || 30000,
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

  private mapInputs(
    inputMapping: Record<string, string> | undefined,
    pipelineInput: any,
    stepOutputs: Record<string, any>
  ): any {
    if (!inputMapping) {
      return pipelineInput;
    }

    const mappedInput: any = {};
    
    for (const [key, expression] of Object.entries(inputMapping)) {
      try {
        mappedInput[key] = this.evaluateExpression(expression, pipelineInput, stepOutputs);
      } catch (error) {
        console.warn(`Failed to map input ${key}:`, error);
        mappedInput[key] = null;
      }
    }

    return mappedInput;
  }

  private evaluateExpression(expression: string, input: any, steps: Record<string, any>): any {
    // Simple expression evaluator - in production, use a proper expression engine
    try {
      // Create evaluation context
      const context = {
        input,
        steps,
        this: this, // Allow calling helper methods
      };

      // Simple string literal check
      if (expression.startsWith('"') && expression.endsWith('"')) {
        return expression.slice(1, -1);
      }

      // Simple object literal check
      if (expression.startsWith('{') && expression.endsWith('}')) {
        return Function(`"use strict"; const {input, steps} = arguments[0]; return (${expression});`)(context);
      }

      // Simple array literal check
      if (expression.startsWith('[') && expression.endsWith(']')) {
        return Function(`"use strict"; const {input, steps} = arguments[0]; return (${expression});`)(context);
      }

      // Property access
      return Function(`"use strict"; const {input, steps} = arguments[0]; return (${expression});`)(context);
    } catch (error) {
      console.warn(`Expression evaluation failed: ${expression}`, error);
      return null;
    }
  }

  private evaluateCondition(condition: string, input: any, steps: Record<string, any>): boolean {
    try {
      const context = { input, steps };
      return Function(`"use strict"; const {input, steps} = arguments[0]; return (${condition});`)(context);
    } catch (error) {
      console.warn(`Condition evaluation failed: ${condition}`, error);
      return false;
    }
  }

  private generateFinalOutput(
    pipeline: PipelineConfig,
    stepOutputs: Record<string, any>,
    pipelineInput: any
  ): Record<string, any> {
    if (!pipeline.outputMapping) {
      return stepOutputs;
    }

    const finalOutput: Record<string, any> = {};
    
    for (const [key, expression] of Object.entries(pipeline.outputMapping)) {
      try {
        finalOutput[key] = this.evaluateExpression(expression, pipelineInput, stepOutputs);
      } catch (error) {
        console.warn(`Failed to generate output ${key}:`, error);
        finalOutput[key] = null;
      }
    }

    return finalOutput;
  }

  // Helper methods for output mapping
  generateBillRecommendations(steps: Record<string, any>): string[] {
    const recommendations = [];
    
    if (steps['trojan-detection']?.result?.trojanRiskScore > 70) {
      recommendations.push('High trojan risk detected - requires expert review');
    }
    
    if (steps['constitutional-analysis']?.result?.alignment === 'violates') {
      recommendations.push('Constitutional violations detected - legal review required');
    }
    
    if (steps['transparency-scoring']?.result?.overallScore < 50) {
      recommendations.push('Low transparency score - improve public disclosure');
    }
    
    if (steps['conflict-detection']?.result?.hasConflict) {
      recommendations.push('Conflicts of interest detected - sponsor should disclose or recuse');
    }
    
    return recommendations;
  }

  determineModerationAction(steps: Record<string, any>): string {
    const classification = steps['content-classification']?.result?.classifications;
    
    if (classification?.misinformationRisk?.riskLevel === 'very_high') {
      return 'flag_for_review';
    }
    
    if (classification?.urgencyLevel?.level === 'emergency') {
      return 'escalate_immediately';
    }
    
    if (steps['sentiment-analysis']?.result?.toxicity?.isToxic) {
      return 'moderate_content';
    }
    
    return 'no_action';
  }

  calculateContentPriority(steps: Record<string, any>): number {
    let priority = 50; // Base priority
    
    const classification = steps['content-classification']?.result?.classifications;
    const engagement = steps['engagement-prediction']?.result;
    
    if (classification?.urgencyLevel?.level === 'critical') priority += 30;
    if (classification?.publicInterestLevel?.level === 'very_high') priority += 20;
    if (engagement?.engagementScore > 80) priority += 15;
    
    return Math.min(100, priority);
  }

  calculateIntegrityScore(steps: Record<string, any>): number {
    const transparency = steps['transparency-scoring']?.result?.overallScore || 0;
    const conflicts = steps['conflict-detection']?.result?.conflictScore || 0;
    const influence = steps['influence-analysis']?.result?.riskAssessment?.corruptionRisk || 0;
    
    return Math.max(0, transparency - conflicts - (influence / 2));
  }

  assessSponsorRisk(steps: Record<string, any>): string {
    const integrityScore = this.calculateIntegrityScore(steps);
    
    if (integrityScore < 30) return 'high';
    if (integrityScore < 60) return 'medium';
    return 'low';
  }

  generateSponsorRecommendations(steps: Record<string, any>): string[] {
    const recommendations = [];
    const riskLevel = this.assessSponsorRisk(steps);
    
    if (riskLevel === 'high') {
      recommendations.push('Enhanced monitoring required');
      recommendations.push('Full financial disclosure audit recommended');
    }
    
    if (steps['conflict-detection']?.result?.hasConflict) {
      recommendations.push('Address identified conflicts of interest');
    }
    
    if (steps['transparency-scoring']?.result?.overallScore < 70) {
      recommendations.push('Improve transparency and public disclosure');
    }
    
    return recommendations;
  }

  analyzePublicReaction(steps: Record<string, any>): any {
    const sentiment = steps['sentiment-analysis']?.result;
    const engagement = steps['engagement-prediction']?.result;
    
    return {
      overallSentiment: sentiment?.overallSentiment || 'neutral',
      engagementLevel: engagement?.engagementScore > 70 ? 'high' : 'moderate',
      predictedReach: engagement?.predictions?.shareProbability * 1000 || 0,
    };
  }

  recommendEngagementStrategy(steps: Record<string, any>): any {
    const engagement = steps['engagement-prediction']?.result;
    const classification = steps['content-classification']?.result;
    
    return {
      recommendedFormat: engagement?.recommendations?.recommendedFormat || 'full',
      optimalTiming: engagement?.recommendations?.optimalDeliveryTime,
      targetAudience: classification?.classifications?.topicCategory?.primary || 'general',
    };
  }

  // Get available pipelines
  getAvailablePipelines(): Array<{id: string, name: string, description: string}> {
    return Array.from(this.pipelines.entries()).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
    }));
  }

  // Get pipeline configuration
  getPipelineConfig(pipelineId: string): PipelineConfig | null {
    return this.pipelines.get(pipelineId) || null;
  }
}

// Singleton instance
export const analysisPipeline = new AnalysisPipeline();
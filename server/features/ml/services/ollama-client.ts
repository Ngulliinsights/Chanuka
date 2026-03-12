/**
 * Ollama Client
 * 
 * Communicates with Ollama for local LLM inference (Tier 3 analysis).
 * Uses Llama 3.2 for plain-language explanations and strategic insights.
 */

import { MWANGA_CONFIG } from '../config/mwanga-config';
import { logger } from '@server/infrastructure/observability';

// ============================================================================
// Types
// ============================================================================

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
}

// ============================================================================
// Ollama Client
// ============================================================================

export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor() {
    this.baseUrl = MWANGA_CONFIG.services?.ollama?.baseUrl || 'http://localhost:11434';
    this.model = MWANGA_CONFIG.services?.ollama?.model || 'llama3.2';
    this.timeout = MWANGA_CONFIG.services?.ollama?.timeout || 30000;
  }

  /**
   * Check if Ollama is healthy and model is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const models = data.models || [];
      
      // Check if our model is available
      return models.some((m: OllamaModel) => m.name.startsWith(this.model));
    } catch (error) {
      logger.error({ component: 'OllamaClient', error }, 'Ollama health check failed');
      return false;
    }
  }

  /**
   * Generate text using Ollama
   */
  async generate(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<string> {
    try {
      const request: OllamaGenerateRequest = {
        model: this.model,
        prompt,
        stream: options?.stream || false,
        options: {
          temperature: options?.temperature || 0.7,
          num_predict: options?.maxTokens || 500,
        },
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data: OllamaGenerateResponse = await response.json();
      return data.response;
    } catch (error) {
      logger.error({ component: 'OllamaClient', error }, 'Ollama generation failed');
      throw new Error(`Failed to generate with Ollama: ${error}`);
    }
  }

  /**
   * Generate JSON response using Ollama
   * Useful for structured outputs
   */
  async generateJSON<T = any>(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<T> {
    try {
      const enhancedPrompt = `${prompt}\n\nRespond with valid JSON only. Do not include any explanatory text.`;
      
      const response = await this.generate(enhancedPrompt, options);
      
      // Extract JSON from response (handle cases where LLM adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error({ component: 'OllamaClient', error }, 'Ollama JSON generation failed');
      throw new Error(`Failed to generate JSON with Ollama: ${error}`);
    }
  }

  /**
   * Generate plain-language explanation
   * Optimized for Kenyan context
   */
  async generatePlainLanguage(
    content: string,
    context: {
      audience?: 'general_public' | 'activists' | 'experts';
      maxWords?: number;
      includeSwahili?: boolean;
    } = {}
  ): Promise<string> {
    const audience = context.audience || 'general_public';
    const maxWords = context.maxWords || 200;

    const prompt = `You are a Kenyan civic educator. Explain this content in plain language for ${audience}.

Content:
${content}

Requirements:
1. Use simple, everyday language (avoid jargon)
2. Use Kenyan context and examples
3. Keep sentences short (max 20 words)
4. Use active voice
5. Maximum ${maxWords} words
${context.includeSwahili ? '6. Include key terms in Swahili' : ''}

Provide a clear, accessible explanation:`;

    return this.generate(prompt, {
      temperature: 0.7,
      maxTokens: maxWords * 2, // Allow some buffer
    });
  }

  /**
   * Generate strategic analysis
   * For complex political/legal analysis
   */
  async generateStrategicAnalysis(
    data: any,
    analysisType: 'conflict' | 'transparency' | 'accountability' | 'influence'
  ): Promise<string> {
    const prompts = {
      conflict: `You are a Kenyan anti-corruption analyst. Analyze this conflict-of-interest data and provide strategic insights.`,
      transparency: `You are a Kenyan governance expert. Analyze this transparency assessment and provide strategic recommendations.`,
      accountability: `You are a Kenyan electoral strategist. Analyze this accountability gap and predict electoral consequences.`,
      influence: `You are a Kenyan political analyst. Analyze this influence network and expose hidden power structures.`,
    };

    const prompt = `${prompts[analysisType]}

Data:
${JSON.stringify(data, null, 2)}

Provide:
1. Key findings (3-5 points)
2. Strategic implications
3. Actionable recommendations
4. Plain-English summary for citizens

Keep it under 300 words, focused on actionable insights for Kenyan citizens.`;

    return this.generate(prompt, {
      temperature: 0.8,
      maxTokens: 600,
    });
  }

  /**
   * List available models
   */
  async listModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models || [];
    } catch (error) {
      logger.error({ component: 'OllamaClient', error }, 'Failed to list Ollama models');
      throw new Error(`Failed to list models: ${error}`);
    }
  }

  /**
   * Pull a model (download if not available)
   */
  async pullModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(300000), // 5 minutes for download
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      logger.info({ component: 'OllamaClient', modelName }, 'Model pulled successfully');
    } catch (error) {
      logger.error({ component: 'OllamaClient', error }, 'Failed to pull Ollama model');
      throw new Error(`Failed to pull model: ${error}`);
    }
  }
}

// Export singleton instance
export const ollamaClient = new OllamaClient();

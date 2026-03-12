/**
 * Python Service Client
 * 
 * Communicates with the Python microservice for ML/AI operations:
 * - Sentiment analysis (HuggingFace RoBERTa)
 * - Constitutional RAG (ChromaDB)
 * - NLP analysis (spaCy)
 * - Graph analysis (NetworkX)
 */

import { MWANGA_CONFIG } from '../config/mwanga-config';
import { logger } from '@server/infrastructure/observability';

// ============================================================================
// Types
// ============================================================================

export interface SentimentAnalysisRequest {
  text: string;
  language?: 'en' | 'sw';
}

export interface SentimentAnalysisResponse {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  scores: {
    positive: number;
    neutral: number;
    negative: number;
  };
  language: string;
}

export interface ConstitutionalQueryRequest {
  text: string;
  n_results?: number;
}

export interface ConstitutionalQueryResponse {
  relevant_articles: Array<{
    article: string;
    title: string;
    text: string;
    similarity: number;
  }>;
  similarity_scores: number[];
}

export interface SpacyAnalysisRequest {
  text: string;
}

export interface SpacyAnalysisResponse {
  entities: Array<{ text: string; label: string }>;
  sentences: string[];
  tokens: Array<{ text: string; pos: string }>;
}

export interface GraphAnalysisRequest {
  nodes: Array<{ id: string; [key: string]: any }>;
  edges: Array<{ source: string; target: string; [key: string]: any }>;
  source_id: string;
  target_id?: string;
}

export interface GraphAnalysisResponse {
  has_path: boolean;
  path?: string[];
  centrality: {
    degree: number;
    betweenness: number;
    closeness: number;
  };
}

// ============================================================================
// Python Service Client
// ============================================================================

export class PythonServiceClient {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = MWANGA_CONFIG.services?.pythonService?.baseUrl || 'http://localhost:8001';
    this.timeout = MWANGA_CONFIG.services?.pythonService?.timeout || 10000;
  }

  /**
   * Check if Python service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      logger.error({ component: 'PythonServiceClient', error }, 'Python service health check failed');
      return false;
    }
  }

  /**
   * Analyze sentiment using HuggingFace RoBERTa
   */
  async analyzeSentiment(
    request: SentimentAnalysisRequest
  ): Promise<SentimentAnalysisResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sentiment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Python service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error({ component: 'PythonServiceClient', error }, 'Sentiment analysis failed');
      throw new Error(`Failed to analyze sentiment: ${error}`);
    }
  }

  /**
   * Query Kenyan Constitution using RAG
   */
  async queryConstitution(
    request: ConstitutionalQueryRequest
  ): Promise<ConstitutionalQueryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/constitutional/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Python service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error({ component: 'PythonServiceClient', error }, 'Constitutional query failed');
      throw new Error(`Failed to query constitution: ${error}`);
    }
  }

  /**
   * Analyze text using spaCy NLP
   */
  async analyzeWithSpacy(
    request: SpacyAnalysisRequest
  ): Promise<SpacyAnalysisResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/spacy/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Python service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error({ component: 'PythonServiceClient', error }, 'spaCy analysis failed');
      throw new Error(`Failed to analyze with spaCy: ${error}`);
    }
  }

  /**
   * Analyze graph using NetworkX
   */
  async analyzeGraph(
    request: GraphAnalysisRequest
  ): Promise<GraphAnalysisResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/graph/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Python service error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error({ component: 'PythonServiceClient', error }, 'Graph analysis failed');
      throw new Error(`Failed to analyze graph: ${error}`);
    }
  }
}

// Export singleton instance
export const pythonServiceClient = new PythonServiceClient();

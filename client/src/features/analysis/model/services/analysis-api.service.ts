/**
 * Analysis API Service
 * 
 * Client-side service for interacting with the analysis feature API endpoints.
 * Provides methods for fetching comprehensive bill analysis, triggering new analyses,
 * and retrieving analysis history.
 */

import { globalApiClient } from '@client/infrastructure/api/client';
import { logger } from '@client/lib/utils/logger';
import { ErrorFactory, errorHandler } from '@client/infrastructure/error';
import type {
  ComprehensiveBillAnalysis,
  GetComprehensiveAnalysisParams,
  TriggerAnalysisParams,
  GetAnalysisHistoryParams,
  AnalysisHistoryEntry,
} from '@shared/types/features/analysis';

// ============================================================================
// API Response Types
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    source?: string;
    timestamp?: string;
    triggered_by?: string;
  };
}

interface AnalysisHistoryResponse {
  history: AnalysisHistoryEntry[];
  count: number;
}

// ============================================================================
// Service
// ============================================================================

export class AnalysisApiService {
  private readonly endpoint = '/analysis';

  /**
   * Get comprehensive analysis for a bill
   * @param params - Bill ID and optional force reanalysis flag
   * @returns Comprehensive bill analysis data
   */
  async getComprehensiveAnalysis(
    params: GetComprehensiveAnalysisParams
  ): Promise<ComprehensiveBillAnalysis> {
    try {
      const queryParams: Record<string, string> = {};
      if (params.force) {
        queryParams.force = 'true';
      }

      const response = await globalApiClient.get<ApiResponse<ComprehensiveBillAnalysis>>(
        `${this.endpoint}/bills/${params.bill_id}/comprehensive`,
        { params: queryParams }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch comprehensive analysis');
      }

      logger.info(`Comprehensive analysis fetched for bill ${params.bill_id}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to fetch comprehensive analysis for bill ${params.bill_id}`, { error });
      throw this.handleError(error, 'getComprehensiveAnalysis', { bill_id: params.bill_id });
    }
  }

  /**
   * Trigger a new comprehensive analysis run (admin only)
   * @param params - Bill ID and optional priority/notification settings
   * @returns Newly created analysis result
   */
  async triggerAnalysis(params: TriggerAnalysisParams): Promise<ComprehensiveBillAnalysis> {
    try {
      const response = await globalApiClient.post<ApiResponse<ComprehensiveBillAnalysis>>(
        `${this.endpoint}/bills/${params.bill_id}/comprehensive/run`,
        {
          priority: params.priority || 'normal',
          notify_on_complete: params.notify_on_complete || false,
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to trigger analysis');
      }

      logger.info(`Analysis triggered for bill ${params.bill_id}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to trigger analysis for bill ${params.bill_id}`, { error });
      throw this.handleError(error, 'triggerAnalysis', { bill_id: params.bill_id });
    }
  }

  /**
   * Get analysis history for a bill
   * @param params - Bill ID and optional pagination/filter parameters
   * @returns Array of historical analysis entries
   */
  async getAnalysisHistory(
    params: GetAnalysisHistoryParams
  ): Promise<AnalysisHistoryEntry[]> {
    try {
      const queryParams: Record<string, string> = {
        limit: (params.limit || 10).toString(),
        offset: (params.offset || 0).toString(),
      };

      if (params.type && params.type !== 'all') {
        queryParams.type = params.type;
      }

      const response = await globalApiClient.get<ApiResponse<AnalysisHistoryResponse>>(
        `${this.endpoint}/bills/${params.bill_id}/history`,
        { params: queryParams }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Failed to fetch analysis history');
      }

      logger.info(`Analysis history fetched for bill ${params.bill_id}`);
      return response.data.data.history;
    } catch (error) {
      logger.error(`Failed to fetch analysis history for bill ${params.bill_id}`, { error });
      throw this.handleError(error, 'getAnalysisHistory', { bill_id: params.bill_id });
    }
  }

  /**
   * Check health status of analysis service
   * @returns Health status object
   */
  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await globalApiClient.get<{ status: string; timestamp: string }>(
        `${this.endpoint}/health`
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to check analysis service health', { error });
      throw this.handleError(error, 'checkHealth');
    }
  }

  /**
   * Handle errors with consolidated error system
   */
  private handleError(error: unknown, operation: string, context?: Record<string, unknown>): Error {
    const clientError = ErrorFactory.createFromError(error, {
      component: 'AnalysisApiService',
      operation,
      ...context,
    });
    errorHandler.handleError(clientError);
    return error as Error;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const analysisApiService = new AnalysisApiService();

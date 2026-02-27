/**
 * Pretext Detection API Client
 * 
 * API client for pretext detection endpoints
 */

import { globalApiClient } from '@client/infrastructure/api';

export interface AnalyzeRequest {
  billId: string;
  force?: boolean;
}

export interface AnalyzeResponse {
  billId: string;
  detections: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: string[];
    confidence: number;
  }>;
  score: number;
  confidence: number;
  analyzedAt: string;
}

export interface Alert {
  id: string;
  billId: string;
  detections: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    evidence: string[];
    confidence: number;
  }>;
  score: number;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface GetAlertsParams {
  status?: string;
  limit?: number;
}

export interface ReviewAlertRequest {
  alertId: string;
  status: 'approved' | 'rejected';
  notes?: string;
}

export interface AnalyticsResponse {
  totalAnalyses: number;
  totalAlerts: number;
  averageScore: number;
  detectionsByType: Record<string, number>;
  alertsByStatus: Record<string, number>;
}

/**
 * Pretext Detection API Client
 */
export const pretextDetectionApi = {
  /**
   * Analyze a bill for pretext indicators
   */
  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const response = await globalApiClient.post<AnalyzeResponse>(
      '/api/pretext-detection/analyze',
      request
    );
    return response.data;
  },

  /**
   * Get pretext alerts
   */
  async getAlerts(params?: GetAlertsParams): Promise<Alert[]> {
    const queryParams: Record<string, string | number> = {};
    if (params?.status) {
      queryParams.status = params.status;
    }
    if (params?.limit) {
      queryParams.limit = params.limit;
    }
    
    const response = await globalApiClient.get<Alert[]>('/api/pretext-detection/alerts', {
      params: queryParams,
    });
    return response.data;
  },

  /**
   * Review a pretext alert
   */
  async reviewAlert(request: ReviewAlertRequest): Promise<{ success: boolean }> {
    const response = await globalApiClient.post<{ success: boolean }>(
      '/api/pretext-detection/review',
      request
    );
    return response.data;
  },

  /**
   * Get pretext detection analytics
   */
  async getAnalytics(startDate?: Date, endDate?: Date): Promise<AnalyticsResponse> {
    const params: Record<string, string> = {};
    if (startDate) {
      params.startDate = startDate.toISOString();
    }
    if (endDate) {
      params.endDate = endDate.toISOString();
    }

    const response = await globalApiClient.get<AnalyticsResponse>(
      '/api/pretext-detection/analytics',
      { params }
    );
    return response.data;
  },
};

/**
 * Electoral Accountability API Service
 * 
 * API client for Electoral Accountability Engine
 */

import type {
  VotingRecord,
  ConstituencySentiment,
  RepresentativeGapAnalysis,
  ElectoralPressureCampaign,
  MPScorecard,
  AccountabilityDashboardExport,
  GetVotingRecordOptions,
  GetCriticalGapsOptions,
  CreateCampaignData,
  GetCampaignsOptions,
  ExportRequestData,
} from '../types';

const API_BASE = '/api/electoral-accountability';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
  message?: string;
}

class ElectoralAccountabilityApi {
  /**
   * Get MP voting record mapped to constituency
   */
  async getMPVotingRecord(options: GetVotingRecordOptions): Promise<VotingRecord[]> {
    const params = new URLSearchParams();
    params.append('sponsorId', options.sponsorId);
    
    if (options.constituency) params.append('constituency', options.constituency);
    if (options.startDate) params.append('startDate', options.startDate);
    if (options.endDate) params.append('endDate', options.endDate);
    if (options.includeGapAnalysis) params.append('includeGapAnalysis', 'true');

    const response = await fetch(`${API_BASE}/mp-voting-record?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch voting record: ${response.statusText}`);
    }

    const result: ApiResponse<VotingRecord[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch voting record');
    }

    return result.data;
  }

  /**
   * Get constituency sentiment for a bill
   */
  async getConstituencySentiment(
    billId: string,
    constituency: string
  ): Promise<ConstituencySentiment> {
    const params = new URLSearchParams({ billId, constituency });
    const response = await fetch(`${API_BASE}/constituency-sentiment?${params}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Sentiment data not found for this bill and constituency');
      }
      throw new Error(`Failed to fetch constituency sentiment: ${response.statusText}`);
    }

    const result: ApiResponse<ConstituencySentiment> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch constituency sentiment');
    }

    return result.data;
  }

  /**
   * Get critical gaps with high electoral risk
   */
  async getCriticalGaps(options?: GetCriticalGapsOptions): Promise<RepresentativeGapAnalysis[]> {
    const params = new URLSearchParams();
    
    if (options?.constituency) params.append('constituency', options.constituency);
    if (options?.sponsorId) params.append('sponsorId', options.sponsorId);
    if (options?.minRiskScore !== undefined) {
      params.append('minRiskScore', options.minRiskScore.toString());
    }
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${API_BASE}/critical-gaps?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch critical gaps: ${response.statusText}`);
    }

    const result: ApiResponse<RepresentativeGapAnalysis[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch critical gaps');
    }

    return result.data;
  }

  /**
   * Create electoral pressure campaign
   */
  async createPressureCampaign(data: CreateCampaignData): Promise<ElectoralPressureCampaign> {
    const response = await fetch(`${API_BASE}/pressure-campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication token
        // 'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create pressure campaign: ${response.statusText}`);
    }

    const result: ApiResponse<ElectoralPressureCampaign> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create pressure campaign');
    }

    return result.data;
  }

  /**
   * Get pressure campaigns
   */
  async getPressureCampaigns(options?: GetCampaignsOptions): Promise<ElectoralPressureCampaign[]> {
    const params = new URLSearchParams();
    
    if (options?.status) params.append('status', options.status);
    if (options?.constituency) params.append('constituency', options.constituency);
    if (options?.sponsorId) params.append('sponsorId', options.sponsorId);
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${API_BASE}/pressure-campaigns?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch pressure campaigns: ${response.statusText}`);
    }

    const result: ApiResponse<ElectoralPressureCampaign[]> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch pressure campaigns');
    }

    return result.data;
  }

  /**
   * Get MP accountability scorecard
   */
  async getMPScorecard(sponsorId: string, constituency: string): Promise<MPScorecard> {
    const params = new URLSearchParams({ sponsorId, constituency });
    const response = await fetch(`${API_BASE}/mp-scorecard?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch MP scorecard: ${response.statusText}`);
    }

    const result: ApiResponse<MPScorecard> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch MP scorecard');
    }

    return result.data;
  }

  /**
   * Request dashboard export
   */
  async requestExport(data: ExportRequestData): Promise<AccountabilityDashboardExport> {
    const response = await fetch(`${API_BASE}/dashboard-export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication token
        // 'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to request export: ${response.statusText}`);
    }

    const result: ApiResponse<AccountabilityDashboardExport> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to request export');
    }

    return result.data;
  }

  /**
   * Get export by ID
   */
  async getExport(exportId: string): Promise<AccountabilityDashboardExport> {
    const response = await fetch(`${API_BASE}/dashboard-export/${exportId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch export: ${response.statusText}`);
    }

    const result: ApiResponse<AccountabilityDashboardExport> = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch export');
    }

    return result.data;
  }

  /**
   * Download export
   */
  async downloadExport(exportId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/dashboard-export/${exportId}/download`);
    
    if (!response.ok) {
      throw new Error(`Failed to download export: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${API_BASE}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  }
}

export const electoralAccountabilityApi = new ElectoralAccountabilityApi();
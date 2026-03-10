/**
 * Sponsors API Service
 * Client-side service for sponsors functionality with comprehensive
 * conflict analysis, transparency tracking, and risk assessment
 */

import { logger } from '@client/lib/utils/logger';
import { ErrorFactory, errorHandler } from '@client/infrastructure/error';
import { globalApiClient } from '@client/infrastructure/api/client';

import type {
  Sponsor,
  SponsorSearchOptions,
  SponsorAffiliation,
  SponsorAffiliationInput,
  SponsorTransparency,
  SponsorTransparencyInput,
  ConflictDetectionResult,
  RiskProfile,
  ConflictMapping,
  ConflictTrend,
  PaginatedSponsorsResponse,
  SponsorStatistics,
  SponsorsQueryParams,
} from '../types';

// ============================================================================
// Service Class
// ============================================================================

export class SponsorsApiService {
  private readonly endpoint = '/sponsors';

  // ==========================================================================
  // Core Sponsor Operations
  // ==========================================================================

  /**
   * Fetch paginated sponsors with optional filters
   * @param params - Search and filter parameters
   * @returns Paginated list of sponsors
   */
  async getSponsors(params: SponsorsQueryParams = {}): Promise<PaginatedSponsorsResponse> {
    try {
      const queryParams: Record<string, string> = {
        limit: params.limit?.toString() || '50',
        offset: (((params.page || 1) - 1) * (params.limit || 50)).toString(),
      };

      // Add optional parameters if they exist
      if (params.query) queryParams.query = params.query;
      if (params.party) queryParams.party = params.party;
      if (params.role) queryParams.role = params.role;
      if (params.constituency) queryParams.constituency = params.constituency;
      if (params.is_active !== undefined) queryParams.is_active = params.is_active.toString();
      if (params.sortBy) queryParams.sortBy = params.sortBy;
      if (params.sortOrder) queryParams.sortOrder = params.sortOrder;

      const response = await globalApiClient.get<PaginatedSponsorsResponse>(this.endpoint, {
        params: queryParams,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to fetch sponsors', { error, params });
      throw this.handleError(error, 'getSponsors', { params });
    }
  }

  /**
   * Get a single sponsor by ID with full details
   * @param id - Sponsor ID
   * @returns Complete sponsor data
   */
  async getSponsorById(id: string | number): Promise<Sponsor> {
    try {
      const response = await globalApiClient.get<{ data: Sponsor }>(`${this.endpoint}/${id}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to fetch sponsor ${id}`, { error });
      throw this.handleError(error, 'getSponsorById', { id });
    }
  }

  /**
   * Search sponsors by query string
   * @param query - Search query
   * @param options - Additional search options
   * @returns Array of matching sponsors
   */
  async searchSponsors(query: string, options: SponsorSearchOptions = {}): Promise<Sponsor[]> {
    try {
      const params = { query, ...options };
      const response = await this.getSponsors(params);
      return response.data;
    } catch (error) {
      logger.error('Failed to search sponsors', { error, query, options });
      throw this.handleError(error, 'searchSponsors', { query, options });
    }
  }

  /**
   * Create a new sponsor
   * @param sponsorData - Sponsor data
   * @returns Created sponsor
   */
  async createSponsor(sponsorData: Partial<Sponsor>): Promise<Sponsor> {
    try {
      const response = await globalApiClient.post<{ data: Sponsor }>(this.endpoint, sponsorData);
      logger.info(`Sponsor created: ${sponsorData.name}`);
      return response.data.data;
    } catch (error) {
      logger.error('Failed to create sponsor', { error, sponsorData });
      throw this.handleError(error, 'createSponsor', { sponsorData });
    }
  }

  /**
   * Update sponsor information
   * @param id - Sponsor ID
   * @param updateData - Data to update
   * @returns Updated sponsor
   */
  async updateSponsor(id: string | number, updateData: Partial<Sponsor>): Promise<Sponsor> {
    try {
      const response = await globalApiClient.patch<{ data: Sponsor }>(`${this.endpoint}/${id}`, updateData);
      logger.info(`Sponsor ${id} updated`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to update sponsor ${id}`, { error });
      throw this.handleError(error, 'updateSponsor', { id, updateData });
    }
  }

  /**
   * Deactivate a sponsor
   * @param id - Sponsor ID
   */
  async deactivateSponsor(id: string | number): Promise<void> {
    try {
      await globalApiClient.delete(`${this.endpoint}/${id}`);
      logger.info(`Sponsor ${id} deactivated`);
    } catch (error) {
      logger.error(`Failed to deactivate sponsor ${id}`, { error });
      throw this.handleError(error, 'deactivateSponsor', { id });
    }
  }

  // ==========================================================================
  // Affiliation Management
  // ==========================================================================

  /**
   * Get all affiliations for a sponsor
   * @param sponsorId - Sponsor ID
   * @returns Array of affiliations
   */
  async getSponsorAffiliations(sponsorId: string | number): Promise<SponsorAffiliation[]> {
    try {
      const response = await globalApiClient.get<{ data: SponsorAffiliation[] }>(
        `${this.endpoint}/${sponsorId}/affiliations`
      );
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to fetch affiliations for sponsor ${sponsorId}`, { error });
      throw this.handleError(error, 'getSponsorAffiliations', { sponsorId });
    }
  }

  /**
   * Add a new affiliation to a sponsor
   * @param sponsorId - Sponsor ID
   * @param affiliationData - Affiliation data
   * @returns Created affiliation
   */
  async addSponsorAffiliation(
    sponsorId: string | number,
    affiliationData: Omit<SponsorAffiliationInput, 'sponsor_id'>
  ): Promise<SponsorAffiliation> {
    try {
      const response = await globalApiClient.post<{ data: SponsorAffiliation }>(
        `${this.endpoint}/${sponsorId}/affiliations`,
        affiliationData
      );
      logger.info(`Affiliation added to sponsor ${sponsorId}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to add affiliation to sponsor ${sponsorId}`, { error });
      throw this.handleError(error, 'addSponsorAffiliation', { sponsorId, affiliationData });
    }
  }

  // ==========================================================================
  // Transparency Management
  // ==========================================================================

  /**
   * Get all transparency records for a sponsor
   * @param sponsorId - Sponsor ID
   * @returns Array of transparency records
   */
  async getSponsorTransparency(sponsorId: string | number): Promise<SponsorTransparency[]> {
    try {
      const response = await globalApiClient.get<{ data: SponsorTransparency[] }>(
        `${this.endpoint}/${sponsorId}/transparency`
      );
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to fetch transparency records for sponsor ${sponsorId}`, { error });
      throw this.handleError(error, 'getSponsorTransparency', { sponsorId });
    }
  }

  /**
   * Add a new transparency record to a sponsor
   * @param sponsorId - Sponsor ID
   * @param transparencyData - Transparency data
   * @returns Created transparency record
   */
  async addSponsorTransparency(
    sponsorId: string | number,
    transparencyData: Omit<SponsorTransparencyInput, 'sponsor_id'>
  ): Promise<SponsorTransparency> {
    try {
      const response = await globalApiClient.post<{ data: SponsorTransparency }>(
        `${this.endpoint}/${sponsorId}/transparency`,
        transparencyData
      );
      logger.info(`Transparency record added to sponsor ${sponsorId}`);
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to add transparency record to sponsor ${sponsorId}`, { error });
      throw this.handleError(error, 'addSponsorTransparency', { sponsorId, transparencyData });
    }
  }

  // ==========================================================================
  // Conflict Analysis
  // ==========================================================================

  /**
   * Detect conflicts for a specific sponsor
   * @param sponsorId - Sponsor ID
   * @returns Array of detected conflicts
   */
  async getSponsorConflicts(sponsorId: string | number): Promise<ConflictDetectionResult[]> {
    try {
      const response = await globalApiClient.get<{ data: ConflictDetectionResult[] }>(
        `${this.endpoint}/${sponsorId}/conflicts`
      );
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to fetch conflicts for sponsor ${sponsorId}`, { error });
      throw this.handleError(error, 'getSponsorConflicts', { sponsorId });
    }
  }

  /**
   * Get risk profile for a sponsor
   * @param sponsorId - Sponsor ID
   * @returns Risk profile analysis
   */
  async getSponsorRiskProfile(sponsorId: string | number): Promise<RiskProfile> {
    try {
      const response = await globalApiClient.get<{ data: RiskProfile }>(
        `${this.endpoint}/${sponsorId}/risk-profile`
      );
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to fetch risk profile for sponsor ${sponsorId}`, { error });
      throw this.handleError(error, 'getSponsorRiskProfile', { sponsorId });
    }
  }

  /**
   * Get conflict trends for a sponsor
   * @param sponsorId - Sponsor ID
   * @param timeframeMonths - Analysis timeframe in months
   * @returns Conflict trend analysis
   */
  async getSponsorConflictTrends(
    sponsorId: string | number,
    timeframeMonths: number = 12
  ): Promise<ConflictTrend[]> {
    try {
      const response = await globalApiClient.get<{ data: ConflictTrend[] }>(
        `${this.endpoint}/${sponsorId}/trends`,
        {
          params: { timeframe: timeframeMonths.toString() },
        }
      );
      return response.data.data;
    } catch (error) {
      logger.error(`Failed to fetch conflict trends for sponsor ${sponsorId}`, { error });
      throw this.handleError(error, 'getSponsorConflictTrends', { sponsorId, timeframeMonths });
    }
  }

  /**
   * Get conflict mapping for network visualization
   * @param billId - Optional bill ID to filter conflicts
   * @returns Conflict network mapping
   */
  async getConflictMapping(billId?: string | number): Promise<ConflictMapping> {
    try {
      const params = billId ? { bill_id: billId.toString() } : {};
      const response = await globalApiClient.get<{ data: ConflictMapping }>(
        `${this.endpoint}/conflicts/mapping`,
        { params }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch conflict mapping', { error, billId });
      throw this.handleError(error, 'getConflictMapping', { billId });
    }
  }

  // ==========================================================================
  // Metadata Operations
  // ==========================================================================

  /**
   * Get available political parties
   * @returns Array of party names
   */
  async getParties(): Promise<string[]> {
    try {
      const response = await globalApiClient.get<{ data: string[] }>(
        `${this.endpoint}/metadata/parties`
      );
      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch parties', { error });
      throw this.handleError(error, 'getParties');
    }
  }

  /**
   * Get available constituencies
   * @returns Array of constituency names
   */
  async getConstituencies(): Promise<string[]> {
    try {
      const response = await globalApiClient.get<{ data: string[] }>(
        `${this.endpoint}/metadata/constituencies`
      );
      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch constituencies', { error });
      throw this.handleError(error, 'getConstituencies');
    }
  }

  /**
   * Get sponsor statistics
   * @returns Statistics summary
   */
  async getStatistics(): Promise<SponsorStatistics> {
    try {
      const response = await globalApiClient.get<{ data: SponsorStatistics }>(
        `${this.endpoint}/metadata/statistics`
      );
      return response.data.data;
    } catch (error) {
      logger.error('Failed to fetch statistics', { error });
      throw this.handleError(error, 'getStatistics');
    }
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  /**
   * Handle errors with consolidated error system
   */
  private handleError(error: unknown, operation: string, context?: Record<string, unknown>): Error {
    const clientError = ErrorFactory.createFromError(error, {
      component: 'SponsorsApiService',
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

export const sponsorsApiService = new SponsorsApiService();
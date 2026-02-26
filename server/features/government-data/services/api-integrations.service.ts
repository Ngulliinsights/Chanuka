/**
 * Government API Integrations Service
 * 
 * Provides structured integrations with Kenyan government APIs:
 * - Kenya Law / Laws.Africa Content API (Akoma Ntoso XML/JSON)
 * - Public Procurement Information Portal (OCDS JSON/CSV)
 * - Kenya Open Data Portal (Census and socio-economic data)
 * - Parliament Hansard repositories
 */

import { logger } from '@server/infrastructure/observability';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface APIConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface LegalDocument {
  frbr_uri: string;
  title: string;
  publication_date: string;
  content: string;
  format: 'xml' | 'json' | 'html';
  metadata: Record<string, any>;
}

export interface ProcurementContract {
  ocid: string; // Open Contracting ID
  title: string;
  description: string;
  buyer: {
    name: string;
    id: string;
  };
  suppliers: Array<{
    name: string;
    id: string;
  }>;
  value: {
    amount: number;
    currency: string;
  };
  period: {
    startDate: string;
    endDate: string;
  };
  tender: {
    id: string;
    title: string;
    status: string;
  };
}

export interface DemographicData {
  indicator: string;
  value: number;
  unit: string;
  year: number;
  county?: string;
  source: string;
}

// ============================================================================
// KENYA LAW / LAWS.AFRICA API CLIENT
// ============================================================================

export class KenyaLawAPIClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: APIConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
  }

  /**
   * Fetch legislation using FRBR URI
   * Example: /akn/ke/act/2010/const/eng
   */
  async fetchLegislation(frbr_uri: string, format: 'xml' | 'json' = 'json'): Promise<LegalDocument> {
    try {
      logger.info({ component: 'KenyaLawAPI' }, `Fetching legislation: ${frbr_uri}`);

      const url = `${this.baseUrl}${frbr_uri}.${format}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Token ${this.apiKey}`;
      }

      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        frbr_uri,
        title: data.title || '',
        publication_date: data.publication_date || '',
        content: format === 'xml' ? data : JSON.stringify(data),
        format,
        metadata: data.metadata || {},
      };
    } catch (error) {
      logger.error({ component: 'KenyaLawAPI' }, `Failed to fetch legislation: ${frbr_uri}`, error);
      throw error;
    }
  }

  /**
   * Search for case law using Tausi API
   */
  async searchCaseLaw(query: string, filters?: {
    court?: string;
    year?: number;
    limit?: number;
  }): Promise<LegalDocument[]> {
    try {
      logger.info({ component: 'KenyaLawAPI' }, `Searching case law: ${query}`);

      const params = new URLSearchParams({
        q: query,
        ...(filters?.court && { court: filters.court }),
        ...(filters?.year && { year: filters.year.toString() }),
        ...(filters?.limit && { limit: filters.limit.toString() }),
      });

      const url = `${this.baseUrl}/search/judgments?${params}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Token ${this.apiKey}`;
      }

      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return data.results.map((result: any) => ({
        frbr_uri: result.frbr_uri,
        title: result.title,
        publication_date: result.date,
        content: result.content || '',
        format: 'json' as const,
        metadata: {
          court: result.court,
          judges: result.judges,
          citation: result.citation,
        },
      }));
    } catch (error) {
      logger.error({ component: 'KenyaLawAPI' }, `Failed to search case law: ${query}`, error);
      throw error;
    }
  }

  /**
   * Fetch constitutional provisions
   */
  async fetchConstitution(): Promise<LegalDocument> {
    return this.fetchLegislation('/akn/ke/act/2010/const/eng', 'json');
  }
}

// ============================================================================
// PUBLIC PROCUREMENT API CLIENT (OCDS)
// ============================================================================

export class PublicProcurementAPIClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: APIConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
  }

  /**
   * Fetch procurement contracts in OCDS format
   */
  async fetchContracts(filters?: {
    startDate?: string;
    endDate?: string;
    buyer?: string;
    minValue?: number;
    limit?: number;
  }): Promise<ProcurementContract[]> {
    try {
      logger.info({ component: 'ProcurementAPI', filters }, 'Fetching procurement contracts');

      const params = new URLSearchParams({
        format: 'json',
        ...(filters?.startDate && { startDate: filters.startDate }),
        ...(filters?.endDate && { endDate: filters.endDate }),
        ...(filters?.buyer && { buyer: filters.buyer }),
        ...(filters?.minValue && { minValue: filters.minValue.toString() }),
        ...(filters?.limit && { limit: filters.limit.toString() }),
      });

      const url = `${this.baseUrl}/contracts?${params}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // OCDS format: releases array
      return data.releases.map((release: any) => ({
        ocid: release.ocid,
        title: release.tender?.title || '',
        description: release.tender?.description || '',
        buyer: {
          name: release.buyer?.name || '',
          id: release.buyer?.id || '',
        },
        suppliers: release.awards?.flatMap((award: any) => 
          award.suppliers?.map((supplier: any) => ({
            name: supplier.name,
            id: supplier.id,
          })) || []
        ) || [],
        value: {
          amount: release.tender?.value?.amount || 0,
          currency: release.tender?.value?.currency || 'KES',
        },
        period: {
          startDate: release.tender?.tenderPeriod?.startDate || '',
          endDate: release.tender?.tenderPeriod?.endDate || '',
        },
        tender: {
          id: release.tender?.id || '',
          title: release.tender?.title || '',
          status: release.tender?.status || '',
        },
      }));
    } catch (error) {
      logger.error({ component: 'ProcurementAPI' }, 'Failed to fetch procurement contracts', error);
      throw error;
    }
  }

  /**
   * Fetch supplier information
   */
  async fetchSupplier(supplierId: string): Promise<any> {
    try {
      logger.info({ component: 'ProcurementAPI' }, `Fetching supplier: ${supplierId}`);

      const url = `${this.baseUrl}/suppliers/${supplierId}`;
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error({ component: 'ProcurementAPI' }, `Failed to fetch supplier: ${supplierId}`, error);
      throw error;
    }
  }
}

// ============================================================================
// KENYA OPEN DATA PORTAL CLIENT
// ============================================================================

export class KenyaOpenDataAPIClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: APIConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
  }

  /**
   * Fetch demographic data from census
   */
  async fetchDemographicData(filters?: {
    indicator?: string;
    county?: string;
    year?: number;
  }): Promise<DemographicData[]> {
    try {
      logger.info({ component: 'OpenDataAPI', filters }, 'Fetching demographic data');

      const params = new URLSearchParams({
        format: 'json',
        ...(filters?.indicator && { indicator: filters.indicator }),
        ...(filters?.county && { county: filters.county }),
        ...(filters?.year && { year: filters.year.toString() }),
      });

      const url = `${this.baseUrl}/datasets/census?${params}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return data.results.map((result: any) => ({
        indicator: result.indicator,
        value: result.value,
        unit: result.unit,
        year: result.year,
        county: result.county,
        source: 'KNBS Census 2019',
      }));
    } catch (error) {
      logger.error({ component: 'OpenDataAPI' }, 'Failed to fetch demographic data', error);
      throw error;
    }
  }

  /**
   * Fetch socio-economic indicators
   */
  async fetchSocioEconomicIndicators(indicator: string): Promise<DemographicData[]> {
    try {
      logger.info({ component: 'OpenDataAPI' }, `Fetching indicator: ${indicator}`);

      const url = `${this.baseUrl}/indicators/${indicator}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.timeout),
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return data.data.map((item: any) => ({
        indicator: indicator,
        value: item.value,
        unit: item.unit,
        year: item.year,
        county: item.county,
        source: 'KNBS',
      }));
    } catch (error) {
      logger.error({ component: 'OpenDataAPI' }, `Failed to fetch indicator: ${indicator}`, error);
      throw error;
    }
  }
}

// ============================================================================
// API INTEGRATION MANAGER
// ============================================================================

export class GovernmentAPIIntegrationManager {
  private kenyaLawClient: KenyaLawAPIClient;
  private procurementClient: PublicProcurementAPIClient;
  private openDataClient: KenyaOpenDataAPIClient;

  constructor() {
    // Initialize clients with configuration from environment
    this.kenyaLawClient = new KenyaLawAPIClient({
      baseUrl: process.env.KENYA_LAW_API_URL || 'https://api.laws.africa/v3',
      apiKey: process.env.KENYA_LAW_API_KEY,
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
      },
    });

    this.procurementClient = new PublicProcurementAPIClient({
      baseUrl: process.env.PPIP_API_URL || 'https://ppip.treasury.go.ke/api',
      apiKey: process.env.PPIP_API_KEY,
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
      },
    });

    this.openDataClient = new KenyaOpenDataAPIClient({
      baseUrl: process.env.KENYA_OPEN_DATA_URL || 'https://www.opendata.go.ke/api',
      timeout: 30000,
      retryAttempts: 3,
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
      },
    });
  }

  // Expose clients
  get kenyaLaw() {
    return this.kenyaLawClient;
  }

  get procurement() {
    return this.procurementClient;
  }

  get openData() {
    return this.openDataClient;
  }
}

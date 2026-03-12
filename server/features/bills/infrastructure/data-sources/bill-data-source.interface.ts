import { bills } from '@server/infrastructure/schema';
/**
 * Bill Data Source Interface
 * 
 * Abstraction layer that allows switching between database and mock data sources.
 * Enables proper dependency injection and testing.
 */

export interface BillDataSource {
  /**
   * Find a bill by ID
   */
  findById(id: string): Promise<BillDataRecord | null>;

  /**
   * Find bills with optional filters
   */
  findAll(filters?: BillFilters): Promise<BillDataRecord[]>;

  /**
   * Count bills matching filters
   */
  count(filters?: BillFilters): Promise<number>;

  /**
   * Get bill statistics
   */
  getStats(): Promise<BillStats>;

  /**
   * Check if data source is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get data source status for monitoring
   */
  getStatus(): DataSourceStatus;
}

export interface BillDataRecord {
  id: string;
  title: string;
  summary: string;
  status: string;
  category: string;
  introduced_date: string;
  bill_number: string;
  full_text: string;
  sponsor_id: string | null;
  tags: string[];
  last_action_date: string;
  created_at: Date;
  updated_at: Date;
  comment_count: number;
  view_count: number;
  share_count: number;
  engagement_score: string;
  complexity_score: number;
  search_vector?: string | null;
  constitutionalConcerns?: {
    concerns: string[];
    riskLevel: string;
  };
}

export interface BillFilters {
  status?: string;
  category?: string;
  sponsor_id?: string;
  search?: string;
}

export interface BillStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

export interface DataSourceStatus {
  type: 'database' | 'mock';
  available: boolean;
  lastCheck?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type DataSourceType = 'database' | 'mock' | 'auto';
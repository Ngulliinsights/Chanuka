/**
 * Argument Intelligence API Client
 *
 * API client for interacting with the argument intelligence backend.
 */

import type {
  Argument,
  ArgumentCluster,
  ArgumentStatistics,
  ArgumentMap,
  ArgumentFilters,
  ArgumentSearchResult,
} from '../types';
import { apiFetchClient } from '@client/infrastructure/api/response-handler';

const BASE_URL = '/api/argument-intelligence';

/**
 * Get all arguments for a bill with optional filtering
 */
export async function getArguments(
  billId: string,
  filters?: ArgumentFilters
): Promise<{ arguments: Argument[]; count: number; pagination: Record<string, unknown> }> {
  const params = new URLSearchParams();

  if (filters?.argumentType) params.append('argumentType', filters.argumentType);
  if (filters?.position) params.append('position', filters.position);
  if (filters?.minConfidence !== undefined)
    params.append('minConfidence', filters.minConfidence.toString());
  if (filters?.minStrength !== undefined)
    params.append('minStrength', filters.minStrength.toString());

  const url = `${BASE_URL}/arguments/${billId}${params.toString() ? `?${params.toString()}` : ''}`;

  return apiFetchClient.get<{
    arguments: Argument[];
    count: number;
    pagination: Record<string, unknown>;
  }>(url);
}

/**
 * Get argument statistics for a bill
 */
export async function getArgumentStatistics(billId: string): Promise<ArgumentStatistics> {
  return apiFetchClient.get<ArgumentStatistics>(`${BASE_URL}/statistics/${billId}`);
}

/**
 * Cluster arguments by semantic similarity
 */
export async function clusterArguments(
  argumentList: Argument[],
  config?: {
    method?: 'hierarchical' | 'kmeans';
    minSimilarity?: number;
    maxClusters?: number;
  }
): Promise<{ clusters: ArgumentCluster[]; outliers: string[]; metrics: Record<string, unknown> }> {
  return apiFetchClient.post<{
    clusters: ArgumentCluster[];
    outliers: string[];
    metrics: Record<string, unknown>;
  }>(`${BASE_URL}/cluster-arguments`, {
    arguments: argumentList.map(arg => ({
      id: arg.id,
      text: arg.argument_text,
      position: arg.position,
    })),
    config: config || {},
  });
}

/**
 * Get argument map for visualization
 */
export async function getArgumentMap(billId: string): Promise<ArgumentMap> {
  const response = await fetch(`${BASE_URL}/argument-map/${billId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch argument map: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Search arguments by text query
 */
export async function searchArguments(
  query: string,
  limit: number = 20
): Promise<ArgumentSearchResult> {
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });

  const response = await fetch(`${BASE_URL}/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to search arguments: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Synthesize all arguments for a bill
 */
export async function synthesizeBill(billId: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/synthesize-bill/${billId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to synthesize bill: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get coalition opportunities for a bill
 */
export async function getCoalitionOpportunities(billId: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/coalition-opportunities/${billId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch coalition opportunities: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Get evidence assessment for a bill
 */
export async function getEvidenceAssessment(billId: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/evidence-assessment/${billId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch evidence assessment: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

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

const BASE_URL = '/api/argument-intelligence';

/**
 * Get all arguments for a bill with optional filtering
 */
export async function getArguments(
  billId: string,
  filters?: ArgumentFilters
): Promise<{ arguments: Argument[]; count: number; pagination: any }> {
  const params = new URLSearchParams();
  
  if (filters?.argumentType) params.append('argumentType', filters.argumentType);
  if (filters?.position) params.append('position', filters.position);
  if (filters?.minConfidence !== undefined) params.append('minConfidence', filters.minConfidence.toString());
  if (filters?.minStrength !== undefined) params.append('minStrength', filters.minStrength.toString());
  
  const url = `${BASE_URL}/arguments/${billId}${params.toString() ? `?${params.toString()}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch arguments: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.data;
}

/**
 * Get argument statistics for a bill
 */
export async function getArgumentStatistics(billId: string): Promise<ArgumentStatistics> {
  const response = await fetch(`${BASE_URL}/statistics/${billId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch statistics: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.data;
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
): Promise<{ clusters: ArgumentCluster[]; outliers: string[]; metrics: any }> {
  const response = await fetch(`${BASE_URL}/cluster-arguments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({
      arguments: argumentList.map(arg => ({
        id: arg.id,
        text: arg.argument_text,
        position: arg.position,
      })),
      config: config || {},
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to cluster arguments: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.data;
}

/**
 * Get argument map for visualization
 */
export async function getArgumentMap(billId: string): Promise<ArgumentMap> {
  const response = await fetch(`${BASE_URL}/argument-map/${billId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch evidence assessment: ${response.statusText}`);
  }
  
  const result = await response.json();
  return result.data;
}

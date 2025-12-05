/**
 * Navigation Search Module
 * 
 * Handles navigation item searching with fuzzy matching
 */

import { NavigationItem } from './types';

/**
 * Searches navigation items with fuzzy matching and scoring
 */
export function searchNavigationItems(
  query: string,
  navigationItems: NavigationItem[],
  options: {
    maxResults?: number;
    includeDescription?: boolean;
    fuzzyMatch?: boolean;
  } = {}
): NavigationItem[] {
  const { maxResults = 10, includeDescription = true, fuzzyMatch = false } = options;

  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase().trim();
  const results: Array<{ item: NavigationItem; score: number }> = [];

  navigationItems.forEach(item => {
    let score = 0;
    const label = item.label.toLowerCase();
    const description = item.description?.toLowerCase() || '';

    // Exact label match gets highest score
    if (label === searchTerm) {
      score = 100;
    }
    // Label starts with query
    else if (label.startsWith(searchTerm)) {
      score = 80;
    }
    // Label contains query
    else if (label.includes(searchTerm)) {
      score = 60;
    }
    // Description contains query (if enabled)
    else if (includeDescription && description.includes(searchTerm)) {
      score = 40;
    }
    // Fuzzy match (if enabled)
    else if (fuzzyMatch && fuzzyMatchScore(searchTerm, label) > 0.6) {
      score = 20;
    }

    if (score > 0) {
      results.push({ item, score });
    }
  });

  // Sort by score and return items
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(result => result.item);
}

/**
 * Calculates fuzzy match score between two strings (0-1)
 */
export function fuzzyMatchScore(query: string, target: string): number {
  if (query.length === 0) return 1;
  if (target.length === 0) return 0;

  let queryIndex = 0;
  let targetIndex = 0;
  let matches = 0;

  while (queryIndex < query.length && targetIndex < target.length) {
    if (query[queryIndex] === target[targetIndex]) {
      matches++;
      queryIndex++;
    }
    targetIndex++;
  }

  return matches / query.length;
}
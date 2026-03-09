/**
 * useBillComparison Hook
 * 
 * Hook for comparing multiple bills side-by-side.
 * Handles fetching bills, computing differences, and managing comparison state.
 */

import { useQuery } from '@tanstack/react-query';
import { billsApiService } from '../services/api';
import type { Bill } from '@client/lib/types/bill';
import { useMemo } from 'react';

interface BillComparisonOptions {
  billIds: string[];
  enabled?: boolean;
}

interface ComparisonResult {
  bills: Bill[];
  isLoading: boolean;
  error: Error | null;
  differences: ComparisonDifferences;
}

interface ComparisonDifferences {
  metadata: MetadataDiff[];
  textSimilarity: number;
  commonKeywords: string[];
  uniqueKeywords: Record<string, string[]>;
}

interface MetadataDiff {
  field: string;
  label: string;
  values: Record<string, any>;
  isDifferent: boolean;
}

/**
 * Hook to compare multiple bills
 * 
 * @param options - Configuration including bill IDs to compare
 * @returns Comparison result with bills, loading state, and computed differences
 * 
 * @example
 * ```tsx
 * const { bills, differences, isLoading } = useBillComparison({
 *   billIds: ['bill-1', 'bill-2']
 * });
 * ```
 */
export function useBillComparison(options: BillComparisonOptions): ComparisonResult {
  const { billIds, enabled = true } = options;

  // Fetch all bills in parallel
  const billQueries = billIds.map(id =>
    useQuery({
      queryKey: ['bill', id],
      queryFn: () => billsApiService.getBillById(id),
      enabled: enabled && !!id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  );

  // Aggregate loading and error states
  const isLoading = billQueries.some(q => q.isLoading);
  const error = billQueries.find(q => q.error)?.error as Error | null;
  const bills = billQueries
    .filter(q => q.data)
    .map(q => q.data as Bill);

  // Compute differences between bills
  const differences = useMemo(() => {
    if (bills.length < 2) {
      return {
        metadata: [],
        textSimilarity: 0,
        commonKeywords: [],
        uniqueKeywords: {},
      };
    }

    return computeDifferences(bills);
  }, [bills]);

  return {
    bills,
    isLoading,
    error,
    differences,
  };
}

/**
 * Compute differences between bills
 */
function computeDifferences(bills: Bill[]): ComparisonDifferences {
  const metadataFields: Array<{ field: string; label: string }> = [
    { field: 'bill_number', label: 'Bill Number' },
    { field: 'status', label: 'Status' },
    { field: 'chamber', label: 'Chamber' },
    { field: 'category', label: 'Category' },
    { field: 'introduced_date', label: 'Introduced Date' },
    { field: 'last_action_date', label: 'Last Action Date' },
    { field: 'reading_stage', label: 'Reading Stage' },
    { field: 'is_urgent', label: 'Urgent' },
    { field: 'is_money_bill', label: 'Money Bill' },
    { field: 'priority_level', label: 'Priority' },
  ];

  // Compare metadata
  const metadata: MetadataDiff[] = metadataFields.map(({ field, label }) => {
    const values: Record<string, any> = {};
    bills.forEach((bill, index) => {
      values[`bill${index + 1}`] = (bill as any)[field];
    });

    const uniqueValues = new Set(Object.values(values));
    const isDifferent = uniqueValues.size > 1;

    return { field, label, values, isDifferent };
  });

  // Compute text similarity (simple word overlap)
  const textSimilarity = computeTextSimilarity(bills);

  // Extract keywords
  const allKeywords = bills.map(bill => extractKeywords(bill));
  const commonKeywords = findCommonKeywords(allKeywords);
  const uniqueKeywords: Record<string, string[]> = {};
  
  bills.forEach((_, index) => {
    const keywords = allKeywords[index];
    if (keywords) {
      uniqueKeywords[`bill${index + 1}`] = keywords.filter(
        kw => !commonKeywords.includes(kw)
      );
    }
  });

  return {
    metadata,
    textSimilarity,
    commonKeywords,
    uniqueKeywords,
  };
}

/**
 * Compute text similarity between bills (0-100)
 */
function computeTextSimilarity(bills: Bill[]): number {
  if (bills.length < 2) return 0;

  const texts = bills.map(bill => {
    const title = bill.title || '';
    const summary = bill.summary || '';
    const fullText = (bill as any).full_text || bill.fullText || '';
    return `${title} ${summary} ${fullText}`.toLowerCase();
  });

  // Simple word-based similarity
  const wordSets = texts.map(text => 
    new Set(text.split(/\s+/).filter(word => word.length > 3))
  );

  let totalSimilarity = 0;
  let comparisons = 0;

  for (let i = 0; i < wordSets.length; i++) {
    for (let j = i + 1; j < wordSets.length; j++) {
      const setI = wordSets[i];
      const setJ = wordSets[j];
      
      if (!setI || !setJ) continue;
      
      const intersection = new Set(
        [...setI].filter(word => setJ.has(word))
      );
      const union = new Set([...setI, ...setJ]);
      
      const similarity = (intersection.size / union.size) * 100;
      totalSimilarity += similarity;
      comparisons++;
    }
  }

  return comparisons > 0 ? Math.round(totalSimilarity / comparisons) : 0;
}

/**
 * Extract keywords from a bill
 */
function extractKeywords(bill: Bill): string[] {
  const title = bill.title || '';
  const summary = bill.summary || '';
  const text = `${title} ${summary}`.toLowerCase();
  const words = text.split(/\s+/).filter(word => word.length > 4);
  
  // Count word frequency
  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Return top 10 most frequent words
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Find common keywords across all bills
 */
function findCommonKeywords(allKeywords: string[][]): string[] {
  if (allKeywords.length === 0) return [];

  const firstSet = new Set(allKeywords[0] || []);
  if (firstSet.size === 0) return [];
  
  const common = [...firstSet].filter(keyword =>
    allKeywords.every(keywords => keywords && keywords.includes(keyword))
  );

  return common.slice(0, 5); // Return top 5 common keywords
}

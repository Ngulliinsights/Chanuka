/**
 * Hook: useLegislativeBrief
 * 
 * Fetches the AI-generated legislative brief synthesizing all arguments on a bill
 * Part of argument-intelligence feature integration with community
 */

import { useQuery } from '@tanstack/react-query';

// Client-side type that matches what the API returns
// Maps from server schema (legislative_briefs table) to client needs
interface LegislativeBrief {
  id: string;
  billId: string;
  briefType: string;
  title: string;
  executiveSummary: string;
  keyArguments: {
    support: string[];
    oppose: string[];
    neutral: string[];
  };
  stakeholderPositions: Record<string, unknown>;
  publicSentiment: {
    supportCount: number;
    opposeCount: number;
    neutralCount: number;
  };
  commonThemes?: string[];
  topSupportingArguments?: string[];
  topOpposingArguments?: string[];
  constitutionalImplications?: string;
  generatedBy: string;
  dataCutoffDate: string | Date;
  deliveredToCommittee: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Convenience type for the component
export interface LegislativeBriefWithCounts extends LegislativeBrief {
  supportCount: number;
  opposeCount: number;
  neutralCount: number;
}

export function useLegislativeBrief(billId: string) {
  return useQuery({
    queryKey: ['legislative-brief', billId],
    queryFn: async () => {
      const response = await fetch(`/api/argument-intelligence/bill/${billId}/brief`);
      if (!response.ok) throw new Error('Failed to fetch legislative brief');
      const data = await response.json();
      const brief = data.brief as LegislativeBrief;
      
      // Transform to include convenience properties
      const briefWithCounts: LegislativeBriefWithCounts = {
        ...brief,
        supportCount: brief.publicSentiment?.supportCount || 0,
        opposeCount: brief.publicSentiment?.opposeCount || 0,
        neutralCount: brief.publicSentiment?.neutralCount || 0,
        commonThemes: brief.keyArguments?.support?.slice(0, 5) || [],
        topSupportingArguments: brief.keyArguments?.support || [],
        topOpposingArguments: brief.keyArguments?.oppose || [],
      };
      
      return briefWithCounts;
    },
    enabled: !!billId,
    staleTime: 15 * 60 * 1000 // 15 minutes
  });
}

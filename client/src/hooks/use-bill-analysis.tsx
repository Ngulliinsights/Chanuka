import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Bill {
  id: number;
  title: string;
  description?: string;
  aims?: string;
  keyAreas?: Array<{ title: string; description: string }>;
  constitutionalAnalysis?: Array<{ title: string; content: string }>;
  constitutionalAssessment?: string;
  actions?: Array<{ eventDate: string; event: string; importance: string; details?: string }>;
  supportPercentage?: number;
  views?: number;
  analyses?: number;
  endorsements?: number;
  verifiedClaims?: number;
  number?: string;
  introduced_date?: string;
  status?: string;
}

interface CommentPayload {
  content: string;
  expertise?: string;
  billId: number;
  parentId?: number;
  section?: string;
}

interface EndorseCommentPayload {
  commentId: number;
  endorsements: number;
}

interface VotePayload {
  commentId: number;
  type: 'up' | 'down';
}

interface PollPayload {
  billId: number;
  question: string;
  options: string[];
  section?: string;
}

interface BillAnalysis {
  id: number;
  briefSummary?: string;
  standardSummary?: string;
  comprehensiveSummary?: string;
  constitutionalConfidence: number;
  keyProvisions: Array<{
    id: number;
    title: string;
    impact: string;
    description: string;
    confidence: number;
  }>;
  timeline: Array<{
    id: number;
    eventDate: string;
    event: string;
    importance: 'critical' | 'important' | 'normal';
import { logger } from '../utils/logger.js';
    details?: string;
  }>;
  stakeholders: Array<{
    id: number;
    name: string;
    role: string;
    organization: string;
    influence: 'high' | 'medium' | 'low';
  }>;
}

interface Comment {
  id: number;
  userId: number;
  username: string;
  userInitials: string;
  expertise?: string;
  content: string;
  createdAt: Date;
  endorsements: number;
  upvotes: number;
  downvotes: number;
  verifiedClaims: number;
  isHighlighted: boolean;
  parentId?: number;
  replies?: Comment[];
  pollData?: {
    question: string;
    options: Array<{ text: string; votes: number }>;
    totalVotes: number;
    userVote?: number;
  };
}

const apiRequest = async (method: string, url: string, data?: any) => {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  return response;
};

export function useBillAnalysis(billId: number) {
  const [analysis, setAnalysis] = useState<BillAnalysis | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Fetch bill
  const { data: billData, isLoading: billLoading } = useQuery({
    queryKey: ['bill', billId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/bills/${billId}`);
      return res.json();
    },
    enabled: !!billId,
  });

  // Fetch bill analysis
  const { data: analysisData, isLoading: analysisLoading } = useQuery({
    queryKey: ['analysis', billId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/analysis/bills/${billId}`);
      return res.json();
    },
    enabled: !!billId,
  });

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['bills', billId, 'comments'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/bills/${billId}/comments`);
      return res.json();
    },
    enabled: !!billId,
  });

  useEffect(() => {
    if (analysisData) {
      setAnalysis(analysisData);
    }
  }, [analysisData]);

  useEffect(() => {
    if (commentsData) {
      setComments(commentsData);
    }
  }, [commentsData]);

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (payload: CommentPayload) => {
      const res = await apiRequest('POST', `/api/bills/${billId}/comments`, payload);
      return res.json();
    },
    onSuccess: (newComment) => {
      setComments(prev => [newComment, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['bills', billId, 'comments'] });
    },
  });

  // Vote on comment mutation
  const voteCommentMutation = useMutation({
    mutationFn: async (payload: VotePayload) => {
      const res = await apiRequest('POST', `/api/comments/${payload.commentId}/vote`, { 
        type: payload.type 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', billId, 'comments'] });
    },
  });

  // Endorse comment mutation
  const endorseCommentMutation = useMutation({
    mutationFn: async (payload: EndorseCommentPayload) => {
      const res = await apiRequest('POST', `/api/comments/${payload.commentId}/endorse`, { 
        endorsements: payload.endorsements 
      });
      return res.json();
    },
    onSuccess: (updatedComment) => {
      setComments(prev => 
        prev.map(comment => 
          comment.id === updatedComment.id 
            ? { ...comment, endorsements: updatedComment.endorsements } 
            : comment
        )
      );
      queryClient.invalidateQueries({ queryKey: ['bills', billId, 'comments'] });
    },
  });

  // Create poll mutation
  const createPollMutation = useMutation({
    mutationFn: async (payload: PollPayload) => {
      const res = await apiRequest('POST', `/api/bills/${payload.billId}/polls`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', billId, 'comments'] });
    },
  });

  // Helper function to add a comment
  const addComment = useCallback(async (payload: CommentPayload) => {
    return addCommentMutation.mutateAsync(payload);
  }, [addCommentMutation]);

  // Helper function to vote on a comment
  const voteComment = useCallback(async (payload: VotePayload) => {
    return voteCommentMutation.mutateAsync(payload);
  }, [voteCommentMutation]);

  // Helper function to endorse a comment
  const endorseComment = useCallback(async (payload: EndorseCommentPayload) => {
    return endorseCommentMutation.mutateAsync(payload);
  }, [endorseCommentMutation]);

  // Helper function to create a poll
  const createPoll = useCallback(async (payload: PollPayload) => {
    return createPollMutation.mutateAsync(payload);
  }, [createPollMutation]);

  return {
    bill: billData,
    analysis,
    comments,
    isLoading: isLoading || billLoading || analysisLoading || commentsLoading,
    addComment,
    voteComment,
    endorseComment,
    createPoll,
    isAddingComment: addCommentMutation.isPending,
    isEndorsing: endorseCommentMutation.isPending,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['bills', billId] });
      queryClient.invalidateQueries({ queryKey: ['analysis', billId] });
    },
  };
}

export function useSponsorshipAnalysis(billId: string) {
  return useQuery({
    queryKey: ['sponsorship-analysis', billId],
    queryFn: async () => {
      const response = await fetch(`/api/sponsorship/bills/${billId}/analysis`);
      if (!response.ok) {
        throw new Error('Failed to fetch sponsorship analysis');
      }
      return response.json();
    },
    enabled: !!billId,
  });
}

export function usePrimarySponsorAnalysis(billId: string) {
  return useQuery({
    queryKey: ['primary-sponsor-analysis', billId],
    queryFn: async () => {
      const response = await fetch(`/api/sponsorship/bills/${billId}/primary-sponsor`);
      if (!response.ok) {
        throw new Error('Failed to fetch primary sponsor analysis');
      }
      return response.json();
    },
    enabled: !!billId,
  });
}

export function useCoSponsorsAnalysis(billId: string) {
  return useQuery({
    queryKey: ['co-sponsors-analysis', billId],
    queryFn: async () => {
      const response = await fetch(`/api/sponsorship/bills/${billId}/co-sponsors`);
      if (!response.ok) {
        throw new Error('Failed to fetch co-sponsors analysis');
      }
      return response.json();
    },
    enabled: !!billId,
  });
}

export function useFinancialNetworkAnalysis(billId: string) {
  return useQuery({
    queryKey: ['financial-network-analysis', billId],
    queryFn: async () => {
      const response = await fetch(`/api/sponsorship/bills/${billId}/financial-network`);
      if (!response.ok) {
        throw new Error('Failed to fetch financial network analysis');
      }
      return response.json();
    },
    enabled: !!billId,
  });
}
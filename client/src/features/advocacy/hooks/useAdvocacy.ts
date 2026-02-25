/**
 * Advocacy Coordination Hooks
 * 
 * React Query hooks for advocacy features
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@client/services/apiService';
import { logger } from '@client/lib/utils/logger';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  bill_id: string;
  organizerId: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  goals: string[];
  start_date: string;
  end_date: string;
  participantCount: number;
  impactScore: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActionItem {
  id: string;
  campaign_id: string;
  user_id: string;
  actionType: 'contact_representative' | 'attend_hearing' | 'submit_comment' | 'share_content' | 'organize_meeting' | 'petition_signature';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedTimeMinutes: number;
  due_date?: string;
  created_at: string;
}

export interface ImpactMetric {
  id: string;
  campaign_id: string;
  metricType: 'bill_amended' | 'committee_feedback' | 'media_attention' | 'legislative_response' | 'public_awareness';
  value: number;
  description: string;
  attributionScore: number;
  recordedAt: string;
}

/**
 * Hook to fetch campaigns
 */
export function useCampaigns(filters?: {
  status?: string;
  bill_id?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.bill_id) params.append('bill_id', filters.bill_id);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await api.get(`/api/advocacy/campaigns?${params.toString()}`);
      return response.data.campaigns as Campaign[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch single campaign
 */
export function useCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');
      const response = await api.get(`/api/advocacy/campaigns/${campaignId}`);
      return response.data.campaign as Campaign;
    },
    enabled: !!campaignId,
  });
}

/**
 * Hook to create campaign
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Campaign>) => {
      logger.info('Creating campaign', { component: 'useCreateCampaign' });
      const response = await api.post('/api/advocacy/campaigns', data);
      return response.data.campaign as Campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      logger.info('Campaign created successfully', { component: 'useCreateCampaign' });
    },
    onError: (error) => {
      logger.error('Failed to create campaign', {
        component: 'useCreateCampaign',
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });
}

/**
 * Hook to update campaign
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Campaign> }) => {
      const response = await api.put(`/api/advocacy/campaigns/${id}`, data);
      return response.data.campaign as Campaign;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

/**
 * Hook to join campaign
 */
export function useJoinCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await api.post(`/api/advocacy/campaigns/${campaignId}/join`);
      return response.data;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['user-campaigns'] });
    },
  });
}

/**
 * Hook to leave campaign
 */
export function useLeaveCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await api.post(`/api/advocacy/campaigns/${campaignId}/leave`);
      return response.data;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['user-campaigns'] });
    },
  });
}

/**
 * Hook to fetch user actions
 */
export function useUserActions(userId: string | undefined, filters?: { status?: string }) {
  return useQuery({
    queryKey: ['user-actions', userId, filters],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);

      const response = await api.get(`/api/advocacy/users/${userId}/actions?${params.toString()}`);
      return response.data.actions as ActionItem[];
    },
    enabled: !!userId,
  });
}

/**
 * Hook to fetch campaign actions
 */
export function useCampaignActions(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-actions', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');
      const response = await api.get(`/api/advocacy/campaigns/${campaignId}/actions`);
      return response.data.actions as ActionItem[];
    },
    enabled: !!campaignId,
  });
}

/**
 * Hook to start action
 */
export function useStartAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const response = await api.post(`/api/advocacy/actions/${actionId}/start`);
      return response.data.action as ActionItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-actions'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-actions'] });
    },
  });
}

/**
 * Hook to complete action
 */
export function useCompleteAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionId,
      outcome,
      actualTimeMinutes,
    }: {
      actionId: string;
      outcome?: { successful: boolean; impactNotes?: string };
      actualTimeMinutes?: number;
    }) => {
      const response = await api.post(`/api/advocacy/actions/${actionId}/complete`, {
        outcome,
        actualTimeMinutes,
      });
      return response.data.action as ActionItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-actions'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-actions'] });
    },
  });
}

/**
 * Hook to fetch campaign metrics
 */
export function useCampaignMetrics(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-metrics', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');
      const response = await api.get(`/api/advocacy/campaigns/${campaignId}/metrics`);
      return response.data.metrics;
    },
    enabled: !!campaignId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook to fetch campaign impact
 */
export function useCampaignImpact(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-impact', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');
      const response = await api.get(`/api/advocacy/campaigns/${campaignId}/impact`);
      return response.data.metrics as ImpactMetric[];
    },
    enabled: !!campaignId,
  });
}

/**
 * Hook to record impact
 */
export function useRecordImpact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      campaignId,
      impactType,
      value,
      description,
      evidenceLinks,
    }: {
      campaignId: string;
      impactType: ImpactMetric['metricType'];
      value: number;
      description: string;
      evidenceLinks?: string[];
    }) => {
      const response = await api.post(`/api/advocacy/campaigns/${campaignId}/impact`, {
        impactType,
        value,
        description,
        evidenceLinks,
      });
      return response.data.impact as ImpactMetric;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-impact', variables.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics', variables.campaignId] });
    },
  });
}

/**
 * Hook to fetch user dashboard
 */
export function useUserDashboard(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-dashboard', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      const response = await api.get(`/api/advocacy/users/${userId}/dashboard`);
      return response.data.dashboard;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to fetch trending campaigns
 */
export function useTrendingCampaigns(limit: number = 10) {
  return useQuery({
    queryKey: ['trending-campaigns', limit],
    queryFn: async () => {
      const response = await api.get(`/api/advocacy/campaigns/trending?limit=${limit}`);
      return response.data.campaigns as Campaign[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

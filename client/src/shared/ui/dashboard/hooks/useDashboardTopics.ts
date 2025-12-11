/**
 * Dashboard topics management hook
 * Specialized hook for tracked topics functionality
 */

import type { TrackedTopic, TopicCategory } from '@client/types';
import { useState, useCallback } from 'react';

import { DashboardTopicError } from '@client/core/error';
import { validateTrackedTopic } from '@client/validation';

export interface UseDashboardTopicsResult {
  topics: TrackedTopic[];
  loading: boolean;
  error: DashboardTopicError | null;
  operations: {
    addTopic: (topic: Omit<TrackedTopic, 'id' | 'created_at'>) => Promise<void>;
    updateTopic: (topicId: string, updates: Partial<TrackedTopic>) => Promise<void>;
    removeTopic: (topicId: string) => Promise<void>;
    toggleTopicStatus: (topicId: string) => Promise<void>;
    filterByCategory: (category: TopicCategory) => TrackedTopic[];
    filterByStatus: (is_active: boolean) => TrackedTopic[];
    searchTopics: (query: string) => TrackedTopic[];
    sortByBillCount: () => TrackedTopic[];
    sortByName: () => TrackedTopic[];
  };
}

export function useDashboardTopics(initialTopics: TrackedTopic[] = []): UseDashboardTopicsResult {
  const [topics, setTopics] = useState<TrackedTopic[]>(initialTopics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DashboardTopicError | null>(null);

  const addTopic = useCallback(async (topicData: Omit<TrackedTopic, 'id' | 'created_at'>) => {
    setLoading(true);
    setError(null);

    try {
      const newTopic: TrackedTopic = {
        id: `topic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: topicData.name,
        category: topicData.category,
        billCount: topicData.billCount,
        is_active: topicData.is_active,
        description: topicData.description,
        keywords: topicData.keywords,
        created_at: new Date()
      };

      validateTrackedTopic(newTopic);

      // Check for duplicate topic names
      const existingTopic = topics.find(topic => 
        topic.name.toLowerCase() === newTopic.name.toLowerCase()
      );
      
      if (existingTopic) {
        throw new Error(`Topic "${newTopic.name}" already exists`);
      }

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setTopics(prev => [...prev, newTopic]);
    } catch (topicError) {
      const errorMessage = topicError instanceof Error ? topicError.message : 'Failed to add topic';
      const error = new DashboardTopicError('add', undefined, errorMessage);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [topics]);

  const updateTopic = useCallback(async (topicId: string, updates: Partial<TrackedTopic>) => {
    setLoading(true);
    setError(null);

    try {
      const topicIndex = topics.findIndex(topic => topic.id === topicId);
      if (topicIndex === -1) {
        throw new Error(`Topic with ID ${topicId} not found`);
      }

      const existingTopic = topics[topicIndex];
      if (!existingTopic) {
        throw new Error(`Topic with ID ${topicId} not found`);
      }
      
      const updatedTopic: TrackedTopic = {
        id: existingTopic.id,
        name: updates.name ?? existingTopic.name,
        category: updates.category ?? existingTopic.category,
        billCount: updates.billCount ?? existingTopic.billCount,
        is_active: updates.is_active ?? existingTopic.is_active,
        description: updates.description ?? existingTopic.description,
        keywords: updates.keywords ?? existingTopic.keywords,
        created_at: existingTopic.created_at
      };

      validateTrackedTopic(updatedTopic);

      // Check for duplicate names if name is being updated
      if (updates.name && updates.name !== topics[topicIndex]?.name) {
        const existingTopic = topics.find(topic => 
          topic.id !== topicId && topic.name.toLowerCase() === updates.name!.toLowerCase()
        );
        
        if (existingTopic) {
          throw new Error(`Topic "${updates.name}" already exists`);
        }
      }

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));

      setTopics(prev => prev.map(topic => 
        topic.id === topicId ? updatedTopic : topic
      ));
    } catch (topicError) {
      const errorMessage = topicError instanceof Error ? topicError.message : 'Failed to update topic';
      const error = new DashboardTopicError('update', topicId, errorMessage);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [topics]);

  const removeTopic = useCallback(async (topicId: string) => {
    setLoading(true);
    setError(null);

    try {
      const topicExists = topics.some(topic => topic.id === topicId);
      if (!topicExists) {
        throw new Error(`Topic with ID ${topicId} not found`);
      }

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));

      setTopics(prev => prev.filter(topic => topic.id !== topicId));
    } catch (topicError) {
      const errorMessage = topicError instanceof Error ? topicError.message : 'Failed to remove topic';
      const error = new DashboardTopicError('remove', topicId, errorMessage);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [topics]);

  const toggleTopicStatus = useCallback(async (topicId: string) => {
    try {
      const topic = topics.find(t => t.id === topicId);
      if (!topic) {
        throw new Error(`Topic with ID ${topicId} not found`);
      }

      await updateTopic(topicId, { is_active: !topic.is_active });
    } catch (topicError) {
      const errorMessage = topicError instanceof Error ? topicError.message : 'Failed to toggle topic';
      const error = new DashboardTopicError('toggle', topicId, errorMessage);
      setError(error);
      throw error;
    }
  }, [topics, updateTopic]);

  const filterByCategory = useCallback((category: TopicCategory): TrackedTopic[] => {
    return topics.filter(topic => topic.category === category);
  }, [topics]);

  const filterByStatus = useCallback((is_active: boolean): TrackedTopic[] => {
    return topics.filter(topic => topic.is_active === is_active);
  }, [topics]);

  const searchTopics = useCallback((query: string): TrackedTopic[] => {
    if (!query.trim()) return topics;
    
    const lowercaseQuery = query.toLowerCase();
    return topics.filter(topic => 
      topic.name.toLowerCase().includes(lowercaseQuery) ||
      topic.description?.toLowerCase().includes(lowercaseQuery) ||
      topic.keywords?.some(keyword => keyword.toLowerCase().includes(lowercaseQuery))
    );
  }, [topics]);

  const sortByBillCount = useCallback((): TrackedTopic[] => {
    return [...topics].sort((a, b) => b.billCount - a.billCount);
  }, [topics]);

  const sortByName = useCallback((): TrackedTopic[] => {
    return [...topics].sort((a, b) => a.name.localeCompare(b.name));
  }, [topics]);

  return {
    topics,
    loading,
    error,
    operations: {
      addTopic,
      updateTopic,
      removeTopic,
      toggleTopicStatus,
      filterByCategory,
      filterByStatus,
      searchTopics,
      sortByBillCount,
      sortByName
    }
  };
}


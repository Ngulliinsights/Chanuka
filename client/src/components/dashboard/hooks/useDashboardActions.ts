/**
 * Dashboard actions management hook
 * Specialized hook for action items functionality
 */

import { useState, useCallback } from 'react';
import type { ActionItem, ActionPriority } from '@client/types';
import { validateActionItem } from '@client/validation';
import { DashboardActionError } from '@client/errors';

export interface UseDashboardActionsResult {
  actions: ActionItem[];
  loading: boolean;
  error: DashboardActionError | null;
  operations: {
    addAction: (action: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
    updateAction: (actionId: string, updates: Partial<ActionItem>) => Promise<void>;
    completeAction: (actionId: string) => Promise<void>;
    deleteAction: (actionId: string) => Promise<void>;
    filterByPriority: (priority: ActionPriority) => ActionItem[];
    filterByCompletion: (completed: boolean) => ActionItem[];
    sortByDueDate: () => ActionItem[];
    sortByPriority: () => ActionItem[];
  };
}

export function useDashboardActions(initialActions: ActionItem[] = []): UseDashboardActionsResult {
  const [actions, setActions] = useState<ActionItem[]>(initialActions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<DashboardActionError | null>(null);

  const addAction = useCallback(async (actionData: Omit<ActionItem, 'id' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    setError(null);

    try {
      const newAction: ActionItem = {
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: actionData.title,
        description: actionData.description,
        priority: actionData.priority,
        due_date: actionData.due_date,
        category: actionData.category,
        bill_id: actionData.bill_id,
        completed: actionData.completed ?? false,
        created_at: new Date(),
        updated_at: new Date()
      };

      validateActionItem(newAction);

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));

      setActions(prev => [...prev, newAction]);
    } catch (actionError: any) {
      const error = new DashboardActionError('add', actionError?.message || 'Add action failed');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAction = useCallback(async (actionId: string, updates: Partial<ActionItem>) => {
    setLoading(true);
    setError(null);

    try {
      const actionIndex = actions.findIndex(action => action.id === actionId);
      if (actionIndex === -1) {
        throw new Error(`Action with ID ${actionId} not found`);
      }

      const existingAction = actions[actionIndex];
      if (!existingAction) {
        throw new Error(`Action with ID ${actionId} not found`);
      }
      
      const updatedAction: ActionItem = {
        id: existingAction.id,
        title: updates.title ?? existingAction.title,
        description: updates.description ?? existingAction.description,
        priority: updates.priority ?? existingAction.priority,
        due_date: updates.due_date ?? existingAction.due_date,
        category: updates.category ?? existingAction.category,
        bill_id: updates.bill_id ?? existingAction.bill_id,
        completed: updates.completed ?? existingAction.completed,
        created_at: existingAction.created_at,
        updated_at: new Date()
      };

      validateActionItem(updatedAction);

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));

      setActions(prev => prev.map(action => 
        action.id === actionId ? updatedAction : action
      ));
    } catch (actionError: any) {
      const error = new DashboardActionError('update', actionError?.message || 'Update action failed', { actionId });
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [actions]);

  const completeAction = useCallback(async (actionId: string) => {
    try {
      await updateAction(actionId, { completed: true });
    } catch (actionError: any) {
      const error = new DashboardActionError('complete', actionError?.message || 'Complete action failed', { actionId });
      setError(error);
      throw error;
    }
  }, [updateAction]);

  const deleteAction = useCallback(async (actionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const actionExists = actions.some(action => action.id === actionId);
      if (!actionExists) {
        throw new Error(`Action with ID ${actionId} not found`);
      }

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));

      setActions(prev => prev.filter(action => action.id !== actionId));
    } catch (actionError: any) {
      const error = new DashboardActionError('delete', actionError?.message || 'Delete action failed', { actionId });
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [actions]);

  const filterByPriority = useCallback((priority: ActionPriority): ActionItem[] => {
    return actions.filter(action => action.priority === priority);
  }, [actions]);

  const filterByCompletion = useCallback((completed: boolean): ActionItem[] => {
    return actions.filter(action => Boolean(action.completed) === completed);
  }, [actions]);

  const sortByDueDate = useCallback((): ActionItem[] => {
    return [...actions].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.getTime() - b.due_date.getTime();
    });
  }, [actions]);

  const sortByPriority = useCallback((): ActionItem[] => {
    const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
    return [...actions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [actions]);

  return {
    actions,
    loading,
    error,
    operations: {
      addAction,
      updateAction,
      completeAction,
      deleteAction,
      filterByPriority,
      filterByCompletion,
      sortByDueDate,
      sortByPriority
    }
  };
}


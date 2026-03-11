import { logger } from '@client/lib/utils/logger';

export interface ActivityItem {
  id: string;
  workspaceId: string;
  userId: string;
  userName: string;
  type: 'bill_added' | 'comment_added' | 'member_joined' | 'member_left' | 'collection_created' | 'workspace_updated';
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

class ActivityService {
  private readonly STORAGE_KEY = 'chanuka_workspace_activity';
  private readonly MAX_ITEMS = 100;

  getActivity(workspaceId: string): ActivityItem[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const all: ActivityItem[] = data ? JSON.parse(data) : [];
      return all.filter(a => a.workspaceId === workspaceId).slice(0, 50);
    } catch (error) {
      logger.error('Failed to load activity', { component: 'ActivityService' }, error);
      return [];
    }
  }

  addActivity(activity: Omit<ActivityItem, 'id' | 'timestamp'>): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const all: ActivityItem[] = data ? JSON.parse(data) : [];

      const item: ActivityItem = {
        ...activity,
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };

      all.unshift(item);
      const trimmed = all.slice(0, this.MAX_ITEMS);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      logger.error('Failed to save activity', { component: 'ActivityService' }, error);
    }
  }

  clearActivity(workspaceId: string): void {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      const all: ActivityItem[] = data ? JSON.parse(data) : [];
      const filtered = all.filter(a => a.workspaceId !== workspaceId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      logger.error('Failed to clear activity', { component: 'ActivityService' }, error);
    }
  }
}

export const activityService = new ActivityService();

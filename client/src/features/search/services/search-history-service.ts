import { logger } from '@client/lib/utils/logger';

export interface SearchHistoryItem {
  id: string;
  query: string;
  filters?: Record<string, any>;
  timestamp: string;
  resultCount?: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: Record<string, any>;
  alertsEnabled: boolean;
  createdAt: string;
}

class SearchHistoryService {
  private readonly HISTORY_KEY = 'chanuka_search_history';
  private readonly SAVED_KEY = 'chanuka_saved_searches';
  private readonly MAX_HISTORY = 20;

  getHistory(): SearchHistoryItem[] {
    try {
      const data = localStorage.getItem(this.HISTORY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to load search history', { component: 'SearchHistoryService' }, error);
      return [];
    }
  }

  addToHistory(query: string, filters?: Record<string, any>, resultCount?: number): void {
    if (!query.trim()) return;

    const history = this.getHistory();
    const item: SearchHistoryItem = {
      id: `search_${Date.now()}`,
      query: query.trim(),
      filters,
      timestamp: new Date().toISOString(),
      resultCount,
    };

    // Remove duplicates
    const filtered = history.filter(h => h.query !== item.query);
    
    // Add to beginning and limit size
    const updated = [item, ...filtered].slice(0, this.MAX_HISTORY);
    
    try {
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      logger.error('Failed to save search history', { component: 'SearchHistoryService' }, error);
    }
  }

  clearHistory(): void {
    localStorage.removeItem(this.HISTORY_KEY);
  }

  getSavedSearches(): SavedSearch[] {
    try {
      const data = localStorage.getItem(this.SAVED_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to load saved searches', { component: 'SearchHistoryService' }, error);
      return [];
    }
  }

  saveSearch(name: string, query: string, filters?: Record<string, any>, alertsEnabled = false): SavedSearch {
    const saved = this.getSavedSearches();
    const search: SavedSearch = {
      id: `saved_${Date.now()}`,
      name: name.trim(),
      query: query.trim(),
      filters,
      alertsEnabled,
      createdAt: new Date().toISOString(),
    };

    saved.push(search);
    
    try {
      localStorage.setItem(this.SAVED_KEY, JSON.stringify(saved));
      logger.info('Search saved', { component: 'SearchHistoryService', searchId: search.id });
    } catch (error) {
      logger.error('Failed to save search', { component: 'SearchHistoryService' }, error);
    }

    return search;
  }

  deleteSavedSearch(id: string): void {
    const saved = this.getSavedSearches();
    const filtered = saved.filter(s => s.id !== id);
    
    try {
      localStorage.setItem(this.SAVED_KEY, JSON.stringify(filtered));
    } catch (error) {
      logger.error('Failed to delete saved search', { component: 'SearchHistoryService' }, error);
    }
  }

  updateSavedSearch(id: string, updates: Partial<SavedSearch>): void {
    const saved = this.getSavedSearches();
    const index = saved.findIndex(s => s.id === id);
    
    if (index === -1) return;

    saved[index] = { ...saved[index], ...updates };
    
    try {
      localStorage.setItem(this.SAVED_KEY, JSON.stringify(saved));
    } catch (error) {
      logger.error('Failed to update saved search', { component: 'SearchHistoryService' }, error);
    }
  }
}

export const searchHistoryService = new SearchHistoryService();

import { logger } from '@server/infrastructure/observability';

export interface HistoryEntry {
  term: string;
  frequency: number;
  lastAccessed: Date;
}

export interface CleanupConfig {
  maxHistorySize: number;
  cleanupThreshold: number;
  minFrequency: number;
  maxAge: number; // in milliseconds
}

/**
 * Service responsible for managing and cleaning up search history efficiently
 */
export class HistoryCleanupService {
  private readonly defaultConfig: CleanupConfig = {
    maxHistorySize: 10000,
    cleanupThreshold: 0.1, // Remove 10% when threshold is reached
    minFrequency: 1,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  };

  /**
   * Clean up search history based on frequency and age
   */
  cleanupHistory(
    history: Map<string, HistoryEntry>,
    config: Partial<CleanupConfig> = {}
  ): Map<string, HistoryEntry> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    if (history.size <= finalConfig.maxHistorySize) {
      return history;
    }

    const startSize = history.size;
    const targetRemovalCount = Math.floor(
      finalConfig.maxHistorySize * finalConfig.cleanupThreshold
    );

    try {
      // Convert to array for sorting and filtering
      // Each entry already contains the `term` property, avoid duplicating
      // the `term` key via spread which causes a TS2783 warning.
      const entries = Array.from(history.entries()).map(([_term, entry]) => ({
        ...entry
      }));

      // Remove old entries first
      const now = Date.now();
      const recentEntries = entries.filter(
        entry => (now - entry.lastAccessed.getTime()) < finalConfig.maxAge
      );

      // Remove low-frequency entries
      const frequentEntries = recentEntries.filter(
        entry => entry.frequency >= finalConfig.minFrequency
      );

      // Sort by composite score (frequency + recency)
      const scoredEntries = frequentEntries.map(entry => ({
        ...entry,
        score: this.calculateEntryScore(entry, now)
      })).sort((a, b) => b.score - a.score);

      // Keep top entries
      const entriesToKeep = scoredEntries.slice(0, finalConfig.maxHistorySize - targetRemovalCount);

      // Rebuild the map
      const cleanedHistory = new Map<string, HistoryEntry>();
      entriesToKeep.forEach(entry => {
        cleanedHistory.set(entry.term, {
          term: entry.term,
          frequency: entry.frequency,
          lastAccessed: entry.lastAccessed
        });
      });

      const removedCount = startSize - cleanedHistory.size;
      logger.info({
        component: 'Search',
        originalSize: startSize,
        finalSize: cleanedHistory.size,
        removedEntries: removedCount
      }, 'Search history cleanup completed');

      return cleanedHistory;
    } catch (error) {
      logger.error({ component: 'Search', error }, 'Error during history cleanup');
      return history; // Return original on error
    }
  }

  /**
   * Update search history entry efficiently
   */
  updateHistoryEntry(
    history: Map<string, HistoryEntry>,
    term: string,
    config: Partial<CleanupConfig> = {}
  ): Map<string, HistoryEntry> {
    const sanitizedTerm = this.sanitizeTerm(term);
    if (!sanitizedTerm) return history;

    const now = new Date();
    const existing = history.get(sanitizedTerm);

    if (existing) {
      // Update existing entry
      history.set(sanitizedTerm, {
        term: sanitizedTerm,
        frequency: existing.frequency + 1,
        lastAccessed: now
      });
    } else {
      // Add new entry
      history.set(sanitizedTerm, {
        term: sanitizedTerm,
        frequency: 1,
        lastAccessed: now
      });
    }

    // Trigger cleanup if needed
    const finalConfig = { ...this.defaultConfig, ...config };
    if (history.size > finalConfig.maxHistorySize) {
      return this.cleanupHistory(history, config);
    }

    return history;
  }

  /**
   * Get popular terms from history with smart ranking
   */
  getPopularTerms(
    history: Map<string, HistoryEntry>,
    limit: number = 20
  ): string[] {
    const now = Date.now();
    
    return Array.from(history.values())
      .map(entry => ({
        ...entry,
        score: this.calculateEntryScore(entry, now)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(entry => entry.term);
  }

  /**
   * Get trending terms based on recent activity
   */
  getTrendingTerms(
    history: Map<string, HistoryEntry>,
    limit: number = 10,
    trendingWindow: number = 7 * 24 * 60 * 60 * 1000 // 7 days
  ): string[] {
    const now = Date.now();
    const windowStart = now - trendingWindow;

    return Array.from(history.values())
      .filter(entry => entry.lastAccessed.getTime() > windowStart)
      .sort((a, b) => {
        // Sort by recent frequency (frequency within trending window)
        const aRecency = Math.max(0, 1 - (now - a.lastAccessed.getTime()) / trendingWindow);
        const bRecency = Math.max(0, 1 - (now - b.lastAccessed.getTime()) / trendingWindow);
        
        return (b.frequency * bRecency) - (a.frequency * aRecency);
      })
      .slice(0, limit)
      .map(entry => entry.term);
  }

  /**
   * Merge multiple history maps efficiently
   */
  mergeHistories(
    histories: Map<string, HistoryEntry>[],
    config: Partial<CleanupConfig> = {}
  ): Map<string, HistoryEntry> {
    const merged = new Map<string, HistoryEntry>();

    histories.forEach(history => {
      history.forEach((entry, term) => {
        const existing = merged.get(term);
        
        if (existing) {
          // Merge entries by combining frequency and using latest access time
          merged.set(term, {
            term,
            frequency: existing.frequency + entry.frequency,
            lastAccessed: entry.lastAccessed > existing.lastAccessed 
              ? entry.lastAccessed 
              : existing.lastAccessed
          });
        } else {
          merged.set(term, { ...entry });
        }
      });
    });

    // Clean up merged history if it's too large
    return this.cleanupHistory(merged, config);
  }

  /**
   * Calculate composite score for history entry
   */
  private calculateEntryScore(entry: HistoryEntry, currentTime: number): number {
    const ageInMs = currentTime - entry.lastAccessed.getTime();
    const ageInDays = ageInMs / (24 * 60 * 60 * 1000);
    
    // Decay factor: newer entries get higher scores
    const decayFactor = Math.exp(-ageInDays / 7); // 7-day half-life
    
    // Frequency factor: more frequent terms get higher scores
    const frequencyFactor = Math.log(entry.frequency + 1);
    
    return frequencyFactor * decayFactor;
  }

  /**
   * Sanitize search term for history storage
   */
  private sanitizeTerm(term: string): string {
    return term
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 100);
  }

  /**
   * Export history for persistence
   */
  exportHistory(history: Map<string, HistoryEntry>): Record<string, HistoryEntry> {
    const exported: Record<string, HistoryEntry> = {};
    history.forEach((entry, term) => {
      exported[term] = entry;
    });
    return exported;
  }

  /**
   * Import history from persistence
   */
  importHistory(data: Record<string, HistoryEntry>): Map<string, HistoryEntry> {
    const history = new Map<string, HistoryEntry>();
    
    Object.entries(data).forEach(([term, entry]) => {
      // Ensure dates are properly deserialized
      history.set(term, {
        ...entry,
        lastAccessed: new Date(entry.lastAccessed)
      });
    });
    
    return history;
  }
}

export const historyCleanupService = new HistoryCleanupService();



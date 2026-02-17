/**
 * ShadowLedgerDashboard - Accountability and audit tracking dashboard
 * Swahili: "Shadow" = Hidden/Behind-the-scenes, "Ledger" = Record keeping
 */

export interface AuditEntry {
  id: string;
  timestamp: Date;
  actor: string;
  action: string;
  resource: string;
  status: 'success' | 'failure';
  details: Record<string, unknown>;
}

export interface AuditFilter {
  actor?: string;
  action?: string;
  resource?: string;
  status?: 'success' | 'failure';
  startDate?: Date;
  endDate?: Date;
}

export interface DashboardMetrics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  uniqueActors: number;
  timelineData: TimelinePoint[];
}

export interface TimelinePoint {
  timestamp: Date;
  count: number;
  successCount: number;
  failureCount: number;
}

export class ShadowLedgerDashboard {
  private entries: AuditEntry[] = [];
  private filters: AuditFilter = {};

  /**
   * Add an audit entry
   */
  addEntry(entry: AuditEntry): void {
    this.entries.push(entry);
  }

  /**
   * Get filtered entries
   */
  getEntries(filter?: AuditFilter): AuditEntry[] {
    if (!filter) {
      return [...this.entries];
    }

    return this.entries.filter(entry => {
      if (filter.actor && entry.actor !== filter.actor) return false;
      if (filter.action && entry.action !== filter.action) return false;
      if (filter.resource && entry.resource !== filter.resource) return false;
      if (filter.status && entry.status !== filter.status) return false;
      if (filter.startDate && entry.timestamp < filter.startDate) return false;
      if (filter.endDate && entry.timestamp > filter.endDate) return false;
      return true;
    });
  }

  /**
   * Get dashboard metrics
   */
  getMetrics(timeRange?: { startDate: Date; endDate: Date }): DashboardMetrics {
    const filteredEntries = timeRange
      ? this.entries.filter(
          e => e.timestamp >= timeRange.startDate && e.timestamp <= timeRange.endDate
        )
      : this.entries;

    const successfulActions = filteredEntries.filter(e => e.status === 'success').length;
    const failedActions = filteredEntries.filter(e => e.status === 'failure').length;
    const uniqueActors = new Set(filteredEntries.map(e => e.actor)).size;

    return {
      totalActions: filteredEntries.length,
      successfulActions,
      failedActions,
      uniqueActors,
      timelineData: this.generateTimeline(filteredEntries),
    };
  }

  /**
   * Get action summary by type
   */
  getActionSummary(): Record<string, number> {
    const summary: Record<string, number> = {};

    for (const entry of this.entries) {
      summary[entry.action] = (summary[entry.action] || 0) + 1;
    }

    return summary;
  }

  /**
   * Get actor activity summary
   */
  getActorActivitySummary(): Record<string, { actions: number; success: number; failure: number }> {
    const summary: Record<string, { actions: number; success: number; failure: number }> = {};

    for (const entry of this.entries) {
      if (!summary[entry.actor]) {
        summary[entry.actor] = { actions: 0, success: 0, failure: 0 };
      }

      summary[entry.actor].actions++;
      if (entry.status === 'success') {
        summary[entry.actor].success++;
      } else {
        summary[entry.actor].failure++;
      }
    }

    return summary;
  }

  /**
   * Get resource access summary
   */
  getResourceAccessSummary(): Record<string, number> {
    const summary: Record<string, number> = {};

    for (const entry of this.entries) {
      summary[entry.resource] = (summary[entry.resource] || 0) + 1;
    }

    return summary;
  }

  /**
   * Export audit trail
   */
  exportAuditTrail(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.entries, null, 2);
    }

    // CSV format
    const headers = ['ID', 'Timestamp', 'Actor', 'Action', 'Resource', 'Status'];
    const rows = [
      headers.join(','),
      ...this.entries.map(e =>
        [e.id, e.timestamp.toISOString(), e.actor, e.action, e.resource, e.status].join(',')
      ),
    ];

    return rows.join('\n');
  }

  /**
   * Clear all entries (use with caution)
   */
  clearEntries(): void {
    this.entries = [];
  }

  /**
   * Get entry count
   */
  getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Generate timeline data
   */
  private generateTimeline(entries: AuditEntry[]): TimelinePoint[] {
    if (entries.length === 0) return [];

    // Group by hour
    const timelineMap = new Map<string, TimelinePoint>();

    for (const entry of entries) {
      const hour = new Date(entry.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();

      if (!timelineMap.has(key)) {
        timelineMap.set(key, {
          timestamp: hour,
          count: 0,
          successCount: 0,
          failureCount: 0,
        });
      }

      const point = timelineMap.get(key)!;
      point.count++;
      if (entry.status === 'success') {
        point.successCount++;
      } else {
        point.failureCount++;
      }
    }

    return Array.from(timelineMap.values()).sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  }
}

/**
 * Create and configure a ShadowLedgerDashboard instance
 */
export function createShadowLedgerDashboard(): ShadowLedgerDashboard {
  return new ShadowLedgerDashboard();
}

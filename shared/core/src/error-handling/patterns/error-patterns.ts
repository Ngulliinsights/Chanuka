import { ErrorPattern, TrackedError } from '../core/types.js';

export class ErrorPatternManager {
  private patterns: Map<string, ErrorPattern> = new Map();
  private readonly MAX_PATTERNS = 1000;

  /**
   * Generate error fingerprint for grouping
   */
  generateFingerprint(message: string, stack?: string, category?: string): string {
    // Normalize error message by removing dynamic parts
    const normalizedMessage = message
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/\/[^\/\s]+\.(js|ts|jsx|tsx):\d+:\d+/g, '/FILE:LINE:COL') // Replace file paths
      .toLowerCase();

    // Use first few lines of stack trace for better grouping
    const stackLines = stack?.split('\n').slice(0, 3).join('\n') || '';
    const normalizedStack = stackLines
      .replace(/\d+/g, 'N')
      .replace(/\/[^\/\s]+\.(js|ts|jsx|tsx):\d+:\d+/g, '/FILE:LINE:COL');

    const combined = `${category || 'unknown'}:${normalizedMessage}:${normalizedStack}`;

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Track error pattern
   */
  trackError(error: TrackedError): void {
    const fingerprint = error.fingerprint;
    let pattern = this.patterns.get(fingerprint);

    if (!pattern) {
      pattern = {
        fingerprint,
        message: error.message,
        category: error.category,
        severity: error.severity,
        occurrences: 0,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        resolved: false,
        alertSent: false,
        alertThreshold: this.getAlertThreshold(error.severity)
      };
      this.patterns.set(fingerprint, pattern);
    }

    // Update pattern
    pattern.occurrences++;
    pattern.lastSeen = error.timestamp;
    if (error.severity === 'critical' || error.severity === 'high') {
      pattern.severity = error.severity; // Escalate severity if needed
    }

    // Prevent memory leaks
    if (this.patterns.size > this.MAX_PATTERNS) {
      this.cleanupOldPatterns();
    }
  }

  /**
   * Get error pattern by fingerprint
   */
  getPattern(fingerprint: string): ErrorPattern | null {
    return this.patterns.get(fingerprint) || null;
  }

  /**
   * Get all error patterns
   */
  getAllPatterns(resolved?: boolean): ErrorPattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => resolved === undefined || pattern.resolved === resolved)
      .sort((a, b) => b.occurrences - a.occurrences);
  }

  /**
   * Mark pattern as resolved
   */
  resolvePattern(fingerprint: string): boolean {
    const pattern = this.patterns.get(fingerprint);
    if (!pattern) return false;

    pattern.resolved = true;
    return true;
  }

  /**
   * Check if pattern should trigger alerts
   */
  shouldTriggerAlert(pattern: ErrorPattern): boolean {
    if (pattern.alertSent || pattern.resolved) return false;
    return pattern.occurrences >= pattern.alertThreshold;
  }

  /**
   * Mark alert as sent for pattern
   */
  markAlertSent(fingerprint: string): boolean {
    const pattern = this.patterns.get(fingerprint);
    if (!pattern) return false;

    pattern.alertSent = true;
    return true;
  }

  /**
   * Get alert threshold based on severity
   */
  private getAlertThreshold(severity: string): number {
    switch (severity) {
      case 'critical': return 1;
      case 'high': return 3;
      case 'medium': return 10;
      case 'low': return 50;
      default: return 10;
    }
  }

  /**
   * Clean up old patterns to prevent memory leaks
   */
  private cleanupOldPatterns(): void {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    const patternsToDelete: string[] = [];
    this.patterns.forEach((pattern, fingerprint) => {
      if (pattern.lastSeen < cutoffTime && pattern.resolved) {
        patternsToDelete.push(fingerprint);
      }
    });
    patternsToDelete.forEach(fingerprint => this.patterns.delete(fingerprint));

    // If still too many patterns, remove oldest resolved ones
    if (this.patterns.size > this.MAX_PATTERNS) {
      const resolvedPatterns = Array.from(this.patterns.entries())
        .filter(([_, pattern]) => pattern.resolved)
        .sort(([_, a], [__, b]) => a.lastSeen.getTime() - b.lastSeen.getTime())
        .slice(0, this.patterns.size - this.MAX_PATTERNS / 2);

      resolvedPatterns.forEach(([fingerprint]) => this.patterns.delete(fingerprint));
    }
  }
}
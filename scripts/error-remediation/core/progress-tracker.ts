/**
 * Progress Tracker for Error Remediation System
 * 
 * Tracks remediation progress across phases, records metrics,
 * and generates progress reports.
 */

import {
  FixPhase,
  BatchResult,
  RemediationStatus,
  PhaseStatus,
  ProgressReport,
  ErrorCategory
} from '../types';
import { RemediationConfig } from '../config';

export class ProgressTracker {
  private phaseProgress: Map<FixPhase, PhaseStatus>;
  private filesModified: Set<string>;
  private errorsByCategory: Map<ErrorCategory, number>;
  private startTime: Date;
  private currentPhase: FixPhase | null;
  private config: RemediationConfig;

  constructor(config: RemediationConfig) {
    this.config = config;
    this.phaseProgress = new Map();
    this.filesModified = new Set();
    this.errorsByCategory = new Map();
    this.startTime = new Date();
    this.currentPhase = null;
    
    // Initialize all phases as not started
    this.initializePhases();
  }

  /**
   * Initialize all phases with default status
   */
  private initializePhases(): void {
    const phases = [
      FixPhase.MODULE_LOCATION_DISCOVERY,
      FixPhase.IMPORT_PATH_UPDATES,
      FixPhase.TYPE_STANDARDIZATION,
      FixPhase.INTERFACE_COMPLETION,
      FixPhase.TYPE_SAFETY,
      FixPhase.IMPORT_CLEANUP_AND_VALIDATION
    ];

    for (const phase of phases) {
      this.phaseProgress.set(phase, {
        phase,
        status: 'not_started',
        errorsAtStart: 0,
        errorsFixed: 0,
        errorsRemaining: 0,
        batchesCompleted: 0,
        batchesTotal: 0
      });
    }
  }

  /**
   * Start tracking a phase
   */
  startPhase(phase: FixPhase, initialErrorCount: number, totalBatches: number): void {
    this.currentPhase = phase;
    
    const phaseStatus = this.phaseProgress.get(phase);
    if (phaseStatus) {
      phaseStatus.status = 'in_progress';
      phaseStatus.errorsAtStart = initialErrorCount;
      phaseStatus.errorsRemaining = initialErrorCount;
      phaseStatus.batchesTotal = totalBatches;
      phaseStatus.batchesCompleted = 0;
      phaseStatus.errorsFixed = 0;
    }
  }

  /**
   * Record progress for a phase after a batch completes
   */
  recordPhaseProgress(phase: FixPhase, result: BatchResult): void {
    const phaseStatus = this.phaseProgress.get(phase);
    if (!phaseStatus) {
      throw new Error(`Phase ${phase} not initialized`);
    }

    // Update batch progress
    phaseStatus.batchesCompleted += 1;
    
    // Update error counts
    phaseStatus.errorsFixed += result.errorsFixed;
    phaseStatus.errorsRemaining -= result.errorsFixed;
    phaseStatus.errorsRemaining += result.newErrors;

    // Track modified files
    if (result.validationResult?.errors) {
      result.validationResult.errors.forEach(error => {
        this.filesModified.add(error.file);
      });
    }

    // Update status based on completion
    if (phaseStatus.batchesCompleted >= phaseStatus.batchesTotal) {
      if (result.success && phaseStatus.errorsRemaining === 0) {
        phaseStatus.status = 'completed';
      } else if (!result.success) {
        phaseStatus.status = 'failed';
      }
    }
  }

  /**
   * Complete a phase
   */
  completePhase(phase: FixPhase, success: boolean): void {
    const phaseStatus = this.phaseProgress.get(phase);
    if (phaseStatus) {
      phaseStatus.status = success ? 'completed' : 'failed';
    }
    
    if (this.currentPhase === phase) {
      this.currentPhase = null;
    }
  }

  /**
   * Record error counts by category
   */
  recordErrorsByCategory(errorsByCategory: Map<ErrorCategory, number>): void {
    this.errorsByCategory = new Map(errorsByCategory);
  }

  /**
   * Get current remediation status
   */
  getStatus(): RemediationStatus {
    const totalErrors = this.calculateTotalErrors();
    const errorsFixed = this.calculateErrorsFixed();
    const errorsRemaining = totalErrors - errorsFixed;

    return {
      currentPhase: this.currentPhase || FixPhase.MODULE_LOCATION_DISCOVERY,
      totalErrors,
      errorsFixed,
      errorsRemaining,
      phaseProgress: new Map(this.phaseProgress)
    };
  }

  /**
   * Calculate total errors across all phases
   */
  private calculateTotalErrors(): number {
    let total = 0;
    for (const phaseStatus of this.phaseProgress.values()) {
      if (phaseStatus.errorsAtStart > total) {
        total = phaseStatus.errorsAtStart;
      }
    }
    return total;
  }

  /**
   * Calculate total errors fixed across all phases
   */
  private calculateErrorsFixed(): number {
    let fixed = 0;
    for (const phaseStatus of this.phaseProgress.values()) {
      if (phaseStatus.status === 'completed') {
        fixed += phaseStatus.errorsFixed;
      }
    }
    return fixed;
  }

  /**
   * Generate progress report
   */
  generateReport(): ProgressReport {
    const status = this.getStatus();
    const phaseDetails = Array.from(this.phaseProgress.values());

    return {
      summary: status,
      phaseDetails,
      errorsByCategory: new Map(this.errorsByCategory),
      filesModified: Array.from(this.filesModified),
      timestamp: new Date()
    };
  }

  /**
   * Generate formatted text report
   */
  generateTextReport(): string {
    const report = this.generateReport();
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('ERROR REMEDIATION PROGRESS REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Generated: ${report.timestamp.toISOString()}`);
    lines.push(`Duration: ${this.formatDuration(this.startTime, report.timestamp)}`);
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('-'.repeat(80));
    lines.push(`Total Errors: ${report.summary.totalErrors}`);
    lines.push(`Errors Fixed: ${report.summary.errorsFixed}`);
    lines.push(`Errors Remaining: ${report.summary.errorsRemaining}`);
    lines.push(`Progress: ${this.calculateProgressPercentage(report.summary)}%`);
    lines.push('');

    // Phase Details
    lines.push('PHASE PROGRESS');
    lines.push('-'.repeat(80));
    for (const phase of report.phaseDetails) {
      lines.push(`Phase ${phase.phase}: ${this.getPhaseNameString(phase.phase)}`);
      lines.push(`  Status: ${phase.status.toUpperCase()}`);
      lines.push(`  Errors at Start: ${phase.errorsAtStart}`);
      lines.push(`  Errors Fixed: ${phase.errorsFixed}`);
      lines.push(`  Errors Remaining: ${phase.errorsRemaining}`);
      lines.push(`  Batches: ${phase.batchesCompleted}/${phase.batchesTotal}`);
      lines.push('');
    }

    // Errors by Category
    if (report.errorsByCategory.size > 0) {
      lines.push('ERRORS BY CATEGORY');
      lines.push('-'.repeat(80));
      for (const [category, count] of report.errorsByCategory.entries()) {
        lines.push(`${category}: ${count}`);
      }
      lines.push('');
    }

    // Files Modified
    lines.push('FILES MODIFIED');
    lines.push('-'.repeat(80));
    lines.push(`Total Files: ${report.filesModified.length}`);
    if (report.filesModified.length > 0 && report.filesModified.length <= 20) {
      for (const file of report.filesModified) {
        lines.push(`  - ${file}`);
      }
    } else if (report.filesModified.length > 20) {
      lines.push(`  (${report.filesModified.length} files - too many to list)`);
    }
    lines.push('');

    lines.push('='.repeat(80));

    return lines.join('\n');
  }

  /**
   * Get phase name as string
   */
  private getPhaseNameString(phase: FixPhase): string {
    const names: Record<FixPhase, string> = {
      [FixPhase.MODULE_LOCATION_DISCOVERY]: 'Module Location Discovery',
      [FixPhase.IMPORT_PATH_UPDATES]: 'Import Path Updates',
      [FixPhase.TYPE_STANDARDIZATION]: 'Type Standardization',
      [FixPhase.INTERFACE_COMPLETION]: 'Interface Completion',
      [FixPhase.TYPE_SAFETY]: 'Type Safety',
      [FixPhase.IMPORT_CLEANUP_AND_VALIDATION]: 'Import Cleanup & Validation'
    };
    return names[phase] || `Phase ${phase}`;
  }

  /**
   * Calculate progress percentage
   */
  private calculateProgressPercentage(status: RemediationStatus): number {
    if (status.totalErrors === 0) return 100;
    return Math.round((status.errorsFixed / status.totalErrors) * 100);
  }

  /**
   * Format duration between two dates
   */
  private formatDuration(start: Date, end: Date): string {
    const durationMs = end.getTime() - start.getTime();
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Reset tracker to initial state
   */
  reset(): void {
    this.phaseProgress.clear();
    this.filesModified.clear();
    this.errorsByCategory.clear();
    this.startTime = new Date();
    this.currentPhase = null;
    this.initializePhases();
  }

  /**
   * Export progress data as JSON
   */
  exportJSON(): string {
    const report = this.generateReport();
    
    // Convert Maps to objects for JSON serialization
    const exportData = {
      summary: {
        ...report.summary,
        phaseProgress: Object.fromEntries(report.summary.phaseProgress)
      },
      phaseDetails: report.phaseDetails,
      errorsByCategory: Object.fromEntries(report.errorsByCategory),
      filesModified: report.filesModified,
      timestamp: report.timestamp.toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }
}

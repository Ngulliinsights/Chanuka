/**
 * Unit tests for ProgressTracker
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProgressTracker } from '../../core/progress-tracker';
import { testConfig } from '../setup';
import { FixPhase } from '../../types';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker(testConfig);
  });

  it('should initialize with config', () => {
    expect(tracker).toBeDefined();
  });

  it('should return initial status', () => {
    const status = tracker.getStatus();
    
    expect(status.totalErrors).toBe(0);
    expect(status.errorsFixed).toBe(0);
    expect(status.errorsRemaining).toBe(0);
    expect(status.currentPhase).toBe(FixPhase.MODULE_LOCATION_DISCOVERY);
  });

  it('should generate progress report', () => {
    const report = tracker.generateReport();
    
    expect(report.summary).toBeDefined();
    expect(report.phaseDetails).toHaveLength(6);
    expect(report.filesModified).toEqual([]);
    expect(report.timestamp).toBeInstanceOf(Date);
  });
});

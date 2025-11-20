/**
 * Progress calculation and management utilities
 * Following navigation component patterns for utility organization
 */

import { LoadingProgress, LoadingStage } from '@client/types';
import { validateLoadingProgress } from '../validation';

/**
 * Progress calculation utilities
 */

export function calculateStageProgress(
  stages: LoadingStage[],
  currentStageIndex: number,
  currentStageProgress: number = 0
): number {
  if (stages.length === 0) return 0;
  if (currentStageIndex >= stages.length) return 100;
  
  const completedStages = currentStageIndex;
  const totalStages = stages.length;
  const stageWeight = 100 / totalStages;
  
  const completedProgress = completedStages * stageWeight;
  const currentProgress = (currentStageProgress / 100) * stageWeight;
  
  return Math.min(100, completedProgress + currentProgress);
}

export function calculateWeightedProgress(
  items: Array<{ weight: number; progress: number }>
): number {
  if (items.length === 0) return 0;
  
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = items.reduce((sum, item) => {
    return sum + (item.progress * item.weight);
  }, 0);
  
  return Math.min(100, weightedSum / totalWeight);
}

export function calculateAverageProgress(progresses: number[]): number {
  if (progresses.length === 0) return 0;
  
  const sum = progresses.reduce((acc, progress) => acc + progress, 0);
  return sum / progresses.length;
}

/**
 * Progress smoothing and animation utilities
 */

export function smoothProgress(
  currentProgress: number,
  targetProgress: number,
  smoothingFactor: number = 0.1
): number {
  const difference = targetProgress - currentProgress;
  return currentProgress + (difference * smoothingFactor);
}

export function createProgressAnimator(
  onUpdate: (progress: number) => void,
  duration: number = 1000,
  easing: (t: number) => number = (t) => t
) {
  let startTime: number;
  let startProgress: number;
  let targetProgress: number;
  let animationId: number;

  const animate = (timestamp: number) => {
    if (!startTime) {
      startTime = timestamp;
    }

    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    
    const currentProgress = startProgress + (targetProgress - startProgress) * easedProgress;
    onUpdate(currentProgress);

    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    }
  };

  return {
    start: (from: number, to: number) => {
      startProgress = from;
      targetProgress = to;
      startTime = 0;
      animationId = requestAnimationFrame(animate);
    },
    stop: () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    }
  };
}

/**
 * Progress validation and normalization
 */

export function normalizeProgress(progress: number): number {
  return Math.min(100, Math.max(0, progress));
}

export function validateProgressRange(progress: number, min: number = 0, max: number = 100): boolean {
  return progress >= min && progress <= max;
}

export function clampProgress(progress: number, min: number = 0, max: number = 100): number {
  return Math.min(max, Math.max(min, progress));
}

/**
 * Progress formatting utilities
 */

export function formatProgressPercentage(progress: number, decimals: number = 0): string {
  return `${progress.toFixed(decimals)}%`;
}

export function formatProgressFraction(loaded: number, total: number): string {
  return `${loaded}/${total}`;
}

export function formatProgressWithUnits(
  loaded: number,
  total: number,
  unit: string = 'items'
): string {
  return `${loaded} of ${total} ${unit}`;
}

export function formatProgressTime(
  progress: number,
  startTime: number,
  estimateTotal: boolean = true
): {
  elapsed: string;
  remaining?: string;
  estimated?: string;
} {
  const elapsed = Date.now() - startTime;
  const elapsedSeconds = Math.floor(elapsed / 1000);
  
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const result = {
    elapsed: formatTime(elapsedSeconds),
  } as any;

  if (estimateTotal && progress > 0 && progress < 100) {
    const estimatedTotal = (elapsed / progress) * 100;
    const remaining = estimatedTotal - elapsed;
    
    result.remaining = formatTime(Math.floor(remaining / 1000));
    result.estimated = formatTime(Math.floor(estimatedTotal / 1000));
  }

  return result;
}

/**
 * Progress state management
 */

export class ProgressTracker {
  private progress: number = 0;
  private stages: LoadingStage[] = [];
  private currentStageIndex: number = 0;
  private stageProgress: number = 0;
  private listeners: Array<(progress: number) => void> = [];

  constructor(stages: LoadingStage[] = []) {
    this.stages = stages;
  }

  public setStages(stages: LoadingStage[]): void {
    this.stages = stages;
    this.currentStageIndex = 0;
    this.stageProgress = 0;
    this.updateProgress();
  }

  public nextStage(): void {
    if (this.currentStageIndex < this.stages.length - 1) {
      this.currentStageIndex++;
      this.stageProgress = 0;
      this.updateProgress();
    }
  }

  public setStageProgress(progress: number): void {
    this.stageProgress = clampProgress(progress);
    this.updateProgress();
  }

  public setOverallProgress(progress: number): void {
    this.progress = clampProgress(progress);
    this.notifyListeners();
  }

  public complete(): void {
    this.progress = 100;
    this.currentStageIndex = this.stages.length;
    this.stageProgress = 100;
    this.notifyListeners();
  }

  public reset(): void {
    this.progress = 0;
    this.currentStageIndex = 0;
    this.stageProgress = 0;
    this.notifyListeners();
  }

  public getProgress(): number {
    return this.progress;
  }

  public getCurrentStage(): LoadingStage | null {
    return this.stages[this.currentStageIndex] || null;
  }

  public getStageProgress(): number {
    return this.stageProgress;
  }

  public isComplete(): boolean {
    return this.progress >= 100;
  }

  public addListener(listener: (progress: number) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private updateProgress(): void {
    if (this.stages.length > 0) {
      this.progress = calculateStageProgress(
        this.stages,
        this.currentStageIndex,
        this.stageProgress
      );
    }
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.progress));
  }
}

/**
 * Multi-progress aggregation
 */

export class MultiProgressTracker {
  private trackers: Map<string, ProgressTracker> = new Map();
  private weights: Map<string, number> = new Map();
  private listeners: Array<(progress: number) => void> = [];

  public addTracker(id: string, tracker: ProgressTracker, weight: number = 1): void {
    this.trackers.set(id, tracker);
    this.weights.set(id, weight);
    
    tracker.addListener(() => this.updateAggregateProgress());
  }

  public removeTracker(id: string): void {
    this.trackers.delete(id);
    this.weights.delete(id);
    this.updateAggregateProgress();
  }

  public getAggregateProgress(): number {
    const items = Array.from(this.trackers.entries()).map(([id, tracker]) => ({
      weight: this.weights.get(id) || 1,
      progress: tracker.getProgress(),
    }));

    return calculateWeightedProgress(items);
  }

  public addListener(listener: (progress: number) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private updateAggregateProgress(): void {
    const progress = this.getAggregateProgress();
    this.listeners.forEach(listener => listener(progress));
  }
}

/**
 * Progress estimation utilities
 */

export function estimateRemainingTime(
  progress: number,
  startTime: number
): number | null {
  if (progress <= 0 || progress >= 100) return null;
  
  const elapsed = Date.now() - startTime;
  const rate = progress / elapsed; // progress per millisecond
  const remaining = (100 - progress) / rate;
  
  return remaining;
}

export function estimateCompletionTime(
  progress: number,
  startTime: number
): number | null {
  const remaining = estimateRemainingTime(progress, startTime);
  return remaining ? Date.now() + remaining : null;
}

export function createProgressEstimator(windowSize: number = 10) {
  const samples: Array<{ time: number; progress: number }> = [];
  
  return {
    addSample: (progress: number) => {
      samples.push({ time: Date.now(), progress });
      if (samples.length > windowSize) {
        samples.shift();
      }
    },
    
    estimateRemainingTime: (): number | null => {
      if (samples.length < 2) return null;
      
      const recent = samples.slice(-Math.min(5, samples.length));
      const oldest = recent[0];
      const newest = recent[recent.length - 1];
      
      if (!oldest || !newest) return null;
      
      const timeDiff = newest.time - oldest.time;
      const progressDiff = newest.progress - oldest.progress;
      
      if (progressDiff <= 0 || newest.progress >= 100) return null;
      
      const rate = progressDiff / timeDiff;
      const remaining = (100 - newest.progress) / rate;
      
      return remaining;
    },
    
    getAverageRate: (): number | null => {
      if (samples.length < 2) return null;
      
      const first = samples[0];
      const last = samples[samples.length - 1];
      
      if (!first || !last) return null;
      
      const timeDiff = last.time - first.time;
      const progressDiff = last.progress - first.progress;
      
      return timeDiff > 0 ? progressDiff / timeDiff : null;
    }
  };
}


import { EventEmitter } from 'events';
import { Logger } from '../logging';
import { logger } from '../../shared/core/src/utils/logger';
import {
  ProgressState,
  ProgressMetrics,
  ResourceUsage,
  PerformanceMetrics,
  ModernizationPhase,
  TaskStatus
} from './types';

export interface ProgressTrackerOptions {
  config: {
    enabled: boolean;
    updateInterval: number;
    persistState: boolean;
    notifications: boolean;
  };
  logger: Logger;
}

export class ProgressTracker extends EventEmitter {
  private readonly config: ProgressTrackerOptions['config'];
  private readonly logger: Logger;
  private currentState: ProgressState | null = null;
  private taskProgress: Map<string, number> = new Map();
  private phaseStartTimes: Map<ModernizationPhase, Date> = new Map();
  private stepDurations: number[] = [];
  private updateTimer?: NodeJS.Timeout;
  private resourceMonitor?: NodeJS.Timeout;

  constructor(options: ProgressTrackerOptions) {
    super();
    this.config = options.config;
    this.logger = options.logger;

    if (this.config.enabled) {
      this.startProgressUpdates();
      this.startResourceMonitoring();
    }
  }

  /**
   * Initialize progress tracking for a task
   */
  public initializeTask(
    taskId: string,
    phase: ModernizationPhase,
    totalSteps: number,
    estimatedDuration?: number
  ): void {
    if (!this.config.enabled) return;

    const now = new Date();
    this.phaseStartTimes.set(phase, now);

    this.currentState = {
      taskId,
      phase,
      overallProgress: 0,
      currentStep: 'Initializing...',
      stepsCompleted: 0,
      totalSteps,
      startTime: now,
      estimatedCompletion: estimatedDuration 
        ? new Date(now.getTime() + estimatedDuration * 1000)
        : undefined,
      metrics: this.initializeMetrics()
    };

    this.taskProgress.set(taskId, 0);
    this.logger.info({ 
      taskId, 
      phase, 
      totalSteps,
      estimatedDuration 
    }, 'Progress tracking initialized');

    this.emit('progress:initialized', this.currentState);
  }

  /**
   * Update progress for a specific task
   */
  public updateTaskProgress(taskId: string, progress: number, currentStep?: string): void {
    if (!this.config.enabled || !this.currentState) return;

    const clampedProgress = Math.max(0, Math.min(100, progress));
    this.taskProgress.set(taskId, clampedProgress);

    if (this.currentState.taskId === taskId) {
      const previousProgress = this.currentState.overallProgress;
      this.currentState.overallProgress = clampedProgress;
      
      if (currentStep) {
        this.currentState.currentStep = currentStep;
      }

      // Update steps completed based on progress
      this.currentState.stepsCompleted = Math.floor(
        (clampedProgress / 100) * this.currentState.totalSteps
      );

      // Track step duration if progress increased
      if (clampedProgress > previousProgress) {
        const stepDuration = this.calculateStepDuration();
        if (stepDuration > 0) {
          this.stepDurations.push(stepDuration);
        }
      }

      // Update estimated completion time
      this.updateEstimatedCompletion();

      // Update metrics
      this.updateMetrics();

      this.logger.debug({ 
        taskId, 
        progress: clampedProgress,
        currentStep 
      }, 'Task progress updated');

      this.emit('progress:updated', this.currentState);
    }
  }

  /**
   * Mark a step as completed
   */
  public completeStep(stepName: string, duration?: number): void {
    if (!this.config.enabled || !this.currentState) return;

    this.currentState.stepsCompleted++;
    this.currentState.overallProgress = Math.min(
      100,
      (this.currentState.stepsCompleted / this.currentState.totalSteps) * 100
    );

    if (duration) {
      this.stepDurations.push(duration);
    }

    this.updateMetrics();
    this.updateEstimatedCompletion();

    this.logger.info({ 
      stepName, 
      stepsCompleted: this.currentState.stepsCompleted,
      totalSteps: this.currentState.totalSteps,
      overallProgress: this.currentState.overallProgress 
    }, 'Step completed');

    this.emit('step:completed', {
      stepName,
      stepsCompleted: this.currentState.stepsCompleted,
      totalSteps: this.currentState.totalSteps,
      overallProgress: this.currentState.overallProgress
    });
  }

  /**
   * Update the current phase
   */
  public updatePhase(phase: ModernizationPhase, currentStep?: string): void {
    if (!this.config.enabled || !this.currentState) return;

    const previousPhase = this.currentState.phase;
    this.currentState.phase = phase;
    this.phaseStartTimes.set(phase, new Date());

    if (currentStep) {
      this.currentState.currentStep = currentStep;
    }

    this.logger.info({ 
      previousPhase, 
      newPhase: phase,
      currentStep 
    }, 'Phase updated');

    this.emit('phase:changed', {
      previousPhase,
      newPhase: phase,
      currentStep
    });
  }

  /**
   * Get current progress state
   */
  public getCurrentState(): ProgressState | null {
    return this.currentState ? { ...this.currentState } : null;
  }

  /**
   * Get progress for a specific task
   */
  public getTaskProgress(taskId: string): number {
    return this.taskProgress.get(taskId) || 0;
  }

  /**
   * Get all task progress
   */
  public getAllTaskProgress(): Map<string, number> {
    return new Map(this.taskProgress);
  }

  /**
   * Reset progress tracking
   */
  public reset(): void {
    this.currentState = null;
    this.taskProgress.clear();
    this.phaseStartTimes.clear();
    this.stepDurations = [];

    this.logger.info({}, 'Progress tracking reset');
    this.emit('progress:reset');
  }

  /**
   * Finalize progress tracking
   */
  public finalize(status: TaskStatus): void {
    if (!this.currentState) return;

    this.currentState.overallProgress = status === TaskStatus.COMPLETED ? 100 : this.currentState.overallProgress;
    this.updateMetrics();

    const finalState = { ...this.currentState };
    const duration = Date.now() - this.currentState.startTime.getTime();

    this.logger.info({ 
      taskId: this.currentState.taskId,
      status,
      finalProgress: this.currentState.overallProgress,
      duration 
    }, 'Progress tracking finalized');

    this.emit('progress:finalized', {
      state: finalState,
      status,
      duration
    });

    if (this.config.persistState) {
      this.persistState(finalState, status);
    }
  }

  /**
   * Start automatic progress updates
   */
  private startProgressUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      if (this.currentState) {
        this.updateMetrics();
        this.emit('progress:updated', this.currentState);
      }
    }, this.config.updateInterval);
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
    }

    this.resourceMonitor = setInterval(() => {
      if (this.currentState) {
        this.updateResourceUsage();
      }
    }, this.config.updateInterval * 2); // Monitor resources less frequently
  }

  /**
   * Stop all monitoring
   */
  public stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = undefined;
    }

    this.logger.info({}, 'Progress tracking stopped');
  }

  private initializeMetrics(): ProgressMetrics {
    return {
      throughput: 0,
      errorRate: 0,
      resourceUsage: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0
      },
      performance: {
        averageStepDuration: 0,
        slowestStep: '',
        fastestStep: '',
        bottlenecks: []
      }
    };
  }

  private updateMetrics(): void {
    if (!this.currentState) return;

    // Update throughput (steps per minute)
    const elapsedMinutes = (Date.now() - this.currentState.startTime.getTime()) / (1000 * 60);
    this.currentState.metrics.throughput = elapsedMinutes > 0 
      ? this.currentState.stepsCompleted / elapsedMinutes 
      : 0;

    // Update performance metrics
    this.updatePerformanceMetrics();

    // Error rate would be calculated based on failed operations
    // For now, we'll keep it at 0 as we don't track errors here
    this.currentState.metrics.errorRate = 0;
  }

  private updatePerformanceMetrics(): void {
    if (!this.currentState || this.stepDurations.length === 0) return;

    const performance = this.currentState.metrics.performance;

    // Calculate average step duration
    performance.averageStepDuration = this.stepDurations.reduce((sum, duration) => sum + duration, 0) / this.stepDurations.length;

    // Find slowest and fastest steps (simplified - would need step names)
    const maxDuration = Math.max(...this.stepDurations);
    const minDuration = Math.min(...this.stepDurations);
    
    performance.slowestStep = `Step with ${maxDuration}s duration`;
    performance.fastestStep = `Step with ${minDuration}s duration`;

    // Identify bottlenecks (steps taking significantly longer than average)
    const threshold = performance.averageStepDuration * 1.5;
    const slowSteps = this.stepDurations.filter(duration => duration > threshold);
    performance.bottlenecks = slowSteps.length > 0 
      ? [`${slowSteps.length} steps taking longer than ${threshold.toFixed(2)}s`]
      : [];
  }

  private updateResourceUsage(): void {
    if (!this.currentState) return;

    // Get current resource usage
    const resourceUsage = this.getCurrentResourceUsage();
    this.currentState.metrics.resourceUsage = resourceUsage;
  }

  private getCurrentResourceUsage(): ResourceUsage {
    // In a real implementation, this would use system monitoring libraries
    // For now, we'll return simulated values
    return {
      cpu: Math.random() * 100, // 0-100%
      memory: process.memoryUsage().heapUsed / 1024 / 1024, // MB
      disk: 0, // Would monitor disk I/O
      network: 0 // Would monitor network I/O
    };
  }

  private calculateStepDuration(): number {
    // Calculate duration since last progress update
    // This is simplified - in reality, we'd track individual step start times
    return this.stepDurations.length > 0 
      ? Date.now() / 1000 - this.stepDurations[this.stepDurations.length - 1]
      : 0;
  }

  private updateEstimatedCompletion(): void {
    if (!this.currentState || this.currentState.overallProgress === 0) return;

    const elapsedTime = Date.now() - this.currentState.startTime.getTime();
    const progressRatio = this.currentState.overallProgress / 100;
    const estimatedTotalTime = elapsedTime / progressRatio;
    const remainingTime = estimatedTotalTime - elapsedTime;

    this.currentState.estimatedCompletion = new Date(Date.now() + remainingTime);
  }

  private async persistState(state: ProgressState, status: TaskStatus): Promise<void> {
    try {
      // In a real implementation, this would save to a file or database
      const persistedData = {
        state,
        status,
        timestamp: new Date().toISOString(),
        taskProgress: Object.fromEntries(this.taskProgress),
        stepDurations: this.stepDurations
      };

      this.logger.debug({ 
        taskId: state.taskId,
        status,
        progress: state.overallProgress 
      }, 'Progress state persisted');

      // Could save to .modernization-progress.json or similar
    } catch (error) {
      this.logger.error(error, 'Failed to persist progress state');
    }
  }

  /**
   * Load persisted state (for resuming interrupted operations)
   */
  public async loadPersistedState(taskId: string): Promise<ProgressState | null> {
    try {
      // In a real implementation, this would load from a file or database
      this.logger.debug({ taskId }, 'Loading persisted state');
      return null; // No persisted state found
    } catch (error) {
      this.logger.error(error, 'Failed to load persisted state');
      return null;
    }
  }

  /**
   * Get progress summary for reporting
   */
  public getProgressSummary(): {
    currentTask: string | null;
    phase: ModernizationPhase | null;
    overallProgress: number;
    stepsCompleted: number;
    totalSteps: number;
    elapsedTime: number;
    estimatedTimeRemaining: number | null;
    throughput: number;
    resourceUsage: ResourceUsage;
  } {
    if (!this.currentState) {
      return {
        currentTask: null,
        phase: null,
        overallProgress: 0,
        stepsCompleted: 0,
        totalSteps: 0,
        elapsedTime: 0,
        estimatedTimeRemaining: null,
        throughput: 0,
        resourceUsage: { cpu: 0, memory: 0, disk: 0, network: 0 }
      };
    }

    const elapsedTime = Date.now() - this.currentState.startTime.getTime();
    const estimatedTimeRemaining = this.currentState.estimatedCompletion
      ? this.currentState.estimatedCompletion.getTime() - Date.now()
      : null;

    return {
      currentTask: this.currentState.taskId,
      phase: this.currentState.phase,
      overallProgress: this.currentState.overallProgress,
      stepsCompleted: this.currentState.stepsCompleted,
      totalSteps: this.currentState.totalSteps,
      elapsedTime,
      estimatedTimeRemaining,
      throughput: this.currentState.metrics.throughput,
      resourceUsage: this.currentState.metrics.resourceUsage
    };
  }
}







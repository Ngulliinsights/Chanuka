/**
 * Progress tracking utilities for loading operations
 */

import { ProgressiveStage } from '@client/shared/types';

/**
 * Progress tracker for multi-stage operations
 */
export class ProgressTracker {
    private stages: ProgressiveStage[];
    private currentStageIndex: number = -1;
    private stageProgress: number = 0;

    constructor(stages: ProgressiveStage[]) {
        this.stages = stages;
    }

    nextStage(): void {
        if (this.currentStageIndex < this.stages.length - 1) {
            this.currentStageIndex++;
            this.stageProgress = 0;
        }
    }

    setStageProgress(progress: number): void {
        this.stageProgress = Math.max(0, Math.min(100, progress));
    }

    getCurrentStage(): ProgressiveStage | null {
        return this.currentStageIndex >= 0 && this.currentStageIndex < this.stages.length
            ? this.stages[this.currentStageIndex]
            : null;
    }

    getOverallProgress(): number {
        if (this.stages.length === 0) return 100;
        if (this.currentStageIndex < 0) return 0;

        const completedStages = this.currentStageIndex;
        const currentStageContribution = this.stageProgress / 100;

        return ((completedStages + currentStageContribution) / this.stages.length) * 100;
    }

    reset(): void {
        this.currentStageIndex = -1;
        this.stageProgress = 0;
    }

    isComplete(): boolean {
        return this.currentStageIndex >= this.stages.length - 1 && this.stageProgress >= 100;
    }
}

/**
 * Calculate stage progress for progressive loading
 */
export function calculateStageProgress(
    stages: ProgressiveStage[],
    currentStageIndex: number,
    stageProgress: number
): number {
    if (stages.length === 0) return 100;
    if (currentStageIndex < 0) return 0;

    const completedStages = Math.max(0, currentStageIndex);
    const currentStageContribution = Math.max(0, Math.min(100, stageProgress)) / 100;

    return ((completedStages + currentStageContribution) / stages.length) * 100;
}

/**
 * Estimate time remaining based on progress and elapsed time
 */
export function estimateTimeRemaining(
    progress: number,
    elapsedTime: number,
    totalEstimatedTime?: number
): number | null {
    if (progress <= 0 || progress >= 100) return null;

    if (totalEstimatedTime) {
        // Use provided estimate
        const expectedTotalTime = totalEstimatedTime;
        const expectedTimeSoFar = (progress / 100) * expectedTotalTime;
        return Math.max(0, expectedTotalTime - elapsedTime);
    } else {
        // Estimate based on current progress
        const progressRatio = progress / 100;
        const estimatedTotalTime = elapsedTime / progressRatio;
        return Math.max(0, estimatedTotalTime - elapsedTime);
    }
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(milliseconds: number): string {
    if (milliseconds < 1000) return 'Less than 1s';
    if (milliseconds < 60000) return `${Math.ceil(milliseconds / 1000)}s`;

    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.ceil((milliseconds % 60000) / 1000);

    if (minutes < 60) {
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Calculate progress percentage from loaded/total
 */
export function calculateProgressPercentage(loaded: number, total: number): number {
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, (loaded / total) * 100));
}

/**
 * Smooth progress updates to prevent jarring jumps
 */
export class SmoothProgressTracker {
    private currentProgress: number = 0;
    private targetProgress: number = 0;
    private smoothingFactor: number = 0.1;

    constructor(smoothingFactor: number = 0.1) {
        this.smoothingFactor = Math.max(0.01, Math.min(1, smoothingFactor));
    }

    updateProgress(target: number): void {
        this.targetProgress = Math.max(0, Math.min(100, target));
    }

    getCurrentProgress(): number {
        if (Math.abs(this.currentProgress - this.targetProgress) < 0.1) {
            this.currentProgress = this.targetProgress;
        } else {
            this.currentProgress += (this.targetProgress - this.currentProgress) * this.smoothingFactor;
        }

        return Math.round(this.currentProgress * 100) / 100;
    }

    jumpToProgress(progress: number): void {
        this.currentProgress = this.targetProgress = Math.max(0, Math.min(100, progress));
    }

    isAtTarget(): boolean {
        return Math.abs(this.currentProgress - this.targetProgress) < 0.1;
    }
}

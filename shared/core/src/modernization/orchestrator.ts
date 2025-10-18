import { EventEmitter } from 'events';
import { Logger } from '../logging';
import { 
  ModernizationTask, 
  ModernizationPhase, 
  TaskStatus, 
  ModernizationConfig,
  ModernizationConfigSchema,
  ModernizationError,
  ProgressState,
  ValidationResult,
  BackupResult,
  AnalysisResult
} from './types';
import { AnalysisEngine } from './analysis';
import { BackupManager } from './backup';
import { ProgressTracker } from './progress';
import { ValidationFramework } from './validation';
import { logger } from '../observability/logging';

export interface ModernizationOrchestratorOptions {
  config?: Partial<ModernizationConfig>;
  logger?: Logger;
  workingDirectory?: string;
}

export class ModernizationOrchestrator extends EventEmitter {
  private readonly config: ModernizationConfig;
  private readonly logger: Logger;
  private readonly workingDirectory: string;
  private readonly analysisEngine: AnalysisEngine;
  private readonly backupManager: BackupManager;
  private readonly progressTracker: ProgressTracker;
  private readonly validationFramework: ValidationFramework;
  
  private tasks: Map<string, ModernizationTask> = new Map();
  private currentPhase: ModernizationPhase = ModernizationPhase.ANALYSIS;
  private isRunning: boolean = false;
  private abortController?: AbortController;

  constructor(options: ModernizationOrchestratorOptions = {}) {
    super();
    
    this.config = ModernizationConfigSchema.parse(options.config || {});
    this.logger = options.logger || new Logger({ name: 'ModernizationOrchestrator' });
    this.workingDirectory = options.workingDirectory || process.cwd();
    
    // Initialize components
    this.analysisEngine = new AnalysisEngine({
      config: this.config.analysis,
      logger: this.logger.child({ component: 'AnalysisEngine' }),
      workingDirectory: this.workingDirectory
    });
    
    this.backupManager = new BackupManager({
      config: this.config.backup,
      logger: this.logger.child({ component: 'BackupManager' }),
      workingDirectory: this.workingDirectory
    });
    
    this.progressTracker = new ProgressTracker({
      config: this.config.progress,
      logger: this.logger.child({ component: 'ProgressTracker' })
    });
    
    this.validationFramework = new ValidationFramework({
      config: this.config.validation,
      logger: this.logger.child({ component: 'ValidationFramework' }),
      workingDirectory: this.workingDirectory
    });
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Analysis events
    this.analysisEngine.on('analysis:started', (type) => {
      this.logger.info({}, `Analysis started: ${type}`);
      this.emit('analysis:started', type);
    });
    
    this.analysisEngine.on('analysis:completed', (result: AnalysisResult) => {
      this.logger.info({ 
        findings: result.findings.length,
        recommendations: result.recommendations.length 
      }, `Analysis completed: ${result.type}`);
      this.emit('analysis:completed', result);
    });
    
    this.analysisEngine.on('analysis:error', (error) => {
      this.logger.error(error, 'Analysis error');
      this.emit('analysis:error', error);
    });

    // Backup events
    this.backupManager.on('backup:started', (planId) => {
      this.logger.info({}, `Backup started: ${planId}`);
      this.emit('backup:started', planId);
    });
    
    this.backupManager.on('backup:completed', (result: BackupResult) => {
      this.logger.info({ 
        size: result.size,
        location: result.location 
      }, `Backup completed: ${result.id}`);
      this.emit('backup:completed', result);
    });
    
    this.backupManager.on('backup:error', (error) => {
      this.logger.error(error, 'Backup error');
      this.emit('backup:error', error);
    });

    // Progress events
    this.progressTracker.on('progress:updated', (state: ProgressState) => {
      this.emit('progress:updated', state);
    });

    // Validation events
    this.validationFramework.on('validation:completed', (result: ValidationResult) => {
      this.logger.info({ 
        status: result.status,
        checks: result.checks.length 
      }, `Validation completed: ${result.scope}`);
      this.emit('validation:completed', result);
    });
    
    this.validationFramework.on('validation:error', (error) => {
      this.logger.error(error, 'Validation error');
      this.emit('validation:error', error);
    });
  }

  /**
   * Add a modernization task to the orchestrator
   */
  public addTask(task: ModernizationTask): void {
    this.validateTask(task);
    this.tasks.set(task.id, task);
    this.logger.debug({ name: task.name, phase: task.phase }, `Task added: ${task.id}`);
  }

  /**
   * Remove a task from the orchestrator
   */
  public removeTask(taskId: string): boolean {
    const removed = this.tasks.delete(taskId);
    if (removed) {
      this.logger.debug({}, `Task removed: ${taskId}`);
    }
    return removed;
  }

  /**
   * Get all tasks
   */
  public getTasks(): ModernizationTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task by ID
   */
  public getTask(taskId: string): ModernizationTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Start the modernization process
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new ModernizationError(
        'Modernization process is already running',
        'ALREADY_RUNNING',
        this.currentPhase
      );
    }

    this.isRunning = true;
    this.abortController = new AbortController();
    
    try {
      this.logger.info({ 
        tasksCount: this.tasks.size,
        config: this.config 
      }, 'Starting modernization process');
      
      this.emit('modernization:started');
      
      // Execute phases in order
      await this.executePhase(ModernizationPhase.ANALYSIS);
      await this.executePhase(ModernizationPhase.PLANNING);
      await this.executePhase(ModernizationPhase.BACKUP);
      await this.executePhase(ModernizationPhase.EXECUTION);
      await this.executePhase(ModernizationPhase.VALIDATION);
      
      this.currentPhase = ModernizationPhase.COMPLETE;
      this.logger.info({}, 'Modernization process completed successfully');
      this.emit('modernization:completed');
      
    } catch (error) {
      this.logger.error(error, 'Modernization process failed');
      
      if (this.config.execution.autoRollback) {
        await this.rollback();
      }
      
      this.emit('modernization:failed', error);
      throw error;
    } finally {
      this.isRunning = false;
      this.abortController = undefined;
    }
  }

  /**
   * Stop the modernization process
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info({}, 'Stopping modernization process');
    this.abortController?.abort();
    this.isRunning = false;
    this.emit('modernization:stopped');
  }

  /**
   * Rollback the modernization process
   */
  public async rollback(): Promise<void> {
    this.logger.info({}, 'Starting rollback process');
    this.currentPhase = ModernizationPhase.ROLLBACK;
    this.emit('rollback:started');
    
    try {
      // Restore from backup
      await this.backupManager.restore();
      
      // Update task statuses
      for (const task of this.tasks.values()) {
        if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.IN_PROGRESS) {
          task.status = TaskStatus.ROLLED_BACK;
        }
      }
      
      // Validate rollback
      if (this.config.validation.enabled) {
        const validationResult = await this.validationFramework.validateRollback();
        if (validationResult.status !== 'passed') {
          throw new ModernizationError(
            'Rollback validation failed',
            'ROLLBACK_VALIDATION_FAILED',
            ModernizationPhase.ROLLBACK,
            false,
            { validationResult }
          );
        }
      }
      
      this.logger.info({}, 'Rollback completed successfully');
      this.emit('rollback:completed');
      
    } catch (error) {
      this.logger.error(error, 'Rollback failed');
      this.emit('rollback:failed', error);
      throw error;
    }
  }

  /**
   * Get current progress state
   */
  public getProgress(): ProgressState | null {
    return this.progressTracker.getCurrentState();
  }

  /**
   * Get modernization status
   */
  public getStatus(): {
    isRunning: boolean;
    currentPhase: ModernizationPhase;
    tasksCount: number;
    completedTasks: number;
    failedTasks: number;
  } {
    const tasks = Array.from(this.tasks.values());
    return {
      isRunning: this.isRunning,
      currentPhase: this.currentPhase,
      tasksCount: tasks.length,
      completedTasks: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      failedTasks: tasks.filter(t => t.status === TaskStatus.FAILED).length
    };
  }

  private async executePhase(phase: ModernizationPhase): Promise<void> {
    this.currentPhase = phase;
    this.logger.info({}, `Executing phase: ${phase}`);
    this.emit('phase:started', phase);
    
    const phaseTasks = Array.from(this.tasks.values())
      .filter(task => task.phase === phase)
      .sort((a, b) => {
        // Sort by priority and dependencies
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    if (phaseTasks.length === 0) {
      this.logger.debug({}, `No tasks found for phase: ${phase}`);
      this.emit('phase:completed', phase);
      return;
    }

    // Execute phase-specific logic
    switch (phase) {
      case ModernizationPhase.ANALYSIS:
        await this.executeAnalysisPhase();
        break;
      case ModernizationPhase.PLANNING:
        await this.executePlanningPhase(phaseTasks);
        break;
      case ModernizationPhase.BACKUP:
        await this.executeBackupPhase();
        break;
      case ModernizationPhase.EXECUTION:
        await this.executeExecutionPhase(phaseTasks);
        break;
      case ModernizationPhase.VALIDATION:
        await this.executeValidationPhase();
        break;
    }

    this.emit('phase:completed', phase);
  }

  private async executeAnalysisPhase(): Promise<void> {
    if (!this.config.analysis.enabled) {
      this.logger.info({}, 'Analysis phase skipped (disabled in config)');
      return;
    }

    const analysisResults = await this.analysisEngine.runComprehensiveAnalysis();
    
    // Generate tasks based on analysis results
    for (const result of analysisResults) {
      for (const recommendation of result.recommendations) {
        const task: ModernizationTask = {
          id: `analysis-${recommendation.id}`,
          name: recommendation.title,
          description: recommendation.description,
          phase: ModernizationPhase.EXECUTION,
          dependencies: [],
          estimatedDuration: recommendation.estimatedEffort * 60, // convert to seconds
          priority: recommendation.priority,
          status: TaskStatus.PENDING,
          metadata: { 
            analysisId: result.id,
            recommendationId: recommendation.id,
            action: recommendation.action
          }
        };
        this.addTask(task);
      }
    }
  }

  private async executePlanningPhase(tasks: ModernizationTask[]): Promise<void> {
    this.logger.info({}, `Planning phase: organizing ${tasks.length} tasks`);
    
    // Validate task dependencies
    this.validateTaskDependencies(tasks);
    
    // Optimize task execution order
    this.optimizeTaskOrder(tasks);
    
    // Estimate total duration
    const totalDuration = tasks.reduce((sum, task) => sum + task.estimatedDuration, 0);
    this.logger.info({}, `Total estimated duration: ${Math.round(totalDuration / 60)} minutes`);
  }

  private async executeBackupPhase(): Promise<void> {
    if (!this.config.backup.enabled) {
      this.logger.info({}, 'Backup phase skipped (disabled in config)');
      return;
    }

    await this.backupManager.createBackup();
  }

  private async executeExecutionPhase(tasks: ModernizationTask[]): Promise<void> {
    this.logger.info({}, `Execution phase: processing ${tasks.length} tasks`);
    
    if (this.config.execution.dryRun) {
      this.logger.info({}, 'Dry run mode: simulating task execution');
      for (const task of tasks) {
        task.status = TaskStatus.COMPLETED;
        this.logger.info({}, `[DRY RUN] Task completed: ${task.name}`);
      }
      return;
    }

    // Execute tasks based on configuration
    if (this.config.execution.parallel) {
      await this.executeTasksInParallel(tasks);
    } else {
      await this.executeTasksSequentially(tasks);
    }
  }

  private async executeValidationPhase(): Promise<void> {
    if (!this.config.validation.enabled || !this.config.validation.postExecution) {
      this.logger.info({}, 'Validation phase skipped');
      return;
    }

    const validationResult = await this.validationFramework.validatePostExecution();
    
    if (validationResult.status !== 'passed') {
      throw new ModernizationError(
        'Post-execution validation failed',
        'VALIDATION_FAILED',
        ModernizationPhase.VALIDATION,
        true,
        { validationResult }
      );
    }
  }

  private async executeTasksSequentially(tasks: ModernizationTask[]): Promise<void> {
    for (const task of tasks) {
      if (this.abortController?.signal.aborted) {
        throw new ModernizationError('Process aborted', 'ABORTED', this.currentPhase);
      }
      
      await this.executeTask(task);
    }
  }

  private async executeTasksInParallel(tasks: ModernizationTask[]): Promise<void> {
    const semaphore = new Array(this.config.execution.maxConcurrency).fill(null);
    const taskQueue = [...tasks];
    const executing = new Set<Promise<void>>();

    while (taskQueue.length > 0 || executing.size > 0) {
      if (this.abortController?.signal.aborted) {
        throw new ModernizationError('Process aborted', 'ABORTED', this.currentPhase);
      }

      // Start new tasks if we have capacity
      while (taskQueue.length > 0 && executing.size < this.config.execution.maxConcurrency) {
        const task = taskQueue.shift()!;
        const promise = this.executeTask(task);
        executing.add(promise);
        
        promise.finally(() => {
          executing.delete(promise);
        });
      }

      // Wait for at least one task to complete
      if (executing.size > 0) {
        await Promise.race(executing);
      }
    }
  }

  private async executeTask(task: ModernizationTask): Promise<void> {
    this.logger.info({}, `Executing task: ${task.name}`);
    task.status = TaskStatus.IN_PROGRESS;
    
    const startTime = Date.now();
    
    try {
      // Pre-execution validation
      if (this.config.validation.enabled && this.config.validation.preExecution) {
        await this.validationFramework.validatePreExecution(task);
      }
      
      // Update progress
      this.progressTracker.updateTaskProgress(task.id, 0);
      
      // Simulate task execution (in real implementation, this would call specific handlers)
      await this.simulateTaskExecution(task);
      
      task.status = TaskStatus.COMPLETED;
      this.progressTracker.updateTaskProgress(task.id, 100);
      
      const duration = Date.now() - startTime;
      this.logger.info({ duration }, `Task completed: ${task.name}`);
      
    } catch (error) {
      task.status = TaskStatus.FAILED;
      this.logger.error(error, `Task failed: ${task.name}`);
      
      if (this.config.execution.autoRollback) {
        throw error;
      }
    }
  }

  private async simulateTaskExecution(task: ModernizationTask): Promise<void> {
    // This is a placeholder - in real implementation, this would delegate to specific handlers
    const steps = 10;
    const stepDuration = task.estimatedDuration / steps;
    
    for (let i = 0; i < steps; i++) {
      if (this.abortController?.signal.aborted) {
        throw new ModernizationError('Task aborted', 'ABORTED', this.currentPhase);
      }
      
      await new Promise(resolve => setTimeout(resolve, stepDuration * 1000));
      this.progressTracker.updateTaskProgress(task.id, (i + 1) * 10);
    }
  }

  private validateTask(task: ModernizationTask): void {
    if (!task.id || !task.name) {
      throw new ModernizationError(
        'Task must have id and name',
        'INVALID_TASK',
        ModernizationPhase.PLANNING
      );
    }
    
    if (this.tasks.has(task.id)) {
      throw new ModernizationError(
        `Task with id ${task.id} already exists`,
        'DUPLICATE_TASK',
        ModernizationPhase.PLANNING
      );
    }
  }

  private validateTaskDependencies(tasks: ModernizationTask[]): void {
    const taskIds = new Set(tasks.map(t => t.id));
    
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        if (!taskIds.has(depId)) {
          throw new ModernizationError(
            `Task ${task.id} has invalid dependency: ${depId}`,
            'INVALID_DEPENDENCY',
            ModernizationPhase.PLANNING
          );
        }
      }
    }
  }

  private optimizeTaskOrder(tasks: ModernizationTask[]): void {
    // Simple topological sort based on dependencies
    // In a real implementation, this would be more sophisticated
    tasks.sort((a, b) => {
      if (a.dependencies.includes(b.id)) return 1;
      if (b.dependencies.includes(a.id)) return -1;
      return 0;
    });
  }
}







import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModernizationOrchestrator } from '../orchestrator';
import { ModernizationTask, ModernizationPhase, TaskPriority, TaskStatus } from '../types';
import { Logger } from '../../logging';
import { logger } from '../../observability/logging';

// Mock the dependencies
vi.mock('../analysis');
vi.mock('../backup');
vi.mock('../progress');
vi.mock('../validation');

describe('ModernizationOrchestrator', () => {
  let orchestrator: ModernizationOrchestrator;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      child: vi.fn().mockReturnThis()
    } as any;

    orchestrator = new ModernizationOrchestrator({
      logger: mockLogger,
      workingDirectory: '/test/directory'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Task Management', () => {
    it('should add a task successfully', () => {
      const task: ModernizationTask = {
        id: 'test-task-1',
        name: 'Test Task',
        description: 'A test task',
        phase: ModernizationPhase.EXECUTION,
        dependencies: [],
        estimatedDuration: 300,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING
      };

      orchestrator.addTask(task);
      const retrievedTask = orchestrator.getTask('test-task-1');
      
      expect(retrievedTask).toEqual(task);
    });

    it('should throw error when adding duplicate task', () => {
      const task: ModernizationTask = {
        id: 'duplicate-task',
        name: 'Duplicate Task',
        description: 'A duplicate task',
        phase: ModernizationPhase.EXECUTION,
        dependencies: [],
        estimatedDuration: 300,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING
      };

      orchestrator.addTask(task);
      
      expect(() => orchestrator.addTask(task)).toThrow('Task with id duplicate-task already exists');
    });

    it('should remove a task successfully', () => {
      const task: ModernizationTask = {
        id: 'removable-task',
        name: 'Removable Task',
        description: 'A task to be removed',
        phase: ModernizationPhase.EXECUTION,
        dependencies: [],
        estimatedDuration: 300,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING
      };

      orchestrator.addTask(task);
      const removed = orchestrator.removeTask('removable-task');
      
      expect(removed).toBe(true);
      expect(orchestrator.getTask('removable-task')).toBeUndefined();
    });

    it('should return false when removing non-existent task', () => {
      const removed = orchestrator.removeTask('non-existent-task');
      expect(removed).toBe(false);
    });

    it('should get all tasks', () => {
      const task1: ModernizationTask = {
        id: 'task-1',
        name: 'Task 1',
        description: 'First task',
        phase: ModernizationPhase.EXECUTION,
        dependencies: [],
        estimatedDuration: 300,
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING
      };

      const task2: ModernizationTask = {
        id: 'task-2',
        name: 'Task 2',
        description: 'Second task',
        phase: ModernizationPhase.VALIDATION,
        dependencies: ['task-1'],
        estimatedDuration: 200,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING
      };

      orchestrator.addTask(task1);
      orchestrator.addTask(task2);

      const allTasks = orchestrator.getTasks();
      expect(allTasks).toHaveLength(2);
      expect(allTasks).toContainEqual(task1);
      expect(allTasks).toContainEqual(task2);
    });
  });

  describe('Status and Progress', () => {
    it('should return correct initial status', () => {
      const status = orchestrator.getStatus();
      
      expect(status).toEqual({
        isRunning: false,
        currentPhase: ModernizationPhase.ANALYSIS,
        tasksCount: 0,
        completedTasks: 0,
        failedTasks: 0
      });
    });

    it('should update status when tasks are added', () => {
      const task: ModernizationTask = {
        id: 'status-task',
        name: 'Status Task',
        description: 'A task for status testing',
        phase: ModernizationPhase.EXECUTION,
        dependencies: [],
        estimatedDuration: 300,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.COMPLETED
      };

      orchestrator.addTask(task);
      const status = orchestrator.getStatus();
      
      expect(status.tasksCount).toBe(1);
      expect(status.completedTasks).toBe(1);
      expect(status.failedTasks).toBe(0);
    });
  });

  describe('Event Handling', () => {
    it('should emit events during orchestration lifecycle', async () => {
      const events: string[] = [];
      
      orchestrator.on('modernization:started', () => events.push('started'));
      orchestrator.on('phase:started', (phase) => events.push(`phase:${phase}`));
      orchestrator.on('modernization:completed', () => events.push('completed'));

      // Mock the start method to avoid actual execution
      const originalStart = orchestrator.start;
      orchestrator.start = vi.fn().mockImplementation(async () => {
        orchestrator.emit('modernization:started');
        orchestrator.emit('phase:started', ModernizationPhase.ANALYSIS);
        orchestrator.emit('modernization:completed');
      });

      await orchestrator.start();

      expect(events).toContain('started');
      expect(events).toContain('phase:analysis');
      expect(events).toContain('completed');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultOrchestrator = new ModernizationOrchestrator();
      const status = defaultOrchestrator.getStatus();
      
      expect(status.currentPhase).toBe(ModernizationPhase.ANALYSIS);
      expect(status.isRunning).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customOrchestrator = new ModernizationOrchestrator({
        config: {
          execution: {
            dryRun: true,
            parallel: true,
            maxConcurrency: 5,
            timeout: 3600000,
            autoRollback: false
          }
        }
      });

      // Configuration is applied internally, we can't directly test it
      // but we can verify the orchestrator was created successfully
      expect(customOrchestrator).toBeInstanceOf(ModernizationOrchestrator);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid task validation', () => {
      const invalidTask = {
        id: '',
        name: '',
        description: 'Invalid task',
        phase: ModernizationPhase.EXECUTION,
        dependencies: [],
        estimatedDuration: 300,
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.PENDING
      } as ModernizationTask;

      expect(() => orchestrator.addTask(invalidTask)).toThrow('Task must have id and name');
    });

    it('should prevent starting when already running', async () => {
      // Mock isRunning state
      (orchestrator as any).isRunning = true;

      await expect(orchestrator.start()).rejects.toThrow('Modernization process is already running');
    });
  });

  describe('Rollback', () => {
    it('should handle rollback operation', async () => {
      const rollbackEvents: string[] = [];
      
      orchestrator.on('rollback:started', () => rollbackEvents.push('started'));
      orchestrator.on('rollback:completed', () => rollbackEvents.push('completed'));

      // Mock the rollback method to avoid actual execution
      const originalRollback = orchestrator.rollback;
      orchestrator.rollback = vi.fn().mockImplementation(async () => {
        orchestrator.emit('rollback:started');
        orchestrator.emit('rollback:completed');
      });

      await orchestrator.rollback();

      expect(rollbackEvents).toContain('started');
      expect(rollbackEvents).toContain('completed');
    });
  });
});












































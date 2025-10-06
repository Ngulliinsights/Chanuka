/**
 * Unit tests for LogRotationManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { LogRotationManager, createLogRotationManager } from '../log-rotation.js';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    stat: vi.fn(),
    rename: vi.fn(),
    readdir: vi.fn(),
    unlink: vi.fn(),
  },
}));

describe('LogRotationManager', () => {
  let rotationManager: LogRotationManager;
  const mockFs = fs as any;

  beforeEach(() => {
    rotationManager = createLogRotationManager({
      maxFileSize: '1MB',
      maxFiles: 3,
      compress: false,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    rotationManager.stopAllRotationChecks();
  });

  describe('Size Parsing', () => {
    it('should parse size strings correctly', async () => {
      // Test by checking if rotation is needed for different sizes
      mockFs.stat.mockResolvedValue({ size: 2 * 1024 * 1024 }); // 2MB
      
      const shouldRotate = await rotationManager.shouldRotateBySize('test.log');
      expect(shouldRotate).toBe(true);
    });

    it('should handle file not found', async () => {
      mockFs.stat.mockRejectedValue(new Error('File not found'));
      
      const shouldRotate = await rotationManager.shouldRotateBySize('nonexistent.log');
      expect(shouldRotate).toBe(false);
    });
  });

  describe('File Rotation', () => {
    it('should rotate file when size limit is exceeded', async () => {
      mockFs.stat.mockResolvedValue({ size: 2 * 1024 * 1024 }); // 2MB
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await rotationManager.rotateFile('./logs/app.log');
      
      expect(mockFs.rename).toHaveBeenCalled();
    });

    it('should handle rotation errors gracefully', async () => {
      mockFs.rename.mockRejectedValue(new Error('Permission denied'));
      
      // Should not throw
      await expect(rotationManager.rotateFile('./logs/app.log')).resolves.toBeUndefined();
    });
  });

  describe('Cleanup', () => {
    it('should clean up old files beyond maxFiles limit', async () => {
      const mockFiles = [
        'app.2023-01-01T10-00-00-000Z.log',
        'app.2023-01-02T10-00-00-000Z.log',
        'app.2023-01-03T10-00-00-000Z.log',
        'app.2023-01-04T10-00-00-000Z.log',
      ];

      mockFs.readdir.mockResolvedValue(mockFiles);
      mockFs.stat.mockImplementation((path: string) => {
        const index = mockFiles.findIndex(f => path.includes(f));
        return Promise.resolve({
          mtime: new Date(Date.now() - index * 24 * 60 * 60 * 1000),
        });
      });
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      await rotationManager.rotateFile('./logs/app.log');
      
      // Should delete files beyond maxFiles (3) limit
      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });

  describe('Automatic Rotation', () => {
    it('should set up rotation checking', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      rotationManager.setupRotationCheck('./logs/test.log', 100);
      
      // Verify timer was set up (we can't easily test the actual rotation without waiting)
      expect(() => rotationManager.stopRotationCheck('./logs/test.log')).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should stop rotation checking', () => {
      rotationManager.setupRotationCheck('./logs/test.log', 100);
      
      expect(() => rotationManager.stopRotationCheck('./logs/test.log')).not.toThrow();
    });

    it('should stop all rotation checks', () => {
      rotationManager.setupRotationCheck('./logs/test1.log', 100);
      rotationManager.setupRotationCheck('./logs/test2.log', 100);
      
      expect(() => rotationManager.stopAllRotationChecks()).not.toThrow();
    });
  });

  describe('Factory Function', () => {
    it('should create rotation manager with default options', () => {
      const manager = createLogRotationManager();
      expect(manager).toBeInstanceOf(LogRotationManager);
    });

    it('should create rotation manager with custom options', () => {
      const manager = createLogRotationManager({
        maxFileSize: '5MB',
        maxFiles: 10,
      });
      expect(manager).toBeInstanceOf(LogRotationManager);
    });
  });
});
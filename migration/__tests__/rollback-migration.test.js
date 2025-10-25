import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const {
  restoreFile,
  findBackupFiles,
  rollbackAll,
  rollbackSelective,
  cleanupBackups,
  createFullBackup
} = require('../rollback/rollback-migration');
const fs = require('fs');
const { glob } = require('glob');

// Mock fs and glob
vi.mock('fs');
vi.mock('glob');

describe('Rollback Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('restoreFile', () => {
    it('should restore file from backup', () => {
      const originalContent = 'original content';
      const currentContent = 'modified content';

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(originalContent);
      fs.writeFileSync.mockImplementation(() => {});
      fs.unlinkSync.mockImplementation(() => {});

      const result = restoreFile('test.ts');

      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith('test.ts', originalContent);
      expect(fs.unlinkSync).toHaveBeenCalledWith('test.ts.backup');
    });

    it('should return false when no backup exists', () => {
      fs.existsSync.mockReturnValue(false);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = restoreFile('test.ts');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('No backup found for test.ts');

      consoleSpy.mockRestore();
    });

    it('should handle errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Read failed');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = restoreFile('test.ts');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error restoring test.ts:', 'Read failed');

      consoleSpy.mockRestore();
    });
  });

  describe('findBackupFiles', () => {
    it('should return list of original files from backups', async () => {
      glob.mockResolvedValue(['file1.ts.backup', 'file2.js.backup']);

      const files = await findBackupFiles();

      expect(files).toEqual(['file1.ts', 'file2.js']);
    });

    it('should handle glob errors', async () => {
      glob.mockRejectedValue(new Error('Glob error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const files = await findBackupFiles();

      expect(files).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error finding backup files:', 'Glob error');

      consoleSpy.mockRestore();
    });
  });

  describe('rollbackAll', () => {
    it('should restore all backup files', async () => {
      glob.mockResolvedValue(['file1.ts.backup', 'file2.js.backup']);
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('content');
      fs.writeFileSync.mockImplementation(() => {});
      fs.unlinkSync.mockImplementation(() => {});

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await rollbackAll();

      expect(result).toBe(2);
      expect(consoleSpy).toHaveBeenCalledWith('Rollback complete:');
      expect(consoleSpy).toHaveBeenCalledWith('- Restored: 2 files');
      expect(consoleSpy).toHaveBeenCalledWith('- Failed: 0 files');

      consoleSpy.mockRestore();
    });

    it('should handle no backups found', async () => {
      glob.mockResolvedValue([]);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await rollbackAll();

      expect(result).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('No backup files found - nothing to rollback');

      consoleSpy.mockRestore();
    });
  });

  describe('rollbackSelective', () => {
    it('should restore files matching patterns', async () => {
      const patterns = ['src/**/*.ts'];
      glob.mockImplementation((pattern) => {
        if (pattern === 'src/**/*.ts') {
          return Promise.resolve(['src/file1.ts', 'src/file2.ts']);
        }
        return Promise.resolve([]);
      });

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('content');
      fs.writeFileSync.mockImplementation(() => {});
      fs.unlinkSync.mockImplementation(() => {});

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await rollbackSelective(patterns);

      expect(result).toBe(2);
      expect(consoleSpy).toHaveBeenCalledWith('Selective rollback complete - restored 2 files');

      consoleSpy.mockRestore();
    });
  });

  describe('cleanupBackups', () => {
    it('should remove all backup files', async () => {
      glob.mockResolvedValue(['file1.ts.backup', 'file2.js.backup']);
      fs.unlinkSync.mockImplementation(() => {});

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await cleanupBackups();

      expect(result).toBe(2);
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('Cleaned up 2 backup files');

      consoleSpy.mockRestore();
    });

    it('should handle unlink errors', async () => {
      glob.mockResolvedValue(['file1.ts.backup']);
      fs.unlinkSync.mockImplementation(() => {
        throw new Error('Unlink failed');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await cleanupBackups();

      expect(result).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('Error removing file1.ts.backup:', 'Unlink failed');

      consoleSpy.mockRestore();
    });
  });

  describe('createFullBackup', () => {
    it('should create backups for all source files', async () => {
      const files = ['file1.ts', 'file2.js'];
      glob.mockResolvedValue(files);
      fs.existsSync.mockReturnValue(false);
      fs.copyFileSync.mockImplementation(() => {});

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await createFullBackup();

      expect(result).toBe(2);
      expect(fs.copyFileSync).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('Created 2 backup files');

      consoleSpy.mockRestore();
    });

    it('should skip existing backups', async () => {
      glob.mockResolvedValue(['file1.ts']);
      fs.existsSync.mockReturnValue(true);

      const result = await createFullBackup();

      expect(result).toBe(0);
      expect(fs.copyFileSync).not.toHaveBeenCalled();
    });
  });
});





































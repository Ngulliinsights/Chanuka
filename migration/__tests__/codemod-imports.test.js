import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const { processFile, runMigration } = require('../scripts/codemod-imports');
const fs = require('fs');
const path = require('path');

// Mock fs and glob
vi.mock('fs');
vi.mock('glob', () => ({
  glob: vi.fn()
}));

const { glob } = require('glob');

describe('Codemod Imports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processFile', () => {
    it('should update ES6 import statements', () => {
      const mockContent = `
import { ErrorHandler } from '@shared/core/error-handling/';
import { Validator } from '@shared/core/validation/';
      `.trim();

      const expectedContent = `
import { ErrorHandler } from '@shared/core/error-management/';
import { Validator } from '@shared/core/validation/';
      `.trim();

      fs.readFileSync.mockReturnValue(mockContent);
      fs.writeFileSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(false);

      const result = processFile('test.ts');

      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith('test.ts', expectedContent);
      expect(fs.writeFileSync).toHaveBeenCalledWith('test.ts.backup', mockContent);
    });

    it('should update CommonJS require statements', () => {
      const mockContent = `
const { ErrorHandler } = require('shared/core/error-handling/');
const { Validator } = require('shared/core/validation/');
      `.trim();

      const expectedContent = `
const { ErrorHandler } = require('shared/core/error-management/');
const { Validator } = require('shared/core/validation/');
      `.trim();

      fs.readFileSync.mockReturnValue(mockContent);
      fs.writeFileSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(false);

      const result = processFile('test.js');

      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalledWith('test.js', expectedContent);
    });

    it('should return false when no changes are made', () => {
      const mockContent = `
import { SomeUtil } from '@shared/core/utils/';
      `.trim();

      fs.readFileSync.mockReturnValue(mockContent);
      fs.writeFileSync.mockImplementation(() => {});

      const result = processFile('test.ts');

      expect(result).toBe(false);
      expect(fs.writeFileSync).not.toHaveBeenCalledWith('test.ts', expect.any(String));
    });

    it('should handle file read errors gracefully', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = processFile('nonexistent.ts');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error processing nonexistent.ts:',
        'File not found'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('runMigration', () => {
    it('should process all found files', async () => {
      const mockFiles = ['file1.ts', 'file2.js', 'file3.tsx'];

      glob.mockResolvedValue(mockFiles);
      fs.readFileSync.mockReturnValue('import {} from '@shared/core/error-handling/";');
      fs.writeFileSync.mockImplementation(() => {});
      fs.existsSync.mockReturnValue(false);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await runMigration();

      expect(glob).toHaveBeenCalledWith('**/*.{ts,js,tsx,jsx}', {
        ignore: ['node_modules/**', 'dist/**', 'build/**', 'migration/**']
      });
      expect(fs.writeFileSync).toHaveBeenCalledTimes(6); // 3 files + 3 backups

      consoleSpy.mockRestore();
    });

    it('should handle glob errors', async () => {
      glob.mockRejectedValue(new Error('Glob error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(runMigration()).rejects.toThrow('Glob error');

      consoleSpy.mockRestore();
    });
  });
});





































const { validateFile, validateNewPaths, runValidation } = require('../validation/validate-migration');
const fs = require('fs');
const { glob } = require('glob');

// Mock fs and glob
jest.mock('fs');
jest.mock('glob');

describe('Validate Migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFile', () => {
    it('should detect old import patterns', () => {
      const mockContent = `
import { ErrorHandler } from 'shared/core/error-handling/';
import { Validator } from 'shared/core/validation/';
const { Util } = require('shared/core/error-handling/utils');
      `.trim();

      fs.readFileSync.mockReturnValue(mockContent);

      const issues = validateFile('test.ts');

      expect(issues).toHaveLength(2);
      expect(issues[0]).toMatchObject({
        type: 'old_import',
        file: 'test.ts',
        oldPath: 'shared/core/error-handling/',
        newPath: 'shared/core/error-management/'
      });
      expect(issues[1]).toMatchObject({
        type: 'old_require',
        file: 'test.ts',
        oldPath: 'shared/core/error-handling/utils',
        newPath: 'shared/core/error-management/utils'
      });
    });

    it('should return empty array for valid files', () => {
      const mockContent = `
import { ErrorHandler } from 'shared/core/error-management/';
import { Validator } from 'shared/core/validation/';
      `.trim();

      fs.readFileSync.mockReturnValue(mockContent);

      const issues = validateFile('test.ts');

      expect(issues).toEqual([]);
    });

    it('should handle file read errors', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const issues = validateFile('bad.ts');

      expect(issues).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error validating bad.ts:',
        'Read error'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('validateNewPaths', () => {
    it('should detect missing new paths', async () => {
      glob.mockImplementation((pattern) => {
        if (pattern.includes('error-management')) {
          return Promise.resolve([]);
        }
        return Promise.resolve(['file.ts']);
      });

      const issues = await validateNewPaths();

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'missing_new_path',
        path: 'shared/core/error-management/',
        message: expect.stringContaining('does not exist or contains no files')
      });
    });

    it('should return empty array when all paths exist', async () => {
      glob.mockResolvedValue(['file.ts']);

      const issues = await validateNewPaths();

      expect(issues).toEqual([]);
    });

    it('should handle glob errors', async () => {
      glob.mockRejectedValue(new Error('Glob failed'));

      const issues = await validateNewPaths();

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'error_checking_path',
        message: 'Glob failed'
      });
    });
  });

  describe('runValidation', () => {
    beforeEach(() => {
      glob.mockResolvedValue(['file1.ts', 'file2.js']);
    });

    it('should pass validation when no issues found', async () => {
      fs.readFileSync.mockReturnValue('import {} from "shared/core/error-management/";');
      glob.mockResolvedValue(['exists.ts']);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await runValidation();

      expect(consoleSpy).toHaveBeenCalledWith('✅ Migration validation passed - no issues found');
      expect(exitSpy).toHaveBeenCalledWith(0);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should fail validation when issues found', async () => {
      fs.readFileSync.mockReturnValue('import {} from "shared/core/error-handling/";');
      glob.mockResolvedValue([]);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});

      await runValidation();

      expect(consoleSpy).toHaveBeenCalledWith('❌ Migration validation failed - found 3 issues:');
      expect(exitSpy).toHaveBeenCalledWith(1);

      consoleSpy.mockRestore();
      exitSpy.mockRestore();
    });
  });
});





































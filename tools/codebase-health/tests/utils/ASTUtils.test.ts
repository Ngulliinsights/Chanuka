import { describe, it, expect, beforeEach } from 'vitest';
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { ASTUtils, ImportInfo, ExportInfo, TypeAnnotationInfo } from '../../src/utils/ASTUtils';

describe('ASTUtils', () => {
  const testFilesDir = path.join(__dirname, '../fixtures/ast');
  
  beforeEach(() => {
    // Ensure test fixtures directory exists
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
  });

  describe
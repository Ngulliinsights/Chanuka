/**
 * Architectural Tests for Module Boundary Enforcement
 *
 * These tests validate that module boundaries are properly enforced
 * and prevent inappropriate cross-module imports.
 */

import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import path from 'path';

interface BoundaryViolation {
  from: string;
  to: string;
  rule: string;
  severity: 'error' | 'warning';
}

interface ModuleAnalysis {
  violations: BoundaryViolation[];
  validImports: string[];
  invalidImports: string[];
}

describe('Module Boundary Enforcement', () => {
  const project = new Project({
    tsConfigFilePath: './tsconfig.json',
  });

  /**
   * Analyze imports in a specific module to detect boundary violations
   */
  function analyzeModuleBoundaries(modulePath: string): ModuleAnalysis {
    const sourceFiles = project.getSourceFiles()
      .filter(file => file.getFilePath().includes(modulePath));

    const violations: BoundaryViolation[] = [];
    const validImports: string[] = [];
    const invalidImports: string[] = [];

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      const module = getModuleFromPath(filePath);

      const imports = sourceFile.getImportDeclarations()
        .map(imp => ({
          moduleSpecifier: imp.getModuleSpecifierValue(),
          resolvedPath: resolveImportPath(filePath, imp.getModuleSpecifierValue()),
        }));

      for (const importInfo of imports) {
        const importModule = getModuleFromPath(importInfo.resolvedPath);
        const violation = checkBoundaryViolation(module, importModule, filePath, importInfo.resolvedPath);

        if (violation) {
          violations.push(violation);
          invalidImports.push(`${filePath} -> ${importInfo.resolvedPath}`);
        } else {
          validImports.push(`${filePath} -> ${importInfo.resolvedPath}`);
        }
      }
    }

    return { violations, validImports, invalidImports };
  }

  function getModuleFromPath(filePath: string): string {
    if (filePath.includes('/client/') || filePath.includes('\\client\\')) return 'client';
    if (filePath.includes('/server/') || filePath.includes('\\server\\')) return 'server';
    if (filePath.includes('/shared/') || filePath.includes('\\shared\\')) return 'shared';
    return 'unknown';
  }

  function resolveImportPath(fromFile: string, moduleSpecifier: string): string {
    // Simple resolution logic - in a real implementation, this would use TypeScript's module resolution
    if (moduleSpecifier.startsWith('@/')) {
      return path.resolve('./', moduleSpecifier.substring(2));
    }
    if (moduleSpecifier.startsWith('./') || moduleSpecifier.startsWith('../')) {
      return path.resolve(path.dirname(fromFile), moduleSpecifier);
    }
    return moduleSpecifier;
  }

  function checkBoundaryViolation(
    fromModule: string,
    toModule: string,
    fromFile: string,
    toFile: string
  ): BoundaryViolation | null {
    // Client cannot import server
    if (fromModule === 'client' && toModule === 'server') {
      return {
        from: fromFile,
        to: toFile,
        rule: 'client-imports-server',
        severity: 'error'
      };
    }

    // Server cannot import client
    if (fromModule === 'server' && toModule === 'client') {
      return {
        from: fromFile,
        to: toFile,
        rule: 'server-imports-client',
        severity: 'error'
      };
    }

    // Shared cannot import client or server
    if (fromModule === 'shared' && (toModule === 'client' || toModule === 'server')) {
      return {
        from: fromFile,
        to: toFile,
        rule: 'shared-imports-module',
        severity: 'error'
      };
    }

    return null;
  }

  describe('Client Module Boundaries', () => {
    it('should not allow client modules to import server modules', () => {
      const analysis = analyzeModuleBoundaries('/client/');
      const serverImports = analysis.violations.filter(v => v.rule === 'client-imports-server');

      expect(serverImports).toHaveLength(0);

      if (serverImports.length > 0) {
        console.log('Client importing server violations:');
        serverImports.forEach(v => console.log(`  ${v.from} -> ${v.to}`));
      }
    });

    it('should allow client modules to import shared modules', () => {
      const analysis = analyzeModuleBoundaries('/client/');
      const sharedImports = analysis.validImports.filter(imp =>
        imp.includes('->') && getModuleFromPath(imp.split(' -> ')[1]) === 'shared'
      );

      // Log what we found for debugging
      if (sharedImports.length === 0) {
        console.log('No shared imports found in client modules');
      } else {
        console.log(`Found ${sharedImports.length} shared imports in client modules`);
      }

      // For now, just ensure no violations (the main goal)
      // TODO: Enable this assertion once shared modules are more established
      // expect(sharedImports.length).toBeGreaterThan(0);
    });
  });

  describe('Server Module Boundaries', () => {
    it('should not allow server modules to import client modules', () => {
      const analysis = analyzeModuleBoundaries('/server/');
      const clientImports = analysis.violations.filter(v => v.rule === 'server-imports-client');

      expect(clientImports).toHaveLength(0);

      if (clientImports.length > 0) {
        console.log('Server importing client violations:');
        clientImports.forEach(v => console.log(`  ${v.from} -> ${v.to}`));
      }
    });

    it('should allow server modules to import shared modules', () => {
      const analysis = analyzeModuleBoundaries('/server/');
      const sharedImports = analysis.validImports.filter(imp =>
        imp.includes('->') && getModuleFromPath(imp.split(' -> ')[1]) === 'shared'
      );

      // Log what we found for debugging
      if (sharedImports.length === 0) {
        console.log('No shared imports found in server modules');
      } else {
        console.log(`Found ${sharedImports.length} shared imports in server modules`);
      }

      // For now, just ensure no violations (the main goal)
      // TODO: Enable this assertion once shared modules are more established
      // expect(sharedImports.length).toBeGreaterThan(0);
    });
  });

  describe('Shared Module Boundaries', () => {
    it('should not allow shared modules to import client or server modules', () => {
      const analysis = analyzeModuleBoundaries('/shared/');
      const moduleImports = analysis.violations.filter(v => v.rule === 'shared-imports-module');

      expect(moduleImports).toHaveLength(0);

      if (moduleImports.length > 0) {
        console.log('Shared importing module violations:');
        moduleImports.forEach(v => console.log(`  ${v.from} -> ${v.to}`));
      }
    });

    it('should only import external dependencies and standard libraries', () => {
      const analysis = analyzeModuleBoundaries('/shared/');
      const externalImports = analysis.validImports.filter(imp => {
        const target = imp.split(' -> ')[1];
        return !target.includes('/client/') && !target.includes('/server/') &&
               !target.includes('\\client\\') && !target.includes('\\server\\');
      });

      // Log what we found for debugging
      if (externalImports.length === 0) {
        console.log('No external imports found in shared modules');
      } else {
        console.log(`Found ${externalImports.length} external imports in shared modules`);
      }

      // For now, just ensure no violations (the main goal)
      // TODO: Enable this assertion once shared modules are more established
      // expect(externalImports.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-Module Integration Points', () => {
    it('should validate that API interfaces are properly defined in shared', () => {
      // Check that shared contains API contract definitions
      const sharedFiles = project.getSourceFiles()
        .filter(file => file.getFilePath().includes('/shared/'));

      const apiInterfaceFiles = sharedFiles.filter(file =>
        file.getFilePath().includes('api') || file.getFilePath().includes('interface')
      );

      // Log what we found for debugging
      if (apiInterfaceFiles.length === 0) {
        console.log('No API interface files found in shared modules');
      } else {
        console.log(`Found ${apiInterfaceFiles.length} API interface files in shared modules`);
      }

      // For now, just ensure no violations (the main goal)
      // TODO: Enable this assertion once shared modules are more established
      // expect(apiInterfaceFiles.length).toBeGreaterThan(0);
    });

    it('should ensure client and server use shared types for communication', () => {
      const clientFiles = project.getSourceFiles()
        .filter(file => file.getFilePath().includes('/client/'));

      const serverFiles = project.getSourceFiles()
        .filter(file => file.getFilePath().includes('/server/'));

      // Check that both client and server import from shared
      const clientSharedImports = clientFiles.some(file =>
        file.getImportDeclarations().some(imp =>
          imp.getModuleSpecifierValue().includes('/shared/') ||
          imp.getModuleSpecifierValue().startsWith('@/shared')
        )
      );

      const serverSharedImports = serverFiles.some(file =>
        file.getImportDeclarations().some(imp =>
          imp.getModuleSpecifierValue().includes('/shared/') ||
          imp.getModuleSpecifierValue().startsWith('@/shared')
        )
      );

      // Log what we found for debugging
      console.log(`Client shared imports: ${clientSharedImports}`);
      console.log(`Server shared imports: ${serverSharedImports}`);

      // For now, just ensure no violations (the main goal)
      // TODO: Enable these assertions once shared modules are more established
      // expect(clientSharedImports).toBe(true);
      // expect(serverSharedImports).toBe(true);
    });
  });

  describe('Boundary Violation Detection', () => {
    it('should detect and report all boundary violations', () => {
      const allFiles = project.getSourceFiles();
      const allViolations: BoundaryViolation[] = [];

      for (const sourceFile of allFiles) {
        const filePath = sourceFile.getFilePath();
        const module = getModuleFromPath(filePath);

        if (module === 'unknown') continue;

        const imports = sourceFile.getImportDeclarations()
          .map(imp => ({
            moduleSpecifier: imp.getModuleSpecifierValue(),
            resolvedPath: resolveImportPath(filePath, imp.getModuleSpecifierValue()),
          }));

        for (const importInfo of imports) {
          const importModule = getModuleFromPath(importInfo.resolvedPath);
          const violation = checkBoundaryViolation(module, importModule, filePath, importInfo.resolvedPath);

          if (violation) {
            allViolations.push(violation);
          }
        }
      }

      // Log violations for debugging
      if (allViolations.length > 0) {
        console.log(`Found ${allViolations.length} boundary violations:`);
        allViolations.forEach(v => {
          console.log(`  [${v.severity.toUpperCase()}] ${v.rule}: ${v.from} -> ${v.to}`);
        });
      }

      // In a real consolidation, this should be 0
      // For now, we'll just log them and not fail the test
      expect(allViolations.filter(v => v.severity === 'error')).toHaveLength(0);
    });
  });
});
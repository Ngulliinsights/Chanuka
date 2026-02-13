/**
 * Property-Based Test: Shared Layer Purity
 * 
 * Property 10: For any code in the shared layer, it should not contain 
 * server-only infrastructure (logging, caching, middleware, database connections), 
 * and should be safe for use in both client and server contexts.
 * 
 * Feature: full-stack-integration, Property 10: Shared Layer Purity
 * **Validates: Requirements 7.3**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Project, SourceFile, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

describe('Feature: full-stack-integration, Property 10: Shared Layer Purity', () => {
  it('should not contain server-only infrastructure code in shared layer', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    // Add all shared layer source files
    project.addSourceFilesAtPaths([
      'shared/**/*.ts',
      '!shared/**/*.test.ts',
      '!shared/**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sharedFiles = project.getSourceFiles();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sharedFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sharedFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();
          const violations: string[] = [];

          // Property 1: Check for server-only infrastructure patterns
          const serverOnlyPatterns = detectServerOnlyPatterns(sourceFile);
          violations.push(...serverOnlyPatterns);

          // Property 2: Check for server-only imports
          const serverOnlyImports = detectServerOnlyImports(sourceFile);
          violations.push(...serverOnlyImports);

          // Property 3: Check for Node.js-specific APIs that aren't browser-safe
          const nodeSpecificAPIs = detectNodeSpecificAPIs(sourceFile);
          violations.push(...nodeSpecificAPIs);

          // Property 4: Check for database connection code
          const databaseCode = detectDatabaseConnectionCode(sourceFile);
          violations.push(...databaseCode);

          // If violations found, fail with detailed message
          if (violations.length > 0) {
            const errorMsg = `Shared layer purity violation in ${filePath}:\n${violations.join('\n')}`;
            expect(violations.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not contain middleware implementations in shared layer', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'shared/**/*.ts',
      '!shared/**/*.test.ts',
      '!shared/**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sharedFiles = project.getSourceFiles();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sharedFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sharedFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();

          // Property: Middleware should not be in shared layer
          // Exception: Type definitions for middleware are allowed
          const hasMiddlewareImplementation = detectMiddlewareImplementation(sourceFile);

          if (hasMiddlewareImplementation) {
            const errorMsg = `Middleware implementation found in shared layer: ${filePath}`;
            expect(hasMiddlewareImplementation).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not contain logging infrastructure in shared layer', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'shared/**/*.ts',
      '!shared/**/*.test.ts',
      '!shared/**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sharedFiles = project.getSourceFiles();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sharedFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sharedFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();

          // Property: Logging infrastructure should not be in shared layer
          // Exception: Type definitions for logging are allowed
          const hasLoggingInfrastructure = detectLoggingInfrastructure(sourceFile);

          if (hasLoggingInfrastructure) {
            const errorMsg = `Logging infrastructure found in shared layer: ${filePath}`;
            expect(hasLoggingInfrastructure).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not contain caching infrastructure in shared layer', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'shared/**/*.ts',
      '!shared/**/*.test.ts',
      '!shared/**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sharedFiles = project.getSourceFiles();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sharedFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sharedFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();

          // Property: Caching infrastructure should not be in shared layer
          // Exception: Type definitions for caching are allowed
          const hasCachingInfrastructure = detectCachingInfrastructure(sourceFile);

          if (hasCachingInfrastructure) {
            const errorMsg = `Caching infrastructure found in shared layer: ${filePath}`;
            expect(hasCachingInfrastructure).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only use browser-safe APIs in shared layer', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'shared/**/*.ts',
      '!shared/**/*.test.ts',
      '!shared/**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sharedFiles = project.getSourceFiles();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sharedFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sharedFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();

          // Property: Only browser-safe APIs should be used
          const unsafeAPIs = detectUnsafeBrowserAPIs(sourceFile);

          if (unsafeAPIs.length > 0) {
            const errorMsg = `Browser-unsafe APIs found in shared layer ${filePath}:\n${unsafeAPIs.join('\n')}`;
            expect(unsafeAPIs.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should verify shared utilities are client-safe', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Test various utility categories
        fc.constantFrom(
          'date-formatting',
          'string-manipulation',
          'validation',
          'transformation',
          'error-handling'
        ),
        async (utilityCategory) => {
          const project = new Project({
            tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
            skipAddingFilesFromTsConfig: true,
          });

          project.addSourceFilesAtPaths([
            'shared/utils/**/*.ts',
            '!shared/utils/**/*.test.ts',
            '!shared/utils/**/*.spec.ts',
            '!**/node_modules/**',
            '!**/dist/**',
          ]);

          const utilityFiles = project.getSourceFiles();

          for (const sourceFile of utilityFiles) {
            const filePath = sourceFile.getFilePath();

            // Property: Utilities should be client-safe
            const violations: string[] = [];

            // Check for server-only patterns
            violations.push(...detectServerOnlyPatterns(sourceFile));
            violations.push(...detectServerOnlyImports(sourceFile));
            violations.push(...detectNodeSpecificAPIs(sourceFile));

            if (violations.length > 0) {
              const errorMsg = `Utility ${filePath} is not client-safe:\n${violations.join('\n')}`;
              expect(violations.length).toBe(0);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not have database connection code in shared layer', async () => {
    const project = new Project({
      tsConfigFilePath: path.resolve(process.cwd(), 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true,
    });

    project.addSourceFilesAtPaths([
      'shared/**/*.ts',
      '!shared/**/*.test.ts',
      '!shared/**/*.spec.ts',
      '!**/node_modules/**',
      '!**/dist/**',
    ]);

    const sharedFiles = project.getSourceFiles();

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: Math.max(0, sharedFiles.length - 1) }),
        async (fileIndex) => {
          const sourceFile = sharedFiles[fileIndex];
          if (!sourceFile) return;

          const filePath = sourceFile.getFilePath();

          // Property: No database connections in shared layer
          const hasDatabaseConnection = detectDatabaseConnectionCode(sourceFile);

          if (hasDatabaseConnection.length > 0) {
            const errorMsg = `Database connection code found in shared layer ${filePath}:\n${hasDatabaseConnection.join('\n')}`;
            expect(hasDatabaseConnection.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect server-only infrastructure patterns in code
 */
function detectServerOnlyPatterns(sourceFile: SourceFile): string[] {
  const violations: string[] = [];
  const text = sourceFile.getFullText();

  // Check for Express middleware patterns
  if (text.includes('Request') && text.includes('Response') && text.includes('NextFunction')) {
    violations.push('  - Express middleware pattern detected (Request, Response, NextFunction)');
  }

  // Check for HTTP server patterns
  if (text.includes('createServer') || text.includes('http.Server')) {
    violations.push('  - HTTP server creation detected');
  }

  // Check for session management
  if (text.includes('express-session') || text.includes('SessionData')) {
    violations.push('  - Session management code detected');
  }

  // Check for rate limiting
  if (text.includes('rate-limit') || text.includes('RateLimiter')) {
    violations.push('  - Rate limiting infrastructure detected');
  }

  return violations;
}

/**
 * Detect server-only imports
 */
function detectServerOnlyImports(sourceFile: SourceFile): string[] {
  const violations: string[] = [];
  const imports = sourceFile.getImportDeclarations();

  const serverOnlyModules = [
    'express',
    'express-session',
    'express-rate-limit',
    'helmet',
    'cors',
    'passport',
    'bcrypt',
    'bcryptjs',
    'jsonwebtoken',
    'nodemailer',
    'node-cron',
    'pino',
    'winston',
    'morgan',
    'redis',
    'ioredis',
    'pg',
    'postgres',
    'drizzle-orm',
    'neo4j-driver',
  ];

  for (const importDecl of imports) {
    const moduleSpecifier = importDecl.getModuleSpecifierValue();

    for (const serverModule of serverOnlyModules) {
      if (moduleSpecifier === serverModule || moduleSpecifier.startsWith(`${serverModule}/`)) {
        violations.push(`  - Server-only import detected: ${moduleSpecifier}`);
      }
    }
  }

  return violations;
}

/**
 * Detect Node.js-specific APIs that aren't browser-safe
 */
function detectNodeSpecificAPIs(sourceFile: SourceFile): string[] {
  const violations: string[] = [];
  const text = sourceFile.getFullText();

  // Node.js built-in modules that aren't browser-safe
  const nodeAPIs = [
    { pattern: /\bfs\./g, name: 'fs (file system)' },
    { pattern: /\bpath\./g, name: 'path' },
    { pattern: /\bprocess\./g, name: 'process' },
    { pattern: /\bBuffer\./g, name: 'Buffer' },
    { pattern: /\b__dirname\b/g, name: '__dirname' },
    { pattern: /\b__filename\b/g, name: '__filename' },
    { pattern: /\brequire\(/g, name: 'require()' },
    { pattern: /\bchild_process\./g, name: 'child_process' },
    { pattern: /\bos\./g, name: 'os' },
    { pattern: /\bcrypto\.createHash\b/g, name: 'crypto.createHash' },
  ];

  // Check imports first to see if these are actually used
  const imports = sourceFile.getImportDeclarations();
  const importedModules = new Set(
    imports.map(imp => imp.getModuleSpecifierValue())
  );

  for (const api of nodeAPIs) {
    const matches = text.match(api.pattern);
    if (matches && matches.length > 0) {
      // Check if it's from an import (might be a type-only import which is OK)
      const isTypeOnly = imports.some(imp => {
        const moduleSpec = imp.getModuleSpecifierValue();
        return (moduleSpec.includes(api.name.split(' ')[0]) || moduleSpec === 'fs' || moduleSpec === 'path') 
          && imp.isTypeOnly();
      });

      if (!isTypeOnly) {
        violations.push(`  - Node.js-specific API detected: ${api.name}`);
      }
    }
  }

  return violations;
}

/**
 * Detect middleware implementation patterns
 */
function detectMiddlewareImplementation(sourceFile: SourceFile): boolean {
  const text = sourceFile.getFullText();
  const filePath = sourceFile.getFilePath();

  // Allow type definitions
  if (filePath.includes('/types/') || text.includes('export type') || text.includes('export interface')) {
    // Check if it's ONLY type definitions
    const hasImplementation = text.includes('export class') || 
                              text.includes('export function') ||
                              text.includes('export const') && !text.includes('export const type');
    
    if (!hasImplementation) {
      return false;
    }
  }

  // Check for middleware patterns
  const middlewarePatterns = [
    /function\s+\w+\s*\(\s*req\s*:\s*Request\s*,\s*res\s*:\s*Response\s*,\s*next\s*:\s*NextFunction/,
    /\(\s*req\s*:\s*Request\s*,\s*res\s*:\s*Response\s*,\s*next\s*:\s*NextFunction\s*\)\s*=>/,
    /middleware\s*:\s*RequestHandler/,
    /app\.use\(/,
    /router\.use\(/,
  ];

  return middlewarePatterns.some(pattern => pattern.test(text));
}

/**
 * Detect logging infrastructure
 */
function detectLoggingInfrastructure(sourceFile: SourceFile): boolean {
  const text = sourceFile.getFullText();
  const filePath = sourceFile.getFilePath();

  // Allow type definitions
  if (filePath.includes('/types/')) {
    return false;
  }

  // Check for logging infrastructure patterns
  const loggingPatterns = [
    /class\s+\w*Logger/,
    /createLogger\(/,
    /pino\(/,
    /winston\./,
    /new\s+Logger\(/,
    /logger\.child\(/,
    /transport\s*:/,
  ];

  return loggingPatterns.some(pattern => pattern.test(text));
}

/**
 * Detect caching infrastructure
 */
function detectCachingInfrastructure(sourceFile: SourceFile): boolean {
  const text = sourceFile.getFullText();
  const filePath = sourceFile.getFilePath();

  // Allow type definitions
  if (filePath.includes('/types/')) {
    return false;
  }

  // Check for caching infrastructure patterns
  const cachingPatterns = [
    /class\s+\w*Cache/,
    /createClient\(/,
    /redis\./,
    /ioredis/,
    /new\s+Redis\(/,
    /cache\.set\(/,
    /cache\.get\(/,
    /CacheManager/,
  ];

  return cachingPatterns.some(pattern => pattern.test(text));
}

/**
 * Detect browser-unsafe APIs
 */
function detectUnsafeBrowserAPIs(sourceFile: SourceFile): string[] {
  const violations: string[] = [];
  const text = sourceFile.getFullText();

  // APIs that don't work in browsers
  const unsafeAPIs = [
    { pattern: /\bfs\.readFileSync\b/g, name: 'fs.readFileSync' },
    { pattern: /\bfs\.writeFileSync\b/g, name: 'fs.writeFileSync' },
    { pattern: /\bfs\.existsSync\b/g, name: 'fs.existsSync' },
    { pattern: /\bfs\.mkdirSync\b/g, name: 'fs.mkdirSync' },
    { pattern: /\bprocess\.env\b/g, name: 'process.env' },
    { pattern: /\bprocess\.cwd\b/g, name: 'process.cwd' },
    { pattern: /\bprocess\.exit\b/g, name: 'process.exit' },
  ];

  for (const api of unsafeAPIs) {
    const matches = text.match(api.pattern);
    if (matches && matches.length > 0) {
      violations.push(`  - Browser-unsafe API: ${api.name}`);
    }
  }

  return violations;
}

/**
 * Detect database connection code
 */
function detectDatabaseConnectionCode(sourceFile: SourceFile): string[] {
  const violations: string[] = [];
  const text = sourceFile.getFullText();
  const filePath = sourceFile.getFilePath();

  // Allow type definitions
  if (filePath.includes('/types/')) {
    return violations;
  }

  // Check for database connection patterns
  const dbPatterns = [
    { pattern: /drizzle\(/g, name: 'Drizzle ORM connection' },
    { pattern: /new\s+Pool\(/g, name: 'PostgreSQL Pool' },
    { pattern: /createPool\(/g, name: 'Database pool creation' },
    { pattern: /neo4j\.driver\(/g, name: 'Neo4j driver connection' },
    { pattern: /mongoose\.connect\(/g, name: 'Mongoose connection' },
    { pattern: /createConnection\(/g, name: 'Database connection creation' },
  ];

  for (const pattern of dbPatterns) {
    const matches = text.match(pattern.pattern);
    if (matches && matches.length > 0) {
      violations.push(`  - Database connection code: ${pattern.name}`);
    }
  }

  return violations;
}

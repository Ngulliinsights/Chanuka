/**
 * Test setup and utilities for the TypeScript Error Fixer
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Creates a temporary test project structure for testing
 */
export function createTestProject(): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-fixer-test-'));
  
  // Create basic project structure
  const dirs = [
    'server/features/users',
    'client/src/components',
    'shared/schema',
    'shared/core/src',
  ];
  
  dirs.forEach(dir => {
    fs.mkdirSync(path.join(tempDir, dir), { recursive: true });
  });
  
  // Create sample files
  createSampleFiles(tempDir);
  
  return tempDir;
}

/**
 * Creates sample TypeScript files with known errors for testing
 */
function createSampleFiles(projectRoot: string): void {
  // Sample schema file
  fs.writeFileSync(
    path.join(projectRoot, 'shared/schema/users.ts'),
    `export const users = {
  id: 'serial',
  email: 'varchar',
  name: 'varchar',
  created_at: 'timestamp',
};

export const userProfiles = {
  id: 'serial',
  user_id: 'integer',
  bio: 'text',
  avatar_url: 'varchar',
};`
  );
  
  // Sample shared core utility
  fs.writeFileSync(
    path.join(projectRoot, 'shared/core/src/logger.ts'),
    `export const logger = {
  info: (message: string) => console.log(message),
  error: (message: string) => console.error(message),
  warn: (message: string) => console.warn(message),
};

export function createLogger(name: string) {
  return logger;
}`
  );
  
  // Sample file with TypeScript errors
  fs.writeFileSync(
    path.join(projectRoot, 'server/features/users/user-service.ts'),
    `// This file contains intentional TypeScript errors for testing
import { users } from '@server/infrastructure/schema/users'; // Missing import
// Missing logger import

export class UserService {
  async getUser(id: number) {
    logger.info('Getting user'); // Error: logger not imported
    
    const user = await db.select().from(users).where(eq(users.id, id)); // Error: db, eq not imported
    
    return ApiSuccess(user); // Error: ApiSuccess not imported
  }
  
  private unusedMethod() { // Error: unused method
    const unusedVariable = 'test'; // Error: unused variable
  }
}`
  );
  
  // TypeScript config
  fs.writeFileSync(
    path.join(projectRoot, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        exactOptionalPropertyTypes: true,
        baseUrl: '.',
        paths: {
          '@shared/*': ['shared/*'],
        },
      },
      include: ['**/*.ts'],
      exclude: ['node_modules', 'dist'],
    }, null, 2)
  );
}

/**
 * Cleans up a test project directory
 */
export function cleanupTestProject(projectRoot: string): void {
  if (fs.existsSync(projectRoot)) {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
}

/**
 * Reads a file from the test project
 */
export function readTestFile(projectRoot: string, relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf-8');
}

/**
 * Writes a file to the test project
 */
export function writeTestFile(projectRoot: string, relativePath: string, content: string): void {
  const fullPath = path.join(projectRoot, relativePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content);
}

/**
 * Checks if a file exists in the test project
 */
export function testFileExists(projectRoot: string, relativePath: string): boolean {
  return fs.existsSync(path.join(projectRoot, relativePath));
}
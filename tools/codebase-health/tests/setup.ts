// Vitest setup file
import * as fs from 'fs';
import * as path from 'path';
import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(() => {
  // Ensure test directories exist
  const testDataDir = path.join(__dirname, 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
});

// Global test teardown
afterAll(() => {
  // Cleanup test files if needed
});
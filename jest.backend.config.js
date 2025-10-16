export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  displayName: 'Backend & Database Tests',
  roots: ['<rootDir>/server', '<rootDir>/db'],
  testMatch: [
    '**/server/**/__tests__/**/*.ts',
    '**/server/**/?(*.)+(spec|test).ts',
    '**/db/**/__tests__/**/*.ts',
    '**/db/**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext'
      }
    }]
  },
  collectCoverageFrom: [
    'server/**/*.ts',
    'db/**/*.ts',
    '!server/**/*.d.ts',
    '!db/**/*.d.ts',
    '!server/tests/**',
    '!server/index.ts'
  ],
  coverageDirectory: 'coverage/backend',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/server/tests/setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1,
  // Database-specific test patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/client/',
    '/dist/'
  ]
};
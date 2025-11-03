export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  display_name: 'Backend & Database Tests',
  roots: ['<rootDir>/server', '<rootDir>/shared'],
  testMatch: [
    '**/server/**/__tests__/**/*.ts',
    '**/server/**/?(*.)+(spec|test).ts',
    '**/shared/**/__tests__/**/*.ts',
    '**/shared/**/?(*.)+(spec|test).ts'
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
    'shared/**/*.ts',
    '!server/**/*.d.ts',
    '!shared/**/*.d.ts',
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





































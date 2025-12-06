/**
 * Root Vitest Setup Orchestrator
 * 
 * This file serves as the single entry point for Vitest setup.
 * It delegates to tests/setup/ which contains the actual setup logic.
 * 
 * Referenced by: vitest.config.ts (setupFiles)
 */

// Import test environment setup (global utilities, mocks, configuration)
import './tests/setup/vitest';

// Import unified test environment (Redis mocks, Performance API, etc.)
import './tests/setup/test-environment';
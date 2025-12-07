/**
 * MAIN TEST SETUP ENTRY POINT
 * 
 * This file coordinates all test setup for the entire workspace.
 * It's loaded by vitest.workspace.ts and ensures consistent
 * test environment across all modules.
 */

// Import module-specific setups
import './modules/client';
import './modules/server';
import './modules/shared';

// Vitest setup (global utilities, mocks, configuration)
export {} from './vitest';

export {};

/**
 * Shared testing utilities and helpers
 * Barrel exports for clean imports across the application
 */

export * from './test-utilities';

// Re-export commonly used testing library utilities
export {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
  cleanup,
} from '@testing-library/react';

export {
  renderHook,
  act as hookAct,
} from '@testing-library/react';

export { default as userEvent } from '@testing-library/user-event';

// Jest utilities
export const mockFn = jest.fn;
export const mockImplementation = jest.fn().mockImplementation;
export const mockResolvedValue = jest.fn().mockResolvedValue;
export const mockRejectedValue = jest.fn().mockRejectedValue;


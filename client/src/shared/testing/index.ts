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

// Jest utilities - using vi for Vitest compatibility
export const mockFn = () => vi.fn();
export const mockImplementation = (impl: any) => vi.fn().mockImplementation(impl);
export const mockResolvedValue = (value: any) => vi.fn().mockResolvedValue(value);
export const mockRejectedValue = (value: any) => vi.fn().mockRejectedValue(value);


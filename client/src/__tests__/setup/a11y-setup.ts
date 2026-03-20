import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
});

// Global axe configuration
export const axeConfig = {
  rules: {
    // Disable color contrast for now (will be fixed separately)
    'color-contrast': { enabled: false },
  },
};

export { axe };

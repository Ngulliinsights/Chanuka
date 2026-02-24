/**
 * Accessibility Testing Setup for Chanuka Client UI
 * 
 * This file configures vitest-axe for automated accessibility testing
 * to ensure WCAG 2.1 AA compliance as required by REQ-PA-002
 */

import '@testing-library/vitest-dom';
import { configure } from '@testing-library/react';
import { toHaveNoViolations } from 'vitest-axe';

// Extend vitest matchers with accessibility assertions
expect.extend(toHaveNoViolations);

// Configure React Testing Library for accessibility
configure({
  // Increase timeout for accessibility tests as they can be slower
  asyncUtilTimeout: 5000,
  
  // Configure better error messages for accessibility failures
  getElementError: (message, container) => {
    const error = new Error(
      [
        message,
        'Here is the accessible tree:',
        container ? container.outerHTML : 'No container provided',
      ].join('\n\n')
    );
    error.name = 'AccessibilityTestingLibraryElementError';
    return error;
  },
});

// Global test setup for accessibility
beforeEach(() => {
  // Reset any global accessibility state before each test
  document.body.innerHTML = '';
  
  // Ensure we have a clean document for each test
  document.documentElement.lang = 'en';
  
  // Add any global accessibility setup here
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'sr-only focus:not-sr-only';
  document.body.prepend(skipLink);
});

// Clean up after each test
afterEach(() => {
  // Clean up any accessibility-related global state
  document.body.innerHTML = '';
});

// Global accessibility test configuration
global.axeConfig = {
  rules: {
    // Configure specific accessibility rules for Chanuka platform
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'aria-labels': { enabled: true },
    'semantic-html': { enabled: true },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
};
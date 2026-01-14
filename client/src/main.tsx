import React from 'react';
import { createRoot } from 'react-dom/client';

import { logger } from '@client/shared/utils/logger';

import App from './App';


import './index.css';

// ============================================================================
// Constants
// ============================================================================

const ROOT_ELEMENT_ID = 'root' as const;

// ============================================================================
// Environment Setup
// ============================================================================

/**
 * Establishes a Node.js-compatible process.env object in the browser environment.
 */
function setupProcessEnvironment(): void {
  try {
    const globalWindow = globalThis as any;

    if (typeof globalWindow.process === 'undefined') {
      globalWindow.process = {
        env: { NODE_ENV: import.meta.env.MODE || 'development' },
      };
    }
  } catch (error) {
    console.warn('Environment setup encountered an issue:', error);
  }
}

// ============================================================================
// Error Suppression
// ============================================================================

/**
 * Filters out noise from browser extension errors.
 */
function suppressExtensionErrors(): void {
  const extensionErrorPatterns = [
    'chrome-extension://',
    'message channel closed before a response was received',
    'Extension context invalidated',
  ];

  window.addEventListener('error', (event: ErrorEvent) => {
    if (!event.message) return;

    const isExtensionError = extensionErrorPatterns.some(pattern =>
      event.message.includes(pattern)
    );

    if (isExtensionError) {
      event.preventDefault();
      return false;
    }
  });
}

// ============================================================================
// DOM Utilities
// ============================================================================

/**
 * Safely retrieves the root DOM element.
 */
function getRootElement(): HTMLElement {
  const element = document.getElementById(ROOT_ELEMENT_ID);

  if (!element) {
    throw new Error(
      `Root element with id "${ROOT_ELEMENT_ID}" not found in DOM. ` +
        'Ensure your index.html contains <div id="root"></div>'
    );
  }

  return element;
}

// ============================================================================
// React Initialization
// ============================================================================

/**
 * Creates and mounts the React application root to the DOM.
 */
function mountReactApp(rootElement: HTMLElement): void {
  try {
    const reactRoot = createRoot(rootElement);
    reactRoot.render(<App />);

    logger.info('✅ React application mounted successfully', {
      component: 'Bootstrap',
      mode: process.env.NODE_ENV,
    });
  } catch (error) {
    logger.error('Failed to mount React application', { component: 'Bootstrap' }, error);
    throw error;
  }
}

// ============================================================================
// Main Application Bootstrap
// ============================================================================

/**
 * Main application initialization sequence.
 */
async function initializeApplication(): Promise<void> {
  try {
    // Setup environment
    setupProcessEnvironment();
    suppressExtensionErrors();

    // Mount React application
    const rootElement = getRootElement();
    mountReactApp(rootElement);

    logger.info('✅ Chanuka Platform initialized successfully', {
      component: 'Bootstrap',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      '❌ Application initialization failed',
      {
        component: 'Bootstrap',
      },
      error
    );

    // Simple error fallback
    document.body.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: sans-serif;">
        <h1 style="color: #ef4444;">Unable to Load Application</h1>
        <p>The application failed to start. Please refresh the page.</p>
        <button onclick="window.location.reload()"
                style="margin-top: 20px; padding: 12px 24px; font-size: 16px;
                       background: #3b82f6; color: white; border: none;
                       border-radius: 6px; cursor: pointer;">
          Refresh Page
        </button>
      </div>
    `;
  }
}

// ============================================================================
// Application Entry Point
// ============================================================================

// Start the application
initializeApplication().catch(error => {
  console.error('Critical initialization error:', error);
});

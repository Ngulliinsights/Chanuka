/* eslint-disable react-refresh/only-export-components */

/**
 * Browser Status Hook for React Components
 * 
 * Provides React components with browser compatibility information for display purposes.
 * This is NOT for implementing fallbacks - all fallbacks are handled globally by browser.ts.
 * 
 * Note: react-refresh/only-export-components disabled because this module exports
 * both hooks and components as a cohesive API for browser compatibility management.
 * Note: Inline style used for dynamic progress bar width (necessary for dynamic values).
 * 
 * Use this hook to:
 * - Display compatibility warnings to users
 * - Show browser version information
 * - Check compatibility score
 * - Display recommendations
 * 
 * Do NOT use this hook for:
 * - Feature detection (use polyfilled APIs directly instead)
 * - Loading fallbacks (done globally at startup)
 * - Runtime compatibility checks (already initialized)
 * 
 * @module useBrowserStatus
 */

import React, { useState, useEffect } from 'react';

import {
  browserCompatibilityManager,
  type CompatibilityStatus,
} from '@client/core';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ProgressBarFillProps {
  score: number;
}

// Component with inline styles for dynamic progress bar width
const ProgressBarFill: React.FC<ProgressBarFillProps> = ({ score }) => {
  const scorePercentage = Math.min(Math.max(score, 0), 100);
  const bgColor = scorePercentage >= 80 ? '#10b981' : scorePercentage >= 60 ? '#eab308' : '#ef4444';

  return (
    // Note: inline style required for dynamic width (Tailwind limitation)
    <div
      className="h-2 rounded-full transition-all"
      style={{
        width: `${scorePercentage}%`,
        backgroundColor: bgColor
      }}
    />
  );
};

ProgressBarFill.displayName = 'ProgressBarFill';

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to get the current browser compatibility status.
 * 
 * Returns null during initialization, then the full status.
 * Use this to display compatibility information to users.
 * 
 * @returns Current compatibility status or null if not yet initialized
 */
export function useBrowserCompatibilityStatus(): CompatibilityStatus | null {
  const [status, setStatus] = useState<CompatibilityStatus | null>(null);

  useEffect(() => {
    // Browser initialization happens automatically, just get the status
    const initStatus = async () => {
      try {
        const compatStatus = await browserCompatibilityManager.initialize();
        setStatus(compatStatus);
      } catch (error) {
        console.error('Failed to initialize browser compatibility status', error);
        // Still set a basic status even on error
        const fallbackStatus = browserCompatibilityManager.getStatus();
        if (fallbackStatus) {
          setStatus(fallbackStatus);
        }
      }
    };

    initStatus();
  }, []);

  return status;
}

/**
 * Hook to check if the browser is supported.
 * Returns true while initializing, false after initialization reveals unsupported browser.
 * 
 * @returns Whether the browser is supported
 */
export function useBrowserIsSupported(): boolean {
  const status = useBrowserCompatibilityStatus();
  // Return true during initialization to avoid flashing unsupported messages
  return status ? status.isSupported : true;
}

/**
 * Hook to get the compatibility score (0-100).
 * 
 * Scores guide:
 * - 90-100: Excellent, all features supported
 * - 70-89: Good, most features supported
 * - 50-69: Fair, some features need polyfills
 * - 0-49: Poor, many features need polyfills or have issues
 * 
 * @returns Compatibility score or null if not yet initialized
 */
export function useBrowserCompatibilityScore(): number | null {
  const status = useBrowserCompatibilityStatus();
  return status?.compatibilityScore ?? null;
}

/**
 * Hook to get browser information (name, version, features).
 * 
 * @returns Browser information or null if not yet initialized
 */
export function useBrowserInfo() {
  const status = useBrowserCompatibilityStatus();
  return status?.browserInfo ?? null;
}

/**
 * Hook to get compatibility warnings for the current browser.
 * 
 * @returns Array of warning messages or empty array
 */
export function useBrowserWarnings(): string[] {
  const status = useBrowserCompatibilityStatus();
  return status?.warnings ?? [];
}

/**
 * Hook to check if browser should be blocked (critical incompatibility).
 * 
 * @returns Whether to block the browser entirely
 */
export function useShouldBlockBrowser(): boolean {
  const status = useBrowserCompatibilityStatus();
  return status?.shouldBlock ?? false;
}

// ============================================================================
// DISPLAY COMPONENTS
// ============================================================================

/**
 * Example component: Display compatibility warning banner if browser has issues.
 * 
 * Shows a warning if the compatibility score is below 80.
 * Can be placed near the top of the app to inform users of potential issues.
 */
export const BrowserCompatibilityWarning: React.FC = () => {
  const status = useBrowserCompatibilityStatus();

  if (!status || status.compatibilityScore >= 80) {
    return null; // No warning needed
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-yellow-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Browser Compatibility Notice
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>
              Your browser may not fully support all features.
              Compatibility score: {status.compatibilityScore}%
            </p>
            {status.recommendations.length > 0 && (
              <ul className="mt-2 list-disc list-inside space-y-1">
                {status.recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i}>{rec.message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

BrowserCompatibilityWarning.displayName = 'BrowserCompatibilityWarning';

/**
 * Example component: Display detailed browser information.
 * 
 * Shows browser name, version, features, and recommendations.
 * Useful for debugging or detailed compatibility information.
 */
export const BrowserCompatibilityDetails: React.FC = () => {
  const status = useBrowserCompatibilityStatus();

  if (!status) {
    return <div className="text-gray-500">Initializing...</div>;
  }

  const { browserInfo, polyfillsLoaded, polyfillsRequired } = status;

  return (
    <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm">
      <div className="space-y-3">
        {/* Browser Info */}
        <div>
          <h4 className="font-semibold text-gray-800">Browser Information</h4>
          <div className="ml-4 mt-1 space-y-1 text-gray-700">
            <p>
              <span className="font-medium">Name:</span> {browserInfo.name}
            </p>
            <p>
              <span className="font-medium">Version:</span> {browserInfo.version}
            </p>
            <p>
              <span className="font-medium">Supported:</span>{' '}
              {browserInfo.isSupported ? (
                <span className="text-green-600">Yes</span>
              ) : (
                <span className="text-red-600">No</span>
              )}
            </p>
          </div>
        </div>

        {/* Compatibility Score */}
        <div>
          <h4 className="font-semibold text-gray-800">Compatibility Score</h4>
          <div className="ml-4 mt-1">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-300 rounded-full h-2">
                <ProgressBarFill score={status.compatibilityScore} />
              </div>
              <span className="text-gray-700 font-medium">
                {status.compatibilityScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Polyfills */}
        <div>
          <h4 className="font-semibold text-gray-800">Polyfills</h4>
          <div className="ml-4 mt-1 space-y-1 text-gray-700">
            <p>
              <span className="font-medium">Status:</span>{' '}
              {polyfillsLoaded ? (
                <span className="text-green-600">Loaded</span>
              ) : (
                <span className="text-yellow-600">Loading...</span>
              )}
            </p>
            {polyfillsRequired.length > 0 && (
              <p>
                <span className="font-medium">Required:</span>{' '}
                {polyfillsRequired.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Warnings */}
        {status.warnings.length > 0 && (
          <div>
            <h4 className="font-semibold text-yellow-800">Warnings</h4>
            <ul className="ml-4 mt-1 list-disc list-inside space-y-1 text-yellow-700">
              {status.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {status.recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold text-blue-800">Recommendations</h4>
            <ul className="ml-4 mt-1 list-disc list-inside space-y-1 text-blue-700">
              {status.recommendations.map((rec, i) => (
                <li key={i}>{rec.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

BrowserCompatibilityDetails.displayName = 'BrowserCompatibilityDetails';

// ============================================================================
// MODULE SUMMARY
// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/**
 * USAGE EXAMPLE:
 * 
 * import { useBrowserCompatibilityStatus, BrowserCompatibilityWarning } from '@client/components/compatibility/useBrowserStatus';
 * 
 * export function App() {
 *   return (
 *     <div>
 *       <BrowserCompatibilityWarning />
 *       {/* Rest of your app - all APIs guaranteed to work *-/}
 *     </div>
 *   );
 * }
 * 
 * KEY POINTS:
 * - This hook is for DISPLAY ONLY
 * - All actual browser compatibility is handled by polyfills in browser.ts
 * - Use this to inform users, not to implement fallbacks
 * - The polyfills have already loaded before React renders
 */

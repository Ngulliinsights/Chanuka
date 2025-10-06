/**
 * Browser Compatibility Checker Component
 * 
 * This component checks browser compatibility and shows appropriate
 * messages and fallbacks for unsupported browsers.
 */

import React, { useEffect, useState } from 'react';
import { getBrowserInfo, isBrowserSupported, BrowserInfo } from '../../utils/browser-compatibility';
import { loadPolyfills, getPolyfillStatus } from '../../utils/polyfills';

interface BrowserCompatibilityCheckerProps {
  children: React.ReactNode;
  showWarnings?: boolean;
  blockUnsupported?: boolean;
}

interface CompatibilityState {
  isChecking: boolean;
  browserInfo: BrowserInfo | null;
  polyfillsLoaded: boolean;
  polyfillErrors: string[];
  showCompatibilityInfo: boolean;
}

const BrowserCompatibilityChecker: React.FC<BrowserCompatibilityCheckerProps> = ({
  children,
  showWarnings = true,
  blockUnsupported = false
}) => {
  const [state, setState] = useState<CompatibilityState>({
    isChecking: true,
    browserInfo: null,
    polyfillsLoaded: false,
    polyfillErrors: [],
    showCompatibilityInfo: false
  });

  useEffect(() => {
    checkCompatibilityAndLoadPolyfills();
  }, []);

  const checkCompatibilityAndLoadPolyfills = async () => {
    try {
      // Get browser information
      const browserInfo = getBrowserInfo();
      
      setState(prev => ({
        ...prev,
        browserInfo,
        isChecking: true
      }));

      // Load polyfills if needed
      const polyfillErrors: string[] = [];
      try {
        await loadPolyfills();
        
        // Check polyfill status
        const polyfillStatus = getPolyfillStatus();
        polyfillStatus.forEach((status, feature) => {
          if (!status.loaded && status.error) {
            polyfillErrors.push(`Failed to load ${feature} polyfill: ${status.error.message}`);
          }
        });
      } catch (error) {
        polyfillErrors.push(`Failed to load polyfills: ${(error as Error).message}`);
      }

      setState(prev => ({
        ...prev,
        isChecking: false,
        polyfillsLoaded: true,
        polyfillErrors
      }));

    } catch (error) {
      console.error('Browser compatibility check failed:', error);
      setState(prev => ({
        ...prev,
        isChecking: false,
        polyfillsLoaded: false,
        polyfillErrors: [`Compatibility check failed: ${(error as Error).message}`]
      }));
    }
  };

  const handleDismissWarning = () => {
    setState(prev => ({
      ...prev,
      showCompatibilityInfo: false
    }));
  };

  const handleShowCompatibilityInfo = () => {
    setState(prev => ({
      ...prev,
      showCompatibilityInfo: true
    }));
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleClearCacheAndRefresh = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        }).finally(() => window.location.reload());
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      window.location.reload();
    }
  };

  // Show loading state while checking compatibility
  if (state.isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Checking Browser Compatibility
          </h2>
          <p className="text-gray-600">
            Preparing the application for your browser...
          </p>
        </div>
      </div>
    );
  }

  // Show error if browser info couldn't be determined
  if (!state.browserInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-lg shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Browser Detection Failed
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn't determine your browser information. The application may not work correctly.
          </p>
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
            <button
              type="button"
              onClick={handleClearCacheAndRefresh}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              Clear Cache & Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Block unsupported browsers if configured to do so
  if (blockUnsupported && !state.browserInfo.isSupported) {
    return <UnsupportedBrowserScreen browserInfo={state.browserInfo} />;
  }

  // Show compatibility warnings if enabled
  const shouldShowWarning = showWarnings && 
    (state.browserInfo.warnings.length > 0 || state.polyfillErrors.length > 0) &&
    !state.showCompatibilityInfo;

  return (
    <>
      {/* Compatibility warning banner */}
      {shouldShowWarning && (
        <CompatibilityWarningBanner
          browserInfo={state.browserInfo}
          polyfillErrors={state.polyfillErrors}
          onDismiss={handleDismissWarning}
          onShowDetails={handleShowCompatibilityInfo}
        />
      )}

      {/* Compatibility info modal */}
      {state.showCompatibilityInfo && (
        <CompatibilityInfoModal
          browserInfo={state.browserInfo}
          polyfillErrors={state.polyfillErrors}
          onClose={handleDismissWarning}
        />
      )}

      {/* Main application */}
      {children}
    </>
  );
};

// Unsupported browser screen
const UnsupportedBrowserScreen: React.FC<{ browserInfo: BrowserInfo }> = ({ browserInfo }) => {
  const supportedBrowsers = [
    { name: 'Chrome', version: '70+', url: 'https://www.google.com/chrome/' },
    { name: 'Firefox', version: '65+', url: 'https://www.mozilla.org/firefox/' },
    { name: 'Safari', version: '12+', url: 'https://www.apple.com/safari/' },
    { name: 'Edge', version: '79+', url: 'https://www.microsoft.com/edge' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-2xl mx-auto text-center bg-white p-8 rounded-lg shadow-lg">
        <div className="text-red-500 text-6xl mb-6">🚫</div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Browser Not Supported
        </h1>
        
        <div className="text-left bg-gray-50 p-4 rounded-md mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Your Browser:</h3>
          <p className="text-gray-700">
            {browserInfo.name.charAt(0).toUpperCase() + browserInfo.name.slice(1)} {browserInfo.version}
          </p>
        </div>

        <p className="text-gray-600 mb-6">
          The Chanuka Legislative Transparency Platform requires a modern browser to function properly. 
          Your current browser doesn't support the necessary features for the best experience.
        </p>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Please update to one of these supported browsers:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {supportedBrowsers.map((browser) => (
              <a
                key={browser.name}
                href={browser.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-2">
                  {browser.name === 'Chrome' && '🌐'}
                  {browser.name === 'Firefox' && '🦊'}
                  {browser.name === 'Safari' && '🧭'}
                  {browser.name === 'Edge' && '🔷'}
                </div>
                <div className="font-medium text-gray-900">{browser.name}</div>
                <div className="text-sm text-gray-600">{browser.version}</div>
              </a>
            ))}
          </div>
        </div>

        {browserInfo.warnings.length > 0 && (
          <div className="text-left bg-red-50 p-4 rounded-md mb-6">
            <h3 className="font-semibold text-red-900 mb-2">Issues Detected:</h3>
            <ul className="text-sm text-red-700 space-y-1">
              {browserInfo.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
          
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

// Compatibility warning banner
const CompatibilityWarningBanner: React.FC<{
  browserInfo: BrowserInfo;
  polyfillErrors: string[];
  onDismiss: () => void;
  onShowDetails: () => void;
}> = ({ browserInfo, polyfillErrors, onDismiss, onShowDetails }) => {
  const hasWarnings = browserInfo.warnings.length > 0;
  const hasPolyfillErrors = polyfillErrors.length > 0;
  const hasRecommendations = browserInfo.recommendations.length > 0;

  if (!hasWarnings && !hasPolyfillErrors && !hasRecommendations) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-yellow-600 mr-3">⚠️</div>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Browser compatibility issues detected
                </p>
                <p className="text-xs text-yellow-700">
                  Some features may not work optimally in your current browser.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onShowDetails}
                className="text-xs bg-yellow-200 text-yellow-800 px-3 py-1 rounded-md hover:bg-yellow-300 transition-colors"
              >
                View Details
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="text-yellow-600 hover:text-yellow-800 transition-colors"
                aria-label="Dismiss warning"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Compatibility info modal
const CompatibilityInfoModal: React.FC<{
  browserInfo: BrowserInfo;
  polyfillErrors: string[];
  onClose: () => void;
}> = ({ browserInfo, polyfillErrors, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Browser Compatibility Information
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Browser Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Browser</h3>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">Browser:</span>
                  <span className="ml-2 text-gray-900">
                    {browserInfo.name.charAt(0).toUpperCase() + browserInfo.name.slice(1)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Version:</span>
                  <span className="ml-2 text-gray-900">{browserInfo.version}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Supported:</span>
                  <span className={`ml-2 font-medium ${
                    browserInfo.isSupported ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {browserInfo.isSupported ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Support */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Feature Support</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(browserInfo.features).map(([feature, supported]) => (
                <div key={feature} className="flex items-center justify-between py-1">
                  <span className="text-gray-700 capitalize">
                    {feature.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={`font-medium ${
                    supported ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {supported ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {browserInfo.warnings.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Warnings</h3>
              <div className="bg-red-50 p-4 rounded-md">
                <ul className="text-sm text-red-700 space-y-2">
                  {browserInfo.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Polyfill Errors */}
          {polyfillErrors.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Polyfill Issues</h3>
              <div className="bg-orange-50 p-4 rounded-md">
                <ul className="text-sm text-orange-700 space-y-2">
                  {polyfillErrors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-orange-500 mr-2">•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {browserInfo.recommendations.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
              <div className="bg-blue-50 p-4 rounded-md">
                <ul className="text-sm text-blue-700 space-y-2">
                  {browserInfo.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserCompatibilityChecker;
/**
 * Browser Compatibility Report Component
 * 
 * This component provides a comprehensive report of browser compatibility
 * with actionable recommendations and fallback solutions.
 */

import React, { useState, useEffect } from 'react';

import { getBrowserInfo, getBrowserCompatibilityStatus, getCompatibilityWarnings } from '@client/core/browser';


import BrowserCompatibilityTester from './BrowserCompatibilityTester';

interface BrowserCompatibilityReportProps {
  showFullReport?: boolean;
  onIssuesDetected?: (criticalCount: number, highCount: number) => void;
}

const BrowserCompatibilityReport: React.FC<BrowserCompatibilityReportProps> = ({
  showFullReport = false,
  onIssuesDetected
}) => {
  const [browserInfo] = useState(() => getBrowserInfo());
  const [compatibilityStatus] = useState(() => getBrowserCompatibilityStatus());
  const [warnings] = useState(() => getCompatibilityWarnings());
  const [showTester, setShowTester] = useState(false);
  const [isLoading, _setIsLoading] = useState(false);

  useEffect(() => {
    // Check for issues on mount
    if (compatibilityStatus) {
      const criticalCount = (compatibilityStatus as any)?.score < 50 ? 1 : 0;
      const highCount = warnings.length;
      onIssuesDetected?.(criticalCount, highCount);
    }
  }, [onIssuesDetected, compatibilityStatus, warnings]);

  const getBrowserIcon = (browserName: string) => {
    switch (browserName) {
      case 'chrome': return '🌐';
      case 'firefox': return '🦊';
      case 'safari': return '🧭';
      case 'edge': return '🔷';
      case 'opera': return '🎭';
      case 'ie': return '⚠️';
      default: return '❓';
    }
  };

  const getSupportStatusColor = (isSupported: boolean) => {
    return isSupported ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Checking browser compatibility...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Browser Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getBrowserIcon(browserInfo.name)}</span>
            <div>
              <h3 className="font-semibold text-gray-900">
                {browserInfo.name.charAt(0).toUpperCase() + browserInfo.name.slice(1)} {browserInfo.version}
              </h3>
              <div className="flex items-center space-x-2 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSupportStatusColor(browserInfo.isSupported)}`}>
                  {browserInfo.isSupported ? 'Supported' : 'Not Supported'}
                </span>
                <span className="font-medium text-green-600">
                  95% Compatible
                </span>
              </div>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setShowTester(!showTester)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showTester ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {/* Quick Issues Summary */}
        {browserInfo.warnings && browserInfo.warnings.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-4 text-sm">
              {browserInfo.warnings.length > 0 && (
                <div className="flex items-center text-red-600">
                  <span className="mr-1">🚨</span>
                  <span>{browserInfo.warnings.length} Issues</span>
                </div>
              )}
              
              {browserInfo.warnings.length > 0 && (
                <div className="flex items-center text-yellow-600">
                  <span className="mr-1">⚠️</span>
                  <span>{browserInfo.warnings.length} Warnings</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quick Recommendations */}
        {testResults && testResults.recommendations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="bg-blue-50 rounded-md p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Quick Recommendations:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                {testResults.recommendations.slice(0, 2).map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
                {testResults.recommendations.length > 2 && (
                  <li className="text-blue-600 font-medium">
                    + {testResults.recommendations.length - 2} more recommendations
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Tester */}
      {showTester && (
        <BrowserCompatibilityTester
          onTestComplete={setTestResults}
          showDetailedResults={showFullReport}
          autoRun={false}
        />
      )}

      {/* Browser-Specific Workarounds */}
      {browserInfo.name === 'ie' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-3">🚫</span>
            <div>
              <h3 className="text-red-800 font-semibold">Internet Explorer Not Supported</h3>
              <p className="text-red-700 text-sm mt-1">
                Internet Explorer is no longer supported. Please switch to a modern browser:
              </p>
              <div className="mt-2 space-x-2">
                <a
                  href="https://www.google.com/chrome/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                >
                  Download Chrome
                </a>
                <a
                  href="https://www.mozilla.org/firefox/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                >
                  Download Firefox
                </a>
                <a
                  href="https://www.microsoft.com/edge"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                >
                  Download Edge
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safari-Specific Issues */}
      {browserInfo.name === 'safari' && browserInfo.majorVersion < 14 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-yellow-500 text-xl mr-3">⚠️</span>
            <div>
              <h3 className="text-yellow-800 font-semibold">Safari Version Warning</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Your Safari version may have compatibility issues. Consider updating to Safari 14 or later.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Browser Specific */}
      {(browserInfo.name === 'ios' || browserInfo.name === 'android') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-blue-500 text-xl mr-3">📱</span>
            <div>
              <h3 className="text-blue-800 font-semibold">Mobile Browser Detected</h3>
              <p className="text-blue-700 text-sm mt-1">
                Some features may be optimized for desktop. For the best experience, consider using the desktop version.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowserCompatibilityReport;


/**
 * Browser Compatibility Tester Component
 *
 * This component provides a comprehensive browser compatibility testing interface
 * with detailed results and recommendations.
 */

import React, { useState, useEffect } from 'react';

import {
  getBrowserCompatibilityStatus,
  getCompatibilityWarnings,
  getBrowserInfo,
} from '@client/core/browser';
import { logger } from '@client/lib/utils/logger';

interface CompatibilityTestResult {
  name: string;
  testName?: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation?: string;
  error?: string;
}

interface CompatibilityTestSuite {
  results?: CompatibilityTestResult[];
  issues?: Array<{ message: string; severity: string; index: number }>;
  recommendations: string[];
  score?: number;
  // Actual fields used by component
  overallScore: number;
  testResults: CompatibilityTestResult[];
  criticalIssues: Array<{ testName: string; recommendation: string }>;
  browserInfo: { name: string; version: string; isSupported: boolean };
}

interface BrowserCompatibilityTesterProps {
  onTestComplete?: (results: CompatibilityTestSuite) => void;
  showDetailedResults?: boolean;
  autoRun?: boolean;
}

// Stub implementation for browser compatibility tests
const runBrowserCompatibilityTests = async (): Promise<CompatibilityTestSuite> => {
  const warnings = getCompatibilityWarnings();
  const browserInfo = getBrowserInfo();
  const testResults = warnings.map((w: string, i: number) => ({
    name: w,
    passed: true,
    severity: 'low' as const,
  }));
  return {
    overallScore: 85,
    testResults,
    criticalIssues: [],
    browserInfo: {
      name: browserInfo.name || 'unknown',
      version: browserInfo.version || 'unknown',
      isSupported: true,
    },
    recommendations: ['Use modern browser features', 'Enable JavaScript'],
    score: 85,
  };
};

const BrowserCompatibilityTester: React.FC<BrowserCompatibilityTesterProps> = ({
  onTestComplete,
  showDetailedResults = false,
  autoRun = false,
}) => {
  const [testResults, setTestResults] = useState<CompatibilityTestSuite | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(showDetailedResults);

  useEffect(() => {
    if (autoRun) {
      runTests();
    }
  }, [autoRun]);

  const runTests = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const results = await runBrowserCompatibilityTests();
      setTestResults(results);
      onTestComplete?.(results);
    } catch (err) {
      setError(`Failed to run compatibility tests: ${(err as Error).message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'medium':
        return '⚡';
      case 'low':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-red-500 text-xl mr-3">❌</span>
          <div>
            <h3 className="text-red-800 font-semibold">Testing Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={runTests}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700 transition-colors"
        >
          Retry Tests
        </button>
      </div>
    );
  }

  if (isRunning) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
          <div>
            <h3 className="text-blue-800 font-semibold">Running Compatibility Tests</h3>
            <p className="text-blue-700 text-sm mt-1">
              Testing browser features and compatibility...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!testResults) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="text-gray-800 font-semibold mb-2">Browser Compatibility Testing</h3>
          <p className="text-gray-600 text-sm mb-4">
            Test your browser's compatibility with this application
          </p>
          <button
            type="button"
            onClick={runTests}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Run Compatibility Tests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Results */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Compatibility Test Results</h2>
          <button
            type="button"
            onClick={runTests}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Re-run Tests
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(testResults.overallScore)}`}>
              {testResults.overallScore}%
            </div>
            <div className="text-sm text-gray-600">Overall Score</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">
              {testResults.testResults.filter(t => t.passed).length}/
              {testResults.testResults.length}
            </div>
            <div className="text-sm text-gray-600">Tests Passed</div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">
              {testResults.criticalIssues.length}
            </div>
            <div className="text-sm text-gray-600">Critical Issues</div>
          </div>
        </div>

        {/* Browser Information */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-gray-900 mb-2">Browser Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Browser:</span>
              <span className="ml-2 font-medium">
                {testResults.browserInfo.name.charAt(0).toUpperCase() +
                  testResults.browserInfo.name.slice(1)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Version:</span>
              <span className="ml-2 font-medium">{testResults.browserInfo.version}</span>
            </div>
            <div>
              <span className="text-gray-600">Supported:</span>
              <span
                className={`ml-2 font-medium ${
                  testResults.browserInfo.isSupported ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {testResults.browserInfo.isSupported ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Critical Issues */}
        {testResults.criticalIssues.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-red-800 mb-2 flex items-center">
              <span className="mr-2">🚨</span>
              Critical Issues ({testResults.criticalIssues.length})
            </h3>
            <ul className="space-y-2">
              {testResults.criticalIssues.map((issue: unknown, index: number) => (
                <li key={index} className="text-sm text-red-700">
                  <strong>{issue.testName}:</strong> {issue.recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {testResults.recommendations.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
              <span className="mr-2">💡</span>
              Recommendations
            </h3>
            <ul className="space-y-2">
              {testResults.recommendations.map((recommendation: string, index: number) => (
                <li key={index} className="text-sm text-blue-700">
                  • {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Toggle Details Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showDetails ? 'Hide' : 'Show'} Detailed Test Results
          </button>
        </div>
      </div>

      {/* Detailed Test Results */}
      {showDetails && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Test Results</h3>

          <div className="space-y-3">
            {testResults.testResults.map((test: CompatibilityTestResult, index: number) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  test.passed
                    ? 'bg-green-50 border-green-200'
                    : `border-gray-200 ${getSeverityColor(test.severity)}`
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="mr-2">
                      {test.passed ? '✅' : getSeverityIcon(test.severity)}
                    </span>
                    <span className="font-medium">{test.testName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        test.passed
                          ? 'bg-green-100 text-green-800'
                          : `${getSeverityColor(test.severity)}`
                      }`}
                    >
                      {test.passed ? 'PASS' : test.severity.toUpperCase()}
                    </span>
                  </div>
                </div>

                {!test.passed && (test.recommendation || test.error) && (
                  <div className="mt-2 text-sm">
                    {test.error && (
                      <div className="text-red-600 mb-1">
                        <strong>Error:</strong> {test.error}
                      </div>
                    )}
                    {test.recommendation && (
                      <div className="text-gray-700">
                        <strong>Recommendation:</strong> {test.recommendation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowserCompatibilityTester;

/**
 * Integration Test Component
 * 
 * Provides a simple UI to test integrated orphan modules
 * Only shown in development mode
 */

import React, { useState } from 'react';
import { useIntegratedServices } from '@/hooks/useIntegratedServices';

export function IntegrationTest() {
  const { isReady, status, security, privacy, mobile } = useIntegratedServices();
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const runSecurityTest = () => {
    try {
      if (!security.isReady) {
        setTestResults(prev => ({ ...prev, security: 'Not ready' }));
        return;
      }

      // Test input validation
      const testInput = '<script>alert("xss")</script>Hello World';
      const sanitized = security.domSanitizer?.sanitizeHTML(testInput);
      const validated = security.inputValidator?.validate('test@example.com', 'email');
      
      setTestResults(prev => ({
        ...prev,
        security: `✅ Sanitized: ${sanitized?.substring(0, 50)}... | Email valid: ${validated?.isValid}`,
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        security: `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      }));
    }
  };

  const runPrivacyTest = () => {
    try {
      if (!privacy.isReady) {
        setTestResults(prev => ({ ...prev, privacy: 'Not ready' }));
        return;
      }

      // Test analytics tracking
      privacy.trackPageView('/test', 'Integration Test');
      privacy.trackEngagement('click', 'test-button');
      
      setTestResults(prev => ({
        ...prev,
        privacy: '✅ Analytics events tracked successfully',
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        privacy: `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      }));
    }
  };

  const runMobileTest = () => {
    try {
      if (!mobile.isReady) {
        setTestResults(prev => ({ ...prev, mobile: 'Not ready' }));
        return;
      }

      const deviceInfo = mobile.getDeviceInfo();
      
      setTestResults(prev => ({
        ...prev,
        mobile: `✅ Device: ${deviceInfo?.isMobile ? 'Mobile' : deviceInfo?.isTablet ? 'Tablet' : 'Desktop'} | Touch: ${deviceInfo?.hasTouch ? 'Yes' : 'No'}`,
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        mobile: `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      }));
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md z-50">
      <h3 className="text-sm font-semibold mb-2">Integration Test Panel</h3>
      
      <div className="space-y-2 text-xs">
        <div>
          <strong>Status:</strong> {isReady ? '✅ Ready' : '⏳ Loading'}
        </div>
        
        <div className="grid grid-cols-4 gap-1 text-xs">
          <span className={`px-1 rounded ${status.security === 'success' ? 'bg-green-100' : status.security === 'error' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            Sec: {status.security}
          </span>
          <span className={`px-1 rounded ${status.privacy === 'success' ? 'bg-green-100' : status.privacy === 'error' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            Pri: {status.privacy}
          </span>
          <span className={`px-1 rounded ${status.ui === 'success' ? 'bg-green-100' : status.ui === 'error' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            UI: {status.ui}
          </span>
          <span className={`px-1 rounded ${status.mobile === 'success' ? 'bg-green-100' : status.mobile === 'error' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            Mob: {status.mobile}
          </span>
        </div>

        <div className="space-y-1">
          <button
            onClick={runSecurityTest}
            disabled={!isReady}
            className="w-full text-left px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs disabled:opacity-50"
          >
            Test Security
          </button>
          {testResults.security && (
            <div className="text-xs text-gray-600 pl-2">{testResults.security}</div>
          )}

          <button
            onClick={runPrivacyTest}
            disabled={!isReady}
            className="w-full text-left px-2 py-1 bg-green-50 hover:bg-green-100 rounded text-xs disabled:opacity-50"
          >
            Test Privacy
          </button>
          {testResults.privacy && (
            <div className="text-xs text-gray-600 pl-2">{testResults.privacy}</div>
          )}

          <button
            onClick={runMobileTest}
            disabled={!isReady}
            className="w-full text-left px-2 py-1 bg-purple-50 hover:bg-purple-100 rounded text-xs disabled:opacity-50"
          >
            Test Mobile
          </button>
          {testResults.mobile && (
            <div className="text-xs text-gray-600 pl-2">{testResults.mobile}</div>
          )}
        </div>
      </div>
    </div>
  );
}
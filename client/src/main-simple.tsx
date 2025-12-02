/**
 * Simple Main Entry Point - Minimal setup to get development server running
 * This is a fallback version that focuses on getting the app running quickly
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import './emergency-styles.css';

// Simple App component
function SimpleApp() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Chanuka Platform
          </h1>
          <p className="text-gray-600">
            Legislative Transparency Platform
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-2">Development Server Running</h2>
            <p className="text-sm text-gray-600">
              The platform is initializing. This is a minimal version to resolve build errors.
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-green-800 text-sm font-medium">
                Build Status: Resolving Issues
              </span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Next steps:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Fix CSS build errors</li>
              <li>Resolve import issues</li>
              <li>Restore full functionality</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Initialize the app
function initializeApp() {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    const root = createRoot(rootElement);
    root.render(<SimpleApp />);
    
    console.log('✅ Simple app initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize simple app:', error);
    
    // Fallback: show error in DOM
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: system-ui;">
          <div style="text-align: center; padding: 2rem;">
            <h1 style="color: #dc2626; margin-bottom: 1rem;">Application Error</h1>
            <p style="color: #6b7280; margin-bottom: 1rem;">Failed to initialize the application</p>
            <button onclick="window.location.reload()" style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border: none; border-radius: 0.375rem; cursor: pointer;">
              Reload Page
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
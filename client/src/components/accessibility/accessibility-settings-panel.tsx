/**
 * Accessibility Settings Panel
 * User interface for managing accessibility preferences
 */

import React, { useState } from 'react';
import { 
  Settings, 
  Eye, 
  Type, 
  Zap, 
  Volume2, 
  Keyboard, 
  Focus,
  Contrast,
  MousePointer
} from 'lucide-react';
import { useAccessibility, AccessibleButton, AccessibleFormField } from './accessibility-manager';
import { logger } from '../../utils/browser-logger';

interface AccessibilitySettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilitySettingsPanel({ isOpen, onClose }: AccessibilitySettingsPanelProps) {
  const { settings, updateSetting, announceToScreenReader } = useAccessibility();

  const handleSettingChange = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    updateSetting(key, value);
    announceToScreenReader(`${key} setting changed to ${value}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="accessibility-title">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-blue-600" />
                <h2 id="accessibility-title" className="text-xl font-semibold text-gray-900">
                  Accessibility Settings
                </h2>
              </div>
              <AccessibleButton
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close accessibility settings"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </AccessibleButton>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Customize your experience to better suit your accessibility needs.
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-8">
            {/* Visual Settings */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2 text-blue-600" />
                Visual Settings
              </h3>
              
              <div className="space-y-6">
                {/* High Contrast */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label htmlFor="high-contrast" className="text-sm font-medium text-gray-700">
                      High Contrast Mode
                    </label>
                    <p className="text-sm text-gray-500">
                      Increases contrast for better visibility
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="high-contrast"
                      type="checkbox"
                      checked={settings.highContrast}
                      onChange={(e) => handleSettingChange('highContrast', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>

                {/* Font Size */}
                <AccessibleFormField
                  label="Font Size"
                  id="font-size"
                  helperText="Adjust text size for better readability"
                >
                  <select
                    value={settings.fontSize}
                    onChange={(e) => handleSettingChange('fontSize', e.target.value as any)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    aria-label="Font Size"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium (Default)</option>
                    <option value="large">Large</option>
                    <option value="extra-large">Extra Large</option>
                  </select>
                </AccessibleFormField>

                {/* Focus Indicators */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label htmlFor="focus-indicators" className="text-sm font-medium text-gray-700">
                      Enhanced Focus Indicators
                    </label>
                    <p className="text-sm text-gray-500">
                      Show prominent focus outlines for keyboard navigation
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="focus-indicators"
                      type="checkbox"
                      checked={settings.focusIndicators}
                      onChange={(e) => handleSettingChange('focusIndicators', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Motion Settings */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-blue-600" />
                Motion & Animation
              </h3>
              
              <div className="space-y-6">
                {/* Reduced Motion */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label htmlFor="reduced-motion" className="text-sm font-medium text-gray-700">
                      Reduce Motion
                    </label>
                    <p className="text-sm text-gray-500">
                      Minimize animations and transitions that may cause discomfort
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="reduced-motion"
                      type="checkbox"
                      checked={settings.reducedMotion}
                      onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Navigation Settings */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Keyboard className="h-5 w-5 mr-2 text-blue-600" />
                Navigation
              </h3>
              
              <div className="space-y-6">
                {/* Keyboard Navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label htmlFor="keyboard-navigation" className="text-sm font-medium text-gray-700">
                      Enhanced Keyboard Navigation
                    </label>
                    <p className="text-sm text-gray-500">
                      Enable advanced keyboard shortcuts and navigation features
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="keyboard-navigation"
                      type="checkbox"
                      checked={settings.keyboardNavigation}
                      onChange={(e) => handleSettingChange('keyboardNavigation', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Screen Reader Settings */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Volume2 className="h-5 w-5 mr-2 text-blue-600" />
                Screen Reader
              </h3>
              
              <div className="space-y-6">
                {/* Screen Reader Optimization */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label htmlFor="screen-reader-optimized" className="text-sm font-medium text-gray-700">
                      Screen Reader Optimization
                    </label>
                    <p className="text-sm text-gray-500">
                      Optimize interface for screen reader users with additional announcements
                    </p>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="screen-reader-optimized"
                      type="checkbox"
                      checked={settings.screenReaderOptimized}
                      onChange={(e) => handleSettingChange('screenReaderOptimized', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Keyboard Shortcuts Reference */}
            <section>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Keyboard Shortcuts
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Navigation</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li><kbd className="px-2 py-1 bg-white rounded border">Tab</kbd> - Next element</li>
                      <li><kbd className="px-2 py-1 bg-white rounded border">Shift + Tab</kbd> - Previous element</li>
                      <li><kbd className="px-2 py-1 bg-white rounded border">Enter</kbd> - Activate button/link</li>
                      <li><kbd className="px-2 py-1 bg-white rounded border">Space</kbd> - Activate button</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Application</h4>
                    <ul className="space-y-1 text-gray-600">
                      <li><kbd className="px-2 py-1 bg-white rounded border">Alt + M</kbd> - Skip to main content</li>
                      <li><kbd className="px-2 py-1 bg-white rounded border">Alt + N</kbd> - Focus navigation</li>
                      <li><kbd className="px-2 py-1 bg-white rounded border">Alt + S</kbd> - Focus search</li>
                      <li><kbd className="px-2 py-1 bg-white rounded border">Esc</kbd> - Close modal/menu</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Settings are automatically saved
              </p>
              <div className="flex space-x-3">
                <AccessibleButton
                  variant="outline"
                  onClick={() => {
                    // Reset to defaults
                    const defaults = {
                      highContrast: false,
                      fontSize: 'medium' as const,
                      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
                      screenReaderOptimized: false,
                      keyboardNavigation: true,
                      focusIndicators: true
                    };
                    
                    Object.entries(defaults).forEach(([key, value]) => {
                      updateSetting(key as any, value);
                    });
                    
                    announceToScreenReader('Accessibility settings reset to defaults');
                  }}
                >
                  Reset to Defaults
                </AccessibleButton>
                <AccessibleButton
                  variant="primary"
                  onClick={onClose}
                >
                  Done
                </AccessibleButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Accessibility Settings Trigger Button
 * Floating button to open accessibility settings
 */
interface AccessibilityTriggerProps {
  className?: string;
}

export function AccessibilityTrigger({ className = '' }: AccessibilityTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <AccessibleButton
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 left-4 z-40 bg-white shadow-lg border-2 border-blue-600 text-blue-600 hover:bg-blue-50 ${className}`}
        aria-label="Open accessibility settings"
      >
        <Settings className="h-4 w-4 mr-2" />
        Accessibility
      </AccessibleButton>
      
      <AccessibilitySettingsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}

export default AccessibilitySettingsPanel;


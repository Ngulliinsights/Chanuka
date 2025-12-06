/**
 * Accessibility Settings Section
 * Consolidates accessibility controls with WCAG compliance
 * Preserves strengths from accessibility-settings-panel.tsx
 */

import { Settings, Eye, Activity, Volume2, Sun, Moon } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';

// Type definitions
type FontSize = 'small' | 'medium' | 'large' | 'extra-large';
type ContrastLevel = 'AA' | 'AAA';
type TextSize = 'normal' | 'large';
type ThemeName = 'light' | 'dark' | 'high-contrast' | 'dark-high-contrast';
type ContrastPreference = 'normal' | 'high';

interface AccessibilitySettings {
  fontSize: FontSize;
  reducedMotion: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

// Mock implementations
const useAccessibility = () => ({
  settings: {
    fontSize: 'medium' as FontSize,
    reducedMotion: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
    focusIndicators: true,
  },
  updateSetting: (key: keyof AccessibilitySettings, value: AccessibilitySettings[typeof key]) => {
    console.log(`Updated ${key} to ${value}`);
  },
  announceToScreenReader: (msg: string) => {
    console.log(`Announced: ${msg}`);
  },
});

const themeProvider = {
  getCurrentTheme: (): ThemeName => 'light',
  getContrastPreference: (): ContrastPreference => 'normal',
  setTheme: (theme: ThemeName) => console.log(`Theme set to ${theme}`),
  toggleContrast: () => console.log('Contrast toggled'),
};

// Color contrast calculations
const getContrastRatio = (text: string, bg: string): number => {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;
    const [rs, gs, bs] = [r, g, b].map(c => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  const l1 = getLuminance(text);
  const l2 = getLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const meetsContrastRequirement = (
  text: string, 
  bg: string, 
  level: ContrastLevel, 
  size: TextSize
): boolean => {
  const ratio = getContrastRatio(text, bg);
  const required = level === 'AAA' ? (size === 'large' ? 4.5 : 7) : (size === 'large' ? 3 : 4.5);
  return ratio >= required;
};

// Reusable components
interface ToggleSettingProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ToggleSetting = ({ id, label, description, checked, onChange }: ToggleSettingProps) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1 pr-4">
      <label htmlFor={id} className="text-sm font-medium text-gray-900 block">{label}</label>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
    </div>
    <Switch
      id={id}
      checked={checked}
      onCheckedChange={(checked) => onChange({ target: { checked } } as any)}
    />
  </div>
);

interface ContrastCheckProps {
  label: string;
  passes: boolean;
}

const ContrastCheck = ({ label, passes }: ContrastCheckProps) => (
  <div className="flex justify-between items-center text-sm py-1">
    <span className="text-gray-600">{label}</span>
    <span className={`font-medium ${passes ? 'text-green-600' : 'text-red-600'}`}>
      {passes ? '✓' : '✗'}
    </span>
  </div>
);

export function AccessibilitySettingsSection() {
  const { settings, updateSetting, announceToScreenReader } = useAccessibility();
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(themeProvider.getCurrentTheme());
  const [contrastPreference, setContrastPreference] = useState<ContrastPreference>(themeProvider.getContrastPreference());
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [contrastRatio, setContrastRatio] = useState(21);

  useEffect(() => {
    setContrastRatio(getContrastRatio(textColor, bgColor));
  }, [textColor, bgColor]);

  const handleSettingChange = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    updateSetting(key, value);
    announceToScreenReader(`${key} changed to ${value}`);
  };

  const handleThemeChange = (isDark: boolean) => {
    const theme = isDark 
      ? (contrastPreference === 'high' ? 'dark-high-contrast' : 'dark')
      : (contrastPreference === 'high' ? 'high-contrast' : 'light');
    themeProvider.setTheme(theme);
    announceToScreenReader(`Theme changed to ${isDark ? 'dark' : 'light'} mode`);
  };

  return (
    <div className="space-y-6">
      {/* Theme & Contrast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Theme & Contrast
          </CardTitle>
          <CardDescription>
            Adjust visual appearance and contrast settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => handleThemeChange(false)}
              className={`p-3 rounded border-2 transition ${!currentTheme.includes('dark') ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              aria-label="Light theme"
              aria-pressed={!currentTheme.includes('dark')}
            >
              <Sun className="h-5 w-5 mx-auto" />
              <span className="text-sm mt-1 block">Light</span>
            </button>
            <button
              onClick={() => handleThemeChange(true)}
              className={`p-3 rounded border-2 transition ${currentTheme.includes('dark') ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
              aria-label="Dark theme"
              aria-pressed={currentTheme.includes('dark')}
            >
              <Moon className="h-5 w-5 mx-auto" />
              <span className="text-sm mt-1 block">Dark</span>
            </button>
          </div>

          <ToggleSetting
            id="high-contrast"
            label="High Contrast Mode"
            description="WCAG AAA compliant maximum contrast"
            checked={contrastPreference === 'high'}
            onChange={() => {
              themeProvider.toggleContrast();
              announceToScreenReader(`Contrast mode ${contrastPreference === 'high' ? 'disabled' : 'enabled'}`);
            }}
          />
        </CardContent>
      </Card>

      {/* Contrast Checker */}
      <Card>
        <CardHeader>
          <CardTitle>Color Contrast Checker</CardTitle>
          <CardDescription>
            Test color combinations for accessibility compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label htmlFor="text-color" className="block text-xs font-medium text-gray-700 mb-1">
                Text Color
              </label>
              <input
                id="text-color"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-full h-10 border rounded cursor-pointer"
                aria-label="Select text color for contrast checking"
              />
            </div>
            <div>
              <label htmlFor="bg-color" className="block text-xs font-medium text-gray-700 mb-1">
                Background Color
              </label>
              <input
                id="bg-color"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-full h-10 border rounded cursor-pointer"
                aria-label="Select background color for contrast checking"
              />
            </div>
          </div>

          <div className="bg-gray-50 rounded p-3 space-y-1">
            <div className="flex justify-between text-sm pb-2 border-b">
              <span className="font-medium">Ratio:</span>
              <span className="font-semibold">{contrastRatio.toFixed(2)}:1</span>
            </div>
            <ContrastCheck label="AA Normal" passes={meetsContrastRequirement(textColor, bgColor, 'AA', 'normal')} />
            <ContrastCheck label="AA Large" passes={meetsContrastRequirement(textColor, bgColor, 'AA', 'large')} />
            <ContrastCheck label="AAA Normal" passes={meetsContrastRequirement(textColor, bgColor, 'AAA', 'normal')} />
            <ContrastCheck label="AAA Large" passes={meetsContrastRequirement(textColor, bgColor, 'AAA', 'large')} />
          </div>

          <div className="mt-3 p-3 rounded border bg-white">
            <p 
              className="text-center text-sm"
              style={{ backgroundColor: bgColor, color: textColor }}
              aria-label={`Preview text with contrast ratio ${contrastRatio.toFixed(2)} to 1`}
            >
              Sample preview text
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Visual Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visual Settings
          </CardTitle>
          <CardDescription>
            Customize visual display preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="font-size" className="block text-sm font-medium text-gray-700 mb-1">
              Font Size
            </label>
            <select
              id="font-size"
              value={settings.fontSize}
              onChange={(e) => handleSettingChange('fontSize', e.target.value as FontSize)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>

          <ToggleSetting
            id="focus-indicators"
            label="Enhanced Focus Indicators"
            description="Prominent outlines for keyboard navigation"
            checked={settings.focusIndicators}
            onChange={(e) => handleSettingChange('focusIndicators', e.target.checked)}
          />
        </CardContent>
      </Card>

      {/* Motion & Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Motion & Navigation
          </CardTitle>
          <CardDescription>
            Control animations and navigation preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleSetting
            id="reduced-motion"
            label="Reduce Motion"
            description="Minimize animations and transitions"
            checked={settings.reducedMotion}
            onChange={(e) => handleSettingChange('reducedMotion', e.target.checked)}
          />
          
          <ToggleSetting
            id="keyboard-nav"
            label="Enhanced Keyboard Navigation"
            description="Advanced keyboard shortcuts"
            checked={settings.keyboardNavigation}
            onChange={(e) => handleSettingChange('keyboardNavigation', e.target.checked)}
          />
        </CardContent>
      </Card>

      {/* Screen Reader */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Screen Reader
          </CardTitle>
          <CardDescription>
            Optimize for assistive technologies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleSetting
            id="screen-reader"
            label="Screen Reader Optimization"
            description="Additional announcements for screen readers"
            checked={settings.screenReaderOptimized}
            onChange={(e) => handleSettingChange('screenReaderOptimized', e.target.checked)}
          />
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <CardDescription>
            Available keyboard shortcuts for navigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded p-3 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Next/Previous</span>
              <kbd className="font-mono bg-white px-2 py-0.5 rounded border">Tab / Shift+Tab</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Activate</span>
              <kbd className="font-mono bg-white px-2 py-0.5 rounded border">Enter / Space</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Main Content</span>
              <kbd className="font-mono bg-white px-2 py-0.5 rounded border">Alt+M</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Close Dialog</span>
              <kbd className="font-mono bg-white px-2 py-0.5 rounded border">Esc</kbd>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <span className="text-xs text-gray-500">Settings auto-saved</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Reset with proper typing
              const defaults: Partial<AccessibilitySettings> = {
                fontSize: 'medium',
                reducedMotion: false,
                screenReaderOptimized: false,
                keyboardNavigation: true,
                focusIndicators: true,
              };
              Object.entries(defaults).forEach(([key, value]) => 
                updateSetting(key as keyof AccessibilitySettings, value as any)
              );
              announceToScreenReader('Settings reset to defaults');
            }}
          >
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AccessibilitySettingsSection;
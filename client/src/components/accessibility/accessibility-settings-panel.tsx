import { useState, useEffect } from 'react';
import { Settings, Eye, Activity, Volume2, Sun, Moon } from 'lucide-react';

// Type definitions that make our component safe and self-documenting
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

// Mock implementations with proper types for demonstration
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

interface ButtonProps {
  variant: 'primary' | 'outline' | 'ghost';
  size: 'sm' | 'md';
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  'aria-label'?: string;
}

const AccessibleButton = ({ variant, size, onClick, className = '', children, ...props }: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
    ghost: 'text-gray-600 hover:bg-gray-100',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
  };
  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const themeProvider = {
  getCurrentTheme: (): ThemeName => 'light',
  getContrastPreference: (): ContrastPreference => 'normal',
  setTheme: (theme: ThemeName) => console.log(`Theme set to ${theme}`),
  toggleContrast: () => console.log('Contrast toggled'),
  validateCurrentTheme: () => ({ isValid: true, issues: [] as Array<{property: string, ratio: number, required: number}> }),
  subscribe: (_callback: (theme: ThemeName, contrast: ContrastPreference) => void) => {
    // In a real implementation, this would register the callback
    return () => {}; // Unsubscribe function
  },
};

// Color contrast calculations with proper typing
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

// Reusable component with full type safety
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
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 rounded"
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

export default function AccessibilitySettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, updateSetting, announceToScreenReader } = useAccessibility();
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(themeProvider.getCurrentTheme());
  const [contrastPreference, setContrastPreference] = useState<ContrastPreference>(themeProvider.getContrastPreference());
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [contrastRatio, setContrastRatio] = useState(21);

  useEffect(() => {
    return themeProvider.subscribe((theme, contrast) => {
      setCurrentTheme(theme);
      setContrastPreference(contrast);
    });
  }, []);

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

  if (!isOpen) {
    return (
      <AccessibleButton
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-40 bg-white shadow-lg border-2 border-blue-600 text-blue-600"
        aria-label="Open accessibility settings"
      >
        <Settings className="h-4 w-4 mr-2" />
        Accessibility
      </AccessibleButton>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="a11y-title">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} aria-hidden="true" />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          
          {/* Compact Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              <h2 id="a11y-title" className="text-lg font-semibold">Accessibility Settings</h2>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-4 space-y-6">
            
            {/* Theme & Contrast */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                <Sun className="h-4 w-4 mr-2 text-blue-600" />
                Theme & Contrast
              </h3>
              
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
            </section>

            {/* Contrast Checker with proper labels */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-3">Color Contrast Checker</h3>
              
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
            </section>

            {/* Visual Settings */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                <Eye className="h-4 w-4 mr-2 text-blue-600" />
                Visual
              </h3>
              
              <div className="mb-4">
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
            </section>

            {/* Motion & Navigation */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                <Activity className="h-4 w-4 mr-2 text-blue-600" />
                Motion & Navigation
              </h3>
              
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
            </section>

            {/* Screen Reader */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center">
                <Volume2 className="h-4 w-4 mr-2 text-blue-600" />
                Screen Reader
              </h3>
              
              <ToggleSetting
                id="screen-reader"
                label="Screen Reader Optimization"
                description="Additional announcements for screen readers"
                checked={settings.screenReaderOptimized}
                onChange={(e) => handleSettingChange('screenReaderOptimized', e.target.checked)}
              />
            </section>

            {/* Keyboard Shortcuts */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Keyboard Shortcuts</h3>
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
            </section>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-3 flex justify-between items-center">
            <span className="text-xs text-gray-500">Auto-saved</span>
            <div className="flex gap-2">
              <AccessibleButton
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
                Reset
              </AccessibleButton>
              <AccessibleButton variant="primary" size="sm" onClick={() => setIsOpen(false)}>
                Done
              </AccessibleButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
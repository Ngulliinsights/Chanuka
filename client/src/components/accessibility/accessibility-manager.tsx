/**
 * Accessibility Manager
 * Comprehensive accessibility features and WCAG 2.1 compliance utilities
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";


interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: "small" | "medium" | "large" | "extra-large";
  reducedMotion: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  focusIndicators: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  announceToScreenReader: (
    message: string,
    priority?: "polite" | "assertive"
  ) => void;
  focusElement: (element: HTMLElement | null) => void;
  trapFocus: (container: HTMLElement) => () => void;
  skipToContent: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(
  null
);

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({
  children,
}: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Load settings from localStorage or use defaults
    const saved = localStorage.getItem("accessibility-settings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to parse accessibility settings:", e);
      }
    }

    return {
      highContrast: false,
      fontSize: "medium",
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
      screenReaderOptimized: false,
      keyboardNavigation: true,
      focusIndicators: true,
    };
  });

  const announcementRef = useRef<HTMLDivElement>(null);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem("accessibility-settings", JSON.stringify(settings));
  }, [settings]);

  // Apply CSS classes based on settings
  useEffect(() => {
    const root = document.documentElement;

    // High contrast mode
    if (settings.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }

    // Font size
    root.classList.remove(
      "font-small",
      "font-medium",
      "font-large",
      "font-extra-large"
    );
    root.classList.add(`font-${settings.fontSize}`);

    // Reduced motion
    if (settings.reducedMotion) {
      root.classList.add("reduced-motion");
    } else {
      root.classList.remove("reduced-motion");
    }

    // Screen reader optimization
    if (settings.screenReaderOptimized) {
      root.classList.add("screen-reader-optimized");
    } else {
      root.classList.remove("screen-reader-optimized");
    }

    // Focus indicators
    if (settings.focusIndicators) {
      root.classList.add("enhanced-focus");
    } else {
      root.classList.remove("enhanced-focus");
    }
  }, [settings]);

  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(
      key: K,
      value: AccessibilitySettings[K]
    ) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const announceToScreenReader = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (announcementRef.current) {
        announcementRef.current.setAttribute("aria-live", priority);
        announcementRef.current.textContent = message;

        // Clear the message after a short delay to allow for re-announcements
        setTimeout(() => {
          if (announcementRef.current) {
            announcementRef.current.textContent = "";
          }
        }, 1000);
      }
    },
    []
  );

  const focusElement = useCallback(
    (element: HTMLElement | null) => {
      if (element) {
        element.focus();
        // Scroll element into view if needed
        element.scrollIntoView({
          behavior: settings.reducedMotion ? "auto" : "smooth",
          block: "center",
        });
      }
    },
    [settings.reducedMotion]
  );

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }

      if (e.key === "Escape") {
        // Allow escape to break focus trap
        container.blur();
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    // Focus first element
    if (firstElement) {
      firstElement.focus();
    }

    // Return cleanup function
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector(
      'main, [role="main"], #main-content'
    );
    if (mainContent) {
      focusElement(mainContent as HTMLElement);
      announceToScreenReader("Skipped to main content");
    }
  }, [focusElement, announceToScreenReader]);

  const contextValue: AccessibilityContextType = useMemo(() => ({
    settings,
    updateSetting,
    announceToScreenReader,
    focusElement,
    trapFocus,
    skipToContent,
  }), [settings, updateSetting, announceToScreenReader, focusElement, trapFocus, skipToContent]);

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      {/* Screen reader announcement area */}
      <div
        ref={announcementRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider"
    );
  }
  return context;
}

/**
 * Skip Link Component
 * Provides keyboard navigation skip links
 */
interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className = "" }: SkipLinkProps) {
  const { focusElement, announceToScreenReader } = useAccessibility();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        focusElement(target as HTMLElement);
        announceToScreenReader(`Navigated to ${children}`);
      }
    },
    [href, children, focusElement, announceToScreenReader]
  );

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50
        focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md
        focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${className}
      `}
    >
      {children}
    </a>
  );
}

/**
 * Accessible Button Component
 * Enhanced button with full accessibility support
 */
interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function AccessibleButton({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText = "Loading...",
  children,
  className = "",
  disabled,
  onClick,
  ...props
}: AccessibleButtonProps) {
  const { settings, announceToScreenReader } = useAccessibility();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) {
        e.preventDefault();
        return;
      }

      if (onClick) {
        onClick(e);
      }

      // Announce button action to screen readers
      if (settings.screenReaderOptimized) {
        announceToScreenReader(`Button ${children} activated`);
      }
    },
    [
      loading,
      disabled,
      onClick,
      children,
      settings.screenReaderOptimized,
      announceToScreenReader,
    ]
  );

  const baseClasses = [
    "inline-flex items-center justify-center font-medium rounded-lg",
    "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
  ];

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm min-h-[36px]",
    md: "px-4 py-2 text-base min-h-[44px]",
    lg: "px-6 py-3 text-lg min-h-[48px]",
  };

  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    outline:
      "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-blue-500",
    ghost: "text-gray-700 hover:bg-gray-100 focus:ring-blue-500",
  };

  const buttonClasses = [
    ...baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    className,
  ].join(" ");

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-describedby={loading ? `${props.id}-loading` : undefined}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span>{loading ? loadingText : children}</span>
      {loading && (
        <span id={`${props.id}-loading`} className="sr-only">
          {loadingText}
        </span>
      )}
    </button>
  );
}

/**
 * Accessible Form Field Component
 * Enhanced form field with proper labeling and error handling
 */
interface AccessibleFormFieldProps {
  children: React.ReactNode;
  label: string;
  id: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
}

export function AccessibleFormField({
  children,
  label,
  id,
  error,
  helperText,
  required = false,
  className = "",
}: AccessibleFormFieldProps) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      <div>
        {React.cloneElement(children as React.ReactElement, {
          id,
          "aria-describedby":
            [error ? errorId : null, helperText ? helperId : null]
              .filter(Boolean)
              .join(" ") || undefined,
          "aria-invalid": error ? "true" : undefined,
          "aria-required": required,
        })}
      </div>

      {error && (
        <div id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </div>
      )}

      {helperText && !error && (
        <div id={helperId} className="text-sm text-gray-500">
          {helperText}
        </div>
      )}
    </div>
  );
}

/**
 * Accessible Modal Component
 * Modal with proper focus management and keyboard navigation
 */
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  className = "",
}: AccessibleModalProps) {
  const { trapFocus, announceToScreenReader, settings } = useAccessibility();
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Trap focus in modal
      if (modalRef.current) {
        const cleanup = trapFocus(modalRef.current);

        // Announce modal opening
        announceToScreenReader(`Modal opened: ${title}`, "assertive");

        return cleanup;
      }
    } else {
      // Restore focus to previously focused element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }

    return undefined;
  }, [isOpen, title, trapFocus, announceToScreenReader]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }

    return undefined;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          className={`
            relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6
            transform transition-all
            ${settings.reducedMotion ? "" : "animate-in slide-in-from-bottom-4"}
            ${className}
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2
              id="modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
              aria-label="Close modal"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}

export default AccessibilityProvider;

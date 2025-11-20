/**
 * Form accessibility utilities and components
 * Implements keyboard navigation, screen reader support, and WCAG compliance
 */

import React, { useRef, useCallback, useEffect } from "react";
import { cn } from "@client/lib/utils";

// Keyboard navigation hook for forms
export const useFormKeyboardNavigation = (
  formRef: React.RefObject<HTMLFormElement>
) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!formRef.current) return;

      const focusableElements = formRef.current.querySelectorAll(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      const focusableArray = Array.from(focusableElements) as HTMLElement[];
      const currentIndex = focusableArray.indexOf(
        document.activeElement as HTMLElement
      );

      switch (event.key) {
        case "ArrowDown":
        case "ArrowRight":
          event.preventDefault();
          const nextIndex = (currentIndex + 1) % focusableArray.length;
          focusableArray[nextIndex]?.focus();
          break;

        case "ArrowUp":
        case "ArrowLeft":
          event.preventDefault();
          const prevIndex =
            currentIndex === 0 ? focusableArray.length - 1 : currentIndex - 1;
          focusableArray[prevIndex]?.focus();
          break;

        case "Home":
          if (event.ctrlKey) {
            event.preventDefault();
            focusableArray[0]?.focus();
          }
          break;

        case "End":
          if (event.ctrlKey) {
            event.preventDefault();
            focusableArray[focusableArray.length - 1]?.focus();
          }
          break;
      }
    },
    [formRef]
  );

  useEffect(() => {
    const form = formRef.current;
    if (form) {
      form.addEventListener("keydown", handleKeyDown);
      return () => form.removeEventListener("keydown", handleKeyDown);
    }

    return undefined;
  }, [formRef, handleKeyDown]);
};

// Screen reader announcements
interface ScreenReaderAnnouncementProps {
  message: string;
  priority?: "polite" | "assertive";
  className?: string;
}

export const ScreenReaderAnnouncement: React.FC<
  ScreenReaderAnnouncementProps
> = ({ message, priority = "polite", className }) => {
  const roleValue = priority === "assertive" ? "alert" : "status";
  const ariaLive = priority === "assertive" ? "assertive" : "polite";

  return (
    <div
      className={cn("sr-only", className)}
      aria-live={ariaLive}
      aria-atomic="true"
    >
      {message}
    </div>
  );
};

// Form fieldset with proper labeling
interface AccessibleFieldsetProps {
  legend: string;
  description?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export const AccessibleFieldset: React.FC<AccessibleFieldsetProps> = ({
  legend,
  description,
  children,
  required = false,
  className,
}) => {
  const fieldsetId = `fieldset-${legend.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <fieldset className={cn("border border-border rounded-lg p-4", className)}>
      <legend className="text-sm font-medium px-2 -ml-2">
        {legend}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </legend>

      {description && (
        <p
          id={`${fieldsetId}-description`}
          className="text-sm text-muted-foreground mt-2 mb-4"
        >
          {description}
        </p>
      )}

      <div
        role="group"
        aria-labelledby={fieldsetId}
        aria-describedby={description ? `${fieldsetId}-description` : undefined}
      >
        {children}
      </div>
    </fieldset>
  );
};

// Skip link for form navigation
interface FormSkipLinkProps {
  targetId: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSkipLink: React.FC<FormSkipLinkProps> = ({
  targetId,
  children,
  className,
}) => {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50 text-sm font-medium",
        className
      )}
    >
      {children}
    </a>
  );
};

// Error summary with focus management
interface AccessibleErrorSummaryProps {
  errors: Array<{
    field: string;
    message: string;
    fieldId?: string;
  }>;
  title?: string;
  className?: string;
}

export const AccessibleErrorSummary: React.FC<AccessibleErrorSummaryProps> = ({
  errors,
  title = "Form contains errors",
  className,
}) => {
  const summaryRef = useRef<HTMLDivElement>(null);

  // Focus error summary when errors appear
  useEffect(() => {
    if (errors.length > 0 && summaryRef.current) {
      summaryRef.current.focus();
    }
  }, [errors.length]);

  const handleErrorClick = useCallback((fieldId?: string) => {
    if (fieldId) {
      const field = document.getElementById(fieldId);
      if (field) {
        field.focus();
        field.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, []);

  if (errors.length === 0) return null;

  return (
    <div
      ref={summaryRef}
      className={cn(
        "rounded-md bg-destructive/15 p-4 border border-destructive/20 mb-6",
        className
      )}
      role="alert"
      aria-labelledby="error-summary-title"
      tabIndex={-1}
    >
      <h2
        id="error-summary-title"
        className="text-sm font-medium text-destructive mb-3"
      >
        {title} ({errors.length} {errors.length === 1 ? "error" : "errors"})
      </h2>

      <ul className="text-sm text-destructive space-y-2">
        {errors.map((error, index) => (
          <li key={`${error.field}-${index}`}>
            {error.fieldId ? (
              <button
                type="button"
                className="underline hover:no-underline text-left"
                onClick={() => handleErrorClick(error.fieldId)}
              >
                {error.message}
              </button>
            ) : (
              <span>{error.message}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Required field indicator
export const RequiredFieldIndicator: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div className={cn("text-sm text-muted-foreground mb-4", className)}>
      <span className="text-destructive">*</span> indicates required fields
    </div>
  );
};

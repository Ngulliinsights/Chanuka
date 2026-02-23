/**
 * Window interface augmentation for security-related properties
 * This file extends the global Window interface to include custom properties
 * used by the security system.
 */

declare global {
  interface Window {
    /** Content Security Policy configuration */
    __CSP_POLICY__?: string;
    /** CSP nonce for inline scripts */
    __CSP_NONCE__?: string;
    /** Build timestamp for version checking */
    __BUILD_TIME__?: string;
    /** Original console object (for debug mode detection) */
    __originalConsole__?: Console;
    /** CSP violation reporting function */
    __reportCSPViolation__?: (violation: {
      documentURI: string;
      violatedDirective: string;
      effectiveDirective?: string;
      originalPolicy?: string;
      blockedURI?: string;
      statusCode?: number;
    }) => void;
  }
}

export {};

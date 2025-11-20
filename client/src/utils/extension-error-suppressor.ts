/**
 * Browser Extension Error Suppressor
 * Filters out harmless errors caused by browser extensions
 */

class ExtensionErrorSuppressor {
  private static instance: ExtensionErrorSuppressor;
  private suppressedPatterns: RegExp[] = [
    /chrome-extension:/,
    /moz-extension:/,
    /message channel closed before a response was received/,
    /message port closed before a response was received/,
    /Extension context invalidated/,
    /Could not establish connection/,
    /The message port closed before a response was received/,
    /Failed to fetch.*chrome-extension/,
    /Request scheme 'chrome-extension' is unsupported/,
    /gomekmidlodglbbmalcneegieacbdmki/, // Specific extension ID from error
    /chrome-extension:\/\/invalid\//,
    /Denying load of chrome-extension:/,
    /Unregistered service worker/,
    /Resources must be listed in the web_accessible_resources/,
    /GET chrome-extension:\/\/invalid\/ net::ERR_FAILED/,
    /Unchecked runtime\.lastError/,
  ];

  private constructor() {
    this.init();
  }

  public static getInstance(): ExtensionErrorSuppressor {
    if (!ExtensionErrorSuppressor.instance) {
      ExtensionErrorSuppressor.instance = new ExtensionErrorSuppressor();
    }
    return ExtensionErrorSuppressor.instance;
  }

  private init(): void {
    // Suppress window errors
    window.addEventListener('error', (event) => {
      if (this.shouldSuppress(event.message || '')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    });

    // Suppress unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || event.reason?.toString() || '';
      if (this.shouldSuppress(message)) {
        event.preventDefault();
        return false;
      }
    });

    // Suppress console errors (development only)
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      console.error = (...args: any[]) => {
        const message = args.join(' ');
        if (!this.shouldSuppress(message)) {
          originalError.apply(console, args);
        }
      };
    }
  }

  private shouldSuppress(message: string): boolean {
    return this.suppressedPatterns.some(pattern => pattern.test(message));
  }

  public addPattern(pattern: RegExp): void {
    this.suppressedPatterns.push(pattern);
  }
}

export default ExtensionErrorSuppressor;

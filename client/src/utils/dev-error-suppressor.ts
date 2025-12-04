/**
 * Development Error Suppressor
 * Filters out non-critical development errors to keep console clean
 */

class DevErrorSuppressor {
  private static initialized = false;
  
  static init() {
    if (this.initialized || process.env.NODE_ENV === 'production') {
      return;
    }
    
    this.initialized = true;
    this.setupErrorFiltering();
    this.setupNetworkErrorSuppression();
    this.setupConsoleFiltering();
  }
  
  private static setupErrorFiltering() {
    window.addEventListener('error', (event) => {
      if (this.shouldSuppressError(event)) {
        event.preventDefault();
        console.debug('[Dev] Suppressed error:', event.message);
        return false;
      }
    }, true);
    
    window.addEventListener('unhandledrejection', (event) => {
      if (this.shouldSuppressRejection(event)) {
        event.preventDefault();
        console.debug('[Dev] Suppressed rejection:', event.reason);
        return false;
      }
    }, true);
  }
  
  private static setupNetworkErrorSuppression() {
    // Override fetch to suppress development resource errors
    const originalFetch = window.fetch;
    
    window.fetch = async (...args: unknown[]) => {
      try {
        return await originalFetch(...(args as [RequestInfo, RequestInit?]));
      } catch (error: unknown) {
        const first = args[0] as unknown;
        let url = 'unknown';
        if (typeof first === 'string') url = first;
        else if ((first as Request).url) url = (first as Request).url;
        else if ((first as URL).href) url = (first as URL).href;
        
        // Suppress errors for development resources
        if (this.isDevelopmentResource(url)) {
          console.debug('[Dev] Suppressed fetch error for:', url);
          throw error; // Still throw, but log as debug
        }
        
        throw error;
      }
    };
  }
  
  private static setupConsoleFiltering() {
    const originalError = console.error;
    
    console.error = (...args: unknown[]) => {
      const message = args.map(a => String(a)).join(' ');
      
      if (this.shouldSuppressConsoleError(message)) {
        console.debug('[Dev] Suppressed console.error:', message);
        return;
      }
      
      (originalError as (...data: unknown[]) => void).apply(console, args as unknown[]);
    };
  }
  
  private static shouldSuppressError(event: ErrorEvent): boolean {
    const message = event.message || '';
    const filename = event.filename || '';
    
    return (
      message.includes('chrome-extension://') ||
      message.includes('moz-extension://') ||
      message.includes('gpcWindowSetting.js') ||
      message.includes('Extension context invalidated') ||
      message.includes('message channel closed') ||
      filename.includes('chrome-extension://') ||
      filename.includes('moz-extension://')
    );
  }
  
  private static shouldSuppressRejection(event: PromiseRejectionEvent): boolean {
    const reason = String(event.reason || '');
    
    return (
      reason.includes('chrome-extension://') ||
      reason.includes('moz-extension://') ||
      reason.includes('Extension context invalidated') ||
      reason.includes('message channel closed')
    );
  }
  
  private static isDevelopmentResource(url: string): boolean {
    return (
      url.includes('localhost:5173') ||
      url.includes('/@vite/') ||
      url.includes('?import') ||
      url.includes('node_modules') ||
      url.includes('.vite/deps/')
    );
  }
  
  private static shouldSuppressConsoleError(message: string): boolean {
    return (
      message.includes('chrome-extension://') ||
      message.includes('gpcWindowSetting.js') ||
      message.includes('WebSocket connection') ||
      message.includes('Failed to load resource: net::ERR_FAILED') ||
      message.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED')
    );
  }
}

export default DevErrorSuppressor;

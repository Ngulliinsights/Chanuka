/**
 * Request/Response interceptor types.
 * This defines the shape for functions that can modify requests or responses.
 */
export interface RequestInterceptor {
    (config: RequestInit & { url: string }): RequestInit & { url: string } | Promise<RequestInit & { url: string }>;
  }
  
  /**
   * Generates a unique request ID for tracking and logging.
   */
  function generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Authentication & Header Interceptor
   * This function is run before every request. It adds:
   * 1. Authorization header (if token exists)
   * 2. X-CSRF-Token (if meta tag exists)
   * 3. X-Request-ID (for tracing)
   * 4. Default Content-Type for POST/PUT/PATCH
   */
  const authHeaderInterceptor: RequestInterceptor = (config) => {
    const headers = new Headers(config.headers);
    
    // Add authentication header if token exists
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    // Add CSRF token if available in the DOM
    if (typeof document !== 'undefined') {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
      }
    }
    
    // Add request ID for tracking
    headers.set('X-Request-ID', generateRequestId());
    
    // Ensure JSON content type for POST/PUT/PATCH requests
    const method = config.method?.toUpperCase();
    if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    
    return {
      ...config,
      headers
    };
  };
  
  /**
   * List of all active request interceptors.
   * Add more here to modify all outgoing requests.
   */
  export const requestInterceptors: RequestInterceptor[] = [
    authHeaderInterceptor,
    // Add other request interceptors here
  ];
  
  /**
   * Processes all request interceptors sequentially.
   */
  export async function processRequestInterceptors(
    config: RequestInit & { url: string }
  ): Promise<RequestInit & { url: string }> {
    let processedConfig = config;
    
    for (const interceptor of requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    
    return processedConfig;
  }


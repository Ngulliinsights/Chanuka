/**
 * CSRF Protection Service
 * Provides client-side CSRF token management and validation
 */

export interface CSRFToken {
  token: string;
  expiresAt: number;
  issuedAt: number;
}

export class CSRFProtection {
  private static instance: CSRFProtection;
  private currentToken: CSRFToken | null = null;
  private readonly TOKEN_HEADER = 'X-CSRF-Token';
  private readonly TOKEN_STORAGE_KEY = 'chanuka_csrf_token';
  private readonly TOKEN_LIFETIME = 3600000; // 1 hour

  private constructor() {
    this.loadTokenFromStorage();
  }

  public static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  /**
   * Generate a new CSRF token
   */
  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Create a new CSRF token
   */
  public createToken(): CSRFToken {
    const now = Date.now();
    const token: CSRFToken = {
      token: this.generateToken(),
      issuedAt: now,
      expiresAt: now + this.TOKEN_LIFETIME
    };

    this.currentToken = token;
    this.saveTokenToStorage();
    return token;
  }

  /**
   * Get the current CSRF token, creating one if needed
   */
  public getToken(): string {
    if (!this.currentToken || this.isTokenExpired()) {
      this.createToken();
    }
    return this.currentToken!.token;
  }

  /**
   * Check if the current token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.currentToken) return true;
    return Date.now() > this.currentToken.expiresAt;
  }

  /**
   * Validate a CSRF token
   */
  public validateToken(token: string): boolean {
    if (!this.currentToken || this.isTokenExpired()) {
      return false;
    }
    return this.currentToken.token === token;
  }

  /**
   * Get CSRF headers for API requests
   */
  public getHeaders(): Record<string, string> {
    return {
      [this.TOKEN_HEADER]: this.getToken()
    };
  }

  /**
   * Add CSRF token to form data
   */
  public addToFormData(formData: FormData): void {
    formData.append('_csrf', this.getToken());
  }

  /**
   * Add CSRF token to URL search params
   */
  public addToSearchParams(params: URLSearchParams): void {
    params.set('_csrf', this.getToken());
  }

  /**
   * Save token to storage
   */
  private saveTokenToStorage(): void {
    if (this.currentToken) {
      try {
        sessionStorage.setItem(
          this.TOKEN_STORAGE_KEY,
          JSON.stringify(this.currentToken)
        );
      } catch (error) {
        console.warn('Failed to save CSRF token to storage:', error);
      }
    }
  }

  /**
   * Load token from storage
   */
  private loadTokenFromStorage(): void {
    try {
      const stored = sessionStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (stored) {
        const token = JSON.parse(stored) as CSRFToken;
        if (!this.isTokenExpiredForToken(token)) {
          this.currentToken = token;
        } else {
          this.clearStoredToken();
        }
      }
    } catch (error) {
      console.warn('Failed to load CSRF token from storage:', error);
      this.clearStoredToken();
    }
  }

  /**
   * Check if a specific token is expired
   */
  private isTokenExpiredForToken(token: CSRFToken): boolean {
    return Date.now() > token.expiresAt;
  }

  /**
   * Clear stored token
   */
  private clearStoredToken(): void {
    try {
      sessionStorage.removeItem(this.TOKEN_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear CSRF token from storage:', error);
    }
  }

  /**
   * Refresh the current token
   */
  public refreshToken(): string {
    this.createToken();
    return this.currentToken!.token;
  }

  /**
   * Clear the current token
   */
  public clearToken(): void {
    this.currentToken = null;
    this.clearStoredToken();
  }

  /**
   * Get token metadata
   */
  public getTokenMetadata(): {
    hasToken: boolean;
    isExpired: boolean;
    expiresIn: number;
    issuedAt: number;
  } | null {
    if (!this.currentToken) {
      return null;
    }

    const now = Date.now();
    return {
      hasToken: true,
      isExpired: this.isTokenExpired(),
      expiresIn: Math.max(0, this.currentToken.expiresAt - now),
      issuedAt: this.currentToken.issuedAt
    };
  }
}

// Export singleton instance
export const csrfProtection = CSRFProtection.getInstance();

/**
 * Axios interceptor for automatic CSRF token inclusion
 */
export const setupCSRFInterceptor = (axiosInstance: any) => {
  // Request interceptor to add CSRF token
  axiosInstance.interceptors.request.use(
    (config: any) => {
      // Only add CSRF token for state-changing requests
      if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
        const headers = csrfProtection.getHeaders();
        config.headers = { ...config.headers, ...headers };
      }
      return config;
    },
    (error: any) => Promise.reject(error)
  );

  // Response interceptor to handle CSRF token updates
  axiosInstance.interceptors.response.use(
    (response: any) => {
      // Check for new CSRF token in response headers
      const newToken = response.headers['x-csrf-token'];
      if (newToken) {
        // Update our token if server provides a new one
        csrfProtection.createToken();
      }
      return response;
    },
    (error: any) => {
      // Handle CSRF token errors
      if (error.response?.status === 403 && 
          error.response?.data?.code === 'CSRF_TOKEN_INVALID') {
        // Clear invalid token and retry once
        csrfProtection.clearToken();
        
        // Optionally retry the request with new token
        if (!error.config._csrfRetry) {
          error.config._csrfRetry = true;
          const headers = csrfProtection.getHeaders();
          error.config.headers = { ...error.config.headers, ...headers };
          return axiosInstance.request(error.config);
        }
      }
      return Promise.reject(error);
    }
  );
};
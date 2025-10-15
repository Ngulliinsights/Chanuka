import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { logger } from '@shared/utils/logger';

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  verificationStatus: string;
  isActive: boolean | null;
  createdAt: string;
  reputation: number;
  expertise: string;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
  isAuthenticated: boolean;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const validationInProgressRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper function for making cancellable requests
  const makeCancellableRequest = async (url: string, options: RequestInit = {}) => {
    // Use the shared abort controller
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: abortControllerRef.current.signal
      });
      return response;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request cancelled');
      }
      throw error;
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    abortControllerRef.current = new AbortController();
    
    const token = localStorage.getItem('token');
    if (token && !validationInProgressRef.current) {
      validateToken(token);
    } else if (!token) {
      if (mountedRef.current) {
        setLoading(false);
      }
    }

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const validateToken = async (token: string) => {
    // Prevent multiple simultaneous validation requests
    if (validationInProgressRef.current) {
      return;
    }

    validationInProgressRef.current = true;

    try {
      const response = await fetch('/api/auth/verify', {
        signal: abortControllerRef.current?.signal,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.user) {
          if (mountedRef.current) {
            setUser(result.data.user);
          }
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          if (mountedRef.current) {
            setUser(null);
          }
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        if (mountedRef.current) {
          setUser(null);
        }
      }
    } catch (error) {
      logger.error('Token validation failed:', { component: 'Chanuka' }, error);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      if (mountedRef.current) {
        setUser(null);
      }
    } finally {
      validationInProgressRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (mountedRef.current) {
      setLoading(true);
    }
    try {
      const response = await makeCancellableRequest('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        if (mountedRef.current) {
          setUser(result.data.user);
        }
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error) {
      logger.error('Login failed:', { component: 'Chanuka' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string; requiresVerification?: boolean }> => {
    if (mountedRef.current) {
      setLoading(true);
    }
    try {
      const response = await makeCancellableRequest('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        if (mountedRef.current) {
          setUser(result.data.user);
        }
        return { 
          success: true, 
          requiresVerification: result.data.requiresVerification 
        };
      } else {
        return { success: false, error: result.error || 'Registration failed' };
      }
    } catch (error) {
      logger.error('Registration failed:', { component: 'Chanuka' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await makeCancellableRequest('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      logger.error('Logout request failed:', { component: 'Chanuka' }, error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      if (mountedRef.current) {
        setUser(null);
      }
    }
  };

  const refreshToken = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken');
      if (!refreshTokenValue) {
        return { success: false, error: 'No refresh token available' };
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: refreshTokenValue }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('refreshToken', result.data.refreshToken);
        if (mountedRef.current) {
          setUser(result.data.user);
        }
        return { success: true };
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        if (mountedRef.current) {
          setUser(null);
        }
        return { success: false, error: result.error || 'Token refresh failed' };
      }
    } catch (error) {
      logger.error('Token refresh failed:', { component: 'Chanuka' }, error);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      if (mountedRef.current) {
        setUser(null);
      }
      return { success: false, error: 'Network error during token refresh' };
    }
  };

  const verifyEmail = async (token: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await makeCancellableRequest('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.data?.user && mountedRef.current) {
          setUser(result.data.user);
        }
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Email verification failed' };
      }
    } catch (error) {
      logger.error('Email verification failed:', { component: 'Chanuka' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await makeCancellableRequest('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Password reset request failed' };
      }
    } catch (error) {
      logger.error('Password reset request failed:', { component: 'Chanuka' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const resetPassword = async (token: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await makeCancellableRequest('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Password reset failed' };
      }
    } catch (error) {
      logger.error('Password reset failed:', { component: 'Chanuka' }, error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    refreshToken,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    loading,
    isAuthenticated: !!user,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
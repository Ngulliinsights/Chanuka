/**
 * OAuth Callback Handler Component
 * Handles OAuth authentication callbacks from providers like Google and GitHub
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  ArrowLeft,
  Shield
} from 'lucide-react';
import { authService } from '@client/services/authService';
import { useAuth } from '@client/features/users/hooks/useAuth';
import { logger } from '@client/utils/logger';

interface CallbackState {
  status: 'loading' | 'success' | 'error';
  message: string;
  provider?: string;
  error?: string;
}

export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [state, setState] = useState<CallbackState>({
    status: 'loading',
    message: 'Processing authentication...'
  });

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const handleOAuthCallback = async () => {
    try {
      // Extract parameters from URL
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      // Get provider from pathname
      const pathParts = window.location.pathname.split('/');
      const provider = pathParts[pathParts.length - 1]; // e.g., 'google' or 'github'

      setState(prev => ({ 
        ...prev, 
        provider,
        message: `Processing ${provider} authentication...`
      }));

      // Handle OAuth errors
      if (error) {
        const errorMsg = errorDescription || error;
        logger.error('OAuth error received:', { 
          component: 'OAuthCallback',
          provider,
          error,
          errorDescription
        });

        setState({
          status: 'error',
          message: 'Authentication failed',
          provider,
          error: errorMsg
        });
        return;
      }

      // Validate required parameters
      if (!code) {
        setState({
          status: 'error',
          message: 'Authentication failed',
          provider,
          error: 'No authorization code received'
        });
        return;
      }

      // Verify state parameter for security
      const storedState = sessionStorage.getItem('oauth_state');
      if (state && storedState && state !== storedState) {
        logger.error('OAuth state mismatch:', { 
          component: 'OAuthCallback',
          provider,
          receivedState: state,
          storedState
        });

        setState({
          status: 'error',
          message: 'Authentication failed',
          provider,
          error: 'Security validation failed'
        });
        return;
      }

      // Process OAuth callback
      const result = await authService.handleOAuthCallback(provider, code, state || undefined);

      if (result.success && result.data) {
        logger.info('OAuth authentication successful:', { 
          component: 'OAuthCallback',
          provider,
          userId: result.data.user?.id
        });

        setState({
          status: 'success',
          message: 'Authentication successful!',
          provider
        });

        // Clean up stored state
        sessionStorage.removeItem('oauth_state');
        
        // Get redirect URL
        const redirectTo = sessionStorage.getItem('oauth_redirect');
        sessionStorage.removeItem('oauth_redirect');

        // Redirect after a brief success message
        setTimeout(() => {
          navigate(redirectTo || '/dashboard', { replace: true });
        }, 2000);

      } else {
        logger.error('OAuth callback failed:', { 
          component: 'OAuthCallback',
          provider,
          error: result.error
        });

        setState({
          status: 'error',
          message: 'Authentication failed',
          provider,
          error: result.error || 'Unknown error occurred'
        });
      }

    } catch (error) {
      logger.error('OAuth callback processing failed:', { 
        component: 'OAuthCallback'
      }, error);

      setState({
        status: 'error',
        message: 'Authentication failed',
        error: error instanceof Error ? error.message : 'Network error occurred'
      });
    }
  };

  const handleRetry = () => {
    // Clear any stored OAuth state
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_redirect');
    
    // Redirect to login page
    navigate('/auth/login', { replace: true });
  };

  const getProviderDisplayName = (provider?: string): string => {
    switch (provider) {
      case 'google': return 'Google';
      case 'github': return 'GitHub';
      default: return provider || 'OAuth Provider';
    }
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
      case 'loading': return 'border-blue-200 bg-blue-50';
      case 'success': return 'border-green-200 bg-green-50';
      case 'error': return 'border-red-200 bg-red-50';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Authentication
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {state.provider && `Completing ${getProviderDisplayName(state.provider)} sign-in`}
          </p>
        </div>

        <Card className={`${getStatusColor()}`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <CardTitle className="text-lg">
              {state.status === 'loading' && 'Processing...'}
              {state.status === 'success' && 'Success!'}
              {state.status === 'error' && 'Authentication Failed'}
            </CardTitle>
            <CardDescription>
              {state.message}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {state.status === 'success' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  You will be redirected to your dashboard shortly...
                </AlertDescription>
              </Alert>
            )}

            {state.status === 'error' && (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {state.error || 'An unexpected error occurred during authentication.'}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Button 
                    onClick={handleRetry}
                    className="w-full"
                    variant="default"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  
                  <Button 
                    onClick={() => navigate('/', { replace: true })}
                    className="w-full"
                    variant="outline"
                  >
                    Return to Home
                  </Button>
                </div>
              </>
            )}

            {state.status === 'loading' && (
              <div className="text-center text-sm text-gray-600">
                <p>Please wait while we complete your authentication...</p>
                <p className="mt-2 text-xs">This may take a few seconds.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Security Notice:</strong> We use industry-standard OAuth 2.0 with PKCE for secure authentication.
            Your credentials are never stored on our servers.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
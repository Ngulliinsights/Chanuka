/**
 * Social Login Component
 * Privacy-focused social authentication options with OAuth integration
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  Github, 
  Mail, 
  Shield, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { SocialLoginProvider } from '../../types/auth';
import { authBackendService, OAuthProvider } from '../../services/authBackendService';
import { logger } from '../../utils/logger';

interface SocialLoginProps {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  className?: string;
  redirectTo?: string;
}

export function SocialLogin({ onSuccess, onError, className = '', redirectTo }: SocialLoginProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [providers, setProviders] = useState<OAuthProvider[]>([]);

  useEffect(() => {
    // Get available OAuth providers
    const availableProviders = authBackendService.getOAuthProviders();
    // Filter to only enabled providers (those with client IDs configured)
    const enabledProviders = availableProviders.filter(p => p.clientId);
    setProviders(enabledProviders);
  }, []);

  const handleSocialLogin = async (providerId: string) => {
    setLoading(providerId);

    try {
      logger.info('Initiating OAuth login', {
        component: 'SocialLogin',
        provider: providerId,
      });

      // Generate state parameter for security
      const state = generateSecureState();
      
      // Store state and redirect URL in session storage for callback
      sessionStorage.setItem('oauth_state', state);
      if (redirectTo) {
        sessionStorage.setItem('oauth_redirect', redirectTo);
      }

      // Initiate OAuth flow (this will redirect the page)
      authBackendService.initiateOAuthLogin(providerId, state);
      
    } catch (error) {
      logger.error('OAuth login initiation failed:', { component: 'SocialLogin' }, error);
      const errorMessage = error instanceof Error ? error.message : 'OAuth login failed';
      onError?.(errorMessage);
      setLoading(null);
    }
  };

  const generateSecureState = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'github':
        return <Github className="h-4 w-4" />;
      case 'google':
        return <Mail className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getProviderColor = (providerId: string) => {
    switch (providerId) {
      case 'github':
        return 'hover:bg-gray-50 border-gray-200';
      case 'google':
        return 'hover:bg-blue-50 border-blue-200';
      default:
        return 'hover:bg-gray-50 border-gray-200';
    }
  };

  if (providers.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          OAuth providers are not configured. Please contact support or use email authentication.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Privacy notice */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Continue with
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            <Eye className="h-3 w-3 mr-1" />
            Privacy Info
          </Button>
        </div>

        {showPrivacyInfo && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              We use OAuth 2.0 with PKCE for secure authentication. Your credentials are never stored on our servers.
              We only access basic profile information (name, email) and respect your privacy settings.
              <a 
                href="/privacy" 
                className="ml-1 text-blue-600 hover:underline inline-flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                Learn more
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* OAuth login buttons */}
      <div className="space-y-2">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            variant="outline"
            className={`w-full justify-start ${getProviderColor(provider.id)}`}
            onClick={() => handleSocialLogin(provider.id)}
            disabled={loading !== null}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="flex items-center gap-2">
                {loading === provider.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  getProviderIcon(provider.id)
                )}
                <span>Continue with {provider.name}</span>
              </div>
              
              <div className="flex items-center gap-1 ml-auto">
                <Badge variant="secondary" className="text-xs">
                  <Shield className="h-2 w-2 mr-1" />
                  OAuth 2.0
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="h-2 w-2 mr-1" />
                  Secure
                </Badge>
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with email</span>
        </div>
      </div>

      {/* Security notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Security Notice:</strong> OAuth authentication uses industry-standard security protocols.
          Your login is encrypted and we never see your password. All sessions are monitored for suspicious activity.
        </AlertDescription>
      </Alert>
    </div>
  );
}
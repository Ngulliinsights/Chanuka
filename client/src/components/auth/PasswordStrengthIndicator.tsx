/**
 * Password Strength Indicator Component
 * Visual feedback for password strength and requirements
 */

import { validatePassword, PASSWORD_STRENGTH_CONFIG } from '@client/utils/password-validation';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import React from 'react';


import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
  userInfo?: {
    email?: string;
    name?: string;
    username?: string;
  };
  className?: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({ 
  password, 
  userInfo, 
  className = '',
  showRequirements = true 
}: PasswordStrengthIndicatorProps) {
  const validation = validatePassword(password, undefined, userInfo);
  const config = PASSWORD_STRENGTH_CONFIG[validation.strength];

  const requirements = [
    {
      label: 'At least 12 characters',
      met: password.length >= 12,
    },
    {
      label: 'Contains uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'Contains lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      label: 'Contains number',
      met: /\d/.test(password),
    },
    {
      label: 'Contains special character',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    },
    {
      label: 'No personal information',
      met: !validation.errors.some(error => 
        error.includes('personal information')
      ),
    },
    {
      label: 'Not a common password',
      met: !validation.errors.some(error => 
        error.includes('common') || error.includes('easily guessed')
      ),
    },
  ];

  if (!password) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Password strength</span>
          <Badge 
            variant="secondary" 
            style={{ 
              backgroundColor: config.bgColor, 
              color: config.color,
              border: `1px solid ${config.color}20`
            }}
          >
            {validation.strength.charAt(0).toUpperCase() + validation.strength.slice(1)}
          </Badge>
        </div>
        
        <Progress 
          value={config.progress} 
          className="h-2"
          style={{
            '--progress-background': config.color,
          } as React.CSSProperties}
        />
        
        <p className="text-xs text-gray-500">
          {config.message}
        </p>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Requirements</h4>
          <div className="grid grid-cols-1 gap-1">
            {requirements.map((req, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {req.met ? (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-gray-400" />
                )}
                <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation errors */}
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="h-3 w-3" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* Score display for debugging/advanced users */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400">
          Score: {validation.score}/100
        </div>
      )}
    </div>
  );
}
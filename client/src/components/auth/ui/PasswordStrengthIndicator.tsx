/**
 * Password strength indicator component
 * Following navigation component patterns for utility UI components
 */

import React from 'react';
import { cn } from '../../../lib/utils';
import { AuthConfig } from '../types';
import { usePasswordStrength } from '../hooks/usePasswordUtils';
import { PASSWORD_STRENGTH_LEVELS, PASSWORD_STRENGTH_LABELS, PASSWORD_STRENGTH_COLORS } from '../constants';

export interface PasswordStrengthIndicatorProps {
  password: string;
  config?: AuthConfig;
  className?: string;
  showLabel?: boolean;
  showRequirements?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  config,
  className,
  showLabel = true,
  showRequirements = true,
}) => {
  const { strength, feedback } = usePasswordStrength(password, config);

  if (!password) return null;

  const strengthLevel = Math.min(strength.score, PASSWORD_STRENGTH_LEVELS.VERY_STRONG);
  const strengthLabel = PASSWORD_STRENGTH_LABELS[strengthLevel as keyof typeof PASSWORD_STRENGTH_LABELS];
  const strengthColor = PASSWORD_STRENGTH_COLORS[strengthLevel as keyof typeof PASSWORD_STRENGTH_COLORS];

  const getStrengthTextColor = () => {
    switch (strengthLevel) {
      case PASSWORD_STRENGTH_LEVELS.VERY_WEAK:
      case PASSWORD_STRENGTH_LEVELS.WEAK:
        return 'text-red-600 dark:text-red-400';
      case PASSWORD_STRENGTH_LEVELS.FAIR:
        return 'text-yellow-600 dark:text-yellow-400';
      case PASSWORD_STRENGTH_LEVELS.GOOD:
        return 'text-blue-600 dark:text-blue-400';
      case PASSWORD_STRENGTH_LEVELS.STRONG:
      case PASSWORD_STRENGTH_LEVELS.VERY_STRONG:
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className={cn('space-y-2', className)} data-testid="password-strength-indicator">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Password strength
          </span>
          {showLabel && (
            <span className={cn('text-xs font-medium', getStrengthTextColor())}>
              {strengthLabel}
            </span>
          )}
        </div>
        
        <div className="flex space-x-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-200',
                index < strengthLevel
                  ? strengthColor
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements */}
      {showRequirements && feedback.requirements.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Requirements:
          </span>
          <ul className="space-y-1">
            {feedback.requirements.map((requirement, index) => (
              <li
                key={index}
                className={cn(
                  'text-xs flex items-center space-x-2',
                  requirement.met
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  requirement.met
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                )} />
                <span>{requirement.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Feedback */}
      {strength.feedback.length > 0 && !strength.isStrong && (
        <div className="space-y-1">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Suggestions:
          </span>
          <ul className="space-y-1">
            {strength.feedback.slice(0, 3).map((suggestion, index) => (
              <li
                key={index}
                className="text-xs text-gray-500 dark:text-gray-400 flex items-start space-x-2"
              >
                <span className="w-1 h-1 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Simplified version for inline display
export const SimplePasswordStrengthIndicator: React.FC<{
  password: string;
  config?: AuthConfig;
  className?: string;
}> = ({ password, config, className }) => {
  const { strength } = usePasswordStrength(password, config);

  if (!password) return null;

  const strengthLevel = Math.min(strength.score, PASSWORD_STRENGTH_LEVELS.VERY_STRONG);
  const strengthColor = PASSWORD_STRENGTH_COLORS[strengthLevel as keyof typeof PASSWORD_STRENGTH_COLORS];

  return (
    <div className={cn('flex space-x-1', className)}>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors duration-200',
            index < strengthLevel
              ? strengthColor
              : 'bg-gray-200 dark:bg-gray-700'
          )}
        />
      ))}
    </div>
  );
};
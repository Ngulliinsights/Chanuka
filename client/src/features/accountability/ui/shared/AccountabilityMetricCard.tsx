/**
 * Accountability Metric Card
 *
 * Reusable card component for displaying accountability metrics
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

interface AccountabilityMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const severityColors = {
  low: 'bg-green-50 border-green-200 text-green-900',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-900',
  high: 'bg-orange-50 border-orange-200 text-orange-900',
  critical: 'bg-red-50 border-red-200 text-red-900',
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const trendColors = {
  up: 'text-green-600',
  down: 'text-red-600',
  neutral: 'text-gray-600',
};

export function AccountabilityMetricCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  severity,
  icon,
  onClick,
  className = '',
}: AccountabilityMetricCardProps) {
  const TrendIcon = trend ? trendIcons[trend] : null;
  const severityClass = severity ? severityColors[severity] : 'bg-white border-gray-200';

  return (
    <div
      className={`
        rounded-lg border-2 p-6 transition-all duration-200
        ${severityClass}
        ${onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''}
        ${className}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={e => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon && <div className="text-current opacity-70">{icon}</div>}
            <h3 className="text-sm font-medium opacity-80">{title}</h3>
          </div>

          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold">{value}</p>
            {trend && TrendIcon && (
              <div className={`flex items-center gap-1 ${trendColors[trend]}`}>
                <TrendIcon className="w-4 h-4" />
                {trendValue && <span className="text-sm font-medium">{trendValue}</span>}
              </div>
            )}
          </div>

          {subtitle && <p className="mt-2 text-sm opacity-70">{subtitle}</p>}
        </div>

        {severity === 'critical' && (
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

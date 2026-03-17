/**
 * Gap Severity Badge
 * 
 * Visual indicator for gap severity levels
 */

import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

interface GapSeverityBadgeProps {
  severity: 'low' | 'medium' | 'high' | 'critical';
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const severityConfig = {
  low: {
    label: 'Low Risk',
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: Info,
  },
  medium: {
    label: 'Medium Risk',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: AlertCircle,
  },
  high: {
    label: 'High Risk',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Critical Risk',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: XCircle,
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1.5',
  lg: 'text-base px-4 py-2',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function GapSeverityBadge({
  severity,
  showIcon = true,
  showLabel = true,
  size = 'md',
  className = '',
}: GapSeverityBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full border
        ${config.color}
        ${sizeClasses[size]}
        ${className}
      `}
      role="status"
      aria-label={`Gap severity: ${config.label}`}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

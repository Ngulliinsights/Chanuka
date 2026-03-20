/**
 * Health Status Display Component
 * 
 * Displays the health status of a feature with appropriate styling
 */

interface HealthStatusDisplayProps {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  size?: 'sm' | 'md' | 'lg';
}

export function HealthStatusDisplay({ status, size = 'md' }: HealthStatusDisplayProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusConfig = {
    healthy: {
      color: 'bg-green-500',
      label: 'Healthy',
      textColor: 'text-green-700',
    },
    degraded: {
      color: 'bg-yellow-500',
      label: 'Degraded',
      textColor: 'text-yellow-700',
    },
    down: {
      color: 'bg-red-500',
      label: 'Down',
      textColor: 'text-red-700',
    },
    unknown: {
      color: 'bg-gray-500',
      label: 'Unknown',
      textColor: 'text-gray-700',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} ${config.color} rounded-full`} />
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
}

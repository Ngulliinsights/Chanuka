import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  threshold: number;
  isRefreshing: boolean;
}

export function PullToRefreshIndicator({
  pullDistance,
  threshold,
  isRefreshing,
}: PullToRefreshIndicatorProps) {
  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const shouldShow = pullDistance > 0 || isRefreshing;

  if (!shouldShow) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-transform"
      style={{
        transform: `translateY(${Math.min(pullDistance, threshold)}px)`,
      }}
    >
      <div className="bg-white rounded-full shadow-lg p-3">
        <RefreshCw
          className={`h-6 w-6 text-blue-600 ${isRefreshing ? 'animate-spin' : ''}`}
          style={{
            transform: `rotate(${progress * 3.6}deg)`,
          }}
        />
      </div>
    </div>
  );
}

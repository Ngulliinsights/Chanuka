/**
 * SearchProgressIndicator Component
 *
 * Visual indicator for streaming search progress with real-time updates,
 * engine performance metrics, and cancellation controls.
 */

import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Progress } from '../../../components/ui/progress';
import { Badge } from '../../../components/ui/badge';
import {
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Search,
  Target
} from 'lucide-react';
import { cn } from '../../../lib/utils';

// Define SearchProgress type locally
interface SearchProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentEngine: string;
  searchTime: number;
}

interface SearchProgressIndicatorProps {
  progress: SearchProgress;
  isActive: boolean;
  onCancel?: () => void;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function SearchProgressIndicator({
  progress,
  isActive,
  onCancel,
  className = '',
  showDetails = true,
  compact = false
}: SearchProgressIndicatorProps) {
  const getStatusIcon = () => {
    if (progress.percentage >= 100) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (!isActive) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
  };

  const getStatusText = () => {
    if (progress.percentage >= 100) {
      return 'Complete';
    }
    if (!isActive) {
      return 'Cancelled';
    }
    return 'Searching...';
  };

  const getEngineIcon = (engine: string) => {
    switch (engine.toLowerCase()) {
      case 'postgresql':
        return <Database className="h-3 w-3" />;
      case 'fuse':
        return <Search className="h-3 w-3" />;
      default:
        return <Target className="h-3 w-3" />;
    }
  };

  if (compact) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <Progress value={progress.percentage} className="h-2" />
        </div>
        <span className="text-xs text-muted-foreground">
          {progress.loaded}/{progress.total || '?'}
        </span>
        {isActive && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <span className="font-medium">{getStatusText()}</span>
            </div>
            {isActive && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="h-8"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span className="text-muted-foreground">
                {progress.percentage.toFixed(0)}%
              </span>
            </div>
            <Progress value={progress.percentage} className="h-3" />
          </div>

          {/* Details */}
          {showDetails && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{progress.loaded}</div>
                  <div className="text-muted-foreground">Results</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{progress.searchTime}ms</div>
                  <div className="text-muted-foreground">Time</div>
                </div>
              </div>

              {progress.currentEngine && (
                <div className="flex items-center space-x-2">
                  {getEngineIcon(progress.currentEngine)}
                  <div>
                    <div className="font-medium capitalize">{progress.currentEngine}</div>
                    <div className="text-muted-foreground">Engine</div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                  {isActive ? 'Active' : 'Idle'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default SearchProgressIndicator;
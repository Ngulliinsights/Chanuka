/**
 * SearchProgressIndicator Component
 *
 * Visual indicator for streaming search progress with real-time updates,
 * engine performance metrics, and cancellation controls.
 */

import {
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Search,
  Target,
  Zap
} from 'lucide-react';
import React from 'react';

import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent } from '@client/shared/design-system';
import { Progress } from '@client/shared/design-system';
import { cn } from '@client/shared/design-system';

interface SearchProgress {
  loaded: number;
  total: number;
  percentage: number;
  currentEngine: string;
  searchTime: number;
  status: 'searching' | 'complete' | 'error' | 'cancelled';
  engines: Array<{
    name: string;
    status: 'pending' | 'searching' | 'complete' | 'error';
    results: number;
    responseTime: number;
  }>;
}

interface SearchProgressIndicatorProps {
  progress: SearchProgress;
  isActive: boolean;
  onCancel?: () => void;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * SearchProgressIndicator - Real-time search progress with engine details
 */
export function SearchProgressIndicator({
  progress,
  isActive,
  onCancel,
  className = '',
  showDetails = true,
  compact = false,
}: SearchProgressIndicatorProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'searching':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'searching':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'complete':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 p-2 bg-muted/50 rounded-md", className)}>
        {getStatusIcon(progress.status)}
        <div className="flex-1">
          <Progress value={progress.percentage} className="h-1" />
        </div>
        <span className="text-xs text-muted-foreground">
          {progress.loaded}/{progress.total}
        </span>
        {onCancel && isActive && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  if (!isActive && progress.status !== 'complete') {
    return null;
  }

  return (
    <Card className={cn("border-l-4 border-l-blue-500", className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(progress.status)}
              <span className="font-medium">
                {progress.status === 'searching' && 'Searching...'}
                {progress.status === 'complete' && 'Search Complete'}
                {progress.status === 'error' && 'Search Error'}
                {progress.status === 'cancelled' && 'Search Cancelled'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formatTime(progress.searchTime)}
              </Badge>
              {onCancel && isActive && (
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {progress.currentEngine && `Searching ${progress.currentEngine}...`}
              </span>
              <span className="font-medium">
                {progress.loaded}/{progress.total} ({progress.percentage}%)
              </span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>

          {/* Engine Details */}
          {showDetails && progress.engines && progress.engines.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Search Engines
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {progress.engines.map((engine, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex items-center justify-between p-2 rounded border text-xs",
                      getStatusColor(engine.status)
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(engine.status)}
                      <span className="font-medium">{engine.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs">
                      {engine.status === 'complete' && (
                        <>
                          <span>{engine.results} results</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatTime(engine.responseTime)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {progress.status === 'complete' && showDetails && (
            <div className="flex items-center justify-between pt-2 border-t text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-green-500" />
                  <span>{progress.total} sources searched</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-blue-500" />
                  <span>Avg: {formatTime(progress.searchTime / progress.engines.length)}</span>
                </div>
              </div>
              
              <Badge variant="secondary" className="text-xs">
                {progress.engines.filter(e => e.status === 'complete').length} successful
              </Badge>
            </div>
          )}

          {/* Error Details */}
          {progress.status === 'error' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Search encountered errors</span>
              </div>
              <div className="mt-1 text-red-700">
                {progress.engines.filter(e => e.status === 'error').length} of {progress.engines.length} engines failed
              </div>
            </div>
          )}

          {/* Performance Insights */}
          {progress.status === 'complete' && showDetails && (
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Search className="h-3 w-3" />
                <span>
                  Search completed in {formatTime(progress.searchTime)} • 
                  Best engine: {progress.engines.reduce((best, engine) => 
                    engine.responseTime < best.responseTime ? engine : best
                  ).name} ({formatTime(progress.engines.reduce((best, engine) => 
                    engine.responseTime < best.responseTime ? engine : best
                  ).responseTime)})
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default SearchProgressIndicator;
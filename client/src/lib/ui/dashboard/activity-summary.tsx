import { AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import React from 'react';

import { handleError, measureAsync, recordMetric } from '@client/infrastructure';
import type { DashboardConfig } from '@client/lib/types/dashboard';

import { Button, Card, CardContent, CardHeader } from '../../design-system';

import { useDashboard } from './hooks';
import type { DashboardComponentProps } from './types';
import { validateActivitySummary } from './validation';

export const ActivitySummary = React.memo<DashboardComponentProps>(
  ({ className = '', config, onError, onDataChange }) => {
    // Fix: Type config properly as Partial<DashboardConfig>
    const { data, loading, error, actions, recovery } = useDashboard(
      config as Partial<DashboardConfig>
    );

    // Handle error reporting using core error handler
    React.useEffect(() => {
      if (error) {
        // Convert error to AppError format expected by handleError
        const appError = {
          message: error.message,
          code: error.name || 'DASHBOARD_ERROR',
          cause: error.cause instanceof Error ? error.cause : undefined,
        };
        handleError(appError);
        onError?.(error);
      }
    }, [error, onError]);

    // Handle data change notifications
    React.useEffect(() => {
      if (onDataChange && data.summary) {
        onDataChange({ summary: data.summary });
      }
    }, [data.summary, onDataChange]);

    // Validate summary data
    const validatedSummary = React.useMemo(() => {
      if (!data.summary) return null;

      try {
        return validateActivitySummary(data.summary);
      } catch (validationError) {
        console.warn('Activity summary validation failed:', validationError);
        return data.summary; // Use non-validated data as fallback
      }
    }, [data.summary]);

    const handleRefresh = async () => {
      await measureAsync(async () => {
        try {
          await actions.refresh();
          recordMetric('activity-summary-refresh-success', 1);
        } catch (refreshError) {
          const appError = {
            message: refreshError instanceof Error ? refreshError.message : 'Refresh failed',
            code: 'REFRESH_ERROR',
            cause: refreshError instanceof Error ? refreshError : undefined,
          };
          handleError(appError);
          throw refreshError;
        }
      });
    };

    const handleRecovery = async () => {
      await measureAsync(async () => {
        try {
          await recovery.recover();
          recordMetric('activity-summary-recovery-success', 1);
        } catch (recoveryError) {
          const appError = {
            message: recoveryError instanceof Error ? recoveryError.message : 'Recovery failed',
            code: 'RECOVERY_ERROR',
            cause: recoveryError instanceof Error ? recoveryError : undefined,
          };
          handleError(appError);
          throw recoveryError;
        }
      });
    };

    // Error state with recovery options
    if (error && !loading) {
      return (
        <Card className={`bg-white rounded-lg border border-red-200 shadow ${className}`}>
          <CardHeader className="px-5 py-4 border-b border-red-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-red-800">Activity Summary</h3>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="text-center py-4">
              <p className="text-sm text-red-600 mb-3">{error.message}</p>
              {recovery.canRecover && (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecovery}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Recovery
                  </Button>
                  <div className="text-xs text-red-500">
                    {recovery.suggestions.map((suggestion, index) => (
                      <p key={index}>{suggestion}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={`bg-white rounded-lg border border-slate-200 shadow ${className}`}>
        <CardHeader className="px-5 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Activity Summary</h3>
            <div className="flex items-center space-x-2">
              {data.lastRefresh && (
                <span className="text-xs text-slate-500">
                  Updated {data.lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 bg-slate-100 animate-pulse rounded-md"></div>
              <div className="h-16 bg-slate-100 animate-pulse rounded-md"></div>
              <div className="h-16 bg-slate-100 animate-pulse rounded-md"></div>
            </div>
          ) : validatedSummary ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
                  <p className="text-2xl font-bold text-blue-600">
                    {validatedSummary.billsTracked}
                  </p>
                </div>
                <p className="text-xs text-slate-600">Bills Tracked</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-50 border border-orange-100">
                <div className="flex items-center justify-center mb-1">
                  <AlertCircle className="h-4 w-4 text-orange-600 mr-1" />
                  <p className="text-2xl font-bold text-orange-600">
                    {validatedSummary.actionsNeeded}
                  </p>
                </div>
                <p className="text-xs text-slate-600">Actions Needed</p>
              </div>
              <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                <div className="flex items-center justify-center mb-1">
                  <span className="inline-block h-4 w-4 bg-green-600 rounded-full mr-1"></span>
                  <p className="text-2xl font-bold text-green-600">
                    {validatedSummary.topicsCount}
                  </p>
                </div>
                <p className="text-xs text-slate-600">Topics</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500">
              <p className="text-sm">No activity data available</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Data
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

ActivitySummary.displayName = 'ActivitySummary';

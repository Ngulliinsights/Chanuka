import { useDashboard, useDashboardActions } from "./hooks";
import type { DashboardComponentProps, ActionPriority } from "./types";
import { AlertCircle, RefreshCw, CheckCircle, Clock } from "lucide-react";
import React from "react";

import { Button } from "../../design-system";
import { Card, CardContent, CardHeader } from "../../design-system";

import { validateActionItem } from "./validation";

export const ActionItems: React.FC<DashboardComponentProps> = ({
  className = "",
  config,
  onError,
  onDataChange,
}) => {
  const { data, loading, error, actions, recovery } = useDashboard(config);
  useDashboardActions(data.actionItems);
  const [showCompleted, setShowCompleted] = React.useState(
    config?.showCompletedActions ?? false
  );
  const [priorityFilter, setPriorityFilter] = React.useState<
    ActionPriority | "all"
  >("all");

  // Handle error reporting
  React.useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Handle data change notifications
  React.useEffect(() => {
    if (onDataChange && data.actionItems) {
      onDataChange({ actionItems: data.actionItems });
    }
  }, [data.actionItems, onDataChange]);

  // Filter and validate action items
  const filteredActionItems = React.useMemo(() => {
    if (!data.actionItems) return [];

    let items = data.actionItems;

    // Filter by completion status
    if (!showCompleted) {
      items = items.filter((item) => !item.completed);
    }

    // Filter by priority
    if (priorityFilter !== "all") {
      items = items.filter((item) => item.priority === priorityFilter);
    }

    // Validate items
    return items.map((item) => {
      try {
        return validateActionItem(item);
      } catch (validationError) {
        console.warn("Action item validation failed:", validationError);
        return item; // Use non-validated item as fallback
      }
    });
  }, [data.actionItems, showCompleted, priorityFilter]);

  const handleCompleteAction = async (actionId: string) => {
    try {
      await actions.completeAction(actionId);
    } catch (actionError) {
      console.error("Failed to complete action:", actionError);
    }
  };

  const handleRefresh = async () => {
    try {
      await actions.refresh();
    } catch (refreshError) {
      console.error("Failed to refresh action items:", refreshError);
    }
  };

  const handleRecovery = async () => {
    try {
      await recovery.recover();
    } catch (recoveryError) {
      console.error("Recovery failed:", recoveryError);
    }
  };

  const getPriorityColor = (priority: ActionPriority) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800 border-red-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Low":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDueDate = (due_date?: Date) => {
    if (!due_date) return null;

    const now = new Date();
    const diffMs = due_date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)} days overdue`,
        color: "text-red-600",
      };
    } else if (diffDays === 0) {
      return { text: "Due today", color: "text-orange-600" };
    } else if (diffDays <= 3) {
      return { text: `Due in ${diffDays} days`, color: "text-yellow-600" };
    } else {
      return { text: `Due in ${diffDays} days`, color: "text-slate-600" };
    }
  };

  // Error state with recovery options
  if (error && !loading) {
    return (
      <Card
        className={`bg-white rounded-lg border border-red-200 shadow ${className}`}
      >
        <CardHeader className="px-5 py-4 border-b border-red-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-red-800">
              Your Action Items
            </h3>
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
    <Card
      className={`bg-white rounded-lg border border-slate-200 shadow ${className}`}
    >
      <CardHeader className="px-5 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Your Action Items</h3>
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
              <RefreshCw
                className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 mt-3">
          <Button
            variant={showCompleted ? "primary" : "outline"}
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {showCompleted ? "Hide" : "Show"} Completed
          </Button>

          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value as ActionPriority | "all")
            }
            className="text-xs border border-slate-300 rounded px-2 py-1"
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="Low">Low Priority</option>
          </select>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-8 bg-slate-100 animate-pulse rounded-md"></div>
            <div className="h-8 bg-slate-100 animate-pulse rounded-md"></div>
            <div className="h-8 bg-slate-100 animate-pulse rounded-md"></div>
          </div>
        ) : filteredActionItems.length > 0 ? (
          <div className="space-y-3">
            {filteredActionItems.map((item) => {
              const dueDateInfo = formatDueDate(item.due_date);

              return (
                <div
                  key={item.id}
                  className={`flex justify-between items-start border-b pb-3 last:border-0 ${
                    item.completed ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p
                        className={`font-medium text-sm ${
                          item.completed ? "line-through" : ""
                        }`}
                      >
                        {item.title}
                      </p>
                      {item.completed && (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-1">
                      {item.description}
                    </p>

                    {dueDateInfo && (
                      <div className="flex items-center text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        <span className={dueDateInfo.color}>
                          {dueDateInfo.text}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>

                    {!item.completed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCompleteAction(item.id)}
                        className="h-6 w-6 p-0 text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            <p className="text-sm mb-2">
              {showCompleted || priorityFilter !== "all"
                ? "No action items match your filters"
                : "No action items at the moment"}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

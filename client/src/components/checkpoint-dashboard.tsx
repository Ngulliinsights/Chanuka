import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ExternalLink, Eye, AlertTriangle } from "lucide-react";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { logger } from "../utils/browser-logger";

interface CheckpointDashboardProps {
  projectId: number;
}

interface Checkpoint {
  id: number;
  name: string;
  description: string;
  status: "completed" | "in_progress" | "failed" | "planned";
  createdAt: string;
  updatedAt: string;
  targetDate?: string;
  successRate?: number;
  metrics?: {
    features_completed: number;
    features_total: number;
  };
}

export default function CheckpointDashboard({
  projectId,
}: CheckpointDashboardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: checkpoints, isLoading } = useQuery<Checkpoint[]>({
    queryKey: [`/api/projects/${projectId}/checkpoints`],
    initialData: [],
  });

  const updateCheckpointMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<Checkpoint>;
    }) => {
      const response = await apiRequest("PUT", `/api/checkpoints/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}/checkpoints`],
      });
      toast({
        title: "Checkpoint updated",
        description: "Checkpoint status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update checkpoint.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <section className="bg-background rounded-lg border border-border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "emerald";
      case "in_progress":
        return "blue";
      case "failed":
        return "red";
      default:
        return "gray";
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: "bg-emerald-100 text-emerald-800",
      in_progress: "bg-blue-100 text-blue-800",
      failed: "bg-red-100 text-red-800",
      planned: "bg-gray-100 text-gray-800",
    };

    const labels = {
      completed: "COMPLETED",
      in_progress: "IN PROGRESS",
      failed: "FAILED",
      planned: "PLANNED",
    };

    return (
      <span
        className={`${
          colors[status as keyof typeof colors]
        } px-2 py-1 rounded text-xs font-medium`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <section className="bg-background rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Development Checkpoints</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span>Add Checkpoint</span>
        </button>
      </div>

      <div className="space-y-4">
        {checkpoints?.map((checkpoint) => {
          const statusColor = getStatusColor(checkpoint.status);
          const isInProgress = checkpoint.status === "in_progress";
          const canPivot = isInProgress && (checkpoint.successRate || 0) > 70;

          return (
            <div
              key={checkpoint.id}
              className={`border border-border rounded-lg p-4 bg-${statusColor}-50 border-${statusColor}-200`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    <div
                      className={`w-3 h-3 bg-${statusColor}-500 rounded-full ${
                        isInProgress ? "animate-pulse" : ""
                      }`}
                    ></div>
                  </div>
                  <div>
                    <h3 className={`font-medium text-${statusColor}-900`}>
                      {checkpoint.name}
                    </h3>
                    <p className={`text-sm text-${statusColor}-700 mt-1`}>
                      {checkpoint.description}
                    </p>
                    <div
                      className={`flex items-center space-x-4 mt-2 text-xs text-${statusColor}-600`}
                    >
                      <span>
                        {checkpoint.status === "completed"
                          ? "Completed"
                          : "Started"}
                        :{" "}
                        {new Date(checkpoint.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                      {checkpoint.targetDate && (
                        <span>
                          Target:{" "}
                          {new Date(checkpoint.targetDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>
                      )}
                      {checkpoint.successRate && (
                        <span>Success Rate: {checkpoint.successRate}%</span>
                      )}
                    </div>

                    {isInProgress && checkpoint.metrics && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-blue-600 mb-1">
                          <span>Progress</span>
                          <span>
                            {checkpoint.metrics.features_completed}/
                            {checkpoint.metrics.features_total} features
                          </span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${
                                (checkpoint.metrics.features_completed /
                                  checkpoint.metrics.features_total) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(checkpoint.status)}
                  <button className={`p-1 hover:bg-${statusColor}-200 rounded`}>
                    {isInProgress ? (
                      <Eye className={`w-4 h-4 text-${statusColor}-600`} />
                    ) : (
                      <ExternalLink
                        className={`w-4 h-4 text-${statusColor}-600`}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Pivot Decision Point */}
              {canPivot && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-900">
                        Checkpoint Review Available
                      </h4>
                      <p className="text-xs text-amber-700 mt-1">
                        Current phase eligible for pivot evaluation. Review
                        metrics and decide on next direction.
                      </p>
                      <div className="mt-2 flex space-x-2">
                        <button className="bg-amber-600 text-white px-3 py-1 rounded text-xs hover:bg-amber-700 transition-colors">
                          Review & Pivot
                        </button>
                        <button className="border border-amber-300 text-amber-700 px-3 py-1 rounded text-xs hover:bg-amber-100 transition-colors">
                          Continue Current Path
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

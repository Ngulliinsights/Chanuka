import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FeatureFlag } from "@shared/schema";
import { Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlagsPanelProps {
  projectId: number;
}

export default function FeatureFlagsPanel({ projectId }: FeatureFlagsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: featureFlags, isLoading } = useQuery<FeatureFlag[]>({
    queryKey: [`/api/projects/${projectId}/feature-flags`],
  });

  const updateFeatureFlagMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FeatureFlag> }) => {
      const response = await apiRequest("PUT", `/api/feature-flags/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/feature-flags`] });
      toast({
        title: "Feature flag updated",
        description: "Feature flag has been toggled successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update feature flag.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (flag: FeatureFlag) => {
    updateFeatureFlagMutation.mutate({
      id: flag.id,
      data: { isEnabled: !flag.isEnabled }
    });
  };

  if (isLoading) {
    return (
      <section className="bg-background rounded-lg border border-border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "emerald";
      case "testing":
        return "amber";
      case "inactive":
        return "red";
      default:
        return "gray";
    }
  };

  return (
    <section className="bg-background rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Feature Flags Management</h2>
        <button className="flex items-center space-x-2 border border-border px-4 py-2 rounded-lg hover:bg-accent transition-colors">
          <Settings className="w-4 h-4" />
          <span>Configure</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {featureFlags?.map((flag) => {
          const statusColor = getStatusColor(flag.status);
          
          return (
            <div key={flag.id} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h3 className="font-medium">{flag.name}</h3>
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 bg-${statusColor}-500 rounded-full`}></div>
                    <span className={`text-xs text-${statusColor}-600 capitalize`}>{flag.status}</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flag.isEnabled}
                    onChange={() => handleToggle(flag)}
                    className="sr-only peer"
                    disabled={updateFeatureFlagMutation.isPending}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{flag.description}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Users: {flag.rolloutPercentage}% rollout</span>
                <span>
                  {flag.expiryDate 
                    ? `Expires: ${new Date(flag.expiryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : "Permanent feature"
                  }
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

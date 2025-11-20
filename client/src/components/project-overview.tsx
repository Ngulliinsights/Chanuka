import { useQuery } from "@tanstack/react-query";
import { AnalyticsMetric, Checkpoint, FeatureFlag } from "@shared/schema";
import { Calendar, CheckCircle, Flag, Milestone, TrendingUp } from "lucide-react";
import { logger } from '@client/utils/logger';

interface ProjectOverviewProps {
  projectId: number;
}

export default function ProjectOverview({ projectId }: ProjectOverviewProps) {
  const { data: checkpoints } = useQuery<Checkpoint[]>({
    queryKey: [`/api/projects/${projectId}/checkpoints`],
  });

  const { data: featureFlags } = useQuery<FeatureFlag[]>({
    queryKey: [`/api/projects/${projectId}/feature-flags`],
  });

  const { data: analytics } = useQuery<AnalyticsMetric[]>({
    queryKey: [`/api/projects/${projectId}/analytics`],
  });

  const currentCheckpoint = checkpoints?.find(c => (c as any).status === "in_progress");
  const completedFeatures = (currentCheckpoint as any)?.metrics?.features_completed || 0;
  const totalFeatures = (currentCheckpoint as any)?.metrics?.features_total || 0;
  const activeFlags = featureFlags?.filter(f => f.enabled).length || 0;
  const flagsExpiringSoon = featureFlags?.filter(f => 
    f.expiryDate && new Date(f.expiryDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  ).length || 0;

  const next_checkpointDays = currentCheckpoint?.targetDate 
    ? Math.ceil((new Date(currentCheckpoint.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-background rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Sprint</p>
            <p className="text-2xl font-bold">Sprint 4</p>
          </div>
          <div className="p-3 bg-blue-100 rounded-lg">
            <Calendar className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center text-sm text-emerald-600">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>On track</span>
          </div>
        </div>
      </div>

      <div className="bg-background rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Features Deployed</p>
            <p className="text-2xl font-bold">{completedFeatures}/{totalFeatures}</p>
          </div>
          <div className="p-3 bg-emerald-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center text-sm text-emerald-600">
            <span>{Math.round((completedFeatures / totalFeatures) * 100)}% complete</span>
          </div>
        </div>
      </div>

      <div className="bg-background rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Active Flags</p>
            <p className="text-2xl font-bold">{activeFlags}</p>
          </div>
          <div className="p-3 bg-amber-100 rounded-lg">
            <Flag className="w-6 h-6 text-amber-600" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center text-sm text-amber-600">
            <span>{flagsExpiringSoon} expiring soon</span>
          </div>
        </div>
      </div>

      <div className="bg-background rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Next Checkpoint</p>
            <p className="text-2xl font-bold">{next_checkpointDays} days</p>
          </div>
          <div className="p-3 bg-purple-100 rounded-lg">
            <Milestone className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center text-sm text-purple-600">
            <span>{currentCheckpoint?.phase || "Phase 2"} Review</span>
          </div>
        </div>
      </div>
    </section>
  );
}


import { useQuery } from "@tanstack/react-query";
import { Project } from "@shared/schema";
import ProjectOverview from "@/components/project-overview";
import CheckpointDashboard from "@/components/checkpoint-dashboard";
import FeatureFlagsPanel from "@/components/feature-flags-panel";
import AnalyticsDashboard from "@/components/analytics-dashboard";
import DecisionMatrix from "@/components/decision-matrix";
import ArchitecturePlanning from "@/components/architecture-planning";
import Sidebar from "@/components/sidebar";
import { GitBranch, Settings } from "lucide-react";

export default function Dashboard() {
  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const currentProject = projects?.[0]; // For now, use the first project

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No projects found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold">Development Pivot Dashboard</h1>
            </div>
            <div className="text-sm text-muted-foreground">
              Chanuka Legislative Platform
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>{currentProject.currentPhase}</span>
            </div>
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        <Sidebar />

        {/* Main Dashboard Content */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          <ProjectOverview projectId={currentProject.id} />
          <CheckpointDashboard projectId={currentProject.id} />
          <FeatureFlagsPanel projectId={currentProject.id} />
          <AnalyticsDashboard projectId={currentProject.id} />
          <DecisionMatrix projectId={currentProject.id} />
          <ArchitecturePlanning projectId={currentProject.id} />
        </main>
      </div>
    </div>
  );
}

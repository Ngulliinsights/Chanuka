import { useQuery } from "@tanstack/react-query";
import { ArchitectureComponent } from "@shared/schema";
import { ExternalLink, Puzzle } from "lucide-react";
import { logger } from '@/utils/browser-logger';

interface ArchitecturePlanningProps {
  projectId: number;
}

export default function ArchitecturePlanning({ projectId }: ArchitecturePlanningProps) {
  const { data: components, isLoading } = useQuery<ArchitectureComponent[]>({
    queryKey: [`/api/projects/${projectId}/architecture`],
  });

  if (isLoading) {
    return (
      <section className="bg-background rounded-lg border border-border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "stable":
        return "emerald";
      case "active_dev":
        return "blue";
      case "refactoring":
        return "amber";
      case "planned":
        return "gray";
      default:
        return "gray";
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      stable: "bg-emerald-100 text-emerald-800",
      active_dev: "bg-blue-100 text-blue-800",
      refactoring: "bg-amber-100 text-amber-800",
      planned: "bg-gray-100 text-gray-800"
    };
    
    const labels = {
      stable: "Stable",
      active_dev: "Active Dev",
      refactoring: "Refactoring",
      planned: "Planned"
    };

    return (
      <span className={`text-xs ${colors[status as keyof typeof colors]} px-2 py-1 rounded`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <section className="bg-background rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold mb-6">Modular Architecture Planning</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Architecture */}
        <div>
          <h3 className="font-medium mb-4">Current Component Architecture</h3>
          <div className="space-y-2">
            {components?.map((component) => {
              const statusColor = getStatusColor(component.status);
              
              return (
                <div key={component.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 bg-${statusColor}-500 rounded-full`}></div>
                    <div>
                      <p className="text-sm font-medium">{component.name}</p>
                      <p className="text-xs text-muted-foreground">{component.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(component.status)}
                    <button className="p-1 hover:bg-accent rounded">
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Plugin Architecture */}
        <div>
          <h3 className="font-medium mb-4">Plugin-Ready Components</h3>
          <div className="space-y-3">
            <div className="p-4 border border-dashed border-border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Puzzle className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-sm">Analytics Plugin Interface</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Standardized API for analytics providers (Google Analytics, Mixpanel, Custom)</p>
              <div className="flex space-x-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Hook: useAnalytics</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Swappable</span>
              </div>
            </div>

            <div className="p-4 border border-dashed border-border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Puzzle className="w-4 h-4 text-purple-600" />
                <h4 className="font-medium text-sm">AI Provider Interface</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Abstracted AI service layer (OpenAI, Anthropic, Local models)</p>
              <div className="flex space-x-2">
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Service: AIAnalysis</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Swappable</span>
              </div>
            </div>

            <div className="p-4 border border-dashed border-border rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Puzzle className="w-4 h-4 text-emerald-600" />
                <h4 className="font-medium text-sm">Notification System</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-2">Multi-channel notification delivery (Email, SMS, Push, In-app)</p>
              <div className="flex space-x-2">
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded">Service: NotificationHub</span>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Configurable</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Implementation Roadmap */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-3">Implementation Strategy</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-blue-900 mb-2">Phase 1: Interface Definition</h5>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• Define plugin contracts</li>
              <li>• Create base abstractions</li>
              <li>• Implement hook system</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-purple-900 mb-2">Phase 2: Core Migration</h5>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• Refactor existing services</li>
              <li>• Add plugin registration</li>
              <li>• Test swappability</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium text-emerald-900 mb-2">Phase 3: Extension Points</h5>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• Build plugin marketplace</li>
              <li>• Add configuration UI</li>
              <li>• Enable hot-swapping</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

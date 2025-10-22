import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Split, ArrowRight, Zap, Users } from "lucide-react";
import { apiRequest } from '..\lib\queryClient';
import { useToast } from '..\hooks\use-toast';
import { logger } from '..\utils\browser-logger';

interface DecisionMatrixProps {
  projectId: number;
}

export default function DecisionMatrix({ projectId }: DecisionMatrixProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPivotDecisionMutation = useMutation({
    mutationFn: async (decisionType: string) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/pivot-decisions`, {
        decisionType,
        reasoning: `User initiated ${decisionType} strategy`,
        status: "pending"
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/pivot-decisions`] });
      toast({
        title: "Pivot initiated",
        description: "Pivot decision has been created and is pending approval.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to initiate pivot decision.",
        variant: "destructive",
      });
    },
  });

  const handlePivot = (strategy: string) => {
    createPivotDecisionMutation.mutate(strategy);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "LOW":
        return "text-emerald-600";
      case "MEDIUM":
        return "text-amber-600";
      case "HIGH":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <section className="bg-background rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Pivot Decision Matrix</h2>
        <div className="flex space-x-2">
          <button className="flex items-center space-x-2 border border-border px-3 py-2 rounded-lg hover:bg-accent transition-colors text-sm">
            <Download className="w-4 h-4" />
            <span>Export Analysis</span>
          </button>
          <button 
            className="flex items-center space-x-2 bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700 transition-colors text-sm"
            onClick={() => handlePivot("continue")}
            disabled={createPivotDecisionMutation.isPending}
          >
            <Split className="w-4 h-4" />
            <span>Initiate Pivot</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Path */}
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <div className="flex items-center space-x-2 mb-3">
            <ArrowRight className="w-4 h-4 text-blue-600" />
            <h3 className="font-medium text-blue-900">Continue Current Path</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-blue-700 font-medium">PROS</p>
              <ul className="text-xs text-blue-600 mt-1 space-y-1">
                <li>• High user engagement (82%)</li>
                <li>• Strong performance metrics</li>
                <li>• Proven feature adoption</li>
                <li>• Low technical debt</li>
              </ul>
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">CONS</p>
              <ul className="text-xs text-blue-600 mt-1 space-y-1">
                <li>• Limited innovation opportunity</li>
                <li>• Market saturation risk</li>
                <li>• Slower growth potential</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <p className="text-xs text-blue-700 font-medium">RISK LEVEL: <span className={getRiskColor("LOW")}>LOW</span></p>
              <p className="text-xs text-blue-700 font-medium">EFFORT: <span className={getRiskColor("LOW")}>LOW</span></p>
            </div>
          </div>
        </div>

        {/* Alternative Path 1 */}
        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
          <div className="flex items-center space-x-2 mb-3">
            <Zap className="w-4 h-4 text-purple-600" />
            <h3 className="font-medium text-purple-900">AI-First Pivot</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-purple-700 font-medium">PROS</p>
              <ul className="text-xs text-purple-600 mt-1 space-y-1">
                <li>• Cutting-edge differentiation</li>
                <li>• Higher user value</li>
                <li>• Scalable automation</li>
                <li>• Competitive advantage</li>
              </ul>
            </div>
            <div>
              <p className="text-xs text-purple-700 font-medium">CONS</p>
              <ul className="text-xs text-purple-600 mt-1 space-y-1">
                <li>• High development cost</li>
                <li>• Technical complexity</li>
                <li>• Longer time to market</li>
                <li>• Resource requirements</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-purple-200">
              <p className="text-xs text-purple-700 font-medium">RISK LEVEL: <span className={getRiskColor("MEDIUM")}>MEDIUM</span></p>
              <p className="text-xs text-purple-700 font-medium">EFFORT: <span className={getRiskColor("HIGH")}>HIGH</span></p>
            </div>
          </div>
        </div>

        {/* Alternative Path 2 */}
        <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="w-4 h-4 text-emerald-600" />
            <h3 className="font-medium text-emerald-900">Community-Driven Pivot</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-emerald-700 font-medium">PROS</p>
              <ul className="text-xs text-emerald-600 mt-1 space-y-1">
                <li>• Organic user growth</li>
                <li>• Lower development cost</li>
                <li>• User-validated features</li>
                <li>• Strong engagement</li>
              </ul>
            </div>
            <div>
              <p className="text-xs text-emerald-700 font-medium">CONS</p>
              <ul className="text-xs text-emerald-600 mt-1 space-y-1">
                <li>• Slower innovation pace</li>
                <li>• Less predictable outcomes</li>
                <li>• Moderation challenges</li>
              </ul>
            </div>
            <div className="pt-2 border-t border-emerald-200">
              <p className="text-xs text-emerald-700 font-medium">RISK LEVEL: <span className={getRiskColor("LOW")}>LOW</span></p>
              <p className="text-xs text-emerald-700 font-medium">EFFORT: <span className={getRiskColor("MEDIUM")}>MEDIUM</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Criteria */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="font-medium mb-3">Decision Criteria & Weights</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">User Impact</p>
            <p className="font-medium">35%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Technical Feasibility</p>
            <p className="font-medium">25%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Market Opportunity</p>
            <p className="font-medium">25%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Resource Availability</p>
            <p className="font-medium">15%</p>
          </div>
        </div>
      </div>
    </section>
  );
}

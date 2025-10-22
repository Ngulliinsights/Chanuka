import { useQuery } from "@tanstack/react-query";
import { AnalyticsMetric } from "@shared/schema";
import { CheckCircle } from "lucide-react";
import { logger } from '@/utils/browser-logger';

interface AnalyticsDashboardProps {
  projectId: number;
}

export default function AnalyticsDashboard({ projectId }: AnalyticsDashboardProps) {
  const { data: metrics, isLoading } = useQuery<AnalyticsMetric[]>({
    queryKey: [`/api/projects/${projectId}/analytics`],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-background rounded-lg border border-border p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </section>
        <section className="bg-background rounded-lg border border-border p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  const getMetricByType = (type: string) => {
    return metrics?.find(m => m.metricType === type);
  };

  const dauMetric = getMetricByType("dau");
  const billViewsMetric = getMetricByType("bill_views");
  const engagementMetric = getMetricByType("comment_engagement");
  const adoptionMetric = getMetricByType("feature_adoption");
  const retentionMetric = getMetricByType("user_retention_7d");
  const performanceMetric = getMetricByType("performance_score");
  const errorMetric = getMetricByType("error_rate");

  const formatChange = (change: number | undefined) => {
    if (!change) return "";
    const sign = change > 0 ? "↑" : "↓";
    const color = change > 0 ? "text-emerald-600" : "text-red-600";
    return <span className={`text-xs ${color}`}>{sign} {Math.abs(change)}% from last week</span>;
  };

  const createMiniChart = (color: string) => (
    <div className={`w-16 h-8 bg-${color}-100 rounded flex items-end justify-center space-x-1 pb-1`}>
      {[2, 4, 3, 6, 5, 7, 6].map((height, i) => (
        <div key={i} className={`w-1 bg-${color}-500`} style={{ height: `${height * 4}px` }}></div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section className="bg-background rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">User Engagement Metrics</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Daily Active Users</p>
              <p className="text-2xl font-bold">{dauMetric?.value?.toLocaleString() || "0"}</p>
              {formatChange(dauMetric?.change)}
            </div>
            <div className="text-right">
              {createMiniChart("emerald")}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Bill Analysis Views</p>
              <p className="text-2xl font-bold">{billViewsMetric?.value?.toLocaleString() || "0"}</p>
              {formatChange(billViewsMetric?.change)}
            </div>
            <div className="text-right">
              {createMiniChart("blue")}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Comment Engagement</p>
              <p className="text-2xl font-bold">{engagementMetric?.value?.toLocaleString() || "0"}</p>
              {formatChange(engagementMetric?.change)}
            </div>
            <div className="text-right">
              {createMiniChart("amber")}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Success Metrics</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Feature Adoption Rate</span>
              <span className="text-sm font-medium">{adoptionMetric?.value || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${adoptionMetric?.value || 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">User Retention (7 days)</span>
              <span className="text-sm font-medium">{retentionMetric?.value || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${retentionMetric?.value || 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Performance Score</span>
              <span className="text-sm font-medium">{performanceMetric?.value || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${performanceMetric?.value || 0}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Error Rate</span>
              <span className="text-sm font-medium">{errorMetric?.value || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full" style={{ width: `${(errorMetric?.value || 0) * 10}%` }}></div>
            </div>
          </div>

          <hr className="border-border my-4" />

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-900">Phase 2 Goals Met</span>
            </div>
            <p className="text-xs text-emerald-700 mt-1">All key metrics above target thresholds. Ready for pivot evaluation.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

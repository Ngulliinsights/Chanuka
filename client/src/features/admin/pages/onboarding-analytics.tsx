import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface OnboardingMetrics {
  totalStarts: number;
  totalCompletions: number;
  completionRate: number;
  averageCompletionTime: number;
  skipRate: number;
  personaDistribution: Record<string, number>;
  stepDropoff: Array<{ step: number; retention: number; stepName: string }>;
  dailyStats: Array<{ date: string; starts: number; completions: number }>;
}

/**
 * Onboarding Analytics Dashboard
 * 
 * Displays comprehensive metrics about the onboarding experience:
 * - Completion rates
 * - Time to complete
 * - Step-by-step dropoff
 * - Persona distribution
 * - Daily trends
 * 
 * Helps identify friction points and optimize the onboarding flow.
 */
export function OnboardingAnalytics() {
  const [metrics, setMetrics] = useState<OnboardingMetrics>({
    totalStarts: 0,
    totalCompletions: 0,
    completionRate: 0,
    averageCompletionTime: 0,
    skipRate: 0,
    personaDistribution: {},
    stepDropoff: [],
    dailyStats: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch onboarding metrics
    // In production, this would call an API endpoint
    const fetchMetrics = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock data for demonstration
        setMetrics({
          totalStarts: 1250,
          totalCompletions: 1000,
          completionRate: 80,
          averageCompletionTime: 180,
          skipRate: 15,
          personaDistribution: {
            'Concerned Citizen': 45,
            'Policy Analyst': 25,
            'Activist': 20,
            'Journalist': 10,
          },
          stepDropoff: [
            { step: 1, retention: 100, stepName: 'Welcome' },
            { step: 2, retention: 95, stepName: 'Persona Selection' },
            { step: 3, retention: 85, stepName: 'Interests' },
            { step: 4, retention: 80, stepName: 'Completion' },
          ],
          dailyStats: [
            { date: '2026-03-01', starts: 150, completions: 120 },
            { date: '2026-03-02', starts: 180, completions: 145 },
            { date: '2026-03-03', starts: 165, completions: 130 },
            { date: '2026-03-04', starts: 190, completions: 155 },
            { date: '2026-03-05', starts: 175, completions: 140 },
            { date: '2026-03-06', starts: 200, completions: 165 },
          ],
        });
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch onboarding metrics:', error);
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return <div className="p-6">Loading metrics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Onboarding Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Starts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStarts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCompletions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{metrics.completionRate}%</div>
              {metrics.completionRate >= 75 ? (
                <TrendingUp className="text-green-500" size={20} />
              ) : (
                <TrendingDown className="text-red-500" size={20} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg. Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(metrics.averageCompletionTime / 60)}m</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Persona Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(metrics.personaDistribution).map(([persona, count]) => (
              <div key={persona} className="flex items-center justify-between">
                <span>{persona}</span>
                <Badge variant="secondary">{count}%</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step-by-Step Retention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {metrics.stepDropoff.map((step) => (
              <div key={step.step} className="flex items-center justify-between">
                <span>Step {step.step}: {step.stepName}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${step.retention}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{step.retention}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

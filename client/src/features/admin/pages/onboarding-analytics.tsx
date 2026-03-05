import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { TrendingUp, TrendingDown, Users, Clock, CheckCircle, X } from 'lucide-react';

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
     
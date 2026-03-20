import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Alert, AlertDescription } from '@client/lib/design-system';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  status: 'good' | 'warning' | 'poor';
}

interface WebVitalsData {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  inp: number | null;
}

/**
 * Performance Dashboard Component
 * 
 * Displays real-time performance metrics including Web Vitals,
 * bundle size, and custom performance indicators.
 * 
 * Thresholds based on Google's Core Web Vitals:
 * - LCP: Good < 2500ms, Poor > 4000ms
 * - FID: Good < 100ms, Poor > 300ms
 * - CLS: Good < 0.1, Poor > 0.25
 * - FCP: Good < 1800ms, Poor > 3000ms
 * - TTFB: Good < 800ms, Poor > 1800ms
 * - INP: Good < 200ms, Poor > 500ms
 */
export function PerformanceDashboard() {
  const [webVitals, setWebVitals] = useState<WebVitalsData>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    inp: null,
  });

  const [customMetrics, setCustomMetrics] = useState<PerformanceMetric[]>([]);

  useEffect(() => {
    // Collect Web Vitals using the web-vitals library
    const collectWebVitals = async () => {
      try {
        const { onLCP, onFID, onCLS, onFCP, onTTFB, onINP } = await import('web-vitals');

        onLCP((metric) => {
          setWebVitals((prev) => ({ ...prev, lcp: metric.value }));
        });

        onFID((metric) => {
          setWebVitals((prev) => ({ ...prev, fid: metric.value }));
        });

        onCLS((metric) => {
          setWebVitals((prev) => ({ ...prev, cls: metric.value }));
        });

        onFCP((metric) => {
          setWebVitals((prev) => ({ ...prev, fcp: metric.value }));
        });

        onTTFB((metric) => {
          setWebVitals((prev) => ({ ...prev, ttfb: metric.value }));
        });

        onINP((metric) => {
          setWebVitals((prev) => ({ ...prev, inp: metric.value }));
        });
      } catch (error) {
        console.error('Failed to load web-vitals:', error);
      }
    };

    collectWebVitals();

    // Collect custom metrics
    const collectCustomMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const metrics: PerformanceMetric[] = [
          {
            name: 'DOM Content Loaded',
            value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            unit: 'ms',
            threshold: 1500,
            status: 'good',
          },
          {
            name: 'Load Complete',
            value: navigation.loadEventEnd - navigation.loadEventStart,
            unit: 'ms',
            threshold: 3000,
            status: 'good',
          },
          {
            name: 'DNS Lookup',
            value: navigation.domainLookupEnd - navigation.domainLookupStart,
            unit: 'ms',
            threshold: 100,
            status: 'good',
          },
          {
            name: 'TCP Connection',
            value: navigation.connectEnd - navigation.connectStart,
            unit: 'ms',
            threshold: 200,
            status: 'good',
          },
        ];

        // Calculate status based on thresholds
        metrics.forEach((metric) => {
          if (metric.value < metric.threshold) {
            metric.status = 'good';
          } else if (metric.value < metric.threshold * 1.5) {
            metric.status = 'warning';
          } else {
            metric.status = 'poor';
          }
        });

        setCustomMetrics(metrics);
      }
    };

    // Wait for page load to collect metrics
    if (document.readyState === 'complete') {
      collectCustomMetrics();
    } else {
      window.addEventListener('load', collectCustomMetrics);
      return () => window.removeEventListener('load', collectCustomMetrics);
    }
  }, []);

  const getMetricStatus = (
    value: number | null,
    goodThreshold: number,
    poorThreshold: number
  ): 'good' | 'warning' | 'poor' | 'unknown' => {
    if (value === null) return 'unknown';
    if (value <= goodThreshold) return 'good';
    if (value <= poorThreshold) return 'warning';
    return 'poor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'poor':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      case 'poor':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const webVitalsMetrics = [
    {
      name: 'LCP (Largest Contentful Paint)',
      value: webVitals.lcp,
      unit: 'ms',
      goodThreshold: 2500,
      poorThreshold: 4000,
      description: 'Loading performance',
    },
    {
      name: 'FID (First Input Delay)',
      value: webVitals.fid,
      unit: 'ms',
      goodThreshold: 100,
      poorThreshold: 300,
      description: 'Interactivity',
    },
    {
      name: 'CLS (Cumulative Layout Shift)',
      value: webVitals.cls,
      unit: '',
      goodThreshold: 0.1,
      poorThreshold: 0.25,
      description: 'Visual stability',
    },
    {
      name: 'FCP (First Contentful Paint)',
      value: webVitals.fcp,
      unit: 'ms',
      goodThreshold: 1800,
      poorThreshold: 3000,
      description: 'Perceived load speed',
    },
    {
      name: 'TTFB (Time to First Byte)',
      value: webVitals.ttfb,
      unit: 'ms',
      goodThreshold: 800,
      poorThreshold: 1800,
      description: 'Server response time',
    },
    {
      name: 'INP (Interaction to Next Paint)',
      value: webVitals.inp,
      unit: 'ms',
      goodThreshold: 200,
      poorThreshold: 500,
      description: 'Responsiveness',
    },
  ];

  const overallScore = webVitalsMetrics.reduce((score, metric) => {
    const status = getMetricStatus(metric.value, metric.goodThreshold, metric.poorThreshold);
    if (status === 'good') return score + 1;
    if (status === 'warning') return score + 0.5;
    return score;
  }, 0);

  const maxScore = webVitalsMetrics.length;
  const scorePercentage = Math.round((overallScore / maxScore) * 100);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Performance Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time performance metrics and Web Vitals monitoring
        </p>
      </div>

      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Performance Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold">{scorePercentage}%</div>
              <p className="text-sm text-muted-foreground mt-1">
                {overallScore.toFixed(1)} / {maxScore} metrics passing
              </p>
            </div>
            <Badge
              variant={scorePercentage >= 80 ? 'default' : scorePercentage >= 50 ? 'secondary' : 'destructive'}
              className="text-lg px-4 py-2"
            >
              {scorePercentage >= 80 ? 'Good' : scorePercentage >= 50 ? 'Needs Improvement' : 'Poor'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Web Vitals */}
      <Card>
        <CardHeader>
          <CardTitle>Core Web Vitals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {webVitalsMetrics.map((metric) => {
              const status = getMetricStatus(metric.value, metric.goodThreshold, metric.poorThreshold);
              return (
                <div
                  key={metric.name}
                  className={`p-4 rounded-lg border ${getStatusColor(status)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{metric.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {metric.description}
                      </div>
                    </div>
                    {getStatusIcon(status)}
                  </div>
                  <div className="text-2xl font-bold mt-2">
                    {metric.value !== null
                      ? `${metric.value.toFixed(metric.unit === '' ? 3 : 0)}${metric.unit}`
                      : 'Measuring...'}
                  </div>
                  <div className="text-xs mt-1">
                    Target: &lt; {metric.goodThreshold}
                    {metric.unit}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Metrics */}
      {customMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customMetrics.map((metric) => (
                <div
                  key={metric.name}
                  className={`p-4 rounded-lg border ${getStatusColor(metric.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{metric.name}</div>
                      <div className="text-2xl font-bold mt-1">
                        {metric.value.toFixed(0)}
                        {metric.unit}
                      </div>
                    </div>
                    {getStatusIcon(metric.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Tips */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Performance Tips:</strong> Metrics are collected in real-time. For accurate
          measurements, test on a production build with realistic network conditions. Use Chrome
          DevTools Lighthouse for comprehensive audits.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default PerformanceDashboard;

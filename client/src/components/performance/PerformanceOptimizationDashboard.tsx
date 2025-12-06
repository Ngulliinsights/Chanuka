/**
 * Performance Optimization Dashboard
 * Comprehensive performance monitoring and optimization control panel
 */

import { 
  Activity, 
  Zap, 
  Database, 
  Wifi, 
  Image, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Settings,
  Download,
  RefreshCw
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { assetOptimizer, type AssetMetrics } from '@client/utils/assets';
import { bundleAnalyzer, type BundleMetrics, type OptimizationRecommendation } from '@client/utils/bundle-analyzer';
import { logger } from '@client/utils/logger';
import { webVitalsMonitor, type WebVitalsMetric, type WebVitalsReport } from '@client/utils/performance';
import { realtimeOptimizer, type ConnectionMetrics } from '@client/utils/realtime-optimizer';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';


interface PerformanceOptimizationDashboardProps {
  className?: string;
}

export const PerformanceOptimizationDashboard: React.FC<PerformanceOptimizationDashboardProps> = ({
  className = ''
}) => {
  // State for different performance metrics
  const [bundleMetrics, setBundleMetrics] = useState<BundleMetrics | null>(null);
  const [assetMetrics, setAssetMetrics] = useState<AssetMetrics | null>(null);
  const [webVitalsMetrics, setWebVitalsMetrics] = useState<Map<string, WebVitalsMetric>>(new Map());
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  /**
   * Load all performance metrics
   */
  const loadMetrics = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      // Load bundle metrics
      const bundleData = await bundleAnalyzer.analyzeBundles();
      setBundleMetrics(bundleData);

      // Load asset metrics
      const assetData = assetOptimizer.getMetrics();
      setAssetMetrics(assetData);

      // Load Web Vitals metrics
      const vitalsData = webVitalsMonitor.getMetrics();
      setWebVitalsMetrics(vitalsData);

      // Load connection metrics
      const connectionData = realtimeOptimizer.getMetrics();
      setConnectionMetrics(connectionData);

      // Generate recommendations
      const bundleRecommendations = bundleAnalyzer.generateRecommendations();
      setRecommendations(bundleRecommendations);

      setLastUpdate(new Date());
      
      logger.info('Performance metrics loaded successfully', { component: 'PerformanceOptimizationDashboard' });
    } catch (error) {
      logger.error('Failed to load performance metrics', { component: 'PerformanceOptimizationDashboard' }, error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  /**
   * Initialize monitoring and load initial data
   */
  useEffect(() => {
    // Start monitoring services
    webVitalsMonitor.startMonitoring();
    bundleAnalyzer.monitorChunkLoading();
    
    // Load initial metrics
    loadMetrics();

    // Set up periodic updates
    const interval = setInterval(loadMetrics, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, [loadMetrics]);

  /**
   * Get performance score based on Web Vitals
   */
  const getPerformanceScore = (): number => {
    const metrics = Array.from(webVitalsMetrics.values());
    if (metrics.length === 0) return 0;

    const scores = metrics.map(metric => {
      switch (metric.rating) {
        case 'good': return 100;
        case 'needs-improvement': return 60;
        case 'poor': return 20;
        default: return 0;
      }
    });

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };

  /**
   * Get bundle efficiency score
   */
  const getBundleEfficiencyScore = (): number => {
    if (!bundleMetrics) return 0;

    let score = 100;
    
    // Penalize large bundle size
    if (bundleMetrics.totalSize > 2 * 1024 * 1024) score -= 30; // 2MB
    if (bundleMetrics.totalSize > 5 * 1024 * 1024) score -= 50; // 5MB

    // Penalize poor compression
    const compressionRatio = bundleMetrics.gzippedSize / bundleMetrics.totalSize;
    if (compressionRatio > 0.8) score -= 20;

    // Penalize too few chunks (missing optimization)
    if (bundleMetrics.chunkCount < 3) score -= 15;

    return Math.max(0, score);
  };

  /**
   * Format bytes to human readable format
   */
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  /**
   * Get rating color for metrics
   */
  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  /**
   * Export performance report
   */
  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      bundleMetrics,
      assetMetrics,
      webVitalsMetrics: Array.from(webVitalsMetrics.entries()),
      connectionMetrics,
      recommendations,
      performanceScore: getPerformanceScore(),
      bundleEfficiencyScore: getBundleEfficiencyScore()
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const performanceScore = getPerformanceScore();
  const bundleEfficiencyScore = getBundleEfficiencyScore();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Optimization</h2>
          <p className="text-muted-foreground">
            Monitor and optimize application performance in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMetrics}
            disabled={isAnalyzing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceScore}</div>
            <Progress value={performanceScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Based on Core Web Vitals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bundle Efficiency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bundleEfficiencyScore}</div>
            <Progress value={bundleEfficiencyScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {bundleMetrics ? formatBytes(bundleMetrics.totalSize) : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets Optimized</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assetMetrics ? assetMetrics.optimizedAssets : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {assetMetrics ? `${assetMetrics.totalAssets} total assets` : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Health</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connectionMetrics ? Math.round(connectionMetrics.averageLatency) : 0}ms
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average latency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Tabs */}
      <Tabs defaultValue="web-vitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
          <TabsTrigger value="bundle-analysis">Bundle Analysis</TabsTrigger>
          <TabsTrigger value="asset-optimization">Asset Optimization</TabsTrigger>
          <TabsTrigger value="realtime-performance">Real-time Performance</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Web Vitals Tab */}
        <TabsContent value="web-vitals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>
                Key performance metrics that measure user experience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from(webVitalsMetrics.entries()).map(([name, metric]) => (
                  <div key={name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{name}</h4>
                      <Badge variant={metric.rating === 'good' ? 'default' : 'destructive'}>
                        {metric.rating}
                      </Badge>
                    </div>
                    <div className={`text-2xl font-bold ${getRatingColor(metric.rating)}`}>
                      {name === 'CLS' ? metric.value.toFixed(3) : Math.round(metric.value)}
                      {name !== 'CLS' && 'ms'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(metric.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bundle Analysis Tab */}
        <TabsContent value="bundle-analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bundle Analysis</CardTitle>
              <CardDescription>
                JavaScript bundle composition and optimization opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bundleMetrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatBytes(bundleMetrics.totalSize)}</div>
                      <p className="text-sm text-muted-foreground">Total Size</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatBytes(bundleMetrics.gzippedSize)}</div>
                      <p className="text-sm text-muted-foreground">Gzipped Size</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{bundleMetrics.chunkCount}</div>
                      <p className="text-sm text-muted-foreground">Chunks</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatBytes(bundleMetrics.largestChunk.size)}</div>
                      <p className="text-sm text-muted-foreground">Largest Chunk</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Critical Path</h4>
                    <div className="flex flex-wrap gap-2">
                      {bundleMetrics.criticalPath.map((chunk, index) => (
                        <Badge key={index} variant="outline">
                          {chunk}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading bundle analysis...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Asset Optimization Tab */}
        <TabsContent value="asset-optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Optimization</CardTitle>
              <CardDescription>
                Image and asset loading performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetMetrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{assetMetrics.totalAssets}</div>
                      <p className="text-sm text-muted-foreground">Total Assets</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{assetMetrics.optimizedAssets}</div>
                      <p className="text-sm text-muted-foreground">Optimized</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{assetMetrics.lazyLoadedAssets}</div>
                      <p className="text-sm text-muted-foreground">Lazy Loaded</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{Math.round(assetMetrics.averageLoadTime)}ms</div>
                      <p className="text-sm text-muted-foreground">Avg Load Time</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Optimization Rate</h4>
                    <Progress 
                      value={(assetMetrics.optimizedAssets / assetMetrics.totalAssets) * 100} 
                      className="w-full"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {Math.round((assetMetrics.optimizedAssets / assetMetrics.totalAssets) * 100)}% of assets optimized
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Image className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading asset metrics...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Real-time Performance Tab */}
        <TabsContent value="realtime-performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Performance</CardTitle>
              <CardDescription>
                WebSocket connection and real-time update optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectionMetrics ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{connectionMetrics.messagesReceived}</div>
                      <p className="text-sm text-muted-foreground">Messages Received</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{connectionMetrics.messagesSent}</div>
                      <p className="text-sm text-muted-foreground">Messages Sent</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatBytes(connectionMetrics.bytesReceived)}</div>
                      <p className="text-sm text-muted-foreground">Data Received</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{Math.round(connectionMetrics.connectionUptime / 1000)}s</div>
                      <p className="text-sm text-muted-foreground">Uptime</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wifi className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading connection metrics...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Recommendations</CardTitle>
              <CardDescription>
                Actionable suggestions to improve performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {rec.priority === 'high' ? (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          ) : rec.priority === 'medium' ? (
                            <TrendingUp className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{rec.description}</h4>
                            <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                              {rec.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{rec.impact}</p>
                          <p className="text-sm">{rec.implementation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">No optimization recommendations at this time</p>
                  <p className="text-sm text-muted-foreground">Your application is performing well!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {lastUpdate.toLocaleString()}
      </div>
    </div>
  );
};
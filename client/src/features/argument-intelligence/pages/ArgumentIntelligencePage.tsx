/**
 * Argument Intelligence Page
 * 
 * Main page for viewing argument intelligence analysis for a bill
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Brain, TrendingUp, Users, Target } from 'lucide-react';
import { ArgumentClusterDisplay } from '../ui/ArgumentClusterDisplay';
import { SentimentHeatmap } from '../ui/SentimentHeatmap';
import { useArgumentIntelligence } from '../hooks/useArgumentIntelligence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { LoadingStateManager } from '@client/lib/ui/loading/LoadingStates';
import { analyticsService } from '@client/infrastructure/analytics/service';

/**
 * Argument Intelligence Page Component
 */
export function ArgumentIntelligencePage() {
  const { billId } = useParams<{ billId: string }>();
  const [selectedTab, setSelectedTab] = useState('clusters');
  
  const {
    clusters,
    sentimentData,
    statistics,
    isLoading,
    error,
  } = useArgumentIntelligence(billId || '');

  // Track page view on mount
  useEffect(() => {
    analyticsService.trackPageView({
      path: `/bills/${billId}/arguments`,
      title: 'Argument Intelligence',
    });
  }, [billId]);

  // Track tab changes
  const handleTabChange = (tab: string) => {
    setSelectedTab(tab);
    analyticsService.trackUserAction({
      action: 'tab_change',
      category: 'argument_intelligence',
      label: tab,
    });
  };

  if (!billId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Bill ID is required</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Argument Intelligence - Chanuka</title>
        <meta 
          name="description" 
          content="Analyze and visualize arguments using AI-powered clustering, sentiment analysis, and quality metrics." 
        />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold text-gray-900">Argument Intelligence</h1>
            </div>
            <p className="text-gray-600">
              AI-powered analysis of arguments, sentiment, and discussion quality.
            </p>
          </div>

          {/* Stats Cards */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Arguments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{statistics.totalArguments}</span>
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Clusters Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{clusters?.length || 0}</span>
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {statistics.averageQuality ? (statistics.averageQuality * 100).toFixed(0) : 0}%
                    </span>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Sentiment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {sentimentData?.overall ? sentimentData.overall.toFixed(2) : '0.00'}
                    </span>
                    <Brain className="h-5 w-5 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content */}
          <Tabs value={selectedTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="clusters">Argument Clusters</TabsTrigger>
              <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
              <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="clusters">
              {isLoading ? (
                <LoadingStateManager type="content" state="loading" message="Loading clusters..." />
              ) : error ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-red-600">
                      <p>Failed to load argument clusters. Please try again later.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : clusters && clusters.length > 0 ? (
                <ArgumentClusterDisplay
                  clusters={clusters}
                  onClusterClick={(cluster) => {
                    analyticsService.trackUserAction({
                      action: 'cluster_click',
                      category: 'argument_intelligence',
                      label: cluster.id,
                    });
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-gray-500">
                      <Brain className="h-12 w-12 mx-auto mb-2" />
                      <p>No argument clusters found. Add more comments to see clusters.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sentiment">
              {isLoading ? (
                <LoadingStateManager type="content" state="loading" message="Loading sentiment data..." />
              ) : error ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-red-600">
                      <p>Failed to load sentiment data. Please try again later.</p>
                    </div>
                  </CardContent>
                </Card>
              ) : sentimentData ? (
                <SentimentHeatmap sentimentData={sentimentData} />
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center text-gray-500">
                      <Brain className="h-12 w-12 mx-auto mb-2" />
                      <p>No sentiment data available.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="quality">
              <Card>
                <CardHeader>
                  <CardTitle>Quality Metrics</CardTitle>
                  <CardDescription>
                    Analysis of argument quality across different dimensions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <LoadingStateManager type="content" state="loading" message="Loading quality metrics..." />
                  ) : statistics ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Clarity</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${(statistics.averageClarity || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-12 text-right">
                            {((statistics.averageClarity || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Evidence</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${(statistics.averageEvidence || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-12 text-right">
                            {((statistics.averageEvidence || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Reasoning</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500"
                              style={{ width: `${(statistics.averageReasoning || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-12 text-right">
                            {((statistics.averageReasoning || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Overall Quality</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500"
                              style={{ width: `${(statistics.averageQuality || 0) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-12 text-right">
                            {((statistics.averageQuality || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <p>No quality metrics available.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

export default ArgumentIntelligencePage;

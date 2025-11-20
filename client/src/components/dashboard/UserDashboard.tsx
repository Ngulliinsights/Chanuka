/**
 * Personalized User Dashboard Component
 * 
 * Main dashboard component that displays tracked bills, engagement history,
 * civic impact metrics, and ML-powered recommendations with privacy controls.
 */

import React, { useEffect, useState } from 'react';
import { useUserDashboardSelectors, useUserDashboardStore } from '@client/store/slices/userDashboardSlice';
import { useAuthStore } from '@client/store/slices/authSlice';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Settings,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { TrackedBillsSection } from './sections/TrackedBillsSection';
import { EngagementHistorySection } from './sections/EngagementHistorySection';
import { CivicMetricsSection } from './sections/CivicMetricsSection';
import { RecommendationsSection } from './sections/RecommendationsSection';
import { PrivacyControlsModal } from './modals/PrivacyControlsModal';
import { DataExportModal } from './modals/DataExportModal';
import { DashboardPreferencesModal } from './modals/DashboardPreferencesModal';
import { TimeFilterSelector } from './components/TimeFilterSelector';
import { DashboardStats } from './components/DashboardStats';
import { WelcomeMessage } from './components/WelcomeMessage';
import { logger } from '@client/utils/logger';

interface UserDashboardProps {
  className?: string;
}

export function UserDashboard({ className = '' }: UserDashboardProps) {
  const { user } = useAuthStore();
  const {
    dashboardData,
    loading,
    error,
    preferences,
    privacyControls,
    timeFilter,
    hasData,
    isDataStale,
    filteredEngagementHistory,
    engagementStats,
    refreshDashboard,
    setTimeFilter,
    setError
  } = useUserDashboardSelectors();

  const dashboardStore = useUserDashboardStore();

  // Modal states
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Load dashboard data on mount
  useEffect(() => {
    if (user && !hasData) {
      loadDashboardData();
    }
  }, [user, hasData]);

  // Auto-refresh based on preferences
  useEffect(() => {
    if (!preferences.refreshInterval || preferences.refreshInterval <= 0) return;

    const interval = setInterval(() => {
      if (isDataStale) {
        refreshDashboard();
      }
    }, preferences.refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [preferences.refreshInterval, isDataStale, refreshDashboard]);

  const loadDashboardData = async () => {
    try {
      // In a real implementation, this would fetch from API
      // For now, we'll use mock data
      const mockData = await generateMockDashboardData();
      dashboardStore.setDashboardData(mockData);
    } catch (error) {
      logger.error('Failed to load dashboard data', { error });
      setError(error instanceof Error ? error.message : 'Failed to load dashboard');
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshDashboard();
    } catch (error) {
      logger.error('Failed to refresh dashboard', { error });
    }
  };

  // Don't render if user is not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Please sign in</h2>
          <p className="text-muted-foreground">
            You need to be signed in to view your personalized dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && !hasData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !hasData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-8 w-8 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Failed to load dashboard</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const visibleSections = preferences.pinnedSections.filter(
    section => !preferences.hiddenSections.includes(section)
  );

  return (
    <div className={`chanuka-container space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your Civic Dashboard</h1>
          <p className="text-muted-foreground">
            Track legislation, measure your impact, and stay engaged
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <TimeFilterSelector
            value={timeFilter}
            onChange={setTimeFilter}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreferencesModal(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Welcome Message */}
      {preferences.showWelcomeMessage && (
        <WelcomeMessage
          user={user}
          stats={dashboardData?.stats}
          onDismiss={() =>
            dashboardStore.updatePreferences({ showWelcomeMessage: false })
          }
        />
      )}

      {/* Dashboard Stats */}
      <DashboardStats
        stats={dashboardData?.stats}
        engagementStats={engagementStats}
        civicMetrics={dashboardData?.civicMetrics}
        loading={loading}
      />

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bills">Tracked Bills</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Tracked Bills Summary */}
            {visibleSections.includes('tracked-bills') && (
              <TrackedBillsSection
                bills={dashboardData?.trackedBills?.slice(0, 5) || []}
                loading={loading}
                compact={true}
              />
            )}

            {/* Recent Recommendations */}
            {visibleSections.includes('recommendations') && privacyControls.showRecommendations && (
              <RecommendationsSection
                recommendations={dashboardData?.recommendations?.slice(0, 3) || []}
                loading={loading}
                compact={true}
              />
            )}

            {/* Civic Metrics Summary */}
            {visibleSections.includes('civic-metrics') && privacyControls.showMetrics && (
              <CivicMetricsSection
                metrics={dashboardData?.civicMetrics}
                loading={loading}
                compact={true}
              />
            )}

            {/* Recent Activity */}
            {visibleSections.includes('recent-activity') && privacyControls.showActivity && (
              <EngagementHistorySection
                history={filteredEngagementHistory.slice(0, 5)}
                loading={loading}
                compact={true}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="bills">
          <TrackedBillsSection
            bills={dashboardData?.trackedBills || []}
            loading={loading}
            compact={false}
          />
        </TabsContent>

        <TabsContent value="activity">
          <EngagementHistorySection
            history={filteredEngagementHistory}
            loading={loading}
            compact={false}
          />
        </TabsContent>

        <TabsContent value="impact">
          <CivicMetricsSection
            metrics={dashboardData?.civicMetrics}
            loading={loading}
            compact={false}
          />
        </TabsContent>
      </Tabs>

      {/* Privacy and Export Actions */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
        <div className="flex-1">
          <h3 className="font-medium mb-2">Privacy & Data</h3>
          <p className="text-sm text-muted-foreground">
            Control your privacy settings and export your data
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrivacyModal(true)}
          >
            {privacyControls.profileVisibility === 'private' ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Privacy
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportModal(true)}
            disabled={!privacyControls.allowDataExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Modals */}
      <PrivacyControlsModal
        open={showPrivacyModal}
        onOpenChange={setShowPrivacyModal}
        controls={privacyControls}
        onUpdate={(controls) =>
          dashboardStore.updatePrivacyControls(controls)
        }
      />

      <DataExportModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        onExport={async (request) => {
          const result = await dashboardStore.requestDataExport(request);
          return result.payload as string;
        }}
      />

      <DashboardPreferencesModal
        open={showPreferencesModal}
        onOpenChange={setShowPreferencesModal}
        preferences={preferences}
        onUpdate={(prefs) =>
          dashboardStore.updatePreferences(prefs)
        }
      />
    </div>
  );
}

// Mock data generator for development
async function generateMockDashboardData() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    trackedBills: [
      {
        id: 1,
        billNumber: 'HB-2024-001',
        title: 'Digital Privacy Protection Act',
        status: 'committee' as const,
        urgencyLevel: 'high' as const,
        lastStatusChange: '2024-01-15T10:30:00Z',
        userEngagement: {
          saved: true,
          commented: true,
          shared: false,
          viewCount: 15,
          lastViewed: '2024-01-20T14:22:00Z'
        },
        notifications: {
          statusChanges: true,
          newComments: true,
          expertAnalysis: true
        }
      },
      {
        id: 2,
        billNumber: 'SB-2024-042',
        title: 'Climate Action Framework',
        status: 'passed' as const,
        urgencyLevel: 'critical' as const,
        lastStatusChange: '2024-01-18T16:45:00Z',
        userEngagement: {
          saved: true,
          commented: false,
          shared: true,
          viewCount: 8,
          lastViewed: '2024-01-19T09:15:00Z'
        },
        notifications: {
          statusChanges: true,
          newComments: false,
          expertAnalysis: true
        }
      }
    ],
    recentActivity: [
      {
        id: '1',
        type: 'comment' as const,
        billId: 1,
        billTitle: 'Digital Privacy Protection Act',
        timestamp: '2024-01-20T14:22:00Z',
        metadata: {
          commentId: 'comment-123'
        }
      },
      {
        id: '2',
        type: 'share' as const,
        billId: 2,
        billTitle: 'Climate Action Framework',
        timestamp: '2024-01-19T11:30:00Z',
        metadata: {
          shareTarget: 'twitter'
        }
      }
    ],
    civicMetrics: {
      personalScore: 78,
      scoreBreakdown: {
        participation: 85,
        quality: 72,
        consistency: 80,
        influence: 75
      },
      achievements: [
        {
          id: 'first-comment',
          title: 'First Comment',
          description: 'Made your first comment on legislation',
          earnedAt: '2024-01-10T00:00:00Z',
          category: 'participation' as const
        }
      ],
      monthlyTrend: [
        { month: '2024-01', score: 78, activities: 12 }
      ],
      comparisons: {
        averageUser: 65,
        percentile: 75
      }
    },
    recommendations: [
      {
        bill: {
          id: 3,
          billNumber: 'HB-2024-055',
          title: 'Education Technology Enhancement Act',
          summary: 'Improves technology infrastructure in schools',
          status: 'introduced',
          urgencyLevel: 'medium',
          policyAreas: ['Education', 'Technology']
        },
        relevanceScore: 0.85,
        reasons: [
          {
            type: 'interest_match' as const,
            description: 'Matches your interest in education policy',
            weight: 0.4
          }
        ],
        confidence: 0.78
      }
    ],
    notifications: [],
    stats: {
      totalBillsTracked: 2,
      totalComments: 5,
      totalShares: 3,
      streakDays: 7,
      joinedDate: '2024-01-01T00:00:00Z'
    }
  };
}
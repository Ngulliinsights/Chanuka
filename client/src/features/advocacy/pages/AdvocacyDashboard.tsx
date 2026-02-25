/**
 * Advocacy Dashboard Page
 * 
 * Main dashboard for advocacy coordination features
 */

import React, { useState } from 'react';
import { Plus, TrendingUp, Users, Target } from 'lucide-react';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/lib/design-system';
import { useCampaigns, useTrendingCampaigns, useUserActions, useUserDashboard, useJoinCampaign } from '../hooks/useAdvocacy';
import { CampaignCard } from '../ui/CampaignCard';
import { ActionCard } from '../ui/ActionCard';
import { useNavigate } from 'react-router-dom';

export function AdvocacyDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Mock user ID - in real app, get from auth context
  const userId = 'current-user-id';

  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns({ status: 'active' });
  const { data: trendingCampaigns } = useTrendingCampaigns(5);
  const { data: userActions } = useUserActions(userId, { status: 'pending' });
  const { data: dashboard } = useUserDashboard(userId);
  const joinCampaignMutation = useJoinCampaign();

  const handleJoinCampaign = (campaignId: string) => {
    joinCampaignMutation.mutate(campaignId);
  };

  const handleViewCampaign = (campaignId: string) => {
    navigate(`/advocacy/campaigns/${campaignId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advocacy Coordination</h1>
          <p className="text-gray-600 mt-1">
            Organize campaigns, coordinate actions, and track impact
          </p>
        </div>
        <Button onClick={() => navigate('/advocacy/campaigns/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Overview */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Active Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.activeCampaigns || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.pendingActions || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Completed Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.completedActions || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.totalImpact || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="actions">My Actions</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Trending Campaigns */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Trending Campaigns</h2>
            </div>
            {trendingCampaigns && trendingCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onView={handleViewCampaign}
                    onJoin={handleJoinCampaign}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No trending campaigns at the moment
                </CardContent>
              </Card>
            )}
          </div>

          {/* Pending Actions */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold">Your Pending Actions</h2>
            </div>
            {userActions && userActions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userActions.slice(0, 4).map((action) => (
                  <ActionCard
                    key={action.id}
                    action={action}
                    onView={(id) => navigate(`/advocacy/actions/${id}`)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No pending actions
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">All Active Campaigns</h2>
            <Button variant="outline" onClick={() => navigate('/advocacy/campaigns')}>
              View All
            </Button>
          </div>
          {campaignsLoading ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Loading campaigns...
              </CardContent>
            </Card>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onView={handleViewCampaign}
                  onJoin={handleJoinCampaign}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No active campaigns found
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">My Actions</h2>
          {userActions && userActions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userActions.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  onView={(id) => navigate(`/advocacy/actions/${id}`)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No actions assigned to you
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Impact Tracking</h2>
          <Card>
            <CardHeader>
              <CardTitle>Your Impact</CardTitle>
              <CardDescription>
                Track the real-world impact of your advocacy efforts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Impact tracking dashboard coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

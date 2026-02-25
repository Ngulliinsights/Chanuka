/**
 * Campaign Card Component
 * 
 * Displays campaign summary in a card format
 */

import React from 'react';
import { Users, Target, TrendingUp, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';
import type { Campaign } from '../hooks/useAdvocacy';

interface CampaignCardProps {
  campaign: Campaign;
  onView?: (campaignId: string) => void;
  onJoin?: (campaignId: string) => void;
}

export function CampaignCard({ campaign, onView, onJoin }: CampaignCardProps) {
  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const daysRemaining = Math.ceil(
    (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{campaign.title}</CardTitle>
            <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
          </div>
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goals */}
        {campaign.goals.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Target className="h-4 w-4" />
              Goals
            </div>
            <ul className="space-y-1">
              {campaign.goals.slice(0, 2).map((goal, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{goal}</span>
                </li>
              ))}
              {campaign.goals.length > 2 && (
                <li className="text-sm text-gray-500 italic">
                  +{campaign.goals.length - 2} more goals
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">{campaign.participantCount}</div>
              <div className="text-xs text-gray-500">Participants</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">{campaign.impactScore}</div>
              <div className="text-xs text-gray-500">Impact Score</div>
            </div>
          </div>
        </div>

        {/* Progress */}
        {campaign.status === 'active' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Campaign Progress</span>
              <span className="text-gray-900 font-medium">
                {daysRemaining > 0 ? `${daysRemaining} days left` : 'Ending soon'}
              </span>
            </div>
            <Progress
              value={Math.max(
                0,
                Math.min(
                  100,
                  ((new Date().getTime() - new Date(campaign.start_date).getTime()) /
                    (new Date(campaign.end_date).getTime() -
                      new Date(campaign.start_date).getTime())) *
                    100
                )
              )}
              className="h-2"
            />
          </div>
        )}

        {/* Timeline */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3 w-3" />
          <span>
            {new Date(campaign.start_date).toLocaleDateString()} -{' '}
            {new Date(campaign.end_date).toLocaleDateString()}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onView?.(campaign.id)}
          >
            View Details
          </Button>
          {campaign.status === 'active' && onJoin && (
            <Button
              className="flex-1"
              onClick={() => onJoin(campaign.id)}
            >
              Join Campaign
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

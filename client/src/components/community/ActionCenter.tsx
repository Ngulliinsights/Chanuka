/**
 * Action Center - Displays ongoing campaigns, petitions, and advocacy efforts
 * 
 * Features:
 * - Active campaigns with progress tracking
 * - Petition signatures with geographic distribution
 * - Join/sign functionality
 * - Progress visualization
 * - Compact and full view modes
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  Megaphone,
  PenTool,
  Users,
  Target,
  Calendar,
  MapPin,
  CheckCircle,
  Clock,
  Share2,
} from 'lucide-react';
import { cn } from '@client/lib/utils';
import { Campaign, Petition } from '@client/types/community';
import { useCommunityStore } from '@client/store/slices/communitySlice';
import { formatDistanceToNow, format } from 'date-fns';

interface ActionCenterProps {
  campaigns: Campaign[];
  petitions: Petition[];
  compact?: boolean;
  className?: string;
}

export function ActionCenter({ 
  campaigns, 
  petitions, 
  compact = false,
  className 
}: ActionCenterProps) {
  const [joinedCampaigns, setJoinedCampaigns] = useState<Set<string>>(new Set());
  const [signedPetitions, setSignedPetitions] = useState<Set<string>>(new Set());
  
  const { joinCampaign, signPetition } = useCommunityStore();

  const getCampaignTypeColor = (type: Campaign['type']) => {
    switch (type) {
      case 'advocacy':
        return 'bg-blue-100 text-blue-800';
      case 'petition':
        return 'bg-purple-100 text-purple-800';
      case 'awareness':
        return 'bg-green-100 text-green-800';
      case 'action':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPetitionStatusColor = (status: Petition['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'successful':
        return 'bg-blue-100 text-blue-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return 'Unknown date';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleJoinCampaign = (campaign: Campaign) => {
    if (!joinedCampaigns.has(campaign.id)) {
      joinCampaign(campaign.id);
      setJoinedCampaigns(prev => new Set(prev).add(campaign.id));
    }
  };

  const handleSignPetition = (petition: Petition) => {
    if (!signedPetitions.has(petition.id)) {
      signPetition(petition.id);
      setSignedPetitions(prev => new Set(prev).add(petition.id));
    }
  };

  const handleShare = (item: Campaign | Petition, type: 'campaign' | 'petition') => {
    // TODO: Implement sharing functionality
    console.log(`Sharing ${type}:`, item.id);
  };

  if (campaigns.length === 0 && petitions.length === 0) {
    return (
      <Card className={cn('chanuka-card', className)}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <Megaphone className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No active campaigns or petitions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Campaigns */}
        {campaigns.slice(0, 2).map((campaign) => {
          const hasJoined = joinedCampaigns.has(campaign.id);
          
          return (
            <div
              key={campaign.id}
              className="p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className={getCampaignTypeColor(campaign.type)}>
                      {campaign.type}
                    </Badge>
                  </div>

                  <h4 className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                    {campaign.title}
                  </h4>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {campaign.summary}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{campaign.participantCount} joined</span>
                    </div>

                    <Button
                      size="sm"
                      variant={hasJoined ? "outline" : "default"}
                      onClick={() => handleJoinCampaign(campaign)}
                      disabled={hasJoined}
                      className="text-xs h-6"
                    >
                      {hasJoined ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Joined
                        </>
                      ) : (
                        'Join'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Petitions */}
        {petitions.slice(0, 2).map((petition) => {
          const hasSigned = signedPetitions.has(petition.id);
          
          return (
            <div
              key={petition.id}
              className="p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                  <PenTool className="h-4 w-4 text-purple-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                    {petition.title}
                  </h4>

                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {petition.summary}
                  </p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>{petition.currentSignatures.toLocaleString()} signatures</span>
                      <span>{petition.progressPercentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={petition.progressPercentage} className="h-1" />
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-muted-foreground">
                      Goal: {petition.goal.toLocaleString()}
                    </div>

                    <Button
                      size="sm"
                      variant={hasSigned ? "outline" : "default"}
                      onClick={() => handleSignPetition(petition)}
                      disabled={hasSigned}
                      className="text-xs h-6"
                    >
                      {hasSigned ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Signed
                        </>
                      ) : (
                        'Sign'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Campaigns Section */}
      {campaigns.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
            Active Campaigns
          </h3>
          
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const hasJoined = joinedCampaigns.has(campaign.id);
              
              return (
                <Card key={campaign.id} className="chanuka-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className={getCampaignTypeColor(campaign.type)}>
                            {campaign.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {campaign.status}
                          </Badge>
                        </div>

                        <CardTitle className="text-xl leading-tight mb-2">
                          {campaign.title}
                        </CardTitle>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {campaign.description}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {campaign.participantCount}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          participants
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Progress */}
                    {campaign.goal && (
                      <div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Progress</span>
                          <span className="font-medium">
                            {campaign.currentCount.toLocaleString()} / {campaign.goal.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={campaign.progressPercentage} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {campaign.progressPercentage.toFixed(1)}% of goal reached
                        </div>
                      </div>
                    )}

                    {/* Organizer */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(campaign.organizerName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{campaign.organizerName}</p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.organizerType} organizer
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Policy Areas */}
                    {campaign.policyAreas.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Policy Areas</h5>
                        <div className="flex flex-wrap gap-2">
                          {campaign.policyAreas.map((area) => (
                            <Badge key={area} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Geographic Targeting */}
                    {campaign.targetGeography && (
                      <div>
                        <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Target Areas
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {campaign.targetGeography.states?.map((state) => (
                            <Badge key={state} variant="secondary" className="text-xs">
                              {state}
                            </Badge>
                          ))}
                          {campaign.targetGeography.districts?.map((district) => (
                            <Badge key={district} variant="secondary" className="text-xs">
                              District {district}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Started {formatDate(campaign.startDate)}</span>
                      </div>
                      {campaign.endDate && (
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          <span>Ends {formatDate(campaign.endDate)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleJoinCampaign(campaign)}
                          disabled={hasJoined}
                          className={cn(hasJoined && 'bg-green-600 hover:bg-green-700')}
                        >
                          {hasJoined ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Joined
                            </>
                          ) : (
                            <>
                              <Users className="h-4 w-4 mr-2" />
                              Join Campaign
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => handleShare(campaign, 'campaign')}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Updated {formatTimeAgo(campaign.updatedAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Petitions Section */}
      {petitions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PenTool className="h-5 w-5 text-purple-600" />
            Active Petitions
          </h3>
          
          <div className="space-y-4">
            {petitions.map((petition) => {
              const hasSigned = signedPetitions.has(petition.id);
              
              return (
                <Card key={petition.id} className="chanuka-card">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className={getPetitionStatusColor(petition.status)}>
                            {petition.status}
                          </Badge>
                          {petition.deadline && (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              Ends {formatDate(petition.deadline)}
                            </Badge>
                          )}
                        </div>

                        <CardTitle className="text-xl leading-tight mb-2">
                          {petition.title}
                        </CardTitle>

                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {petition.description}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {petition.currentSignatures.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          signatures
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span>Progress to Goal</span>
                        <span className="font-medium">
                          {petition.progressPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={petition.progressPercentage} className="h-3" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {(petition.goal - petition.currentSignatures).toLocaleString()} more signatures needed
                      </div>
                    </div>

                    {/* Target */}
                    {petition.targetOfficial && (
                      <div className="p-3 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Petition Target</p>
                            <p className="text-sm text-muted-foreground">
                              {petition.targetOfficial}
                              {petition.targetOffice && ` - ${petition.targetOffice}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Geographic Distribution */}
                    {petition.signaturesByLocation.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Signatures by Location
                        </h5>
                        <div className="space-y-2">
                          {petition.signaturesByLocation.slice(0, 5).map((location) => (
                            <div key={location.state} className="flex items-center justify-between text-sm">
                              <span>{location.state}</span>
                              <div className="flex items-center gap-2">
                                <Progress value={location.percentage} className="w-16 h-2" />
                                <span className="text-xs text-muted-foreground w-12">
                                  {location.count.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Policy Areas */}
                    {petition.policyAreas.length > 0 && (
                      <div>
                        <h5 className="font-medium text-sm mb-2">Policy Areas</h5>
                        <div className="flex flex-wrap gap-2">
                          {petition.policyAreas.map((area) => (
                            <Badge key={area} variant="outline" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Creator */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Created by {petition.creatorName}</span>
                      <span>•</span>
                      <span>{formatTimeAgo(petition.createdAt)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleSignPetition(petition)}
                          disabled={hasSigned || petition.status !== 'active'}
                          className={cn(hasSigned && 'bg-green-600 hover:bg-green-700')}
                        >
                          {hasSigned ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Signed
                            </>
                          ) : (
                            <>
                              <PenTool className="h-4 w-4 mr-2" />
                              Sign Petition
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => handleShare(petition, 'petition')}
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Updated {formatTimeAgo(petition.updatedAt)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
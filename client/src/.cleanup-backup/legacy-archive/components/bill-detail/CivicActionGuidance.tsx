import { 
  Users, 
  Phone, 
  FileText, 
  Calendar, 
  Search, 
  Share2,
  Clock,
  Target,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import React, { useState } from 'react';

import { CivicActionStep, ActionType, DifficultyLevel, ImpactLevel } from '@client/types/constitutional';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';


interface CivicActionGuidanceProps {
  billId: string;
  billTitle: string;
  constitutionalConcerns: string[];
  recommendations: string[];
}

/**
 * CivicActionGuidance - Specific steps for citizen engagement
 * Features: Difficulty levels, impact assessment, resource links, progress tracking
 */
export function CivicActionGuidance({ 
  billId, 
  billTitle, 
  constitutionalConcerns, 
  recommendations 
}: CivicActionGuidanceProps) {
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');

  // Mock civic action steps
  const civicActions: CivicActionStep[] = [
    {
      id: 'action-1',
      title: 'Contact Your Representative',
      description: 'Reach out to your elected representative to express your concerns about the constitutional issues identified in this bill.',
      type: 'contact',
      difficulty: 'easy',
      timeRequired: '10-15 minutes',
      impact: 'high',
      resources: [
        {
          title: 'Find Your Representative',
          url: '#',
          type: 'contact'
        },
        {
          title: 'Email Template',
          url: '#',
          type: 'template'
        }
      ]
    },
    {
      id: 'action-2',
      title: 'Submit Public Comment',
      description: 'Provide formal public comment during the committee review process, focusing on the constitutional concerns you\'ve learned about.',
      type: 'petition',
      difficulty: 'moderate',
      timeRequired: '30-45 minutes',
      impact: 'high',
      resources: [
        {
          title: 'Public Comment Guidelines',
          url: '#',
          type: 'guide'
        },
        {
          title: 'Comment Submission Form',
          url: '#',
          type: 'form'
        }
      ]
    },
    {
      id: 'action-3',
      title: 'Attend Committee Hearing',
      description: 'Attend the upcoming committee hearing to observe the legislative process and show public interest in constitutional compliance.',
      type: 'attend',
      difficulty: 'moderate',
      timeRequired: '2-3 hours',
      impact: 'medium',
      resources: [
        {
          title: 'Committee Schedule',
          url: '#',
          type: 'guide'
        },
        {
          title: 'Hearing Preparation Guide',
          url: '#',
          type: 'guide'
        }
      ]
    },
    {
      id: 'action-4',
      title: 'Research Constitutional Precedents',
      description: 'Deepen your understanding by researching similar cases and constitutional interpretations that relate to this bill.',
      type: 'research',
      difficulty: 'advanced',
      timeRequired: '1-2 hours',
      impact: 'medium',
      resources: [
        {
          title: 'Constitutional Law Database',
          url: '#',
          type: 'guide'
        },
        {
          title: 'Case Law Research Guide',
          url: '#',
          type: 'guide'
        }
      ]
    },
    {
      id: 'action-5',
      title: 'Share Constitutional Analysis',
      description: 'Share the constitutional analysis and expert insights with your community to raise awareness about these important issues.',
      type: 'share',
      difficulty: 'easy',
      timeRequired: '5-10 minutes',
      impact: 'medium',
      resources: [
        {
          title: 'Social Media Templates',
          url: '#',
          type: 'template'
        },
        {
          title: 'Community Discussion Guide',
          url: '#',
          type: 'guide'
        }
      ]
    }
  ];

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case 'contact':
        return <Phone className="h-4 w-4" />;
      case 'petition':
        return <FileText className="h-4 w-4" />;
      case 'attend':
        return <Calendar className="h-4 w-4" />;
      case 'research':
        return <Search className="h-4 w-4" />;
      case 'share':
        return <Share2 className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: DifficultyLevel): string => {
    switch (difficulty) {
      case 'easy':
        return 'hsl(var(--civic-expert))';
      case 'moderate':
        return 'hsl(var(--status-moderate))';
      case 'advanced':
        return 'hsl(var(--status-high))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  const getImpactColor = (impact: ImpactLevel): string => {
    switch (impact) {
      case 'high':
        return 'hsl(var(--civic-constitutional))';
      case 'medium':
        return 'hsl(var(--status-moderate))';
      case 'low':
        return 'hsl(var(--muted-foreground))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  const toggleActionComplete = (actionId: string) => {
    setCompletedActions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  const filteredActions = selectedDifficulty === 'all' 
    ? civicActions 
    : civicActions.filter(action => action.difficulty === selectedDifficulty);

  const completionRate = (completedActions.size / civicActions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header and Progress */}
      <Card className="chanuka-card">
        <CardHeader className="chanuka-card-header">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6" style={{ color: 'hsl(var(--civic-community))' }} />
            <div>
              <CardTitle className="text-xl">Take Civic Action</CardTitle>
              <CardDescription>
                Specific steps to engage with the constitutional concerns in {billTitle}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="chanuka-card-content space-y-4">
          {/* Progress Tracking */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Your Civic Engagement Progress</h4>
              <Badge className="chanuka-status-badge chanuka-status-info">
                {completedActions.size} of {civicActions.length} completed
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${completionRate}%`,
                  backgroundColor: 'hsl(var(--civic-community))'
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {completionRate === 100 
                ? 'Congratulations! You\'ve completed all recommended civic actions.'
                : `${Math.round(completionRate)}% complete - Keep going to maximize your civic impact!`
              }
            </p>
          </div>

          {/* Constitutional Concerns Summary */}
          <div className="space-y-2">
            <h4 className="font-semibold">Key Constitutional Concerns</h4>
            <div className="flex flex-wrap gap-2">
              {constitutionalConcerns.map((concern, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {concern}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Filters */}
      <Card className="chanuka-card">
        <CardContent className="chanuka-card-content pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Filter by difficulty:</span>
            <Button
              variant={selectedDifficulty === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDifficulty('all')}
            >
              All Actions
            </Button>
            <Button
              variant={selectedDifficulty === 'easy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDifficulty('easy')}
            >
              Easy
            </Button>
            <Button
              variant={selectedDifficulty === 'moderate' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDifficulty('moderate')}
            >
              Moderate
            </Button>
            <Button
              variant={selectedDifficulty === 'advanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDifficulty('advanced')}
            >
              Advanced
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Steps */}
      <div className="space-y-4">
        {filteredActions.map((action, index) => {
          const isCompleted = completedActions.has(action.id);
          
          return (
            <Card 
              key={action.id} 
              className={`chanuka-card transition-all duration-200 ${
                isCompleted ? 'opacity-75 bg-muted/50' : ''
              }`}
            >
              <CardHeader className="chanuka-card-header">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isCompleted ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleActionComplete(action.id)}
                        className="p-2"
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-current" />
                        )}
                      </Button>
                      <div style={{ color: 'hsl(var(--civic-community))' }}>
                        {getActionIcon(action.type)}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <CardTitle className={`text-lg ${isCompleted ? 'line-through' : ''}`}>
                        {action.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {action.description}
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 items-end">
                    <Badge 
                      variant="outline"
                      className="text-xs"
                      style={{ 
                        borderColor: getDifficultyColor(action.difficulty),
                        color: getDifficultyColor(action.difficulty)
                      }}
                    >
                      {action.difficulty}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className="text-xs"
                      style={{ 
                        borderColor: getImpactColor(action.impact),
                        color: getImpactColor(action.impact)
                      }}
                    >
                      {action.impact} impact
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="chanuka-card-content space-y-4">
                {/* Action Details */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {action.timeRequired}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {action.impact} impact
                  </span>
                </div>
                
                {/* Resources */}
                {action.resources && action.resources.length > 0 && (
                  <div className="space-y-2">
                    <h6 className="text-sm font-medium">Helpful Resources</h6>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {action.resources.map((resource, resourceIndex) => (
                        <Button
                          key={resourceIndex}
                          variant="outline"
                          size="sm"
                          className="justify-start text-xs"
                          asChild
                        >
                          <a href={resource.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-2" />
                            {resource.title}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recommendations Summary */}
      <Card className="chanuka-card">
        <CardHeader className="chanuka-card-header">
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" style={{ color: 'hsl(var(--civic-constitutional))' }} />
            Expert Recommendations
          </CardTitle>
          <CardDescription>
            Key recommendations from constitutional analysis
          </CardDescription>
        </CardHeader>
        
        <CardContent className="chanuka-card-content">
          <ul className="space-y-2">
            {recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>{recommendation}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
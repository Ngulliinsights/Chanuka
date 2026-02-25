/**
 * Action Card Component
 * 
 * Displays action item in a card format
 */

import React from 'react';
import { Clock, Flag, CheckCircle, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import type { ActionItem } from '../hooks/use-advocacyy';

interface ActionCardProps {
  action: ActionItem;
  onStart?: (actionId: string) => void;
  onComplete?: (actionId: string) => void;
  onView?: (actionId: string) => void;
}

export function ActionCard({ action, onStart, onComplete, onView }: ActionCardProps) {
  const getPriorityColor = (priority: ActionItem['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: ActionItem['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionTypeLabel = (type: ActionItem['actionType']) => {
    const labels: Record<ActionItem['actionType'], string> = {
      contact_representative: 'Contact Representative',
      attend_hearing: 'Attend Hearing',
      submit_comment: 'Submit Comment',
      share_content: 'Share Content',
      organize_meeting: 'Organize Meeting',
      petition_signature: 'Sign Petition',
    };
    return labels[type] || type;
  };

  const isOverdue = action.due_date && new Date(action.due_date) < new Date();

  return (
    <Card className={`hover:shadow-md transition-shadow ${isOverdue && action.status === 'pending' ? 'border-red-300' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getPriorityColor(action.priority)}>
                {action.priority.toUpperCase()}
              </Badge>
              <Badge className={getStatusColor(action.status)}>
                {action.status === 'in_progress' ? 'In Progress' : action.status.charAt(0).toUpperCase() + action.status.slice(1)}
              </Badge>
            </div>
            <CardTitle className="text-lg">{action.title}</CardTitle>
            <CardDescription className="mt-1">
              {getActionTypeLabel(action.actionType)}
            </CardDescription>
          </div>
          {action.status === 'completed' && (
            <CheckCircle className="h-6 w-6 text-green-600" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700">{action.description}</p>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{action.estimatedTimeMinutes} min</span>
          </div>
          {action.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Flag className="h-4 w-4" />
              <span>
                Due {new Date(action.due_date).toLocaleDateString()}
                {isOverdue && ' (Overdue)'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {action.status === 'pending' && onStart && (
            <Button
              className="flex-1"
              onClick={() => onStart(action.id)}
            >
              <Play className="h-4 w-4 mr-2" />
              Start Action
            </Button>
          )}
          {action.status === 'in_progress' && onComplete && (
            <Button
              className="flex-1"
              onClick={() => onComplete(action.id)}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Complete
            </Button>
          )}
          {onView && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onView(action.id)}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

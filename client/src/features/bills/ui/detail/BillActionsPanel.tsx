import {
  Heart,
  Share2,
  Bookmark,
  MessageCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
} from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { Button } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';

/**
 * Bill Actions Panel Props
 */
interface BillActionsPanelProps {
  billId: string;
  title: string;
  status: 'draft' | 'committee' | 'reading' | 'passed' | 'rejected';
  supportCount?: number;
  opposeCount?: number;
  bookmarkCount?: number;
  shareCount?: number;
  commentCount?: number;
  userActions?: {
    hasSupported?: boolean;
    hasOpposed?: boolean;
    hasBookmarked?: boolean;
    hasShared?: boolean;
  };
  onSupport?: () => void;
  onOppose?: () => void;
  onBookmark?: () => void;
  onShare?: () => void;
  onComment?: () => void;
  className?: string;
}

/**
 * Bill Actions Panel Component
 */
export const BillActionsPanel: React.FC<BillActionsPanelProps> = ({
  billId,
  title,
  status,
  supportCount = 0,
  opposeCount = 0,
  bookmarkCount = 0,
  shareCount = 0,
  commentCount = 0,
  userActions = {},
  onSupport,
  onOppose,
  onBookmark,
  onShare,
  onComment,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = useCallback(
    async (action: () => void | undefined) => {
      if (!action || isLoading) return;

      setIsLoading(true);
      try {
        await action();
      } catch (error) {
        console.error('Action failed:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const getStatusIcon = () => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4" />;
      case 'committee':
        return <Users className="h-4 w-4" />;
      case 'reading':
        return <AlertTriangle className="h-4 w-4" />;
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'committee':
        return 'bg-blue-100 text-blue-800';
      case 'reading':
        return 'bg-yellow-100 text-yellow-800';
      case 'passed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <Badge className={`flex items-center space-x-1 ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="capitalize">{status}</span>
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Support Button */}
        <Button
          variant={userActions.hasSupported ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleAction(onSupport)}
          disabled={isLoading}
          className="flex items-center justify-center space-x-2"
        >
          <Heart className={`h-4 w-4 ${userActions.hasSupported ? 'fill-current' : ''}`} />
          <span>Support</span>
          {supportCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {supportCount}
            </Badge>
          )}
        </Button>

        {/* Oppose Button */}
        <Button
          variant={userActions.hasOpposed ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => handleAction(onOppose)}
          disabled={isLoading}
          className="flex items-center justify-center space-x-2"
        >
          <AlertTriangle className={`h-4 w-4 ${userActions.hasOpposed ? 'fill-current' : ''}`} />
          <span>Oppose</span>
          {opposeCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {opposeCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-3">
          {/* Bookmark */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction(onBookmark)}
            disabled={isLoading}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
          >
            <Bookmark
              className={`h-4 w-4 ${userActions.hasBookmarked ? 'fill-current text-blue-600' : ''}`}
            />
            <span className="text-sm">{bookmarkCount}</span>
          </Button>

          {/* Share */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction(onShare)}
            disabled={isLoading}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-sm">{shareCount}</span>
          </Button>

          {/* Comments */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAction(onComment)}
            disabled={isLoading}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">{commentCount}</span>
          </Button>
        </div>
      </div>

      {/* Engagement Summary */}
      {(supportCount > 0 || opposeCount > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Community Engagement</span>
            <span>{supportCount + opposeCount} total responses</span>
          </div>

          {/* Engagement Bar */}
          <div className="mt-2 flex h-2 bg-gray-200 rounded-full overflow-hidden">
            {supportCount > 0 && (
              <div
                className="bg-green-500"
                style={{
                  width: `${(supportCount / (supportCount + opposeCount)) * 100}%`,
                }}
              />
            )}
            {opposeCount > 0 && (
              <div
                className="bg-red-500"
                style={{
                  width: `${(opposeCount / (supportCount + opposeCount)) * 100}%`,
                }}
              />
            )}
          </div>

          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>{supportCount} support</span>
            <span>{opposeCount} oppose</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillActionsPanel;

/**
 * Government Data Card Component
 * Displays government data in a card format with actions and metadata
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Eye, Edit, Trash2, ExternalLink, Calendar, Database, FileText, Clock } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { GovernmentData, GovernmentDataCardProps } from '../types';

export const GovernmentDataCard: React.FC<GovernmentDataCardProps> = ({
  data,
  onView,
  onEdit,
  onDelete,
  showActions = true,
  compact = false,
}) => {
  const handleView = () => onView?.(data);
  const handleEdit = () => onEdit?.(data);
  const handleDelete = () => onDelete?.(data);

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'archived':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType.toLowerCase()) {
      case 'bill':
        return <FileText className="h-4 w-4" />;
      case 'regulation':
        return <Database className="h-4 w-4" />;
      case 'policy':
        return <FileText className="h-4 w-4" />;
      case 'report':
        return <FileText className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const formatContent = (content: any): string => {
    if (typeof content === 'string') {
      return content.length > 150 ? `${content.substring(0, 150)}...` : content;
    }
    if (typeof content === 'object') {
      const text = JSON.stringify(content);
      return text.length > 150 ? `${text.substring(0, 150)}...` : text;
    }
    return 'No content available';
  };

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleView}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {getDataTypeIcon(data.data_type)}
                <h3 className="font-medium text-sm truncate">
                  {data.title || `${data.data_type} - ${data.source}`}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Badge variant="outline" className={`text-xs ${getStatusColor(data.status)}`}>
                  {data.status || 'Unknown'}
                </Badge>
                <span>•</span>
                <span>{data.source}</span>
                <span>•</span>
                <span>{formatDistanceToNow(data.created_at, { addSuffix: true })}</span>
              </div>
            </div>
            {showActions && (
              <div className="flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handleView();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      handleEdit();
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">{getDataTypeIcon(data.data_type)}</div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate">
                {data.title || `${data.data_type} Record`}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={getStatusColor(data.status)}>
                  {data.status || 'Unknown'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {data.data_type}
                </Badge>
              </div>
            </div>
          </div>
          {showActions && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleView}>
                <Eye className="h-4 w-4" />
              </Button>
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={handleEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Content Preview */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{formatContent(data.content)}</p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Database className="h-4 w-4" />
            <span className="font-medium">Source:</span>
            <span>{data.source}</span>
          </div>
          {data.external_id && (
            <div className="flex items-center gap-2 text-gray-600">
              <ExternalLink className="h-4 w-4" />
              <span className="font-medium">External ID:</span>
              <span className="truncate">{data.external_id}</span>
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {data.published_date && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Published:</span>
              <span>{format(data.published_date, 'MMM dd, yyyy')}</span>
            </div>
          )}
          {data.effective_date && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Effective:</span>
              <span>{format(data.effective_date, 'MMM dd, yyyy')}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Created:</span>
            <span>{formatDistanceToNow(data.created_at, { addSuffix: true })}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Updated:</span>
            <span>{formatDistanceToNow(data.updated_at, { addSuffix: true })}</span>
          </div>
        </div>

        {/* Metadata Preview */}
        {data.metadata && Object.keys(data.metadata).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Metadata</span>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(data.metadata, null, 2).substring(0, 200)}
                {JSON.stringify(data.metadata, null, 2).length > 200 && '...'}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

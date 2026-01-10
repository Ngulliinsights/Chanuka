/**
 * Recent Activity Component
 *
 * Shows recent platform activity for anonymous users
 */

import {
  FileText,
  AlertTriangle,
  MessageSquare,
  Clock,
  Eye,
  Activity,
  ChevronRight,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { Badge, Button, Card, CardContent } from '@client/shared/design-system';

const RecentActivity: React.FC = () => {
  const activities = [
    {
      id: 1,
      type: 'bill',
      title: 'New Bill: Climate Action Framework',
      description: 'Comprehensive climate legislation introduced for public review',
      time: '2 hours ago',
      views: '1,247',
      status: 'New',
      statusColor: 'secondary',
      bgColor: 'from-blue-50 to-blue-100',
      iconColor: 'from-blue-500 to-blue-600',
      icon: FileText,
      href: '/bills',
    },
    {
      id: 2,
      type: 'alert',
      title: 'Workaround Alert: Tax Reform Implementation',
      description: 'Potential bypass mechanism detected in regulatory implementation',
      time: '4 hours ago',
      priority: 'High Priority',
      status: 'Alert',
      statusColor: 'destructive',
      bgColor: 'from-orange-50 to-orange-100',
      iconColor: 'from-orange-500 to-orange-600',
      icon: AlertTriangle,
      href: '/search',
    },
    {
      id: 3,
      type: 'discussion',
      title: 'Community Discussion: Healthcare Access Bill',
      description: 'Active debate on proposed healthcare legislation amendments',
      time: '6 hours ago',
      participants: '89',
      status: 'Active',
      statusColor: 'secondary',
      bgColor: 'from-green-50 to-green-100',
      iconColor: 'from-green-500 to-green-600',
      icon: MessageSquare,
      href: '/community',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">Recent Activity</h2>
        <p className="text-xl text-gray-600">
          Stay updated with the latest legislative developments
        </p>
      </div>

      <Card className="border-0 shadow-xl">
        <CardContent className="p-8">
          <div className="space-y-6">
            {activities.map(activity => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className={`flex items-start gap-4 p-6 bg-gradient-to-r ${activity.bgColor} rounded-xl hover:shadow-md transition-all duration-300`}
                >
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${activity.iconColor} rounded-xl flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{activity.title}</h4>
                      <Badge variant={activity.statusColor as any} className="text-xs">
                        {activity.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mb-2">{activity.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.time}
                      </span>
                      {activity.views && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {activity.views} views
                        </span>
                      )}
                      {activity.priority && (
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {activity.priority}
                        </span>
                      )}
                      {activity.participants && (
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {activity.participants} participants
                        </span>
                      )}
                    </div>
                  </div>
                  <Link to={activity.href}>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Link to="/community">
              <Button variant="outline" size="lg">
                View All Activity
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RecentActivity;

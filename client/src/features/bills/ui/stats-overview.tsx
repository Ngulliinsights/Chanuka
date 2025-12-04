/**
 * Stats Overview Component
 * 
 * Displays key statistics about bills and platform engagement
 */

import { FileText, AlertTriangle, Shield, TrendingUp, Clock } from 'lucide-react';
import React from 'react';

import { ClientSharedAdapter } from '@client/adapters/shared-module-adapter';
import { Card, CardContent } from '@client/components/ui/card';

interface StatsOverviewProps {
  stats: {
    totalBills: number;
    urgentCount: number;
    constitutionalFlags: number;
    trendingCount: number;
    lastUpdated: string;
  };
  className?: string;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, className }) => {
  const statItems = [
    {
      label: 'Total Bills',
      value: ClientSharedAdapter.formatting.number(stats.totalBills),
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Urgent Bills',
      value: ClientSharedAdapter.formatting.number(stats.urgentCount),
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Constitutional Issues',
      value: ClientSharedAdapter.formatting.number(stats.constitutionalFlags),
      icon: Shield,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Trending',
      value: ClientSharedAdapter.formatting.number(stats.trendingCount),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${item.bgColor} mr-3`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-sm text-gray-600">{item.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          Last updated: {ClientSharedAdapter.formatting.relativeTime(stats.lastUpdated)}
        </div>
        <div>
          Data refreshes every 5 minutes
        </div>
      </div>
    </div>
  );
};

export default StatsOverview;
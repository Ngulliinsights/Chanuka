/**
 * Platform Statistics Component
 *
 * Displays platform impact metrics with animations and trends
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';

interface StatItem {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: string;
}

interface PlatformStatsProps {
  stats: StatItem[];
}

const PlatformStats: React.FC<PlatformStatsProps> = ({ stats }) => {
  return (
    <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur">
      <CardHeader className="text-center pb-8">
        <CardTitle className="text-4xl font-bold text-gray-900 mb-4">Platform Impact</CardTitle>
        <CardDescription className="text-xl text-gray-600">
          Real numbers from our growing community of engaged citizens
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center group">
                <div className="relative mb-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${
                    index === 0 ? 'from-blue-500 to-blue-600' :
                    index === 1 ? 'from-green-500 to-green-600' :
                    index === 2 ? 'from-orange-500 to-orange-600' :
                    'from-purple-500 to-purple-600'
                  } shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
                <div className={`text-4xl font-bold mb-2 ${stat.color}`}>{stat.value}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
                {stat.trend && (
                  <div className="text-xs text-green-600 mt-1 flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {stat.trend}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformStats;

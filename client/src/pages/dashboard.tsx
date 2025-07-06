import React, { useState, useEffect } from 'react';

interface DashboardStats {
  totalBills: number;
  highTransparency: number;
  pendingVotes: number;
  userEngagement: number;
}

function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBills: 0,
    highTransparency: 0,
    pendingVotes: 0,
    userEngagement: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading dashboard data
    setTimeout(() => {
      setStats({
        totalBills: 1247,
        highTransparency: 892,
        pendingVotes: 23,
        userEngagement: 78,
      });
      setLoading(false);
    }, 1000);
  }, []);

  const recentActivity = [
    {
      id: 1,
      type: 'bill_update',
      title: 'Digital Rights Act moved to floor vote',
      time: '2 hours ago',
      icon: '📜',
    },
    {
      id: 2,
      type: 'comment',
      title: 'New expert analysis on Climate Action Act',
      time: '4 hours ago',
      icon: '💬',
    },
    {
      id: 3,
      type: 'transparency',
      title: 'Transparency score updated for Healthcare Bill',
      time: '6 hours ago',
      icon: '🔍',
    },
  ];

  const quickActions = [
    {
      title: 'Track New Bill',
      description: 'Add a bill to your watchlist',
      icon: '➕',
      action: () => console.log('Track bill'),
    },
    {
      title: 'Submit Analysis',
      description: 'Contribute expert analysis',
      icon: '📝',
      action: () => console.log('Submit analysis'),
    },
    {
      title: 'Community Input',
      description: 'Participate in discussions',
      icon: '💭',
      action: () => console.log('Community input'),
    },
  ];

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg p-6 shadow-sm">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bills</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalBills}</p>
            </div>
            <div className="text-3xl">📜</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Transparency</p>
              <p className="text-2xl font-bold text-green-600">{stats.highTransparency}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Votes</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingVotes}</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">User Engagement</p>
              <p className="text-2xl font-bold text-blue-600">{stats.userEngagement}%</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="text-xl">{activity.icon}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="w-full flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-xl">{action.icon}</div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {action.title}
                    </p>
                    <p className="text-xs text-gray-500">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
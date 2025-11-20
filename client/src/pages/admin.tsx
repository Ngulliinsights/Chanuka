import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  Shield, 
  Settings, 
  Database,
  Activity,
  TrendingUp,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Search,
  Filter,
  Download,
  RefreshCw,
  Plus,
  MoreHorizontal,
  Bell,
  Zap
} from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock data for demonstration
  const systemStats = {
    totalUsers: 15392,
    activeBills: 2847,
    pendingVerifications: 23,
    workaroundsDetected: 127,
    systemHealth: 98.5,
    dailyActiveUsers: 3421
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  const recentActivity = [
    { id: 1, type: 'user_registration', description: 'New user registered: john.doe@email.com', timestamp: '2 minutes ago', status: 'success' },
    { id: 2, type: 'bill_analysis', description: 'Workaround detected in Bill #2847', timestamp: '15 minutes ago', status: 'warning' },
    { id: 3, type: 'expert_verification', description: 'Expert verification completed for Constitutional Analysis', timestamp: '1 hour ago', status: 'success' },
    { id: 4, type: 'system_alert', description: 'High traffic detected - auto-scaling triggered', timestamp: '2 hours ago', status: 'info' },
  ];

  const pendingVerifications = [
    { id: 1, type: 'Expert Application', name: 'Dr. Sarah Johnson', field: 'Constitutional Law', submitted: '2 days ago' },
    { id: 2, type: 'Bill Analysis', name: 'Climate Action Framework', analyst: 'Prof. Michael Chen', submitted: '1 day ago' },
    { id: 3, type: 'Workaround Report', name: 'Tax Reform Implementation', reporter: 'Community User', submitted: '3 hours ago' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-orange-100 text-orange-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-2 text-lg">System administration and platform management</p>
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="bg-green-100 text-green-800 px-3 py-1">
              <Activity className="w-4 h-4 mr-2" />
              System Healthy
            </Badge>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="hover:bg-blue-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <Bell className="w-4 h-4 mr-2" />
              Alerts
            </Button>
          </div>
        </div>

        {/* Enhanced System Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalUsers.toLocaleString()}</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+12%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Bills</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.activeBills.toLocaleString()}</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+8%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.pendingVerifications}</p>
                  <div className="flex items-center mt-1">
                    <Clock className="w-3 h-3 text-orange-500 mr-1" />
                    <span className="text-xs text-orange-600">Urgent</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Workarounds</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.workaroundsDetected}</p>
                  <div className="flex items-center mt-1">
                    <AlertTriangle className="w-3 h-3 text-red-500 mr-1" />
                    <span className="text-xs text-red-600">+3 today</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Health</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.systemHealth}%</p>
                  <div className="flex items-center mt-1">
                    <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">Excellent</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-gradient-to-br from-teal-50 to-teal-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Daily Active</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.dailyActiveUsers.toLocaleString()}</p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">+15%</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Main Admin Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <TabsList className="grid w-full lg:w-auto grid-cols-5 bg-white shadow-md border-0">
              <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Users
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Content
              </TabsTrigger>
              <TabsTrigger value="verification" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Verification
              </TabsTrigger>
              <TabsTrigger value="system" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                System
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-8">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Enhanced Recent Activity */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Latest system events and user actions</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all duration-300">
                        <div className="flex-shrink-0">
                          {getStatusIcon(activity.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 mb-1">{activity.description}</p>
                          <p className="text-xs text-gray-500">{activity.timestamp}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(activity.status)}>
                            {activity.type.replace('_', ' ')}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <Button variant="outline" className="w-full">
                      View All Activity
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Pending Verifications */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    Pending Verifications
                    <Badge variant="destructive" className="ml-auto">
                      {pendingVerifications.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Items requiring admin review</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {pendingVerifications.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:shadow-md transition-all duration-300">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500">
                            Submitted {item.submitted}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="hover:bg-green-50">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" className="hover:bg-blue-50">
                            <Eye className="w-3 h-3 mr-1" />
                            Review
                          </Button>
                          <Button size="sm" variant="ghost">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <Button variant="outline" className="w-full">
                      View All Pending Items
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-8">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-white" />
                      </div>
                      User Management
                    </CardTitle>
                    <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
                  </div>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <Button asChild className="h-auto p-4 justify-start">
                    <Link to="/admin/users">
                      <Users className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">View All Users</div>
                        <div className="text-xs opacity-70">Browse and search users</div>
                      </div>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 justify-start hover:bg-blue-50">
                    <Link to="/admin/roles">
                      <Shield className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Manage Roles</div>
                        <div className="text-xs opacity-70">Configure permissions</div>
                      </div>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 justify-start hover:bg-purple-50">
                    <Link to="/admin/user-settings">
                      <Settings className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">User Settings</div>
                        <div className="text-xs opacity-70">Authentication & security</div>
                      </div>
                    </Link>
                  </Button>
                </div>
                
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-2">Quick Stats</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">15,392</div>
                      <div className="text-xs text-gray-600">Total Users</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">3,421</div>
                      <div className="text-xs text-gray-600">Active Today</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">127</div>
                      <div className="text-xs text-gray-600">New This Week</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">23</div>
                      <div className="text-xs text-gray-600">Pending Approval</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-8">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-white" />
                      </div>
                      Content Management
                    </CardTitle>
                    <CardDescription>Manage bills, analyses, and community content</CardDescription>
                  </div>
                  <Button className="bg-gradient-to-r from-green-600 to-teal-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Content
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <Button asChild className="h-auto p-4 justify-start">
                    <Link to="/admin/bills">
                      <FileText className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Manage Bills</div>
                        <div className="text-xs opacity-70">Review & moderate bills</div>
                      </div>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 justify-start hover:bg-orange-50">
                    <Link to="/admin/workarounds">
                      <AlertTriangle className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Review Workarounds</div>
                        <div className="text-xs opacity-70">Analyze detection alerts</div>
                      </div>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 justify-start hover:bg-blue-50">
                    <Link to="/admin/analytics">
                      <BarChart3 className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Content Analytics</div>
                        <div className="text-xs opacity-70">Performance metrics</div>
                      </div>
                    </Link>
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-4">Content Overview</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Bills</span>
                        <span className="font-medium">2,847</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Pending Review</span>
                        <span className="font-medium text-orange-600">23</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Flagged Content</span>
                        <span className="font-medium text-red-600">7</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-4">Recent Alerts</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">Workaround detected in Bill #2847</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm">Content flagged for review</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Analysis approved</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="verification" className="space-y-8">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white" />
                      </div>
                      Verification System
                    </CardTitle>
                    <CardDescription>Manage expert verifications and content review</CardDescription>
                  </div>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                    <Zap className="w-4 h-4 mr-2" />
                    Quick Review
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <Button asChild className="h-auto p-4 justify-start">
                    <Link to="/admin/expert-applications">
                      <Shield className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Expert Applications</div>
                        <div className="text-xs opacity-70">Review new applications</div>
                      </div>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 justify-start hover:bg-green-50">
                    <Link to="/admin/pending-reviews">
                      <CheckCircle className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Pending Reviews</div>
                        <div className="text-xs opacity-70">Items awaiting approval</div>
                      </div>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 justify-start hover:bg-blue-50">
                    <Link to="/admin/verification-history">
                      <Eye className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Verification History</div>
                        <div className="text-xs opacity-70">Past decisions & logs</div>
                      </div>
                    </Link>
                  </Button>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl">
                  <h4 className="font-semibold text-gray-900 mb-4">Verification Queue</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Dr. Sarah Johnson - Constitutional Law Expert</p>
                        <p className="text-xs text-gray-500">Applied 2 days ago</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3 mr-1" />
                          Review
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-8">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-slate-600 rounded-lg flex items-center justify-center">
                        <Settings className="w-4 h-4 text-white" />
                      </div>
                      System Administration
                    </CardTitle>
                    <CardDescription>Platform configuration and system monitoring</CardDescription>
                  </div>
                  <Button className="bg-gradient-to-r from-gray-600 to-slate-600">
                    <Database className="w-4 h-4 mr-2" />
                    System Status
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <Button asChild className="h-auto p-4 justify-start">
                    <Link to="/admin/system-settings">
                      <Settings className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">System Settings</div>
                        <div className="text-xs opacity-70">Configure platform</div>
                      </div>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 justify-start hover:bg-blue-50">
                    <Link to="/admin/database">
                      <Database className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Database Manager</div>
                        <div className="text-xs opacity-70">Manage data & backups</div>
                      </div>
                    </Link>
                  </Button>
                  
                  <Button asChild variant="outline" className="h-auto p-4 justify-start hover:bg-green-50">
                    <Link to="/admin/performance">
                      <BarChart3 className="w-5 h-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Performance Monitor</div>
                        <div className="text-xs opacity-70">System health & metrics</div>
                      </div>
                    </Link>
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-4">System Health</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">CPU Usage</span>
                        <span className="font-medium text-green-600">23%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Memory</span>
                        <span className="font-medium text-green-600">67%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Disk Space</span>
                        <span className="font-medium text-yellow-600">82%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                    <h4 className="font-semibold text-gray-900 mb-4">Quick Actions</h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Restart Services
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Download className="w-4 h-4 mr-2" />
                        Backup Database
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Activity className="w-4 h-4 mr-2" />
                        View Logs
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
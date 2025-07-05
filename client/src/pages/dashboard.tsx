import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Users, 
  TrendingUp, 
  Database,
  Eye,
  Settings
} from "lucide-react";
import { Link } from "wouter";
import { useBills } from "@/hooks/use-bills";
import { useSystemHealth } from "@/hooks/use-system";

export default function Dashboard() {
  const { data: bills, isLoading: billsLoading } = useBills();
  const { data: systemHealth } = useSystemHealth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">Chanuka</span>
              </Link>
              <Badge variant="outline">Legislative Transparency Platform</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/bills">
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Bills
                </Button>
              </Link>
              <Link href="/database">
                <Button variant="outline" size="sm">
                  <Database className="h-4 w-4 mr-2" />
                  Database
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Legislative Transparency Dashboard</h1>
          <p className="text-slate-600 mt-2">
            Monitor legislative activity, analyze bills, and track transparency metrics
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Bills</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {billsLoading ? "..." : bills?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Active Sponsors</p>
                  <p className="text-2xl font-bold text-slate-900">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Analysis Reports</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {billsLoading ? "..." : bills?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Eye className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">System Status</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {systemHealth?.database ? "✓" : "..."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Legislative Activity</CardTitle>
              <CardDescription>Latest bills and legislative updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {billsLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                ) : bills?.slice(0, 3).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{bill.title}</p>
                      <p className="text-sm text-slate-600">{bill.billNumber}</p>
                    </div>
                    <Badge variant="outline">{bill.status}</Badge>
                  </div>
                ))}
                <Link href="/bills">
                  <Button variant="outline" className="w-full mt-4">
                    View All Bills
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Platform Features</CardTitle>
              <CardDescription>Explore transparency and analysis tools</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Link href="/bills">
                  <Button variant="ghost" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Legislative Bills & Analysis
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full justify-start" disabled>
                  <Users className="h-4 w-4 mr-2" />
                  Sponsor Transparency (Coming Soon)
                </Button>
                <Button variant="ghost" className="w-full justify-start" disabled>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Impact Analysis (Coming Soon)
                </Button>
                <Link href="/database">
                  <Button variant="ghost" className="w-full justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Database Management
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp, Users, FileText, MessageSquare, AlertCircle } from "lucide-react";
import { systemApi, billsApi } from "@/services/api";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => systemApi.getHealth(),
    refetchInterval: 30000,
  });

  const { data: bills } = useQuery({
    queryKey: ['bills'],
    queryFn: () => billsApi.getBills(),
  });

  const recentBills = bills?.slice(0, 5) || [];
  const activeBills = bills?.filter(bill => bill.status === 'active')?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600 mt-2">
            Monitor legislative activity and community engagement
          </p>
        </div>

        {/* System Status */}
        {health && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${health.database?.connected ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-sm">
                    Database: {health.database?.mode || "Unknown"}
                  </span>
                </div>
                <Badge variant={health.status === 'healthy' ? 'default' : 'destructive'}>
                  {health.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bills</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeBills}</div>
              <p className="text-xs text-muted-foreground">
                Currently in review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bills?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                All tracked legislation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Community Input</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">142</div>
              <p className="text-xs text-muted-foreground">
                Public comments this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">573</div>
              <p className="text-xs text-muted-foreground">
                +12% from last week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Bills</CardTitle>
              <CardDescription>
                Latest legislative items requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBills.map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{bill.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {bill.category} • {bill.status}
                      </p>
                    </div>
                    <Link href={`/bills/${bill.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
                {recentBills.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No bills available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Community Engagement</CardTitle>
              <CardDescription>
                Public participation metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Comment Participation</span>
                    <span className="text-sm text-muted-foreground">73%</span>
                  </div>
                  <Progress value={73} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Expert Verification</span>
                    <span className="text-sm text-muted-foreground">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Public Awareness</span>
                    <span className="text-sm text-muted-foreground">82%</span>
                  </div>
                  <Progress value={82} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and navigation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/bills">
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  View Bills
                </Button>
              </Link>
              <Link href="/verification">
                <Button variant="outline" className="w-full">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Expert Review
                </Button>
              </Link>
              <Link href="/database">
                <Button variant="outline" className="w-full">
                  <Activity className="h-4 w-4 mr-2" />
                  Database
                </Button>
              </Link>
              <Link href="/bills">
                <Button variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Community
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

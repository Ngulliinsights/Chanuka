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

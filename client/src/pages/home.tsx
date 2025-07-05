
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Shield, 
  Search,
  ArrowRight,
  CheckCircle,
  Globe,
  Zap
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { systemApi, billsApi } from "@/services/api";

export default function HomePage() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => systemApi.getHealth(),
    refetchInterval: 30000,
  });

  const { data: bills } = useQuery({
    queryKey: ['bills'],
    queryFn: () => billsApi.getBills(),
  });

  const activeBills = bills?.filter(bill => bill.status === 'active')?.length || 0;
  const totalBills = bills?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6">
              Legislative Transparency
              <span className="block text-blue-600">Made Simple</span>
            </h1>
            <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
              Democratizing access to legislative information through community-driven analysis, 
              expert verification, and transparent decision-making processes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/bills">
                <Button size="lg" className="px-8">
                  <FileText className="mr-2 h-5 w-5" />
                  Explore Bills
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="px-8">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{totalBills}</div>
              <div className="text-slate-600">Bills Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{activeBills}</div>
              <div className="text-slate-600">Active Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">573</div>
              <div className="text-slate-600">Community Members</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">89%</div>
              <div className="text-slate-600">Transparency Score</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              How We're Changing Democracy
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Our platform empowers citizens with the tools and information needed 
              to participate meaningfully in the democratic process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Intelligent Analysis</CardTitle>
                <CardDescription>
                  AI-powered bill analysis combined with expert human verification 
                  for accurate, unbiased insights.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Community Driven</CardTitle>
                <CardDescription>
                  Public participation through comments, feedback, and collaborative 
                  analysis from diverse stakeholders.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Verified Information</CardTitle>
                <CardDescription>
                  Expert verification system ensures accuracy and reliability 
                  of all legislative analysis and recommendations.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* System Status */}
      {health && (
        <section className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  System Status
                </CardTitle>
                <CardDescription>
                  Real-time platform health and connectivity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${health.database?.connected ? "bg-green-500" : "bg-yellow-500"}`} />
                      <span className="text-sm font-medium">Database</span>
                    </div>
                    <Badge variant={health.database?.connected ? 'default' : 'secondary'}>
                      {health.database?.mode || "Unknown"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">API</span>
                    </div>
                    <Badge variant="default">Operational</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">Frontend</span>
                    </div>
                    <Badge variant="default">Operational</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Involved?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of citizens working together to create a more transparent democracy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/bills">
              <Button size="lg" variant="secondary" className="px-8">
                <FileText className="mr-2 h-5 w-5" />
                Start Exploring
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="lg" variant="outline" className="px-8 border-white text-white hover:bg-white hover:text-blue-600">
                <Users className="mr-2 h-5 w-5" />
                Join Community
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Platform</h3>
              <div className="space-y-2">
                <Link href="/bills" className="block text-slate-300 hover:text-white">Bills Database</Link>
                <Link href="/verification" className="block text-slate-300 hover:text-white">Expert Verification</Link>
                <Link href="/dashboard" className="block text-slate-300 hover:text-white">Analytics</Link>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Community</h3>
              <div className="space-y-2">
                <a href="#" className="block text-slate-300 hover:text-white">Public Comments</a>
                <a href="#" className="block text-slate-300 hover:text-white">Discussion Forums</a>
                <a href="#" className="block text-slate-300 hover:text-white">Expert Network</a>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <div className="space-y-2">
                <a href="#" className="block text-slate-300 hover:text-white">API Documentation</a>
                <a href="#" className="block text-slate-300 hover:text-white">User Guide</a>
                <a href="#" className="block text-slate-300 hover:text-white">Privacy Policy</a>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Contact</h3>
              <div className="space-y-2">
                <a href="#" className="block text-slate-300 hover:text-white">Support</a>
                <a href="#" className="block text-slate-300 hover:text-white">Feedback</a>
                <a href="#" className="block text-slate-300 hover:text-white">Partnership</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-8 text-center">
            <p className="text-slate-400">
              © 2024 Legislative Transparency Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

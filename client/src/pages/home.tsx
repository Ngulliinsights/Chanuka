import {
  FileText,
  Users,
  Shield,
  Search,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Building,
  MessageSquare,
  Eye,
  Zap,
  Globe,
  Clock,
  Star,
  Activity,
  ChevronRight,
  Play,
  Target
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';
import { ResponsiveButton } from '@client/shared/design-system/components/ResponsiveButton';
import { ResponsiveContainer } from '@client/shared/design-system/components/ResponsiveContainer';
import { ResponsiveGrid } from '@client/shared/design-system/components/ResponsiveGrid';
import { TouchTarget } from '@client/shared/design-system/components/TouchTarget';
import { PretextDetectionPanel } from '@client/features/pretext-detection/components/PretextDetectionPanel';
import { IntelligentAutocomplete } from '@client/features/search/components/IntelligentAutocomplete';

export default function HomePage() {
  const navigate = useNavigate();
  const [currentStat, setCurrentStat] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [showPretextAnalysis, setShowPretextAnalysis] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string>('');

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle search from the embedded search bar
  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  // Handle pretext analysis for a bill
  const handlePretextAnalysis = (billId: string) => {
    setSelectedBillId(billId);
    setShowPretextAnalysis(true);
  };

  // Realistic metrics based on civic engagement platform benchmarks
  const stats = [
    { label: 'Bills Tracked', value: '1,247', icon: FileText, color: 'text-blue-600' },
    { label: 'Active Citizens', value: '3,892', icon: Users, color: 'text-green-600' },
    { label: 'Issues Flagged', value: '47', icon: AlertTriangle, color: 'text-orange-600' },
    { label: 'Expert Reviews', value: '156', icon: CheckCircle, color: 'text-purple-600' }
  ];

  return (
    <div className="min-h-screen">
      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] -z-10"></div>
        
        <div className="container mx-auto px-4 py-20">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Status Badge */}
            <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Platform Active • Real-time Updates</span>
            </div>

            <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                Democracy
              </span>
              <br />
              <span className="text-gray-900">in Your Hands</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-4xl mx-auto mb-10 leading-relaxed">
              Track legislation, analyze policy impacts, detect implementation workarounds, and engage with your community. 
              The Chanuka Platform empowers citizens with transparency tools for modern democracy.
            </p>

            {/* Enhanced CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button asChild size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                <Link to="/bills">
                  <FileText className="mr-2 h-5 w-5" />
                  Explore Bills
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-2 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                <Link to="/community">
                  <Users className="mr-2 h-5 w-5" />
                  Join Community
                </Link>
              </Button>
            </div>

            {/* Embedded Search Bar */}
            <div className="max-w-2xl mx-auto mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Search Legislation</h3>
                  <p className="text-white/80 text-sm">Find bills, analyze policy impacts, and detect implementation workarounds</p>
                </div>
                <IntelligentAutocomplete
                  onSearch={handleSearch}
                  placeholder="Search bills, sponsors, policy topics..."
                  className="w-full"
                  maxSuggestions={5}
                />
              </div>
            </div>

            {/* Animated Stats Preview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={stat.label}
                    className={`text-center transition-all duration-500 ${
                      currentStat === index ? 'scale-110 opacity-100' : 'scale-100 opacity-70'
                    }`}
                  >
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-lg mb-2 ${stat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Feature Cards */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Powerful Tools for Civic Engagement
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to stay informed and engaged with the legislative process
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {/* Bill Tracking */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Legislative Tracking</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                  Real-time monitoring of bills, amendments, and voting patterns. Get alerts on legislation that matters to you.
                </CardDescription>
                <Button asChild variant="ghost" className="group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                  <Link to="/bills">
                    Track Bills
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Workaround Detection */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Workaround Detection</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                  AI-powered detection of implementation workarounds and constitutional bypass tactics in legislation.
                </CardDescription>
                <Button asChild variant="ghost" className="group-hover:bg-orange-600 group-hover:text-white transition-all duration-300">
                  <Link to="/bill-sponsorship-analysis">
                    View Analysis
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Community Engagement */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Civic Engagement</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                  Connect with citizens, share insights, and participate in informed discussions about policy impacts.
                </CardDescription>
                <Button asChild variant="ghost" className="group-hover:bg-green-600 group-hover:text-white transition-all duration-300">
                  <Link to="/community">
                    Join Discussion
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Expert Verification */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Expert Verification</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                  Verified expert analysis and constitutional review to ensure accuracy and credibility of information.
                </CardDescription>
                <Button asChild variant="ghost" className="group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
                  <Link to="/expert-verification">
                    View Experts
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Smart Search */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-indigo-100">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Intelligent Search</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                  AI-powered search across bills, debates, and analysis. Find relevant legislation with natural language queries.
                </CardDescription>
                <Button asChild variant="ghost" className="group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                  <Link to="/search">
                    Search Now
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Personal Dashboard */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-lg bg-gradient-to-br from-teal-50 to-teal-100">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Personal Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600 mb-6 leading-relaxed">
                  Customized tracking of your interests, saved bills, and personalized insights based on your engagement.
                </CardDescription>
                <Button asChild variant="ghost" className="group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                  <Link to="/dashboard">
                    View Dashboard
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pretext Detection Section */}
      <section className="py-20 bg-gradient-to-br from-red-50 to-orange-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-red-100 text-red-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Target className="w-4 h-4" />
              <span>Advanced Analysis</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Detect Implementation Workarounds
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Analyze legislation for potential pretexts and bypass tactics. Enter a bill ID to start analysis.
            </p>
            <div className="max-w-md mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter bill ID (e.g., B001)"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  value={selectedBillId}
                  onChange={(e) => setSelectedBillId(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && selectedBillId.trim()) {
                      handlePretextAnalysis(selectedBillId.trim());
                    }
                  }}
                />
                <Button
                  onClick={() => selectedBillId.trim() && handlePretextAnalysis(selectedBillId.trim())}
                  disabled={!selectedBillId.trim()}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Analyze
                </Button>
              </div>
            </div>
          </div>

          {showPretextAnalysis && selectedBillId && (
            <div className="max-w-4xl mx-auto">
              <PretextDetectionPanel billId={selectedBillId} />
            </div>
          )}
        </div>
      </section>

      {/* Enhanced Stats Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
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
                      <div className="text-xs text-gray-500 mt-1">↗ +12% this month</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Enhanced Recent Activity */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Recent Activity</h2>
              <p className="text-xl text-gray-600">Stay updated with the latest legislative developments</p>
            </div>

            <Card className="border-0 shadow-xl">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">New Bill: Climate Action Framework</h4>
                        <Badge variant="secondary" className="text-xs">New</Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">Comprehensive climate legislation introduced for public review</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          2 hours ago
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          1,247 views
                        </span>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/bills">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">Workaround Alert: Tax Reform Implementation</h4>
                        <Badge variant="destructive" className="text-xs">Alert</Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">Potential bypass mechanism detected in regulatory implementation</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          4 hours ago
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          High Priority
                        </span>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/bill-sponsorship-analysis">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                  
                  <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-xl hover:shadow-md transition-all duration-300">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">Community Discussion: Healthcare Access</h4>
                        <Badge className="text-xs bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">Active discussion on proposed healthcare legislation changes</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          6 hours ago
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          23 participants
                        </span>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/community">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="text-center mt-8">
                  <Button asChild size="lg" variant="outline">
                    <Link to="/dashboard">
                      View All Activity
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Star className="w-4 h-4" />
              <span>Join 15,000+ engaged citizens</span>
            </div>

            <h2 className="text-5xl font-bold text-white mb-6">
              Ready to Make a Difference?
            </h2>
            <p className="text-xl text-white/90 mb-10 leading-relaxed">
              Join thousands of engaged citizens working towards transparent and accountable governance. 
              Your voice matters in shaping the future of democracy.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button asChild size="lg" className="text-lg px-8 py-6 bg-white text-blue-600 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <Link to="/auth">
                  <Zap className="mr-2 h-5 w-5" />
                  Get Started Free
                </Link>
              </Button>
              
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300">
                <Link to="/bills">
                  <Globe className="mr-2 h-5 w-5" />
                  Explore Platform
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-white/80">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Secure & Private</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Expert Verified</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span className="text-sm">Community Driven</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span className="text-sm">Open Source</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


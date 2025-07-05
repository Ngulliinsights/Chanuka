import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Shield, 
  TrendingUp, 
  AlertCircle,
  Eye,
  Search,
  Gavel
} from 'lucide-react';

export function HomePage() {
  // Centralized data with enhanced properties for better maintainability
  const featuredBills = [
    {
      id: 1,
      title: "Kenya Finance Bill 2024",
      status: "rejected",
      conflict_level: "high",
      sponsor_count: 204,
      summary: "Comprehensive tax reform bill that was rejected following public protests.",
      // Enhanced accessibility with aria-label
      statusAriaLabel: "Bill status: rejected due to public opposition"
    },
    {
      id: 2,
      title: "National Healthcare Reform Act",
      status: "committee",
      conflict_level: "medium", 
      sponsor_count: 13,
      summary: "Healthcare policy changes with pharmaceutical industry implications.",
      statusAriaLabel: "Bill status: currently in committee review"
    },
  ];

  const stats = [
    { 
      label: "Bills Tracked", 
      value: "2,847", 
      icon: FileText, 
      color: "text-primary",
      description: "Total legislative bills monitored across all sessions"
    },
    { 
      label: "Conflicts Identified", 
      value: "342", 
      icon: AlertCircle, 
      color: "text-warning",
      description: "Potential conflicts of interest flagged in bill sponsorships"
    },
    { 
      label: "Verified Sources", 
      value: "1,204", 
      icon: Shield, 
      color: "text-success",
      description: "Authenticated data sources ensuring information reliability"
    },
    { 
      label: "Active Users", 
      value: "15,673", 
      icon: Users, 
      color: "text-info",
      description: "Citizens actively engaging with the transparency platform"
    },
  ];

  // Helper function to determine status styling with consistent logic
  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      rejected: 'bg-red-100 text-red-800 border-red-200',
      committee: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      passed: 'bg-green-100 text-green-800 border-green-200',
      proposed: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Helper function for risk level styling
  const getRiskBadgeClass = (riskLevel) => {
    const riskClasses = {
      high: 'risk-high bg-red-50 text-red-700 border-red-200',
      medium: 'risk-medium bg-orange-50 text-orange-700 border-orange-200',
      low: 'risk-low bg-green-50 text-green-700 border-green-200'
    };
    return riskClasses[riskLevel] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced header with better semantic structure */}
      <header className="bg-primary text-primary-foreground" role="banner">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-foreground p-2">
                <img 
                  src="/Chanuka_logo.svg" 
                  alt="Chanuka Logo - Legislative Transparency Platform" 
                  className="h-full w-full object-contain"
                  // Enhanced error handling for logo loading
                  onError={(e) => {
                    e.target.style.display = 'none';
                    console.warn('Chanuka logo failed to load');
                  }}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Chanuka</h1>
                <p className="text-primary-foreground/80">Legislative Transparency Platform</p>
              </div>
            </div>
            <nav className="flex gap-3" role="navigation" aria-label="Main navigation">
              <Link to="/bills">
                <Button 
                  variant="secondary" 
                  className="btn-enhanced focus:ring-2 focus:ring-primary-foreground/50"
                  aria-label="Search and explore legislative bills"
                >
                  <Search className="h-4 w-4 mr-2" aria-hidden="true" />
                  Explore Bills
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button 
                  variant="outline" 
                  className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary focus:ring-2 focus:ring-primary-foreground/50 transition-all duration-200"
                  aria-label="Access your personal dashboard"
                >
                  Dashboard
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12" role="main">
        {/* Enhanced mission statement with better typography hierarchy */}
        <section className="text-center mb-12" aria-labelledby="mission-heading">
          <h2 id="mission-heading" className="text-4xl font-bold text-foreground mb-4">
            Transparency in Legislative Processes
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Chanuka provides comprehensive analysis of bill sponsors, their potential conflicts of interest, 
            and the networks that influence legislation in Kenya. Our mission is to ensure transparency 
            and accountability in the democratic process.
          </p>
        </section>

        {/* Enhanced stats grid with improved accessibility */}
        <section className="mb-12" aria-labelledby="platform-stats">
          <h2 id="platform-stats" className="sr-only">Platform Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card 
                key={index} 
                className="card-enhanced hover:shadow-lg transition-shadow duration-300"
                role="group"
                aria-label={`${stat.label}: ${stat.value}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground" id={`stat-label-${index}`}>
                        {stat.label}
                      </p>
                      <p 
                        className="text-2xl font-bold text-foreground" 
                        aria-labelledby={`stat-label-${index}`}
                      >
                        {stat.value}
                      </p>
                      {/* Enhanced with descriptive text for better context */}
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {stat.description}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg bg-muted ${stat.color} transition-colors duration-200`}>
                      <stat.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Enhanced featured bills section */}
        <section className="mb-12" aria-labelledby="featured-bills">
          <div className="flex items-center justify-between mb-6">
            <h3 id="featured-bills" className="text-2xl font-bold text-foreground">
              Featured Bills
            </h3>
            <Link to="/bills">
              <Button 
                variant="outline" 
                className="btn-enhanced focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                aria-label="View all legislative bills"
              >
                View All Bills
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {featuredBills.map((bill) => (
              <Card 
                key={bill.id} 
                className="card-enhanced card-hover focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-300"
                role="article"
                aria-labelledby={`bill-title-${bill.id}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-lg font-semibold">
                      <Link 
                        to={`/bills/${bill.id}`} 
                        className="hover:text-primary transition-colors duration-200 focus:outline-none focus:underline"
                        id={`bill-title-${bill.id}`}
                      >
                        {bill.title}
                      </Link>
                    </CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Badge 
                        className={`status-badge border ${getStatusBadgeClass(bill.status)} transition-colors duration-200`}
                        aria-label={bill.statusAriaLabel}
                      >
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </Badge>
                      <Badge 
                        className={`status-indicator border ${getRiskBadgeClass(bill.conflict_level)}`}
                        aria-label={`Conflict of interest risk level: ${bill.conflict_level}`}
                      >
                        <AlertCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                        {bill.conflict_level.charAt(0).toUpperCase() + bill.conflict_level.slice(1)} Risk
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {bill.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" aria-hidden="true" />
                      <span aria-label={`${bill.sponsor_count} bill sponsors`}>
                        {bill.sponsor_count} sponsors
                      </span>
                    </div>
                    <Link to={`/bills/${bill.id}`}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary-dark hover:bg-primary/10 transition-all duration-200 focus:ring-2 focus:ring-primary/50"
                        aria-label={`Analyze ${bill.title} in detail`}
                      >
                        <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                        Analyze
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Enhanced features grid with improved interaction states */}
        <section className="mb-12" aria-labelledby="platform-features">
          <h2 id="platform-features" className="sr-only">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="card-enhanced hover:shadow-lg transition-all duration-300 group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
                    <FileText className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">Legislative Tracking</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Track bills from introduction to final vote. Get alerts on bills that matter to you 
                  and understand their real-world impact on your community.
                </p>
                <Link to="/bills">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="btn-enhanced focus:ring-2 focus:ring-primary/50 transition-all duration-200"
                    aria-label="Browse all legislative bills"
                  >
                    Browse Bills
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="card-enhanced hover:shadow-lg transition-all duration-300 group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors duration-300">
                    <BarChart3 className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">Impact Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  Understand how proposed laws will affect different groups, sectors, and regions. 
                  Get clear explanations of complex legislation in plain language.
                </p>
                <Link to="/analysis">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="btn-enhanced focus:ring-2 focus:ring-accent/50 transition-all duration-200"
                    aria-label="Explore detailed impact analysis"
                  >
                    Explore Analysis
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="card-enhanced hover:shadow-lg transition-all duration-300 group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10 text-success group-hover:bg-success/20 transition-colors duration-300">
                    <Users className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-lg">Transparency Network</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  See who sponsors bills, their connections, and potential conflicts of interest. 
                  Join a community of citizens working for legislative transparency.
                </p>
                <Link to="/bill-sponsorship-analysis">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="btn-enhanced focus:ring-2 focus:ring-success/50 transition-all duration-200"
                    aria-label="View transparency network analysis"
                  >
                    View Network
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Enhanced call to action with better visual hierarchy */}
        <section className="text-center bg-muted rounded-xl p-8 border border-border/50" aria-labelledby="cta-heading">
          <h3 id="cta-heading" className="text-2xl font-bold text-foreground mb-4">
            Stay Informed About Legislative Transparency
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto leading-relaxed">
            Join thousands of citizens, journalists, and civil society organizations using Chanuka 
            to track legislative processes and ensure accountability in governance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/dashboard">
              <Button 
                className="btn-primary focus:ring-2 focus:ring-primary/50 transition-all duration-200 min-w-[140px]"
                aria-label="Get started with your personal dashboard"
              >
                <TrendingUp className="h-4 w-4 mr-2" aria-hidden="true" />
                Get Started
              </Button>
            </Link>
            <Link to="/bills">
              <Button 
                variant="outline" 
                className="btn-enhanced focus:ring-2 focus:ring-primary/50 transition-all duration-200 min-w-[140px]"
                aria-label="Browse all legislative bills"
              >
                Browse Bills
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
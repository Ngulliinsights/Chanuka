import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Users, FileText, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'wouter';

const HomePage: React.FC = () => {
  const recentBills = [
    {
      id: '1',
      title: 'Digital Economy Enhancement Act 2024',
      status: 'Committee Review',
      category: 'Technology',
      urgency: 'high',
      lastUpdate: '2 days ago'
    },
    {
      id: '2',
      title: 'Healthcare Accessibility Reform Bill',
      status: 'Second Reading',
      category: 'Healthcare',
      urgency: 'medium',
      lastUpdate: '1 week ago'
    },
    {
      id: '3',
      title: 'Environmental Protection Amendment',
      status: 'Public Participation',
      category: 'Environment',
      urgency: 'high',
      lastUpdate: '3 days ago'
    }
  ];

  const stats = [
    {
      title: 'Active Bills',
      value: '47',
      change: '+12%',
      trend: 'up',
      icon: FileText
    },
    {
      title: 'Public Participation',
      value: '89%',
      change: '+5%',
      trend: 'up',
      icon: Users
    },
    {
      title: 'Bills Passed',
      value: '23',
      change: '+8%',
      trend: 'up',
      icon: CheckCircle
    },
    {
      title: 'Pending Review',
      value: '15',
      change: '-3%',
      trend: 'down',
      icon: Clock
    }
  ];

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8 p-6">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to Chanuka Legislative Platform
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Promoting transparency, accountability, and democratic participation in Kenya's legislative process
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Link href="/bills">
            <Button size="lg">
              Explore Bills
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/community-input">
            <Button variant="outline" size="lg">
              Join Discussion
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Statistics */}
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="flex items-center mt-2">
                  <TrendingUp className={`w-4 h-4 mr-1 ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">
                    from last month
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Legislative Activity
            </CardTitle>
            <CardDescription>
              Latest updates on bills and legislative proceedings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{bill.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {bill.status}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {bill.category}
                    </Badge>
                    <Badge className={`text-xs ${getUrgencyColor(bill.urgency)}`}>
                      {bill.urgency} priority
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {bill.lastUpdate}
                  </p>
                </div>
                <Link href={`/bills/${bill.id}`}>
                  <Button size="sm" variant="ghost">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            ))}
            <Link href="/bills">
              <Button variant="outline" className="w-full">
                View All Bills
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Public Participation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Public Participation
            </CardTitle>
            <CardDescription>
              Get involved in the democratic process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-sm">Open for Comment</h4>
                  <p className="text-xs text-muted-foreground">
                    3 bills currently seeking public input
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-medium text-sm">Recent Submissions</h4>
                  <p className="text-xs text-muted-foreground">
                    127 public comments submitted this week
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <h4 className="font-medium text-sm">Closing Soon</h4>
                  <p className="text-xs text-muted-foreground">
                    2 bills closing for comments in 3 days
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link href="/community-input">
                <Button className="w-full">
                  Submit Input
                </Button>
              </Link>
              <Link href="/expert-verification">
                <Button variant="outline" className="w-full">
                  Expert Review
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Features */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Features</CardTitle>
          <CardDescription>
            Explore the tools available for civic engagement and transparency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <FileText className="w-12 h-12 mx-auto text-blue-600" />
              <h3 className="font-semibold">Bill Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Follow legislation through every stage of the parliamentary process
              </p>
              <Link href="/bills">
                <Button variant="outline" size="sm">
                  Explore Bills
                </Button>
              </Link>
            </div>

            <div className="text-center space-y-2">
              <Users className="w-12 h-12 mx-auto text-green-600" />
              <h3 className="font-semibold">Community Input</h3>
              <p className="text-sm text-muted-foreground">
                Participate in public consultations and share your views
              </p>
              <Link href="/community-input">
                <Button variant="outline" size="sm">
                  Join Discussion
                </Button>
              </Link>
            </div>

            <div className="text-center space-y-2">
              <TrendingUp className="w-12 h-12 mx-auto text-purple-600" />
              <h3 className="font-semibold">Analysis Tools</h3>
              <p className="text-sm text-muted-foreground">
                Access expert analysis and transparency reports
              </p>
              <Link href="/bill-sponsorship-analysis">
                <Button variant="outline" size="sm">
                  View Analysis
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;
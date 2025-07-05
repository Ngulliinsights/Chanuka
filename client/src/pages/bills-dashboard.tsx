import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Calendar, 
  Users, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  Eye,
  MessageSquare,
  Bookmark
} from "lucide-react";
import { useBills, useBillCategories, useBillStatuses } from "@/hooks/use-bills";
import { Link } from "wouter";

interface BillCardProps {
  bill: any;
}

function BillCard({ bill }: BillCardProps) {
  const getStatusColor = (status: string) => {
    const colors = {
      introduced: "bg-blue-100 text-blue-800",
      committee: "bg-yellow-100 text-yellow-800", 
      passed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      signed: "bg-purple-100 text-purple-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getComplexityIcon = (score: number) => {
    if (score >= 8) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (score >= 6) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight">
              <Link href={`/bills/${bill.id}`} className="hover:text-primary">
                {bill.title}
              </Link>
            </CardTitle>
            <CardDescription className="mt-2">
              {bill.description}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(bill.status)}>
            {bill.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <FileText className="h-4 w-4" />
              <span>{bill.billNumber}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(bill.introducedDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              {getComplexityIcon(bill.complexityScore)}
              <span>Complexity: {bill.complexityScore}/10</span>
            </div>
          </div>

          {bill.tags && bill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {bill.tags.slice(0, 3).map((tag: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {bill.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{bill.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Eye className="h-3 w-3" />
                <span>0</span>
              </div>
              <div className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>0</span>
              </div>
              <div className="flex items-center space-x-1">
                <Bookmark className="h-3 w-3" />
                <span>0</span>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {bill.category}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BillsDashboard() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

  const { data: bills, isLoading: billsLoading } = useBills({ 
    search: search || undefined, 
    category: category === 'all' ? undefined : category, 
    status: status === 'all' ? undefined : status 
  });
  
  const { data: categories } = useBillCategories();
  const { data: statuses } = useBillStatuses();

  const filteredBills = bills || [];

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
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Sponsors
              </Button>
              <Button variant="outline" size="sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Analysis
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Legislative Bills</h1>
          <p className="text-slate-600 mt-2">
            Track and analyze legislative proposals with detailed transparency insights
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search bills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses?.map((stat) => (
                  <SelectItem key={stat} value={stat}>
                    {stat.charAt(0).toUpperCase() + stat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Bills</p>
                  <p className="text-2xl font-bold text-slate-900">{filteredBills.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">In Committee</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {filteredBills.filter(b => b.status === 'committee').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Passed</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {filteredBills.filter(b => b.status === 'passed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">High Complexity</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {filteredBills.filter(b => (b.complexityScore || 0) >= 8).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bills List */}
        <div className="space-y-6">
          {billsLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBills.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredBills.map((bill) => (
                <BillCard key={bill.id} bill={bill} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No bills found</h3>
                <p className="text-slate-600">
                  Try adjusting your search criteria or check back later for new legislative proposals.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
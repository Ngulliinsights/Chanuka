import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  AlertCircle, 
  Calendar, 
  Users, 
  TrendingUp,
  Eye,
  MessageSquare,
  Share2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

// Fallback data for when API is unavailable
const FALLBACK_BILLS = [
  {
    id: 1,
    title: "Digital Rights and Privacy Protection Act",
    number: "HR-2024-001",
    introduced_date: new Date('2024-01-15'),
    status: "committee",
    summary: "Comprehensive legislation to protect digital privacy rights and regulate data collection by technology companies.",
    transparency_score: 78,
    conflict_indicators: {
      financial_conflicts: 2,
      political_alignment: 85,
      disclosure_gaps: 15
    },
    views: 15420,
    comments: 342,
    shares: 89,
    tags: ["privacy", "technology", "digital-rights"]
  },
  {
    id: 2,
    title: "Climate Action and Green Energy Transition Act", 
    number: "S-2024-042",
    introduced_date: new Date('2024-02-03'),
    status: "floor_vote",
    summary: "Legislation to accelerate transition to renewable energy and establish carbon pricing mechanisms.",
    transparency_score: 92,
    conflict_indicators: {
      financial_conflicts: 0,
      political_alignment: 72,
      disclosure_gaps: 5
    },
    views: 28735,
    comments: 567,
    shares: 234,
    tags: ["climate", "energy", "environment"]
  },
  {
    id: 3,
    title: "Healthcare Affordability and Access Act",
    number: "HR-2024-018",
    introduced_date: new Date('2024-01-28'),
    status: "passed",
    summary: "Bill to expand healthcare access and reduce prescription drug costs for all citizens.",
    transparency_score: 65,
    conflict_indicators: {
      financial_conflicts: 4,
      political_alignment: 58,
      disclosure_gaps: 25
    },
    views: 41250,
    comments: 892,
    shares: 156,
    tags: ["healthcare", "accessibility", "costs"]
  }
];

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ImplementationWorkarounds } from '../components/implementation/workarounds';

function BillsDashboard() {
  const [bills, setBills] = useState(FALLBACK_BILLS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('introduced_date');
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/bills');
        if (!response.ok) {
          throw new Error('Failed to fetch bills');
        }
        const data = await response.json();
        if (data && data.length > 0) {
          setBills(data);
          setIsUsingFallback(false);
        } else {
          // Use fallback data if API returns empty
          setBills(FALLBACK_BILLS);
          setIsUsingFallback(true);
        }
        setError(null);
      } catch (err) {
        console.warn('API unavailable, using fallback data:', err.message);
        setBills(FALLBACK_BILLS);
        setIsUsingFallback(true);
        setError(null); // Don't show error for fallback mode
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  const filteredBills = bills.filter(bill => {
    const matchesSearch = searchTerm === '' || 
      bill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.summary.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = status === 'all' || bill.status === status;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bills Dashboard</h1>
          <p className="text-gray-600">
            Track legislative proposals and their transparency metrics
            {isUsingFallback && (
              <span className="ml-2 text-amber-600 text-sm">
                (Using demo data - API unavailable)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Bills
            </label>
            <input
              id="search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or summary..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="technology">Technology</option>
              <option value="environment">Environment</option>
              <option value="healthcare">Healthcare</option>
              <option value="economy">Economy</option>
              <option value="education">Education</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="governance">Governance</option>
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="introduced">Introduced</option>
              <option value="committee">Committee Review</option>
              <option value="floor_vote">Floor Vote</option>
              <option value="passed">Passed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        {/* Bill Selection */}
        <div>
          <Select onValueChange={(value) => {
            const bill = bills.find(bill => bill.id.toString() === value);
            setSelectedBill(bill);
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a bill" />
            </SelectTrigger>
            <SelectContent>
              {bills.map((bill) => (
                <SelectItem key={bill.id} value={bill.id.toString()}>
                  {bill.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
          <TabsTrigger value="workarounds">Workarounds</TabsTrigger>
          <TabsTrigger value="tracking">Tracking</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          {/* Bills Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              <>
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-20 bg-gray-200 rounded mb-4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </>
            ) : filteredBills.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 text-lg">No bills found matching your criteria.</p>
              </div>
            ) : (
              filteredBills.map((bill) => (
                <div key={bill.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {bill.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        bill.status === 'passed' 
                          ? 'bg-green-100 text-green-800'
                          : bill.status === 'floor_vote'
                          ? 'bg-blue-100 text-blue-800'
                          : bill.status === 'committee'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {bill.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{bill.number}</p>

                    <p className="text-gray-700 text-sm line-clamp-3 mb-4">
                      {bill.summary}
                    </p>

                    {/* Transparency Score */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Transparency Score</span>
                        <span className="font-medium">{bill.transparency_score}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            bill.transparency_score >= 80 
                              ? 'bg-green-500'
                              : bill.transparency_score >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${bill.transparency_score}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Engagement Stats */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        👁️ {bill.views?.toLocaleString() || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        💬 {bill.comments?.toLocaleString() || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        📤 {bill.shares?.toLocaleString() || 0}
                      </span>
                    </div>

                    {/* Tags */}
                    {bill.tags && bill.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {bill.tags.slice(0, 3).map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {bill.tags.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded">
                            +{bill.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded transition-colors">
                        View Details
                      </button>
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 px-3 rounded transition-colors">
                        Analyze
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bill Analysis</CardTitle>
              <CardDescription>Analyze the bill and its potential impact</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Bill analysis functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="community" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Community Discussion</CardTitle>
              <CardDescription>Discuss the bill with the community</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Community discussion functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="workarounds" className="space-y-6">
          {selectedBill && (
            <ImplementationWorkarounds billId={selectedBill.id} />
          )}
          {!selectedBill && (
            <Card>
              <CardHeader>
                <CardTitle>Implementation Workarounds</CardTitle>
                <CardDescription>Select a bill to view implementation workarounds</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Choose a bill from the list to see potential implementation challenges and proposed workarounds.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bill Tracking</CardTitle>
              <CardDescription>Track your favorite bills and get updates</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Bill tracking functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{filteredBills.length}</div>
            <div className="text-sm text-gray-600">Total Bills</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {filteredBills.filter(b => b.transparency_score >= 80).length}
            </div>
            <div className="text-sm text-gray-600">High Transparency</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {filteredBills.filter(b => b.status === 'floor_vote').length}
            </div>
            <div className="text-sm text-gray-600">Pending Vote</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(filteredBills.reduce((acc, b) => acc + b.transparency_score, 0) / filteredBills.length) || 0}%
            </div>
            <div className="text-sm text-gray-600">Avg Transparency</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BillsDashboard;
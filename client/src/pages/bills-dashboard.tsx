import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Bookmark,
  MapPin,
  Building,
  Globe,
  ChevronDown
} from "lucide-react";
import { useBills, useBillCategories, useBillStatuses } from "@/hooks/use-bills";
import { Link } from "wouter";

interface BillCardProps {
  bill: any;
}

function BillCard({ bill }: BillCardProps) {
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      introduced: { class: "chanuka-status-badge chanuka-status-medium", text: "Introduced" },
      committee: { class: "chanuka-status-badge chanuka-status-medium", text: "In Committee" }, 
      passed: { class: "chanuka-status-badge chanuka-status-low", text: "Passed" },
      failed: { class: "chanuka-status-badge chanuka-status-high", text: "Failed" },
      signed: { class: "chanuka-status-badge chanuka-status-low", text: "Signed into Law" }
    };
    return statusConfig[status as keyof typeof statusConfig] || { class: "chanuka-status-badge", text: status };
  };

  const getComplexityIcon = (score: number) => {
    if (score >= 8) return <AlertTriangle className="h-4 w-4" style={{color: 'var(--danger)'}} />;
    if (score >= 6) return <Clock className="h-4 w-4" style={{color: 'var(--warning)'}} />;
    return <CheckCircle className="h-4 w-4" style={{color: 'var(--success)'}} />;
  };

  const statusBadge = getStatusBadge(bill.status);

  return (
    <div className="chanuka-card chanuka-fade-in">
      <div className="chanuka-card-header">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold leading-tight mb-2" style={{color: 'var(--primary)'}}>
              <Link href={`/bills/${bill.id}`} className="hover:underline">
                {bill.title}
              </Link>
            </h3>
            <p className="text-sm" style={{color: 'var(--text-light)'}}>
              {bill.description}
            </p>
          </div>
          <span className={statusBadge.class}>
            {statusBadge.text}
          </span>
        </div>
      </div>
      <div className="chanuka-card-content">
        <div className="space-y-4">
          <div className="flex items-center space-x-4 text-sm" style={{color: 'var(--text-light)'}}>
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
            <div className="flex flex-wrap gap-2">
              {bill.tags.slice(0, 3).map((tag: string, index: number) => (
                <span 
                  key={index} 
                  className="px-2 py-1 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: 'var(--light-bg)',
                    color: 'var(--primary)',
                    border: '1px solid var(--border)'
                  }}
                >
                  {tag}
                </span>
              ))}
              {bill.tags.length > 3 && (
                <span 
                  className="px-2 py-1 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: 'var(--light-bg)',
                    color: 'var(--text-light)',
                    border: '1px solid var(--border)'
                  }}
                >
                  +{bill.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t" style={{borderColor: 'var(--border)'}}>
            <div className="flex items-center space-x-4 text-sm" style={{color: 'var(--text-light)'}}>
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
            <span 
              className="px-2 py-1 text-xs font-medium rounded-full"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'white'
              }}
            >
              {bill.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillsDashboard() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [county, setCounty] = useState<string>('all');
  const [urgency, setUrgency] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  const { data: bills, isLoading: billsLoading } = useBills({ 
    search: search || undefined, 
    category: category === 'all' ? undefined : category, 
    status: status === 'all' ? undefined : status 
  });

  const { data: categories } = useBillCategories();
  const { data: statuses } = useBillStatuses();

  // Enhanced filtering with useMemo for performance
  const filteredBills = useMemo(() => {
    if (!bills) return [];

    return bills.filter((b: any) => {
      const matchesSearch = !search || 
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.description.toLowerCase().includes(search.toLowerCase()) ||
        b.billNumber.toLowerCase().includes(search.toLowerCase());

      const matchesCategory = category === 'all' || b.category === category;
      const matchesStatus = status === 'all' || b.status === status;
      const matchesTab = activeTab === 'all' || 
        (activeTab === 'urgent' && b.complexityScore >= 8) ||
        (activeTab === 'tracked' && b.isTracked) ||
        (activeTab === 'recent' && new Date(b.introducedDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

      return matchesSearch && matchesCategory && matchesStatus && matchesTab;
    });
  }, [bills, search, category, status, activeTab]);

  // Enhanced statistics
  const stats = useMemo(() => {
    if (!bills) return { total: 0, active: 0, urgent: 0, passed: 0 };

    return {
      total: bills.length,
      active: bills.filter((b: any) => ['introduced', 'committee'].includes(b.status)).length,
      urgent: bills.filter((b: any) => b.complexityScore >= 8).length,
      passed: bills.filter((b: any) => ['passed', 'signed'].includes(b.status)).length
    };
  }, [bills]);

  return (
    <div style={{ background: 'var(--background)', minHeight: '100vh' }}>
      {/* Chanuka Breadcrumb */}
      <div className="chanuka-breadcrumb">
        <Link href="/">Home</Link>
        <span className="separator">›</span>
        <span className="current">Legislative Bills</span>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Enhanced Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--primary)'}}>
            Legislative Bills Dashboard
          </h1>
          <p className="text-lg" style={{color: 'var(--text-light)'}}>
            Track and analyze legislative proposals with detailed transparency insights
          </p>
        </div>

        {/* Enhanced Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="chanuka-card">
            <div className="chanuka-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: 'var(--text-light)'}}>Total Bills</p>
                  <p className="text-3xl font-bold" style={{color: 'var(--primary)'}}>{stats.total}</p>
                </div>
                <FileText className="h-8 w-8" style={{color: 'var(--accent)'}} />
              </div>
            </div>
          </div>

          <div className="chanuka-card">
            <div className="chanuka-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: 'var(--text-light)'}}>Active Bills</p>
                  <p className="text-3xl font-bold" style={{color: 'var(--success)'}}>{stats.active}</p>
                </div>
                <Clock className="h-8 w-8" style={{color: 'var(--success)'}} />
              </div>
            </div>
          </div>

          <div className="chanuka-card">
            <div className="chanuka-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: 'var(--text-light)'}}>Urgent Bills</p>
                  <p className="text-3xl font-bold" style={{color: 'var(--danger)'}}>{stats.urgent}</p>
                </div>
                <AlertTriangle className="h-8 w-8" style={{color: 'var(--danger)'}} />
              </div>
            </div>
          </div>

          <div className="chanuka-card">
            <div className="chanuka-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{color: 'var(--text-light)'}}>Passed Bills</p>
                  <p className="text-3xl font-bold" style={{color: 'var(--success)'}}>{stats.passed}</p>
                </div>
                <CheckCircle className="h-8 w-8" style={{color: 'var(--success)'}} />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filter Bar */}
        <div className="chanuka-card mb-8">
          <div className="chanuka-card-content">
            <div className="chanuka-filter-bar">
              <div className="chanuka-search-box">
                <Search className="absolute left-3 top-3 h-4 w-4" style={{color: 'var(--text-light)'}} />
                <input
                  className="chanuka-input pl-10"
                  placeholder="Search bills, topics, or bill numbers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select 
                className="chanuka-select"
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories?.map((cat: any) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select 
                className="chanuka-select"
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {statuses?.map((stat: any) => (
                  <option key={stat} value={stat}>
                    {stat.charAt(0).toUpperCase() + stat.slice(1)}
                  </option>
                ))}
              </select>

              <select 
                className="chanuka-select"
                value={county} 
                onChange={(e) => setCounty(e.target.value)}
              >
                <option value="all">All Counties</option>
                <option value="nairobi">Nairobi</option>
                <option value="mombasa">Mombasa</option>
                <option value="kisumu">Kisumu</option>
                <option value="nakuru">Nakuru</option>
              </select>

              <button className="chanuka-btn chanuka-btn-outline">
                <Filter className="h-4 w-4 mr-2" />
                Advanced
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Tabs */}
        <div className="chanuka-tabs mb-8">
          <div className="chanuka-tab-list">
            <button 
              className={`chanuka-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Bills ({filteredBills.length})
            </button>
            <button 
              className={`chanuka-tab ${activeTab === 'urgent' ? 'active' : ''}`}
              onClick={() => setActiveTab('urgent')}
            >
              Urgent ({bills?.filter((b: any) => b.complexityScore >= 8).length || 0})
            </button>
            <button 
              className={`chanuka-tab ${activeTab === 'tracked' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracked')}
            >
              Tracked (0)
            </button>
            <button 
              className={`chanuka-tab ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              Recent (30 days)
            </button>
          </div>

          <div className="chanuka-tab-content">
            {billsLoading ? (
              <div className="text-center py-12">
                <div className="chanuka-progress mb-4">
                  <div className="chanuka-progress-bar" style={{width: '75%'}}></div>
                </div>
                <p style={{color: 'var(--text-light)'}}>Loading legislative bills...</p>
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4" style={{color: 'var(--border)'}} />
                <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--text)'}}>No bills found</h3>
                <p style={{color: 'var(--text-light)'}}>
                  {search || category !== 'all' || status !== 'all' 
                    ? 'Try adjusting your search criteria or filters' 
                    : 'No legislative bills are currently available'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBills.map((bill: any) => (
                  <BillCard key={bill.id} bill={bill} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/bill-sponsorship-analysis" className="chanuka-btn chanuka-btn-secondary">
            <Users className="h-4 w-4 mr-2" />
            Sponsorship Analysis
          </Link>
          <Link href="/expert-verification" className="chanuka-btn chanuka-btn-outline">
            <Building className="h-4 w-4 mr-2" />
            Expert Verification
          </Link>
          <Link href="/dashboard" className="chanuka-btn chanuka-btn-outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Dashboard Overview
          </Link>
        </div>
      </div>
    </div>
  );
}
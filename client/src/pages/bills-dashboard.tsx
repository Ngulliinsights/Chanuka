import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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

  return (
    <div>
      <h1>Bills Dashboard</h1>
      <div>
        <label htmlFor="category">Category:</label>
        <select
          id="category"
          className="chanuka-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
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
        <label htmlFor="status">Status:</label>
        <select
          id="status"
          className="chanuka-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="introduced">Introduced</option>
          <option value="first_reading">First Reading</option>
          <option value="committee_review">Committee Review</option>
          <option value="second_reading">Second Reading</option>
          <option value="third_reading">Third Reading</option>
          <option value="passed">Passed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <p>
        Selected Category: {category}, Selected Status: {status}
      </p>
    </div>
  );
}

export default BillsDashboard;
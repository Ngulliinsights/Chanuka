/**
 * Local Impact Panel - Displays local civic engagement metrics
 * 
 * Features:
 * - Geographic-based activity metrics
 * - Local trending topics
 * - Representative contact information
 * - Local campaign and petition activity
 * - Community engagement statistics
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  MapPin,
  X,
  TrendingUp,
  Megaphone,
  PenTool,
  Mail,
  ExternalLink,
  Search,
  Building,
  BarChart3,
} from 'lucide-react';
import { cn } from '@client/lib/utils';
import { useCommunityStore } from '@client/store/slices/communitySlice';
import { LocalImpactMetrics } from '@client/types/community';

interface LocalImpactPanelProps {
  onClose?: () => void;
  className?: string;
}

interface Representative {
  id: string;
  name: string;
  title: string;
  party: string;
  office: string;
  phone?: string;
  email?: string;
  website?: string;
  district?: string;
}

export function LocalImpactPanel({ onClose, className }: LocalImpactPanelProps) {
   const { localImpact, setLocalImpact, updateLocalImpact } = useCommunityStore();
   const [selectedState, setSelectedState] = useState(localImpact?.data?.state || '');
   const [selectedDistrict, setSelectedDistrict] = useState(localImpact?.data?.district || '');
   const [selectedCounty, setSelectedCounty] = useState(localImpact?.data?.county || '');
   const impact: LocalImpactMetrics = localImpact?.data ?? ({} as LocalImpactMetrics);
   const [loading, setLoading] = useState(false);
   const [representatives, setRepresentatives] = useState<Representative[]>([]);

   // Memoize the setLocalImpact function to prevent useEffect dependency issues
   const memoizedSetLocalImpact = useCallback((metrics: LocalImpactMetrics) => {
     setLocalImpact(metrics);
   }, [setLocalImpact]);

   // Memoize location data to prevent unnecessary effect runs
   const locationData = useMemo(() => ({
     state: selectedState,
     district: selectedDistrict,
     county: selectedCounty
   }), [selectedState, selectedDistrict, selectedCounty]);

  // Mock data for states and districts
  const states = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const getDistrictsForState = (state: string) => {
    // Mock district data - in real app, this would come from API
    const districtCounts: Record<string, number> = {
      'California': 52,
      'Texas': 38,
      'Florida': 28,
      'New York': 26,
      'Pennsylvania': 17,
      'Illinois': 17,
      'Ohio': 15,
      'Georgia': 14,
      'North Carolina': 14,
      'Michigan': 13
    };
    
    const count = districtCounts[state] || 1;
    return Array.from({ length: count }, (_, i) => `District ${i + 1}`);
  };

  const mockLocalImpactData: LocalImpactMetrics = {
    state: selectedState,
    district: selectedDistrict,
    county: selectedCounty,
    totalActivity: 1247,
    uniqueParticipants: 892,
    expertParticipants: 23,
    billsDiscussed: 45,
    billsSaved: 234,
    billsShared: 156,
    campaignsActive: 8,
    petitionsActive: 12,
    averageEngagement: 3.4,
    topTopics: [
      { title: 'Healthcare Reform Bill', score: 0.89, category: 'Healthcare' },
      { title: 'Education Funding', score: 0.76, category: 'Education' },
      { title: 'Infrastructure Investment', score: 0.68, category: 'Transportation' },
      { title: 'Climate Action Plan', score: 0.62, category: 'Environment' },
      { title: 'Criminal Justice Reform', score: 0.55, category: 'Criminal Justice' }
    ],
    lastUpdated: new Date().toISOString()
  };

  const mockRepresentatives: Representative[] = [
    {
      id: '1',
      name: 'Senator Jane Smith',
      title: 'U.S. Senator',
      party: 'Democratic',
      office: 'U.S. Senate',
      phone: '(202) 224-1234',
      email: 'senator.smith@senate.gov',
      website: 'https://smith.senate.gov'
    },
    {
      id: '2',
      name: 'Senator John Doe',
      title: 'U.S. Senator',
      party: 'Republican',
      office: 'U.S. Senate',
      phone: '(202) 224-5678',
      email: 'senator.doe@senate.gov',
      website: 'https://doe.senate.gov'
    },
    {
      id: '3',
      name: 'Rep. Maria Garcia',
      title: 'U.S. Representative',
      party: 'Democratic',
      office: 'U.S. House of Representatives',
      district: selectedDistrict,
      phone: '(202) 225-9876',
      email: 'rep.garcia@house.gov',
      website: 'https://garcia.house.gov'
    }
  ];

  useEffect(() => {
    if (selectedState) {
      setLoading(true);
      // Simulate API call
      const timeoutId = setTimeout(() => {
        memoizedSetLocalImpact(mockLocalImpactData);
        setRepresentatives(mockRepresentatives);
        setLoading(false);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [locationData, memoizedSetLocalImpact]);

  const handleLocationUpdate = useCallback(() => {
    updateLocalImpact({
      state: selectedState,
      district: selectedDistrict,
      county: selectedCounty
    });
  }, [selectedState, selectedDistrict, selectedCounty, updateLocalImpact]);

  const getPartyColor = (party: string) => {
    switch (party.toLowerCase()) {
      case 'democratic':
        return 'bg-blue-100 text-blue-800';
      case 'republican':
        return 'bg-red-100 text-red-800';
      case 'independent':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={cn('chanuka-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Local Impact
          </CardTitle>
          
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Location Selection */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="state-select" className="text-sm font-medium mb-2 block">
              State
            </Label>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger id="state-select">
                <SelectValue placeholder="Select your state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedState && (
            <div>
              <Label htmlFor="district-select" className="text-sm font-medium mb-2 block">
                Congressional District (Optional)
              </Label>
              <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger id="district-select">
                  <SelectValue placeholder="Select your district" />
                </SelectTrigger>
                <SelectContent>
                  {getDistrictsForState(selectedState).map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedState && (
            <div>
              <Label htmlFor="county-input" className="text-sm font-medium mb-2 block">
                County (Optional)
              </Label>
              <Input
                id="county-input"
                placeholder="Enter your county"
                value={selectedCounty}
                onChange={(e) => setSelectedCounty(e.target.value)}
              />
            </div>
          )}

          {selectedState && (
            <Button onClick={handleLocationUpdate} className="w-full">
              <Search className="h-4 w-4 mr-2" />
              Update Local Data
            </Button>
          )}
        </div>

        {/* Local Impact Metrics */}
        {localImpact && !loading && (
          <>
            <div className="space-y-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Community Activity in {impact.state}
                      {impact.district && ` - ${impact.district}`}
                    </h4>

              {/* Activity Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {impact.totalActivity?.toLocaleString?.() ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Activity</div>
                </div>

                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {impact.uniqueParticipants?.toLocaleString?.() ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Participants</div>
                </div>

                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {impact.expertParticipants ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Experts</div>
                </div>

                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {(impact.averageEngagement ?? 0).toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Engagement</div>
                </div>
              </div>

              {/* Bill Activity */}
              <div className="space-y-2">
                <h5 className="font-medium text-sm">Bill Activity</h5>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Discussed:</span>
                    <span className="font-medium">{impact.billsDiscussed ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Saved:</span>
                    <span className="font-medium">{impact.billsSaved ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Shared:</span>
                    <span className="font-medium">{impact.billsShared ?? 0}</span>
                  </div>
                </div>
              </div>

              {/* Campaigns and Petitions */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium text-sm">{impact.campaignsActive ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Active Campaigns</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-purple-600" />
                  <div>
                    <div className="font-medium text-sm">{impact.petitionsActive ?? 0}</div>
                    <div className="text-xs text-muted-foreground">Active Petitions</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Local Topics */}
            {impact.topTopics && impact.topTopics.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Trending Locally
                </h4>
                
                <div className="space-y-2">
                  {impact.topTopics.map((topic: { title: string; score: number; category: string }, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{topic.title}</div>
                          <Badge variant="outline" className="text-xs">
                            {topic.category}
                          </Badge>
                        </div>
                      </div>
                        <div className="text-sm font-medium text-primary">
                          {Math.round(topic.score * 100)}%
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Representatives */}
            {representatives.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Your Representatives
                </h4>
                
                <div className="space-y-3">
                  {representatives.map((rep) => (
                    <div key={rep.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h5 className="font-medium text-sm">{rep.name}</h5>
                          <p className="text-xs text-muted-foreground">
                            {rep.title}
                            {rep.district && ` - ${rep.district}`}
                          </p>
                        </div>
                        <Badge variant="secondary" className={getPartyColor(rep.party)}>
                          {rep.party}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {rep.phone && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${rep.phone}`}>
                              <span className="h-3 w-3 mr-1 inline-block">📞</span>
                              Call
                            </a>
                          </Button>
                        )}
                        
                        {rep.email && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`mailto:${rep.email}`}>
                              <Mail className="h-3 w-3 mr-1" />
                              Email
                            </a>
                          </Button>
                        )}
                        
                        {rep.website && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={rep.website} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Website
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading local data...</p>
            </div>
          </div>
        )}

        {/* No Location Selected */}
        {!selectedState && !loading && (
          <div className="text-center py-8 space-y-2">
            <MapPin className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Select your location to see local civic engagement data
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
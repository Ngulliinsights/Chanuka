import {
  ArrowRight,
  ArrowLeft,
  GitBranch,
  Link2,
  FileText,
  Users,
  Calendar,
  ExternalLink,
  Filter,
  Search,
} from 'lucide-react';
import React, { useState } from 'react';

import type { Bill } from '@client/features/bills/types';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Input } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/lib/design-system';
import { cn } from '@client/lib/design-system/utils/cn';

interface BillRelationshipsTabProps {
  bill: Bill;
}

interface RelatedBill {
  id: string;
  title: string;
  status: string;
  relationship: 'amendment' | 'companion' | 'predecessor' | 'successor' | 'related' | 'conflicting';
  relationshipDescription: string;
  introduced_date: string;
  sponsor: string;
  similarity_score?: number;
}

interface PolicyArea {
  name: string;
  bills: RelatedBill[];
  description: string;
}

const relationshipTypes = {
  amendment: {
    label: 'Amendment',
    icon: GitBranch,
    color: 'bg-blue-100 text-blue-800',
    description: 'Bills that modify or amend this bill',
  },
  companion: {
    label: 'Companion',
    icon: Link2,
    color: 'bg-green-100 text-green-800',
    description: 'Similar bills in other chambers or sessions',
  },
  predecessor: {
    label: 'Predecessor',
    icon: ArrowLeft,
    color: 'bg-purple-100 text-purple-800',
    description: 'Earlier versions or related bills',
  },
  successor: {
    label: 'Successor',
    icon: ArrowRight,
    color: 'bg-orange-100 text-orange-800',
    description: 'Follow-up or replacement bills',
  },
  related: {
    label: 'Related',
    icon: FileText,
    color: 'bg-gray-100 text-gray-800',
    description: 'Bills addressing similar policy areas',
  },
  conflicting: {
    label: 'Conflicting',
    icon: ExternalLink,
    color: 'bg-red-100 text-red-800',
    description: 'Bills with opposing or conflicting provisions',
  },
};

/**
 * BillRelationshipsTab Component
 *
 * Displays comprehensive bill relationship mapping including amendments,
 * companion bills, policy area connections, and sponsor networks.
 * Helps users understand the legislative ecosystem around a bill.
 */
export default function BillRelationshipsTab({ bill }: BillRelationshipsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('direct');

  // Mock related bills data - in production, this would come from the API
  const relatedBills: RelatedBill[] = [
    {
      id: 'HB-124',
      title: 'Climate Action Implementation Amendment Act',
      status: 'committee',
      relationship: 'amendment',
      relationshipDescription: 'Proposes amendments to strengthen enforcement mechanisms',
      introduced_date: '2024-02-20',
      sponsor: 'Hon. James Mwangi',
      similarity_score: 85,
    },
    {
      id: 'SB-67',
      title: 'Environmental Protection Enhancement Bill',
      status: 'active',
      relationship: 'companion',
      relationshipDescription: 'Senate companion bill with similar provisions',
      introduced_date: '2024-01-30',
      sponsor: 'Sen. Mary Achieng',
      similarity_score: 92,
    },
    {
      id: 'HB-89',
      title: 'Green Energy Transition Act 2023',
      status: 'passed',
      relationship: 'predecessor',
      relationshipDescription: 'Earlier legislation that this bill builds upon',
      introduced_date: '2023-11-15',
      sponsor: 'Hon. Peter Kimani',
      similarity_score: 78,
    },
    {
      id: 'HB-156',
      title: 'Carbon Tax Implementation Bill',
      status: 'introduced',
      relationship: 'related',
      relationshipDescription: 'Addresses complementary carbon pricing mechanisms',
      introduced_date: '2024-03-05',
      sponsor: 'Hon. Grace Wanjiru',
      similarity_score: 71,
    },
    {
      id: 'HB-178',
      title: 'Industrial Development Acceleration Act',
      status: 'committee',
      relationship: 'conflicting',
      relationshipDescription: 'Contains provisions that may conflict with environmental standards',
      introduced_date: '2024-02-28',
      sponsor: 'Hon. David Ochieng',
      similarity_score: 45,
    },
  ];

  // Mock policy areas data
  const policyAreas: PolicyArea[] = [
    {
      name: 'Environmental Protection',
      description: 'Bills related to environmental conservation and protection',
      bills: relatedBills.filter(b => ['HB-124', 'SB-67', 'HB-89'].includes(b.id)),
    },
    {
      name: 'Climate Change',
      description: 'Legislation addressing climate change mitigation and adaptation',
      bills: relatedBills.filter(b => ['HB-124', 'HB-156'].includes(b.id)),
    },
    {
      name: 'Energy Policy',
      description: 'Bills governing energy production, distribution, and regulation',
      bills: relatedBills.filter(b => ['HB-89', 'HB-156'].includes(b.id)),
    },
  ];

  // Filter related bills based on search and relationship type
  const filteredBills = relatedBills.filter(relatedBill => {
    const matchesSearch =
      searchQuery === '' ||
      relatedBill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      relatedBill.sponsor.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      relationshipFilter === 'all' || relatedBill.relationship === relationshipFilter;

    return matchesSearch && matchesFilter;
  });

  const renderRelatedBill = (relatedBill: RelatedBill) => {
    const relationshipConfig = relationshipTypes[relatedBill.relationship];
    const RelationshipIcon = relationshipConfig.icon;

    return (
      <Card key={relatedBill.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {relatedBill.id}
                </Badge>
                <Badge className={relationshipConfig.color}>
                  <RelationshipIcon className="h-3 w-3 mr-1" />
                  {relationshipConfig.label}
                </Badge>
                {relatedBill.similarity_score && (
                  <Badge variant="secondary" className="text-xs">
                    {relatedBill.similarity_score}% similar
                  </Badge>
                )}
              </div>
              <h4 className="font-semibold text-sm mb-1">{relatedBill.title}</h4>
              <p className="text-xs text-gray-600 mb-2">{relatedBill.relationshipDescription}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {relatedBill.sponsor}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(relatedBill.introduced_date).toLocaleDateString()}
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Relationship Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Bill Relationships Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(relationshipTypes).map(([key, config]) => {
              const count = relatedBills.filter(b => b.relationship === key).length;
              const Icon = config.icon;

              return (
                <div key={key} className="text-center p-3 border rounded-lg">
                  <Icon className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-600">{config.label}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search related bills..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by relationship" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Relationships</SelectItem>
            {Object.entries(relationshipTypes).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Relationship Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="direct">Direct Relations</TabsTrigger>
          <TabsTrigger value="policy">Policy Areas</TabsTrigger>
          <TabsTrigger value="network">Sponsor Network</TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-4">
          {filteredBills.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No related bills found</h3>
                  <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">{filteredBills.map(renderRelatedBill)}</div>
          )}
        </TabsContent>

        <TabsContent value="policy" className="space-y-4">
          {policyAreas.map(area => (
            <Card key={area.name}>
              <CardHeader>
                <CardTitle className="text-lg">{area.name}</CardTitle>
                <p className="text-sm text-gray-600">{area.description}</p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">{area.bills.map(renderRelatedBill)}</div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sponsor Network Analysis</CardTitle>
              <p className="text-sm text-gray-600">
                Bills sponsored by the same legislators or their frequent collaborators
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Network visualization would go here */}
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Network Visualization</h3>
                  <p className="text-gray-600 mb-4">
                    Interactive network graph showing sponsor relationships and collaboration
                    patterns
                  </p>
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Launch Network Viewer
                  </Button>
                </div>

                {/* Sponsor collaboration summary */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Frequent Collaborators</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Hon. James Mwangi</span>
                        <Badge variant="secondary">3 bills</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Sen. Mary Achieng</span>
                        <Badge variant="secondary">2 bills</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Hon. Grace Wanjiru</span>
                        <Badge variant="secondary">2 bills</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold mb-2">Policy Focus Areas</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Environmental Policy</span>
                        <Badge variant="secondary">65%</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Climate Change</span>
                        <Badge variant="secondary">45%</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Energy Policy</span>
                        <Badge variant="secondary">30%</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

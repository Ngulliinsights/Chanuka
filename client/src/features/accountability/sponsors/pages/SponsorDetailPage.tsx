/**
 * SponsorDetailPage Component
 * Detailed view of a single sponsor with all related information
 */

import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { Alert, AlertDescription } from '@client/lib/design-system';
import { LoadingSpinner } from '@client/lib/design-system';
import {
  ArrowLeft,
  User,
  Building,
  Eye,
  Shield,
  AlertTriangle,
  Phone,
  MapPin,
  Calendar,
} from 'lucide-react';

import {
  useSponsor,
  useSponsorAffiliations,
  useSponsorTransparency,
  useSponsorConflicts,
  useSponsorRiskProfile,
} from '../hooks';
import { ConflictVisualization } from '../ui/ConflictVisualization';
import { RiskProfile } from '../ui/RiskProfile';
import type { Sponsor } from '../types';

// ============================================================================
// Helper Functions
// ============================================================================

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
};

const formatCurrency = (amount?: number | null): string => {
  if (amount === null || amount === undefined) return 'N/A';
  if (amount >= 1000000) return `KSh ${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `KSh ${(amount / 1000).toFixed(0)}K`;
  return `KSh ${amount.toLocaleString()}`;
};

const formatPercentage = (value?: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${Math.round(value)}%`;
};

// ============================================================================
// Sub-Components
// ============================================================================

function SponsorHeader({ sponsor }: { sponsor: Sponsor }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-gray-500" />
            </div>
            <div>
              <CardTitle className="text-2xl">{sponsor.name}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">{sponsor.party}</Badge>
                {sponsor.role && <Badge variant="secondary">{sponsor.role}</Badge>}
                {!sponsor.is_active && <Badge variant="destructive">Inactive</Badge>}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Contact Information</h3>
            {sponsor.constituency && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{sponsor.constituency}</span>
              </div>
            )}
            {sponsor.contact_info && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{sponsor.contact_info}</span>
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Key Metrics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Transparency Score:</span>
                <span className="font-medium">{formatPercentage(sponsor.transparency_score)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Financial Exposure:</span>
                <span className="font-medium">{formatCurrency(sponsor.financial_exposure)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Voting Alignment:</span>
                <span className="font-medium">{formatPercentage(sponsor.voting_alignment)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Created:</span>
                <span>{formatDate(sponsor.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Updated:</span>
                <span>{formatDate(sponsor.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AffiliationsTab({ sponsorId }: { sponsorId: string | number }) {
  const { data: affiliations, isLoading, error } = useSponsorAffiliations(sponsorId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
        <span className="ml-2">Loading affiliations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load affiliations.</AlertDescription>
      </Alert>
    );
  }

  if (!affiliations || affiliations.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Affiliations</h3>
          <p className="text-gray-600">This sponsor has no recorded organizational affiliations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {affiliations.map(affiliation => (
        <Card key={affiliation.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{affiliation.organization}</CardTitle>
                {affiliation.role && <p className="text-gray-600 mt-1">{affiliation.role}</p>}
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{affiliation.type}</Badge>
                {affiliation.conflictType && (
                  <Badge variant="secondary">{affiliation.conflictType}</Badge>
                )}
                {affiliation.is_active && <Badge variant="default">Active</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Start Date:</span>
                <span className="ml-2">{formatDate(affiliation.start_date)}</span>
              </div>
              <div>
                <span className="text-gray-600">End Date:</span>
                <span className="ml-2">{formatDate(affiliation.end_date)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TransparencyTab({ sponsorId }: { sponsorId: string | number }) {
  const { data: transparency, isLoading, error } = useSponsorTransparency(sponsorId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
        <span className="ml-2">Loading transparency records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Failed to load transparency records.</AlertDescription>
      </Alert>
    );
  }

  if (!transparency || transparency.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Transparency Records</h3>
          <p className="text-gray-600">This sponsor has no recorded transparency disclosures.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {transparency.map(record => (
        <Card key={record.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{record.disclosureType || 'Disclosure'}</CardTitle>
                <p className="text-gray-700 mt-1">{record.description}</p>
              </div>
              <div className="flex gap-2">
                {record.is_verified && <Badge variant="default">Verified</Badge>}
                {record.amount && <Badge variant="outline">{formatCurrency(record.amount)}</Badge>}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {record.source && (
                <div>
                  <span className="text-gray-600">Source:</span>
                  <span className="ml-2">{record.source}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Date Reported:</span>
                <span className="ml-2">{formatDate(record.dateReported)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SponsorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: sponsor, isLoading, error } = useSponsor(id);
  const { data: conflicts } = useSponsorConflicts(id);
  const { data: riskProfile } = useSponsorRiskProfile(id);

  const handleBack = () => {
    navigate('/sponsors');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600">Loading sponsor details...</span>
      </div>
    );
  }

  if (error || !sponsor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load sponsor details. The sponsor may not exist or there was an error.
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={handleBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sponsors
        </Button>
      </div>
    );
  }

  const conflictCount = conflicts?.length || 0;
  const riskLevel = riskProfile?.level || 'low';

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sponsors
        </Button>
        <div className="flex gap-2">
          {conflictCount > 0 && (
            <Badge variant="destructive">
              {conflictCount} conflict{conflictCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {riskProfile && (
            <Badge
              variant={
                riskLevel === 'critical' || riskLevel === 'high' ? 'destructive' : 'secondary'
              }
            >
              {riskLevel.toUpperCase()} RISK
            </Badge>
          )}
        </div>
      </div>

      {/* Sponsor Header */}
      <SponsorHeader sponsor={sponsor} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <User className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="affiliations">
            <Building className="h-4 w-4 mr-2" />
            Affiliations
          </TabsTrigger>
          <TabsTrigger value="transparency">
            <Eye className="h-4 w-4 mr-2" />
            Transparency
          </TabsTrigger>
          <TabsTrigger value="conflicts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Conflicts ({conflictCount})
          </TabsTrigger>
          <TabsTrigger value="risk-profile">
            <Shield className="h-4 w-4 mr-2" />
            Risk Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Sponsor Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Political Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Party:</span>
                      <span>{sponsor.party}</span>
                    </div>
                    {sponsor.role && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Role:</span>
                        <span>{sponsor.role}</span>
                      </div>
                    )}
                    {sponsor.constituency && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Constituency:</span>
                        <span>{sponsor.constituency}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span>{sponsor.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Performance Metrics</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Transparency Score:</span>
                      <span>{formatPercentage(sponsor.transparency_score)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Financial Exposure:</span>
                      <span>{formatCurrency(sponsor.financial_exposure)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Voting Alignment:</span>
                      <span>{formatPercentage(sponsor.voting_alignment)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="affiliations">
          <AffiliationsTab sponsorId={id!} />
        </TabsContent>

        <TabsContent value="transparency">
          <TransparencyTab sponsorId={id!} />
        </TabsContent>

        <TabsContent value="conflicts">
          <ConflictVisualization sponsorId={id!} sponsorName={sponsor.name} />
        </TabsContent>

        <TabsContent value="risk-profile">
          <RiskProfile sponsorId={id!} sponsorName={sponsor.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SponsorDetailPage;

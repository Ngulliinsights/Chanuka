import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export function SponsorshipOverviewWrapper() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sponsorship Overview</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Overview for Bill #{id}</CardTitle>
          <CardDescription>Complete sponsorship analysis overview</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Sponsorship overview coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function PrimarySponsorWrapper() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Primary Sponsor</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Primary Sponsor for Bill #{id}</CardTitle>
          <CardDescription>Detailed analysis of the primary sponsor</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Primary sponsor analysis coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function CoSponsorsWrapper() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Co-Sponsors</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Co-Sponsors for Bill #{id}</CardTitle>
          <CardDescription>Analysis of all co-sponsors</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Co-sponsors analysis coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function FinancialNetworkWrapper() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Financial Network</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Financial Network for Bill #{id}</CardTitle>
          <CardDescription>Financial connections and influence mapping</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Financial network analysis coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function MethodologyWrapper() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Methodology</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Analysis Methodology for Bill #{id}</CardTitle>
          <CardDescription>How we analyze sponsorship and financial data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Methodology documentation coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}


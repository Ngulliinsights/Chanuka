import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function BillSponsorshipAnalysis() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sponsorship Analysis</h1>

      <Card>
        <CardHeader>
          <CardTitle>Sponsorship Analysis {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>Financial and political sponsor analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Sponsorship analysis coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}

export const SponsorshipOverviewWrapper: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Sponsorship Overview</h1>

      <Card>
        <CardHeader>
          <CardTitle>Overview {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>High-level sponsorship analysis summary</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Overview analysis content...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const PrimarySponsorWrapper: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Primary Sponsor Analysis</h1>

      <Card>
        <CardHeader>
          <CardTitle>Primary Sponsor {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>Analysis of the primary bill sponsor</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Primary sponsor analysis content...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const CoSponsorsWrapper: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Co-Sponsors Analysis</h1>

      <Card>
        <CardHeader>
          <CardTitle>Co-Sponsors {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>Analysis of co-sponsors and their relationships</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Co-sponsors analysis content...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const FinancialNetworkWrapper: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Financial Network Analysis</h1>

      <Card>
        <CardHeader>
          <CardTitle>Financial Network {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>Analysis of financial connections and funding</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Financial network analysis content...</p>
        </CardContent>
      </Card>
    </div>
  );
};

export const MethodologyWrapper: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Analysis Methodology</h1>

      <Card>
        <CardHeader>
          <CardTitle>Methodology {id ? `for Bill #${id}` : ''}</CardTitle>
          <CardDescription>How the sponsorship analysis is conducted</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Methodology explanation...</p>
        </CardContent>
      </Card>
    </div>
  );
};


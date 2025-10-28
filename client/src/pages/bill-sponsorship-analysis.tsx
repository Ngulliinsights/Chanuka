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


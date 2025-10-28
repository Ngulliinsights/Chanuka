import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function BillAnalysis() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Bill Analysis</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Analysis for Bill #{id}</CardTitle>
          <CardDescription>Comprehensive analysis and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Bill analysis coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}


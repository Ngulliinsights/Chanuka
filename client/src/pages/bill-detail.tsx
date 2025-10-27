import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function BillDetail() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Bill Details</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Bill #{id}</CardTitle>
          <CardDescription>Detailed information about this bill</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Bill details coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
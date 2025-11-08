import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { PretextDetectionPanel } from '../features/pretext-detection/components/PretextDetectionPanel';

export default function BillDetail() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Bill Details</h1>
      
      <div className="space-y-6">
        {/* Basic Bill Information */}
        <Card>
          <CardHeader>
            <CardTitle>Bill #{id}</CardTitle>
            <CardDescription>Detailed information about this bill</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Bill details coming soon...</p>
          </CardContent>
        </Card>

        {/* Pretext Detection & Civic Remediation */}
        {id && (
          <PretextDetectionPanel 
            billId={id} 
            billTitle={`Bill #${id}`}
          />
        )}
      </div>
    </div>
  );
}


import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function CommunityInput() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Community Input</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Share Your Voice</CardTitle>
          <CardDescription>Participate in legislative discussions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Community features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}


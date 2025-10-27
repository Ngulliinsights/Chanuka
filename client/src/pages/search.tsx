import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function SearchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Search</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Search Legislation</CardTitle>
          <CardDescription>Find bills, sponsors, and analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Search functionality coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>System Administration</CardTitle>
          <CardDescription>Manage platform settings and data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Admin features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}


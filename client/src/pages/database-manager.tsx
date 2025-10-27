import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function DatabaseManager() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Database Manager</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Database Administration</CardTitle>
          <CardDescription>Manage database operations and maintenance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Database management tools coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracked Bills</CardTitle>
            <CardDescription>Bills you're following</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No bills tracked yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Updates and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No new notifications</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
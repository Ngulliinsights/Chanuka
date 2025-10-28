import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Chanuka Platform
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Legislative transparency and civic engagement platform for informed democracy
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Bills Dashboard</CardTitle>
            <CardDescription>
              Browse and analyze current legislation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/bills">
              <Button className="w-full">View Bills</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Community Input</CardTitle>
            <CardDescription>
              Share your thoughts on legislation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/community">
              <Button className="w-full">Join Discussion</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expert Verification</CardTitle>
            <CardDescription>
              Get verified expert analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/expert-verification">
              <Button className="w-full">Learn More</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
        <div className="space-x-4">
          <Link to="/dashboard">
            <Button size="lg">Go to Dashboard</Button>
          </Link>
          <Link to="/auth">
            <Button variant="outline" size="lg">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}


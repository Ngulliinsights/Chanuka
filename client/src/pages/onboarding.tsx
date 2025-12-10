import React from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';

export default function Onboarding() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Welcome to Chanuka Platform</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Explore</CardTitle>
            <CardDescription>Discover how legislative transparency works</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Learn about bills, sponsors, and civic engagement.</p>
            <Link to="/bills">
              <Button>Browse Bills</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Engage</CardTitle>
            <CardDescription>Join the community discussion</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Share your thoughts and connect with others.</p>
            <Link to="/community">
              <Button>Join Community</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3: Stay Informed</CardTitle>
            <CardDescription>Track legislation that matters to you</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Set up alerts and follow important bills.</p>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, Users, MessageSquare, Shield } from 'lucide-react';

export default function Home() {
  console.log('Home component mounted');

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Democracy in Action
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Track legislation, participate in democracy, and make your voice heard. 
          Stay informed about bills that affect your community.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Button asChild size="lg">
            <Link to="/bills">
              <TrendingUp className="mr-2 h-5 w-5" />
              Explore Bills
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/community-input">
              <MessageSquare className="mr-2 h-5 w-5" />
              Join Discussion
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Bills</p>
                <p className="text-2xl font-bold">127</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Community Members</p>
                <p className="text-2xl font-bold">8,432</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Public Comments</p>
                <p className="text-2xl font-bold">2,854</p>
              </div>
              <MessageSquare className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expert Reviews</p>
                <p className="text-2xl font-bold">293</p>
              </div>
              <Shield className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call to Action */}
      <section className="bg-blue-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to Make Your Voice Heard?
        </h2>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Join thousands of engaged citizens who are actively participating in the democratic process.
        </p>
        <div className="flex justify-center gap-4">
          <Button size="lg" asChild>
            <Link to="/community-input">
              Start Contributing
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/dashboard">
              View Dashboard
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
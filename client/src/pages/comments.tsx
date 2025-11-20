import React from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/components/ui/card';

export default function CommentsPage() {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Comments</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Comments for Bill #{id}</CardTitle>
          <CardDescription>Community discussion and feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Comments section coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}


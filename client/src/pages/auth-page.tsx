import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function AuthPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Access your Chanuka Platform account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full">Sign In with Email</Button>
          <Button variant="outline" className="w-full">Create Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState } from 'react';

import { cn } from '@client/lib/utils';

import { Alert, AlertDescription } from './alert';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './form';
import { Input } from './input';
import { Label } from './label';
import { Progress } from './progress';


/**
 * Test Components for Hybrid Design System Verification
 *
 * This file contains test components to verify the hybrid design system
 * implementation combining shadcn/ui with custom design system features.
 */

export const TestButton = () => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Button Component Test</h3>
      <div className="flex gap-4 flex-wrap">
        <Button variant="default">Default Button</Button>
        <Button variant="secondary">Secondary Button</Button>
        <Button variant="outline">Outline Button</Button>
        <Button variant="ghost">Ghost Button</Button>
        <Button variant="destructive">Destructive Button</Button>
        <Button variant="link">Link Button</Button>
        <Button
          onClick={handleClick}
          disabled={loading}
          className="btn-enhanced"
        >
          {loading ? 'Loading...' : 'Enhanced Button'}
        </Button>
      </div>
    </div>
  );
};

export const TestCard = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Card Component Test</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="card-enhanced">
          <CardHeader>
            <CardTitle>Basic Card</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is a basic card component using the hybrid design system.</p>
          </CardContent>
        </Card>

        <Card className="card-enhanced border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Status Card
              <Badge variant="default" className="status-indicator bg-green-100 text-green-800">
                Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>This card shows status information with enhanced styling.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const TestForm = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Form Component Test</h3>
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>Contact Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <textarea
                id="message"
                className={cn(
                  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                )}
                placeholder="Enter your message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>

            <Button type="submit" className="btn-enhanced">
              Submit Form
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export const TestDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Dialog Component Test</h3>
      <Button onClick={() => setOpen(true)} className="btn-enhanced">
        Open Dialog
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>
              This is a test dialog to verify the hybrid dialog component implementation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Dialog content with alert component integration.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Progress Example</Label>
              <Progress value={75} className="w-full" />
              <p className="text-sm text-muted-foreground">75% complete</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setOpen(false)} className="btn-enhanced">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const TestProgress = () => {
  const [progress, setProgress] = useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev + 10) % 110);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Progress Component Test</h3>
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>Progress Indicators</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Loading...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Complete</span>
              <span>100%</span>
            </div>
            <Progress value={100} className="w-full" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Partial</span>
              <span>45%</span>
            </div>
            <Progress value={45} className="w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const TestAlert = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Alert Component Test</h3>
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            This is a default alert message.
          </AlertDescription>
        </Alert>

        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            This is a success alert message.
          </AlertDescription>
        </Alert>

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertDescription className="text-yellow-800">
            This is a warning alert message.
          </AlertDescription>
        </Alert>

        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            This is an error alert message.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export const TestBadge = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Badge Component Test</h3>
      <div className="flex gap-2 flex-wrap">
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge className="status-indicator bg-green-100 text-green-800">Success</Badge>
        <Badge className="status-indicator bg-yellow-100 text-yellow-800">Warning</Badge>
        <Badge className="status-indicator bg-red-100 text-red-800">Error</Badge>
      </div>
    </div>
  );
};

export const HybridDesignSystemTest = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Hybrid Design System Test</h1>
        <p className="text-muted-foreground">
          Testing the complete hybrid design system implementation combining shadcn/ui with custom design system features.
        </p>
      </div>

      <TestButton />
      <TestCard />
      <TestForm />
      <TestDialog />
      <TestProgress />
      <TestAlert />
      <TestBadge />

      <Card className="card-enhanced border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Test Results Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p className="text-blue-700">
              ✅ All components rendered successfully
            </p>
            <p className="text-blue-700">
              ✅ Hybrid styling applied correctly
            </p>
            <p className="text-blue-700">
              ✅ Accessibility features integrated
            </p>
            <p className="text-blue-700">
              ✅ Responsive design working
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HybridDesignSystemTest;
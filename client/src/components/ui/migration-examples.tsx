/**
 * Migration Examples for SimpleTool Hybrid Design System
 *
 * This file demonstrates how to migrate from custom components to hybrid components
 * that combine shadcn/ui with the existing design system.
 */

import React from 'react';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { Input } from './input';
import { Label } from './label';
import { Badge } from './badge';
import { Progress } from './progress';
import { Alert, AlertDescription } from './alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from './form';
import { cn } from '../../lib/utils';

/**
 * BEFORE: Custom Button Implementation
 * This shows how buttons were implemented before the hybrid system
 */
export const LegacyButtonExample = () => {
  return (
    <button className="chanuka-btn chanuka-btn-primary">
      Legacy Button
    </button>
  );
};

/**
 * AFTER: Hybrid Button Implementation
 * This shows the improved hybrid approach using shadcn/ui + custom features
 */
export const HybridButtonExample = () => {
  return (
    <Button variant="default" className="btn-enhanced">
      Hybrid Button
    </Button>
  );
};

/**
 * BEFORE: Custom Form Implementation
 */
export const LegacyFormExample = () => {
  return (
    <form className="space-y-4">
      <div>
        <label className="chanuka-label">Email</label>
        <input
          type="email"
          className="chanuka-input"
          placeholder="Enter your email"
        />
      </div>
      <button type="submit" className="chanuka-btn chanuka-btn-primary">
        Submit
      </button>
    </form>
  );
};

/**
 * AFTER: Hybrid Form Implementation
 */
export const HybridFormExample = () => {
  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="Enter your email" />
      </div>
      <Button type="submit" className="btn-enhanced">
        Submit
      </Button>
    </form>
  );
};

/**
 * BEFORE: Custom Card Implementation
 */
export const LegacyCardExample = () => {
  return (
    <div className="chanuka-card">
      <div className="chanuka-card-header">
        <h3 className="chanuka-card-title">Card Title</h3>
      </div>
      <div className="chanuka-card-content">
        <p>Card content goes here.</p>
      </div>
    </div>
  );
};

/**
 * AFTER: Hybrid Card Implementation
 */
export const HybridCardExample = () => {
  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Card content goes here.</p>
      </CardContent>
    </Card>
  );
};

/**
 * BEFORE: Custom Status Card
 */
export const LegacyStatusCardExample = () => {
  return (
    <div className="chanuka-card chanuka-status-success">
      <div className="chanuka-card-header">
        <h3 className="chanuka-card-title">Success Status</h3>
        <span className="chanuka-status-badge chanuka-status-success">Active</span>
      </div>
      <div className="chanuka-card-content">
        <p>Everything is working correctly.</p>
      </div>
    </div>
  );
};

/**
 * AFTER: Hybrid Status Card
 */
export const HybridStatusCardExample = () => {
  return (
    <Card className="card-enhanced border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Success Status
          <Badge variant="default" className="status-indicator bg-green-100 text-green-800">
            Active
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>Everything is working correctly.</p>
      </CardContent>
    </Card>
  );
};

/**
 * BEFORE: Custom Progress Component
 */
export const LegacyProgressExample = () => {
  return (
    <div className="chanuka-progress">
      <div className="chanuka-progress-bar" style={{ width: '75%' }}></div>
    </div>
  );
};

/**
 * AFTER: Hybrid Progress Component
 */
export const HybridProgressExample = () => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Progress</span>
        <span>75%</span>
      </div>
      <Progress value={75} className="w-full" />
    </div>
  );
};

/**
 * BEFORE: Custom Alert Component
 */
export const LegacyAlertExample = () => {
  return (
    <div className="chanuka-alert chanuka-alert-warning">
      <p>This is a warning message.</p>
    </div>
  );
};

/**
 * AFTER: Hybrid Alert Component
 */
export const HybridAlertExample = () => {
  return (
    <Alert>
      <AlertDescription>
        This is a warning message.
      </AlertDescription>
    </Alert>
  );
};

/**
 * BEFORE: Custom Modal/Dialog
 */
export const LegacyModalExample = () => {
  return (
    <div className="chanuka-modal-overlay">
      <div className="chanuka-modal">
        <div className="chanuka-modal-header">
          <h2>Modal Title</h2>
        </div>
        <div className="chanuka-modal-content">
          <p>Modal content here.</p>
        </div>
        <div className="chanuka-modal-footer">
          <button className="chanuka-btn chanuka-btn-secondary">Cancel</button>
          <button className="chanuka-btn chanuka-btn-primary">Confirm</button>
        </div>
      </div>
    </div>
  );
};

/**
 * AFTER: Hybrid Modal/Dialog
 */
export const HybridModalExample = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modal Title</DialogTitle>
          <DialogDescription>
            Modal content here.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Migration Showcase Component
 * Demonstrates side-by-side comparison of legacy vs hybrid implementations
 */
export const MigrationShowcase = () => {
  return (
    <div className="space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Design System Migration</h1>
        <p className="text-muted-foreground">
          Comparing legacy custom components with hybrid shadcn/ui implementations
        </p>
      </div>

      {/* Button Comparison */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Button Components</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Legacy Implementation</CardTitle>
            </CardHeader>
            <CardContent>
              <LegacyButtonExample />
              <pre className="mt-4 text-xs bg-muted p-2 rounded">
{`<button className="chanuka-btn chanuka-btn-primary">
  Legacy Button
</button>`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hybrid Implementation</CardTitle>
            </CardHeader>
            <CardContent>
              <HybridButtonExample />
              <pre className="mt-4 text-xs bg-muted p-2 rounded">
{`<Button variant="default" className="btn-enhanced">
  Hybrid Button
</Button>`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Form Comparison */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Components</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Legacy Form</CardTitle>
            </CardHeader>
            <CardContent>
              <LegacyFormExample />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hybrid Form</CardTitle>
            </CardHeader>
            <CardContent>
              <HybridFormExample />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits Summary */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Migration Benefits</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Accessibility</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                WCAG 2.1 AA compliance with proper ARIA attributes and keyboard navigation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consistency</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Standardized component APIs and behaviors across the application
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Maintainability</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Well-tested, community-supported components with clear upgrade paths
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

// Export all examples
// Components are already exported above
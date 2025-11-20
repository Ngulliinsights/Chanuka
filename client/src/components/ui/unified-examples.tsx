/**
 * Unified Component Usage Examples
 * Demonstrates best practices for using the unified component system
 */

import React from 'react';
import {
  UnifiedButton,
  UnifiedCard,
  UnifiedCardHeader,
  UnifiedCardTitle,
  UnifiedCardDescription,
  UnifiedCardContent,
  UnifiedCardFooter,
  UnifiedBadge
} from './unified-components';

// =============================================================================
// BUTTON EXAMPLES
// =============================================================================

export function ButtonExamples() {
  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold mb-4">Button Examples</h2>
      
      {/* Primary Actions */}
      <div className="space-x-2">
        <UnifiedButton variant="primary">Primary Action</UnifiedButton>
        <UnifiedButton variant="secondary">Secondary Action</UnifiedButton>
        <UnifiedButton variant="accent">Accent Action</UnifiedButton>
      </div>
      
      {/* Semantic Actions */}
      <div className="space-x-2">
        <UnifiedButton variant="success">Save Changes</UnifiedButton>
        <UnifiedButton variant="warning">Warning Action</UnifiedButton>
        <UnifiedButton variant="error">Delete Item</UnifiedButton>
      </div>
      
      {/* Subtle Actions */}
      <div className="space-x-2">
        <UnifiedButton variant="outline">Cancel</UnifiedButton>
        <UnifiedButton variant="ghost">Ghost Button</UnifiedButton>
      </div>
      
      {/* Sizes */}
      <div className="space-x-2 items-center flex">
        <UnifiedButton size="sm">Small</UnifiedButton>
        <UnifiedButton size="default">Default</UnifiedButton>
        <UnifiedButton size="lg">Large</UnifiedButton>
        <UnifiedButton size="icon">🔍</UnifiedButton>
      </div>
      
      {/* States */}
      <div className="space-x-2">
        <UnifiedButton disabled>Disabled</UnifiedButton>
        <UnifiedButton className="loading">Loading...</UnifiedButton>
      </div>
    </div>
  );
}

// =============================================================================
// CARD EXAMPLES
// =============================================================================

export function CardExamples() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold mb-4">Card Examples</h2>
      
      {/* Basic Card */}
      <UnifiedCard className="max-w-md">
        <UnifiedCardHeader>
          <UnifiedCardTitle>Basic Card</UnifiedCardTitle>
          <UnifiedCardDescription>
            A simple card with header, content, and footer sections.
          </UnifiedCardDescription>
        </UnifiedCardHeader>
        <UnifiedCardContent>
          <p>This is the main content area of the card.</p>
        </UnifiedCardContent>
        <UnifiedCardFooter>
          <UnifiedButton variant="primary">Action</UnifiedButton>
          <UnifiedButton variant="outline">Cancel</UnifiedButton>
        </UnifiedCardFooter>
      </UnifiedCard>
      
      {/* Interactive Card */}
      <UnifiedCard className="max-w-md cursor-pointer hover:shadow-lg transition-shadow">
        <UnifiedCardHeader>
          <div className="flex justify-between items-start">
            <div>
              <UnifiedCardTitle>Interactive Card</UnifiedCardTitle>
              <UnifiedCardDescription>
                Click anywhere on this card
              </UnifiedCardDescription>
            </div>
            <UnifiedBadge variant="success">New</UnifiedBadge>
          </div>
        </UnifiedCardHeader>
        <UnifiedCardContent>
          <p>This card responds to hover and click interactions.</p>
        </UnifiedCardContent>
      </UnifiedCard>
      
      {/* Content-only Card */}
      <UnifiedCard className="max-w-md">
        <UnifiedCardContent>
          <h3 className="font-semibold mb-2">Content-only Card</h3>
          <p>Sometimes you just need a simple container without headers or footers.</p>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  );
}

// =============================================================================
// BADGE EXAMPLES
// =============================================================================

export function BadgeExamples() {
  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-bold mb-4">Badge Examples</h2>
      
      {/* Status Badges */}
      <div className="space-x-2">
        <UnifiedBadge variant="default">Default</UnifiedBadge>
        <UnifiedBadge variant="secondary">Secondary</UnifiedBadge>
        <UnifiedBadge variant="success">Success</UnifiedBadge>
        <UnifiedBadge variant="warning">Warning</UnifiedBadge>
        <UnifiedBadge variant="error">Error</UnifiedBadge>
        <UnifiedBadge variant="outline">Outline</UnifiedBadge>
      </div>
      
      {/* In Context */}
      <div className="flex items-center space-x-2">
        <span>Status:</span>
        <UnifiedBadge variant="success">Active</UnifiedBadge>
      </div>
      
      <div className="flex items-center space-x-2">
        <span>Priority:</span>
        <UnifiedBadge variant="error">High</UnifiedBadge>
      </div>
      
      <div className="flex items-center space-x-2">
        <span>Category:</span>
        <UnifiedBadge variant="outline">Healthcare</UnifiedBadge>
      </div>
    </div>
  );
}

// =============================================================================
// COMPOSITION EXAMPLES
// =============================================================================

export function CompositionExamples() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold mb-4">Composition Examples</h2>
      
      {/* Bill Card Example */}
      <UnifiedCard className="max-w-2xl">
        <UnifiedCardHeader>
          <div className="flex justify-between items-start">
            <div>
              <UnifiedCardTitle className="text-lg">
                Healthcare Reform Act 2024
              </UnifiedCardTitle>
              <UnifiedCardDescription>
                Introduced by Rep. Johnson • Last updated 2 hours ago
              </UnifiedCardDescription>
            </div>
            <div className="flex space-x-2">
              <UnifiedBadge variant="warning">In Committee</UnifiedBadge>
              <UnifiedBadge variant="outline">Healthcare</UnifiedBadge>
            </div>
          </div>
        </UnifiedCardHeader>
        <UnifiedCardContent>
          <p className="text-sm text-[hsl(var(--color-muted-foreground))] mb-4">
            This bill aims to expand healthcare coverage and reduce costs for American families...
          </p>
          <div className="flex items-center space-x-4 text-sm">
            <span>💬 24 comments</span>
            <span>👥 Active discussion</span>
            <span>⭐ 89% support</span>
          </div>
        </UnifiedCardContent>
        <UnifiedCardFooter>
          <UnifiedButton variant="primary">View Details</UnifiedButton>
          <UnifiedButton variant="outline">Add Comment</UnifiedButton>
          <UnifiedButton variant="ghost">Share</UnifiedButton>
        </UnifiedCardFooter>
      </UnifiedCard>
      
      {/* Expert Verification Example */}
      <UnifiedCard className="max-w-md">
        <UnifiedCardContent>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[hsl(var(--color-muted))] rounded-full flex items-center justify-center">
              👨‍⚕️
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Dr. Sarah Johnson</span>
                <UnifiedBadge variant="success">Verified Expert</UnifiedBadge>
              </div>
              <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
                Healthcare Policy Specialist
              </p>
            </div>
          </div>
        </UnifiedCardContent>
      </UnifiedCard>
      
      {/* Action Panel Example */}
      <UnifiedCard className="max-w-md">
        <UnifiedCardHeader>
          <UnifiedCardTitle>Quick Actions</UnifiedCardTitle>
          <UnifiedCardDescription>
            Common tasks for this bill
          </UnifiedCardDescription>
        </UnifiedCardHeader>
        <UnifiedCardContent className="space-y-2">
          <UnifiedButton variant="outline" className="w-full justify-start">
            📊 View Analysis
          </UnifiedButton>
          <UnifiedButton variant="outline" className="w-full justify-start">
            💬 Join Discussion
          </UnifiedButton>
          <UnifiedButton variant="outline" className="w-full justify-start">
            📧 Contact Representative
          </UnifiedButton>
          <UnifiedButton variant="outline" className="w-full justify-start">
            🔔 Set Alerts
          </UnifiedButton>
        </UnifiedCardContent>
      </UnifiedCard>
    </div>
  );
}

// =============================================================================
// RESPONSIVE EXAMPLES
// =============================================================================

export function ResponsiveExamples() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold mb-4">Responsive Examples</h2>
      
      {/* Mobile-first Button Group */}
      <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
        <UnifiedButton variant="primary" className="w-full md:w-auto">
          Primary Action
        </UnifiedButton>
        <UnifiedButton variant="outline" className="w-full md:w-auto">
          Secondary Action
        </UnifiedButton>
      </div>
      
      {/* Responsive Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <UnifiedCard key={i}>
            <UnifiedCardHeader>
              <UnifiedCardTitle>Card {i}</UnifiedCardTitle>
              <UnifiedCardDescription>
                Responsive card in a grid layout
              </UnifiedCardDescription>
            </UnifiedCardHeader>
            <UnifiedCardContent>
              <p>Content adapts to screen size</p>
            </UnifiedCardContent>
          </UnifiedCard>
        ))}
      </div>
      
      {/* Touch-friendly Mobile Actions */}
      <div className="md:hidden">
        <UnifiedCard>
          <UnifiedCardContent className="space-y-3">
            <UnifiedButton 
              variant="primary" 
              size="lg" 
              className="w-full"
            >
              Large Touch-friendly Button
            </UnifiedButton>
            <div className="grid grid-cols-2 gap-2">
              <UnifiedButton variant="outline" size="lg">
                Action 1
              </UnifiedButton>
              <UnifiedButton variant="outline" size="lg">
                Action 2
              </UnifiedButton>
            </div>
          </UnifiedCardContent>
        </UnifiedCard>
      </div>
    </div>
  );
}

// =============================================================================
// ACCESSIBILITY EXAMPLES
// =============================================================================

export function AccessibilityExamples() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold mb-4">Accessibility Examples</h2>
      
      {/* Proper Button Usage */}
      <div className="space-y-2">
        <UnifiedButton 
          variant="primary"
          aria-label="Save your changes to the document"
        >
          Save
        </UnifiedButton>
        
        <UnifiedButton 
          variant="error"
          aria-describedby="delete-warning"
        >
          Delete
        </UnifiedButton>
        <p id="delete-warning" className="text-sm text-[hsl(var(--color-error))]">
          This action cannot be undone
        </p>
      </div>
      
      {/* Semantic Card Structure */}
      <UnifiedCard role="article" aria-labelledby="article-title">
        <UnifiedCardHeader>
          <UnifiedCardTitle id="article-title">
            Accessible Card Example
          </UnifiedCardTitle>
          <UnifiedCardDescription>
            This card uses proper ARIA attributes and semantic structure
          </UnifiedCardDescription>
        </UnifiedCardHeader>
        <UnifiedCardContent>
          <p>Screen readers can navigate this content effectively.</p>
        </UnifiedCardContent>
        <UnifiedCardFooter>
          <UnifiedButton 
            variant="primary"
            aria-label="Read full article about accessibility"
          >
            Read More
          </UnifiedButton>
        </UnifiedCardFooter>
      </UnifiedCard>
      
      {/* Status Badges with Screen Reader Support */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span>Bill Status:</span>
          <UnifiedBadge 
            variant="success"
            role="status"
            aria-label="Bill status: passed committee review"
          >
            Passed Committee
          </UnifiedBadge>
        </div>
        
        <div className="flex items-center space-x-2">
          <span>Expert Verification:</span>
          <UnifiedBadge 
            variant="success"
            role="img"
            aria-label="Verified by healthcare expert"
          >
            ✓ Expert Verified
          </UnifiedBadge>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN EXAMPLES COMPONENT
// =============================================================================

export default function UnifiedComponentExamples() {
  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">
        Unified Component System Examples
      </h1>
      
      <div className="space-y-12">
        <ButtonExamples />
        <CardExamples />
        <BadgeExamples />
        <CompositionExamples />
        <ResponsiveExamples />
        <AccessibilityExamples />
      </div>
    </div>
  );
}
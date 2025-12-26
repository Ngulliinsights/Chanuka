import React from 'react';
import { ChevronDown, ChevronRight, Clock, MapPin, ArrowRight, Menu } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

import { cn } from '@client/lib/utils';

import { Button } from '@client/shared/design-system/interactive/Button.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@client/shared/design-system/interactive/Collapsible.tsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../dropdown-menu';
import { Progress } from '@client/shared/design-system/feedback/Progress.tsx';

// Types for progressive disclosure navigation
export interface NavigationSection {
  id: string;
  title: string;
  complexity: 1 | 2 | 3; // 1-3 dots for reading time
  estimatedReadTime: number; // in minutes
  isRequired?: boolean;
  subsections?: NavigationSection[];
  content?: React.ReactNode;
}

export interface ReadingPath {
  id: string;
  title: string;
  description: string;
  sections: string[]; // section IDs in recommended order
  estimatedTotalTime: number;
}

interface ProgressiveDisclosureNavigationProps {
  sections: NavigationSection[];
  readingPaths?: ReadingPath[];
  currentSectionId?: string;
  onSectionChange?: (sectionId: string) => void;
  className?: string;
}

// Complexity indicator component
const ComplexityIndicator: React.FC<{ complexity: 1 | 2 | 3; className?: string }> = ({ 
  complexity, 
  className 
}) => (
  <div className={cn("flex items-center gap-1", className)} aria-label={`Complexity level ${complexity} out of 3`}>
    {Array.from({ length: 3 }, (_, i) => (
      <div
        key={i}
        className={cn(
          "w-1.5 h-1.5 rounded-full transition-colors",
          i < complexity 
            ? "bg-primary" 
            : "bg-gray-300"
        )}
      />
    ))}
  </div>
);

// Reading time indicator component
const ReadingTimeIndicator: React.FC<{ minutes: number; className?: string }> = ({ 
  minutes, 
  className 
}) => (
  <div className={cn("flex items-center gap-1 text-sm text-gray-600", className)}>
    <Clock className="w-3 h-3" />
    <span>{minutes} min read</span>
  </div>
);

// Context navigation helper component
const ContextNavigationHelper: React.FC<{
  sections: NavigationSection[];
  currentSectionId?: string;
  onSectionChange?: (sectionId: string) => void;
}> = ({ sections, currentSectionId, onSectionChange }) => {
  const currentSection = sections.find(s => s.id === currentSectionId);
  const currentIndex = sections.findIndex(s => s.id === currentSectionId);
  
  const nextSection = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;
  const prevSection = currentIndex > 0 ? sections[currentIndex - 1] : null;

  return (
    <div className="bg-muted border border-border rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">You are here</span>
      </div>
      
      {currentSection && (
        <div className="mb-4">
          <h3 className="font-medium text-foreground">{currentSection.title}</h3>
          <div className="flex items-center gap-4 mt-2">
            <ComplexityIndicator complexity={currentSection.complexity} />
            <ReadingTimeIndicator minutes={currentSection.estimatedReadTime} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => prevSection && onSectionChange?.(prevSection.id)}
          disabled={!prevSection}
          className="flex items-center gap-2"
        >
          <ArrowRight className="w-3 h-3 rotate-180" />
          Previous
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => nextSection && onSectionChange?.(nextSection.id)}
          disabled={!nextSection}
          className="flex items-center gap-2"
        >
          Next
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

// Main progressive disclosure navigation component
export const ProgressiveDisclosureNavigation = React.memo<ProgressiveDisclosureNavigationProps>(({
  sections,
  readingPaths = [],
  currentSectionId,
  onSectionChange,
  className
}) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  const [selectedReadingPath, setSelectedReadingPath] = useState<ReadingPath | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-expand current section
  useEffect(() => {
    if (currentSectionId) {
      setOpenSections(prev => {
        const newSet = new Set(prev);
        newSet.add(currentSectionId);
        return newSet;
      });
    }
  }, [currentSectionId]);

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const handleSectionClick = useCallback((sectionId: string) => {
    onSectionChange?.(sectionId);
    
    // Mark as completed if not already
    if (!completedSections.includes(sectionId)) {
      setCompletedSections(prev => [...prev, sectionId]);
    }
  }, [onSectionChange, completedSections]);

  const handlePathSelect = useCallback((path: ReadingPath) => {
    setSelectedReadingPath(path);
    
    // Navigate to first section in path
    if (path.sections.length > 0) {
      onSectionChange?.(path.sections[0]);
    }
  }, [onSectionChange]);

  const renderSection = (section: NavigationSection, level = 0) => {
    const isOpen = openSections.has(section.id);
    const isCurrent = currentSectionId === section.id;
    const isCompleted = completedSections.includes(section.id);

    return (
      <div key={section.id} className={cn("border-l-2 border-transparent", level > 0 && "ml-4")}>
        <Collapsible open={isOpen} onOpenChange={() => toggleSection(section.id)}>
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer",
            isCurrent && "bg-primary/10 border-l-primary",
            isCompleted && "text-green-600"
          )}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                {section.subsections && section.subsections.length > 0 ? (
                  isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                ) : (
                  <div className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <div 
              className="flex-1 flex items-center justify-between cursor-pointer"
              onClick={() => handleSectionClick(section.id)}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "font-medium",
                  isCurrent && "text-primary",
                  isCompleted && "line-through"
                )}>
                  {section.title}
                </span>
                {section.isRequired && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    Required
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <ComplexityIndicator complexity={section.complexity} />
                <ReadingTimeIndicator minutes={section.estimatedReadTime} />
              </div>
            </div>
          </div>

          {section.subsections && (
            <CollapsibleContent className="ml-6 mt-2">
              {section.subsections.map(subsection => renderSection(subsection, level + 1))}
            </CollapsibleContent>
          )}
        </Collapsible>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={cn("space-y-4", className)}>
      {/* Reading paths selector */}
      {readingPaths.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Choose Your Reading Path</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {selectedReadingPath ? selectedReadingPath.title : "Select a reading path"}
                <Menu className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              {readingPaths.map(path => (
                <DropdownMenuItem
                  key={path.id}
                  onClick={() => handlePathSelect(path)}
                  className="flex flex-col items-start p-3"
                >
                  <div className="font-medium">{path.title}</div>
                  <div className="text-sm text-muted-foreground">{path.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {path.estimatedTotalTime} min total
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Context helper */}
      {currentSectionId && (
        <ContextNavigationHelper
          sections={sections}
          currentSectionId={currentSectionId}
          onSectionChange={onSectionChange}
        />
      )}

      {/* Progress indicator */}
      {sections.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{completedSections.length} of {sections.length} completed</span>
          </div>
          <Progress value={(completedSections.length / sections.length) * 100} className="h-2" />
        </div>
      )}

      {/* Navigation sections */}
      <div className="space-y-2">
        {sections.map(section => renderSection(section))}
      </div>
    </div>
  );
});

ProgressiveDisclosureNavigation.displayName = 'ProgressiveDisclosureNavigation';

export default ProgressiveDisclosureNavigation;
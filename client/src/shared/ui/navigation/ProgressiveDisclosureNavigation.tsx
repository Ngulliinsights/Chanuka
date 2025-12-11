import { ChevronDown, ChevronRight, Clock, MapPin, ArrowRight, Menu } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

import { cn } from '@client/lib/utils';

import { Button } from '@client/shared/design-system/interactive/Button.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@client/shared/design-system/interactive/Collapsible.tsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
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
          <ChevronRight className="w-3 h-3 rotate-180" />
          Previous
        </Button>
        
        <span className="text-sm text-gray-600">
          {currentIndex + 1} of {sections.length}
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => nextSection && onSectionChange?.(nextSection.id)}
          disabled={!nextSection}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

// Mobile tab selector dropdown
const MobileTabSelector: React.FC<{
  sections: NavigationSection[];
  currentSectionId?: string;
  onSectionChange?: (sectionId: string) => void;
}> = ({ sections, currentSectionId, onSectionChange }) => {
  const currentSection = sections.find(s => s.id === currentSectionId);

  return (
    <div className="md:hidden mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Menu className="w-4 h-4" />
              <span>{currentSection?.title || 'Select Section'}</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-full">
          {sections.map((section) => (
            <DropdownMenuItem
              key={section.id}
              onClick={() => onSectionChange?.(section.id)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span>{section.title}</span>
                {section.isRequired && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                    Required
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <ComplexityIndicator complexity={section.complexity} />
                <ReadingTimeIndicator minutes={section.estimatedReadTime} />
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// Reading path guidance component
const ReadingPathGuidance: React.FC<{
  readingPaths: ReadingPath[];
  sections: NavigationSection[];
  onPathSelect?: (path: ReadingPath) => void;
}> = ({ readingPaths, sections, onPathSelect }) => {
  const [selectedPath, setSelectedPath] = useState<ReadingPath | null>(null);

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
      <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
        <ArrowRight className="w-4 h-4 text-primary" />
        Recommended Reading Paths
      </h3>
      
      <div className="space-y-3">
        {readingPaths.map((path) => (
          <div
            key={path.id}
            className={cn(
              "p-3 rounded-md border cursor-pointer transition-colors",
              selectedPath?.id === path.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => {
              setSelectedPath(path);
              onPathSelect?.(path);
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">{path.title}</h4>
              <ReadingTimeIndicator minutes={path.estimatedTotalTime} />
            </div>
            <p className="text-sm text-gray-600 mb-2">{path.description}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{path.sections.length} sections</span>
              <span>•</span>
              <span>Step-by-step guidance</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Progress tracking component
const ProgressTracker: React.FC<{
  sections: NavigationSection[];
  currentSectionId?: string;
  completedSections: string[];
  onProgressUpdate?: (completedSections: string[]) => void;
}> = ({ sections, currentSectionId, completedSections, onProgressUpdate }) => {
  const totalSections = sections.length;
  const completedCount = completedSections.length;
  const progressPercentage = (completedCount / totalSections) * 100;

  const currentIndex = sections.findIndex(s => s.id === currentSectionId);
  const readingProgress = currentIndex >= 0 ? ((currentIndex + 1) / totalSections) * 100 : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-900">Reading Progress</h3>
        <span className="text-sm text-gray-600">
          {completedCount} of {totalSections} completed
        </span>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Overall Progress</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">Current Reading</span>
            <span className="font-medium">{Math.round(readingProgress)}%</span>
          </div>
          <Progress value={readingProgress} className="h-2" />
        </div>
      </div>
    </div>
  );
};

// Collapsible section component
const CollapsibleSection: React.FC<{
  section: NavigationSection;
  isOpen: boolean;
  onToggle: () => void;
  isActive: boolean;
  onSectionClick: (sectionId: string) => void;
}> = ({ section, isOpen, onToggle, isActive, onSectionClick }) => {
  return (
    <div className="border border-gray-200 rounded-lg mb-2 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              "w-full p-4 flex items-center justify-between cursor-pointer transition-colors",
              isActive 
                ? "bg-primary/10 border-l-4 border-l-primary" 
                : "hover:bg-muted/50"
            )}
            onClick={() => onSectionClick(section.id)}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </div>
              
              <div>
                <h3 className={cn(
                  "font-medium",
                  isActive ? "text-primary" : "text-foreground"
                )}>
                  {section.title}
                  {section.isRequired && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                      Required
                    </span>
                  )}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <ComplexityIndicator complexity={section.complexity} />
              <ReadingTimeIndicator minutes={section.estimatedReadTime} />
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          {section.content && (
            <div className="p-4 pt-0 border-t border-gray-100">
              {section.content}
            </div>
          )}
          
          {section.subsections && section.subsections.length > 0 && (
            <div className="pl-8 pb-4">
              {section.subsections.map((subsection) => (
                <CollapsibleSection
                  key={subsection.id}
                  section={subsection}
                  isOpen={false}
                  onToggle={() => {}}
                  isActive={false}
                  onSectionClick={onSectionClick}
                />
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Main Progressive Disclosure Navigation component
export const ProgressiveDisclosureNavigation: React.FC<ProgressiveDisclosureNavigationProps> = ({
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

  // Auto-open current section
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
    
    // Mark section as completed when visited
    if (!completedSections.includes(sectionId)) {
      setCompletedSections(prev => [...prev, sectionId]);
    }
  }, [onSectionChange, completedSections]);

  const handlePathSelect = useCallback((path: ReadingPath) => {
    setSelectedReadingPath(path);
    // Auto-navigate to first section in path
    if (path.sections.length > 0) {
      onSectionChange?.(path.sections[0]);
    }
  }, [onSectionChange]);

  return (
    <div ref={containerRef} className={cn("space-y-6", className)}>
      {/* Mobile tab selector */}
      <MobileTabSelector
        sections={sections}
        currentSectionId={currentSectionId}
        onSectionChange={onSectionChange}
      />

      {/* Reading path guidance */}
      {readingPaths.length > 0 && (
        <ReadingPathGuidance
          readingPaths={readingPaths}
          sections={sections}
          onPathSelect={handlePathSelect}
        />
      )}

      {/* Progress tracking */}
      <ProgressTracker
        sections={sections}
        currentSectionId={currentSectionId}
        completedSections={completedSections}
        onProgressUpdate={setCompletedSections}
      />

      {/* Context navigation helper */}
      <ContextNavigationHelper
        sections={sections}
        currentSectionId={currentSectionId}
        onSectionChange={onSectionChange}
      />

      {/* Collapsible sections */}
      <div className="space-y-2">
        {sections.map((section) => (
          <CollapsibleSection
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            isActive={currentSectionId === section.id}
            onSectionClick={handleSectionClick}
          />
        ))}
      </div>
    </div>
  );
};

export default ProgressiveDisclosureNavigation;
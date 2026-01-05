import { ChevronDown, ChevronRight, Clock, MapPin, Menu, CheckCircle, Circle, ArrowRight, BookOpen, Target } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

// Enhanced types for progressive disclosure
interface SimpleSection {
  id: string;
  title: string;
  complexity: 1 | 2 | 3;
  estimatedReadTime: number;
  isRequired?: boolean;
  content?: string;
  subsections?: {
    id: string;
    title: string;
    isCompleted?: boolean;
  }[];
  isCompleted?: boolean;
  readingProgress?: number; // 0-100
}

interface SimpleProgressiveDisclosureProps {
  sections: SimpleSection[];
  currentSectionId?: string;
  onSectionChange?: (sectionId: string) => void;
  onSectionComplete?: (sectionId: string) => void;
  showMobileSelector?: boolean;
  enableReadingPath?: boolean;
}

// Enhanced complexity indicator with visual dots and reading time estimates
const ComplexityDots = ({ complexity }: { complexity: 1 | 2 | 3 }) => {
  const complexityLabels = {
    1: 'Easy read',
    2: 'Moderate complexity',
    3: 'Complex content'
  };

  const complexityColors = {
    1: 'bg-green-500',
    2: 'bg-yellow-500',
    3: 'bg-red-500'
  };

  return (
    <div className="flex items-center gap-1" aria-label={`${complexityLabels[complexity]} - ${complexity} out of 3 dots`}>
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-all duration-200 complexity-dot ${
            i < complexity
              ? complexityColors[complexity]
              : 'bg-gray-300'
          }`}
          title={i < complexity ? complexityLabels[complexity] : ''}
        />
      ))}
    </div>
  );
};

// Enhanced reading time indicator
const ReadingTime = ({ minutes }: { minutes: number }) => (
  <div className="flex items-center gap-1 text-sm text-gray-600 reading-time-indicator">
    <Clock className="w-3 h-3" />
    <span>{minutes} min read</span>
  </div>
);

// Mobile tab selector dropdown for complex content navigation
const MobileTabSelector = ({
  sections,
  currentSectionId,
  onSectionChange
}: {
  sections: SimpleSection[];
  currentSectionId?: string;
  onSectionChange?: (sectionId: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSection = sections.find(s => s.id === currentSectionId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="md:hidden mb-4" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="mobile-tab-selector w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-3">
          <Menu className="w-4 h-4 text-gray-500" />
          <div className="text-left">
            <div className="font-medium text-gray-900">
              {currentSection?.title || 'Select Section'}
            </div>
            {currentSection && (
              <div className="flex items-center gap-2 mt-1">
                <ComplexityDots complexity={currentSection.complexity} />
                <ReadingTime minutes={currentSection.estimatedReadTime} />
              </div>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => {
                onSectionChange?.(section.id);
                setIsOpen(false);
              }}
              className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                currentSectionId === section.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{section.title}</span>
                    {section.isRequired && (
                      <span className="required-badge">Required</span>
                    )}
                    {section.isCompleted && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <ComplexityDots complexity={section.complexity} />
                    <ReadingTime minutes={section.estimatedReadTime} />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Reading path guidance with step-by-step recommended exploration
const ReadingPathGuidance = ({
  sections,
  currentSectionId,
  onSectionChange
}: {
  sections: SimpleSection[];
  currentSectionId?: string;
  onSectionChange?: (sectionId: string) => void;
}) => {
  // Find current section index for navigation logic
  // const currentIndex = sections.findIndex(s => s.id === currentSectionId);
  const recommendedPath = sections.filter(s => s.isRequired);
  const nextRecommended = recommendedPath.find(s => !s.isCompleted);

  // Use currentIndex for navigation if needed
  // const _canGoNext = currentIndex < sections.length - 1;
  // const _canGoPrevious = currentIndex > 0;

  return (
    <div className="reading-path-card mb-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Recommended Reading Path</h3>
      </div>

      <div className="space-y-3">
        {recommendedPath.map((section, index) => (
          <div
            key={section.id}
            className={`reading-path-item ${currentSectionId === section.id ? 'selected' : ''}`}
            onClick={() => onSectionChange?.(section.id)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                section.isCompleted
                  ? 'bg-green-100 text-green-700'
                  : currentSectionId === section.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {section.isCompleted ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>

              <div className="flex-1">
                <div className="font-medium text-gray-900">{section.title}</div>
                <div className="flex items-center gap-3 mt-1">
                  <ComplexityDots complexity={section.complexity} />
                  <ReadingTime minutes={section.estimatedReadTime} />
                </div>
              </div>

              {currentSectionId === section.id && (
                <Target className="w-4 h-4 text-blue-600" />
              )}
            </div>
          </div>
        ))}
      </div>

      {nextRecommended && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-800">
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm font-medium">
              Next: {nextRecommended.title}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced collapsible section with progress tracking
const SimpleSection = ({
  section,
  isOpen,
  onToggle,
  isActive,
  onSectionClick,
  onSectionComplete
}: {
  section: SimpleSection;
  isOpen: boolean;
  onToggle: () => void;
  isActive: boolean;
  onSectionClick: (id: string) => void;
  onSectionComplete?: (sectionId: string) => void;
}) => (
  <div className="collapsible-section">
    <div
      className={`collapsible-trigger ${isActive ? 'active' : ''}`}
      onClick={() => {
        onToggle();
        onSectionClick(section.id);
      }}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className={`font-medium ${isActive ? 'text-blue-600' : 'text-gray-900'}`}>
              {section.title}
            </h3>
            {section.isRequired && (
              <span className="required-badge">Required</span>
            )}
            {section.isCompleted && (
              <CheckCircle className="w-4 h-4 text-green-500" />
            )}
          </div>

          {/* Reading progress bar for current section */}
          {section.readingProgress !== undefined && section.readingProgress > 0 && (
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="progress-bar-civic h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${section.readingProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="section-meta">
        <ComplexityDots complexity={section.complexity} />
        <ReadingTime minutes={section.estimatedReadTime} />
      </div>
    </div>

    {isOpen && (
      <div className="collapsible-content">
        {section.content && (
          <div className="p-4">
            <p className="text-gray-700 mb-4">{section.content}</p>

            {/* Mark as complete button */}
            {!section.isCompleted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSectionComplete?.(section.id);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
              >
                <Circle className="w-3 h-3" />
                Mark as Complete
              </button>
            )}
          </div>
        )}

        {/* Subsections */}
        {section.subsections && section.subsections.length > 0 && (
          <div className="collapsible-subsection">
            <h4 className="font-medium text-gray-900 mb-3">Subsections:</h4>
            <div className="space-y-2">
              {section.subsections.map((subsection) => (
                <div
                  key={subsection.id}
                  className="flex items-center gap-2 p-2 rounded border border-gray-100 hover:bg-gray-50"
                >
                  {subsection.isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-700">{subsection.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
);

// Main enhanced progressive disclosure component
export const SimpleProgressiveDisclosure = ({
  sections,
  currentSectionId,
  onSectionChange,
  onSectionComplete,
  showMobileSelector = true,
  enableReadingPath = true
}: SimpleProgressiveDisclosureProps) => {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

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
  }, [onSectionChange]);

  const handleSectionComplete = useCallback((sectionId: string) => {
    setCompletedSections(prev => new Set([...prev, sectionId]));
    onSectionComplete?.(sectionId);
  }, [onSectionComplete]);

  // Update sections with completion status
  const enhancedSections = sections.map(section => ({
    ...section,
    isCompleted: completedSections.has(section.id)
  }));

  // Context navigation helper with enhanced features
  const currentSection = enhancedSections.find(s => s.id === currentSectionId);
  const currentIndex = enhancedSections.findIndex(s => s.id === currentSectionId);
  const nextSection = currentIndex < enhancedSections.length - 1 ? enhancedSections[currentIndex + 1] : null;
  const prevSection = currentIndex > 0 ? enhancedSections[currentIndex - 1] : null;

  // Calculate overall progress
  const totalSections = enhancedSections.length;
  const completedCount = completedSections.size;
  const overallProgress = totalSections > 0 ? (completedCount / totalSections) * 100 : 0;

  // Calculate reading progress for current section
  const currentProgress = currentIndex >= 0 ? ((currentIndex + 1) / totalSections) * 100 : 0;

  return (
    <div className="progressive-disclosure-container space-y-6">
      {/* Mobile Tab Selector */}
      {showMobileSelector && (
        <MobileTabSelector
          sections={enhancedSections}
          currentSectionId={currentSectionId}
          onSectionChange={onSectionChange}
        />
      )}

      {/* Reading Path Guidance */}
      {enableReadingPath && (
        <ReadingPathGuidance
          sections={enhancedSections}
          currentSectionId={currentSectionId}
          onSectionChange={onSectionChange}
        />
      )}

      {/* Enhanced Context Navigation Helper */}
      {currentSection && (
        <div className="context-nav-helper">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900">Current Location</span>
          </div>

          <div className="context-nav-current-section mb-4">
            <h3 className="font-medium text-gray-900">{currentSection.title}</h3>
            <div className="flex items-center gap-4 mt-2">
              <ComplexityDots complexity={currentSection.complexity} />
              <ReadingTime minutes={currentSection.estimatedReadTime} />
              {currentSection.isCompleted && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Completed</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Jump Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => prevSection && onSectionChange?.(prevSection.id)}
              disabled={!prevSection}
            >
              ← {prevSection?.title || 'Previous'}
            </button>

            <span className="text-sm text-gray-600 px-3">
              {currentIndex + 1} of {enhancedSections.length}
            </span>

            <button
              type="button"
              className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              onClick={() => nextSection && onSectionChange?.(nextSection.id)}
              disabled={!nextSection}
            >
              {nextSection?.title || 'Next'} →
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Progress Tracker */}
      <div className="progress-tracker">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900">Progress Overview</h3>
          <span className="text-sm text-gray-600">
            {completedCount} of {totalSections} completed
          </span>
        </div>

        {/* Overall completion progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Overall Completion</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="progress-bar-overall h-2 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Current reading progress */}
        <div>
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Reading Progress</span>
            <span>{Math.round(currentProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="progress-bar-civic h-2 rounded-full transition-all duration-300"
              style={{ width: `${currentProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Collapsible Sections */}
      <div className="space-y-2">
        {enhancedSections.map((section) => (
          <SimpleSection
            key={section.id}
            section={section}
            isOpen={openSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            isActive={currentSectionId === section.id}
            onSectionClick={handleSectionClick}
            onSectionComplete={handleSectionComplete}
          />
        ))}
      </div>
    </div>
  );
};

export default SimpleProgressiveDisclosure;

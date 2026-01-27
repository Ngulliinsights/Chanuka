import { useState, useEffect, useCallback, useRef } from 'react';

export interface NavigationSection {
  id: string;
  title: string;
  complexity: 1 | 2 | 3;
  estimatedReadTime: number;
  isRequired?: boolean;
  subsections?: NavigationSection[];
  content?: React.ReactNode;
}

export interface ReadingPath {
  id: string;
  title: string;
  description: string;
  sections: string[];
  estimatedTotalTime: number;
}

export interface ProgressiveDisclosureState {
  currentSectionId: string | null;
  completedSections: string[];
  openSections: Set<string>;
  selectedReadingPath: ReadingPath | null;
  readingProgress: number;
  scrollProgress: number;
}

export interface UseProgressiveDisclosureOptions {
  sections: NavigationSection[];
  readingPaths?: ReadingPath[];
  autoSave?: boolean;
  storageKey?: string;
  onSectionChange?: (sectionId: string) => void;
  onProgressUpdate?: (progress: number) => void;
}

export const useProgressiveDisclosure = ({
  sections,
  _readingPaths = [],
  autoSave = true,
  storageKey = 'progressive-disclosure-state',
  onSectionChange,
  onProgressUpdate,
}: UseProgressiveDisclosureOptions) => {
  const [state, setState] = useState<ProgressiveDisclosureState>({
    currentSectionId: null,
    completedSections: [],
    openSections: new Set(),
    selectedReadingPath: null,
    readingProgress: 0,
    scrollProgress: 0,
  });

  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Load saved state from localStorage
  useEffect(() => {
    if (autoSave && typeof window !== 'undefined') {
      try {
        const savedState = localStorage.getItem(storageKey);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          setState(prev => ({
            ...prev,
            ...parsed,
            openSections: new Set(parsed.openSections || []),
          }));
        }
      } catch (error) {
        console.warn('Failed to load progressive disclosure state:', error);
      }
    }
  }, [autoSave, storageKey]);

  // Save state to localStorage
  useEffect(() => {
    if (autoSave && typeof window !== 'undefined') {
      try {
        const stateToSave = {
          ...state,
          openSections: Array.from(state.openSections),
        };
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      } catch (error) {
        console.warn('Failed to save progressive disclosure state:', error);
      }
    }
  }, [state, autoSave, storageKey]);

  // Calculate reading progress
  const calculateReadingProgress = useCallback(() => {
    if (!state.currentSectionId || sections.length === 0) return 0;

    const currentIndex = sections.findIndex(s => s.id === state.currentSectionId);
    if (currentIndex === -1) return 0;

    return ((currentIndex + 1) / sections.length) * 100;
  }, [state.currentSectionId, sections]);

  // Update reading progress
  useEffect(() => {
    const progress = calculateReadingProgress();
    setState(prev => ({ ...prev, readingProgress: progress }));
    onProgressUpdate?.(progress);
  }, [calculateReadingProgress, onProgressUpdate]);

  // Navigate to section
  const navigateToSection = useCallback(
    (sectionId: string) => {
      setState(prev => ({
        ...prev,
        currentSectionId: sectionId,
        completedSections: prev.completedSections.includes(sectionId)
          ? prev.completedSections
          : [...prev.completedSections, sectionId],
        openSections: (() => {
          const newSet = new Set(prev.openSections);
          newSet.add(sectionId);
          return newSet;
        })(),
      }));

      onSectionChange?.(sectionId);

      // Scroll to section if ref exists
      const sectionElement = sectionRefs.current.get(sectionId);
      if (sectionElement) {
        sectionElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    },
    [onSectionChange]
  );

  // Navigate to next section
  const navigateToNext = useCallback(() => {
    if (!state.currentSectionId) return;

    const currentIndex = sections.findIndex(s => s.id === state.currentSectionId);
    if (currentIndex < sections.length - 1) {
      navigateToSection(sections[currentIndex + 1].id);
    }
  }, [state.currentSectionId, sections, navigateToSection]);

  // Navigate to previous section
  const navigateToPrevious = useCallback(() => {
    if (!state.currentSectionId) return;

    const currentIndex = sections.findIndex(s => s.id === state.currentSectionId);
    if (currentIndex > 0) {
      navigateToSection(sections[currentIndex - 1].id);
    }
  }, [state.currentSectionId, sections, navigateToSection]);

  // Toggle section open/closed
  const toggleSection = useCallback((sectionId: string) => {
    setState(prev => {
      const newOpenSections = new Set(prev.openSections);
      if (newOpenSections.has(sectionId)) {
        newOpenSections.delete(sectionId);
      } else {
        newOpenSections.add(sectionId);
      }
      return { ...prev, openSections: newOpenSections };
    });
  }, []);

  // Select reading path
  const selectReadingPath = useCallback(
    (path: ReadingPath) => {
      setState(prev => ({ ...prev, selectedReadingPath: path }));

      // Navigate to first section in path
      if (path.sections.length > 0) {
        navigateToSection(path.sections[0]);
      }
    },
    [navigateToSection]
  );

  // Follow reading path (navigate to next section in path)
  const followReadingPath = useCallback(() => {
    if (!state.selectedReadingPath || !state.currentSectionId) return;

    const currentIndex = state.selectedReadingPath.sections.indexOf(state.currentSectionId);
    if (currentIndex >= 0 && currentIndex < state.selectedReadingPath.sections.length - 1) {
      navigateToSection(state.selectedReadingPath.sections[currentIndex + 1]);
    }
  }, [state.selectedReadingPath, state.currentSectionId, navigateToSection]);

  // Mark section as completed
  const markSectionCompleted = useCallback((sectionId: string) => {
    setState(prev => ({
      ...prev,
      completedSections: prev.completedSections.includes(sectionId)
        ? prev.completedSections
        : [...prev.completedSections, sectionId],
    }));
  }, []);

  // Reset progress
  const resetProgress = useCallback(() => {
    setState({
      currentSectionId: null,
      completedSections: [],
      openSections: new Set(),
      selectedReadingPath: null,
      readingProgress: 0,
      scrollProgress: 0,
    });
  }, []);

  // Register section ref for scrolling
  const registerSectionRef = useCallback((sectionId: string, element: HTMLElement | null) => {
    if (element) {
      sectionRefs.current.set(sectionId, element);
    } else {
      sectionRefs.current.delete(sectionId);
    }
  }, []);

  // Track scroll progress within current section
  const trackScrollProgress = useCallback((element: HTMLElement) => {
    const updateScrollProgress = () => {
      const rect = element.getBoundingClientRect();
      const elementHeight = element.scrollHeight;
      const viewportHeight = window.innerHeight;
      const scrolled = Math.max(0, viewportHeight - rect.top);
      const progress = Math.min(100, (scrolled / elementHeight) * 100);

      setState(prev => ({ ...prev, scrollProgress: progress }));
    };

    const handleScroll = () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(updateScrollProgress, 16); // ~60fps
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateScrollProgress(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Get current section
  const getCurrentSection = useCallback(() => {
    return sections.find(s => s.id === state.currentSectionId) || null;
  }, [sections, state.currentSectionId]);

  // Get next section
  const getNextSection = useCallback(() => {
    if (!state.currentSectionId) return null;

    const currentIndex = sections.findIndex(s => s.id === state.currentSectionId);
    return currentIndex < sections.length - 1 ? sections[currentIndex + 1] : null;
  }, [sections, state.currentSectionId]);

  // Get previous section
  const getPreviousSection = useCallback(() => {
    if (!state.currentSectionId) return null;

    const currentIndex = sections.findIndex(s => s.id === state.currentSectionId);
    return currentIndex > 0 ? sections[currentIndex - 1] : null;
  }, [sections, state.currentSectionId]);

  // Calculate completion percentage
  const getCompletionPercentage = useCallback(() => {
    if (sections.length === 0) return 0;
    return (state.completedSections.length / sections.length) * 100;
  }, [sections.length, state.completedSections.length]);

  // Get estimated remaining time
  const getEstimatedRemainingTime = useCallback(() => {
    const remainingSections = sections.filter(s => !state.completedSections.includes(s.id));
    return remainingSections.reduce((total, section) => total + section.estimatedReadTime, 0);
  }, [sections, state.completedSections]);

  return {
    // State
    ...state,

    // Computed values
    currentSection: getCurrentSection(),
    nextSection: getNextSection(),
    previousSection: getPreviousSection(),
    completionPercentage: getCompletionPercentage(),
    estimatedRemainingTime: getEstimatedRemainingTime(),

    // Actions
    navigateToSection,
    navigateToNext,
    navigateToPrevious,
    toggleSection,
    selectReadingPath,
    followReadingPath,
    markSectionCompleted,
    resetProgress,
    registerSectionRef,
    trackScrollProgress,
  };
};

export default useProgressiveDisclosure;

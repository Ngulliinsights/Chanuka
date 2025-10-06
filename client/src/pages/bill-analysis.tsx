import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, Link } from 'wouter';
import AppLayout from '@/components/layout/app-layout';
import DOMPurify from 'dompurify';
import { LoadingSpinner } from '@/components/ui/spinner';
import { useBillAnalysis } from '@/hooks/use-bill-analysis';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AnalysisSection } from '@/components/analysis/section';
import { ActionTimeline } from '@/components/analysis/timeline';
import { Comments } from '@/components/analysis/comments';
import { BillStats } from '@/components/analysis/stats';
import { Share2, ArrowLeft } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';

// Move constants outside component to prevent recreation on each render
const STORAGE_KEY = 'bill-view-preferences';
const DEFAULT_EXPANDED_SECTIONS = ['summary', 'analysis', 'timeline'];
const VALID_SORT_OPTIONS = ['newest', 'oldest', 'endorsed'] as const;

export default function BillAnalysis() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? parseInt(params.id) : null;
  const isOnline = useOnlineStatus();
  const { bill, analysis, comments, isLoading, addComment, endorseComment, isAddingComment, isEndorsing } = useBillAnalysis(id || 0);
  const [expandedSections, setExpandedSections] = useState<string[]>(DEFAULT_EXPANDED_SECTIONS);
  const [commentSort, setCommentSort] = useState<'newest' | 'oldest' | 'endorsed'>('newest');

  // Memoize the sanitized description to prevent unnecessary DOMPurify calls
  const sanitizedDescription = useMemo(() => {
    if (!bill?.description) return '';
    return DOMPurify.sanitize(bill.description, {
      USE_PROFILES: { html: true },
    });
  }, [bill?.description]);

  // Enhanced localStorage operations with better error handling
  const savePreferences = useCallback((newExpandedSections: string[], newCommentSort: string) => {
    try {
      const preferences = {
        expandedSections: newExpandedSections,
        commentSort: newCommentSort
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      // Handle quota exceeded or other localStorage errors gracefully
      console.warn('Failed to save preferences to localStorage:', error);
      // Could potentially show a user-friendly notification here
    }
  }, []);

  // Load preferences with improved validation
  useEffect(() => {
    try {
      const storedPrefs = localStorage.getItem(STORAGE_KEY);
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs);

        // Validate and set expanded sections
        if (Array.isArray(parsed.expandedSections) && 
            parsed.expandedSections.every((section: unknown) => typeof section === 'string')) {
          setExpandedSections(parsed.expandedSections);
        }

        // Validate and set comment sort
        if (typeof parsed.commentSort === 'string' && 
            VALID_SORT_OPTIONS.includes(parsed.commentSort as any)) {
          setCommentSort(parsed.commentSort);
        }
      }
    } catch (error) {
      console.warn('Error loading user preferences:', error);
      // Fallback to defaults is already handled by initial state
    }
  }, []);

  // Optimize section toggle with useCallback to prevent unnecessary re-renders
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev.includes(sectionId);
      const newExpanded = isCurrentlyExpanded
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId];

      // Save preferences after state update
      savePreferences(newExpanded, commentSort);
      return newExpanded;
    });
  }, [commentSort, savePreferences]);

  // Enhanced comment handling with better error feedback
  const handleAddComment = useCallback(async (content: string, expertise?: string) => {
    if (!id) {
      console.warn('Cannot add comment: Bill ID is missing');
      return;
    }

    try {
      await addComment({
        content,
        expertise,
        billId: id,
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
      // This could trigger a user notification in a real app
    }
  }, [id, addComment]);

  // Optimize endorsement handling
  const handleEndorseComment = useCallback(async (commentId: number) => {
    try {
      await endorseComment({ commentId, endorsements: 1 });
    } catch (error) {
      console.error('Failed to endorse comment:', error);
      // This could trigger a user notification in a real app
    }
  }, [endorseComment]);

  // Enhanced sort change handler with validation
  const handleSortChange = useCallback((value: string) => {
    if (VALID_SORT_OPTIONS.includes(value as any)) {
      const newSort = value as typeof commentSort;
      setCommentSort(newSort);
      savePreferences(expandedSections, newSort);
    } else {
      console.warn('Invalid sort option:', value);
    }
  }, [expandedSections, savePreferences]);

  // Enhanced share functionality with better fallback handling
  const handleShare = useCallback(async () => {
    if (!bill) return;

    try {
      // Check for Web Share API support first
      if (navigator.share && typeof navigator.share === 'function') {
        await navigator.share({
          title: bill.title,
          text: bill.description || 'Legislative bill analysis',
          url: window.location.href,
        });
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        // Fallback to clipboard API
        await navigator.clipboard.writeText(window.location.href);
        // In a real app, you'd want to show a proper toast notification
        // For now, keeping the simple alert to maintain compatibility
        alert('Link copied to clipboard');
      } else {
        // Final fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Link copied to clipboard');
      }
    } catch (error) {
      // Only log if it's not a user cancellation
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        alert('Unable to share or copy link');
      }
    }
  }, [bill]);

  // Early returns remain the same but with slightly improved messaging
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container px-4 py-8 mx-auto max-w-7xl">
          <div className="flex items-center justify-center min-h-[200px]">
            <LoadingSpinner />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!bill || !id) {
    return (
      <AppLayout>
        <div className="container px-4 py-8 mx-auto max-w-7xl">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Bill Not Found</h1>
            <p className="text-slate-600 mb-4">The requested bill could not be found or may have been removed.</p>
            <Link href="/">
              <a className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Return to Home
              </a>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container px-4 py-8 mx-auto max-w-7xl">
        {/* Enhanced offline notification with better styling */}
        {typeof isOnline === 'boolean' && !isOnline && (
          <div
            className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md mb-4 flex items-center gap-2"
            role="alert"
            aria-live="polite"
          >
            <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm font-medium">You're currently offline</span>
          </div>
        )}

        {/* Enhanced breadcrumb navigation */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <Link href="/" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </nav>

        {/* Enhanced header with better spacing and typography */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 leading-tight">{bill.title}</h1>
          {sanitizedDescription && (
            <div 
              className="text-lg text-slate-600 leading-relaxed" 
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          )}

          <div className="mt-6 flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2 hover:bg-slate-50 transition-colors" 
              onClick={handleShare}
              aria-label={`Share ${bill.title}`}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </header>

        {/* Main content grid with improved responsive behavior */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Bill Summary Section with enhanced content */}
            <AnalysisSection
              title="Summary"
              id="summary"
              isExpanded={expandedSections.includes('summary')}
              onToggle={toggleSection}
            >
              <div className="prose max-w-none text-slate-700 leading-relaxed">
                <p className="mb-4">
                  The {bill.title} aims to {bill.aims || 'improve legislation'} through targeted investments and programmatic changes. The bill addresses several key areas of policy reform:
                </p>
                {bill.keyAreas && bill.keyAreas.length > 0 ? (
                  <ol className="list-decimal pl-5 mb-4 space-y-2">
                    {bill.keyAreas.map((area, i) => (
                      <li key={`area-${i}`}>
                        <strong className="text-slate-900">{area.title}:</strong> 
                        <span className="ml-1">{area.description}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mb-4 text-slate-600 italic">
                    Detailed policy areas are being analyzed and will be available soon.
                  </p>
                )}
                <p>The bill requires annual performance reporting and establishes an oversight committee to monitor implementation effectiveness and ensure accountability.</p>
              </div>
            </AnalysisSection>

            {/* Enhanced Constitutional Analysis Section */}
            <AnalysisSection
              title="Constitutional Analysis"
              id="analysis"
              isExpanded={expandedSections.includes('analysis')}
              onToggle={toggleSection}
            >
              <div className="prose max-w-none text-slate-700">
                <p className="mb-4">
                  The constitutionality of the {bill.title} hinges primarily on federalism concerns and the scope of congressional spending power under current jurisprudence.
                </p>

                <h3 className="text-lg font-semibold mt-6 mb-3 text-slate-900">Key Constitutional Considerations:</h3>

                {bill.constitutionalAnalysis && bill.constitutionalAnalysis.length > 0 ? (
                  bill.constitutionalAnalysis.map((analysis, i) => (
                    <div key={`analysis-${i}`} className="mb-5">
                      <h4 className="font-medium text-slate-900 mb-2">{analysis.title}</h4>
                      <p className="text-slate-700">{analysis.content}</p>
                    </div>
                  ))
                ) : (
                  <p className="mb-4 text-slate-600 italic">
                    Constitutional analysis is in progress and will be updated as legal review continues.
                  </p>
                )}

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mt-6">
                  <h4 className="font-semibold text-amber-900 mb-2">Constitutional Assessment</h4>
                  <p className="text-amber-800 text-sm leading-relaxed">
                    {bill.constitutionalAssessment || 
                      'While the bill pushes boundaries of federal involvement, its voluntary funding structure and state implementation flexibility likely render it constitutional under current jurisprudence.'}
                  </p>
                </div>
              </div>
            </AnalysisSection>

            {/* Action Timeline Section */}
            <AnalysisSection
              title="Legislative Timeline"
              id="timeline"
              isExpanded={expandedSections.includes('timeline')}
              onToggle={toggleSection}
            >
              <ActionTimeline actions={bill.actions || []} />
            </AnalysisSection>

            {/* Enhanced Community Input Section */}
            <AnalysisSection
              title="Community Input"
              id="community"
              isExpanded={expandedSections.includes('community')}
              onToggle={toggleSection}
              extraHeaderContent={
                <label className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Sort by:</span>
                  <select
                    className="text-xs border border-slate-300 rounded px-2 py-1 bg-white hover:border-slate-400 focus:border-primary focus:outline-none transition-colors"
                    value={commentSort}
                    onChange={(e) => handleSortChange(e.target.value)}
                    aria-label="Sort comments"
                  >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="endorsed">Most Endorsed</option>
                  </select>
                </label>
              }
            >
              <Comments
                comments={comments}
                billId={id}
                onAddComment={handleAddComment}
                onEndorseComment={handleEndorseComment}
                isAddingComment={isAddingComment}
                isEndorsing={isEndorsing}
                sortOrder={commentSort}
              />
            </AnalysisSection>
          </div>

          {/* Sidebar with enhanced responsive behavior */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <BillStats bill={bill} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
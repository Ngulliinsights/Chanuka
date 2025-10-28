import { ReactNode } from 'react';
import { Button } from '../ui/button';
import ErrorBoundary from '../error-boundary';
import { LoadingSpinner } from '../ui/spinner';
import { Suspense } from 'react';
import { logger } from '../../utils/browser-logger';

export interface SectionProps {
  title: string;
  id: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
  extraHeaderContent?: ReactNode;
}

export const AnalysisSection = ({ 
  title, 
  id, 
  isExpanded, 
  onToggle, 
  children,
  extraHeaderContent 
}: SectionProps) => {
  return (
    <section
      aria-labelledby={`section-heading-${id}`}
      className="border-b border-slate-200 pb-6 mb-6 last:border-0"
    >
      <div className="flex justify-between items-center mb-4">
        <h2 id={`section-heading-${id}`} className="text-2xl font-semibold">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {extraHeaderContent}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggle(id)}
            aria-expanded={isExpanded}
            aria-controls={`section-content-${id}`}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>
      {isExpanded && (
        <div id={`section-content-${id}`} role="region" aria-labelledby={`section-heading-${id}`}>
          <Suspense fallback={<LoadingSpinner />}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </Suspense>
        </div>
      )}
    </section>
  );
};


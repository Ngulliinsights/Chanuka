import { ReactNode } from 'react';
import { Suspense } from 'react';

import { ErrorBoundary } from '@client/infrastructure/error';
import { Button } from '@client/lib/design-system';
import { LoadingSpinner } from '@client/lib/design-system';

export interface SectionProps {
  title: string;
  id: string;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
  extraHeaderContent?: ReactNode;
}

export };

import { VerificationsList } from '../components/verification/verification-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Scale, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import AppLayout from '../components/layout/app-layout';
import { wrapIcon } from '../lib/icon-wrapper';
import { logger } from '../utils/browser-logger';

// Wrap icons for consistent styling across the component
const WrappedScale = wrapIcon(Scale);
const WrappedCheckCircle = wrapIcon(CheckCircle2);
const WrappedClock = wrapIcon(Clock);
const WrappedAlert = wrapIcon(AlertCircle);

export default function ExpertVerificationPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Main dashboard header with improved visual hierarchy */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <WrappedScale className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-semibold">
                    Expert Verification Dashboard
                  </CardTitle>
                  <CardDescription className="text-base mt-1">
                    Review and verify legislative analysis based on your expertise
                  </CardDescription>
                </div>
              </div>

              {/* Status indicators for quick overview */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <WrappedClock className="h-4 w-4" />
                  <span>Pending Review</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <WrappedCheckCircle className="h-4 w-4" />
                  <span>Verified</span>
                </div>
                <div className="flex items-center gap-2 text-amber-600">
                  <WrappedAlert className="h-4 w-4" />
                  <span>Needs Attention</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Enhanced instructions for better user guidance */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                As an expert reviewer, your role is to validate the accuracy and completeness 
                of legislative analysis. Each item below represents a piece of legislation 
                that requires your professional assessment and verification.
              </p>
            </div>

            {/* Main verification list component */}
            <VerificationsList />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
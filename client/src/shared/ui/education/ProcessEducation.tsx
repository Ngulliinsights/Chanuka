import {
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Info,
  Calendar,
  Scale,
} from 'lucide-react';

import { Progress } from '@/shared/design-system/feedback/Progress';
import { Button } from '@/shared/design-system/interactive/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/design-system/typography/Card';

interface LegislativeStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: 'completed' | 'current' | 'upcoming' | 'conditional';
  participants: string[];
  keyActions: string[];
  publicParticipation: {
    allowed: boolean;
    methods: string[];
    deadline?: string;
  };
  requirements: string[];
  outcomes: string[];
}

interface CommitteeInfo {
  id: string;
  name: string;
  role: string;
  members: number;
  chairperson: string;
  nextMeeting?: string;
  contact: {
    email?: string;
    phone?: string;
    office?: string;
  };
}

interface ProcessEducationProps {
  billId: string;
  billTitle: string;
  currentStep: string;
  steps: LegislativeStep[];
  committees: CommitteeInfo[];
  timeline: {
    introduced: string;
    estimatedCompletion: string;
    keyDeadlines: { date: string; event: string }[];
  };
  className?: string;
}

/**
 * ProcessEducation - Explains legislative procedures and timelines
 * Features: Step-by-step process, participation opportunities, committee information
 */
export function ProcessEducation({
  currentStep,
  steps,
  timeline,
  className = '',
}: ProcessEducationProps) {
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'current':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'upcoming':
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
      case 'conditional':
        return <Info className="h-5 w-5 text-yellow-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progressPercentage =
    currentStepIndex >= 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Card */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-indigo-600" />
            Legislative Process
          </CardTitle>
          <CardDescription>
            Understanding how this bill moves through the legislative system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progress Overview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            {/* Key Dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-indigo-50">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-indigo-600" />
                <div className="text-sm font-medium">Introduced</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(timeline.introduced).toLocaleDateString()}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-indigo-50">
                <Clock className="h-5 w-5 mx-auto mb-1 text-indigo-600" />
                <div className="text-sm font-medium">Current Step</div>
                <div className="text-xs text-muted-foreground">
                  {steps.find(s => s.id === currentStep)?.title || 'Unknown'}
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-indigo-50">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-indigo-600" />
                <div className="text-sm font-medium">Est. Completion</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(timeline.estimatedCompletion).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Steps Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legislative Steps</CardTitle>
          <CardDescription>Track the bill&apos;s progress through each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  {getStepIcon(step.status)}
                  {index < steps.length - 1 && <div className="w-0.5 h-12 bg-gray-200 my-2" />}
                </div>
                <div className="flex-1 pb-4">
                  <h4 className="font-semibold text-sm">{step.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Duration: {step.duration}</span>
                    {step.publicParticipation.allowed && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Public Input Allowed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Educational Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Learn More</CardTitle>
          <CardDescription>Additional resources about the legislative process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Legislative Process Guide</div>
                  <div className="text-xs opacity-80">How bills become laws</div>
                </div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-3">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Committee System</div>
                  <div className="text-xs opacity-80">Understanding parliamentary committees</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

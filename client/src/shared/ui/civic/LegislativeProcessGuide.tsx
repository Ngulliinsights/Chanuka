import {
  FileText,
  Users,
  MessageSquare,
  CheckCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import React, { useState } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@client/shared/design-system';

/**
 * Legislative Process Guide Component
 *
 * Provides a simplified guide to Kenya's legislative process
 * Designed for civic education and public awareness
 *
 * Requirements: 10.4, 10.5
 */

interface ProcessStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: string;
}

interface LegislativeProcessGuideProps {
  className?: string;
}

export const LegislativeProcessGuide: React.FC<LegislativeProcessGuideProps> = ({
  className = ''
}) => {
  const [selectedStep, setSelectedStep] = useState<number>(0);
  const [language, setLanguage] = useState<'en' | 'sw'>('en');

  // Mock civic engagement methods for demo
  const civicEngagementMethods = [
    language === 'sw' ? 'Wasilisha maoni ya kielektroniki' : 'Submit electronic feedback',
    language === 'sw' ? 'Hudhuria mikutano ya umma' : 'Attend public hearings',
    language === 'sw' ? 'Andika barua kwa wabunge' : 'Write to MPs',
    language === 'sw' ? 'Shiriki kwenye mitandao ya kijamii' : 'Participate on social media',
  ];

  const processSteps: ProcessStep[] = [
    {
      title: language === 'sw' ? 'Utangulizi wa Mswada' : 'Bill Introduction',
      description:
        language === 'sw'
          ? 'Mswada unawasilishwa kwenye bunge kwa mara ya kwanza'
          : 'A bill is introduced to parliament for the first time',
      icon: FileText,
      duration: language === 'sw' ? 'Siku 1-3' : '1-3 days',
    },
    {
      title: language === 'sw' ? 'Ushiriki wa Umma' : 'Public Participation',
      description:
        language === 'sw'
          ? 'Raia wanapewa nafasi ya kutoa maoni yao kuhusu mswada'
          : 'Citizens are given opportunity to provide input on the bill',
      icon: Users,
      duration: language === 'sw' ? 'Siku 21+' : '21+ days',
    },
    {
      title: language === 'sw' ? 'Mjadala wa Bunge' : 'Parliamentary Debate',
      description:
        language === 'sw'
          ? 'Wabunge wanajadili na kuchambua mswada kwa undani'
          : 'Members of Parliament debate and examine the bill in detail',
      icon: MessageSquare,
      duration: language === 'sw' ? 'Wiki 2-8' : '2-8 weeks',
    },
    {
      title: language === 'sw' ? 'Idhini ya Rais' : 'Presidential Assent',
      description:
        language === 'sw'
          ? 'Rais anatia saini mswada ili uwe sheria'
          : 'President signs the bill into law',
      icon: CheckCircle,
      duration: language === 'sw' ? 'Siku 14' : '14 days',
    },
  ];

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>
              {language === 'sw' ? 'Mwongozo wa Mchakato wa Kisheria' : 'Legislative Process Guide'}
            </span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
          >
            {language === 'en' ? 'Kiswahili' : 'English'}
          </Button>
        </div>
        <CardDescription>
          {language === 'sw'
            ? 'Jifunze jinsi miswada inavyogeuzwa kuwa sheria nchini Kenya'
            : 'Learn how bills become laws in Kenya'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Process Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {processSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = selectedStep === index;
              const isCompleted = selectedStep > index;

              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isActive
                      ? 'border-blue-500 bg-blue-50'
                      : isCompleted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedStep(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedStep(index);
                    }
                  }}
                  aria-label={`${language === 'sw' ? 'Hatua' : 'Step'} ${index + 1}: ${step.title}`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon
                      className={`h-5 w-5 ${
                        isActive
                          ? 'text-blue-600'
                          : isCompleted
                            ? 'text-green-600'
                            : 'text-gray-400'
                      }`}
                    />
                    <span className="text-sm font-medium">
                      {language === 'sw' ? `Hatua ${index + 1}` : `Step ${index + 1}`}
                    </span>
                  </div>
                  <h3
                    className={`font-semibold text-sm mb-1 ${
                      isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {step.duration}
                  </Badge>
                </div>
              );
            })}
          </div>

          {/* Selected Step Details */}
          <div className="p-6 bg-gray-50 rounded-lg">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {React.createElement(processSteps[selectedStep].icon, {
                  className: 'h-8 w-8 text-blue-600',
                })}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {processSteps[selectedStep].title}
                </h3>
                <p className="text-gray-600 mb-4">{processSteps[selectedStep].description}</p>

                {/* Step-specific content */}
                {selectedStep === 1 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">
                      {language === 'sw' ? 'Jinsi ya Kushiriki:' : 'How to Participate:'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {civicEngagementMethods.map((method, idx) => (
                        <div
                          key={idx}
                          className="flex items-center space-x-2 text-sm text-gray-600"
                        >
                          <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                          <span>{method}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedStep === 2 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-800">
                      {language === 'sw' ? 'Aina za Mjadala:' : 'Types of Debate:'}
                    </h4>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        •{' '}
                        {language === 'sw'
                          ? 'Msomo wa kwanza - utangulizi'
                          : 'First reading - introduction'}
                      </div>
                      <div className="text-sm text-gray-600">
                        •{' '}
                        {language === 'sw'
                          ? 'Msomo wa pili - mjadala wa jumla'
                          : 'Second reading - general debate'}
                      </div>
                      <div className="text-sm text-gray-600">
                        •{' '}
                        {language === 'sw'
                          ? 'Hatua ya kamati - uchambuzi wa kina'
                          : 'Committee stage - detailed examination'}
                      </div>
                      <div className="text-sm text-gray-600">
                        •{' '}
                        {language === 'sw'
                          ? 'Msomo wa tatu - mjadala wa mwisho'
                          : 'Third reading - final debate'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setSelectedStep(Math.max(0, selectedStep - 1))}
              disabled={selectedStep === 0}
            >
              {language === 'sw' ? 'Nyuma' : 'Previous'}
            </Button>

            <div className="flex space-x-2">
              {processSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === selectedStep
                      ? 'bg-blue-600'
                      : index < selectedStep
                        ? 'bg-green-600'
                        : 'bg-gray-300'
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>

            <Button
              onClick={() => setSelectedStep(Math.min(processSteps.length - 1, selectedStep + 1))}
              disabled={selectedStep === processSteps.length - 1}
            >
              {language === 'sw' ? 'Mbele' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Additional Resources */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">
              {language === 'sw' ? 'Rasilimali za Ziada' : 'Additional Resources'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button variant="outline" size="sm" className="justify-start">
                <ExternalLink className="h-4 w-4 mr-2" />
                {language === 'sw' ? 'Katiba ya Kenya 2010' : 'Constitution of Kenya 2010'}
              </Button>
              <Button variant="outline" size="sm" className="justify-start">
                <ExternalLink className="h-4 w-4 mr-2" />
                {language === 'sw' ? 'Tovuti ya Bunge' : 'Parliament Website'}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LegislativeProcessGuide;

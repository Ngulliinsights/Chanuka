/**
 * Kenyan Legislative Process Component
 *
 * Provides detailed information about Kenya's legislative process
 * including bill types, stages, and public participation requirements
 *
 * Requirements: 10.4, 10.5
 */

import {
  FileText,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Calendar,
  MessageSquare,
  Eye,
  Building,
} from 'lucide-react';
import React, { useState } from 'react';

import { useKenyanContext } from '@client/lib/contexts/KenyanContextProvider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { Progress } from '@client/lib/design-system';
import { useI18n } from '@client/lib/hooks/use-i18n';

/**
 * Bill stage visualization component
 */
interface BillStageProps {
  stage: string;
  description: string;
  isActive?: boolean;
  isCompleted?: boolean;
  duration?: string;
}

const BillStage: React.FC<BillStageProps> = ({
  stage,
  description,
  isActive = false,
  isCompleted = false,
  duration,
}) => {
  return (
    <div
      className={`flex items-start space-x-3 p-3 rounded-lg ${
        isActive
          ? 'bg-blue-50 border border-blue-200'
          : isCompleted
            ? 'bg-green-50 border border-green-200'
            : 'bg-gray-50 border border-gray-200'
      }`}
    >
      <div
        className={`mt-1 ${
          isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'
        }`}
      >
        {isCompleted ? (
          <CheckCircle className="h-4 w-4" />
        ) : isActive ? (
          <Clock className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1">
        <h4
          className={`font-medium ${
            isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
          }`}
        >
          {stage}
        </h4>
        <p
          className={`text-sm mt-1 ${
            isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-600'
          }`}
        >
          {description}
        </p>
        {duration && (
          <Badge variant="outline" className="mt-2 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {duration}
          </Badge>
        )}
      </div>
    </div>
  );
};

// Civic engagement data structure
interface CivicEngagementData {
  traditionalMethods: string[];
  modernMethods: string[];
  barriers: string[];
  opportunities: string[];
}

const civicEngagementData: CivicEngagementData = {
  traditionalMethods: [
    'Attending Barazas (community meetings)',
    'Engaging with local chiefs and elders',
    'Writing petitions to representatives',
    'Participating in town hall meetings',
  ],
  modernMethods: [
    'Online public participation portals',
    'Social media engagement',
    'Email submissions to parliament',
    'Virtual town halls and webinars',
    'Mobile apps for civic engagement',
  ],
  barriers: [
    'Limited awareness of participation opportunities',
    'Language barriers (technical legal language)',
    'Geographic distance from participation venues',
    'Limited internet access in rural areas',
    'Time constraints and conflicting priorities',
  ],
  opportunities: [
    'Increased digital literacy and smartphone adoption',
    'Growing youth engagement in civic matters',
    'County government decentralization',
    'Improved transparency through online platforms',
    'Community-based organizations facilitating participation',
  ],
};

/**
 * Kenyan Legislative Process Component
 */
export const KenyanLegislativeProcess: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language } = useI18n();
  const { legalProcesses } = useKenyanContext();
  const [selectedBillType, setSelectedBillType] =
    useState<keyof typeof legalProcesses.billTypes>('ordinary');

  const currentBillType = legalProcesses.billTypes[selectedBillType];

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building className="h-5 w-5" />
          <span>
            {language === 'sw' ? 'Mchakato wa Kutunga Sheria Kenya' : "Kenya's Law-Making Process"}
          </span>
        </CardTitle>
        <CardDescription>
          {language === 'sw'
            ? 'Jifunze jinsi miswada ya sheria inavyopitia mchakato wa kuwa sheria'
            : "Learn how bills become laws in Kenya's legislative system"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="process" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="process">{language === 'sw' ? 'Mchakato' : 'Process'}</TabsTrigger>
            <TabsTrigger value="types">
              {language === 'sw' ? 'Aina za Miswada' : 'Bill Types'}
            </TabsTrigger>
            <TabsTrigger value="participation">
              {language === 'sw' ? 'Ushiriki wa Umma' : 'Public Participation'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="process" className="space-y-4 mt-4">
            {/* Bill Type Selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(legalProcesses.billTypes).map(([type, info]) => (
                <Button
                  key={type}
                  variant={selectedBillType === type ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedBillType(type as keyof typeof legalProcesses.billTypes)}
                  className="text-xs"
                >
                  {info.name}
                </Button>
              ))}
            </div>

            {/* Selected Bill Type Info */}
            <div className="p-4 bg-blue-50 rounded-lg mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">{currentBillType.name}</h3>
              <p className="text-sm text-blue-700">{currentBillType.description}</p>
            </div>

            {/* Process Steps */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 mb-3">
                {language === 'sw' ? 'Hatua za Mchakato' : 'Process Steps'}
              </h4>
              {currentBillType.process.map((stage: string, index: number) => (
                <div key={index} className="relative">
                  <BillStage
                    stage={`${index + 1}. ${stage}`}
                    description={
                      legalProcesses.stages[stage as keyof typeof legalProcesses.stages]
                        ?.description ||
                      (language === 'sw'
                        ? 'Hatua ya mchakato wa kisheria'
                        : 'Legislative process stage')
                    }
                    isActive={index === 2}
                    isCompleted={index < 2}
                    duration={index === 0 ? '1-2 weeks' : index === 1 ? '2-4 weeks' : '4-8 weeks'}
                  />
                  {index < currentBillType.process.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Timeline Estimate */}
            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {language === 'sw' ? 'Muda wa Kawaida' : 'Typical Timeline'}
                </span>
                <Badge variant="outline">
                  {selectedBillType === 'constitutional'
                    ? '6-12 months'
                    : selectedBillType === 'money'
                      ? '4-8 months'
                      : selectedBillType === 'county'
                        ? '3-6 months'
                        : '2-4 months'}
                </Badge>
              </div>
              <Progress value={60} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {language === 'sw'
                  ? 'Muda unaweza kutofautiana kulingana na ugumu wa mswada'
                  : 'Timeline may vary based on bill complexity and public interest'}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="types" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(legalProcesses.billTypes).map(([type, info]) => (
                <Card key={type} className="border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span>{info.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">{info.description}</p>
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                        {language === 'sw' ? 'Hatua Muhimu' : 'Key Stages'}
                      </h5>
                      {info.process.slice(0, 3).map((stage: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 text-xs text-gray-600"
                        >
                          <div className="w-1 h-1 bg-gray-400 rounded-full" />
                          <span>{stage}</span>
                        </div>
                      ))}
                      {info.process.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{info.process.length - 3} more stages
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="participation" className="space-y-4 mt-4">
            <div className="space-y-4">
              {/* Public Participation Requirements */}
              <Card className="border border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2 text-green-900">
                    <Users className="h-4 w-4" />
                    <span>
                      {language === 'sw'
                        ? 'Mahitaji ya Ushiriki wa Umma'
                        : 'Public Participation Requirements'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {legalProcesses.publicParticipation.requirements.map(
                      (requirement: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-start space-x-2 text-sm text-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{requirement}</span>
                        </div>
                      )
                    )}
                  </div>
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-800">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        {legalProcesses.publicParticipation.timeline}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Participation Methods */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>{language === 'sw' ? 'Njia za Kushiriki' : 'How to Participate'}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                        <Building className="h-4 w-4" />
                        <span>
                          {language === 'sw' ? 'Njia za Kitamaduni' : 'Traditional Methods'}
                        </span>
                      </h5>
                      <div className="space-y-2">
                        {civicEngagementData.traditionalMethods.map(
                          (method: string, index: number) => (
                            <div
                              key={index}
                              className="flex items-center space-x-2 text-sm text-gray-600"
                            >
                              <div className="w-2 h-2 bg-orange-400 rounded-full" />
                              <span>{method}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                        <Eye className="h-4 w-4" />
                        <span>{language === 'sw' ? 'Njia za Kisasa' : 'Modern Methods'}</span>
                      </h5>
                      <div className="space-y-2">
                        {civicEngagementData.modernMethods.map((method: string, index: number) => (
                          <div
                            key={index}
                            className="flex items-center space-x-2 text-sm text-gray-600"
                          >
                            <div className="w-2 h-2 bg-blue-400 rounded-full" />
                            <span>{method}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Barriers and Opportunities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border border-red-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2 text-red-900">
                      <AlertCircle className="h-4 w-4" />
                      <span>{language === 'sw' ? 'Vikwazo' : 'Barriers'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {civicEngagementData.barriers.map((barrier: string, index: number) => (
                        <div
                          key={index}
                          className="flex items-start space-x-2 text-sm text-red-700"
                        >
                          <div className="w-2 h-2 bg-red-400 rounded-full mt-2" />
                          <span>{barrier}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center space-x-2 text-green-900">
                      <CheckCircle className="h-4 w-4" />
                      <span>{language === 'sw' ? 'Fursa' : 'Opportunities'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {civicEngagementData.opportunities.map(
                        (opportunity: string, index: number) => (
                          <div
                            key={index}
                            className="flex items-start space-x-2 text-sm text-green-700"
                          >
                            <div className="w-2 h-2 bg-green-400 rounded-full mt-2" />
                            <span>{opportunity}</span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default KenyanLegislativeProcess;

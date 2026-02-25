/**
 * Civic Education Widget
 *
 * Provides Kenyan-specific civic education content including
 * government structure, legal processes, and participation methods
 *
 * Requirements: 10.4, 10.5
 */

import {
  BookOpen,
  Users,
  Scale,
  Building,
  FileText,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Info,
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
import { useI18n } from '@client/lib/hooks/use-i18n';

/**
 * Civic Education Widget Props
 */
interface CivicEducationWidgetProps {
  variant?: 'full' | 'compact' | 'sidebar';
  showTitle?: boolean;
  className?: string;
}

/**
 * Civic Education Widget Component
 */
export const CivicEducationWidget: React.FC<CivicEducationWidgetProps> = ({
  variant = 'full',
  showTitle = true,
  className = '',
}) => {
  const { t, language } = useI18n();
  const { government, legalProcesses, cultural } = useKenyanContext();
  const [activeTab, setActiveTab] = useState('constitution');

  /**
   * Render compact variant
   */
  if (variant === 'compact') {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>{t('civic.participation.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="justify-start">
              <Scale className="h-3 w-3 mr-2" />
              <span className="text-xs">{t('civic.constitution.title')}</span>
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Building className="h-3 w-3 mr-2" />
              <span className="text-xs">{t('civic.government.executive')}</span>
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Users className="h-3 w-3 mr-2" />
              <span className="text-xs">{t('civic.legislature.nationalAssembly')}</span>
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Users className="h-3 w-3 mr-2" />
              <span className="text-xs">{t('civic.participation.voting')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render sidebar variant
   */
  if (variant === 'sidebar') {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Civic Education</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
              <div className="flex items-center space-x-2">
                <Scale className="h-3 w-3 text-blue-600" />
                <span className="text-xs font-medium">Constitution</span>
              </div>
              <ChevronRight className="h-3 w-3 text-blue-600" />
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <Building className="h-3 w-3 text-gray-600" />
                <span className="text-xs">Government</span>
              </div>
              <ChevronRight className="h-3 w-3 text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
              <div className="flex items-center space-x-2">
                <Users className="h-3 w-3 text-gray-600" />
                <span className="text-xs">Participation</span>
              </div>
              <ChevronRight className="h-3 w-3 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /**
   * Render full variant
   */
  return (
    <Card className={`w-full ${className}`}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>{language === 'sw' ? 'Elimu ya Kiraia' : 'Civic Education'}</span>
          </CardTitle>
          <CardDescription>
            {language === 'sw'
              ? 'Jifunze kuhusu mfumo wa serikali ya Kenya na jinsi ya kushiriki'
              : "Learn about Kenya's government system and how to participate"}
          </CardDescription>
        </CardHeader>
      )}

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="constitution" className="text-xs">
              {language === 'sw' ? 'Katiba' : 'Constitution'}
            </TabsTrigger>
            <TabsTrigger value="government" className="text-xs">
              {language === 'sw' ? 'Serikali' : 'Government'}
            </TabsTrigger>
            <TabsTrigger value="legislature" className="text-xs">
              {language === 'sw' ? 'Bunge' : 'Legislature'}
            </TabsTrigger>
            <TabsTrigger value="participation" className="text-xs">
              {language === 'sw' ? 'Ushiriki' : 'Participation'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="constitution" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <Scale className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">{t('civic.constitution.title')}</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {t('civic.constitution.description')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">
                    {t('civic.constitution.billOfRights')}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {language === 'sw'
                      ? 'Haki za msingi za raia wa Kenya'
                      : 'Fundamental rights of Kenyan citizens'}
                  </p>
                </div>

                <div className="p-3 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2">
                    {t('civic.constitution.devolution')}
                  </h5>
                  <p className="text-sm text-gray-600">
                    {language === 'sw'
                      ? 'Ugatuzi wa madaraka kwa kaunti'
                      : 'Devolution of power to counties'}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="government" className="space-y-4 mt-4">
            <div className="space-y-3">
              {Object.entries(government.levels).map(([level, info]) => (
                <div key={level} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{info.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {level}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{info.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {info.institutions.map((institution, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {institution}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="legislature" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <h4 className="font-medium text-green-900">
                    {government.legislature.nationalAssembly.name}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {government.legislature.nationalAssembly.members} members
                  </Badge>
                </div>
                <p className="text-sm text-green-700">
                  {government.legislature.nationalAssembly.role}
                </p>
              </div>

              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Building className="h-4 w-4 text-purple-600" />
                  <h4 className="font-medium text-purple-900">
                    {government.legislature.senate.name}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {government.legislature.senate.members} members
                  </Badge>
                </div>
                <p className="text-sm text-purple-700">{government.legislature.senate.role}</p>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <h4 className="font-medium text-orange-900">
                    {government.legislature.countyAssembly.name}
                  </h4>
                </div>
                <p className="text-sm text-orange-700">
                  {government.legislature.countyAssembly.role}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="participation" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <h4 className="font-medium text-yellow-900">
                    {t('civic.legislature.publicParticipation')}
                  </h4>
                </div>
                <p className="text-sm text-yellow-700 mb-2">
                  {legalProcesses.publicParticipation.timeline}
                </p>
                <div className="space-y-1">
                  {legalProcesses.publicParticipation.requirements
                    .slice(0, 3)
                    .map((requirement, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 text-xs text-yellow-700"
                      >
                        <div className="w-1 h-1 bg-yellow-600 rounded-full" />
                        <span>{requirement}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>{language === 'sw' ? 'Njia za Ushiriki' : 'Participation Methods'}</span>
                  </h5>
                  <div className="space-y-1">
                    {legalProcesses.publicParticipation.methods.slice(0, 4).map((method, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-600 flex items-center space-x-2"
                      >
                        <ChevronRight className="h-3 w-3" />
                        <span>{method}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-3 border border-gray-200 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>
                      {language === 'sw' ? 'Fursa za Ushiriki' : 'Participation Opportunities'}
                    </span>
                  </h5>
                  <div className="space-y-1">
                    {cultural.civicEngagement.opportunities
                      .slice(0, 4)
                      .map((opportunity, index) => (
                        <div
                          key={index}
                          className="text-sm text-gray-600 flex items-center space-x-2"
                        >
                          <ChevronRight className="h-3 w-3" />
                          <span>{opportunity}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <ExternalLink className="h-3 w-3" />
                  <span className="text-xs">
                    {language === 'sw' ? 'Jifunze Zaidi' : 'Learn More'}
                  </span>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CivicEducationWidget;

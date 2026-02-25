/**
 * Civic Education Hub
 *
 * Central hub for Kenyan civic education content
 * Integrates legislative process guide and detailed process information
 *
 * Requirements: 10.4, 10.5
 */

import { Users, Scale, MapPin, Award, MessageCircle, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

import { useKenyanContext } from '@client/lib/contexts/KenyanContextProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { useI18n } from '@client/lib/hooks/use-i18n';

import { KenyanLegislativeProcess } from './KenyanLegislativeProcess';
import { LegislativeProcessGuide } from './LegislativeProcessGuide';

/**
 * Civic Education Topic Card
 */
interface TopicCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  onClick: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({
  title,
  description,
  icon: Icon,
  difficulty,
  estimatedTime,
  onClick,
}) => {
  const { language } = useI18n();

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  const difficultyLabels = {
    beginner: language === 'sw' ? 'Mwanzo' : 'Beginner',
    intermediate: language === 'sw' ? 'Wastani' : 'Intermediate',
    advanced: language === 'sw' ? 'Juu' : 'Advanced',
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={`text-xs ${difficultyColors[difficulty]}`}>
                  {difficultyLabels[difficulty]}
                </Badge>
                <span className="text-xs text-gray-500">{estimatedTime}</span>
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
};

/**
 * Civic Education Hub Component
 */
export const CivicEducationHub: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language } = useI18n();
  const { cultural } = useKenyanContext();
  const [activeView, setActiveView] = useState<'overview' | 'guide' | 'detailed'>('overview');

  const educationTopics = [
    {
      title: language === 'sw' ? 'Mchakato wa Kutunga Sheria' : 'Law-Making Process',
      description:
        language === 'sw'
          ? 'Jifunze jinsi miswada inavyogeuzwa kuwa sheria'
          : 'Learn how bills become laws in Kenya',
      icon: Scale,
      difficulty: 'beginner' as const,
      estimatedTime: language === 'sw' ? 'Dakika 10' : '10 minutes',
      action: () => setActiveView('guide'),
    },
    {
      title: language === 'sw' ? 'Muundo wa Serikali' : 'Government Structure',
      description:
        language === 'sw'
          ? 'Uelewa wa ngazi za serikali na majukumu yao'
          : 'Understanding government levels and their roles',
      icon: MapPin,
      difficulty: 'intermediate' as const,
      estimatedTime: language === 'sw' ? 'Dakika 15' : '15 minutes',
      action: () => setActiveView('detailed'),
    },
    {
      title: language === 'sw' ? 'Ushiriki wa Kiraia' : 'Civic Participation',
      description:
        language === 'sw'
          ? 'Njia za kushiriki katika mchakato wa kidemokrasia'
          : 'Ways to participate in democratic processes',
      icon: Users,
      difficulty: 'intermediate' as const,
      estimatedTime: language === 'sw' ? 'Dakika 12' : '12 minutes',
      action: () => setActiveView('detailed'),
    },
    {
      title: language === 'sw' ? 'Haki za Kiraia' : 'Citizen Rights',
      description:
        language === 'sw'
          ? 'Haki na wajibu wa raia chini ya katiba'
          : 'Rights and responsibilities under the constitution',
      icon: Award,
      difficulty: 'advanced' as const,
      estimatedTime: language === 'sw' ? 'Dakika 20' : '20 minutes',
      action: () => setActiveView('detailed'),
    },
  ];

  if (activeView === 'guide') {
    return (
      <div className={className}>
        <div className="mb-4">
          <Button variant="outline" onClick={() => setActiveView('overview')} className="mb-4">
            ← {language === 'sw' ? 'Rudi Nyuma' : 'Back to Overview'}
          </Button>
        </div>
        <LegislativeProcessGuide />
      </div>
    );
  }

  if (activeView === 'detailed') {
    return (
      <div className={className}>
        <div className="mb-4">
          <Button variant="outline" onClick={() => setActiveView('overview')} className="mb-4">
            ← {language === 'sw' ? 'Rudi Nyuma' : 'Back to Overview'}
          </Button>
        </div>
        <KenyanLegislativeProcess />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">
          {language === 'sw' ? 'Kituo cha Elimu ya Kiraia' : 'Civic Education Hub'}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {language === 'sw'
            ? 'Jifunze kuhusu mfumo wa kisiasa wa Kenya na jinsi ya kushiriki katika demokrasia'
            : "Learn about Kenya's political system and how to participate in democracy"}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">47</div>
            <div className="text-sm text-gray-600">{language === 'sw' ? 'Kaunti' : 'Counties'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">349</div>
            <div className="text-sm text-gray-600">{language === 'sw' ? 'Wabunge' : 'MPs'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-brand-navy">68</div>
            <div className="text-sm text-gray-600">
              {language === 'sw' ? 'Maseneta' : 'Senators'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">2010</div>
            <div className="text-sm text-gray-600">
              {language === 'sw' ? 'Katiba' : 'Constitution'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Topics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {language === 'sw' ? 'Mada za Kujifunza' : 'Learning Topics'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {educationTopics.map((topic, index) => (
            <TopicCard
              key={index}
              title={topic.title}
              description={topic.description}
              icon={topic.icon}
              difficulty={topic.difficulty}
              estimatedTime={topic.estimatedTime}
              onClick={topic.action}
            />
          ))}
        </div>
      </div>

      {/* Cultural Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>{language === 'sw' ? 'Muktadha wa Kitamaduni' : 'Cultural Context'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {language === 'sw' ? 'Lugha Rasmi' : 'Official Languages'}
              </h4>
              <div className="space-y-2">
                {cultural.languages.official.map((lang, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-sm text-gray-600">{lang}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {language === 'sw' ? 'Njia za Ushiriki' : 'Participation Methods'}
              </h4>
              <div className="space-y-2">
                {cultural.civicEngagement.modernMethods.slice(0, 3).map((method, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-sm text-gray-600">{method}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to Action */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            {language === 'sw'
              ? 'Anza Safari Yako ya Elimu ya Kiraia'
              : 'Start Your Civic Education Journey'}
          </h3>
          <p className="text-blue-700 mb-4">
            {language === 'sw'
              ? 'Chagua mada yoyote hapo juu ili kuanza kujifunza kuhusu mfumo wa kisiasa wa Kenya'
              : "Choose any topic above to start learning about Kenya's political system"}
          </p>
          <div className="flex justify-center space-x-3">
            <Button onClick={() => setActiveView('guide')}>
              {language === 'sw' ? 'Anza na Mwongozo' : 'Start with Guide'}
            </Button>
            <Button variant="outline" onClick={() => setActiveView('detailed')}>
              {language === 'sw' ? 'Maelezo ya Kina' : 'Detailed Information'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CivicEducationHub;

import { Book, Users, Shield, Target, ExternalLink } from 'lucide-react';
import React from 'react';

// import { useKenyanContext } from '@client/shared/context/KenyanContextProvider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Badge } from '@client/shared/design-system';
import { useI18n } from '@client/shared/hooks/use-i18n';

interface CivicEducationCardProps {
  topic: 'constitution' | 'legislature' | 'government' | 'participation';
  variant?: 'default' | 'compact';
  className?: string;
}

export const CivicEducationCard: React.FC<CivicEducationCardProps> = ({
  topic,
  variant = 'default',
  className = '',
}) => {
  const { t } = useI18n();
  // Note: kenyanContext available for future use

  const getTopicConfig = () => {
    switch (topic) {
      case 'constitution':
        return {
          icon: Shield,
          title: t('civic.constitution.title'),
          description: t('civic.constitution.description'),
          items: [
            t('civic.constitution.billOfRights'),
            t('civic.constitution.devolution'),
            t('civic.constitution.nationalGovernment'),
            t('civic.constitution.countyGovernment'),
          ],
          badge: '2010', // Kenya's constitution year
          color: 'bg-blue-50 border-blue-200 text-blue-800',
        };

      case 'legislature':
        return {
          icon: Users,
          title: t('civic.legislature.nationalAssembly'),
          description: "Learn about Kenya's legislative bodies and law-making process",
          items: [
            t('civic.legislature.nationalAssembly'),
            t('civic.legislature.senate'),
            t('civic.legislature.countyAssembly'),
            t('civic.legislature.lawMakingProcess'),
          ],
          badge: 'Legislative',
          color: 'bg-green-50 border-green-200 text-green-800',
        };

      case 'government':
        return {
          icon: Target,
          title: 'Government Structure',
          description: "Understanding Kenya's three arms of government",
          items: [
            t('civic.government.executive'),
            t('civic.government.judiciary'),
            t('civic.government.legislature'),
            t('civic.government.checksAndBalances'),
          ],
          badge: 'Governance',
          color: 'bg-purple-50 border-purple-200 text-purple-800',
        };

      case 'participation':
        return {
          icon: Book,
          title: t('civic.participation.title'),
          description: "Ways to participate in Kenya's democratic processes",
          items: [
            t('civic.participation.voting'),
            t('civic.participation.petitions'),
            t('civic.participation.publicForums'),
            t('civic.participation.civilSociety'),
          ],
          badge: 'Civic Duty',
          color: 'bg-orange-50 border-orange-200 text-orange-800',
        };

      default:
        return {
          icon: Book,
          title: 'Civic Education',
          description: 'Learn about civic participation',
          items: [],
          badge: 'Education',
          color: 'bg-gray-50 border-gray-200 text-gray-800',
        };
    }
  };

  const config = getTopicConfig();
  const IconComponent = config.icon;

  if (variant === 'compact') {
    return (
      <Card className={`${className} hover:shadow-md transition-shadow`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <IconComponent className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{config.title}</h4>
                <Badge variant="secondary" className="text-xs">
                  {config.badge}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{config.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} hover:shadow-lg transition-shadow`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${config.color}`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">{config.title}</CardTitle>
              <Badge variant="secondary" className="mt-1">
                {config.badge}
              </Badge>
            </div>
          </div>
        </div>
        <CardDescription className="mt-2">{config.description}</CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2 mb-4">
          {config.items.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full gap-2">
          <span>{t('common.learnMore')}</span>
          <ExternalLink className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default CivicEducationCard;

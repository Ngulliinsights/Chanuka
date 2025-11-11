import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { 
  User, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Mail, 
  Linkedin,
  Globe,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Building,
  GraduationCap,
  Award,
  Clock
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Expert, ExpertCredential, ExpertAffiliation } from '../../types/expert';
import { ExpertBadge } from './ExpertBadge';
import { CredibilityIndicator } from './CredibilityScoring';

interface ExpertProfileCardProps {
  expert: Expert;
  showFullProfile?: boolean;
  compact?: boolean;
  className?: string;
  onViewProfile?: (expertId: string) => void;
  onContact?: (expertId: string) => void;
}

/**
 * ExpertProfileCard - Comprehensive expert profile display with credentials and affiliations
 * 
 * Features:
 * - Expert verification badges and credibility scoring
 * - Expandable credentials and affiliations
 * - Contact information and external links
 * - Responsive design with compact mode
 * - Accessibility-compliant interactions
 */
export function ExpertProfileCard({
  expert,
  showFullProfile = false,
  compact = false,
  className,
  onViewProfile,
  onContact
}: ExpertProfileCardProps) {
  const [showCredentials, setShowCredentials] = useState(showFullProfile);
  const [showAffiliations, setShowAffiliations] = useState(showFullProfile);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  const getCredentialIcon = (type: ExpertCredential['type']) => {
    switch (type) {
      case 'education':
        return GraduationCap;
      case 'certification':
        return Award;
      case 'experience':
        return Building;
      case 'publication':
        return ExternalLink;
      default:
        return CheckCircle;
    }
  };

  const getAffiliationIcon = (type: ExpertAffiliation['type']) => {
    switch (type) {
      case 'academic':
        return GraduationCap;
      case 'government':
        return Building;
      case 'judicial':
        return Award;
      default:
        return Building;
    }
  };

  if (compact) {
    return (
      <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={expert.avatar} alt={expert.name} />
              <AvatarFallback>{getInitials(expert.name)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{expert.name}</h3>
                <ExpertBadge 
                  verificationType={expert.verificationType}
                  size="sm"
                />
              </div>
              
              <CredibilityIndicator 
                score={expert.credibilityScore}
                size="sm"
                className="mb-2"
              />
              
              {expert.affiliations.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  {expert.affiliations[0].role} at {expert.affiliations[0].organization}
                </p>
              )}
              
              <div className="flex flex-wrap gap-1 mt-2">
                {expert.specializations.slice(0, 2).map((spec, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {spec}
                  </Badge>
                ))}
                {expert.specializations.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{expert.specializations.length - 2}
                  </Badge>
                )}
              </div>
            </div>
            
            {onViewProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewProfile(expert.id)}
                className="text-xs"
              >
                View Profile
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={expert.avatar} alt={expert.name} />
            <AvatarFallback className="text-lg">
              {getInitials(expert.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-xl">{expert.name}</CardTitle>
              <ExpertBadge 
                verificationType={expert.verificationType}
                credibilityScore={expert.credibilityScore}
                showScore={true}
              />
            </div>
            
            {expert.bio && (
              <CardDescription className="text-sm leading-relaxed mb-3">
                {expert.bio}
              </CardDescription>
            )}
            
            <div className="flex flex-wrap gap-2 mb-3">
              {expert.specializations.map((spec, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{expert.contributionCount} contributions</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Verified {formatDate(expert.verificationDate)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            {onViewProfile && (
              <Button
                variant="outline"
                onClick={() => onViewProfile(expert.id)}
                className="text-sm"
              >
                <User className="h-4 w-4 mr-2" />
                View Profile
              </Button>
            )}
            
            {onContact && expert.contactInfo?.email && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onContact(expert.id)}
                className="text-sm"
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contact Information */}
        {expert.contactInfo && (
          <div>
            <h4 className="text-sm font-medium mb-2">Contact Information</h4>
            <div className="flex flex-wrap gap-3">
              {expert.contactInfo.website && (
                <a
                  href={expert.contactInfo.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Globe className="h-3 w-3" />
                  Website
                </a>
              )}
              {expert.contactInfo.linkedin && (
                <a
                  href={expert.contactInfo.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <Linkedin className="h-3 w-3" />
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        )}

        {/* Credentials Section */}
        {expert.credentials.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">
                Credentials ({expert.credentials.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCredentials(!showCredentials)}
                className="text-xs h-auto p-1"
              >
                {showCredentials ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show All
                  </>
                )}
              </Button>
            </div>

            {showCredentials ? (
              <div className="space-y-3">
                {expert.credentials.map((credential) => {
                  const IconComponent = getCredentialIcon(credential.type);
                  return (
                    <div key={credential.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        {credential.verified && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm">{credential.title}</h5>
                          <Badge 
                            variant={credential.verified ? "default" : "outline"} 
                            className="text-xs"
                          >
                            {credential.verified ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {credential.institution}
                          {credential.year && ` • ${credential.year}`}
                        </p>
                        {credential.verificationDate && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Verified {formatDate(credential.verificationDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {expert.credentials.slice(0, 2).map((credential) => {
                  const IconComponent = getCredentialIcon(credential.type);
                  return (
                    <div key={credential.id} className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{credential.title}</span>
                      {credential.verified && (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                  );
                })}
                {expert.credentials.length > 2 && (
                  <p className="text-xs text-muted-foreground">
                    +{expert.credentials.length - 2} more credentials
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Affiliations Section */}
        {expert.affiliations.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">
                Affiliations ({expert.affiliations.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAffiliations(!showAffiliations)}
                className="text-xs h-auto p-1"
              >
                {showAffiliations ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show All
                  </>
                )}
              </Button>
            </div>

            {showAffiliations ? (
              <div className="space-y-3">
                {expert.affiliations.map((affiliation) => {
                  const IconComponent = getAffiliationIcon(affiliation.type);
                  return (
                    <div key={affiliation.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                        {affiliation.verified && (
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-sm">{affiliation.role}</h5>
                          <Badge 
                            variant={affiliation.current ? "default" : "outline"} 
                            className="text-xs"
                          >
                            {affiliation.current ? "Current" : "Former"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {affiliation.organization}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {affiliation.type.charAt(0).toUpperCase() + affiliation.type.slice(1)}
                          </Badge>
                          {affiliation.startDate && (
                            <span>
                              {formatDate(affiliation.startDate)}
                              {affiliation.endDate && ` - ${formatDate(affiliation.endDate)}`}
                              {affiliation.current && ' - Present'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {expert.affiliations.slice(0, 2).map((affiliation) => {
                  const IconComponent = getAffiliationIcon(affiliation.type);
                  return (
                    <div key={affiliation.id} className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {affiliation.role} at {affiliation.organization}
                      </span>
                      {affiliation.verified && (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      )}
                      {affiliation.current && (
                        <Badge variant="secondary" className="text-xs">Current</Badge>
                      )}
                    </div>
                  );
                })}
                {expert.affiliations.length > 2 && (
                  <p className="text-xs text-muted-foreground">
                    +{expert.affiliations.length - 2} more affiliations
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
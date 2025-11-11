import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { 
  HelpCircle, 
  Info, 
  BookOpen, 
  Scale, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface EducationalTooltipProps {
  term: string;
  definition: string;
  context?: 'legal' | 'procedural' | 'constitutional' | 'civic' | 'general';
  examples?: string[];
  relatedTerms?: string[];
  learnMoreUrl?: string;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

/**
 * EducationalTooltip - Provides contextual help and definitions
 * Features: Term definitions, examples, related concepts, learn more links
 */
export function EducationalTooltip({
  term,
  definition,
  context = 'general',
  examples = [],
  relatedTerms = [],
  learnMoreUrl,
  children,
  side = 'top',
  className = ""
}: EducationalTooltipProps) {
  
  const getContextIcon = (context: string) => {
    switch (context) {
      case 'legal': return <Scale className="h-3 w-3 text-purple-600" />;
      case 'procedural': return <Clock className="h-3 w-3 text-blue-600" />;
      case 'constitutional': return <BookOpen className="h-3 w-3 text-indigo-600" />;
      case 'civic': return <Users className="h-3 w-3 text-green-600" />;
      default: return <Info className="h-3 w-3 text-gray-600" />;
    }
  };

  const getContextColor = (context: string) => {
    switch (context) {
      case 'legal': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'procedural': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'constitutional': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'civic': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 cursor-help ${className}`}>
            {children}
            <HelpCircle className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-sm p-0">
          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              {getContextIcon(context)}
              <div>
                <h4 className="font-semibold text-sm">{term}</h4>
                <Badge variant="outline" className={`text-xs ${getContextColor(context)}`}>
                  {context}
                </Badge>
              </div>
            </div>

            {/* Definition */}
            <p className="text-sm leading-relaxed">{definition}</p>

            {/* Examples */}
            {examples.length > 0 && (
              <div>
                <h5 className="font-medium text-xs mb-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Examples
                </h5>
                <ul className="space-y-1">
                  {examples.map((example, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-start gap-1">
                      <span className="w-1 h-1 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0"></span>
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Related Terms */}
            {relatedTerms.length > 0 && (
              <div>
                <h5 className="font-medium text-xs mb-1">Related Terms</h5>
                <div className="flex flex-wrap gap-1">
                  {relatedTerms.map((relatedTerm, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {relatedTerm}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Learn More */}
            {learnMoreUrl && (
              <div className="pt-2 border-t">
                <a 
                  href={learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Learn more
                </a>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Predefined educational tooltips for common terms
export const LegalTermTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip
    term="Legal Precedent"
    definition="A legal decision or principle established in a previous case that is either binding or persuasive for future similar cases."
    context="legal"
    examples={[
      "Supreme Court rulings that establish constitutional interpretations",
      "High Court decisions that guide lower court judgments"
    ]}
    relatedTerms={["Case Law", "Stare Decisis", "Judicial Review"]}
    learnMoreUrl="https://example.com/legal-precedents"
  >
    {children}
  </EducationalTooltip>
);

export const ConstitutionalTermTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip
    term="Constitutional Review"
    definition="The process of examining whether laws, policies, or government actions comply with the constitution."
    context="constitutional"
    examples={[
      "Judicial review of new legislation",
      "Constitutional court challenges to government policies"
    ]}
    relatedTerms={["Judicial Review", "Constitutional Court", "Bill of Rights"]}
    learnMoreUrl="https://example.com/constitutional-review"
  >
    {children}
  </EducationalTooltip>
);

export const ProceduralTermTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip
    term="Committee Stage"
    definition="The phase where a parliamentary committee examines a bill in detail, hears evidence, and may propose amendments."
    context="procedural"
    examples={[
      "Health Committee reviewing healthcare legislation",
      "Finance Committee examining budget bills"
    ]}
    relatedTerms={["Parliamentary Procedure", "Bill Reading", "Amendment Process"]}
    learnMoreUrl="https://example.com/committee-stage"
  >
    {children}
  </EducationalTooltip>
);

export const CivicTermTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip
    term="Public Participation"
    definition="The process by which citizens can engage with and influence government decision-making and policy development."
    context="civic"
    examples={[
      "Public comment periods on proposed regulations",
      "Town halls and community consultations",
      "Citizen advisory committees"
    ]}
    relatedTerms={["Civic Engagement", "Democratic Participation", "Public Consultation"]}
    learnMoreUrl="https://example.com/public-participation"
  >
    {children}
  </EducationalTooltip>
);
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Users, 
  AlertCircle, 
  Scale, 
  Download,
  ExternalLink,
  Clock,
  TrendingUp
} from 'lucide-react';
import { CivicAction, RightsCard } from '@client/types';

interface CivicActionToolboxProps {
  billId: string;
  actions: CivicAction[];
  rightsCards: RightsCard[];
  onActionSelect: (action: CivicAction) => void;
  onRightsCardOpen: (card: RightsCard) => void;
}

export const CivicActionToolbox: React.FC<CivicActionToolboxProps> = ({
  billId,
  actions,
  rightsCards,
  onActionSelect,
  onRightsCardOpen
}) => {
  const [selectedTab, setSelectedTab] = useState('actions');

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'foi': return <FileText className="h-4 w-4" />;
      case 'petition': return <Users className="h-4 w-4" />;
      case 'complaint': return <AlertCircle className="h-4 w-4" />;
      case 'public_participation': return <Scale className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getRightsIcon = (scenario: string) => {
    switch (scenario) {
      case 'arrest': return <AlertCircle className="h-4 w-4" />;
      case 'accident': return <AlertCircle className="h-4 w-4" />;
      case 'corruption_report': return <Scale className="h-4 w-4" />;
      case 'small_claims': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'secondary';
      case 'medium': return 'warning';
      case 'hard': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Civic Action Toolbox
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="actions">Take Action</TabsTrigger>
            <TabsTrigger value="rights">Know Your Rights</TabsTrigger>
          </TabsList>
          
          <TabsContent value="actions" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Choose an action to respond to this bill or situation:
            </div>
            
            {actions.map((action) => (
              <Card key={action.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getActionIcon(action.type)}
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{action.title}</h4>
                          <Badge variant={getDifficultyColor(action.difficulty) as any}>
                            {action.difficulty}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground">
                          {action.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {action.estimatedTime}
                          </div>
                          {action.successRate && (
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {Math.round(action.successRate * 100)}% success rate
                            </div>
                          )}
                          <div>
                            {action.localContacts.length} local contacts
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => onActionSelect(action)}
                      size="sm"
                    >
                      Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="rights" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Essential legal knowledge for common situations:
            </div>
            
            {rightsCards.map((card) => (
              <Card key={card.id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getRightsIcon(card.scenario)}
                      <div className="space-y-2 flex-1">
                        <h4 className="font-medium">{card.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {card.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div>{card.steps.length} steps</div>
                          <div>{card.contacts.length} local contacts</div>
                          <div>Updated {card.lastUpdated.toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => onRightsCardOpen(card)}
                        variant="outline"
                        size="sm"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button 
                        onClick={() => {/* Download PDF */}}
                        variant="ghost"
                        size="sm"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
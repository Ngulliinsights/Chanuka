import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Settings, CheckCircle, Clock, HelpCircle, TrendingUp, Database, FileText, Shield, Server } from 'lucide-react';
import { cn, getStatusColor } from '@client/lib/utils';
import { logger } from '@client/utils/logger';

interface EnvironmentSetupProps {
  environment?: any;
  health?: any;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  progress?: number;
  icon: React.ReactNode;
}

export default function EnvironmentSetup({ environment, health }: EnvironmentSetupProps) {
  const isConnected = health?.status === 'healthy';
  
  const setupSteps: SetupStep[] = [
    {
      id: 'database',
      title: 'PostgreSQL Connection',
      description: 'Database connection established with pooling',
      status: isConnected ? 'completed' : 'pending',
      icon: <Database className="h-5 w-5" />,
    },
    {
      id: 'orm',
      title: 'Drizzle ORM Setup',
      description: 'Type-safe database operations configuration',
      status: isConnected ? 'in_progress' : 'pending',
      progress: 75,
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'auth',
      title: 'Authentication System',
      description: 'Passport.js and JWT configuration',
      status: 'pending',
      icon: <Shield className="h-5 w-5" />,
    },
    {
      id: 'server',
      title: 'Development Server',
      description: 'Hot reload and development tools',
      status: 'pending',
      icon: <Server className="h-5 w-5" />,
    },
  ];

  const getStepIcon = (step: SetupStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2 text-primary" />
            Development Environment Setup
          </CardTitle>
          <CardDescription>
            Configure your development environment for optimal performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {setupSteps.map((step, index) => (
              <div key={step.id} className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">{step.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  
                  {step.status === 'completed' && step.id === 'database' && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <div className="font-mono text-sm">
                        <span className="text-gray-600">DATABASE_URL=</span>
                        <span className="text-primary">postgresql://postgres:****@localhost:5432/chanuka_db</span>
                      </div>
                    </div>
                  )}
                  
                  {step.status === 'in_progress' && step.progress && (
                    <div className="mt-3 space-y-2">
                      <Progress value={step.progress} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="text-gray-900">{step.progress}%</span>
                      </div>
                    </div>
                  )}
                  
                  {step.status === 'pending' && (
                    <div className="mt-3">
                      <Button variant="outline" size="sm">
                        {step.id === 'auth' ? 'Configure Now' : 'Start Setup'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator className="my-6" />

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Environment Variables</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {environment && Object.entries(environment).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">{key}</span>
                  <Badge 
                    variant={value === 'Set' || typeof value === 'string' ? 'default' : 'secondary'}
                    className="ml-2"
                  >
                    {typeof value === 'string' && value !== 'Set' ? value : 
                     value === 'Set' ? 'Set' : 'Not Set'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <Button className="w-full" size="lg">
              <TrendingUp className="h-4 w-4 mr-2" />
              Complete Environment Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


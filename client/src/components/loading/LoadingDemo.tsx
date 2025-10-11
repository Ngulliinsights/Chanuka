import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LoadingStateManager,
  TimeoutAwareLoader,
  NetworkAwareLoader,
  EnhancedProgressiveLoader,
  PageLoader,
  ComponentLoader,
  InlineLoader,
  ConnectionAwareLoader,
  ProgressiveLoader,
} from './LoadingStates';
import { useComprehensiveLoading, useProgressiveLoading, useTimeoutAwareOperation } from '@/hooks/useComprehensiveLoading';
import { useLoadingContext, usePageLoading, useComponentLoading, useApiLoading } from '@/contexts/LoadingContext';
import { logger } from '../utils/logger.js';

export const LoadingDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<'idle' | 'loading' | 'success' | 'error' | 'timeout'>('idle');
  const [selectedDemo, setSelectedDemo] = useState('basic');
  
  // Comprehensive loading hook
  const comprehensiveLoading = useComprehensiveLoading();
  
  // Progressive loading stages
  const progressiveStages = [
    { id: 'init', message: 'Initializing...', duration: 2000 },
    { id: 'fetch', message: 'Fetching data...', duration: 3000 },
    { id: 'process', message: 'Processing results...', duration: 2000 },
    { id: 'finalize', message: 'Finalizing...', duration: 1000 },
  ];
  
  const progressiveLoading = useProgressiveLoading(progressiveStages);
  
  // Timeout-aware operation
  const timeoutOperation = useTimeoutAwareOperation(
    async () => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return 'Operation completed successfully';
    },
    8000
  );
  
  // Loading context hooks
  const { startOperation, completeOperation, state: loadingContextState } = useLoadingContext();
  const pageLoading = usePageLoading();
  const componentLoading = useComponentLoading();
  const apiLoading = useApiLoading();

  const simulateBasicLoading = () => {
    setDemoState('loading');
    setTimeout(() => {
      setDemoState(Math.random() > 0.3 ? 'success' : 'error');
    }, 3000);
  };

  const simulateTimeoutLoading = () => {
    setDemoState('loading');
    setTimeout(() => {
      setDemoState('timeout');
    }, 6000);
  };

  const simulateComprehensiveLoading = () => {
    comprehensiveLoading.startLoading('component', {
      timeout: 10000,
      connectionAware: true,
      showTimeoutWarning: true,
    });
    
    // Simulate progress updates
    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      comprehensiveLoading.updateProgress(progress, `Loading... ${progress}%`);
      
      if (progress >= 100) {
        clearInterval(interval);
        comprehensiveLoading.stopLoading(true);
      }
    }, 1000);
  };

  const simulateProgressiveLoading = () => {
    progressiveLoading.startProgressiveLoading();
    
    // Simulate stage completion
    let currentStage = 0;
    const interval = setInterval(() => {
      if (currentStage < progressiveStages.length) {
        setTimeout(() => {
          progressiveLoading.completeCurrentStage();
          currentStage++;
        }, progressiveStages[currentStage]?.duration || 2000);
      } else {
        clearInterval(interval);
      }
    }, 2500);
  };

  const simulateContextLoading = () => {
    // Start multiple operations
    pageLoading.startPageLoading('demo-page', 'Loading demo page...');
    componentLoading.startComponentLoading('demo-component', 'Loading demo component...', 'high');
    apiLoading.startApiLoading('demo-api', 'Fetching demo data...', 'medium');
    
    // Complete them after different delays
    setTimeout(() => pageLoading.completePageLoading('demo-page'), 2000);
    setTimeout(() => componentLoading.completeComponentLoading('demo-component'), 3000);
    setTimeout(() => apiLoading.completeApiLoading('demo-api'), 4000);
  };

  const resetDemo = () => {
    setDemoState('idle');
    comprehensiveLoading.reset();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comprehensive Loading States Demo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Demonstration of various loading states, connection awareness, timeout handling, and progressive loading.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedDemo} onValueChange={setSelectedDemo}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="network">Network</TabsTrigger>
              <TabsTrigger value="timeout">Timeout</TabsTrigger>
              <TabsTrigger value="progressive">Progressive</TabsTrigger>
              <TabsTrigger value="context">Context</TabsTrigger>
            </TabsList>

            {/* Basic Loading States */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Page Loader</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 border rounded">
                      <PageLoader size="sm" message="Loading page..." />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Component Loader</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 border rounded">
                      <ComponentLoader size="md" message="Loading component..." />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Inline Loader</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 border rounded flex items-center justify-center">
                      <InlineLoader size="sm" message="Loading..." />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Loading State Manager</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Button onClick={simulateBasicLoading} disabled={demoState === 'loading'}>
                      Simulate Loading
                    </Button>
                    <Button onClick={resetDemo} variant="outline">
                      Reset
                    </Button>
                  </div>
                  
                  <div className="h-48 border rounded">
                    <LoadingStateManager
                      type="component"
                      state={demoState}
                      message="Loading demo content..."
                      error={demoState === 'error' ? new Error('Demo error occurred') : undefined}
                      onRetry={simulateBasicLoading}
                      showDetails={true}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Network-Aware Loading */}
            <TabsContent value="network" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Connection Aware Loader</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 border rounded">
                      <ConnectionAwareLoader 
                        size="md" 
                        message="Loading with connection awareness..."
                        showMessage={true}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Network Aware Loader</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 border rounded">
                      <NetworkAwareLoader 
                        size="md" 
                        message="Adapting to network conditions..."
                        showNetworkDetails={true}
                        adaptToConnection={true}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Timeout-Aware Loading */}
            <TabsContent value="timeout" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeout-Aware Loading</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Button 
                      onClick={() => timeoutOperation.execute()} 
                      disabled={timeoutOperation.isLoading}
                    >
                      Start Timeout Demo
                    </Button>
                    <Button onClick={simulateTimeoutLoading} variant="outline">
                      Simulate Timeout
                    </Button>
                  </div>
                  
                  <div className="h-48 border rounded">
                    {timeoutOperation.isLoading ? (
                      <TimeoutAwareLoader
                        timeout={8000}
                        message="Operation in progress..."
                        showTimeoutWarning={true}
                        timeoutMessage="This is taking longer than expected..."
                      />
                    ) : timeoutOperation.hasTimedOut ? (
                      <div className="flex items-center justify-center h-full text-red-600">
                        Operation timed out after {Math.round(timeoutOperation.timeElapsed / 1000)}s
                      </div>
                    ) : timeoutOperation.data ? (
                      <div className="flex items-center justify-center h-full text-green-600">
                        {timeoutOperation.data}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Click "Start Timeout Demo" to begin
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Progressive Loading */}
            <TabsContent value="progressive" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progressive Loading</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Button 
                      onClick={simulateProgressiveLoading}
                      disabled={progressiveLoading.loadingState.isLoading}
                    >
                      Start Progressive Loading
                    </Button>
                    <Button 
                      onClick={() => progressiveLoading.loadingState.isLoading && progressiveLoading.retryCurrentStage()}
                      disabled={!progressiveLoading.loadingState.isLoading}
                      variant="outline"
                    >
                      Retry Current Stage
                    </Button>
                  </div>
                  
                  <div className="h-64 border rounded">
                    {progressiveLoading.loadingState.isLoading ? (
                      <EnhancedProgressiveLoader
                        stages={progressiveStages}
                        currentStage={progressiveLoading.currentStageIndex}
                        onRetryStage={progressiveLoading.retryCurrentStage}
                        onSkipStage={progressiveLoading.skipCurrentStage}
                        showRetryButton={true}
                        allowSkip={true}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Click "Start Progressive Loading" to begin
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Context Loading */}
            <TabsContent value="context" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Loading Context Demo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Button onClick={simulateContextLoading}>
                      Start Multiple Operations
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Active Operations</h4>
                      <div className="text-sm space-y-1">
                        <div>Total: {Object.keys(loadingContextState.operations).length}</div>
                        <div>High Priority: {Object.values(loadingContextState.operations).filter(op => op.priority === 'high').length}</div>
                        <div>Global Loading: {loadingContextState.globalLoading ? 'Yes' : 'No'}</div>
                        <div>Connection: {loadingContextState.isOnline ? 'Online' : 'Offline'}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Adaptive Settings</h4>
                      <div className="text-sm space-y-1">
                        <div>Max Concurrent: {loadingContextState.adaptiveSettings.maxConcurrentOperations}</div>
                        <div>Animations: {loadingContextState.adaptiveSettings.enableAnimations ? 'On' : 'Off'}</div>
                        <div>Default Timeout: {loadingContextState.adaptiveSettings.defaultTimeout / 1000}s</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
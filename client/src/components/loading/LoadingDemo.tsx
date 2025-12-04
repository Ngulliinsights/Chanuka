import React, { useState } from 'react';

import { useProgressiveLoading, useTimeoutAwareOperation, usePageLoading, useComponentLoading } from '@client/core/loading';
import { useLoading } from '@client/core/loading';
import { logger } from '@client/utils/logger';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

import { 
  LoadingStateManager,
  PageLoader,
  ComponentLoader,
  ConnectionAwareLoader,
} from './LoadingStates';

export const LoadingDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<'idle' | 'loading' | 'success' | 'error' | 'timeout'>('idle');
  const [selectedDemo, setSelectedDemo] = useState('basic');
  
  // Progressive loading stages configuration
  const progressiveStages = [
    { id: 'init', message: 'Initializing...', duration: 2000 },
    { id: 'fetch', message: 'Fetching data...', duration: 3000 },
    { id: 'process', message: 'Processing results...', duration: 2000 },
    { id: 'finalize', message: 'Finalizing...', duration: 1000 },
  ];

  const progressiveLoading = useProgressiveLoading(progressiveStages);

  // Timeout-aware operation
  const timeoutOperation = useTimeoutAwareOperation(() => new Promise(resolve => setTimeout(resolve, 5000)), 5000);

  // Loading context hooks with required IDs
  const { startOperation, completeOperation, state: loadingContextState } = useLoading();
  const pageLoading = usePageLoading('demo-page');
  const componentLoading = useComponentLoading('demo-component');
  const apiLoading = {
    startApiLoading: (id: string, message?: string) => startOperation({
      id: `api-${id}`,
      type: 'api',
      message: message || 'Loading API...',
      priority: 'medium',
      maxRetries: 3,
      connectionAware: true,
    }),
    completeApiLoading: (id: string, success: boolean = true, error?: Error) => completeOperation(`api-${id}`, success, error),
  };

  // Simulate a basic loading operation with random success/failure
  const simulateBasicLoading = () => {
    setDemoState('loading');
    setTimeout(() => {
      setDemoState(Math.random() > 0.3 ? 'success' : 'error');
    }, 3000);
  };

  // Simulate a timeout scenario
  const simulateTimeoutLoading = () => {
    setDemoState('loading');
    setTimeout(() => {
      setDemoState('timeout');
    }, 6000);
  };

  // Simulate comprehensive loading with guaranteed success
  const simulateComprehensiveLoading = () => {
    setDemoState('loading');
    setTimeout(() => {
      setDemoState('success');
    }, 3000);
  };

  // Simulate progressive loading through multiple stages
  const simulateProgressiveLoading = () => {
    progressiveLoading.start();
    
    // Move through each stage sequentially
    let currentStage = 0;
    const advanceStage = () => {
      if (currentStage < progressiveStages.length - 1) {
        setTimeout(() => {
          progressiveLoading.nextStage();
          currentStage++;
          advanceStage();
        }, progressiveStages[currentStage]?.duration || 2000);
      }
    };
    
    advanceStage();
  };

  // Simulate multiple concurrent loading operations using context
  const simulateContextLoading = () => {
    // Start multiple operations with descriptive messages
    // Messages are provided at start time, not completion time
    pageLoading.startLoading('Loading demo page...');
    componentLoading.startLoading('Loading demo component...');
    apiLoading.startApiLoading('demo-api', 'Loading demo API...');

    // Complete operations after different delays
    // The completion methods expect boolean success flags, not string messages
    // true = success, false = failure, undefined = just complete without specific status
    setTimeout(() => pageLoading.completeLoading(true), 2000);
    setTimeout(() => componentLoading.completeLoading(true), 3000);
    setTimeout(() => apiLoading.completeApiLoading('demo-api', true), 4000);
  };

  // Reset the demo state to idle
  const resetDemo = () => {
    setDemoState('idle');
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

            {/* Basic Loading States Tab */}
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
                      <LoadingStateManager type="component" state="loading" message="Loading..." />
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

            {/* Network-Aware Loading Tab */}
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
                      <ConnectionAwareLoader />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Timeout-Aware Loading Tab */}
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
                      <LoadingStateManager
                        type="component"
                        state="loading"
                        message="Operation in progress..."
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Click "Start Timeout Demo" to begin
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Progressive Loading Tab */}
            <TabsContent value="progressive" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progressive Loading</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex space-x-2">
                    <Button 
                      onClick={simulateProgressiveLoading}
                      disabled={progressiveLoading.isLoading}
                    >
                      Start Progressive Loading
                    </Button>
                    <Button 
                      onClick={() => progressiveLoading.isLoading && progressiveLoading.start()}
                      disabled={!progressiveLoading.isLoading}
                      variant="outline"
                    >
                      Restart
                    </Button>
                  </div>
                  
                  <div className="h-64 border rounded">
                    {progressiveLoading.isLoading ? (
                      <div className="p-4">
                        <LoadingStateManager
                          type="component"
                          state="loading"
                          message={progressiveStages[progressiveLoading.currentStage]?.message || "Loading..."}
                        />
                        <div className="mt-4 text-sm text-muted-foreground text-center">
                          Stage {progressiveLoading.currentStage + 1} of {progressiveStages.length}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Click "Start Progressive Loading" to begin
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Context Loading Tab */}
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
                                <div>Max Concurrent: {loadingContextState.adaptiveSettings?.maxConcurrentOperations ?? 4}</div>
                                <div>Animations: {loadingContextState.adaptiveSettings?.enableAnimations ? 'On' : 'Off'}</div>
                                <div>Default Timeout: {(loadingContextState.adaptiveSettings?.defaultTimeout ?? 30000) / 1000}s</div>
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
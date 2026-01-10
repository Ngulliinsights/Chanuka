import React, { useState } from 'react';

import { Button } from '@client/shared/design-system/interactive/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system/interactive/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system/typography/Card';

import { useProgressiveLoading, useTimeoutAwareLoading } from './hooks';
import { LoadingStateManager, PageLoader, ComponentLoader, ConnectionAwareLoader } from './ui';

export const LoadingDemo: React.FC = () => {
  const [demoState, setDemoState] = useState<'idle' | 'loading' | 'success' | 'error' | 'timeout'>(
    'idle'
  );
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
  const timeoutOperation = useTimeoutAwareLoading(
    () => new Promise(resolve => setTimeout(resolve, 5000)),
    5000
  );

  // Loading context hooks with required IDs
  // const loadingHook = useLoading(); // Commented out as it's not used

  // const apiLoading = { // Commented out as it's not used
  //   startApiLoading: (id: string, message?: string) => {
  //     setDemoState('loading');
  //   },
  //   completeApiLoading: (id: string, success: boolean = true, error?: Error) => {
  //     setDemoState(success ? 'success' : 'error');
  //   },
  // };

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

  // Simulate progressive loading through multiple stages
  const simulateProgressiveLoading = () => {
    progressiveLoading.start();
    setDemoState('loading');
    setTimeout(() => {
      setDemoState('success');
    }, 3000);
  };

  // Simulate multiple concurrent loading operations using context
  const simulateContextLoading = () => {
    setDemoState('loading');
    setTimeout(() => {
      setDemoState('success');
    }, 2000);
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
            Demonstration of various loading states, connection awareness, timeout handling, and
            progressive loading.
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
                      <PageLoader isLoading={true} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Component Loader</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 border rounded">
                      <ComponentLoader isLoading={true} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Inline Loader</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 border rounded flex items-center justify-center">
                      <LoadingStateManager>Loading...</LoadingStateManager>
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
                    <LoadingStateManager>Loading demo content...</LoadingStateManager>
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
                      <ConnectionAwareLoader isLoading={true} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Network Aware Loader</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-32 border rounded">
                      <ConnectionAwareLoader isLoading={true} />
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
                      <LoadingStateManager>Operation in progress...</LoadingStateManager>
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
                      disabled={!progressiveLoading.isComplete}
                    >
                      Start Progressive Loading
                    </Button>
                    <Button
                      onClick={() => progressiveLoading.reset()}
                      disabled={progressiveLoading.isComplete}
                      variant="outline"
                    >
                      Reset
                    </Button>
                  </div>

                  <div className="h-64 border rounded">
                    {!progressiveLoading.isComplete ? (
                      <div className="p-4">
                        <LoadingStateManager>
                          {progressiveLoading.currentStage?.message || 'Loading...'}
                        </LoadingStateManager>
                        <div className="mt-4 text-sm text-muted-foreground text-center">
                          Stage 1 of {progressiveStages.length}
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
                    <Button onClick={simulateContextLoading}>Start Multiple Operations</Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Active Operations</h4>
                      <div className="text-sm space-y-1">
                        <div>Total: 0</div>
                        <div>High Priority: 0</div>
                        <div>Global Loading: No</div>
                        <div>Connection: Online</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Adaptive Settings</h4>
                      <div className="text-sm space-y-1">
                        <div>Max Concurrent: 4</div>
                        <div>Animations: On</div>
                        <div>Default Timeout: 30s</div>
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

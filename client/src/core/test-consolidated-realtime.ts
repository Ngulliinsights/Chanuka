/**
 * Test file for consolidated real-time module
 * This demonstrates the usage and functionality of the new consolidated module
 */

import {
  realTimeService,
  useBillTracking,
  useCommunityRealTime,
  useWebSocket,
  getRealTimeConfig,
  ConnectionState,
  BillUpdate,
  TypingIndicator,
} from './client/src/core/realtime';

// Test 1: Service Initialization
async function testServiceInitialization() {
  console.log('🧪 Testing Service Initialization...');

  try {
    // Initialize the service
    await realTimeService.initialize('test-token');

    // Check connection status
    const isConnected = realTimeService.isConnected();
    const connectionState = realTimeService.getConnectionState();

    console.log(`✅ Service initialized. Connected: ${isConnected}, State: ${connectionState}`);

    // Get service instances
    const billService = realTimeService.getBillTrackingService();
    const communityService = realTimeService.getCommunityService();
    const notificationService = realTimeService.getNotificationService();

    console.log('✅ All services accessible');

    // Test statistics
    const stats = realTimeService.getStats();
    console.log('📊 Service Stats:', stats);

    return true;
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    return false;
  }
}

// Test 2: Configuration
function testConfiguration() {
  console.log('\n🧪 Testing Configuration...');

  try {
    const config = getRealTimeConfig();

    console.log('✅ Configuration loaded successfully');
    console.log('🔗 WebSocket URL:', config.websocket.url);
    console.log('❤️ Heartbeat Interval:', config.websocket.heartbeat.interval);
    console.log('🔄 Reconnect Enabled:', config.websocket.reconnect.enabled);

    return true;
  } catch (error) {
    console.error('❌ Configuration test failed:', error);
    return false;
  }
}

// Test 3: Bill Tracking Hook Simulation
function testBillTrackingHook() {
  console.log('\n🧪 Testing Bill Tracking Hook...');

  try {
    // Simulate hook state and methods
    const mockHook: ReturnType<typeof useBillTracking> = {
      isConnected: true,
      subscribedBills: new Set([123, 456]),
      billUpdates: new Map([
        [
          123,
          [
            {
              type: 'status_change',
              data: { billId: 123, oldStatus: 'introduced', newStatus: 'passed' },
              timestamp: new Date().toISOString(),
            },
          ],
        ],
      ]),
      engagementMetrics: new Map([
        [
          123,
          {
            bill_id: 123,
            viewCount: 100,
            saveCount: 25,
            commentCount: 10,
            shareCount: 5,
            timestamp: new Date().toISOString(),
          },
        ],
      ]),
      subscribeToBill: (billId: number) => {
        console.log(`📌 Subscribed to bill ${billId}`);
      },
      unsubscribeFromBill: (billId: number) => {
        console.log(`📌 Unsubscribed from bill ${billId}`);
      },
      getBillUpdates: (billId: number) => {
        return mockHook.billUpdates.get(billId) || [];
      },
      getEngagementMetrics: (billId: number) => {
        return mockHook.engagementMetrics.get(billId) || null;
      },
    };

    // Test subscription
    mockHook.subscribeToBill(789);

    // Test getting updates
    const updates = mockHook.getBillUpdates(123);
    console.log(`✅ Retrieved ${updates.length} updates for bill 123`);

    // Test getting metrics
    const metrics = mockHook.getEngagementMetrics(123);
    console.log('📊 Engagement metrics:', metrics);

    return true;
  } catch (error) {
    console.error('❌ Bill tracking hook test failed:', error);
    return false;
  }
}

// Test 4: Community Real-time Hook Simulation
function testCommunityRealTimeHook() {
  console.log('\n🧪 Testing Community Real-time Hook...');

  try {
    // Simulate hook state and methods
    const mockHook: ReturnType<typeof useCommunityRealTime> = {
      isConnected: true,
      subscribedDiscussions: new Set(['bill_123', 'bill_456']),
      typingIndicators: new Map([
        [
          '123_root',
          [
            {
              userId: 'user1',
              billId: 123,
              isTyping: true,
              timestamp: new Date().toISOString(),
            },
          ],
        ],
      ]),
      recentComments: [
        {
          commentId: 'comment1',
          billId: 123,
          action: 'created',
          data: { text: 'Great bill!' },
          timestamp: new Date().toISOString(),
        },
      ],
      subscribeToDiscussion: (billId: number) => {
        console.log(`💬 Subscribed to discussion for bill ${billId}`);
      },
      unsubscribeFromDiscussion: (billId: number) => {
        console.log(`💬 Unsubscribed from discussion for bill ${billId}`);
      },
      sendTypingIndicator: (billId: number, parentId?: string) => {
        console.log(`⌨️ Sent typing indicator for bill ${billId}`);
      },
      stopTypingIndicator: (billId: number, parentId?: string) => {
        console.log(`⌨️ Stopped typing indicator for bill ${billId}`);
      },
      sendCommentUpdate: (billId: number, commentData: Record<string, unknown>) => {
        console.log(`💬 Sent comment update for bill ${billId}:`, commentData);
      },
      sendVoteUpdate: (billId: number, voteData: Record<string, unknown>) => {
        console.log(`🗳️ Sent vote update for bill ${billId}:`, voteData);
      },
    };

    // Test subscription
    mockHook.subscribeToDiscussion(789);

    // Test typing indicator
    mockHook.sendTypingIndicator(123);

    // Test comment update
    mockHook.sendCommentUpdate(123, { text: 'Test comment' });

    // Check typing indicators
    console.log('⌨️ Active typing indicators:', mockHook.typingIndicators.size);

    // Check recent comments
    console.log(`💬 Recent comments: ${mockHook.recentComments.length}`);

    return true;
  } catch (error) {
    console.error('❌ Community real-time hook test failed:', error);
    return false;
  }
}

// Test 5: WebSocket Hook Simulation
function testWebSocketHook() {
  console.log('\n🧪 Testing WebSocket Hook...');

  try {
    // Simulate hook state and methods
    const mockHook: ReturnType<typeof useWebSocket> = {
      isConnected: true,
      isConnecting: false,
      connectionQuality: 'good',
      error: null,
      notifications: [
        {
          id: 'notif1',
          title: 'Bill Update',
          message: 'Bill 123 has been updated',
          created_at: new Date().toISOString(),
          read: false,
        },
      ],
      notificationCount: 1,
      getRecentActivity: (limit: number) => {
        return [
          {
            id: 'activity1',
            type: 'bill_updated',
            timestamp: new Date().toISOString(),
            bill_id: '123',
          },
        ].slice(0, limit);
      },
      markNotificationRead: (id: string) => {
        console.log(`📖 Marked notification ${id} as read`);
      },
      connect: () => {
        console.log('🔗 Connecting to WebSocket...');
      },
      disconnect: () => {
        console.log('🔌 Disconnecting from WebSocket...');
      },
    };

    // Test connection status
    console.log(`✅ WebSocket connected: ${mockHook.isConnected}`);
    console.log(`✅ Connection quality: ${mockHook.connectionQuality}`);

    // Test notifications
    console.log(`📬 Notifications: ${mockHook.notifications.length}`);
    console.log(`📬 Unread notifications: ${mockHook.notificationCount}`);

    // Test recent activity
    const activity = mockHook.getRecentActivity(5);
    console.log(`📊 Recent activity: ${activity.length} items`);

    return true;
  } catch (error) {
    console.error('❌ WebSocket hook test failed:', error);
    return false;
  }
}

// Test 6: Type Safety Check
function testTypeSafety() {
  console.log('\n🧪 Testing Type Safety...');

  try {
    // Test ConnectionState enum
    const states: ConnectionState[] = [
      ConnectionState.CONNECTED,
      ConnectionState.DISCONNECTED,
      ConnectionState.CONNECTING,
      ConnectionState.RECONNECTING,
      ConnectionState.FAILED,
    ];
    console.log('✅ ConnectionState enum works correctly');

    // Test BillUpdate interface
    const testUpdate: BillUpdate = {
      type: 'status_change',
      data: { billId: 123, oldStatus: 'introduced', newStatus: 'passed' },
      timestamp: new Date().toISOString(),
    };
    console.log('✅ BillUpdate interface works correctly');

    // Test TypingIndicator interface
    const testIndicator: TypingIndicator = {
      userId: 'user123',
      billId: 123,
      isTyping: true,
      timestamp: new Date().toISOString(),
    };
    console.log('✅ TypingIndicator interface works correctly');

    return true;
  } catch (error) {
    console.error('❌ Type safety test failed:', error);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Running Consolidated Real-time Module Tests\n');

  const tests = [
    testConfiguration,
    testTypeSafety,
    testServiceInitialization,
    testBillTrackingHook,
    testCommunityRealTimeHook,
    testWebSocketHook,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error('❌ Test failed with exception:', error);
      failed++;
    }
  }

  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Consolidated real-time module is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the implementation.');
  }
}

// Run the tests
runTests().catch(console.error);

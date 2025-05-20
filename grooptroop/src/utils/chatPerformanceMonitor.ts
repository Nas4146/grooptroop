import * as Sentry from '@sentry/react-native';
import { SentryService, SentrySpan } from './sentryService';
import { FrameRateMonitor } from './frameRateMonitor';
import { MemoryMonitor } from './memoryMonitor';

// Define performance budgets
export const CHAT_PERFORMANCE_BUDGETS = {
  JS_THREAD_RENDER: 4, // ms
  UI_THREAD_RENDER: 16, // ms
  MESSAGE_SEND_RTT: 150, // ms (95th percentile)
  CHAT_MEMORY: 20 * 1024 * 1024, // 20 MB
  MESSAGE_LIST_RENDER: 8, // ms
  IMAGE_LOAD: 200, // ms
  TYPING_LATENCY: 8, // ms
};

// Type for tracking individual messages
type MessagePerformanceData = {
  messageId: string;
  sendStartTime?: number;
  sendEndTime?: number;
  receiveStartTime?: number;
  receiveEndTime?: number;
  renderStartTime?: number;
  renderEndTime?: number;
  messageSize?: number;
};

// Define a session history type
type ChatSessionHistory = {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  messagesSent: number;
  messagesReceived: number;
  avgSendTime: number;
  maxSendTime: number;
  minSendTime: number;
  successRate: number;
  jsHeapSize: number;
  frameDrops: number;
};

class ChatPerformanceMonitor {
  // Store performance data for messages
  private messagePerformance: Record<string, MessagePerformanceData> = {};
  private isActive = false;
  private activeChatId: string = '';
  private startTime: number = 0;
  private frameCheckInterval: NodeJS.Timeout | null = null;
  private memoryUsageInterval: NodeJS.Timeout | null = null;
  private messagesSent = 0;
  private messagesReceived = 0;
  private networkLatencies: number[] = [];
  private renderTimes: number[] = [];
  private chatSessionStartTime = 0;
  private lastMemoryUsage = 0;
  private jsHeapSize = 0;
  private frameDrops = 0;
  private slowRenders = 0;
  // Update the type to use SentrySpan
  private sentryTransaction: SentrySpan | null = null;
  
  private messageMetrics: Array<{
    id: string;
    sendDuration?: number;
    success: boolean;
    size: number;
  }> = [];

  private stats = {
    averageSendTime: 0,
    maxSendTime: 0,
    minSendTime: 0,
    messageCount: 0,
    successRate: 100
  };
  
  // Add as class property
  private sessionHistory: ChatSessionHistory[] = [];
  private maxHistoryLength = 10; // Keep the 10 most recent sessions
  
  /**
   * Start monitoring performance for a specific chat
   */
  startChatMonitoring(chatId: string): void {
    if (this.isActive) {
      this.stopChatMonitoring();
    }
    
    console.log(`[CHAT] Starting performance monitoring for chat ${chatId}`);
    this.isActive = true;
    this.activeChatId = chatId;
    this.startTime = Date.now();
    this.chatSessionStartTime = Date.now(); // Reset this to ensure correct duration
    this.messagePerformance = {};
    
    // Take initial memory snapshot
    MemoryMonitor.takeSnapshot(`chat_${chatId}_start`);
    this.lastMemoryUsage = 0;
    this.jsHeapSize = 0;
    
    // Reset counters
    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.networkLatencies = [];
    this.renderTimes = [];
    this.frameDrops = 0;
    this.slowRenders = 0;
    this.messageMetrics = [];
    
    // Reset stats
    this.stats = {
      averageSendTime: 0,
      maxSendTime: 0,
      minSendTime: 0,
      messageCount: 0,
      successRate: 100
    };
    
    // Start monitoring frame rate for smooth scrolling
    FrameRateMonitor.startMonitoring(`chat_${chatId}`);
    
    // Start Sentry transaction for this chat session
    // Note: Removed the __DEV__ condition - we want this in dev too for testing
    this.sentryTransaction = SentryService.startTransaction(
      `Chat Session: ${chatId}`,
      'chat.session'
    );
    
    // Add tags to the transaction
    if (this.sentryTransaction) {
      this.sentryTransaction.setTag('chat_id', chatId);
      this.sentryTransaction.setTag('monitor_type', 'chat_session');
    }
    
    // Periodically check memory usage
    this.memoryUsageInterval = setInterval(async () => {
      const snapshot = await MemoryMonitor.takeSnapshot(`chat_${chatId}_periodic`);
      
      if (snapshot && snapshot.jsHeapSize) {
        this.jsHeapSize = snapshot.jsHeapSize * 1024 * 1024; // Convert to bytes
        
        // Check if memory exceeds budget
        if (this.jsHeapSize > CHAT_PERFORMANCE_BUDGETS.CHAT_MEMORY) {
          // Replace SimplePerformance.logEvent with SentryService.logEvent
          SentryService.logEvent('chat-memory', 
            `⚠️ Chat memory exceeds budget: ${Math.round(this.jsHeapSize / (1024 * 1024))}MB / ${CHAT_PERFORMANCE_BUDGETS.CHAT_MEMORY / (1024 * 1024)}MB`, 
            undefined, true);
            
          // Add to Sentry as a breadcrumb
          if (this.sentryTransaction) {
            Sentry.addBreadcrumb({
              category: 'chat.memory',
              message: `Memory budget exceeded: ${Math.round(this.jsHeapSize / (1024 * 1024))}MB / ${CHAT_PERFORMANCE_BUDGETS.CHAT_MEMORY / (1024 * 1024)}MB`,
              level: 'warning',
              data: {
                currentMemory: Math.round(this.jsHeapSize / (1024 * 1024)),
                budget: Math.round(CHAT_PERFORMANCE_BUDGETS.CHAT_MEMORY / (1024 * 1024))
              }
            });
          }
        }
      }
    }, 5000);
    
    // Replace SimplePerformance.logEvent with SentryService.logEvent
    SentryService.logEvent('chat', `Started monitoring chat: ${chatId}`);
  }
  
  /**
   * Stop monitoring the current chat
   */
  stopChatMonitoring(): void {
    if (!this.isActive) return;
    
    console.log(`[CHAT] Stopping performance monitoring for chat ${this.activeChatId}`);
    
    // Save current session to history before clearing
    const sessionEndTime = Date.now();
    const sessionDuration = (sessionEndTime - this.chatSessionStartTime) / 1000;
    
    // Add current session to history
    this.addSessionToHistory({
      id: this.activeChatId,
      startTime: this.chatSessionStartTime,
      endTime: sessionEndTime,
      duration: sessionDuration,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      avgSendTime: this.stats.averageSendTime,
      maxSendTime: this.stats.maxSendTime,
      minSendTime: this.stats.minSendTime,
      successRate: this.stats.successRate,
      jsHeapSize: this.jsHeapSize,
      frameDrops: this.frameDrops
    });
    
    // Stop frame rate monitoring
    FrameRateMonitor.stopMonitoring();
    
    // Take final memory snapshot
    const endSnapshot = MemoryMonitor.takeSnapshot(`chat_${this.activeChatId}_end`);
    const startSnapshot = MemoryMonitor.getSnapshot(`chat_${this.activeChatId}_start`);
    
    if (startSnapshot && endSnapshot) {
      const memoryDiff = endSnapshot.jsHeapSize - startSnapshot.jsHeapSize;
      this.jsHeapSize = endSnapshot.jsHeapSize;
      
      // Log memory usage difference
      SentryService.logEvent(
        'memory', 
        `Chat ${this.activeChatId} memory change: ${Math.round(memoryDiff / 1024 / 1024)}MB`,
        {
          startHeapSize: startSnapshot.jsHeapSize,
          endHeapSize: endSnapshot.jsHeapSize,
          diff: memoryDiff
        }
      );
    }
    
    // Finish transaction
    if (this.sentryTransaction) {
      // Add final metrics
      this.sentryTransaction.setData('session_duration_ms', sessionEndTime - this.startTime);
      this.sentryTransaction.setData('messages_sent', this.messagesSent);
      
      // Finish the transaction
      this.sentryTransaction.finish();
      this.sentryTransaction = null;
    }
    
    // Clear intervals if they exist
    if (this.memoryUsageInterval) {
      clearInterval(this.memoryUsageInterval);
      this.memoryUsageInterval = null;
    }
    
    // Reset state
    this.isActive = false;
    this.activeChatId = '';
  }
  
  /**
   * Track when a message send operation starts
   */
  trackMessageSendStart(messageId: string, messageSize?: number): void {
    if (!this.isActive) return;
    
    console.log(`[CHAT_PERF] Starting performance tracking for message: ${messageId}`);
    
    // Initialize tracking for this message
    this.messagePerformance[messageId] = {
      id: messageId,
      startTime: Date.now(),
      size: messageSize || 0,
      sendComplete: false,
      renderTime: 0
    };
    
    // Skip Sentry span creation if transaction isn't ready
    if (!this.sentryTransaction) {
      console.log('[CHAT_PERF] No active Sentry transaction, skipping span creation');
      return;
    }
    
    try {
      // Create span for message sending
      const span = this.sentryTransaction.startChild({
        op: 'message.send',
        description: `Send message ${messageId.slice(0, 6)}`
      });
      
      if (span) {
        span.setData('messageId', messageId);
        if (messageSize) {
          span.setData('messageSize', messageSize);
        }
        
        // Store the span reference
        this.messagePerformance[messageId].sentrySpan = span;
        console.log('[CHAT_PERF] Created span for message:', messageId);
      }
    } catch (e) {
      console.error('[CHAT_PERF] Error creating span:', e);
    }
  }
  
  /**
   * Track when a message send operation completes
   */
  trackMessageSendComplete(messageId: string, success: boolean): void {
    if (!this.isActive) {
      console.log('[CHAT_PERF] Performance monitoring not active');
      return;
    }
    
    if (!this.messagePerformance[messageId]) {
      console.log('[CHAT_PERF] No tracking data found for message:', messageId);
      return;
    }
    
    const now = Date.now();
    const messageData = this.messagePerformance[messageId];
    const duration = now - messageData.startTime;
    
    console.log(`[CHAT_PERF] Message ${messageId} send completed in ${duration}ms. Success: ${success}`);
    
    // Update message data
    messageData.sendComplete = true;
    messageData.sendDuration = duration;
    messageData.sendSuccess = success;
    
    // Count message sent (whether successful or not)
    this.messagesSent++;
    
    // Add to metrics collection
    this.messageMetrics.push({
      id: messageId,
      sendDuration: duration,
      success: success,
      size: messageData.size
    });
    
    // Calculate and update stats
    this.updateStats();
    
    // Finish the span if it exists
    if (messageData.sentrySpan) {
      try {
        messageData.sentrySpan.setData('duration', duration);
        messageData.sentrySpan.setData('success', success);
        messageData.sentrySpan.finish();
        console.log('[CHAT_PERF] Finished span for message:', messageId);
      } catch (e) {
        console.error('[CHAT_PERF] Error finishing span:', e);
      } finally {
        // Clear reference to avoid memory leaks
        messageData.sentrySpan = null;
      }
    }
  }
  
  /**
   * Track when a message is received
   */
  trackMessageReceived(messageId: string, messageSize?: number): void {
    if (!this.isActive) return;
    
    // Track message receipt
    const receiveTime = Date.now();
    
    // Initialize if this is the first time we're seeing this message
    if (!this.messagePerformance[messageId]) {
      this.messagePerformance[messageId] = {
        id: messageId,
        receiveTime,
        renderTime: 0,
        size: messageSize || 0
      };
    } else {
      this.messagePerformance[messageId].receiveTime = receiveTime;
    }
    
    // Create span for message receipt in Sentry
    if (this.sentryTransaction) {
      const span = this.sentryTransaction.startChild(
        'message_receive',
        `Receive message ${messageId.slice(0, 6)}`
      );
      
      span.setData('messageId', messageId);
      if (messageSize) {
        span.setData('messageSize', messageSize);
      }
      
      // Store the span for later finishing
      this.messagePerformance[messageId].receiveSentrySpan = span;
      
      // Finish after a timeout if render doesn't happen
      setTimeout(() => {
        const msgData = this.messagePerformance[messageId];
        if (msgData && msgData.receiveSentrySpan) {
          msgData.receiveSentrySpan.finish();
          msgData.receiveSentrySpan = null;
        }
      }, 5000);
    }
  }
  
  /**
   * Track message render performance
   */
  trackMessageRender(messageId: string, startTime?: number, endTime?: number): void {
    if (!this.isActive) return;
    
    // Calculate render time
    const renderTime = endTime && startTime ? (endTime - startTime) : 0;
    const now = Date.now();
    
    // Initialize if this is the first time we're seeing this message
    if (!this.messagePerformance[messageId]) {
      this.messagePerformance[messageId] = {
        id: messageId,
        renderTime,
        renderTimestamp: now
      };
    } else {
      this.messagePerformance[messageId].renderTime = renderTime;
      this.messagePerformance[messageId].renderTimestamp = now;
    }
    
    // Add to Sentry breadcrumbs
    SentryService.logEvent(
      'chat',
      `Message ${messageId.slice(0, 6)} rendered in ${renderTime}ms`,
      { messageId, renderTime }
    );
    
    // Create a render span for this message
    if (this.sentryTransaction) {
      const span = this.sentryTransaction.startChild(
        'message_render',
        `Render message ${messageId.slice(0, 6)}`
      );
      
      span.setData('messageId', messageId);
      span.setData('renderTime', renderTime);
      
      // Finish the span right away
      span.finish();
      
      // Also finish the receive span if it exists
      const msgData = this.messagePerformance[messageId];
      if (msgData && msgData.receiveSentrySpan) {
        msgData.receiveSentrySpan.finish();
        msgData.receiveSentrySpan = null;
      }
    }
  }
  
  /**
   * Track when a frame drop occurs in the chat UI
   */
  trackFrameDrop(): void {
    if (!this.isActive) return;
    this.frameDrops++;
    
    // Record frame drops in Sentry
    if (this.frameDrops % 5 === 0 && this.sentryTransaction) {  // Record every 5th drop to avoid spam
      Sentry.addBreadcrumb({
        category: 'chat.performance',
        message: `Frame drops detected: ${this.frameDrops}`,
        level: 'warning'
      });
    }
  }
  
  /**
   * Get real-time chat performance metrics
   */
  getChatPerformanceMetrics(): any {
    // Ensure session duration doesn't overflow or return invalid values
    let sessionDuration = 0;
    if (this.isActive && this.chatSessionStartTime > 0) {
      sessionDuration = (Date.now() - this.chatSessionStartTime) / 1000;
      
      // Cap max duration at 24 hours to prevent unrealistic values
      sessionDuration = Math.min(sessionDuration, 24 * 60 * 60);
    }
    
    const metrics = {
      chatId: this.activeChatId,
      isActive: this.isActive,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      avgNetworkLatency: this.networkLatencies.length > 0 ? 
        this.networkLatencies.reduce((a, b) => a + b, 0) / this.networkLatencies.length : 0,
      jsHeapSize: this.jsHeapSize,
      frameDrops: this.frameDrops,
      slowRenders: this.slowRenders,
      sessionDuration: sessionDuration,
      // Add the new stats
      stats: this.stats,
      // Add session history
      sessionHistory: this.sessionHistory 
    };
    
    console.log('[CHAT_PERF] Returning metrics:', metrics);
    return metrics;
  }
  
  /**
   * Update performance statistics
   */
  updateStats(): void {
    if (this.messageMetrics.length === 0) return;
    
    // Calculate stats from collected metrics
    const sendDurations = this.messageMetrics
      .filter(m => typeof m.sendDuration === 'number')
      .map(m => m.sendDuration as number);
    
    if (sendDurations.length === 0) return;
    
    const successCount = this.messageMetrics.filter(m => m.success).length;
    
    this.stats.averageSendTime = Math.round(
      sendDurations.reduce((sum, val) => sum + val, 0) / sendDurations.length
    );
    this.stats.maxSendTime = Math.max(...sendDurations);
    this.stats.minSendTime = Math.min(...sendDurations);
    this.stats.messageCount = this.messageMetrics.length;
    this.stats.successRate = Math.round((successCount / this.messageMetrics.length) * 100);
    
    console.log('[CHAT_PERF] Updated stats:', this.stats);
  }
  
  // Add a method to manage the session history
  private addSessionToHistory(session: ChatSessionHistory): void {
    console.log(`[CHAT_PERF] Adding session to history: ${session.id}`);
    
    // Add to front of array (newest first)
    this.sessionHistory.unshift(session);
    
    // Limit the history length
    if (this.sessionHistory.length > this.maxHistoryLength) {
      this.sessionHistory = this.sessionHistory.slice(0, this.maxHistoryLength);
    }
    
    console.log(`[CHAT_PERF] History now contains ${this.sessionHistory.length} sessions`);
  }
  
  // Add a method to get the session history
  getSessionHistory(): ChatSessionHistory[] {
    return this.sessionHistory;
  }
}

// Export a singleton instance
export default new ChatPerformanceMonitor();

// Add where needed:
const reportFrameDrop = (frameDelta: number) => {
  // Use SentryService instead of direct Sentry calls
  SentryService.logEvent(
    'performance', 
    `Frame drop detected: ${frameDelta.toFixed(2)}ms`,
    { chatId: activeChatId }
  );
};

// And for any transactions:
const frameMonitoringTransaction = SentryService.startTransaction(
  'ChatFrameMonitoring',
  'ui.performance'
);
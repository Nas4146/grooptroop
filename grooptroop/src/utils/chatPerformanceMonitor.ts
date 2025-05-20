import * as Sentry from '@sentry/react-native';
import { FrameRateMonitor } from './frameRateMonitor';
import { MemoryMonitor } from './memoryMonitor';
import * as FileSystem from 'expo-file-system';
import { SentryService } from './sentryService';

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

class ChatPerformanceMonitor {
  // Store performance data for messages
  private messagePerformance: Record<string, MessagePerformanceData> = {};
  private isMonitoringChat = false;
  private currentChatId: string | null = null;
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
  private sentryTransaction: Sentry.Span | null = null;
  
  /**
   * Start monitoring performance for a specific chat
   */
  startChatMonitoring(chatId: string): void {
    if (this.isMonitoringChat) {
      this.stopChatMonitoring();
    }
    
    this.currentChatId = chatId;
    this.isMonitoringChat = true;
    this.chatSessionStartTime = Date.now();
    this.messagesSent = 0;
    this.messagesReceived = 0;
    this.networkLatencies = [];
    this.renderTimes = [];
    this.frameDrops = 0;
    this.slowRenders = 0;
    
    // Take initial memory snapshot
    MemoryMonitor.takeSnapshot(`chat_${chatId}_start`);
    this.lastMemoryUsage = 0;
    this.jsHeapSize = 0;
    
    // Start monitoring frame rate for smooth scrolling
    FrameRateMonitor.startMonitoring(`chat_${chatId}`);
    
    // Start Sentry transaction for this chat session
    if (!__DEV__) {
      this.sentryTransaction = Sentry.startTransaction({
        name: `Chat Session: ${chatId}`,
        op: 'chat.session'
      });
      
      // Add initial data - Add null check here
      if (this.sentryTransaction) {
        this.sentryTransaction.setTag('chat_id', chatId);
        this.sentryTransaction.setTag('environment', __DEV__ ? 'development' : 'production');
      }
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
    if (!this.isMonitoringChat) return;
    
    // Clean up monitoring resources
    FrameRateMonitor.stopMonitoring();
    
    if (this.memoryUsageInterval) {
      clearInterval(this.memoryUsageInterval);
      this.memoryUsageInterval = null;
    }
    
    // Take final memory snapshot
    if (this.currentChatId) {
      MemoryMonitor.takeSnapshot(`chat_${this.currentChatId}_end`);
    }
    
    // Calculate final metrics
    const sessionDuration = (Date.now() - this.chatSessionStartTime) / 1000;
    const avgNetworkLatency = this.networkLatencies.length > 0 ? 
      this.networkLatencies.reduce((a, b) => a + b, 0) / this.networkLatencies.length : 0;
    
    // Calculate P95 network latency
    let p95NetworkLatency = 0;
    if (this.networkLatencies.length > 0) {
      const sortedLatencies = [...this.networkLatencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      p95NetworkLatency = sortedLatencies[p95Index];
    }
    
    const avgRenderTime = this.renderTimes.length > 0 ? 
      this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length : 0;
    
    // Log session summary - Replace SimplePerformance.logEvent with SentryService.logEvent
    SentryService.logEvent('chat-session', `Chat session summary:
      - Duration: ${sessionDuration.toFixed(1)}s
      - Messages sent: ${this.messagesSent}
      - Messages received: ${this.messagesReceived}
      - Avg network latency: ${avgNetworkLatency.toFixed(1)}ms
      - P95 network latency: ${p95NetworkLatency.toFixed(1)}ms
      - Avg message render: ${avgRenderTime.toFixed(1)}ms
      - Frame drops: ${this.frameDrops}
      - Slow renders: ${this.slowRenders}
      - Final JS heap: ${(this.jsHeapSize / (1024 * 1024)).toFixed(1)}MB
    `);
    
    // Send data to Sentry Performance Monitoring
    if (!__DEV__ && this.currentChatId && this.sentryTransaction) {
      // Add metrics as data to the transaction
      this.sentryTransaction.setData('metrics', {
        duration: sessionDuration,
        messagesSent: this.messagesSent,
        messagesReceived: this.messagesReceived,
        avgNetworkLatency,
        p95NetworkLatency,
        avgRenderTime,
        frameDrops: this.frameDrops,
        slowRenders: this.slowRenders,
        jsHeapSize: this.jsHeapSize / (1024 * 1024) // Convert to MB for readability
      });
      
      // Set measurements that will appear in Sentry Performance
      this.sentryTransaction.setMeasurement('duration_seconds', sessionDuration, 'second');
      this.sentryTransaction.setMeasurement('messages_sent', this.messagesSent, 'none');
      this.sentryTransaction.setMeasurement('messages_received', this.messagesReceived, 'none');
      this.sentryTransaction.setMeasurement('avg_network_latency', avgNetworkLatency, 'millisecond');
      this.sentryTransaction.setMeasurement('p95_network_latency', p95NetworkLatency, 'millisecond');
      this.sentryTransaction.setMeasurement('avg_render_time', avgRenderTime, 'millisecond');
      this.sentryTransaction.setMeasurement('frame_drops', this.frameDrops, 'none');
      this.sentryTransaction.setMeasurement('slow_renders', this.slowRenders, 'none');
      this.sentryTransaction.setMeasurement('js_heap_size', this.jsHeapSize / (1024 * 1024), 'megabyte');
      
      // Check for performance issues
      if (avgNetworkLatency > CHAT_PERFORMANCE_BUDGETS.MESSAGE_SEND_RTT) {
        this.sentryTransaction.setTag('has_network_issues', 'true');
      }
      
      if (this.slowRenders > 0) {
        this.sentryTransaction.setTag('has_render_issues', 'true');
      }
      
      if (this.frameDrops > 5) {
        this.sentryTransaction.setTag('has_frame_drops', 'true');
      }
      
      // Finish the transaction
      this.sentryTransaction.finish();
      this.sentryTransaction = null;
      
      // Replace SimplePerformance.logEvent with SentryService.logEvent
      SentryService.logEvent('chat', 'Chat metrics sent to Sentry');
    }
    
    this.isMonitoringChat = false;
    this.currentChatId = null;
    this.messagePerformance = {};
  }

  /**
   * Track when a message send operation starts
   */
  trackMessageSendStart(messageId: string, messageSize?: number): void {
    if (!this.isMonitoringChat) return;
    
    this.messagePerformance[messageId] = {
      messageId,
      sendStartTime: Date.now(),
      messageSize
    };
    
    // Create span for message sending in Sentry
    if (this.sentryTransaction) {
      const span = this.sentryTransaction.startChild({
        op: 'chat.message.send',
        description: `Send message ${messageId.slice(0, 6)}`,
        data: {
          messageId,
          messageSize
        }
      });
      
      // Store the span in the message data for later use
      // We need to cast to any because we're adding a property not in the type
      (this.messagePerformance[messageId] as any).sentrySpan = span;
    }
  }
  
  /**
   * Track when a message send operation completes
   */
  trackMessageSendComplete(messageId: string, success: boolean = true): void {
    if (!this.isMonitoringChat) return;
    
    const msgData = this.messagePerformance[messageId];
    if (msgData && msgData.sendStartTime) {
      msgData.sendEndTime = Date.now();
      
      const latency = msgData.sendEndTime - msgData.sendStartTime;
      this.networkLatencies.push(latency);
      this.messagesSent++;
      
      // Finish the span if it exists
      if ((msgData as any).sentrySpan) {
        const span = (msgData as any).sentrySpan;
        
        // Add data about the result
        span.setData('success', success);
        span.setData('latency', latency);
        span.setData('messageSize', msgData.messageSize);
        
        if (!success) {
          span.setStatus('internal_error');
        }
        
        span.finish();
      }
      
      if (latency > CHAT_PERFORMANCE_BUDGETS.MESSAGE_SEND_RTT) {
        // Replace SimplePerformance.logEvent with SentryService.logEvent
        SentryService.logEvent('chat-network', 
          `⚠️ Message send latency exceeds budget: ${latency}ms / ${CHAT_PERFORMANCE_BUDGETS.MESSAGE_SEND_RTT}ms`,
          undefined, true);
      }
      
      if (success) {
        // Replace SimplePerformance.logEvent with SentryService.logEvent
        SentryService.logEvent('chat-network', 
          `Message ${messageId.slice(0, 6)} sent in ${latency}ms (${msgData.messageSize ? (msgData.messageSize / 1024).toFixed(1) + 'KB' : 'unknown size'})`);
      } else {
        // Replace SimplePerformance.logEvent with SentryService.logEvent
        SentryService.logEvent('chat-network', 
          `⚠️ Failed to send message ${messageId.slice(0, 6)} after ${latency}ms`,
          undefined, true);
      }
    }
  }
  
  /**
   * Track when a message is received
   */
  trackMessageReceived(messageId: string, messageSize?: number): void {
    if (!this.isMonitoringChat) return;
    
    // Create entry if it doesn't exist
    if (!this.messagePerformance[messageId]) {
      this.messagePerformance[messageId] = {
        messageId,
        receiveStartTime: Date.now(),
        messageSize
      };
    } else {
      this.messagePerformance[messageId].receiveStartTime = Date.now();
    }
    
    this.messagesReceived++;
    
    // Create span for message receipt in Sentry
    if (this.sentryTransaction) {
      const span = this.sentryTransaction.startChild({
        op: 'chat.message.receive',
        description: `Receive message ${messageId.slice(0, 6)}`,
        data: {
          messageId,
          messageSize
        }
      });
      
      // Store the span in the message data for later use
      (this.messagePerformance[messageId] as any).receiveSentrySpan = span;
      
      // We'll finish this span when rendering is complete
      // or after a timeout in case rendering doesn't happen
      setTimeout(() => {
        if ((this.messagePerformance[messageId] as any).receiveSentrySpan) {
          (this.messagePerformance[messageId] as any).receiveSentrySpan.finish();
          (this.messagePerformance[messageId] as any).receiveSentrySpan = null;
        }
      }, 5000);
    }
  }
  
  /**
   * Track message render performance
   */
  trackMessageRender(messageId: string, startTime: number, endTime: number): void {
    if (!this.isMonitoringChat) return;
    
    const renderTime = endTime - startTime;
    this.renderTimes.push(renderTime);
    
    // Create a render span
    if (this.sentryTransaction) {
      const span = this.sentryTransaction.startChild({
        op: 'chat.message.render',
        description: `Render message ${messageId.slice(0, 6)}`,
        startTimestamp: startTime / 1000, // Sentry uses seconds
        endTimestamp: endTime / 1000,
        data: {
          messageId,
          renderTime
        }
      });
      
      // Finish the span immediately since we know start/end times
      span.finish();
      
      // Also finish the receive span if it exists
      if ((this.messagePerformance[messageId] as any).receiveSentrySpan) {
        (this.messagePerformance[messageId] as any).receiveSentrySpan.finish();
        (this.messagePerformance[messageId] as any).receiveSentrySpan = null;
      }
    }
    
    // Check if render time exceeds budget
    if (renderTime > CHAT_PERFORMANCE_BUDGETS.MESSAGE_LIST_RENDER) {
      // Replace SimplePerformance.logEvent with SentryService.logEvent
      SentryService.logEvent('chat-render', 
        `⚠️ Message render time exceeds budget: ${renderTime.toFixed(1)}ms / ${CHAT_PERFORMANCE_BUDGETS.MESSAGE_LIST_RENDER}ms`,
        undefined, true);
      this.slowRenders++;
    }
    
    // Update message data
    if (this.messagePerformance[messageId]) {
      this.messagePerformance[messageId].renderStartTime = startTime;
      this.messagePerformance[messageId].renderEndTime = endTime;
    }
  }
  
  /**
   * Track when a frame drop occurs in the chat UI
   */
  trackFrameDrop(): void {
    if (!this.isMonitoringChat) return;
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
    return {
      chatId: this.currentChatId,
      isActive: this.isMonitoringChat,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      avgNetworkLatency: this.networkLatencies.length > 0 ? 
        this.networkLatencies.reduce((a, b) => a + b, 0) / this.networkLatencies.length : 0,
      jsHeapSize: this.jsHeapSize,
      frameDrops: this.frameDrops,
      slowRenders: this.slowRenders,
      sessionDuration: (Date.now() - this.chatSessionStartTime) / 1000
    };
  }
}

export default new ChatPerformanceMonitor();
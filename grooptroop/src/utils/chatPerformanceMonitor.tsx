import * as Sentry from '@sentry/react-native';
import { SentryService } from './sentryService';
import { Platform } from 'react-native';
import { FrameRateMonitor } from './frameRateMonitor';
import { MemoryMonitor } from './memoryMonitor';

/**
 * Metrics tracked by the Chat Performance Monitor
 */
export interface ChatMetrics {
  // Session information
  chatId: string;
  isActive: boolean;
  sessionStartTime: number;
  sessionDuration: number; // seconds
  
  // Message metrics
  messagesSent: number;
  messagesReceived: number;
  messagesFailed: number;
  totalMessageSize: number; // bytes
  avgMessageSize: number; // bytes
  
  // Network performance
  avgNetworkLatency: number; // ms
  maxNetworkLatency: number; // ms
  lastNetworkLatency: number; // ms
  
  // Rendering performance
  renderTimes: Record<string, number[]>; // ms
  avgRenderTime: number; // ms
  maxRenderTime: number; // ms
  slowRenders: number; // count of renders > 16ms
  
  // Frame rate metrics
  frameDrops: number;
  jsHeapSize: number; // bytes
  memoryUsage: number; // bytes
  
  // Message history for detailed analysis
  messageHistory: Array<{
    id: string;
    type: 'sent' | 'received';
    size: number; // bytes
    latency?: number; // ms, for sent messages
    timestamp: number;
    success?: boolean;
  }>;
}

/**
 * Monitors and tracks chat performance metrics
 */
class ChatPerformanceMonitor {
  private static _isActive: boolean = false;
  private static _chatId: string = '';
  private static _sessionStartTime: number = 0;
  private static _latencyMeasurements: number[] = [];
  private static _renderMeasurements: Record<string, number[]> = {};
  private static _messageTracker: Map<string, { startTime: number; size: number }> = new Map();
  private static _metrics: ChatMetrics = ChatPerformanceMonitor.createDefaultMetrics();
  private static _memoryInterval: NodeJS.Timeout | null = null;
  private static _frameRateInterval: NodeJS.Timeout | null = null;
  
  /**
   * Create default metrics object
   */
  private static createDefaultMetrics(): ChatMetrics {
    return {
      chatId: '',
      isActive: false,
      sessionStartTime: 0,
      sessionDuration: 0,
      messagesSent: 0,
      messagesReceived: 0,
      messagesFailed: 0,
      totalMessageSize: 0,
      avgMessageSize: 0,
      avgNetworkLatency: 0,
      maxNetworkLatency: 0,
      lastNetworkLatency: 0,
      renderTimes: {},
      avgRenderTime: 0,
      maxRenderTime: 0,
      slowRenders: 0,
      frameDrops: 0,
      jsHeapSize: 0,
      memoryUsage: 0,
      messageHistory: []
    };
  }
  
  /**
   * Start monitoring a chat session
   */
  static startChatMonitoring(chatId: string): void {
    // Skip if already monitoring this chat
    if (this._isActive && this._chatId === chatId) {
      return;
    }
    
    // If monitoring a different chat, stop the previous monitoring
    if (this._isActive && this._chatId !== chatId) {
      this.stopChatMonitoring();
    }
    
    console.log(`[CHAT_PERF] Starting performance monitoring for chat ${chatId}`);
    this._isActive = true;
    this._chatId = chatId;
    this._sessionStartTime = Date.now();
    this._latencyMeasurements = [];
    this._renderMeasurements = {};
    this._messageTracker.clear();
    
    // Reset metrics
    this._metrics = {
      ...this.createDefaultMetrics(),
      chatId,
      isActive: true,
      sessionStartTime: this._sessionStartTime
    };
    
    // Register with Sentry service
    SentryService.logEvent('chat_performance', `Started monitoring chat ${chatId}`, {
      chatId,
      timestamp: this._sessionStartTime
    });
    
    // Start frame rate monitoring
    FrameRateMonitor.startMonitoring();
    
    // Set up periodic collection of performance data
    this.startPeriodicMetricsCollection();
  }
  
  /**
   * Stop monitoring the current chat session
   */
  static stopChatMonitoring(): void {
    if (!this._isActive) return;
    
    console.log('[CHAT_PERF] Stopping chat performance monitoring');
    this._isActive = false;
    
    // Final metrics calculation
    const sessionDuration = Math.floor((Date.now() - this._sessionStartTime) / 1000);
    this._metrics.sessionDuration = sessionDuration;
    this._metrics.isActive = false;
    
    // Log to Sentry
    SentryService.logEvent('chat_performance', `Stopped monitoring chat ${this._chatId}`, {
      chatId: this._chatId,
      duration: sessionDuration,
      messagesSent: this._metrics.messagesSent,
      messagesReceived: this._metrics.messagesReceived,
      avgLatency: this._metrics.avgNetworkLatency
    });
    
    // Stop frame rate monitoring
    FrameRateMonitor.stopMonitoring();
    
    // Clear intervals
    this.stopPeriodicMetricsCollection();
  }
  
  /**
   * Start periodic collection of performance metrics
   */
  private static startPeriodicMetricsCollection(): void {
    // Stop any existing intervals
    this.stopPeriodicMetricsCollection();
    
    // Memory usage monitoring (every 5 seconds)
    this._memoryInterval = setInterval(async () => {
      try {
        // Update memory metrics
        const memoryInfo = await MemoryMonitor.getCurrentMemoryUsage();
        
        // Update metrics
        this._metrics.jsHeapSize = memoryInfo.jsHeapSize;
        this._metrics.memoryUsage = memoryInfo.nativeMemoryUsage;
        
        // Check for memory leaks
        if (this._metrics.jsHeapSize > 150 * 1024 * 1024) { // 150MB threshold
          SentryService.logEvent(
            'chat_performance', 
            `High memory usage detected in chat ${this._chatId}`, 
            {
              jsHeapSize: this._metrics.jsHeapSize,
              memoryUsage: this._metrics.memoryUsage
            },
            true // mark as error
          );
        }
      } catch (e) {
        console.error('[CHAT_PERF] Error collecting memory metrics:', e);
      }
    }, 5000);
    
    // Frame rate monitoring (every 2 seconds)
    this._frameRateInterval = setInterval(() => {
      try {
        // Get frame rate metrics
        const frameMetrics = FrameRateMonitor.getMetrics();
        this._metrics.frameDrops = frameMetrics.droppedFrames;
        
        // Log high frame drop rates
        if (frameMetrics.droppedFrames > 5) {
          SentryService.logEvent(
            'chat_performance',
            `Frame drops in chat ${this._chatId}: ${frameMetrics.droppedFrames}`,
            { 
              droppedFrames: frameMetrics.droppedFrames,
              fps: 60 - frameMetrics.droppedFrames
            }
          );
        }
      } catch (e) {
        console.error('[CHAT_PERF] Error collecting frame metrics:', e);
      }
    }, 2000);
    
    // Update session duration periodically
    setInterval(() => {
      if (this._isActive) {
        this._metrics.sessionDuration = Math.floor((Date.now() - this._sessionStartTime) / 1000);
      }
    }, 1000);
  }
  
  /**
   * Stop periodic metrics collection
   */
  private static stopPeriodicMetricsCollection(): void {
    if (this._memoryInterval) {
      clearInterval(this._memoryInterval);
      this._memoryInterval = null;
    }
    
    if (this._frameRateInterval) {
      clearInterval(this._frameRateInterval);
      this._frameRateInterval = null;
    }
  }
  
  /**
   * Track when a message send starts
   */
  static trackMessageSendStart(messageId: string, sizeBytes: number): void {
    if (!this._isActive) return;
    
    this._messageTracker.set(messageId, {
      startTime: Date.now(),
      size: sizeBytes
    });
    
    console.log(`[CHAT_PERF] Message send started: ${messageId} (${sizeBytes} bytes)`);
  }
  
  /**
   * Track when a message send completes
   */
  static trackMessageSendComplete(messageId: string, success: boolean): void {
    if (!this._isActive) return;
    
    const messageInfo = this._messageTracker.get(messageId);
    if (!messageInfo) {
      console.warn(`[CHAT_PERF] No start record for message ${messageId}`);
      return;
    }
    
    // Calculate latency
    const endTime = Date.now();
    const latency = endTime - messageInfo.startTime;
    
    // Update metrics
    if (success) {
      this._metrics.messagesSent++;
      this._latencyMeasurements.push(latency);
      this._metrics.totalMessageSize += messageInfo.size;
      
      // Update averages
      this._metrics.avgNetworkLatency = this._latencyMeasurements.reduce((sum, val) => sum + val, 0) / 
        this._latencyMeasurements.length;
      
      this._metrics.avgMessageSize = this._metrics.totalMessageSize / 
        (this._metrics.messagesSent + this._metrics.messagesReceived);
      
      // Update max latency if needed
      if (latency > this._metrics.maxNetworkLatency) {
        this._metrics.maxNetworkLatency = latency;
      }
      
      this._metrics.lastNetworkLatency = latency;
    } else {
      this._metrics.messagesFailed++;
    }
    
    // Add to message history
    this._metrics.messageHistory.push({
      id: messageId,
      type: 'sent',
      size: messageInfo.size,
      latency,
      timestamp: endTime,
      success
    });
    
    // Keep message history at a reasonable size
    if (this._metrics.messageHistory.length > 100) {
      this._metrics.messageHistory.shift();
    }
    
    // Clean up tracker
    this._messageTracker.delete(messageId);
    
    // Log slow sends
    if (latency > 1000) {
      SentryService.logEvent(
        'chat_performance',
        `Slow message send: ${latency}ms for message ${messageId}`,
        { latency, messageId, success }
      );
    }
    
    console.log(`[CHAT_PERF] Message send completed: ${messageId} (${latency}ms, success: ${success})`);
  }
  
  /**
   * Track when a message is received
   */
  static trackMessageReceived(messageId: string, sizeBytes: number): void {
    if (!this._isActive) return;
    
    this._metrics.messagesReceived++;
    this._metrics.totalMessageSize += sizeBytes;
    
    // Update average message size
    this._metrics.avgMessageSize = this._metrics.totalMessageSize / 
      (this._metrics.messagesSent + this._metrics.messagesReceived);
    
    // Add to message history
    this._metrics.messageHistory.push({
      id: messageId,
      type: 'received',
      size: sizeBytes,
      timestamp: Date.now()
    });
    
    // Keep message history at a reasonable size
    if (this._metrics.messageHistory.length > 100) {
      this._metrics.messageHistory.shift();
    }
    
    console.log(`[CHAT_PERF] Message received: ${messageId} (${sizeBytes} bytes)`);
  }
  
  /**
   * Track component rendering time
   */
  static trackRenderTime(component: string, renderTimeMs: number): void {
    if (!this._isActive) return;
    
    // Initialize array for this component if needed
    if (!this._renderMeasurements[component]) {
      this._renderMeasurements[component] = [];
    }
    
    // Add measurement
    this._renderMeasurements[component].push(renderTimeMs);
    
    // Keep length reasonable
    if (this._renderMeasurements[component].length > 50) {
      this._renderMeasurements[component].shift();
    }
    
    // Update metrics
    this._metrics.renderTimes = { ...this._renderMeasurements };
    
    // Calculate average render time across all components
    let totalRenderTime = 0;
    let renderCount = 0;
    
    Object.values(this._renderMeasurements).forEach(times => {
      times.forEach(time => {
        totalRenderTime += time;
        renderCount++;
        
        // Count slow renders
        if (time > 16) { // 16ms = 60fps threshold
          this._metrics.slowRenders++;
        }
        
        // Update max render time if needed
        if (time > this._metrics.maxRenderTime) {
          this._metrics.maxRenderTime = time;
        }
      });
    });
    
    this._metrics.avgRenderTime = renderCount > 0 ? totalRenderTime / renderCount : 0;
    
    // Log very slow renders
    if (renderTimeMs > 100) {
      SentryService.logEvent(
        'chat_performance',
        `Very slow render: ${component} took ${renderTimeMs.toFixed(1)}ms`,
        { component, renderTime: renderTimeMs }
      );
    }
  }
  
  /**
   * Get the current chat performance metrics
   */
  static getChatPerformanceMetrics(): ChatMetrics {
    // Update session duration
    if (this._isActive) {
      this._metrics.sessionDuration = Math.floor((Date.now() - this._sessionStartTime) / 1000);
    }
    
    return { ...this._metrics };
  }
  
  /**
   * Reset all metrics
   */
  static resetMetrics(): void {
    const chatId = this._chatId;
    const isActive = this._isActive;
    const sessionStartTime = this._sessionStartTime;
    
    this._latencyMeasurements = [];
    this._renderMeasurements = {};
    this._messageTracker.clear();
    
    this._metrics = {
      ...this.createDefaultMetrics(),
      chatId,
      isActive,
      sessionStartTime
    };
    
    console.log(`[CHAT_PERF] Metrics reset for chat ${chatId}`);
  }
  
  /**
   * Track a burst of messages (for stress testing)
   */
  static simulateMessageBurst(count: number, sizeBytes: number): void {
    if (!this._isActive) {
      console.warn('[CHAT_PERF] Cannot simulate message burst: monitoring not active');
      return;
    }
    
    console.log(`[CHAT_PERF] Simulating burst of ${count} messages (${sizeBytes} bytes each)`);
    
    // Track burst start
    const burstStartTime = Date.now();
    const burstSpan = SentryService.startTransaction(`message_burst_${count}`, 'stress_test');
    
    // Simulate sending messages in a burst
    for (let i = 0; i < count; i++) {
      const messageId = `burst_${Date.now()}_${i}`;
      
      // Track start
      this.trackMessageSendStart(messageId, sizeBytes);
      
      // After random delay, complete the send
      const delay = Math.random() * 300 + 50; // 50-350ms
      
      setTimeout(() => {
        this.trackMessageSendComplete(messageId, Math.random() > 0.05); // 5% failure rate
        
        // After another delay, simulate receiving a response
        setTimeout(() => {
          this.trackMessageReceived(`response_${messageId}`, Math.floor(sizeBytes * 0.8));
        }, Math.random() * 200 + 50); // 50-250ms
      }, delay);
    }
    
    // Complete the burst span
    setTimeout(() => {
      const burstDuration = Date.now() - burstStartTime;
      burstSpan.setData('message_count', count);
      burstSpan.setData('total_size', sizeBytes * count);
      burstSpan.setData('duration_ms', burstDuration);
      burstSpan.finish();
      
      console.log(`[CHAT_PERF] Message burst completed in ${burstDuration}ms`);
    }, count * 50 + 500); // Ensure all messages have time to process
  }
}

export default ChatPerformanceMonitor;
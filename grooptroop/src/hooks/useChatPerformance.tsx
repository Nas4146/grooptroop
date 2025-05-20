import { useRef, useEffect, useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import { SentryService } from '../utils/sentryService';
import ChatPerformanceMonitor from '../utils/chatPerformanceMonitor';

export function useChatPerformance(chatId: string) {
  const transaction = useRef<any>(null);
  const messageSpans = useRef<Record<string, any>>({});
  
  useEffect(() => {
    // Start monitoring when hook is first used
    ChatPerformanceMonitor.startChatMonitoring(chatId);
    
    // Create a transaction for this chat session
    transaction.current = SentryService.startTransaction(
      `Chat:${chatId}`, 
      'chat_session'
    );
    
    // Add relevant tags for filtering
    transaction.current.setTag('chat_id', chatId);
    transaction.current.setTag('feature', 'messaging');
    
    // Clean up when unmounting
    return () => {
      ChatPerformanceMonitor.stopChatMonitoring();
      
      if (transaction.current) {
        transaction.current.finish();
      }
    };
  }, [chatId]);
  
  // Track message sending
  const trackMessageSend = useCallback((messageId: string, size: number) => {
    ChatPerformanceMonitor.trackMessageSendStart(messageId, size);
    
    // Create child span
    if (transaction.current) {
      messageSpans.current[messageId] = transaction.current.startChild(
        `SendMessage:${messageId.slice(0, 6)}`, 
        'message.send'
      );
    }
    
    // Return a function to complete the measurement
    return (success: boolean) => {
      ChatPerformanceMonitor.trackMessageSendComplete(messageId, success);
      
      if (messageSpans.current[messageId]) {
        messageSpans.current[messageId].finish();
        delete messageSpans.current[messageId];
      }
    };
  }, []);
  
  // Track message receiving
  const trackMessageReceived = useCallback((messageId: string, size: number) => {
    ChatPerformanceMonitor.trackMessageReceived(messageId, size);
  }, []);
  
  // Track rendering performance
  const trackRendering = useCallback((component: string, startTime: number) => {
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      SentryService.logEvent(
        'render', 
        `${component} rendered in ${duration.toFixed(1)}ms`
      );
      
      if (transaction.current) {
        transaction.current.setData(`render_time_${component}`, duration);
      }
    };
  }, []);
  
  // Get current metrics
  const getMetrics = useCallback(() => {
    return ChatPerformanceMonitor.getChatPerformanceMetrics();
  }, []);
  
  return {
    trackMessageSend,
    trackMessageReceived,
    trackRendering,
    getMetrics
  };
}
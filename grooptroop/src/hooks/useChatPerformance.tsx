import { useRef, useEffect, useCallback } from 'react';
import ChatPerformanceMonitor from '../utils/chatPerformanceMonitor';
import { ChatMetrics } from '../utils/chatPerformanceMonitor';

/**
 * Hook to help track chat performance
 */
export function useChatPerformance(chatId: string | undefined) {
  const renderTimes = useRef<Record<string, number>>({});
  
  // Start monitoring when component mounts
  useEffect(() => {
    if (chatId) {
      ChatPerformanceMonitor.startChatMonitoring(chatId);
      
      return () => {
        ChatPerformanceMonitor.stopChatMonitoring();
      };
    }
  }, [chatId]);
  
  // Track render start for a component
  const trackRenderStart = useCallback((componentName: string) => {
    renderTimes.current[componentName] = performance.now();
    
    // Return a function to call when render is complete
    return () => {
      const startTime = renderTimes.current[componentName];
      if (startTime) {
        const renderTime = performance.now() - startTime;
        ChatPerformanceMonitor.trackRenderTime(componentName, renderTime);
        delete renderTimes.current[componentName];
      }
    };
  }, []);
  
  // Track message sending
  const trackMessageSend = useCallback((messageId: string, size: number) => {
    ChatPerformanceMonitor.trackMessageSendStart(messageId, size);
    
    // Return a function to call when send is complete
    return (success: boolean) => {
      ChatPerformanceMonitor.trackMessageSendComplete(messageId, success);
    };
  }, []);
  
  // Track message receiving
  const trackMessageReceived = useCallback((messageId: string, size: number) => {
    ChatPerformanceMonitor.trackMessageReceived(messageId, size);
  }, []);
  
  // Get current metrics
  const getMetrics = useCallback((): ChatMetrics => {
    return ChatPerformanceMonitor.getChatPerformanceMetrics();
  }, []);
  
  return {
    trackRenderStart,
    trackMessageSend,
    trackMessageReceived,
    getMetrics,
    startMonitoring: (id: string) => ChatPerformanceMonitor.startChatMonitoring(id),
    stopMonitoring: () => ChatPerformanceMonitor.stopChatMonitoring(),
  };
}
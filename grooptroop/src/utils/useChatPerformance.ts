import { useEffect, useRef, useCallback } from 'react';import { InteractionManager } from 'react-native';import * as Sentry from '@sentry/react-native';import ChatPerformanceMonitor from './chatPerformanceMonitor';import { SimplePerformance } from './simplePerformance';export function useChatPerformance(chatId: string) {  const renderStartTime = useRef<number>(Date.now());  const messagesRef = useRef<Set<string>>(new Set());  const sentryTransaction = useRef<Sentry.Transaction | null>(null);    // Start monitoring when the chat screen mounts  useEffect(() => {    const traceId = SimplePerformance.startTrace(`chat_view_${chatId}`,       { chatId },       'chat-view');        ChatPerformanceMonitor.startChatMonitoring(chatId);        // Create a Sentry transaction for this chat screen view    const transaction = Sentry.startTransaction({      name: `ChatScreenView: ${chatId}`,      op: 'ui.render',    });    sentryTransaction.current = transaction;        // Measure initial render time    InteractionManager.runAfterInteractions(() => {      const initialRenderTime = Date.now() - renderStartTime.current;      SimplePerformance.logEvent('chat-render',         `Chat screen initial render took ${initialRenderTime}ms`);            const initRenderSpan = transaction.startChild({        op: 'ui.render.initial',        description: 'Initial chat screen render',        startTimestamp: renderStartTime.current / 1000,        endTimestamp: Date.now() / 1000      });      initRenderSpan.finish();    });        return () => {      // Clean up when unmounting      SimplePerformance.endTrace(traceId);      ChatPerformanceMonitor.stopChatMonitoring();            if (sentryTransaction.current) {        sentryTransaction.current.finish();      }    };  }, [chatId]);    // Track sending a message  const trackMessageSend = useCallback((messageId: string, message: any) => {    const messageSize = JSON.stringify(message).length;    ChatPerformanceMonitor.trackMessageSendStart(messageId, messageSize);        // Create a Sentry span for this specific message send    let span = null;    if (sentryTransaction.current) {      span = sentryTransaction.current.startChild({        op: 'chat.send',        description: `Send message: ${messageId.slice(0, 6)}`,        data: {          messageId,          messageSize        }      });    }        // Return a function to complete the tracking    return (success: boolean = true) => {      ChatPerformanceMonitor.trackMessageSendComplete(messageId, success);            if (span) {        if (!success) {          span.setStatus('internal_error');        }        span.finish();      }    };  }, []);    // Track receiving a message  const trackMessageReceived = useCallback((messageId: string, message: any) => {    const messageSize = JSON.stringify(message).length;    ChatPerformanceMonitor.trackMessageReceived(messageId, messageSize);    messagesRef.current.add(messageId);  }, []);    // Track message render  const trackMessageRender = useCallback((messageId: string) => {    const startTime = Date.now();        return () => {      const endTime = Date.now();      ChatPerformanceMonitor.trackMessageRender(messageId, startTime, endTime);    };  }, []);    // Track scrolling performance  const trackScrollPerformance = useCallback(() => {    const scrollStartTime = Date.now();    let scrollSpan = null;        if (sentryTransaction.current) {      scrollSpan = sentryTransaction.current.startChild({        op: 'ui.scroll',        description: 'Chat message scrolling'      });    }        return () => {      const scrollDuration = Date.now() - scrollStartTime;            // Only track if scroll lasted more than 100ms to avoid noise      if (scrollDuration > 100) {        SimplePerformance.logEvent('chat-ui', `Scroll event lasted ${scrollDuration}ms`);      }
      
      if (scrollSpan) {
        scrollSpan.finish();
      }
    };
  }, []);
  
  // Track typing performance
  const trackTypingPerformance = useCallback(() => {
    const typingTraceId = SimplePerformance.startTrace('chat_typing', 
      undefined, 'user-interaction');
    
    let typingSpan = null;
    if (sentryTransaction.current) {
      typingSpan = sentryTransaction.current.startChild({
        op: 'ui.input',
        description: 'User typing in chat'
      });
    }
    
    return () => {
      SimplePerformance.endTrace(typingTraceId);
      
      if (typingSpan) {
        typingSpan.finish();
      }
    };
  }, []);
  
  // Get current performance metrics
  const getCurrentMetrics = useCallback(() => {
    return ChatPerformanceMonitor.getChatPerformanceMetrics();
  }, []);
  
  return {
    trackMessageSend,
    trackMessageReceived,
    trackMessageRender,
    trackScrollPerformance,
    trackTypingPerformance,
    getCurrentMetrics
  };
}